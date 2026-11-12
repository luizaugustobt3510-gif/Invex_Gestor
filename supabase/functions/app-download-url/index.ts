import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const BUCKET = 'app-downloads';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  try {
    const body = await req.json().catch(() => null);
    const id = typeof body?.id === 'string' ? body.id : '';
    if (!UUID_RE.test(id)) return json({ error: 'Download inválido' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: d, error } = await admin
      .from('app_downloads').select('file_path, ativo').eq('id', id).maybeSingle();
    if (error || !d) return json({ error: 'Download não encontrado' }, 404);

    if (!d.ativo) {
      // Hidden files: only Super Admin may fetch them.
      const auth = req.headers.get('Authorization') ?? '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      const { data: u } = token ? await admin.auth.getUser(token) : { data: { user: null } };
      const uid = u?.user?.id;
      const { data: isSa } = uid ? await admin.rpc('is_super_admin', { _user_id: uid }) : { data: false };
      if (!isSa) return json({ error: 'Download não encontrado' }, 404);
    }

    const name = d.file_path.split('/').pop() || 'app.apk';
    const { data: s, error: sErr } = await admin.storage.from(BUCKET).createSignedUrl(d.file_path, 600, { download: name });
    if (sErr || !s) return json({ error: 'Falha ao gerar link' }, 500);
    return json({ url: s.signedUrl });
  } catch (_e) {
    return json({ error: 'Erro interno' }, 500);
  }
});
