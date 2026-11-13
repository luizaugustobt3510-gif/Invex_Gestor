import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { SaleLot } from './vendasCalc';

export interface CatalogProduct {
  id: string; codigo: string; material: string; quantidade: number; preco: number; unidade: string; tipo: string; minimo: number;
}
export interface Customer {
  id: string; company_id: string; nome: string; tipo_pessoa: 'fisica' | 'juridica'; documento: string | null; telefone: string | null;
  email: string | null; endereco: string | null; cidade: string | null; uf: string | null; segmento: string;
  prazo_pagamento_dias: number; limite_credito: number; nota: number; observacoes: string | null; ativo: boolean; created_at: string;
}

const n = (v: unknown) => Number(v) || 0;

/** Produtos, lotes com saldo e compradores da empresa (funciona com ou sem Produção/Logística). */
export function useVendasCatalog() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [lots, setLots] = useState<SaleLot[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!companyId) return;
    const [m, pl, raw, c] = await Promise.all([
      supabase.from('materials').select('id, codigo, material, quantidade, preco, unidade, tipo, minimo').eq('company_id', companyId).order('material'),
      supabase.from('product_lots').select('id, material_id, lote, data_producao, validade, quantidade_restante, created_at').eq('company_id', companyId).gt('quantidade_restante', 0),
      supabase.from('raw_material_entries').select('id, material_id, lote, numero_controle, validade, quantidade_restante, created_at').eq('company_id', companyId).gt('quantidade_restante', 0),
      supabase.from('customers').select('*').eq('company_id', companyId).order('nome'),
    ]);
    setLoading(false);
    setProducts((m.data ?? []).map((x) => ({ ...x, quantidade: n(x.quantidade), preco: n(x.preco), minimo: n(x.minimo) })) as CatalogProduct[]);
    const a: SaleLot[] = (pl.data ?? []).map((x) => ({
      id: x.id, tipo: 'produto', material_id: x.material_id, lote: x.lote, data_producao: x.data_producao, validade: x.validade,
      restante: n(x.quantidade_restante), created_at: x.created_at,
    }));
    // Lotes de matéria-prima também podem ser vendidos direto (sem processar)
    const b: SaleLot[] = (raw.data ?? []).map((x) => ({
      id: x.id, tipo: 'materia_prima', material_id: x.material_id, lote: x.lote || x.numero_controle,
      data_producao: new Date(x.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }),
      validade: x.validade, restante: n(x.quantidade_restante), created_at: x.created_at,
    }));
    setLots([...a, ...b]);
    setCustomers((c.data ?? []).map((x) => ({ ...x, prazo_pagamento_dias: n(x.prazo_pagamento_dias), limite_credito: n(x.limite_credito), nota: n(x.nota) })) as Customer[]);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const lotsByMaterial = useMemo(() => {
    const r: Record<string, SaleLot[]> = {};
    lots.forEach((l) => { (r[l.material_id] ??= []).push(l); });
    return r;
  }, [lots]);

  return { companyId, products, lots, lotsByMaterial, customers, loading, load };
}

export const fmtDate = (s: string | null | undefined) => (s ? new Date(s.slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR') : '-');
export const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
