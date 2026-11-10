import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/hooks/useFinancasCategories";
import { formatBRL } from "@/lib/financas/format";
import type { Transaction } from "@/lib/financas/transactions";
import { toast } from "sonner";

type Budget = { id: string; user_id: string; category: string; amount: number };

export function BudgetManager({
  userId, ownerId, readOnly, monthTx,
}: { userId: string; ownerId: string; readOnly: boolean; monthTx: Transaction[] }) {
  const qc = useQueryClient();
  const { expense } = useCategories(ownerId);
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");

  const { data: budgets = [] } = useQuery<Budget[]>({
    queryKey: ["pf-budgets", ownerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("personal_budgets").select("*").eq("user_id", ownerId);
      if (error) throw error;
      return (data ?? []) as unknown as Budget[];
    },
    enabled: !!ownerId,
    staleTime: 60_000,
  });

  const spent = useMemo(() => {
    const m = new Map<string, number>();
    monthTx.filter((t) => t.type === "despesa" && !t.carried_over)
      .forEach((t) => m.set(t.category, (m.get(t.category) ?? 0) + Number(t.amount)));
    return m;
  }, [monthTx]);

  const save = async (category: string) => {
    const amount = Number(value.replace(/\./g, "").replace(",", ".")) || 0;
    const existing = budgets.find((b) => b.category === category);
    const q = amount <= 0
      ? existing ? supabase.from("personal_budgets").delete().eq("id", existing.id) : null
      : supabase.from("personal_budgets").upsert(
          { user_id: userId, category, amount } as never, { onConflict: "user_id,category" });
    if (q) {
      const { error } = await q;
      if (error) return toast.error(error.message);
    }
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["pf-budgets", ownerId] });
  };

  const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0);
  const totalSpent = budgets.reduce((s, b) => s + (spent.get(b.category) ?? 0), 0);

  return (
    <div className="space-y-3">
      {totalBudget > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <p className="text-xs text-muted-foreground">Total orçado no mês</p>
          <p className="text-lg font-bold tabular-nums">
            {formatBRL(totalSpent)} <span className="text-sm font-normal text-muted-foreground">de {formatBRL(totalBudget)}</span>
          </p>
          <Bar pct={totalSpent / totalBudget} />
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Defina um limite mensal por categoria. A barra fica amarela a partir de 80% e vermelha ao estourar.
      </p>
      <ul className="space-y-2">
        {expense.map((c) => {
          const b = budgets.find((x) => x.category === c.key);
          const s = spent.get(c.key) ?? 0;
          const limit = b ? Number(b.amount) : 0;
          const pct = limit ? s / limit : 0;
          return (
            <li key={c.key} className="rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-2">
                <span className="text-lg">{c.icon}</span>
                <span className="flex-1 truncate text-sm font-semibold">{c.label}</span>
                {editing === c.key ? (
                  <div className="flex items-center gap-1">
                    <Input autoFocus inputMode="decimal" className="h-8 w-24" value={value}
                      onChange={(e) => setValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && save(c.key)} />
                    <Button size="sm" className="h-8" onClick={() => save(c.key)}>OK</Button>
                  </div>
                ) : (
                  <button disabled={readOnly}
                    onClick={() => { setEditing(c.key); setValue(limit ? String(limit).replace(".", ",") : ""); }}
                    className="text-xs font-semibold text-primary disabled:text-muted-foreground">
                    {limit ? formatBRL(limit) : readOnly ? "Sem limite" : "Definir limite"}
                  </button>
                )}
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>Gasto: {formatBRL(s)}</span>
                {limit > 0 && (
                  <span className={pct > 1 ? "font-semibold text-expense" : ""}>
                    {pct > 1 ? `Estourou ${formatBRL(s - limit)}` : `Resta ${formatBRL(limit - s)}`}
                  </span>
                )}
              </div>
              {limit > 0 && <Bar pct={pct} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Bar({ pct }: { pct: number }) {
  const color = pct > 1 ? "bg-expense" : pct >= 0.8 ? "bg-warning" : "bg-income";
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct * 100)}%` }} />
    </div>
  );
}
