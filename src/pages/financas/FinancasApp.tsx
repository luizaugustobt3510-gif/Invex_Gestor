import { lazy, Suspense, useCallback, useEffect, useMemo, useState, memo } from "react";
import { EmailConfirmBanner } from '@/components/personal/EmailConfirmBanner';
import { authErrorMessage } from '@/lib/authErrors';
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import {
  Wallet, TrendingUp, TrendingDown, PiggyBank, AlertTriangle, CheckCircle2, Circle, LogOut, Filter,
  Trash2, Search, Clock, Repeat, Eye, X, Pencil, CalendarClock, PartyPopper, Crown, Pin, PinOff, Palette,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChristmasScene } from "@/components/ChristmasScene";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AddTransactionDialog } from "@/components/financas/AddTransactionDialog";
import { EditTransactionDialog } from "@/components/financas/EditTransactionDialog";
import { PremiumLock, FinancasPlanCard } from "@/components/financas/FinancasPremium";
import { DicasCard } from "@/components/financas/DicasCard";
import { CaixinhasCard } from "@/components/financas/CaixinhasCard";
import { isCaixinha, caixinhaPurpose } from "@/lib/financas/caixinha";
import { useCaixinhaGoals } from "@/hooks/useCaixinhaGoals";
import { FinancasCalculator } from "@/components/financas/FinancasCalculator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fetchTransactions, computeSummary, healthStatus, transactionsForMonth, type Transaction } from "@/lib/financas/transactions";
import { fetchSharedWithMe } from "@/lib/financas/shares";
import { fetchPeople } from "@/lib/financas/people";
import { useCategories } from "@/hooks/useFinancasCategories";
import { useFinancasPremium } from "@/hooks/useFinancasPremium";
import { formatBRL, formatDate, currentMonthKey, monthKey, monthLabel } from "@/lib/financas/format";
import { findCategory, DEBT_SUBCATEGORIES } from "@/lib/financas/categories";
import { isChristmasSeason, monthlyUsage, FINANCAS_FREE_MONTHLY_LIMIT } from "@/lib/financas/plan";
import { toast } from "sonner";
import { SEXO_OPTIONS, UF_LIST, ageFrom, formatPhone, onlyDigits, validateSignupProfile } from "@/lib/financas/signupProfile";

const capMonth = (m: string) => { const l = monthLabel(m); return l.charAt(0).toUpperCase() + l.slice(1); };

const Charts = lazy(() => import("@/components/financas/Charts").then((m) => ({
  default: function ChartsBundle({ monthTx, all, ownerId }: { monthTx: Transaction[]; all: Transaction[]; ownerId: string }) {
    const { CategoryPie, MonthlyEvolution, IncomeVsExpense, PersonSpending, StatusBreakdown, TopSubcategories, CaixinhaGoalsChart } = m;
    const { goals } = useCaixinhaGoals(ownerId);
    const { data: people = [] } = useQuery({
      queryKey: ["pf-people", ownerId], queryFn: () => fetchPeople(ownerId), staleTime: 60_000, enabled: !!ownerId,
    });
    return (
      <div className="space-y-4">
        <CaixinhaGoalsChart all={all} goals={goals} />
        <ChartCard title="Situação das contas"><StatusBreakdown transactions={monthTx} /></ChartCard>
        <ChartCard title="Gastos por categoria"><CategoryPie transactions={monthTx} /></ChartCard>
        {people.length > 0 && <ChartCard title="Gastos por pessoa"><PersonSpending transactions={monthTx} people={people} /></ChartCard>}
        <ChartCard title="Maiores gastos"><TopSubcategories transactions={monthTx} /></ChartCard>
        <ChartCard title="Receitas vs Despesas (últimos meses)"><IncomeVsExpense transactions={all} /></ChartCard>
        <ChartCard title="Evolução mensal"><MonthlyEvolution transactions={all} /></ChartCard>
      </div>
    );
  },
})));
const PeopleManager = lazy(() => import("@/components/financas/PeopleManager").then((m) => ({ default: m.PeopleManager })));
const CategoryManager = lazy(() => import("@/components/financas/CategoryManager").then((m) => ({ default: m.CategoryManager })));
const BudgetManager = lazy(() => import("@/components/financas/BudgetManager").then((m) => ({ default: m.BudgetManager })));
const FutureProjection = lazy(() => import("@/components/financas/Projection").then((m) => ({ default: m.FutureProjection })));
const DueCalendar = lazy(() => import("@/components/financas/Projection").then((m) => ({ default: m.DueCalendar })));
const DreView = lazy(() => import("@/components/financas/DreView").then((m) => ({ default: m.DreView })));
const ShareManager = lazy(() => import("@/components/financas/ShareManager").then((m) => ({ default: m.ShareManager })));

