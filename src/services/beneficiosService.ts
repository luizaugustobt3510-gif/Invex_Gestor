import { supabase } from '@/integrations/supabase/client';

export type BenefitType = 'saude' | 'alimentacao' | 'bem_estar' | 'outros';
export type CostType = 'empresa' | 'coparticipacao' | 'desconto_folha';
export type BenefitStatus = 'ativo' | 'inativo';
export type EmpBenefitStatus = 'ativo' | 'cancelado' | 'pendente';

export interface Benefit {
  id: string;
  company_id: string;
  name: string;
  type: BenefitType;
  cost_type: CostType;
  base_value: number;
  is_variable: boolean;
  allows_dependents: boolean;
  status: BenefitStatus;
  start_date: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeBenefit {
  id: string;
  company_id: string;
  employee_id: string;
  benefit_id: string;
  status: EmpBenefitStatus;
  start_date: string;
  end_date: string | null;
  custom_value: number | null;
  payroll_discount: number;
  dependents_count: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BenefitMonthly {
  id: string;
  company_id: string;
  employee_id: string;
  benefit_id: string;
  employee_benefit_id: string | null;
  competencia: string;
  company_cost: number;
  employee_cost: number;
  net_cost: number;
  financial_entry_id: string | null;
  financial_discount_id: string | null;
  created_at: string;
}

export const BENEFIT_TYPE_LABELS: Record<BenefitType, string> = {
  saude: 'Saúde',
  alimentacao: 'Alimentação',
  bem_estar: 'Bem-estar',
  outros: 'Outros',
};

export const COST_TYPE_LABELS: Record<CostType, string> = {
  empresa: '100% Empresa',
  coparticipacao: 'Coparticipação',
  desconto_folha: 'Desconto em Folha',
};

export const beneficiosService = {
  // ===== BENEFITS CATALOG =====
  async listBenefits(companyId: string) {
    return supabase
      .from('benefits')
      .select('*')
      .eq('company_id', companyId)
      .order('name');
  },

  async createBenefit(payload: Omit<Benefit, 'id' | 'created_at' | 'updated_at'>) {
    return supabase.from('benefits').insert(payload).select().single();
  },

  async updateBenefit(id: string, updates: Partial<Benefit>) {
    return supabase.from('benefits').update(updates).eq('id', id);
  },

  async deleteBenefit(id: string) {
    return supabase.from('benefits').delete().eq('id', id);
  },

  async seedDefaults(companyId: string) {
    const defaults = [
      { name: 'Vale Refeição', type: 'alimentacao' as BenefitType, cost_type: 'empresa' as CostType, base_value: 600, allows_dependents: false },
      { name: 'Vale Alimentação', type: 'alimentacao' as BenefitType, cost_type: 'empresa' as CostType, base_value: 500, allows_dependents: false },
      { name: 'Plano de Saúde', type: 'saude' as BenefitType, cost_type: 'coparticipacao' as CostType, base_value: 450, allows_dependents: true },
      { name: 'Plano Odontológico', type: 'saude' as BenefitType, cost_type: 'desconto_folha' as CostType, base_value: 60, allows_dependents: true },
      { name: 'Gympass / Wellness', type: 'bem_estar' as BenefitType, cost_type: 'desconto_folha' as CostType, base_value: 80, allows_dependents: false },
      { name: 'Vale-Transporte', type: 'outros' as BenefitType, cost_type: 'desconto_folha' as CostType, base_value: 220, allows_dependents: false },
    ];
    const rows = defaults.map(d => ({
      ...d,
      company_id: companyId,
      is_variable: false,
      status: 'inativo' as BenefitStatus,
      start_date: new Date().toISOString().slice(0, 10),
      description: '',
    }));
    return supabase.from('benefits').insert(rows);
  },

  // ===== EMPLOYEE BENEFITS =====
  async listEmployeeBenefits(companyId: string, employeeId?: string) {
    let q = supabase
      .from('employee_benefits')
      .select('*')
      .eq('company_id', companyId);
    if (employeeId) q = q.eq('employee_id', employeeId);
    return q.order('created_at', { ascending: false });
  },

  async createEmployeeBenefit(payload: Omit<EmployeeBenefit, 'id' | 'created_at' | 'updated_at'>) {
    return supabase.from('employee_benefits').insert(payload).select().single();
  },

  async updateEmployeeBenefit(id: string, updates: Partial<EmployeeBenefit>) {
    return supabase.from('employee_benefits').update(updates).eq('id', id);
  },

  async deleteEmployeeBenefit(id: string) {
    return supabase.from('employee_benefits').delete().eq('id', id);
  },

  // ===== MONTHLY =====
  async listMonthly(companyId: string, competencia?: string) {
    let q = supabase
      .from('benefits_monthly')
      .select('*')
      .eq('company_id', companyId);
    if (competencia) q = q.eq('competencia', competencia);
    return q.order('created_at', { ascending: false });
  },

  /**
   * Gera registros mensais para uma competência ("YYYY-MM").
   * - Lê todos employee_benefits ATIVOS
   * - Cria/atualiza benefits_monthly (UPSERT por unique key)
   * - Cria lançamento DESPESA por funcionário/benefício (custo da empresa)
   * - Cria lançamento RECEITA por funcionário (desconto descontado)
   */
  async generateCompetencia(companyId: string, userId: string, competencia: string) {
    // Carrega vínculos ativos
    const { data: links, error: linksError } = await supabase
      .from('employee_benefits')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'ativo');

    if (linksError) throw linksError;
    if (!links || links.length === 0) return { generated: 0 };

    // Carrega benefícios e funcionários referenciados
    const benefitIds = Array.from(new Set(links.map(l => l.benefit_id)));
    const empIds = Array.from(new Set(links.map(l => l.employee_id)));
    const [{ data: benefits }, { data: emps }] = await Promise.all([
      supabase.from('benefits').select('*').in('id', benefitIds),
      supabase.from('employees').select('id, nome').in('id', empIds),
    ]);
    const benefitMap = new Map((benefits || []).map(b => [b.id, b as Benefit]));
    const empMap = new Map((emps || []).map(e => [e.id, e.nome as string]));

    // Categorias financeiras (criar "Benefícios" se não existir)
    let categoriaId: string | null = null;
    const { data: cats } = await supabase
      .from('financial_categories')
      .select('id')
      .eq('company_id', companyId)
      .eq('nome', 'Benefícios')
      .maybeSingle();
    if (cats?.id) {
      categoriaId = cats.id;
    } else {
      const { data: newCat } = await supabase
        .from('financial_categories')
        .insert({ company_id: companyId, nome: 'Benefícios', tipo: 'despesa', is_default: false })
        .select('id')
        .single();
      categoriaId = newCat?.id || null;
    }

    const dataLancamento = `${competencia}-05`;
    let generated = 0;

    for (const link of links) {
      const benefit = benefitMap.get(link.benefit_id);
      if (!benefit) continue;
      const empNome = empMap.get(link.employee_id) ?? 'Funcionário';
      const valorTotal = Number(link.custom_value ?? benefit.base_value ?? 0);
      const desconto = Number(link.payroll_discount ?? 0);
      const employeeCost = desconto;
      const companyCost = Math.max(valorTotal - desconto, 0);
      const netCost = companyCost;

      // Criar lançamento de despesa (custo empresa)
      let financialEntryId: string | null = null;
      let financialDiscountId: string | null = null;

      if (companyCost > 0) {
        const { data: expense } = await supabase
          .from('financial_entries')
          .insert({
            company_id: companyId,
            user_id: userId,
            tipo: 'despesa',
            descricao: `Benefício ${benefit.name} - ${empNome} (${competencia})`,
            valor: companyCost,
            data: dataLancamento,
            data_vencimento: dataLancamento,
            status: 'pendente',
            categoria_id: categoriaId,
            origem: 'beneficios',
            origem_id: `${link.id}_${competencia}`,
            observacoes: `Custo da empresa para o benefício ${benefit.name}.`,
          })
          .select('id')
          .single();
        financialEntryId = expense?.id ?? null;
      }

      if (employeeCost > 0) {
        const { data: discount } = await supabase
          .from('financial_entries')
          .insert({
            company_id: companyId,
            user_id: userId,
            tipo: 'receita',
            descricao: `Desconto ${benefit.name} - ${empNome} (${competencia})`,
            valor: employeeCost,
            data: dataLancamento,
            data_vencimento: dataLancamento,
            status: 'pendente',
            categoria_id: categoriaId,
            origem: 'beneficios_desconto',
            origem_id: `${link.id}_${competencia}`,
            observacoes: `Desconto em folha do colaborador.`,
          })
          .select('id')
          .single();
        financialDiscountId = discount?.id ?? null;
      }

      // Upsert benefits_monthly
      const { error: upsertErr } = await supabase
        .from('benefits_monthly')
        .upsert({
          company_id: companyId,
          employee_id: link.employee_id,
          benefit_id: link.benefit_id,
          employee_benefit_id: link.id,
          competencia,
          company_cost: companyCost,
          employee_cost: employeeCost,
          net_cost: netCost,
          financial_entry_id: financialEntryId,
          financial_discount_id: financialDiscountId,
        }, { onConflict: 'company_id,employee_id,benefit_id,competencia' });

      if (!upsertErr) generated += 1;
    }

    return { generated };
  },

  /**
   * Custo total de benefícios por funcionário (soma do net_cost no período).
   */
  async getEmployeeTotalCost(companyId: string, employeeId: string, competencia?: string) {
    let q = supabase
      .from('benefits_monthly')
      .select('company_cost, employee_cost, net_cost')
      .eq('company_id', companyId)
      .eq('employee_id', employeeId);
    if (competencia) q = q.eq('competencia', competencia);
    const { data } = await q;
    return (data || []).reduce(
      (acc, r) => ({
        company_cost: acc.company_cost + Number(r.company_cost),
        employee_cost: acc.employee_cost + Number(r.employee_cost),
        net_cost: acc.net_cost + Number(r.net_cost),
      }),
      { company_cost: 0, employee_cost: 0, net_cost: 0 }
    );
  },
};

export function currentCompetencia(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function competenciaLabel(comp: string): string {
  const [y, m] = comp.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[Number(m) - 1]}/${y}`;
}
