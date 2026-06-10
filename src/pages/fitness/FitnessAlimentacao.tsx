import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FitnessLayout } from '@/components/fitness/FitnessLayout';
import { FitnessCard } from '@/components/fitness/FitnessCard';
import { useFitnessProfile } from '@/hooks/useFitnessProfile';
import { supabase } from '@/integrations/supabase/client';
import { Apple, Flame, ChevronRight, Plus, Trash2, Search, Coffee, Utensils, Salad, Cookie } from 'lucide-react';
import { toast } from 'sonner';

// Pequena base de alimentos comuns (valores por 100g)
interface Food {
  nome: string;
  kcal: number;
  prot: number;
  carb: number;
  gord: number;
  fibra: number;
}
const FOODS: Food[] = [
  // Café da manhã
  { nome: 'Pão francês', kcal: 270, prot: 8, carb: 56, gord: 3, fibra: 2.3 },
  { nome: 'Pão de queijo', kcal: 363, prot: 6.5, carb: 39, gord: 20, fibra: 1 },
  { nome: 'Pão de batata', kcal: 295, prot: 7, carb: 48, gord: 8, fibra: 1.8 },
  { nome: 'Pão integral', kcal: 247, prot: 13, carb: 41, gord: 3.4, fibra: 7 },
  { nome: 'Pão com manteiga da roça', kcal: 340, prot: 8, carb: 50, gord: 12, fibra: 2 },
  { nome: 'Bolo de fubá', kcal: 360, prot: 5, carb: 55, gord: 13, fibra: 1.2 },
  { nome: 'Bolo de cenoura', kcal: 350, prot: 5, carb: 58, gord: 11, fibra: 1 },
  { nome: 'Broa de milho', kcal: 280, prot: 6, carb: 52, gord: 5, fibra: 3 },
  { nome: 'Manteiga', kcal: 717, prot: 0.9, carb: 0.1, gord: 81, fibra: 0 },
  { nome: 'Requeijão cremoso', kcal: 257, prot: 9, carb: 4, gord: 23, fibra: 0 },
  { nome: 'Queijo minas', kcal: 264, prot: 17, carb: 3, gord: 20, fibra: 0 },
  { nome: 'Queijo minas frescal', kcal: 240, prot: 17, carb: 3, gord: 18, fibra: 0 },
  { nome: 'Queijo branco', kcal: 240, prot: 17, carb: 3, gord: 18, fibra: 0 },
  { nome: 'Leite integral', kcal: 61, prot: 3.2, carb: 4.8, gord: 3.3, fibra: 0 },
  { nome: 'Leite desnatado', kcal: 35, prot: 3.4, carb: 5, gord: 0.1, fibra: 0 },
  { nome: 'Café adoçado', kcal: 15, prot: 0.1, carb: 3.5, gord: 0, fibra: 0 },
  { nome: 'Aveia em flocos', kcal: 389, prot: 17, carb: 66, gord: 7, fibra: 10.6 },
  { nome: 'Tapioca pronta', kcal: 240, prot: 0.2, carb: 60, gord: 0, fibra: 0.5 },

  // Almoço / Janta
  { nome: 'Arroz branco cozido', kcal: 130, prot: 2.5, carb: 28, gord: 0.3, fibra: 0.4 },
  { nome: 'Arroz integral cozido', kcal: 124, prot: 2.6, carb: 25.8, gord: 1, fibra: 2.7 },
  { nome: 'Feijão carioca cozido', kcal: 76, prot: 4.8, carb: 13.6, gord: 0.5, fibra: 8.5 },
  { nome: 'Feijão preto cozido', kcal: 77, prot: 4.5, carb: 14, gord: 0.5, fibra: 8.4 },
  { nome: 'Feijão tropeiro', kcal: 215, prot: 11, carb: 25, gord: 8, fibra: 6 },
  { nome: 'Macarrão cozido', kcal: 158, prot: 5.8, carb: 31, gord: 0.9, fibra: 1.8 },
  { nome: 'Purê de batata', kcal: 105, prot: 2, carb: 17, gord: 3.5, fibra: 1.5 },
  { nome: 'Mandioca cozida', kcal: 125, prot: 0.6, carb: 30, gord: 0.3, fibra: 1.8 },
  { nome: 'Batata doce cozida', kcal: 86, prot: 1.6, carb: 20, gord: 0.1, fibra: 3 },
  { nome: 'Batata inglesa cozida', kcal: 87, prot: 1.9, carb: 20, gord: 0.1, fibra: 1.8 },
  { nome: 'Abóbora cozida', kcal: 26, prot: 1, carb: 6.5, gord: 0.1, fibra: 0.5 },
  { nome: 'Angu', kcal: 110, prot: 2.5, carb: 23, gord: 1, fibra: 1.6 },
  { nome: 'Frango ensopado', kcal: 180, prot: 25, carb: 3, gord: 7, fibra: 0.5 },
  { nome: 'Frango grelhado (peito)', kcal: 165, prot: 31, carb: 0, gord: 3.6, fibra: 0 },
  { nome: 'Frango com quiabo', kcal: 175, prot: 22, carb: 6, gord: 7, fibra: 2 },
  { nome: 'Carne cozida', kcal: 220, prot: 27, carb: 2, gord: 11, fibra: 0 },
  { nome: 'Carne moída', kcal: 250, prot: 26, carb: 0, gord: 17, fibra: 0 },
  { nome: 'Carne bovina magra', kcal: 219, prot: 26, carb: 0, gord: 12, fibra: 0 },
  { nome: 'Linguiça', kcal: 308, prot: 14, carb: 1, gord: 27, fibra: 0 },
  { nome: 'Ovo cozido', kcal: 155, prot: 13, carb: 1.1, gord: 11, fibra: 0 },
  { nome: 'Ovo frito', kcal: 196, prot: 14, carb: 0.8, gord: 15, fibra: 0 },
  { nome: 'Ora-pro-nóbis refogada', kcal: 60, prot: 4.5, carb: 8, gord: 1, fibra: 6 },
  { nome: 'Salada (alface, tomate)', kcal: 20, prot: 1, carb: 4, gord: 0.2, fibra: 1.5 },
  { nome: 'Brócolis cozido', kcal: 35, prot: 2.4, carb: 7, gord: 0.4, fibra: 3.3 },

  // Lanches / frutas
  { nome: 'Banana', kcal: 89, prot: 1.1, carb: 23, gord: 0.3, fibra: 2.6 },
  { nome: 'Maçã', kcal: 52, prot: 0.3, carb: 14, gord: 0.2, fibra: 2.4 },
  { nome: 'Mamão', kcal: 43, prot: 0.5, carb: 11, gord: 0.3, fibra: 1.7 },
  { nome: 'Laranja', kcal: 47, prot: 0.9, carb: 12, gord: 0.1, fibra: 2.4 },
  { nome: 'Rapadura', kcal: 380, prot: 0.5, carb: 95, gord: 0.1, fibra: 0 },
  { nome: 'Paçoca', kcal: 480, prot: 14, carb: 50, gord: 24, fibra: 5 },
  { nome: 'Amendoim torrado', kcal: 567, prot: 26, carb: 16, gord: 49, fibra: 8.5 },
  { nome: 'Doce de leite', kcal: 315, prot: 7, carb: 55, gord: 7, fibra: 0 },
  { nome: 'Iogurte natural', kcal: 61, prot: 3.5, carb: 4.7, gord: 3.3, fibra: 0 },
  { nome: 'Whey Protein (1 scoop ~30g)', kcal: 120, prot: 24, carb: 3, gord: 1.5, fibra: 0 },
  { nome: 'Azeite de oliva', kcal: 884, prot: 0, carb: 0, gord: 100, fibra: 0 },
  { nome: 'Castanha do Pará', kcal: 656, prot: 14, carb: 12, gord: 66, fibra: 7.5 },
];


