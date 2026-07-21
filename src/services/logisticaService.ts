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

  // ============================================================
  // Integração Almoxarifado ↔ Enfermagem
  // ============================================================

  /** Saldo de materiais por setor (opcionalmente filtrado por setor). */
  async getSectorStock(companyId: string, sectorId?: string) {
    let q = supabase
      .from('sector_stock')
      .select('id, sector_id, material_id, quantidade, updated_at, materials(codigo, material, unidade, preco_unitario, preco), sectors(nome)')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false });
    if (sectorId) q = q.eq('sector_id', sectorId);
    return q;
  },

  /** Aprova e entrega uma solicitação de material (debita central + credita setor). */
  async deliverMaterialRequest(requestId: string, sectorId?: string) {
    return supabase.rpc('deliver_material_request', {
      _request_id: requestId,
      _sector_id: sectorId ?? undefined,
    } as any);
  },

  /** Transferência avulsa do estoque central para um setor. */
  async transferToSector(
    companyId: string,
    materialId: string,
    sectorId: string,
    quantidade: number,
    obs?: string
  ) {
    return supabase.rpc('transfer_material_to_sector', {
      _company_id: companyId,
      _material_id: materialId,
      _sector_id: sectorId,
      _quantidade: quantidade,
      _obs: obs ?? null,
    } as any);
  },

  /** Histórico de consumo assistencial. */
  async getPatientConsumptions(companyId: string, patientId?: string) {
    let q = supabase
      .from('patient_consumptions')
      .select('*, patients(nome), materials(codigo, material, unidade), sectors(nome)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (patientId) q = q.eq('patient_id', patientId);
    return q;
  },
};

