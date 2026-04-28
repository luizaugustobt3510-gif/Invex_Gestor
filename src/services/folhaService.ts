import { supabase } from '@/integrations/supabase/client';
import { computePayroll, PayrollConfig, PayrollInput, TaxBracket } from '@/lib/payrollCalc';

export interface Employee {
  id: string;
  nome: string;
  cargo: string;
  departamento?: string | null;
  salario: number;
  status: string;
}

export interface PayrollEvent {
  id?: string;
  employee_id: string;
  competencia: string;
  type: 'bonus' | 'desconto' | 'falta' | 'pensao' | 'dependentes' | 'vt' | 'outros';
  description: string;
  value: number;
  is_percent?: boolean;
}

export interface PayrollForecastRow {
  id?: string;
  employee_id: string;
  competencia: string;
  base_salary: number;
  benefits_total: number;
  benefits_company: number;
  benefits_employee: number;
  bonus_total: number;
  faltas_value: number;
  inss_value: number;
  irrf_value: number;
  vt_value: number;
  pensao_value: number;
  other_discounts: number;
  total_discounts: number;
  gross_salary: number;
  net_salary: number;
  encargos_patronais: number;
  company_cost: number;
  dependents: number;
  status: 'aberto' | 'gerado' | 'cancelado';
}

