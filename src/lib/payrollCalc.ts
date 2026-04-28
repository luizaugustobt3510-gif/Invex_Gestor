// Motor de cálculo da pré-folha de pagamento
// Suporta INSS progressivo, IRRF com dependentes, encargos patronais e overrides por empresa

export interface TaxBracket {
  min_value: number;
  max_value: number | null;
  rate: number;
  deduction: number;
  dependent_deduction: number;
}

export interface PayrollConfig {
  inss_mode: 'auto' | 'manual';
  inss_manual_rate: number;
  irrf_mode: 'auto' | 'manual';
  irrf_manual_rate: number;
  vt_mode: 'percent' | 'fixed';
  vt_value: number;
  other_discounts: number;
  inss_patronal_rate: number;
  fgts_rate: number;
  rat_rate: number;
  sistema_s_rate: number;
}

export interface PayrollInput {
  base_salary: number;
  bonus: number;
  faltas: number;
  pensao: number;
  pensao_is_percent: boolean;
  outros_descontos_emp: number;
  dependents: number;
  benefits_employee: number; // desconto de benefícios em folha
  benefits_company: number;  // custo empresa de benefícios
  vt_enabled: boolean;
}

export interface PayrollResult {
  gross_salary: number;
  inss_value: number;
  irrf_base: number;
  irrf_value: number;
  vt_value: number;
  pensao_value: number;
  faltas_value: number;
  total_discounts: number;
  net_salary: number;
  encargos_patronais: number;
  company_cost: number;
}

/**
 * Calcula INSS progressivo por faixas (cada faixa aplica sua própria alíquota
 * sobre a parcela correspondente do salário).
 */
export function calcINSS(salary: number, brackets: TaxBracket[], config: PayrollConfig): number {
  if (config.inss_mode === 'manual') {
    return Math.max(0, salary * (config.inss_manual_rate / 100));
  }
  const sorted = [...brackets].sort((a, b) => a.min_value - b.min_value);
  let total = 0;
  for (const b of sorted) {
    if (salary <= b.min_value) break;
    const max = b.max_value ?? Infinity;
    const taxable = Math.min(salary, max) - b.min_value;
    if (taxable > 0) total += taxable * (b.rate / 100);
  }
  // Teto INSS: aplica a maior faixa cap
  const top = sorted[sorted.length - 1];
  if (top?.max_value && salary > top.max_value) {
    // Já está coberto pelo loop até o teto
  }
  return Math.round(total * 100) / 100;
}

/**
 * Calcula IRRF sobre base = (salário bruto - INSS - dedução por dependentes - pensão).
 */
export function calcIRRF(
  base: number,
  brackets: TaxBracket[],
  config: PayrollConfig,
  dependents: number,
): number {
  if (config.irrf_mode === 'manual') {
    return Math.max(0, base * (config.irrf_manual_rate / 100));
  }
  const sorted = [...brackets].sort((a, b) => a.min_value - b.min_value);
  const depDeduction = (sorted[0]?.dependent_deduction ?? 189.59) * dependents;
  const taxable = Math.max(0, base - depDeduction);
  for (const b of sorted) {
    const max = b.max_value ?? Infinity;
    if (taxable >= b.min_value && taxable <= max) {
      const value = taxable * (b.rate / 100) - b.deduction;
      return Math.max(0, Math.round(value * 100) / 100);
    }
  }
  return 0;
}

export function computePayroll(
  input: PayrollInput,
  config: PayrollConfig,
  inssBrackets: TaxBracket[],
  irrfBrackets: TaxBracket[],
): PayrollResult {
  const gross = Math.max(0, input.base_salary + input.bonus - input.faltas);

  const inss = calcINSS(gross, inssBrackets, config);

  const pensao = input.pensao_is_percent
    ? Math.max(0, (gross - inss) * (input.pensao / 100))
    : Math.max(0, input.pensao);

  const irrfBase = Math.max(0, gross - inss - pensao);
  const irrf = calcIRRF(irrfBase, irrfBrackets, config, input.dependents);

  const vt = input.vt_enabled
    ? config.vt_mode === 'percent'
      ? gross * (config.vt_value / 100)
      : config.vt_value
    : 0;

  const faltasValue = input.faltas;
  const totalDiscounts =
    inss + irrf + vt + pensao + input.outros_descontos_emp + config.other_discounts + input.benefits_employee;

  const net = gross - (inss + irrf + vt + pensao + input.outros_descontos_emp + config.other_discounts + input.benefits_employee);

  // Encargos patronais sobre o bruto
  const encargosRate = (config.inss_patronal_rate + config.fgts_rate + config.rat_rate + config.sistema_s_rate) / 100;
  const encargos = gross * encargosRate;

  const companyCost = gross + encargos + input.benefits_company;

  return {
    gross_salary: round2(gross),
    inss_value: round2(inss),
    irrf_base: round2(irrfBase),
    irrf_value: round2(irrf),
    vt_value: round2(vt),
    pensao_value: round2(pensao),
    faltas_value: round2(faltasValue),
    total_discounts: round2(totalDiscounts),
    net_salary: round2(net),
    encargos_patronais: round2(encargos),
    company_cost: round2(companyCost),
  };
}

function round2(n: number) { return Math.round(n * 100) / 100; }

export function formatBRL(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
