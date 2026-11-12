import { useMemo } from "react";
import { PiggyBank } from "lucide-react";
import type { Transaction } from "@/lib/financas/transactions";
import { summarizeCaixinhas } from "@/lib/financas/caixinha";
import { formatBRL, formatDate } from "@/lib/financas/format";

/** Progresso das caixinhas (reservas mensais com propósito, ex: Viagem). */
export function CaixinhasCard({ all }: { all: Transaction[] }) {
  const items = useMemo(() => summarizeCaixinhas(all), [all]);
  if (items.length === 0) return null;
  return (
    <div className="mt-3 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary"><PiggyBank className="h-4 w-4" /> Minhas caixinhas</p>
      <ul className="space-y-3">
        {items.map((c) => {
          const pct = c.goal > 0 ? Math.min(100, Math.round((c.saved / c.goal) * 100)) : 0;
          const done = c.paidCount >= c.months;
          return (
            <li key={c.seriesId}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-semibold">🐷 {c.purpose}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  <strong className="text-foreground">{formatBRL(c.saved)}</strong> de {formatBRL(c.goal)}
                </span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Caixinha ${c.purpose}`}>
                <div className="h-full rounded-full bg-income transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {c.paidCount}/{c.months} meses · {formatBRL(c.monthly)}/mês · {done ? "Meta completa! 🎉" : c.nextDate ? `próximo depósito ${formatDate(c.nextDate)}` : ""}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
