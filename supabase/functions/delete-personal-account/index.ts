import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROTECTED_EMAILS = ['luiz@invex.com'];
const ACTIVE_SUB = ['active', 'trialing', 'past_due'];

// Ordem importa: filhos antes dos pais (FKs sem cascade).
const BY_USER_ID = [
  'routine_habit_logs', 'routine_habits', 'routine_tasks', 'routine_notes', 'routine_reminders',
  'routine_goals', 'routine_weekly_reviews', 'routine_access',
  'fitness_workout_logs', 'fitness_workout_exercises', 'fitness_workouts', 'fitness_daily_logs',
  'fitness_emagrecimento_logs', 'fitness_meal_logs', 'fitness_measurements', 'fitness_user_achievements',
  'fitness_friends', 'fitness_profiles', 'fitness_premium_grants',
  'personal_transactions', 'personal_budgets', 'personal_categories', 'personal_people',
  'personal_app_usage', 'personal_email_verifications', 'financas_premium_grants',
  'subscriptions', 'support_tickets', 'user_update_views',
];

/** Super Admin apaga de vez uma conta pessoal (Rotina/Fitness/Finanças). Contas empresariais não passam por aqui. */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'Não autenticado' }, 401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Não autenticado' }, 401);

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: isSA } = await admin.rpc('is_super_admin', { _user_id: user.id });
    if (!isSA) return json({ error: 'Apenas o Super Administrador pode excluir contas.' }, 403);

    const body = await req.json().catch(() => ({}));
    const uid = String(body?.user_id || '');
    if (!UUID.test(uid)) return json({ error: 'Conta inválida.' }, 400);
    if (uid === user.id) return json({ error: 'Você não pode excluir a própria conta.' }, 400);

    const { data: target } = await admin.auth.admin.getUserById(uid);
    const email = target?.user?.email?.toLowerCase() || '';
    if (!target?.user) return json({ error: 'Conta não encontrada.' }, 404);
    if (PROTECTED_EMAILS.includes(email)) return json({ error: 'Esta conta é protegida.' }, 403);

    const { count: roles } = await admin.from('user_roles').select('id', { count: 'exact', head: true }).eq('user_id', uid);
    if ((roles ?? 0) > 0) {
      return json({ error: 'Esta conta também tem acesso empresarial. Remova-a pela Gestão de Usuários do Gestor.' }, 409);
    }

    const { data: subs } = await admin.from('subscriptions').select('status, current_period_end').eq('user_id', uid);
    const ativa = (subs || []).some((s) => ACTIVE_SUB.includes(s.status));
    if (ativa) {
      return json({ error: 'Esta conta tem uma assinatura paga ativa. Cancele a assinatura antes de excluir.' }, 409);
    }

    for (const t of BY_USER_ID) {
      const { error } = await admin.from(t).delete().eq('user_id', uid);
      if (error) return json({ error: `Falha ao apagar dados (${t}). Nada mais foi removido.` }, 500);
    }
    const extra = [
      admin.from('fitness_friends').delete().eq('friend_user_id', uid),
      admin.from('personal_account_shares').delete().eq('owner_id', uid),
      admin.from('routine_audit_logs').delete().eq('target_user_id', uid),
    ];
    if (email) extra.push(admin.from('personal_account_shares').delete().eq('viewer_email', email));
    for (const r of await Promise.all(extra)) {
      if (r.error) return json({ error: 'Falha ao apagar compartilhamentos.' }, 500);
    }

    for (const bucket of ['rotina-avatars', 'fitness-photos']) {
      const { data: files } = await admin.storage.from(bucket).list(uid, { limit: 1000 });
      if (files?.length) await admin.storage.from(bucket).remove(files.map((f) => `${uid}/${f.name}`));
    }

    await admin.from('profiles').delete().eq('user_id', uid);
    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) return json({ error: 'Os dados foram apagados, mas não foi possível remover o login.' }, 500);

    return json({ success: true });
  } catch (_e) {
    return json({ error: 'Erro interno' }, 500);
  }
});
