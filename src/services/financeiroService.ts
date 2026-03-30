import { supabase } from '@/integrations/supabase/client';

/**
 * Serviço Financeiro — acessa APENAS tabelas financeiras:
 * financial_entries, financial_categories
 *
 * Para consultar dados de vendas para faturamento, use vendasService
 * explicitamente via função de integração.
 */

export const financeiroService = {
  async getEntries(companyId: string) {
    return supabase
      .from('financial_entries')
      .select('*, financial_categories(nome)')
      .eq('company_id', companyId)
      .order('data', { ascending: false });
  },

  async getEntriesByPeriod(companyId: string, startDate: string, endDate: string) {
    return supabase
      .from('financial_entries')
      .select('*, financial_categories(nome)')
      .eq('company_id', companyId)
      .gte('data', startDate)
      .lte('data', endDate)
      .order('data', { ascending: false });
  },

  async getCategories(companyId: string) {
    return supabase
      .from('financial_categories')
      .select('*')
      .eq('company_id', companyId)
      .order('nome');
  },

  async createEntry(entry: {
    company_id: string;
    user_id: string;
    tipo: string;
    descricao: string;
    valor: number;
    data: string;
    status: string;
    categoria_id?: string | null;
    data_vencimento?: string | null;
    data_pagamento?: string | null;
    forma_pagamento?: string | null;
    origem?: string | null;
    origem_id?: string | null;
    observacoes?: string | null;
    recorrente?: boolean;
    periodicidade?: string | null;
  }) {
    return supabase.from('financial_entries').insert(entry);
  },

  async updateEntry(id: string, updates: Record<string, unknown>) {
    return supabase.from('financial_entries').update(updates).eq('id', id);
  },

  async deleteEntry(id: string) {
    return supabase.from('financial_entries').delete().eq('id', id);
  },

  /** Resumo financeiro (receitas, despesas, lucro) */
  computeStats(entries: Array<{ tipo: string; status: string; valor: number }>) {
    const receitas = entries
      .filter(e => e.tipo === 'receita' && e.status === 'pago')
      .reduce((s, e) => s + Number(e.valor), 0);
    const despesas = entries
      .filter(e => e.tipo === 'despesa' && e.status === 'pago')
      .reduce((s, e) => s + Number(e.valor), 0);
    const aReceber = entries
      .filter(e => e.tipo === 'receita' && e.status !== 'pago' && e.status !== 'cancelado')
      .reduce((s, e) => s + Number(e.valor), 0);
    const aPagar = entries
      .filter(e => e.tipo === 'despesa' && e.status !== 'pago' && e.status !== 'cancelado')
      .reduce((s, e) => s + Number(e.valor), 0);
    return { receitas, despesas, lucro: receitas - despesas, aReceber, aPagar };
  },
};
