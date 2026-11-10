import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { transactionsForMonth, computeSummary, type Transaction } from "@/lib/financas/transactions";
import { formatBRL, monthLabel, currentMonthKey } from "@/lib/financas/format";
import { heatLevel } from "@/lib/financas/plan";

const capMonth = (m: string) => { const l = monthLabel(m); return l.charAt(0).toUpperCase() + l.slice(1); };

const addMonth = (key: string, n: number) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/** Próximos 6 meses: receitas, despesas e saldo previsto (parcelas + recorrentes já lançadas). */
export function FutureProjection({ all }: { all: Transaction[] }) {
  const rows = useMemo(() => {
    const start = currentMonthKey();
    let acc = 0;
    return Array.from({ length: 6 }, (_, i) => {
      const k = addMonth(start, i);
      const s = computeSummary(transactionsForMonth(all, k));
      acc += s.disponivelReal;
      return { k, ...s, acc };
    });
  }, [all]);
  const max = Math.max(1, ...rows.map((r) => Math.max(r.receitas, r.despesas)));

  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.k} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold">{capMonth(r.k)}</span>
            <span className={`font-bold tabular-nums ${r.disponivelReal < 0 ? "text-expense" : "text-income"}`}>
              {formatBRL(r.disponivelReal)}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted">
            <div className="h-full rounded-full bg-income" style={{ width: `${(r.receitas / max) * 100}%` }} />
          </div>
          <div className="h-1.5 rounded-full bg-muted">
            <div className="h-full rounded-full bg-expense" style={{ width: `${(r.despesas / max) * 100}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground tabular-nums">
            Receitas {formatBRL(r.receitas)} · Contas {formatBRL(r.despesas)} · Acumulado {formatBRL(r.acc)}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** Calendário do mês em mapa de calor: quanto mais forte a cor, mais contas vencem no dia. */
export function DueCalendar({ all, onTogglePaid, readOnly = false }: {
  all: Transaction[];
  onTogglePaid?: (t: Transaction) => void;
  readOnly?: boolean;
}) {
  const [month, setMonth] = useState(currentMonthKey());
  const [picked, setPicked] = useState<number | null>(null);
  const { byDay, firstDow, days, max, monthTotal, monthPending } = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const byDay = new Map<number, Transaction[]>();
    let monthTotal = 0, monthPending = 0;
    all.filter((t) => t.type === "despesa" && t.date.startsWith(month)).forEach((t) => {
      const d = Number(t.date.slice(8, 10));
      byDay.set(d, [...(byDay.get(d) ?? []), t]);
      monthTotal += Number(t.amount);
      if (t.status !== "pago") monthPending += Number(t.amount);
    });
    const max = Math.max(1, ...Array.from(byDay.values()).map((l) => l.reduce((s, t) => s + Number(t.amount), 0)));
    return { byDay, firstDow: new Date(y, m - 1, 1).getDay(), days: new Date(y, m, 0).getDate(), max, monthTotal, monthPending };
  }, [all, month]);

  const list = picked ? byDay.get(picked) ?? [] : [];
  const todayKey = new Date();
  const isToday = (d: number) => month === currentMonthKey() && d === todayKey.getDate();
  const HEAT = ["bg-muted/40", "bg-expense/10", "bg-expense/25", "bg-expense/45", "bg-expense/70 text-expense-foreground"];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted" onClick={() => { setMonth(addMonth(month, -1)); setPicked(null); }} aria-label="Mês anterior"><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-sm font-semibold">{capMonth(month)}</span>
        <button className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted" onClick={() => { setMonth(addMonth(month, 1)); setPicked(null); }} aria-label="Próximo mês"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-muted/50 p-2"><p className="text-muted-foreground">Contas no mês</p><p className="font-bold tabular-nums">{formatBRL(monthTotal)}</p></div>
        <div className="rounded-xl bg-muted/50 p-2"><p className="text-muted-foreground">Ainda a pagar</p><p className="font-bold tabular-nums text-expense">{formatBRL(monthPending)}</p></div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
        {Array.from({ length: firstDow }, (_, i) => <span key={`e${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const d = i + 1;
          const l = byDay.get(d) ?? [];
          const total = l.reduce((s, t) => s + Number(t.amount), 0);
          const allPaid = l.length > 0 && l.every((t) => t.status === "pago");
          const cls = allPaid ? "bg-income/25 text-income" : HEAT[heatLevel(total, max)];
          return (
            <button key={d} onClick={() => setPicked(l.length ? d : null)}
              aria-label={`Dia ${d}${total ? `: ${formatBRL(total)}` : ""}`}
              className={`aspect-square rounded-lg p-0.5 text-xs font-semibold transition ${cls} ${picked === d ? "ring-2 ring-primary" : isToday(d) ? "ring-1 ring-primary/60" : ""}`}>
              {d}
              {total > 0 && <span className="block text-[8px] font-normal leading-tight">{total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total.toFixed(0)}</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
        <span>Menos</span>
        {HEAT.slice(1).map((c, i) => <span key={i} className={`h-3 w-3 rounded ${c}`} />)}
        <span>Mais</span>
        <span className="ml-2 h-3 w-3 rounded bg-income/25" /><span>Tudo pago</span>
      </div>
      {list.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
          {list.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2 text-xs">
              <span className={`truncate ${t.status === "pago" ? "text-income" : ""}`}>{t.status === "pago" ? "✓ " : ""}{t.description}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="tabular-nums font-semibold">{formatBRL(Number(t.amount))}</span>
                {onTogglePaid && !readOnly && (
                  <button onClick={() => onTogglePaid(t)}
                    className={`rounded-full px-2 py-1 text-[10px] font-semibold ${t.status === "pago" ? "bg-income/15 text-income" : "bg-primary text-primary-foreground"}`}>
                    {t.status === "pago" ? "Pago" : "Pagar"}
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
