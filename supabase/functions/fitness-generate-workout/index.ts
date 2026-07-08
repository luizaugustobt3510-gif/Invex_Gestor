import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claims, error: authErr } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (authErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    const perfil = await req.json();
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) throw new Error('LOVABLE_API_KEY missing');

    const {
      idade, sexo, peso, altura, objetivo, nivel,
      dias_por_semana = 3, tempo_treino_min = 60, cardio_min = 15,
      limitacoes,
    } = perfil || {};

    const systemPrompt = `Você é um personal trainer especialista. Gere fichas de treino em JSON estruturado.
Regras:
- Adapte volume/intensidade ao NÍVEL (iniciante: 3-4 ex, 3 séries, 10-15 reps; intermediário: 4-6 ex, 3-4 séries, 8-12 reps; avançado: 5-7 ex, 4 séries, 6-12 reps).
- Hipertrofia: cardio leve. Perda de peso: cardio moderado/alto. Recomposição: equilibrado.
- Respeite limitações físicas (evite exercícios que agravem).
- Distribua grupos musculares pelos dias (push/pull/leg, AB, ABC, ABCDE conforme dias).
- Descanso 60-90s para hipertrofia, 30-60s para emagrecimento, 90-180s para força.
- Use exercícios reais e claros (ex: "Supino reto com barra", "Agachamento livre").`;

    const userPrompt = `Gere um plano de treino para:
Idade: ${idade ?? 'não informada'}
Sexo: ${sexo ?? 'não informado'}
Peso: ${peso ?? '?'} kg | Altura: ${altura ?? '?'} cm
Objetivo: ${objetivo ?? 'hipertrofia'}
Nível: ${nivel ?? 'iniciante'}
Dias por semana: ${dias_por_semana}
Tempo por sessão: ${tempo_treino_min} min
Cardio por sessão: ${cardio_min} min
Limitações: ${limitacoes || 'nenhuma'}`;

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'gerar_ficha',
            description: 'Retorna o plano de treino completo estruturado.',
            parameters: {
              type: 'object',
              properties: {
                treino: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      dia: { type: 'number' },
                      foco: { type: 'string', description: 'Ex: Peito + Tríceps' },
                      exercicios: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            nome: { type: 'string' },
                            series: { type: 'number' },
                            repeticoes: { type: 'string', description: 'Ex: "10-12" ou "15"' },
                            descanso_seg: { type: 'number' },
                          },
                          required: ['nome', 'series', 'repeticoes', 'descanso_seg'],
                          additionalProperties: false,
                        }
                      },
                      cardio: { type: 'string', description: 'Ex: "10 min esteira moderada" ou ""' },
                    },
                    required: ['dia', 'foco', 'exercicios', 'cardio'],
                    additionalProperties: false,
                  }
                }
              },
              required: ['treino'],
              additionalProperties: false,
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'gerar_ficha' } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: 'Muitas requisições. Tente em alguns segundos.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos da IA esgotados.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await resp.text();
      console.error('AI error', resp.status, t);
      throw new Error(`AI: ${resp.status}`);
    }

    const data = await resp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let parsed: any = {};
    try { parsed = JSON.parse(args || '{}'); } catch { parsed = {}; }

    const resultado = {
      aba: 'geracao_inteligente_treino',
      modo: 'ia',
      perfil: {
        objetivo: objetivo || '',
        nivel: nivel || '',
        dias_por_semana,
        tempo_treino_min,
        cardio_min,
      },
      treino: parsed.treino || [],
      editavel: true,
      versao: 'IA v1',
    };

    return new Response(JSON.stringify(resultado), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('generate-workout error', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
