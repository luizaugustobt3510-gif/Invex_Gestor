import type { Insight } from './types';

interface MaterialData {
  quantidade: number;
  minimo: number;
  maximo: number;
  preco: number;
  material: string;
}

interface ConcData {
  ok: number;
  sobra: number;
  falta: number;
  valorDiv: number;
}

export function generateLogisticaInsights(
  materials: MaterialData[],
  conciliation?: ConcData
): Insight[] {
  const insights: Insight[] = [];
  const total = materials.length;
  if (total === 0) return insights;

  const zerados = materials.filter(m => m.quantidade <= 0);
  const abaixo = materials.filter(m => m.quantidade > 0 && m.quantidade < m.minimo);
  const acima = materials.filter(m => m.maximo > 0 && m.quantidade > m.maximo);

  if (zerados.length > 0) {
    insights.push({
      module: 'logistica',
      type: 'danger',
      title: 'Itens zerados',
      message: `${zerados.length} item(ns) com estoque zerado.`,
      suggestion: 'Providencie reposição imediata para evitar rupturas.',
      action: '/itens-criticos',
    });
  }

  if (abaixo.length > 0) {
    insights.push({
      module: 'logistica',
      type: 'warning',
      title: 'Estoque baixo',
      message: `${abaixo.length} item(ns) abaixo do estoque mínimo.`,
      suggestion: 'Revise os pedidos de compra para esses itens.',
      action: '/itens-criticos',
    });
  }

  if (acima.length > 0) {
    insights.push({
      module: 'logistica',
      type: 'warning',
      title: 'Excesso de estoque',
      message: `${acima.length} item(ns) acima do estoque máximo.`,
      suggestion: 'Considere rever os níveis máximos ou redistribuir.',
      action: '/atualizar-estoque',
    });
  }

  if (zerados.length === 0 && abaixo.length === 0) {
    insights.push({
      module: 'logistica',
      type: 'success',
      title: 'Estoque saudável',
      message: 'Todos os itens estão com estoque dentro do esperado.',
      action: '/logistica/dashboard',
    });
  }

  if (conciliation) {
    if (conciliation.falta > 0) {
      insights.push({
        module: 'logistica',
        type: 'danger',
        title: 'Divergência de conciliação',
        message: `${conciliation.falta} item(ns) com falta na conciliação (R$ ${conciliation.valorDiv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`,
        suggestion: 'Investigue as causas da divergência.',
        action: '/conciliacao?filtro=falta',
      });
    }
    if (conciliation.sobra > 0 && conciliation.falta === 0) {
      insights.push({
        module: 'logistica',
        type: 'warning',
        title: 'Sobra na conciliação',
        message: `${conciliation.sobra} item(ns) com sobra na conciliação.`,
        action: '/conciliacao?filtro=sobra',
      });
    }
    if (conciliation.ok > 0 && conciliation.falta === 0 && conciliation.sobra === 0) {
      insights.push({
        module: 'logistica',
        type: 'success',
        title: 'Conciliação OK',
        message: 'Nenhuma divergência encontrada na conciliação.',
        action: '/conciliacao',
      });
    }
  }

  return insights;
}