const REFEICOES = [
  { id: 'cafe', label: 'Café da manhã', icon: Coffee, color: 'text-amber-300' },
  { id: 'almoco', label: 'Almoço', icon: Utensils, color: 'text-orange-300' },
  { id: 'lanche', label: 'Lanche', icon: Cookie, color: 'text-pink-300' },
  { id: 'jantar', label: 'Jantar', icon: Salad, color: 'text-emerald-300' },
];

interface MealRow {
  id: string;
  log_date: string;
  refeicao: string;
  alimento: string;
  quantidade_g: number;
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  fibras: number;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

const FitnessAlimentacao = () => {
  const { profile } = useFitnessProfile();
  const [rows, setRows] = useState<MealRow[]>([]);
  const [refeicao, setRefeicao] = useState('cafe');
  const [busca, setBusca] = useState('');
  const [foodSel, setFoodSel] = useState<Food | null>(null);
  const [qtd, setQtd] = useState('100');
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState<{ calorias: number; proteinas: number; carboidratos: number; gorduras: number } | null>(null);

  const fetchRows = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('fitness_meal_logs' as any)
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', todayStr())
      .order('created_at', { ascending: true });
    setRows((data as any) || []);
  };

  const fetchMeta = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('fitness_emagrecimento_logs' as any)
      .select('calorias, proteinas, carboidratos, gorduras')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setMeta(data as any);
  };

  useEffect(() => { fetchRows(); fetchMeta(); }, []);

  const filteredFoods = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return FOODS.slice(0, 8);
    return FOODS.filter(f => f.nome.toLowerCase().includes(q)).slice(0, 10);
  }, [busca]);

  const calc = (food: Food, gramas: number) => {
    const r = gramas / 100;
    return {
      calorias: Math.round(food.kcal * r),
      proteinas: +(food.prot * r).toFixed(1),
      carboidratos: +(food.carb * r).toFixed(1),
      gorduras: +(food.gord * r).toFixed(1),
      fibras: +(food.fibra * r).toFixed(1),
    };
  };

  const previewCalc = useMemo(() => {
    if (!foodSel) return null;
    const g = parseFloat(qtd.replace(',', '.'));
    if (!Number.isFinite(g) || g <= 0) return null;
    return calc(foodSel, g);
  }, [foodSel, qtd]);

  const adicionar = async () => {
    if (!foodSel) return toast.error('Selecione um alimento');
    const g = parseFloat(qtd.replace(',', '.'));
    if (!Number.isFinite(g) || g <= 0) return toast.error('Informe a quantidade (g)');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error('Sessão expirada');
    setSaving(true);
    try {
      const macros = calc(foodSel, g);
      const { error } = await supabase.from('fitness_meal_logs' as any).insert({
        user_id: user.id,
        log_date: todayStr(),
        refeicao,
        alimento: foodSel.nome,
        quantidade_g: g,
        ...macros,
      });
      if (error) throw error;
      toast.success('Refeição registrada');
      setFoodSel(null);
      setBusca('');
      setQtd('100');
      fetchRows();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const excluir = async (id: string) => {
    const { error } = await supabase.from('fitness_meal_logs' as any).delete().eq('id', id);
    if (error) return toast.error('Erro ao excluir');
    setRows(r => r.filter(x => x.id !== id));
  };

  // Totais
  const totais = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        calorias: acc.calorias + Number(r.calorias || 0),
        proteinas: acc.proteinas + Number(r.proteinas || 0),
        carboidratos: acc.carboidratos + Number(r.carboidratos || 0),
        gorduras: acc.gorduras + Number(r.gorduras || 0),
        fibras: acc.fibras + Number(r.fibras || 0),
      }),
      { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0 }
    );
  }, [rows]);

  const grupos = useMemo(() => {
    const map: Record<string, MealRow[]> = {};
    REFEICOES.forEach(r => (map[r.id] = []));
    rows.forEach(r => { (map[r.refeicao] ||= []).push(r); });
    return map;
  }, [rows]);

  const pct = (v: number, t?: number) => (t && t > 0 ? Math.min(100, (v / t) * 100) : 0);

  return (
    <FitnessLayout>
      <h1 className="text-2xl font-black mb-1">Alimentação</h1>
      <p className="text-sm text-slate-400 mb-4">Registre suas refeições e acompanhe calorias e macros do dia</p>

      <Link to="/fitness/emagrecimento" className="block mb-4">
        <FitnessCard glow="fuchsia" className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-fuchsia-500 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold">Processo de Emagrecimento</p>
            <p className="text-xs text-slate-400">
              {meta ? `Meta: ${meta.calorias} kcal · P ${meta.proteinas}g · C ${meta.carboidratos}g · G ${meta.gorduras}g` : 'Calcule sua estimativa inicial'}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500" />
        </FitnessCard>
      </Link>

      {/* Resumo do dia */}
      <FitnessCard className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Apple className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold">Resumo de hoje</h2>
          </div>
          <span className="text-[10px] text-slate-500">{new Date().toLocaleDateString('pt-BR')}</span>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          <Mini label="kcal" value={Math.round(totais.calorias)} meta={meta?.calorias} color="text-rose-400" />
          <Mini label="Prot" value={totais.proteinas.toFixed(0) + 'g'} meta={meta?.proteinas} color="text-cyan-300" />
          <Mini label="Carb" value={totais.carboidratos.toFixed(0) + 'g'} meta={meta?.carboidratos} color="text-amber-300" />
          <Mini label="Gord" value={totais.gorduras.toFixed(0) + 'g'} meta={meta?.gorduras} color="text-fuchsia-300" />
        </div>
        {meta && (
          <div className="space-y-1.5">
            <Bar label="Calorias" v={totais.calorias} t={meta.calorias} color="#f43f5e" />
            <Bar label="Proteínas" v={totais.proteinas} t={meta.proteinas} color="#22d3ee" />
            <Bar label="Carboidratos" v={totais.carboidratos} t={meta.carboidratos} color="#f59e0b" />
            <Bar label="Gorduras" v={totais.gorduras} t={meta.gorduras} color="#e879f9" />
          </div>
        )}
        {!meta && (
          <p className="text-[11px] text-slate-500 text-center mt-2">
            Faça sua estimativa em <Link to="/fitness/emagrecimento" className="text-fuchsia-300 underline">Processo de Emagrecimento</Link> para ver o comparativo com sua meta.
          </p>
        )}
      </FitnessCard>

      {/* Adicionar refeição */}
      <FitnessCard className="mb-4">
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-cyan-300" /> Adicionar alimento
        </h2>

        {/* Seletor de refeição */}
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {REFEICOES.map(r => {
            const Icon = r.icon;
            const active = refeicao === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setRefeicao(r.id)}
                className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-[10px] font-semibold transition ${
                  active
                    ? 'bg-cyan-500/15 border-cyan-400/60 text-cyan-200'
                    : 'bg-slate-900/40 border-slate-700/40 text-slate-400'
                }`}
              >
                <Icon className={`w-4 h-4 ${r.color}`} />
                {r.label}
              </button>
            );
          })}
        </div>

        {/* Busca */}
        <div className="relative mb-2">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            value={busca}
            onChange={e => { setBusca(e.target.value); setFoodSel(null); }}
            placeholder="Buscar alimento (ex: arroz, frango...)"
            className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-cyan-400"
          />
        </div>

        {!foodSel && (
          <div className="max-h-48 overflow-y-auto space-y-1 mb-2">
            {filteredFoods.map(f => (
              <button
                key={f.nome}
                onClick={() => setFoodSel(f)}
                className="w-full text-left px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-700/40 hover:border-cyan-400/40 text-xs flex justify-between items-center"
              >
                <span className="font-medium">{f.nome}</span>
                <span className="text-slate-400 text-[10px]">{f.kcal} kcal/100g</span>
              </button>
            ))}
            {filteredFoods.length === 0 && (
              <p className="text-[11px] text-slate-500 text-center py-3">Nenhum alimento encontrado</p>
            )}
          </div>
        )}

        {foodSel && (
          <div className="rounded-xl bg-cyan-500/5 border border-cyan-400/30 p-3 mb-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-cyan-100">{foodSel.nome}</p>
              <button onClick={() => setFoodSel(null)} className="text-[10px] text-slate-400 underline">trocar</button>
            </div>
            <label className="text-[11px] text-slate-400">Quantidade (gramas)</label>
            <input
              type="number"
              inputMode="decimal"
              value={qtd}
              onChange={e => setQtd(e.target.value)}
              className="w-full mt-1 bg-slate-900/60 border border-slate-700/60 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
              placeholder="100"
            />
            {previewCalc && (
              <div className="grid grid-cols-4 gap-1.5 mt-2 text-center">
                <Pill v={`${previewCalc.calorias}`} l="kcal" />
                <Pill v={`${previewCalc.proteinas}g`} l="prot" />
                <Pill v={`${previewCalc.carboidratos}g`} l="carb" />
                <Pill v={`${previewCalc.gorduras}g`} l="gord" />
              </div>
            )}
            <button
              onClick={adicionar}
              disabled={saving}
              className="w-full mt-3 rounded-xl py-2.5 text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-fuchsia-500 disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Adicionar à refeição'}
            </button>
          </div>
        )}
      </FitnessCard>

      {/* Listagem por refeição */}
      <div className="space-y-3 mb-4">
        {REFEICOES.map(r => {
          const items = grupos[r.id] || [];
          const Icon = r.icon;
          const subtotal = items.reduce((a, x) => a + Number(x.calorias || 0), 0);
          return (
            <FitnessCard key={r.id}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${r.color}`} />
                  <span className="text-sm font-bold">{r.label}</span>
                </div>
                <span className="text-[11px] text-slate-400">{Math.round(subtotal)} kcal</span>
              </div>
              {items.length === 0 ? (
                <p className="text-[11px] text-slate-500">Nenhum alimento registrado.</p>
              ) : (
                <ul className="space-y-1.5">
                  {items.map(it => (
                    <li key={it.id} className="flex items-center justify-between text-xs bg-slate-900/40 border border-slate-700/40 rounded-lg px-2.5 py-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{it.alimento}</p>
                        <p className="text-[10px] text-slate-400">
                          {it.quantidade_g}g · {Math.round(Number(it.calorias))} kcal · P {Number(it.proteinas).toFixed(0)}g · C {Number(it.carboidratos).toFixed(0)}g · G {Number(it.gorduras).toFixed(0)}g
                        </p>
                      </div>
                      <button
                        onClick={() => excluir(it.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 shrink-0"
                        aria-label="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </FitnessCard>
          );
        })}
      </div>
    </FitnessLayout>
  );
};

const Mini = ({ label, value, meta, color }: { label: string; value: string | number; meta?: number; color: string }) => (
  <div className="rounded-xl bg-slate-900/50 border border-slate-700/40 p-2 text-center">
    <div className={`text-lg font-black ${color}`}>{value}</div>
    <div className="text-[9px] text-slate-400 uppercase tracking-wide">{label}</div>
    {meta != null && meta > 0 && <div className="text-[9px] text-slate-500 mt-0.5">de {Math.round(meta)}</div>}
  </div>
);

const Bar = ({ label, v, t, color }: { label: string; v: number; t: number; color: string }) => {
  const pct = t > 0 ? Math.min(100, (v / t) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
        <span>{label}</span>
        <span>{Math.round(v)} / {Math.round(t)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800/60 overflow-hidden">
        <div className="h-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
};

const Pill = ({ v, l }: { v: string; l: string }) => (
  <div className="rounded-lg bg-slate-900/60 border border-slate-700/40 py-1">
    <div className="text-xs font-bold">{v}</div>
    <div className="text-[9px] text-slate-500">{l}</div>
  </div>
);

export default FitnessAlimentacao;
