import { useMemo } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area, LabelList,
} from "recharts";
import type { Transaction } from "@/lib/financas/transactions";
import { summarizeCaixinhas } from "@/lib/financas/caixinha";
import type { Person } from "@/lib/financas/people";
import { findCategory } from "@/lib/financas/categories";
import { formatBRL, monthKey, monthLabel } from "@/lib/financas/format";

const CHART_COLORS = [
  "hsl(var(--fin-chart-1))", "hsl(var(--fin-chart-2))", "hsl(var(--fin-chart-3))",
  "hsl(var(--fin-chart-4))", "hsl(var(--fin-chart-5))", "hsl(var(--fin-chart-6))",
];

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  fontSize: 12,
};

const money = (v: number) => `R$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`;

/** Gastos por categoria — rosca com percentuais e legenda de valores. */
export function CategoryPie({ transactions }: { transactions: Transaction[] }) {
  const { data, total } = useMemo(() => {
    const map = new Map<string, number>();
    transactions.filter((t) => t.type === "despesa").forEach((t) => {
      const c = findCategory(t.category);
      const label = c ? `${c.icon} ${c.label}` : t.category;
      map.set(label, (map.get(label) ?? 0) + Number(t.amount));
    });
    const arr = Array.from(map, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    return { data: arr, total: arr.reduce((s, d) => s + d.value, 0) };
  }, [transactions]);

  if (!data.length) return <EmptyChart message="Sem despesas neste mês" />;

  return (
    <div>
      <ResponsiveContainer width="100%" height={210}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
            outerRadius={82} innerRadius={52} paddingAngle={2} stroke="none">
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="mt-2 space-y-1.5">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="min-w-0 flex-1 truncate">{d.name}</span>
            <span className="tabular-nums text-muted-foreground">
              {total ? Math.round((d.value / total) * 100) : 0}%
            </span>
            <span className="w-24 text-right font-semibold tabular-nums">{formatBRL(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Gastos por pessoa (contas vinculadas a pessoas cadastradas). */
export function PersonSpending({
  transactions, people,
}: { transactions: Transaction[]; people: Person[] }) {
  const data = useMemo(() => {
    const names = new Map(people.map((p) => [p.id, p.name]));
    const map = new Map<string, { pago: number; pendente: number }>();
    transactions.filter((t) => t.type === "despesa" && t.person_id).forEach((t) => {
      const name = names.get(t.person_id!) ?? "Pessoa removida";
      const cur = map.get(name) ?? { pago: 0, pendente: 0 };
      if (t.status === "pago") cur.pago += Number(t.amount);
      else cur.pendente += Number(t.amount);
      map.set(name, cur);
    });
    return Array.from(map, ([name, v]) => ({ name, ...v, total: v.pago + v.pendente }))
      .sort((a, b) => b.total - a.total);
  }, [transactions, people]);

  if (!data.length) {
    return <EmptyChart message="Nenhuma despesa vinculada a pessoas neste mês" />;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 52)}>
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 48 }}>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={money} />
        <YAxis type="category" dataKey="name" width={90}
          stroke="hsl(var(--muted-foreground))" fontSize={12} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="pago" stackId="a" fill="hsl(var(--income))" name="Pago" radius={[0, 0, 0, 0]} />
        <Bar dataKey="pendente" stackId="a" fill="hsl(var(--warning))" name="A pagar" radius={[0, 6, 6, 0]}>
          <LabelList dataKey="total" position="right" fontSize={11}
            formatter={(v: number) => formatBRL(v)} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Situação das despesas do mês: pago x a pagar x atrasado. */
export function StatusBreakdown({ transactions }: { transactions: Transaction[] }) {
  const data = useMemo(() => {
    let pago = 0, pendente = 0, atrasado = 0;
    transactions.filter((t) => t.type === "despesa").forEach((t) => {
      const v = Number(t.amount);
      if (t.status === "pago") pago += v;
      else if (t.vencida) atrasado += v;
      else pendente += v;
    });
    return [
      { name: "Pago", value: pago, color: "hsl(var(--income))" },
      { name: "A pagar", value: pendente, color: "hsl(var(--warning))" },
      { name: "Atrasado", value: atrasado, color: "hsl(var(--expense))" },
    ].filter((d) => d.value > 0);
  }, [transactions]);

  if (!data.length) return <EmptyChart message="Sem despesas neste mês" />;

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="55%" height={180}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
            innerRadius={48} outerRadius={74} paddingAngle={2} stroke="none">
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="flex-1 space-y-2">
        {data.map((d) => (
          <li key={d.name} className="text-xs">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
              {d.name}
            </span>
            <span className="ml-4.5 block font-semibold tabular-nums">{formatBRL(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Maiores gastos por subcategoria no mês. */
export function TopSubcategories({ transactions }: { transactions: Transaction[] }) {
  const data = useMemo(() => {
    const map = new Map<string, number>();
    transactions.filter((t) => t.type === "despesa").forEach((t) => {
      map.set(t.subcategory, (map.get(t.subcategory) ?? 0) + Number(t.amount));
    });
    return Array.from(map, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 6);
  }, [transactions]);

  if (!data.length) return <EmptyChart message="Sem despesas neste mês" />;

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 52 }}>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={100}
          stroke="hsl(var(--muted-foreground))" fontSize={12} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
        <Bar dataKey="value" fill="hsl(var(--fin-chart-1))" radius={[0, 8, 8, 0]}>
          <LabelList dataKey="value" position="right" fontSize={11}
            formatter={(v: number) => formatBRL(v)} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function monthSeries(transactions: Transaction[]) {
  const map = new Map<string, { receita: number; despesa: number }>();
  transactions.forEach((t) => {
    const k = monthKey(t.competencia || t.date);
    const cur = map.get(k) ?? { receita: 0, despesa: 0 };
    cur[t.type] += Number(t.amount);
    map.set(k, cur);
  });
  return Array.from(map, ([k, v]) => ({
    month: monthLabel(k).slice(0, 3),
    key: k, ...v, saldo: v.receita - v.despesa,
  })).sort((a, b) => a.key.localeCompare(b.key)).slice(-6);
}

export function MonthlyEvolution({ transactions }: { transactions: Transaction[] }) {
  const data = useMemo(() => monthSeries(transactions), [transactions]);
  if (!data.length) return <EmptyChart message="Sem dados ainda" />;

  return (
    <ResponsiveContainer width="100%" height={230}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="gSaldo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--fin-chart-4))" stopOpacity={0.45} />
            <stop offset="100%" stopColor="hsl(var(--fin-chart-4))" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={money} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
        <Area type="monotone" dataKey="saldo" stroke="hsl(var(--fin-chart-4))" strokeWidth={2.5}
          fill="url(#gSaldo)" name="Saldo do mês" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function IncomeVsExpense({ transactions }: { transactions: Transaction[] }) {
  const data = useMemo(() => monthSeries(transactions), [transactions]);
  if (!data.length) return <EmptyChart message="Sem dados ainda" />;

  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data} barGap={2}>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={money} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="receita" fill="hsl(var(--income))" name="Receitas" radius={[6, 6, 0, 0]} />
        <Bar dataKey="despesa" fill="hsl(var(--expense))" name="Despesas" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[180px] items-center justify-center text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

/** Metas das caixinhas: guardado x meta. */
export function CaixinhaGoalsChart({ all, goals }: { all: Transaction[]; goals: Record<string, number> }) {
  const data = useMemo(() => summarizeCaixinhas(all, goals).map((c) => ({
    name: c.purpose, Guardado: c.saved, Falta: Math.max(0, +(c.goal - c.saved).toFixed(2)),
  })), [all, goals]);
  if (!data.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <p className="mb-2 text-sm font-semibold">🎯 Metas das caixinhas</p>
      <ResponsiveContainer width="100%" height={Math.max(120, data.length * 56)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
          <XAxis type="number" tickFormatter={money} fontSize={11} />
          <YAxis type="category" dataKey="name" width={80} fontSize={11} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Guardado" stackId="a" fill="hsl(var(--income))" radius={[4, 0, 0, 4]} />
          <Bar dataKey="Falta" stackId="a" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
