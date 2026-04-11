import type { Insight } from './types';

interface FinStats {
  receitas: number;
  despesas: number;
  lucro: number;
  aReceber: number;
  aPagar: number;
}

export function generateFinanceiroInsights(stats: FinStats, entries: any[]): Insight[] {
  const insights: Insight[] = [];

  if (stats.lucro < 0) {
    insights.push({
      module: 'financeiro',
      type: 'danger',
      title: 'Prejuízo',
      message: `A empresa está com prejuízo de R$ ${Math.abs(stats.lucro).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} no período.`,
      suggestion: 'Analise as despesas e busque reduzir custos.',
      action: '/financeiro/relatorios',
    });
  } else if (stats.lucro > 0) {
    const margem = stats.receitas > 0 ? (stats.lucro / stats.receitas) * 100 : 0;
    insights.push({
      module: 'financeiro',
      type: margem < 10 ? 'warning' : 'success',
      title: 'Lucro',
      message: `Lucro de R$ ${stats.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (margem ${margem.toFixed(1)}%).`,
      suggestion: margem < 10 ? 'Margem estreita. Busque aumentar receitas ou reduzir custos.' : undefined,
      action: '/financeiro',
    });
  }

  if (stats.aPagar > 0) {
    insights.push({
      module: 'financeiro',
      type: stats.aPagar > stats.receitas * 0.5 ? 'danger' : 'warning',
      title: 'Contas a pagar',
      message: `R$ ${stats.aPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em contas a pagar.`,
      suggestion: 'Verifique os vencimentos e priorize pagamentos.',
      action: '/financeiro/lancamentos',
    });
  }

  if (stats.aReceber > 0) {
    insights.push({
      module: 'financeiro',
      type: 'warning',
      title: 'Contas a receber',
      message: `R$ ${stats.aReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em contas a receber.`,
      suggestion: 'Acompanhe cobranças para melhorar o fluxo de caixa.',
      action: '/financeiro/lancamentos',
    });
  }

  const hoje = new Date().toISOString().split('T')[0];
  const vencidas = entries.filter(
    (e: any) => e.status === 'pendente' && e.data_vencimento && e.data_vencimento < hoje
  );
  if (vencidas.length > 0) {
    const totalVencido = vencidas.reduce((s: number, e: any) => s + Number(e.valor), 0);
    insights.push({
      module: 'financeiro',
      type: 'danger',
      title: 'Contas vencidas',
      message: `${vencidas.length} conta(s) vencida(s) totalizando R$ ${totalVencido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      suggestion: 'Regularize as pendências imediatamente.',
      action: '/financeiro/lancamentos',
    });
  }

  if (stats.receitas === 0 && stats.despesas === 0) {
    insights.push({
      module: 'financeiro',
      type: 'warning',
      title: 'Sem movimentação',
      message: 'Nenhuma movimentação financeira registrada no período.',
      action: '/financeiro/lancamentos',
    });
  }

  return insights;
}
