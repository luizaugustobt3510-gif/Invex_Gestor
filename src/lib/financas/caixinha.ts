/**
 * Receitas recorrentes e "caixinhas" (reserva mensal com um propósito, ex: Viagem).
 *
 * Uma caixinha é uma série recorrente de receitas na subcategoria "Outros"
 * com descrição "Reserva · <propósito>" — assim conta como "reserva" nos
 * totais e no limite do plano gratuito, sem precisar de tabela nova.
 */
import type { Transaction } from "@/lib/financas/transactions";

export const CAIXINHA_PREFIX = "Reserva · ";
export const SERIES_MIN_MONTHS = 2;
export const SERIES_MAX_MONTHS = 60;

export const clampMonths = (raw: string | number, fallback = 12) => {
  const n = typeof raw === "number" ? raw : parseInt(raw, 10);
  return Math.max(SERIES_MIN_MONTHS, Math.min(SERIES_MAX_MONTHS, Number.isFinite(n) ? n : fallback));
};

export function addMonthsISO(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const day = Math.min(d, lastDay);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export const caixinhaDescription = (purpose: string) => `${CAIXINHA_PREFIX}${purpose.trim()}`;

type TxLike = Pick<Transaction, "type" | "subcategory" | "description" | "series_kind">;
export const isCaixinha = (t: TxLike) =>
  t.type === "receita" && t.series_kind === "recorrente" && t.subcategory === "Outros" && t.description.startsWith(CAIXINHA_PREFIX);

export const caixinhaPurpose = (t: Pick<Transaction, "description">) =>
  t.description.startsWith(CAIXINHA_PREFIX) ? t.description.slice(CAIXINHA_PREFIX.length) : t.description;

/** Gera 1 lançamento por mês. Só o primeiro pode nascer pago; os seguintes ficam pendentes. */
export function buildMonthlySeries<T extends object>(base: T, opts: {
  amount: number; date: string; months: number; seriesId: string; firstPaid: boolean;
}) {
  const months = clampMonths(opts.months);
  return Array.from({ length: months }, (_, i) => ({
    ...base,
    amount: opts.amount,
    date: addMonthsISO(opts.date, i),
    series_id: opts.seriesId,
    series_kind: "recorrente" as const,
    installment_number: i + 1,
    installment_total: months,
    status: i === 0 && opts.firstPaid ? ("pago" as const) : ("pendente" as const),
  }));
}

export type CaixinhaSummary = {
  seriesId: string; purpose: string; monthly: number; goal: number; saved: number;
  paidCount: number; months: number; nextDate: string | null; lastDate: string;
};

/** Progresso de cada caixinha: quanto já foi guardado do total previsto. */
export function summarizeCaixinhas(all: Transaction[]): CaixinhaSummary[] {
  const map = new Map<string, Transaction[]>();
  for (const t of all) {
    if (!t.series_id || !isCaixinha(t)) continue;
    const arr = map.get(t.series_id) ?? [];
    arr.push(t);
    map.set(t.series_id, arr);
  }
  return Array.from(map, ([seriesId, rows]) => {
    rows.sort((a, b) => a.date.localeCompare(b.date));
    const paid = rows.filter((r) => r.status === "pago");
    const next = rows.find((r) => r.status === "pendente");
    return {
      seriesId,
      purpose: caixinhaPurpose(rows[0]),
      monthly: Number(rows[0].amount),
      goal: +rows.reduce((s, r) => s + Number(r.amount), 0).toFixed(2),
      saved: +paid.reduce((s, r) => s + Number(r.amount), 0).toFixed(2),
      paidCount: paid.length,
      months: rows.length,
      nextDate: next?.date ?? null,
      lastDate: rows[rows.length - 1].date,
    };
  }).sort((a, b) => (a.nextDate ?? "9999").localeCompare(b.nextDate ?? "9999"));
}
