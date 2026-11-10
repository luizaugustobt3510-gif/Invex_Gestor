import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Transaction } from "@/lib/financas/transactions";
import { buildDre, refMonth, transactionsForPeriod, type DreLine } from "@/lib/financas/dre";
import { findCategory } from "@/lib/financas/categories";
import { formatBRL, monthLabel, currentMonthKey } from "@/lib/financas/format";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** DRE pessoal: Receitas − Despesas = Resultado, por mês ou ano. */
export function DreView({ all }: { all: Transaction[] }) {
  const periods = useMemo(() => {
    const months = new Set<string>([currentMonthKey()]);
    all.forEach((t) => months.add(refMonth(t)));
    const ms = Array.from(months).sort((a, b) => b.localeCompare(a));
    const years = Array.from(new Set(ms.map((m) => m.slice(0, 4))));
    return [...years.map((y) => ({ v: y, l: `Ano de ${y}` })), ...ms.map((m) => ({ v: m, l: cap(monthLabel(m)) }))];
  }, [all]);
  const [period, setPeriod] = useState(currentMonthKey());
  const dre = useMemo(() => buildDre(transactionsForPeriod(all, period), (k) => findCategory(k)), [all, period]);
  const positive = dre.resultado >= 0;

  return (
    <div className="space-y-4">
      <Select value={period} onValueChange={setPeriod}>
        <SelectTrigger className="w-full sm:max-w-[240px]"><SelectValue /></SelectTrigger>
        <SelectContent>{periods.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
      </Select>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        <Row label="(+) Receitas" value={dre.receitas} strong tone="income" />
        {dre.receitasLinhas.map((l) => <Linha key={`r-${l.key}`} l={l} />)}
        <Row label="(−) Despesas" value={-dre.despesas} strong tone="expense" />
        {dre.despesasLinhas.length === 0 && <p className="px-4 py-3 text-xs text-muted-foreground">Sem despesas no período.</p>}
        {dre.despesasLinhas.map((l) => <Linha key={`d-${l.key}`} l={l} showPct />)}
        <div className={`flex items-center justify-between px-4 py-4 ${positive ? "bg-income/10" : "bg-expense/10"}`}>
          <div>
            <p className="text-sm font-bold">(=) Resultado do período</p>
            <p className="text-xs text-muted-foreground">{dre.receitas > 0 ? `${positive ? "Sobrou" : "Faltou"} ${Math.abs(dre.margem).toLocaleString("pt-BR")}% da receita` : "Sem receitas no período"}</p>
          </div>
          <p className={`text-lg font-bold tabular-nums ${positive ? "text-income" : "text-expense"}`}>{formatBRL(dre.resultado)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Despesas já pagas</p><p className="font-bold tabular-nums">{formatBRL(dre.pago)}</p></div>
        <div className="rounded-2xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Despesas a pagar</p><p className="font-bold tabular-nums text-expense">{formatBRL(dre.aPagar)}</p></div>
      </div>
      <p className="text-[11px] text-muted-foreground">Usa o mês de competência quando informado; senão, o mês do vencimento. Contas atrasadas contam só no mês delas.</p>
    </div>
  );
}

function Row({ label, value, strong, tone }: { label: string; value: number; strong?: boolean; tone?: "income" | "expense" }) {
  return (
    <div className={`flex items-center justify-between border-b border-border px-4 py-3 ${strong ? "bg-muted/40" : ""}`}>
      <span className={`text-sm ${strong ? "font-bold" : ""}`}>{label}</span>
      <span className={`text-sm font-bold tabular-nums ${tone === "income" ? "text-income" : tone === "expense" ? "text-expense" : ""}`}>{formatBRL(value)}</span>
    </div>
  );
}

function Linha({ l, showPct }: { l: DreLine; showPct?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left">
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <span>{l.icon}</span><span className="truncate">{l.label}</span>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
        </span>
        <span className="flex shrink-0 items-center gap-2 text-sm tabular-nums">
          {showPct && <span className="text-[11px] text-muted-foreground">{l.pct.toLocaleString("pt-BR")}%</span>}
          {formatBRL(l.total)}
        </span>
      </button>
      {open && (
        <ul className="pb-2">
          {l.subs.map((s) => (
            <li key={s.name} className="flex justify-between px-4 py-1 pl-11 text-xs text-muted-foreground">
              <span className="truncate">{s.name}</span><span className="tabular-nums">{formatBRL(s.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
