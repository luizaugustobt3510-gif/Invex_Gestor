import type { Transaction } from "@/lib/financas/transactions";
import { monthKey } from "@/lib/financas/format";

export type DreLine = { key: string; label: string; icon: string; total: number; pct: number; subs: { name: string; total: number }[] };
export type Dre = {
  receitas: number;
  receitasLinhas: DreLine[];
  despesas: number;
  despesasLinhas: DreLine[];
  resultado: number;
  /** % da receita que sobrou (negativo = gastou mais do que ganhou). */
  margem: number;
  pago: number;
  aPagar: number;
};

/** Mês de referência do lançamento: competência quando informada, senão o mês do vencimento. */
export const refMonth = (t: Pick<Transaction, "competencia" | "date">) => t.competencia || monthKey(t.date);

/** Lançamentos de um período: "AAAA-MM" (mês) ou "AAAA" (ano). Sem repetir dívidas atrasadas. */
export function transactionsForPeriod(all: Transaction[], period: string): Transaction[] {
  return all.filter((t) => (period.length === 4 ? refMonth(t).startsWith(`${period}-`) : refMonth(t) === period));
}

type CatInfo = (key: string) => { label: string; icon: string } | undefined;

function group(list: Transaction[], base: number, info: CatInfo): DreLine[] {
  const map = new Map<string, DreLine>();
  for (const t of list) {
    const c = info(t.category);
    const line = map.get(t.category) ?? { key: t.category, label: c?.label ?? t.category, icon: c?.icon ?? "📦", total: 0, pct: 0, subs: [] };
    line.total += Number(t.amount);
    const subName = t.subcategory || "Geral";
    const sub = line.subs.find((s) => s.name === subName);
    if (sub) sub.total += Number(t.amount); else line.subs.push({ name: subName, total: Number(t.amount) });
    map.set(t.category, line);
  }
  const lines = Array.from(map.values()).sort((a, b) => b.total - a.total);
  for (const l of lines) {
    l.total = round(l.total);
    l.pct = base > 0 ? round((l.total / base) * 100) : 0;
    l.subs = l.subs.map((s) => ({ ...s, total: round(s.total) })).sort((a, b) => b.total - a.total);
  }
  return lines;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** DRE pessoal: receitas − despesas = resultado, com cada categoria em % da receita. */
export function buildDre(list: Transaction[], info: CatInfo): Dre {
  const rec = list.filter((t) => t.type === "receita");
  const desp = list.filter((t) => t.type === "despesa");
  const receitas = round(rec.reduce((s, t) => s + Number(t.amount), 0));
  const despesas = round(desp.reduce((s, t) => s + Number(t.amount), 0));
  const resultado = round(receitas - despesas);
  return {
    receitas,
    receitasLinhas: group(rec, receitas, info),
    despesas,
    despesasLinhas: group(desp, receitas, info),
    resultado,
    margem: receitas > 0 ? round((resultado / receitas) * 100) : 0,
    pago: round(desp.filter((t) => t.status === "pago").reduce((s, t) => s + Number(t.amount), 0)),
    aPagar: round(desp.filter((t) => t.status !== "pago").reduce((s, t) => s + Number(t.amount), 0)),
  };
}
