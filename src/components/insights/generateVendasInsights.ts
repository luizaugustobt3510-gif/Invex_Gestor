import type { Insight } from './types';

interface VendasStats {
  totalVendas: number;
  faturamento: number;
  ticketMedio: number;
  porForma: Record<string, number>;
}

export function generateVendasInsights(stats: VendasStats, sales: any[]): Insight[] {
  const insights: Insight[] = [];

  if (stats.totalVendas === 0) {
    insights.push({
      module: 'vendas',
      type: 'warning',
      title: 'Sem vendas',
      message: 'Nenhuma venda registrada no período.',
      suggestion: 'Revise as estratégias comerciais.',
      action: '/vendas/pdv',
    });
    return insights;
  }

  insights.push({
    module: 'vendas',
    type: stats.faturamento > 0 ? 'success' : 'warning',
    title: 'Faturamento',
    message: `Faturamento de R$ ${stats.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} com ${stats.totalVendas} venda(s).`,
    action: '/vendas',
  });

  if (stats.ticketMedio > 0) {
    insights.push({
      module: 'vendas',
      type: 'success',
      title: 'Ticket médio',
      message: `Ticket médio de R$ ${stats.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      action: '/vendas/relatorios',
    });
  }

  const formas = Object.entries(stats.porForma);
  if (formas.length > 0) {
    const top = formas.sort((a, b) => b[1] - a[1])[0];
    const labels: Record<string, string> = {
      dinheiro: 'Dinheiro', pix: 'Pix',
      cartao_credito: 'Cartão de Crédito', cartao_debito: 'Cartão de Débito',
    };
    const pct = stats.faturamento > 0 ? ((top[1] / stats.faturamento) * 100).toFixed(0) : '0';
    insights.push({
      module: 'vendas',
      type: 'success',
      title: 'Forma de pagamento',
      message: `${labels[top[0]] || top[0]} é a forma mais utilizada (${pct}% do faturamento).`,
      action: '/vendas/relatorios',
    });
  }

  const canceladas = sales.filter(s => s.status === 'cancelada').length;
  if (canceladas > 0) {
    const pct = ((canceladas / sales.length) * 100).toFixed(0);
    insights.push({
      module: 'vendas',
      type: Number(pct) > 20 ? 'danger' : 'warning',
      title: 'Cancelamentos',
      message: `${canceladas} venda(s) cancelada(s) (${pct}%).`,
      suggestion: 'Investigue os motivos de cancelamento.',
      action: '/vendas/historico',
    });
  }

  return insights;
}
