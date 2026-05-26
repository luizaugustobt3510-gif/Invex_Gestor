import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FitnessLayout } from '@/components/fitness/FitnessLayout';
import { FitnessCard } from '@/components/fitness/FitnessCard';
import { supabase } from '@/integrations/supabase/client';
import { useFitnessProfile } from '@/hooks/useFitnessProfile';
import { Sparkles, Plus, Trash2, Save, Wand2, Pencil, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Exercicio = { nome: string; series: number; repeticoes: string; descanso_seg: number };
type DiaTreino = { dia: number; foco: string; exercicios: Exercicio[]; cardio: string };
type Plano = {
  aba: 'geracao_inteligente_treino';
  modo: 'ia' | 'manual';
  perfil: any;
  treino: DiaTreino[];
  editavel: boolean;
  versao: string;
};

const OBJETIVOS = [
  { v: 'hipertrofia', l: 'Hipertrofia' },
  { v: 'perda de peso', l: 'Perda de peso' },
  { v: 'recomposicao', l: 'Recomposição' },
];
const NIVEIS = [
  { v: 'iniciante', l: 'Iniciante' },
  { v: 'intermediario', l: 'Intermediário' },
  { v: 'avancado', l: 'Avançado' },
];
const SEXOS = [
  { v: 'M', l: 'Masculino' },
  { v: 'F', l: 'Feminino' },
  { v: 'O', l: 'Outro' },
];

const FitnessGerarTreino = () => {
  const navigate = useNavigate();
  const { profile } = useFitnessProfile();
  const [step, setStep] = useState<'form' | 'edit'>('form');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    idade: '',
    sexo: '',
    peso: profile?.peso_atual ? String(profile.peso_atual) : '',
    altura: profile?.altura ? String(profile.altura) : '',
    objetivo: 'hipertrofia',
    nivel: 'iniciante',
    dias_por_semana: 3,
    tempo_treino_min: 60,
    cardio_min: 15,
    limitacoes: '',
  });

  // Sincroniza com perfil quando carrega
  useEffect(() => {
    if (profile) {
      setForm(f => ({
        ...f,
        peso: f.peso || (profile.peso_atual ? String(profile.peso_atual) : ''),
        altura: f.altura || (profile.altura ? String(profile.altura) : ''),
      }));
    }
  }, [profile?.id]);

  const imc = (() => {
    const p = parseFloat(form.peso);
    const a = parseFloat(form.altura);
    if (!p || !a) return null;
    const m = a > 3 ? a / 100 : a; // se mandar em metros
    return p / (m * m);
  })();

  const [plano, setPlano] = useState<Plano | null>(null);

  const gerarIA = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fitness-generate-workout', {
        body: {
          idade: form.idade ? parseInt(form.idade) : undefined,
          sexo: form.sexo,
          peso: form.peso ? parseFloat(form.peso) : undefined,
          altura: form.altura ? parseFloat(form.altura) : undefined,
          imc: imc ? Number(imc.toFixed(1)) : undefined,
          objetivo: form.objetivo,
          nivel: form.nivel,
          dias_por_semana: form.dias_por_semana,
          tempo_treino_min: form.tempo_treino_min,
          cardio_min: form.cardio_min,
          limitacoes: form.limitacoes,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) {
        toast.error((data as any).error);
        return;
      }
      setPlano(data as Plano);
      setStep('edit');
      toast.success('Treino gerado! Edite o que quiser 💪');
    } catch (e: any) {
      toast.error(e.message || 'Falha ao gerar treino');
    } finally {
      setLoading(false);
    }
  };

  const criarManual = () => {
    setPlano({
      aba: 'geracao_inteligente_treino',
      modo: 'manual',
      perfil: {
        objetivo: form.objetivo,
        nivel: form.nivel,
        dias_por_semana: form.dias_por_semana,
        tempo_treino_min: form.tempo_treino_min,
        cardio_min: form.cardio_min,
      },
      treino: Array.from({ length: Math.max(1, form.dias_por_semana) }, (_, i) => ({
        dia: i + 1,
        foco: '',
        exercicios: [],
        cardio: '',
      })),
      editavel: true,
      versao: 'Manual v1',
    });
    setStep('edit');
  };

  const salvarComoFichas = async () => {
    if (!plano) return;
    setSaving(true);
    try {
      const { data: { user: au } } = await supabase.auth.getUser();
      if (!au) throw new Error('Sessão expirada');
      const stamp = new Date().toLocaleDateString('pt-BR');
      const cores = ['#22d3ee', '#e879f9', '#f59e0b', '#34d399', '#fb7185', '#a78bfa', '#60a5fa'];

      for (const dia of plano.treino) {
        const nome = `Dia ${dia.dia}${dia.foco ? ' — ' + dia.foco : ''} (${plano.versao} · ${stamp})`;
        const { data: wk, error: e1 } = await supabase
          .from('fitness_workouts')
          .insert({
            user_id: au.id,
            nome,
            grupo_muscular: dia.foco || null,
            cor: cores[(dia.dia - 1) % cores.length],
          })
          .select()
          .single();
        if (e1) throw e1;
        if (dia.exercicios?.length) {
          const rows = dia.exercicios.map((ex, i) => ({
            workout_id: (wk as any).id,
            user_id: au.id,
            ordem: i,
            nome: ex.nome,
            series: ex.series || 3,
            repeticoes: ex.repeticoes || '10',
            carga_kg: 0,
            descanso_seg: ex.descanso_seg || 60,
          }));
          const { error: e2 } = await supabase.from('fitness_workout_exercises').insert(rows);
          if (e2) throw e2;
        }
      }
      toast.success(`${plano.treino.length} ficha(s) salvas em Treinos! 🔥`);
      navigate('/fitness/treinos');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Editor inline ---------- */
  const updateDia = (idx: number, patch: Partial<DiaTreino>) => {
    if (!plano) return;
    setPlano({ ...plano, treino: plano.treino.map((d, i) => i === idx ? { ...d, ...patch } : d) });
  };
  const addExercicio = (idx: number) => {
    updateDia(idx, {
      exercicios: [...(plano!.treino[idx].exercicios || []), { nome: 'Novo exercício', series: 3, repeticoes: '10', descanso_seg: 60 }],
    });
  };
  const updateExercicio = (di: number, ei: number, patch: Partial<Exercicio>) => {
    const exs = plano!.treino[di].exercicios.map((e, i) => i === ei ? { ...e, ...patch } : e);
    updateDia(di, { exercicios: exs });
  };
  const delExercicio = (di: number, ei: number) => {
    const exs = plano!.treino[di].exercicios.filter((_, i) => i !== ei);
    updateDia(di, { exercicios: exs });
  };
  const addDia = () => {
    if (!plano) return;
    setPlano({
      ...plano,
      treino: [...plano.treino, { dia: plano.treino.length + 1, foco: '', exercicios: [], cardio: '' }],
    });
  };
  const delDia = (idx: number) => {
    if (!plano) return;
    setPlano({ ...plano, treino: plano.treino.filter((_, i) => i !== idx).map((d, i) => ({ ...d, dia: i + 1 })) });
  };

  /* ---------- Render ---------- */

  if (step === 'edit' && plano) {
    return (
      <FitnessLayout>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setStep('form')} className="flex items-center gap-1 text-sm text-cyan-300">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <span className="text-[10px] uppercase tracking-widest text-fuchsia-300">{plano.versao}</span>
        </div>

        <div className="mb-3 text-center">
          <h1 className="text-2xl font-black flex items-center justify-center gap-2">
            {plano.modo === 'ia' ? <Sparkles className="w-5 h-5 text-fuchsia-300" /> : <Pencil className="w-5 h-5 text-cyan-300" />}
            Plano editável
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {plano.perfil.objetivo} · {plano.perfil.nivel} · {plano.treino.length} dia(s)
          </p>
        </div>

        <div className="space-y-3">
          {plano.treino.map((dia, di) => (
            <FitnessCard key={di} className="!p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-8 h-8 rounded-lg bg-cyan-400/15 text-cyan-300 flex items-center justify-center text-sm font-bold shrink-0">
                  D{dia.dia}
                </span>
                <input
                  value={dia.foco}
                  onChange={e => updateDia(di, { foco: e.target.value })}
                  placeholder="Foco (ex: Peito + Tríceps)"
                  className="flex-1 h-10 px-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-base focus:border-cyan-400 focus:outline-none"
                />
                <button onClick={() => delDia(di)} className="p-2 text-slate-500 hover:text-rose-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {dia.exercicios.map((ex, ei) => (
                  <div key={ei} className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-2">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] text-slate-500 w-4">{ei + 1}.</span>
                      <input
                        value={ex.nome}
                        onChange={e => updateExercicio(di, ei, { nome: e.target.value })}
                        className="flex-1 h-9 px-2 rounded-md bg-slate-800/60 border border-slate-700 text-sm focus:border-cyan-400 focus:outline-none"
                      />
                      <button onClick={() => delExercicio(di, ei)} className="p-1.5 text-slate-500 hover:text-rose-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <Num label="Séries" value={ex.series} onChange={v => updateExercicio(di, ei, { series: v })} />
                      <Txt label="Reps" value={ex.repeticoes} onChange={v => updateExercicio(di, ei, { repeticoes: v })} />
                      <Num label="Desc(s)" value={ex.descanso_seg} step={5} onChange={v => updateExercicio(di, ei, { descanso_seg: v })} />
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => addExercicio(di)}
                  className="w-full h-9 rounded-lg border border-dashed border-slate-700 text-xs text-slate-400 hover:text-cyan-300 hover:border-cyan-400 flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Exercício
                </button>
              </div>

              <div className="mt-3">
                <label className="text-[10px] uppercase tracking-wide text-slate-400">Cardio</label>
                <input
                  value={dia.cardio}
                  onChange={e => updateDia(di, { cardio: e.target.value })}
                  placeholder='Ex: "10 min esteira moderada"'
                  className="w-full mt-1 h-10 px-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-sm focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </FitnessCard>
          ))}

          <button
            onClick={addDia}
            className="w-full h-11 rounded-xl border border-dashed border-cyan-500/40 text-cyan-300 text-sm flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Adicionar dia
          </button>
        </div>

        <div className="sticky bottom-20 mt-5 z-30">
          <button
            onClick={salvarComoFichas}
            disabled={saving || plano.treino.every(d => d.exercicios.length === 0)}
            className="w-full h-14 rounded-2xl font-black text-slate-900 text-base flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'linear-gradient(90deg, #22d3ee, #e879f9)', boxShadow: '0 8px 24px rgba(34,211,238,0.25)' }}
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Salvar em Treinos
          </button>
        </div>
      </FitnessLayout>
    );
  }

  return (
    <FitnessLayout>
      <div className="flex items-center gap-2 mb-1">
        <button onClick={() => navigate('/fitness/treinos')} className="flex items-center gap-1 text-sm text-cyan-300">
          <ArrowLeft className="w-4 h-4" /> Treinos
        </button>
      </div>
      <div className="mb-5 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-2"
          style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(232,121,249,0.2))' }}>
          <Sparkles className="w-7 h-7 text-fuchsia-300" />
        </div>
        <h1 className="text-2xl font-black">Geração Inteligente</h1>
        <p className="text-xs text-slate-400 mt-1">Seu personal IA monta a ficha ideal pra você</p>
      </div>

      <FitnessCard className="mb-3">
        <h2 className="text-sm font-bold mb-3">📋 Seus dados</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Idade (opcional)">
            <input inputMode="numeric" value={form.idade}
              onChange={e => setForm({ ...form, idade: e.target.value.replace(/\D/g, '') })}
              className="w-full h-11 px-3 rounded-lg bg-slate-800/60 border border-slate-700 text-base focus:border-cyan-400 focus:outline-none" />
          </Field>
          <Field label="Sexo">
            <select value={form.sexo} onChange={e => setForm({ ...form, sexo: e.target.value })}
              className="w-full h-11 px-3 rounded-lg bg-slate-800/60 border border-slate-700 text-base focus:border-cyan-400 focus:outline-none">
              <option value="">—</option>
              {SEXOS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </Field>
          <Field label="Peso (kg)">
            <input inputMode="decimal" value={form.peso}
              onChange={e => setForm({ ...form, peso: e.target.value.replace(',', '.') })}
              className="w-full h-11 px-3 rounded-lg bg-slate-800/60 border border-slate-700 text-base focus:border-cyan-400 focus:outline-none" />
          </Field>
          <Field label="Altura (cm)">
            <input inputMode="numeric" value={form.altura}
              onChange={e => setForm({ ...form, altura: e.target.value.replace(/\D/g, '') })}
              className="w-full h-11 px-3 rounded-lg bg-slate-800/60 border border-slate-700 text-base focus:border-cyan-400 focus:outline-none" />
          </Field>
        </div>
      </FitnessCard>

      <FitnessCard className="mb-3">
        <h2 className="text-sm font-bold mb-3">🎯 Objetivo & nível</h2>
        <label className="text-[10px] uppercase tracking-wide text-slate-400">Objetivo</label>
        <div className="flex flex-wrap gap-1.5 mt-1.5 mb-3">
          {OBJETIVOS.map(o => (
            <button key={o.v} onClick={() => setForm({ ...form, objetivo: o.v })}
              className={`text-xs h-9 px-3 rounded-full border ${form.objetivo === o.v ? 'bg-fuchsia-400/15 border-fuchsia-400 text-fuchsia-200' : 'border-slate-700 text-slate-400'}`}>
              {o.l}
            </button>
          ))}
        </div>
        <label className="text-[10px] uppercase tracking-wide text-slate-400">Nível</label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {NIVEIS.map(n => (
            <button key={n.v} onClick={() => setForm({ ...form, nivel: n.v })}
              className={`text-xs h-9 px-3 rounded-full border ${form.nivel === n.v ? 'bg-cyan-400/15 border-cyan-400 text-cyan-200' : 'border-slate-700 text-slate-400'}`}>
              {n.l}
            </button>
          ))}
        </div>
      </FitnessCard>

      <FitnessCard className="mb-3">
        <h2 className="text-sm font-bold mb-3">⏱️ Frequência & duração</h2>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Dias/sem">
            <input type="number" min={1} max={7} value={form.dias_por_semana}
              onChange={e => setForm({ ...form, dias_por_semana: Math.min(7, Math.max(1, parseInt(e.target.value) || 1)) })}
              className="w-full h-11 px-3 rounded-lg bg-slate-800/60 border border-slate-700 text-center text-base focus:border-cyan-400 focus:outline-none" />
          </Field>
          <Field label="Treino (min)">
            <input type="number" min={15} max={180} step={5} value={form.tempo_treino_min}
              onChange={e => setForm({ ...form, tempo_treino_min: parseInt(e.target.value) || 60 })}
              className="w-full h-11 px-3 rounded-lg bg-slate-800/60 border border-slate-700 text-center text-base focus:border-cyan-400 focus:outline-none" />
          </Field>
          <Field label="Cardio (min)">
            <input type="number" min={0} max={120} step={5} value={form.cardio_min}
              onChange={e => setForm({ ...form, cardio_min: parseInt(e.target.value) || 0 })}
              className="w-full h-11 px-3 rounded-lg bg-slate-800/60 border border-slate-700 text-center text-base focus:border-cyan-400 focus:outline-none" />
          </Field>
        </div>
        <Field label="Limitações físicas (opcional)" className="mt-3">
          <input value={form.limitacoes}
            onChange={e => setForm({ ...form, limitacoes: e.target.value })}
            placeholder="Ex: dor no joelho, hérnia lombar..."
            className="w-full h-11 px-3 rounded-lg bg-slate-800/60 border border-slate-700 text-base focus:border-cyan-400 focus:outline-none" />
        </Field>
      </FitnessCard>

      <div className="space-y-2.5 mt-4">
        <button
          onClick={gerarIA}
          disabled={loading}
          className="w-full h-14 rounded-2xl font-black text-slate-900 text-base flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60"
          style={{ background: 'linear-gradient(90deg, #22d3ee, #e879f9)', boxShadow: '0 8px 24px rgba(232,121,249,0.3)' }}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
          {loading ? 'Gerando treino...' : 'Gerar Treino Inteligente'}
        </button>
        <button
          onClick={criarManual}
          disabled={loading}
          className="w-full h-12 rounded-2xl font-bold text-sm border border-slate-700 text-slate-200 bg-slate-900/40 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Pencil className="w-4 h-4" /> Criar Treino Manualmente
        </button>
      </div>
    </FitnessLayout>
  );
};

const Field = ({ label, children, className = '' }: any) => (
  <div className={className}>
    <label className="text-[10px] uppercase tracking-wide text-slate-400 block mb-1">{label}</label>
    {children}
  </div>
);
const Num = ({ label, value, onChange, step = 1 }: any) => (
  <div>
    <label className="text-[9px] uppercase tracking-wide text-slate-500 block mb-0.5">{label}</label>
    <input type="number" inputMode="numeric" step={step} value={value}
      onChange={e => onChange(parseInt(e.target.value) || 0)}
      className="w-full h-9 px-2 rounded-md bg-slate-800/60 border border-slate-700 text-center text-sm focus:outline-none focus:border-cyan-400" />
  </div>
);
const Txt = ({ label, value, onChange }: any) => (
  <div>
    <label className="text-[9px] uppercase tracking-wide text-slate-500 block mb-0.5">{label}</label>
    <input value={value} onChange={e => onChange(e.target.value)}
      className="w-full h-9 px-2 rounded-md bg-slate-800/60 border border-slate-700 text-center text-sm focus:outline-none focus:border-cyan-400" />
  </div>
);

export default FitnessGerarTreino;