type FilterKey = "all" | "receita" | "despesa" | "dividas" | "reserva" | "pendente";
const FILTER_LABEL: Record<FilterKey, string> = {
  all: "Todos", receita: "Receitas", despesa: "Despesas", dividas: "Dívidas", reserva: "Reserva", pendente: "Pendentes",
};
const isDivida = (t: Transaction) => t.type === "despesa" && (DEBT_SUBCATEGORIES.has(t.subcategory) || t.subcategory === "Emergências");
const isReserva = (t: Transaction) => t.type === "receita" && t.subcategory === "Outros" && t.description.toLowerCase().includes("reserva");
const Loading = () => <p className="py-10 text-center text-sm text-muted-foreground">Carregando…</p>;

export default function FinancasApp() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const natal = isChristmasSeason();

  // Tema próprio do Invex Finanças em toda a página (inclusive janelas abertas por cima)
  useEffect(() => {
    const el = document.documentElement;
    el.classList.add("financas-theme");
    if (natal) el.classList.add("financas-natal");
    document.title = "Invex Finanças — Finanças pessoais";
    return () => { el.classList.remove("financas-theme", "financas-natal"); };
  }, [natal]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ?? null);
      if (!s) navigate("/financeiro/pessoal/entrar", { replace: true });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { navigate("/financeiro/pessoal/entrar", { replace: true }); return; }
      setUser(data.session.user); setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  if (!ready || !user) {
    return <div className="grid min-h-[100dvh] place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>;
  }
  return <Painel user={user} natal={natal} />;
}

