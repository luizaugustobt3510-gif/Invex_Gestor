import { gatewayFetch, corsHeaders, type PaddleEnv } from '../_shared/paddle.ts';

const ALLOWED = new Set(['rotina_premium_mensal', 'rotina_premium_anual']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  try {
    const { priceId, environment } = await req.json();
    if (!ALLOWED.has(priceId)) return json({ error: 'Preço inválido' }, 400);
    const env: PaddleEnv = environment === 'live' ? 'live' : 'sandbox';
    const r = await gatewayFetch(env, `/prices?external_id=${encodeURIComponent(priceId)}`);
    if (!r.ok) return json({ error: 'Falha ao buscar preço' }, 502);
    const data = await r.json();
    if (!data.data?.length) return json({ error: 'Preço não encontrado' }, 404);
    return json({ paddleId: data.data[0].id });
  } catch (_e) {
    return json({ error: 'Erro interno' }, 500);
  }
});
