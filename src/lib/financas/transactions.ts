import { supabase } from "@/integrations/supabase/client";
import { DEBT_SUBCATEGORIES } from "@/lib/financas/categories";
import { monthKey, currentMonthKey } from "@/lib/financas/format";

export type Transaction = {
  id: string;
  user_id: string;
  type: "receita" | "despesa";
  category: string;
  subcategory: string;
  description: string;
  amount: number;
  date: string;
  status: "pago" | "pendente";
  note: string | null;
  person_id: string | null;
  series_id: string | null;
  series_kind: "parcelado" | "recorrente" | null;
  installment_number: number | null;
  installment_total: number | null;
  competencia: string | null;
  created_at: string;
  pinned?: boolean;
  color_tag?: "amarelo" | "laranja" | "vermelho" | null;
  carried_over?: boolean;
  vencida?: boolean;
  original_date?: string;
};

export async function fetchTransactions(ownerId?: string): Promise<Transaction[]> {
  let q = supabase
    .from("personal_transactions")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (ownerId) q = q.eq("user_id", ownerId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((t) => ({ ...t, amount: Number(t.amount) })) as Transaction[];
}

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Vencida quando passou mais de 1 dia do vencimento sem ser paga.
export function isVencida(t: Transaction, todayDate = todayISO()): boolean {
  if (t.type !== "despesa" || t.status !== "pendente") return false;
  // soma 1 dia ao vencimento
  const [y, m, d] = t.date.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  due.setDate(due.getDate() + 1);
  const limite = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;
  return todayDate > limite;
}

/**
 * Lançamentos visíveis para um mês.
 *
 * - Usa `competencia` quando informada (mês de referência da despesa),
 *   senão usa o mês da data de vencimento.
 * - Despesas vencidas (1+ dia após o vencimento) e não pagas aparecem
 *   automaticamente como dívida no(s) mês(es) seguintes até o mês atual,
 *   sem poluir meses futuros.
 */
export function transactionsForMonth(all: Transaction[], targetMonth: string): Transaction[] {
  const today = currentMonthKey();
  const todayDate = todayISO();
  const refMonth = (t: Transaction) => t.competencia || monthKey(t.date);

  if (targetMonth > today) {
    return all.filter((t) => refMonth(t) === targetMonth);
  }
  const out: Transaction[] = [];
  for (const t of all) {
    const m = refMonth(t);
    if (m === targetMonth) {
      out.push({ ...t, vencida: isVencida(t, todayDate) });
    } else if (m < targetMonth && isVencida(t, todayDate)) {
      out.push({ ...t, carried_over: true, vencida: true, original_date: t.date });
    }
  }
  return out;
}

export function computeSummary(transactions: Transaction[]) {
  let receitas = 0, receitasRecebidas = 0, despesas = 0, despesasPagas = 0, dividas = 0, emergencia = 0, atrasadas = 0;
  for (const t of transactions) {
    const v = Number(t.amount);
    if (t.type === "receita") {
      receitas += v;
      if (t.status === "pago") receitasRecebidas += v;
      // Reserva = só o que já foi guardado (depósitos de caixinha a fazer não contam)
      if (t.status === "pago" && t.subcategory === "Outros" && t.description.toLowerCase().includes("reserva")) {
        emergencia += v;
      }
    } else {
      despesas += v;
      if (t.status === "pago") despesasPagas += v;
      if (DEBT_SUBCATEGORIES.has(t.subcategory) || t.subcategory === "Emergências" || t.vencida) {
        dividas += v;
      }
      if (t.vencida) atrasadas += v;
    }
  }

  const disponivelReal = receitas - despesas;
  // Saldo na conta = só o que já entrou menos o que já saiu.
  const saldoFinal = receitasRecebidas - despesasPagas;
  return {
    receitas, receitasRecebidas, despesas, despesasPagas, dividas, emergencia, atrasadas,
    disponivelReal, saldoFinal,
    pendentes: despesas - despesasPagas,
    aReceber: receitas - receitasRecebidas,
  };
}

export function healthStatus(disponivel: number) {
  if (disponivel >= 1000) return { label: "Saudável", emoji: "🟢", tone: "income" as const };
  if (disponivel >= 500) return { label: "Atenção", emoji: "🟡", tone: "warning" as const };
  return { label: "Modo Sobrevivência", emoji: "🔴", tone: "expense" as const };
}

export function addMonthsISO(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const day = Math.min(d, lastDay);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
