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

/** Separa o propósito da caixinha do nome da pessoa/descrição do lançamento. */
export const CAIXINHA_LABEL_SEP = " — ";

/** "Reserva · <propósito>" ou, com quem pagou, "Reserva · <propósito> — <nome>". */
export const caixinhaDescription = (purpose: string, label?: string | null) => {
  const l = (label ?? "").trim();
  return `${CAIXINHA_PREFIX}${purpose.trim()}${l ? `${CAIXINHA_LABEL_SEP}${l}` : ""}`;
};

/** Lê propósito e nome (pessoa/descrição) de uma descrição de caixinha. */
export function parseCaixinha(description: string): { purpose: string; label: string } {
  const rest = description.startsWith(CAIXINHA_PREFIX) ? description.slice(CAIXINHA_PREFIX.length) : description;
  const i = rest.indexOf(CAIXINHA_LABEL_SEP);
  if (i < 0) return { purpose: rest.trim(), label: "" };
  return { purpose: rest.slice(0, i).trim(), label: rest.slice(i + CAIXINHA_LABEL_SEP.length).trim() };
}

type TxLike = Pick<Transaction, "type" | "subcategory" | "description" | "series_kind">;
/** Qualquer receita "Outros" com descrição "Reserva · <propósito>" é caixinha (avulsa ou recorrente). */
export const isCaixinha = (t: TxLike) =>
  t.type === "receita" && t.subcategory === "Outros" && t.description.startsWith(CAIXINHA_PREFIX);

/** Receita que é dinheiro guardado (caixinha ou reserva) — fica fora do saldo livre. */
export const isReservaTx = (t: TxLike) =>
  t.type === "receita" && t.subcategory === "Outros" && t.description.toLowerCase().includes("reserva");

/** Metas ficam em personal_budgets com a categoria "meta:<propósito>". */
export const GOAL_PREFIX = "meta:";
export const goalKey = (purpose: string) => `${GOAL_PREFIX}${purpose.trim().toLowerCase()}`;
export const isGoalKey = (category: string) => category.startsWith(GOAL_PREFIX);

export const caixinhaPurpose = (t: Pick<Transaction, "description">) =>
  t.description.startsWith(CAIXINHA_PREFIX) ? parseCaixinha(t.description).purpose : t.description;

/** Nome da pessoa/descrição guardado junto da caixinha ("" se não tiver). */
export const caixinhaLabel = (t: Pick<Transaction, "description">) =>
  t.description.startsWith(CAIXINHA_PREFIX) ? parseCaixinha(t.description).label : "";

/** Título para mostrar na lista: o nome da pessoa quando houver, senão a descrição/caixinha. */
export function txTitle(t: TxLike): string {
  if (!isCaixinha(t)) return t.description;
  const { purpose, label } = parseCaixinha(t.description);
  return label || purpose;
}

/**
 * Nova descrição ao mudar o destino de um lançamento.
 * - Guardando numa caixinha: mantém o nome (pessoa/descrição) junto do propósito.
 * - Tirando da caixinha: volta a ser o nome, ou o propósito se não houver nome.
 */
export function nextDescription(opts: { toCaixinha: boolean; purpose: string; label: string }): string {
  const label = opts.label.trim();
  if (opts.toCaixinha) return caixinhaDescription(opts.purpose, label);
  return label || opts.purpose.trim();
}

/** Nome atual de um lançamento qualquer (sem o prefixo da caixinha). */
export const currentLabel = (t: TxLike) => (isCaixinha(t) ? parseCaixinha(t.description).label : t.description);

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
  /** Total previsto somando todos os lançamentos (pagos e a receber). */
  planned: number; customGoal: boolean;
  paidCount: number; months: number; nextDate: string | null; lastDate: string;
};

/** Progresso de cada caixinha: quanto já foi guardado do total previsto. */
/** Agrupa por propósito (ex: todas as receitas "Viagem" juntas, de várias séries ou avulsas). */
export function summarizeCaixinhas(all: Transaction[], goals: Record<string, number> = {}): CaixinhaSummary[] {
  const map = new Map<string, Transaction[]>();
  for (const t of all) {
    if (!isCaixinha(t)) continue;
    const key = goalKey(caixinhaPurpose(t));
    const arr = map.get(key) ?? [];
    arr.push(t);
    map.set(key, arr);
  }
  return Array.from(map, ([seriesId, rows]) => {
    rows.sort((a, b) => a.date.localeCompare(b.date));
    const paid = rows.filter((r) => r.status === "pago");
    const next = rows.find((r) => r.status === "pendente");
    const planned = +rows.reduce((s, r) => s + Number(r.amount), 0).toFixed(2);
    const custom = goals[seriesId];
    return {
      seriesId,
      purpose: caixinhaPurpose(rows[0]),
      monthly: Number(rows[0].amount),
      planned,
      customGoal: custom > 0,
      goal: custom > 0 ? Number(custom) : planned,
      saved: +paid.reduce((s, r) => s + Number(r.amount), 0).toFixed(2),
      paidCount: paid.length,
      months: rows.length,
      nextDate: next?.date ?? null,
      lastDate: rows[rows.length - 1].date,
    };
  }).sort((a, b) => (a.nextDate ?? "9999").localeCompare(b.nextDate ?? "9999"));
}
