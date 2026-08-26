export type ValidadeStatus = 'sem_validade' | 'vencido' | 'critico' | 'atencao' | 'ok';

export interface ValidadeInfo {
  status: ValidadeStatus;
  dias: number | null;
  label: string;
}

/** Dias restantes até a validade (negativo = vencido). */
export const diasParaVencer = (validade?: string | null): number | null => {
  if (!validade) return null;
  const d = new Date(`${String(validade).slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - hoje.getTime()) / 86400000);
};

/**
 * Classificação padrão de validade usada em todo o sistema:
 * vencido (<0), crítico (<=30), atenção (<=90), ok (>90).
 */
export const getValidadeInfo = (validade?: string | null): ValidadeInfo => {
  const dias = diasParaVencer(validade);
  if (dias === null) return { status: 'sem_validade', dias: null, label: 'Sem validade' };
  if (dias < 0) return { status: 'vencido', dias, label: `Vencido há ${Math.abs(dias)} dia(s)` };
  if (dias <= 30) return { status: 'critico', dias, label: `Vence em ${dias} dia(s)` };
  if (dias <= 90) return { status: 'atencao', dias, label: `Vence em ${dias} dia(s)` };
  return { status: 'ok', dias, label: `Vence em ${dias} dia(s)` };
};

export const formatValidade = (validade?: string | null) => {
  if (!validade) return '-';
  const [y, m, d] = String(validade).slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : String(validade);
};
