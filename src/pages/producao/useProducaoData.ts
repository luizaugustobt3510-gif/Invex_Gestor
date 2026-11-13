import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ProdMat {
  id: string; codigo: string; material: string; unidade: string; quantidade: number;
  minimo: number; preco: number; tipo: string;
}
export interface ProdEntry {
  id: string; material_id: string; quantidade: number; quantidade_restante: number; lote: string;
  procedencia: string; temperatura: number | null; especificacao: string | null; numero_controle: string;
  boletim: boolean; fop: string | null; observacoes: string | null; foto_path: string | null;
  custo_total: number; created_at: string; validade: string | null;
}
export interface ProdOrder {
  id: string; entry_id: string; produto_material_id: string; quantidade_consumida: number;
  quantidade_produzida: number; lote_produto: string; observacoes: string | null; created_at: string;
  validade: string | null; custo_materia_prima: number;
}
export interface ProdRecipe {
  id: string; produto_material_id: string; materia_prima_id: string; rendimento_esperado: number;
  validade_dias: number | null; observacoes: string;
}

export function useProducaoData() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const [mats, setMats] = useState<ProdMat[]>([]);
  const [entries, setEntries] = useState<ProdEntry[]>([]);
  const [orders, setOrders] = useState<ProdOrder[]>([]);
  const [recipes, setRecipes] = useState<ProdRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!companyId) return;
    const [m, e, o, r] = await Promise.all([
      supabase.from('materials').select('id, codigo, material, unidade, quantidade, minimo, preco, tipo').eq('company_id', companyId).order('material'),
      supabase.from('raw_material_entries').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
      supabase.from('production_orders').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
      supabase.from('production_recipes').select('*').eq('company_id', companyId),
    ]);
    setLoading(false);
    if (m.error || e.error || o.error || r.error) { toast.error('Erro ao carregar dados da produção'); return; }
    const n = (v: unknown) => Number(v) || 0;
    setMats((m.data ?? []).map((x) => ({ ...x, quantidade: n(x.quantidade), minimo: n(x.minimo), preco: n(x.preco) })) as ProdMat[]);
    setEntries((e.data ?? []).map((x) => ({ ...x, quantidade: n(x.quantidade), quantidade_restante: n(x.quantidade_restante), custo_total: n(x.custo_total) })) as ProdEntry[]);
    setOrders((o.data ?? []).map((x) => ({ ...x, quantidade_consumida: n(x.quantidade_consumida), quantidade_produzida: n(x.quantidade_produzida), custo_materia_prima: n(x.custo_materia_prima) })) as ProdOrder[]);
    setRecipes((r.data ?? []).map((x) => ({ ...x, rendimento_esperado: n(x.rendimento_esperado) })) as ProdRecipe[]);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const matById = useMemo(() => Object.fromEntries(mats.map((m) => [m.id, m])) as Record<string, ProdMat>, [mats]);
  const entryById = useMemo(() => Object.fromEntries(entries.map((e) => [e.id, e])) as Record<string, ProdEntry>, [entries]);

  return { companyId, mats, entries, orders, recipes, loading, load, matById, entryById };
}

export const fmtDT = (s: string) => new Date(s).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
export const fmtD = (s: string | null) => (s ? new Date(s + 'T12:00:00').toLocaleDateString('pt-BR') : '-');
export const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const parseNum = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));
