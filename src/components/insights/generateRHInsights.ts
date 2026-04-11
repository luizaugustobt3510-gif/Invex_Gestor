import type { Insight } from './types';

interface RHData {
  employees: any[];
  terminations?: any[];
  certificates?: any[];
  trainings?: any[];
  asos?: any[];
  vacations?: any[];
}

export function generateRHInsights(data: RHData): Insight[] {
  const { employees, terminations = [], certificates = [], trainings = [], asos = [], vacations = [] } = data;
  const insights: Insight[] = [];

  const ativos = employees.filter(e => e.status === 'ativo');
  const total = employees.length;
  const now = new Date();
  const hoje = now.toISOString().split('T')[0];
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const desligMes = terminations.filter(t => t.data_desligamento >= inicioMes).length;
  const admMes = employees.filter(e => e.data_admissao >= inicioMes).length;
  const turnover = total > 0 ? ((admMes + desligMes) / total) * 100 : 0;

  if (desligMes > 0) {
    insights.push({
      module: 'rh',
      type: turnover > 10 ? 'danger' : 'warning',
      title: 'Turnover',
      message: `${desligMes} desligamento(s) no mês (turnover ${turnover.toFixed(1)}%).`,
      suggestion: turnover > 10 ? 'Índice alto. Investigue as causas da rotatividade.' : undefined,
      action: '/rh/turnover',
    });
  }

  if (terminations.length > 0) {
    const motivos: Record<string, number> = {};
    terminations.forEach(t => { motivos[t.motivo] = (motivos[t.motivo] || 0) + 1; });
    const topMotivo = Object.entries(motivos).sort((a, b) => b[1] - a[1])[0];
    if (topMotivo) {
      insights.push({
        module: 'rh',
        type: 'warning',
        title: 'Motivo principal',
        message: `Principal motivo de desligamento: ${topMotivo[0]} (${topMotivo[1]}x).`,
        action: '/rh/desligamentos',
      });
    }
  }

  const diasAtestado = certificates.filter(c => c.data_inicio >= inicioMes).reduce((s: number, c: any) => s + (c.dias || 0), 0);
  const absenteismo = ativos.length > 0 ? (diasAtestado / (ativos.length * 22)) * 100 : 0;
  if (absenteismo > 5) {
    insights.push({
      module: 'rh',
      type: 'danger',
      title: 'Absenteísmo alto',
      message: `Índice de absenteísmo: ${absenteismo.toFixed(1)}%.`,
      suggestion: 'Investigue causas de afastamento.',
      action: '/rh/atestados',
    });
  }

  const latestAso = new Map<string, string>();
  asos.forEach((a: any) => {
    if (!a.data_vencimento) return;
    const c = latestAso.get(a.employee_id);
    if (!c || a.data_vencimento > c) latestAso.set(a.employee_id, a.data_vencimento);
  });
  const asoVencido = [...latestAso.values()].filter(v => v < hoje).length;
  if (asoVencido > 0) {
    insights.push({
      module: 'rh',
      type: 'danger',
      title: 'ASO vencido',
      message: `${asoVencido} colaborador(es) com exame (ASO) vencido.`,
      suggestion: 'Agende os exames periódicos imediatamente.',
      action: '/rh/aso',
    });
  }

  const latestTrain = new Map<string, string>();
  trainings.forEach((t: any) => {
    if (!t.data_validade) return;
    const c = latestTrain.get(t.employee_id);
    if (!c || t.data_validade > c) latestTrain.set(t.employee_id, t.data_validade);
  });
  const trainVencido = [...latestTrain.values()].filter(v => v < hoje).length;
  if (trainVencido > 0) {
    insights.push({
      module: 'rh',
      type: 'danger',
      title: 'Treinamentos vencidos',
      message: `${trainVencido} colaborador(es) com treinamentos vencidos.`,
      action: '/rh/treinamentos',
    });
  }

  const em30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const feriasProx = vacations.filter(v => v.status !== 'cancelada' && v.data_inicio >= hoje && v.data_inicio <= em30).length;
  if (feriasProx > 0) {
    insights.push({
      module: 'rh',
      type: 'warning',
      title: 'Férias próximas',
      message: `${feriasProx} colaborador(es) com férias nos próximos 30 dias.`,
      action: '/rh/ferias',
    });
  }

  if (terminations.length === 0 && asoVencido === 0 && trainVencido === 0) {
    insights.push({
      module: 'rh',
      type: 'success',
      title: 'Conformidade',
      message: 'Todos os indicadores de RH estão em dia.',
      action: '/rh',
    });
  }

  const custoFolha = ativos.reduce((s, e) => s + Number(e.salario || 0), 0);
  if (custoFolha > 0) {
    const custoMedio = custoFolha / ativos.length;
    insights.push({
      module: 'rh',
      type: 'success',
      title: 'Custo da folha',
      message: `Folha mensal: R$ ${custoFolha.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (média R$ ${custoMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/colab.).`,
      action: '/rh/analises',
    });
  }

  return insights;
}
