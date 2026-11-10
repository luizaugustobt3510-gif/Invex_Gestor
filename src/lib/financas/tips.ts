export type Tip = { title: string; text: string; tone: "alerta" | "boa" | "dica" };

export const GENERAL_TIPS: Tip[] = [
  { tone: "dica", title: "Pague-se primeiro", text: "Assim que o salário cair, separe um valor para a reserva antes de gastar com o resto." },
  { tone: "dica", title: "Regra 50-30-20", text: "Uma referência: 50% para o essencial, 30% para estilo de vida e 20% para poupar ou quitar dívidas." },
  { tone: "dica", title: "Reserva de emergência", text: "O ideal é guardar de 3 a 6 meses do seu custo mensal em um lugar seguro e de resgate rápido." },
  { tone: "dica", title: "Cuidado com parcelas", text: "Some todas as parcelas que já tem antes de assumir uma nova. Pequenas parcelas juntas pesam muito." },
  { tone: "dica", title: "Cartão de crédito", text: "Evite pagar só o mínimo da fatura: os juros do rotativo estão entre os mais altos do país." },
  { tone: "dica", title: "Assinaturas esquecidas", text: "Revise streaming, apps e clubes todo mês. Cancele o que você não usou nos últimos 30 dias." },
  { tone: "dica", title: "Compras por impulso", text: "Espere 24 horas antes de comprar algo que não estava planejado. Muitas vezes a vontade passa." },
  { tone: "dica", title: "Dívida mais cara primeiro", text: "Ao quitar dívidas, comece pela de juros mais altos — você economiza mais no total." },
  { tone: "dica", title: "Contas com data", text: "Coloque as contas fixas para vencer logo depois do dia do pagamento, assim nada atrasa." },
  { tone: "dica", title: "Metas com prazo", text: "Dê um valor e uma data para cada objetivo. 'Viajar' vira 'R$ 3.000 até dezembro'." },
  { tone: "dica", title: "Mercado com lista", text: "Ir ao mercado com lista e sem fome reduz bastante os gastos extras." },
  { tone: "dica", title: "Revise todo mês", text: "Reserve 15 minutos no fim do mês para olhar onde o dinheiro foi e ajustar o teto das categorias." },
];

export type TipInput = { receitas: number; despesas: number; atrasadas: number; pendentes: number; maiorCategoria?: { label: string; total: number } };

/** Dicas que olham para o seu mês: aparecem antes das dicas gerais. */
export function contextualTips(s: TipInput): Tip[] {
  const out: Tip[] = [];
  if (s.atrasadas > 0) out.push({ tone: "alerta", title: "Contas atrasadas", text: "Você tem contas vencidas. Priorize pagá-las para evitar multa e juros." });
  if (s.receitas > 0 && s.despesas > s.receitas) out.push({ tone: "alerta", title: "Gastando mais do que ganha", text: "As despesas do mês passaram das receitas. Veja qual categoria dá para cortar primeiro." });
  if (s.receitas > 0 && s.maiorCategoria && s.maiorCategoria.total / s.receitas > 0.4)
    out.push({ tone: "alerta", title: `${s.maiorCategoria.label} pesando`, text: `Essa categoria leva mais de 40% da sua renda do mês. Que tal definir um teto para ela?` });
  if (s.receitas > 0 && s.despesas <= s.receitas * 0.8 && s.atrasadas === 0)
    out.push({ tone: "boa", title: "Mês no azul", text: "Você está gastando menos de 80% do que ganha. Guarde a sobra antes que ela vire gasto." });
  return out;
}