export const folhaService = {
  async getConfig(companyId: string, competencia: string): Promise<PayrollConfig & { id?: string }> {
    const { data } = await supabase
      .from('payroll_config')
      .select('*')
      .eq('company_id', companyId)
      .eq('competencia', competencia)
      .maybeSingle();
    if (data) return data as any;
    return {
      inss_mode: 'auto', inss_manual_rate: 0,
      irrf_mode: 'auto', irrf_manual_rate: 0,
      vt_mode: 'percent', vt_value: 6,
      other_discounts: 0,
      inss_patronal_rate: 20, fgts_rate: 8, rat_rate: 2, sistema_s_rate: 5.8,
    };
  },

  async saveConfig(companyId: string, competencia: string, cfg: PayrollConfig) {
    const { data: existing } = await supabase
      .from('payroll_config')
      .select('id')
      .eq('company_id', companyId)
      .eq('competencia', competencia)
      .maybeSingle();
    if (existing?.id) {
      await supabase.from('payroll_config').update(cfg as any).eq('id', existing.id);
    } else {
      await supabase.from('payroll_config').insert({ ...cfg, company_id: companyId, competencia } as any);
    }
  },

  async getBrackets(companyId: string, year = 2025): Promise<{ inss: TaxBracket[]; irrf: TaxBracket[] }> {
    const { data } = await supabase
      .from('payroll_tax_brackets')
      .select('*')
      .or(`company_id.is.null,company_id.eq.${companyId}`)
      .eq('year', year);
    const all = data || [];
    // Override por empresa: se existir company-specific, ignora globais para o mesmo tipo
    const hasCompanyINSS = all.some((b: any) => b.tax_type === 'inss' && b.company_id === companyId);
    const hasCompanyIRRF = all.some((b: any) => b.tax_type === 'irrf' && b.company_id === companyId);
    return {
      inss: all.filter((b: any) => b.tax_type === 'inss' && (hasCompanyINSS ? b.company_id === companyId : !b.company_id)) as any,
      irrf: all.filter((b: any) => b.tax_type === 'irrf' && (hasCompanyIRRF ? b.company_id === companyId : !b.company_id)) as any,
    };
  },

  async getEmployees(companyId: string): Promise<Employee[]> {
    const { data } = await supabase
      .from('employees')
      .select('id, nome, cargo, departamento, salario, status')
      .eq('company_id', companyId)
      .order('nome');
    return (data || []) as any;
  },

  async getEvents(companyId: string, competencia: string): Promise<PayrollEvent[]> {
    const { data } = await supabase
      .from('payroll_events')
      .select('*')
      .eq('company_id', companyId)
      .eq('competencia', competencia);
    return (data || []) as any;
  },

  async saveEvents(companyId: string, competencia: string, employeeId: string, events: Omit<PayrollEvent,'id'>[]) {
    await supabase.from('payroll_events')
      .delete()
      .eq('company_id', companyId)
      .eq('competencia', competencia)
      .eq('employee_id', employeeId);
    if (events.length) {
      await supabase.from('payroll_events').insert(events.map(e => ({ ...e, company_id: companyId })) as any);
    }
  },

  async getBenefitsEmployee(companyId: string, competencia: string): Promise<Map<string, { company: number; employee: number }>> {
    const map = new Map<string, { company: number; employee: number }>();
    // Soma a partir de employee_benefits ativos
    const { data } = await supabase
      .from('employee_benefits')
      .select('employee_id, custom_value, payroll_discount, status, benefit:benefit_id (base_value, cost_type)')
      .eq('company_id', companyId)
      .eq('status', 'ativo');
    (data || []).forEach((eb: any) => {
      const total = eb.custom_value ?? eb.benefit?.base_value ?? 0;
      const employeeCost = Number(eb.payroll_discount || 0);
      const companyCost = Math.max(0, Number(total) - employeeCost);
      const cur = map.get(eb.employee_id) || { company: 0, employee: 0 };
      cur.company += companyCost;
      cur.employee += employeeCost;
      map.set(eb.employee_id, cur);
    });
    return map;
  },

  async simulate(companyId: string, competencia: string, employeeIds: string[]): Promise<PayrollForecastRow[]> {
    const [config, brackets, employees, events, benefits] = await Promise.all([
      this.getConfig(companyId, competencia),
      this.getBrackets(companyId),
      this.getEmployees(companyId),
      this.getEvents(companyId, competencia),
      this.getBenefitsEmployee(companyId, competencia),
    ]);

    const selected = employees.filter(e => employeeIds.includes(e.id));
    return selected.map(emp => {
      const empEvents = events.filter(ev => ev.employee_id === emp.id);
      const bonus = sumBy(empEvents.filter(e => e.type === 'bonus'), e => e.value);
      const faltas = sumBy(empEvents.filter(e => e.type === 'falta'), e => e.value);
      const outros = sumBy(empEvents.filter(e => e.type === 'desconto' || e.type === 'outros'), e => e.value);
      const pensaoEvent = empEvents.find(e => e.type === 'pensao');
      const dependents = Math.round(empEvents.find(e => e.type === 'dependentes')?.value || 0);
      const ben = benefits.get(emp.id) || { company: 0, employee: 0 };

      const input: PayrollInput = {
        base_salary: emp.salario,
        bonus, faltas,
        pensao: pensaoEvent?.value || 0,
        pensao_is_percent: pensaoEvent?.is_percent || false,
        outros_descontos_emp: outros,
        dependents,
        benefits_employee: ben.employee,
        benefits_company: ben.company,
        vt_enabled: !empEvents.some(e => e.type === 'vt' && e.value === 0),
      };
      const r = computePayroll(input, config, brackets.inss, brackets.irrf);
      return {
        employee_id: emp.id,
        competencia,
        base_salary: emp.salario,
        benefits_total: ben.company + ben.employee,
        benefits_company: ben.company,
        benefits_employee: ben.employee,
        bonus_total: bonus,
        faltas_value: r.faltas_value,
        inss_value: r.inss_value,
        irrf_value: r.irrf_value,
        vt_value: r.vt_value,
        pensao_value: r.pensao_value,
        other_discounts: outros + config.other_discounts,
        total_discounts: r.total_discounts,
        gross_salary: r.gross_salary,
        net_salary: r.net_salary,
        encargos_patronais: r.encargos_patronais,
        company_cost: r.company_cost,
        dependents,
        status: 'aberto',
      };
    });
  },

  async generate(companyId: string, userId: string, competencia: string, rows: PayrollForecastRow[]) {
    // Salva forecast (upsert)
    for (const row of rows) {
      const payload = { ...row, company_id: companyId, status: 'gerado' as const, generated_at: new Date().toISOString() };
      const { data: existing } = await supabase
        .from('payroll_forecast')
        .select('id')
        .eq('company_id', companyId)
        .eq('competencia', competencia)
        .eq('employee_id', row.employee_id)
        .maybeSingle();
      if (existing?.id) {
        await supabase.from('payroll_forecast').update(payload as any).eq('id', existing.id);
      } else {
        await supabase.from('payroll_forecast').insert(payload as any);
      }
    }

    // Lançamento agregado financeiro
    const totalCost = rows.reduce((s, r) => s + r.company_cost, 0);
    if (totalCost > 0) {
      await supabase.from('financial_entries').insert({
        company_id: companyId,
        user_id: userId,
        tipo: 'despesa',
        descricao: `Folha de Pagamento - ${competencia}`,
        valor: totalCost,
        data: new Date().toISOString().slice(0, 10),
        status: 'pendente',
        origem: 'folha',
        origem_id: competencia,
      } as any);
    }
  },

  async getHistory(companyId: string): Promise<PayrollForecastRow[]> {
    const { data } = await supabase
      .from('payroll_forecast')
      .select('*')
      .eq('company_id', companyId)
      .order('competencia', { ascending: false });
    return (data || []) as any;
  },
};

function sumBy<T>(arr: T[], fn: (t: T) => number): number {
  return arr.reduce((s, x) => s + (fn(x) || 0), 0);
}
