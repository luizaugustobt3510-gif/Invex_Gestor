import { supabase } from '@/integrations/supabase/client';

/**
 * Serviço de Vendas — acessa APENAS tabelas de vendas:
 * sales, sale_items
 *
 * Para acessar o catálogo de produtos usa materials (somente leitura).
 * A integração com financeiro é feita via financeiroService.createEntry()
 * chamada explicitamente no fluxo de venda.
 */

export const vendasService = {
  async getSales(companyId: string) {
    return supabase
      .from('sales')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
  },

  async getSalesByPeriod(companyId: string, startDate: string, endDate: string) {
    return supabase
      .from('sales')
      .select('*')
      .eq('company_id', companyId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });
  },

  async getSaleItems(companyId: string, saleId?: string) {
    let query = supabase
      .from('sale_items')
      .select('*, materials(material, codigo)')
      .eq('company_id', companyId);
    if (saleId) query = query.eq('sale_id', saleId);
    return query;
  },

  async getSaleItemsByPeriod(companyId: string, saleIds: string[]) {
    if (saleIds.length === 0) return { data: [], error: null };
    return supabase
      .from('sale_items')
      .select('*, materials(material, codigo)')
      .eq('company_id', companyId)
      .in('sale_id', saleIds);
  },

  async createSale(sale: {
    company_id: string;
    user_id: string;
    valor_total: number;
    desconto: number;
    desconto_tipo: string;
    forma_pagamento: string;
    observacoes?: string;
  }) {
    return supabase.from('sales').insert(sale).select().single();
  },

  async createSaleItems(items: Array<{
    sale_id: string;
    company_id: string;
    material_id: string;
    quantidade: number;
    preco_unitario: number;
    subtotal: number;
  }>) {
    return supabase.from('sale_items').insert(items);
  },

  async cancelSale(saleId: string) {
    return supabase.from('sales').update({ status: 'cancelada' }).eq('id', saleId);
  },

  /** Catálogo de produtos (somente leitura) */
  async getProductCatalog(companyId: string) {
    return supabase
      .from('materials')
      .select('id, codigo, material, quantidade, preco, unidade')
      .eq('company_id', companyId)
      .order('material');
  },

  /** Estatísticas de vendas */
  computeStats(sales: Array<{ valor_total: number; status: string; forma_pagamento: string }>) {
    const finalizadas = sales.filter(s => s.status === 'finalizada');
    const totalVendas = finalizadas.length;
    const faturamento = finalizadas.reduce((s, v) => s + Number(v.valor_total), 0);
    const ticketMedio = totalVendas > 0 ? faturamento / totalVendas : 0;

    const porForma: Record<string, number> = {};
    finalizadas.forEach(s => {
      porForma[s.forma_pagamento] = (porForma[s.forma_pagamento] || 0) + Number(s.valor_total);
    });

    return { totalVendas, faturamento, ticketMedio, porForma };
  },
};
