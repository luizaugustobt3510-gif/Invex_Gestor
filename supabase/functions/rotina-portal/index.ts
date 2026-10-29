import { createClient } from 'npm:@supabase/supabase-js@2';
import { getPaddleClient, corsHeaders, type PaddleEnv } from '../_shared/paddle.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Não autenticado' }, 401);
    const { environment } = await req.json().catch(() => ({}));
    const env: PaddleEnv = environment === 'live' ? 'live' : 'sandbox';
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: sub } = await admin.from('subscriptions').select('paddle_customer_id, paddle_subscription_id')
      .eq('user_id', user.id).eq('environment', env).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!sub) return json({ error: 'Nenhuma assinatura encontrada' }, 404);
    const session = await getPaddleClient(env).customerPortalSessions.create(sub.paddle_customer_id, [sub.paddle_subscription_id]);
    return json({ url: session.urls.general.overview });
  } catch (_e) {
    return json({ error: 'Erro ao abrir o portal' }, 500);
  }
});