function Painel({ user, natal }: { user: User; natal: boolean }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { premium, sub, refresh } = useFinancasPremium();
  const [tab, setTab] = useState("lancamentos");
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey());
  const [viewingOwnerId, setViewingOwnerId] = useState<string>(user.id);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const nome = String(user.user_metadata?.full_name || user.user_metadata?.nome || user.user_metadata?.name || user.email?.split("@")[0] || "");

  const effectiveOwner = viewingOwnerId || user.id;
  const isReadOnly = effectiveOwner !== user.id;
  const seePlans = () => setTab("perfil");

  const { data: sharedWithMe = [] } = useQuery({ queryKey: ["pf-shared-with-me", user.email], queryFn: fetchSharedWithMe, staleTime: 5 * 60_000 });
  const { data: all = [], isLoading } = useQuery({
    queryKey: ["pf-transactions", effectiveOwner], queryFn: () => fetchTransactions(effectiveOwner),
    staleTime: 60_000, gcTime: 10 * 60_000, enabled: !!effectiveOwner,
  });

  const months = useMemo(() => {
    const set = new Set<string>([currentMonthKey()]);
    for (const t of all) set.add(monthKey(t.date));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [all]);
  const monthTx = useMemo(() => transactionsForMonth(all, selectedMonth), [all, selectedMonth]);
  const summary = useMemo(() => computeSummary(monthTx), [monthTx]);
  const usage = useMemo(() => monthlyUsage(all, selectedMonth), [all, selectedMonth]);
  useCategories(effectiveOwner);

  const alerts = useMemo(() => {
    const d = new Date();
    const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    const today = iso(d);
    const in7 = new Date(d); in7.setDate(in7.getDate() + 7);
    const upcoming = all.filter((t) => t.type === "despesa" && t.status === "pendente" && t.date >= today && t.date <= iso(in7))
      .sort((a, b) => a.date.localeCompare(b.date));
    const ending = all.filter((t) => t.series_kind === "parcelado" && t.installment_total && t.installment_number
      && t.installment_total - t.installment_number <= 1 && t.status === "pendente" && monthKey(t.date) === selectedMonth);
    return { upcoming, ending };
  }, [all, selectedMonth]);
  const health = healthStatus(summary.disponivelReal);

  const toggleFilter = useCallback((key: FilterKey) => setFilter((cur) => (cur === key ? "all" : key)), []);

  const togglePaid = useCallback(async (t: Transaction) => {
    if (isReadOnly) return;
    const next = t.status === "pago" ? "pendente" : "pago";
    const { error } = await supabase.from("personal_transactions").update({ status: next }).eq("id", t.id);
    if (error) return toast.error("Não foi possível atualizar.");
    if (next === "pago") toast.success(
      t.type === "despesa" ? `"${t.description}" marcado como pago`
        : isCaixinha(t) ? `Depósito guardado na caixinha` : `"${t.description}" marcada como recebida`);
    qc.invalidateQueries({ queryKey: ["pf-transactions", effectiveOwner] });
  }, [isReadOnly, qc, effectiveOwner]);

  const updateTx = useCallback(async (t: Transaction, patch: { pinned?: boolean; color_tag?: Transaction["color_tag"] }, ok?: string) => {
    if (isReadOnly) return;
    const { error } = await supabase.from("personal_transactions").update(patch).eq("id", t.id);
    if (error) return toast.error("Não foi possível atualizar.");
    if (ok) toast.success(ok);
    qc.invalidateQueries({ queryKey: ["pf-transactions", effectiveOwner] });
  }, [isReadOnly, qc, effectiveOwner]);
  const togglePin = useCallback((t: Transaction) => updateTx(t, { pinned: !t.pinned }, t.pinned ? "Lançamento desafixado" : "Lançamento fixado no topo"), [updateTx]);
  const setColor = useCallback((t: Transaction, c: Transaction["color_tag"]) => updateTx(t, { color_tag: c }), [updateTx]);

  const maiorCategoria = useMemo(() => {
    const map = new Map<string, number>();
    monthTx.filter((t) => t.type === "despesa").forEach((t) => map.set(t.category, (map.get(t.category) ?? 0) + Number(t.amount)));
    const top = Array.from(map).sort((a, b) => b[1] - a[1])[0];
    return top ? { label: findCategory(top[0])?.label ?? top[0], total: top[1] } : undefined;
  }, [monthTx]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    qc.removeQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("pf-") });
    navigate("/financeiro/pessoal/entrar", { replace: true });
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      {natal && <ChristmasScene fixed />}
      <div className="mx-auto w-full max-w-3xl px-4 pb-32 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
        <header className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="card-gradient-available grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-primary-foreground">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                Invex Finanças {natal && <span aria-hidden>🎄</span>}
                {premium && <span className="inline-flex items-center gap-0.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground"><Crown className="h-3 w-3" />Premium</span>}
              </p>
              <p className="truncate text-xs text-muted-foreground">Olá, {nome}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="destructive" size="sm" onClick={handleSignOut} aria-label="Sair"><LogOut className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Sair</span></Button>
          </div>
        </header>
        <EmailConfirmBanner className="mt-3" app="financas" />

        {!premium && !isReadOnly && (
          <button type="button" onClick={seePlans}
            className="mt-3 flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-border bg-card px-3 py-2.5 text-left text-xs shadow-[var(--shadow-card)] active:scale-[0.99]">
            <span className="font-semibold">Plano gratuito em {monthLabel(selectedMonth)}:</span>
            {([["despesa", "despesas"], ["receita", "receitas"], ["reserva", "reservas"]] as const).map(([k, l]) => (
              <span key={k} className={`tabular-nums ${usage[k] >= FINANCAS_FREE_MONTHLY_LIMIT ? "font-semibold text-expense" : "text-muted-foreground"}`}>
                {Math.min(usage[k], FINANCAS_FREE_MONTHLY_LIMIT)}/{FINANCAS_FREE_MONTHLY_LIMIT} {l}
              </span>
            ))}
            <span className="ml-auto inline-flex items-center gap-1 font-semibold text-primary"><Crown className="h-3.5 w-3.5" />Sem limite</span>
          </button>
        )}

        {sharedWithMe.length > 0 && (
          <div className="mt-4 flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <Select value={effectiveOwner} onValueChange={setViewingOwnerId}>
              <SelectTrigger className="w-full max-w-[280px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={user.id}>Minha conta</SelectItem>
                {sharedWithMe.map((s, i) => <SelectItem key={s.owner_id} value={s.owner_id}>👁️ Conta compartilhada {i + 1}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {isReadOnly && (
          <div className="mt-3 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-xs">
            👁️ <strong>Modo visualização.</strong> Você está vendo uma conta compartilhada — não é possível editar.
          </div>
        )}

        <div className="mt-5 flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full max-w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>{months.map((m) => <SelectItem key={m} value={m} className="">{capMonth(m)}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="card-gradient-available mt-4 overflow-hidden rounded-3xl p-6 text-primary-foreground">
          <p className="text-xs font-medium uppercase tracking-wider opacity-80">Você ainda pode gastar</p>
          <p className="mt-1 text-4xl font-bold tabular-nums sm:text-5xl">{formatBRL(summary.disponivelReal)}</p>
          <div className="mt-3 flex items-center gap-2 text-sm opacity-90"><span>{health.emoji}</span><span className="font-semibold">{health.label}</span></div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-primary-foreground/20 pt-4 text-sm sm:gap-3">
            <div className="min-w-0"><p className="text-xs opacity-75">Saldo na conta</p><p className="truncate font-semibold tabular-nums">{formatBRL(summary.saldoFinal)}</p></div>
            <div className="min-w-0"><p className="text-xs opacity-75">A pagar ainda</p><p className="truncate font-semibold tabular-nums">{formatBRL(summary.pendentes)}</p></div>
            <div className="min-w-0"><p className="text-xs opacity-75">A receber</p><p className="truncate font-semibold tabular-nums">{formatBRL(summary.aReceber)}</p></div>
          </div>
        </div>

        {summary.atrasadas > 0 && (
          <button type="button" onClick={() => toggleFilter("pendente")}
            className="mt-3 flex w-full items-center gap-2 rounded-2xl border border-warning/30 bg-warning/10 p-3 text-left text-warning-foreground transition active:scale-[0.99]">
            <Clock className="h-4 w-4 shrink-0" />
            <p className="text-xs"><strong className="font-semibold">{formatBRL(summary.atrasadas)}</strong> em contas vencidas ainda não pagas. Toque para filtrar.</p>
          </button>
        )}
        {alerts.upcoming.length > 0 && (
          <div className="mt-3 rounded-2xl border border-primary/25 bg-primary/5 p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary"><CalendarClock className="h-4 w-4" /> Vencendo nos próximos 7 dias</p>
            <ul className="space-y-1">
              {alerts.upcoming.slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate">{formatDate(t.date)} · {t.description}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold tabular-nums">{formatBRL(Number(t.amount))}</span>
                    {!isReadOnly && <button onClick={() => togglePaid(t)} className="h-9 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground active:scale-95">Pagar</button>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {alerts.ending.length > 0 && (
          <div className="mt-3 rounded-2xl border border-income/30 bg-income/10 p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-income"><PartyPopper className="h-4 w-4" /> Parcelas terminando</p>
            <ul className="space-y-1">
              {alerts.ending.map((t) => (
                <li key={t.id} className="text-xs">{t.description} — {t.installment_number === t.installment_total ? "última parcela" : "penúltima parcela"} ({t.installment_number}/{t.installment_total}) em {formatDate(t.date)}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard icon={<TrendingUp className="h-4 w-4" />} label="Receitas" value={summary.receitas} tone="income" active={filter === "receita"} onClick={() => { toggleFilter("receita"); setTab("lancamentos"); }} />
          <SummaryCard icon={<TrendingDown className="h-4 w-4" />} label="Despesas" value={summary.despesas} tone="expense" active={filter === "despesa"} onClick={() => { toggleFilter("despesa"); setTab("lancamentos"); }} />
          <SummaryCard icon={<AlertTriangle className="h-4 w-4" />} label="Dívidas" value={summary.dividas} tone="warning" active={filter === "dividas"} onClick={() => { toggleFilter("dividas"); setTab("lancamentos"); }} />
          <SummaryCard icon={<PiggyBank className="h-4 w-4" />} label="Reserva" value={summary.emergencia} tone="muted" active={filter === "reserva"} onClick={() => { toggleFilter("reserva"); setTab("lancamentos"); }} />
        </div>

        <CaixinhasCard all={all} ownerId={effectiveOwner} readOnly={isReadOnly} />

        <DicasCard receitas={summary.receitas} despesas={summary.despesas} atrasadas={summary.atrasadas} pendentes={summary.pendentes} maiorCategoria={maiorCategoria} />

        <Tabs value={tab} onValueChange={setTab} className="mt-6">
          <TabsList className="fin-tabs grid h-auto w-full grid-cols-3 gap-1 bg-card p-1 shadow-[var(--shadow-card)] sm:flex sm:justify-start sm:overflow-x-auto [&>button]:h-10 [&>button]:whitespace-normal [&>button]:px-1.5 [&>button]:text-xs [&>button]:leading-tight sm:[&>button]:h-9 sm:[&>button]:whitespace-nowrap sm:[&>button]:px-3 sm:[&>button]:text-sm">
            <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
            <TabsTrigger value="planejar">Teto e projeção</TabsTrigger>
            <TabsTrigger value="calendario">Calendário{!premium && " 🔒"}</TabsTrigger>
            <TabsTrigger value="dre">DRE{!premium && " 🔒"}</TabsTrigger>
            <TabsTrigger value="graficos">Gráficos</TabsTrigger>
            <TabsTrigger value="categorias">Categorias</TabsTrigger>
            <TabsTrigger value="pessoas">Pessoas{!premium && " 🔒"}</TabsTrigger>
            {!isReadOnly && <TabsTrigger value="compartilhar">Compartilhar{!premium && " 🔒"}</TabsTrigger>}
            <TabsTrigger value="perfil">Perfil</TabsTrigger>
          </TabsList>

          <TabsContent value="lancamentos" className="mt-4">
            <TransactionList transactions={monthTx} loading={isLoading} readOnly={isReadOnly} ownerId={effectiveOwner}
              filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} onToggle={togglePaid}
              onPin={togglePin} onColor={setColor} />
          </TabsContent>

          <TabsContent value="planejar" className="mt-4 space-y-4">
            <Suspense fallback={<Loading />}>
              <ChartCard title={`Teto de gastos — ${capMonth(selectedMonth)}`}>
                <BudgetManager userId={user.id} ownerId={effectiveOwner} readOnly={isReadOnly} monthTx={monthTx} />
              </ChartCard>
              {premium || isReadOnly
                ? <ChartCard title="Projeção dos próximos 6 meses"><FutureProjection all={all} /></ChartCard>
                : <PremiumLock feature="Projeção de 6 meses" onSeePlans={seePlans} />}
            </Suspense>
          </TabsContent>

          <TabsContent value="calendario" className="mt-4">
            <Suspense fallback={<Loading />}>
              {premium || isReadOnly
                ? <ChartCard title="Calendário de vencimentos"><DueCalendar all={all} onTogglePaid={togglePaid} readOnly={isReadOnly} /></ChartCard>
                : <PremiumLock feature="Calendário com mapa de calor" onSeePlans={seePlans} />}
            </Suspense>
          </TabsContent>

          <TabsContent value="dre" className="mt-4">
            <Suspense fallback={<Loading />}>
              {premium || isReadOnly
                ? <DreView all={all} />
                : <PremiumLock feature="DRE pessoal" onSeePlans={seePlans} />}
            </Suspense>
          </TabsContent>

          <TabsContent value="graficos" className="mt-4 space-y-4">
            <Suspense fallback={<Loading />}><Charts monthTx={monthTx} all={all} ownerId={effectiveOwner} /></Suspense>
          </TabsContent>

          <TabsContent value="categorias" className="mt-4">
            <Suspense fallback={<Loading />}><CategoryManager userId={user.id} ownerId={effectiveOwner} readOnly={isReadOnly} /></Suspense>
          </TabsContent>

          <TabsContent value="pessoas" className="mt-4">
            <Suspense fallback={<Loading />}>
              {premium || isReadOnly
                ? <PeopleManager userId={user.id} ownerId={effectiveOwner} readOnly={isReadOnly} />
                : <PremiumLock feature="Divisão por pessoas" onSeePlans={seePlans} />}
            </Suspense>
          </TabsContent>

          {!isReadOnly && (
            <TabsContent value="compartilhar" className="mt-4">
              <Suspense fallback={<Loading />}>
                {premium ? <ShareManager userId={user.id} /> : <PremiumLock feature="Compartilhar a conta" onSeePlans={seePlans} />}
              </Suspense>
            </TabsContent>
          )}

          <TabsContent value="perfil" className="mt-4 space-y-4">
            <FinancasPlanCard premium={premium} sub={sub} refresh={refresh} />
            <PerfilCard user={user} />
          </TabsContent>
        </Tabs>

        {!isReadOnly && (
          <div className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2">
            <AddTransactionDialog userId={user.id} canUsePeople={premium} premium={premium} onSeePlans={seePlans} />
          </div>
        )}
        <FinancasCalculator />
      </div>
    </div>
  );
}

function DadosPessoais({ userId }: { userId: string }) {
  const [f, setF] = useState({ data_nascimento: "", sexo: "", telefone: "", cidade: "", uf: "" });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    supabase.from("profiles").select("data_nascimento, sexo, telefone, cidade, uf").eq("user_id", userId).maybeSingle()
      .then(({ data }) => {
        if (data) setF({
          data_nascimento: data.data_nascimento || "", sexo: data.sexo || "", telefone: formatPhone(data.telefone || ""),
          cidade: data.cidade || "", uf: data.uf || "",
        });
        setLoaded(true);
      });
  }, [userId]);
  const idade = ageFrom(f.data_nascimento);
  const save = async () => {
    const msg = validateSignupProfile(f);
    if (msg) return toast.error(msg);
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      data_nascimento: f.data_nascimento, sexo: f.sexo, telefone: onlyDigits(f.telefone),
      cidade: f.cidade.trim() || null, uf: f.uf || null,
    }).eq("user_id", userId);
    setSaving(false);
    if (error) return toast.error("Não foi possível salvar seus dados.");
    toast.success("Dados atualizados.");
  };
  if (!loaded) return null;
  return (
    <div className="space-y-3 border-t border-border pt-4">
      <p className="text-sm font-semibold">Dados pessoais</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pf-nasc">Data de nascimento</Label>
          <Input id="pf-nasc" type="date" value={f.data_nascimento} max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setF({ ...f, data_nascimento: e.target.value })} className="text-base" />
          {idade !== null && idade >= 0 && <p className="text-xs text-muted-foreground">{idade} {idade === 1 ? "ano" : "anos"}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-sexo">Sexo</Label>
          <Select value={f.sexo} onValueChange={(v) => v && setF({ ...f, sexo: v })}>
            <SelectTrigger id="pf-sexo" className="text-base"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{SEXO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pf-tel">Telefone / WhatsApp</Label>
        <Input id="pf-tel" type="tel" inputMode="tel" placeholder="(11) 91234-5678" value={f.telefone}
          onChange={(e) => setF({ ...f, telefone: formatPhone(e.target.value) })} className="text-base" />
      </div>
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pf-cidade">Cidade</Label>
          <Input id="pf-cidade" value={f.cidade} maxLength={80} onChange={(e) => setF({ ...f, cidade: e.target.value })} className="text-base" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-uf">Estado</Label>
          <Select value={f.uf} onValueChange={(v) => v && setF({ ...f, uf: v })}>
            <SelectTrigger id="pf-uf" className="text-base"><SelectValue placeholder="UF" /></SelectTrigger>
            <SelectContent>{UF_LIST.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="w-full sm:w-auto">{saving ? "Salvando..." : "Salvar dados"}</Button>
    </div>
  );
}

function PerfilCard({ user }: { user: User }) {
  const [nome, setNome] = useState(String(user.user_metadata?.full_name || user.user_metadata?.nome || ""));
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const saveName = async () => {
    if (!nome.trim()) return toast.error("Informe seu nome.");
    const { error } = await supabase.auth.updateUser({ data: { full_name: nome.trim(), nome: nome.trim() } });
    if (error) return toast.error("Não foi possível salvar o nome.");
    toast.success("Nome atualizado.");
  };
  const savePassword = async () => {
    if (senha.length < 6) return toast.error("A senha precisa ter ao menos 6 caracteres.");
    if (senha !== senha2) return toast.error("As senhas não conferem.");
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) return toast.error(authErrorMessage(error, "Não foi possível alterar a senha."));
    setSenha(""); setSenha2(""); toast.success("Senha alterada.");
  };
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div>
        <p className="text-sm font-semibold">Seus dados</p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pf-nome">Nome</Label>
        <div className="flex gap-2"><Input id="pf-nome" value={nome} onChange={(e) => setNome(e.target.value)} className="text-base" /><Button onClick={saveName}>Salvar</Button></div>
      </div>
      <div className="space-y-1.5">
        <Label>Nova senha</Label>
        <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" className="text-base" />
        <Input type="password" value={senha2} onChange={(e) => setSenha2(e.target.value)} placeholder="Repita a senha" className="text-base" />
        <Button variant="outline" onClick={savePassword} className="w-full sm:w-auto">Alterar senha</Button>
      </div>
      <DadosPessoais userId={user.id} />
    </div>
  );
}

const SummaryCard = memo(function SummaryCard({ icon, label, value, tone, active, onClick }: {
  icon: React.ReactNode; label: string; value: number; tone: "income" | "expense" | "warning" | "muted"; active?: boolean; onClick?: () => void;
}) {
  const toneClasses = { income: "text-income", expense: "text-expense", warning: "text-warning-foreground", muted: "text-muted-foreground" }[tone];
  const ringTone = { income: "ring-income/50", expense: "ring-expense/50", warning: "ring-warning/50", muted: "ring-muted-foreground/40" }[tone];
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`rounded-2xl border border-border bg-card p-3 text-left shadow-[var(--shadow-card)] transition active:scale-[0.98] ${active ? `ring-2 ${ringTone}` : "hover:border-foreground/20"}`}>
      <div className={`flex items-center gap-1.5 text-xs font-medium ${toneClasses}`}>{icon}<span>{label}</span></div>
      <p className="mt-1.5 text-lg font-bold tabular-nums sm:text-xl">{formatBRL(value)}</p>
    </button>
  );
});

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function TransactionList({ transactions, loading, readOnly, ownerId, filter, setFilter, search, setSearch, onToggle, onPin, onColor }: {
  transactions: Transaction[]; loading: boolean; readOnly: boolean; ownerId: string;
  filter: FilterKey; setFilter: (f: FilterKey) => void; search: string; setSearch: (s: string) => void;
  onToggle: (t: Transaction) => void; onPin: (t: Transaction) => void; onColor: (t: Transaction, c: Transaction["color_tag"]) => void;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (filter === "receita" && t.type !== "receita") return false;
      if (filter === "despesa" && t.type !== "despesa") return false;
      if (filter === "pendente" && t.status !== "pendente") return false;
      if (filter === "dividas" && !isDivida(t)) return false;
      if (filter === "reserva" && !isReserva(t)) return false;
      if (q && !t.description.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  }, [transactions, filter, search]);

  const remove = async (t: Transaction) => {
    if (readOnly) return;
    if (!confirm(`Excluir "${t.description}"?`)) return;
    const { error } = await supabase.from("personal_transactions").delete().eq("id", t.id);
    if (error) return toast.error("Não foi possível excluir.");
    toast.success("Lançamento excluído");
    qc.invalidateQueries({ queryKey: ["pf-transactions", ownerId] });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 text-base" placeholder="Buscar descrição..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>{(Object.keys(FILTER_LABEL) as FilterKey[]).map((k) => <SelectItem key={k} value={k}>{FILTER_LABEL[k]}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {filter !== "all" && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Filtro: {FILTER_LABEL[filter]}
            <button onClick={() => setFilter("all")} aria-label="Limpar filtro"><X className="h-3 w-3" /></button>
          </span>
          <span className="text-xs text-muted-foreground">{filtered.length} resultado(s)</span>
        </div>
      )}
      {loading ? <Loading /> : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 py-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhum lançamento por aqui ainda.</p>
          {!readOnly && <p className="mt-1 text-xs text-muted-foreground">Toque em <strong>Lançar</strong> para começar.</p>}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((t) => <TransactionRow key={`${t.id}-${t.carried_over ? "c" : "n"}`} t={t} readOnly={readOnly} onToggle={onToggle} onRemove={remove} onEdit={(x) => !readOnly && setEditing(x)} onPin={onPin} onColor={onColor} />)}
        </ul>
      )}
      <EditTransactionDialog transaction={editing} open={!!editing} onOpenChange={(o) => !o && setEditing(null)} ownerId={ownerId}
        purposes={Array.from(new Set(transactions.filter(isCaixinha).map((t) => caixinhaPurpose(t))))} />
    </div>
  );
}

const COLOR_TAGS: { key: NonNullable<Transaction["color_tag"]>; label: string; row: string; dot: string }[] = [
  { key: "amarelo", label: "Amarelo", row: "border-[hsl(var(--fin-yellow)/0.6)] bg-[hsl(var(--fin-yellow)/0.14)]", dot: "bg-[hsl(var(--fin-yellow))]" },
  { key: "laranja", label: "Laranja", row: "border-[hsl(var(--fin-orange)/0.55)] bg-[hsl(var(--fin-orange)/0.12)]", dot: "bg-[hsl(var(--fin-orange))]" },
  { key: "vermelho", label: "Vermelho", row: "border-expense/50 bg-expense/10", dot: "bg-expense" },
];

const TransactionRow = memo(function TransactionRow({ t, readOnly, onToggle, onRemove, onEdit, onPin, onColor }: {
  t: Transaction; readOnly: boolean; onToggle: (t: Transaction) => void; onRemove: (t: Transaction) => void; onEdit: (t: Transaction) => void;
  onPin: (t: Transaction) => void; onColor: (t: Transaction, c: Transaction["color_tag"]) => void;
}) {
  const cat = findCategory(t.category);
  const isIncome = t.type === "receita";
  const paid = t.status === "pago";
  const colorTag = !paid ? COLOR_TAGS.find((c) => c.key === t.color_tag) : undefined;
  const rowTone = !isIncome && paid ? "border-income/40 bg-income/10"
    : colorTag ? colorTag.row
    : t.vencida ? "border-expense/40 bg-expense/10" : "border-border bg-card";
  return (
    <li className={`rounded-2xl border p-3 shadow-[var(--shadow-card)] ${rowTone}`}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-lg">
          {isCaixinha(t) ? "🐷" : isIncome ? "💰" : cat?.icon ?? "💸"}
          {t.pinned && <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-primary-foreground"><Pin className="h-2.5 w-2.5" /></span>}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold">{t.description}</p>
            {t.carried_over && <span className="inline-flex items-center gap-0.5 rounded-full bg-warning/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-warning-foreground"><Clock className="h-2.5 w-2.5" /> Atrasada</span>}
            {t.series_kind === "recorrente" && !t.carried_over && <Repeat className="h-3 w-3 shrink-0 text-muted-foreground" />}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {t.subcategory} · {formatDate(t.carried_over ? t.original_date ?? t.date : t.date)}
            {t.installment_total ? ` · ${t.installment_number}/${t.installment_total}` : ""}
            {t.note ? ` · ${t.note}` : ""}
          </p>
        </div>
        <p className={`text-right text-base font-bold tabular-nums ${isIncome ? "text-income" : "text-expense"}`}>{isIncome ? "+" : "−"}{formatBRL(Number(t.amount))}</p>
      </div>

      <div className="mt-2.5 flex items-center gap-1">
        {!isIncome && (
          <button onClick={() => onToggle(t)} disabled={readOnly}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-xs font-semibold transition active:scale-95 disabled:opacity-60 ${
              paid ? "bg-income/15 text-income" : t.vencida ? "bg-expense text-expense-foreground" : "bg-primary text-primary-foreground"}`}>
            {paid
              ? <><CheckCircle2 className="h-4 w-4 shrink-0" />Pago</>
              : <><Circle className="h-4 w-4 shrink-0" />{t.vencida ? "Pagar vencida" : "Pagar"}</>}
          </button>
        )}
        {isIncome && !paid && (
          <button onClick={() => onToggle(t)} disabled={readOnly}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-income px-3.5 text-xs font-semibold text-income-foreground transition active:scale-95 disabled:opacity-60">
            <Circle className="h-4 w-4 shrink-0" />{isCaixinha(t) ? "Guardar" : "Receber"}
          </button>
        )}
        {isIncome && paid && (t.series_id ? (
          <button onClick={() => onToggle(t)} disabled={readOnly} title="Toque para desfazer"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-income/15 px-3.5 text-xs font-semibold text-income transition active:scale-95 disabled:opacity-100">
            <CheckCircle2 className="h-4 w-4 shrink-0" />{isCaixinha(t) ? "Na caixinha" : isReserva(t) ? "Na reserva" : "Recebida"}
          </button>
        ) : (
          <span className="inline-flex h-9 shrink-0 items-center gap-1.5 px-1 text-xs font-semibold text-income">
            <CheckCircle2 className="h-4 w-4" />{isReserva(t) ? "Na reserva" : "Recebida"}
          </span>
        ))}
        {!readOnly && (
          <div className="ml-auto flex items-center gap-0.5">
            {!isIncome && !paid && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="Cor do lançamento">
                    {colorTag ? <span className={`h-4 w-4 rounded-full ${colorTag.dot}`} /> : <Palette className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="end">
                  <p className="mb-1.5 px-1 text-xs font-semibold">Cor do lançamento</p>
                  <div className="flex items-center gap-2">
                    {COLOR_TAGS.map((c) => (
                      <button key={c.key} onClick={() => onColor(t, c.key)} aria-label={c.label} title={c.label}
                        className={`h-9 w-9 rounded-full ${c.dot} ${t.color_tag === c.key ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`} />
                    ))}
                    <button onClick={() => onColor(t, null)} aria-label="Sem cor" title="Sem cor"
                      className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground"><X className="h-4 w-4" /></button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => onPin(t)} aria-label={t.pinned ? "Desafixar" : "Fixar no topo"}>
              {t.pinned ? <PinOff className="h-4 w-4 text-primary" /> : <Pin className="h-4 w-4 text-muted-foreground" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => onEdit(t)} aria-label="Editar"><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => onRemove(t)} aria-label="Excluir"><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
          </div>
        )}
      </div>
    </li>
  );
});
