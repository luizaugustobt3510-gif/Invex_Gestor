import { supabase } from '@/integrations/supabase/client';

/**
 * Serviço de Logística — acessa APENAS tabelas de logística:
 * materials, stock_movements, conciliacao_log, contagem_fisica,
 * saldo_sistema_importado, movimentacoes_importadas, temperature_records
 */

export const logisticaService = {
  async getMaterials(companyId: string) {
    return supabase
      .from('materials')
      .select('*')
      .eq('company_id', companyId)
      .order('codigo');
  },

  async getStockMovements(companyId: string, limit = 100) {
    return supabase
      .from('stock_movements')
      .select('*, materials(material, codigo)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit);
  },

  async getConciliacao(companyId: string) {
    return supabase
      .from('conciliacao_log')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
  },

  async getSaldoSistema(companyId: string) {
    return supabase
      .from('saldo_sistema_importado')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
  },

  async getContagemFisica(companyId: string) {
    return supabase
      .from('contagem_fisica')
      .select('*')
      .eq('company_id', companyId)
      .order('data_contagem', { ascending: false });
  },

  async getTemperatureRecords(companyId: string) {
    return supabase
      .from('temperature_records')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
  },

  async updateMaterialQuantity(companyId: string, codigo: string, quantidade: number) {
    return supabase
      .from('materials')
      .update({ quantidade })
      .eq('company_id', companyId)
      .eq('codigo', codigo);
  },
};
