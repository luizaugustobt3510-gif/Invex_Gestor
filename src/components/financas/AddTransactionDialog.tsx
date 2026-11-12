import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2, Crown, PiggyBank } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  EXPENSE_CATEGORIES, INCOME_CATEGORY, findCategory, PERSON_CATEGORY_KEYS,
} from "@/lib/financas/categories";
import { addMonthsISO, fetchTransactions } from "@/lib/financas/transactions";
import { buildMonthlySeries, caixinhaDescription, clampMonths } from "@/lib/financas/caixinha";
import { formatBRL } from "@/lib/financas/format";
import { FINANCAS_FREE_MONTHLY_LIMIT, FREE_BUCKET_LABEL, freeLimitBlock, freeLimitMessage, limitErrorMessage, monthlyUsage, txBucket } from "@/lib/financas/plan";
import { FIN_SHEET_CLASS, FIN_SHEET_FOOTER_CLASS } from "@/components/financas/sheet";
import { monthLabel } from "@/lib/financas/format";
import { fetchPeople } from "@/lib/financas/people";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useCategories } from "@/hooks/useFinancasCategories";
import { QuickAdd } from "@/components/financas/QuickAdd";
import { addCategoryQuick, addSubcategoryQuick } from "@/lib/financas/categories-db";

type SeriesMode = "single" | "parcelado" | "recorrente" | "caixinha";
const MODES: Record<"receita" | "despesa", SeriesMode[]> = {
  despesa: ["single", "parcelado", "recorrente"],
  receita: ["single", "recorrente", "caixinha"],
};
const MODE_LABEL: Record<SeriesMode, string> = { single: "Único", parcelado: "Parcelado", recorrente: "Recorrente", caixinha: "Caixinha" };

export function AddTransactionDialog({ userId, canUsePeople = false, premium = false, onSeePlans }: {
  userId: string; canUsePeople?: boolean; premium?: boolean; onSeePlans?: () => void;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"receita" | "despesa">("despesa");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].key);
  const [subcategory, setSubcategory] = useState(EXPENSE_CATEGORIES[0].subcategories[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [competencia, setCompetencia] = useState(""); // YYYY-MM, opcional
  const [status, setStatus] = useState<"pago" | "pendente">("pendente");
  const [note, setNote] = useState("");
  const [seriesMode, setSeriesMode] = useState<SeriesMode>("single");
  const [installments, setInstallments] = useState("2");
  const [recurrenceMonths, setRecurrenceMonths] = useState("12");
  const [personId, setPersonId] = useState<string>("none");
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: people = [] } = useQuery({
    queryKey: ["pf-people", userId],
    queryFn: () => fetchPeople(userId),
    enabled: open,
    staleTime: 60_000,
  });


  // Plano gratuito: mostra quanto do limite do mês já foi usado (o banco confere de verdade)
  const { data: existing = [] } = useQuery({
    queryKey: ["pf-transactions", userId],
    queryFn: () => fetchTransactions(userId),
    enabled: open && !premium,
    staleTime: 60_000,
  });

  const { expense: EXP, income: INC } = useCategories(userId);
  const cats = type === "receita" ? INC : EXP;
  const subs = findCategory(category)?.subcategories ?? [];
  const showPerson = canUsePeople && type === "despesa" && PERSON_CATEGORY_KEYS.has(category);
  const isCaixinhaMode = type === "receita" && seriesMode === "caixinha";
  const isIncomeSeries = type === "receita" && seriesMode !== "single";
  const targetMonth = (type === "despesa" && competencia) || date.slice(0, 7);
  const bucket = isCaixinhaMode
    ? txBucket({ type, subcategory: "Outros", description: caixinhaDescription(purpose || "x"), date, competencia: null })
    : txBucket({ type, subcategory, description, date, competencia: type === "despesa" ? competencia : null });
  const monthlyValue = parseFloat(amount.replace(",", ".")) || 0;
  const seriesMonths = clampMonths(recurrenceMonths);
  const used = premium ? 0 : monthlyUsage(existing, targetMonth)[bucket];
  const limitReached = !premium && used >= FINANCAS_FREE_MONTHLY_LIMIT;

  const handleTypeChange = (t: "receita" | "despesa") => {
    setType(t);
    const first = t === "receita" ? INC[0] : EXP[0];
    setCategory(first.key);
    setSubcategory(first.subcategories[0]);
    setSeriesMode("single");
    setStatus(t === "receita" ? "pago" : "pendente");
  };

  const handleCategoryChange = (k: string) => {
    if (!k) return; // o seletor às vezes avisa "vazio" ao trocar a lista; ignorar
    setCategory(k);
    setSubcategory(findCategory(k)?.subcategories[0] ?? "");
    if (!PERSON_CATEGORY_KEYS.has(k)) setPersonId("none");
  };

  const reset = () => {
    setDescription(""); setAmount(""); setNote(""); setStatus("pendente");
    setDate(new Date().toISOString().slice(0, 10));
    setCompetencia("");
    setSeriesMode("single"); setInstallments("2"); setRecurrenceMonths("12");
    setPersonId("none"); setPurpose("");
    if (type === "receita") setStatus("pago");
  };

  const buildRows = (baseId: string) => {
    const value = parseFloat(amount.replace(",", "."));
    const baseDescription = description.trim();
    const safeCategory = cats.some((c) => c.key === category) ? category : cats[0]?.key ?? category;
    const safeSub = subcategory || (cats.find((c) => c.key === safeCategory)?.subcategories[0] ?? "");
    const common = {
      user_id: userId,
      type,
      category: safeCategory,
      subcategory: safeSub,
      note: note.trim() || null,
      person_id: personId !== "none" ? personId : null,
      competencia: type === "despesa" ? competencia || null : null,
    };

    if (seriesMode === "caixinha" && type === "receita") {
      const incCat = cats.find((c) => c.subcategories.includes("Outros")) ?? cats[0];
      return buildMonthlySeries(
        { ...common, category: incCat?.key ?? "receitas", subcategory: "Outros", description: caixinhaDescription(purpose), person_id: null },
        { amount: value, date, months: seriesMonths, seriesId: baseId, firstPaid: status === "pago" },
      );
    }

    if (seriesMode === "single" || (type === "receita" && seriesMode === "parcelado")) {
      return [{
        ...common,
        status: type === "receita" ? "pago" as const : status,
        description: baseDescription,
        amount: value,
        date,
        series_id: null,
        series_kind: null,
        installment_number: null,
        installment_total: null,
      }];
    }

    if (seriesMode === "parcelado") {
      const total = Math.max(2, Math.min(60, parseInt(installments, 10) || 2));
      const perInstallment = +(value / total).toFixed(2);
      return Array.from({ length: total }, (_, i) => ({
        ...common,
        description: `${baseDescription} (${i + 1}/${total})`,
        amount: perInstallment,
        date: addMonthsISO(date, i),
        series_id: baseId,
        series_kind: "parcelado" as const,
        installment_number: i + 1,
        installment_total: total,
        status: i === 0 ? status : "pendente" as const,
      }));
    }

    // recorrente (despesa ou receita): mesmo valor todo mês
    return buildMonthlySeries(
      { ...common, description: baseDescription },
      { amount: value, date, months: seriesMonths, seriesId: baseId, firstPaid: status === "pago" },
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount.replace(",", "."));
    if (!value || value <= 0) return toast.error("Informe um valor válido");
    if (isCaixinhaMode) {
      if (!purpose.trim()) return toast.error("Diga para que é a caixinha (ex: Viagem)");
    } else if (!description.trim()) return toast.error("Informe uma descrição");

    const baseId = crypto.randomUUID();
    const rows = buildRows(baseId);
    if (!premium) {
      const block = freeLimitBlock(existing, rows);
      if (block) return toast.error(freeLimitMessage(block.bucket, block.month));
    }
    setBusy(true);
    const { error } = await supabase.from("personal_transactions").insert(rows as never);
    setBusy(false);
    if (error) return toast.error(limitErrorMessage(error) ?? error.message);

    const msg =
      isCaixinhaMode ? `Caixinha "${purpose.trim()}" criada: ${rows.length} depósitos mensais` :
      seriesMode === "parcelado" ? `${rows.length} parcelas criadas` :
      seriesMode === "recorrente" ? `Recorrência criada (${rows.length} meses)` :
      type === "receita" ? "Receita lançada" : "Despesa lançada";
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ["pf-transactions"] });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="rounded-full shadow-lg">
          <Plus className="h-5 w-5" /> Lançar
        </Button>
      </DialogTrigger>
      <DialogContent className={FIN_SHEET_CLASS}>
        <DialogHeader>
          <DialogTitle>Novo lançamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex rounded-xl bg-muted p-1">
            <button type="button" onClick={() => handleTypeChange("despesa")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                type === "despesa" ? "bg-expense text-expense-foreground" : "text-muted-foreground"
              }`}>Despesa</button>
            <button type="button" onClick={() => handleTypeChange("receita")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                type === "receita" ? "bg-income text-income-foreground" : "text-muted-foreground"
              }`}>Receita</button>
          </div>

          {!premium && (
            <div className={`rounded-xl border p-3 text-xs ${limitReached ? "border-expense/40 bg-expense/10" : "border-border bg-muted/30"}`}>
              <p>
                Plano gratuito: <strong className="tabular-nums">{Math.min(used, FINANCAS_FREE_MONTHLY_LIMIT)} de {FINANCAS_FREE_MONTHLY_LIMIT}</strong> {FREE_BUCKET_LABEL[bucket]} em {monthLabel(targetMonth)}.
              </p>
              {limitReached && (
                <p className="mt-1 text-muted-foreground">Limite deste mês atingido. Escolha outro mês ou assine o Premium para lançar sem limite.</p>
              )}
              {limitReached && onSeePlans && (
                <Button type="button" size="sm" variant="outline" className="mt-2 h-9" onClick={() => { setOpen(false); onSeePlans(); }}>
                  <Crown className="h-4 w-4" /> Ver Premium
                </Button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <Label>{isCaixinhaMode ? "Valor por mês (R$)" : `Valor (R$)${seriesMode === "parcelado" ? " · total" : ""}`}</Label>
              <Input inputMode="decimal" className="text-base" placeholder="0,00" value={amount}
                onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="min-w-0">
              <Label>{isCaixinhaMode ? "1º depósito" : type === "receita" ? `Data ${seriesMode !== "single" ? "(1ª)" : ""}` : `Vencimento ${seriesMode !== "single" ? "(1ª)" : ""}`}</Label>
              <Input type="date" className="min-w-0 text-base" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>

          {type === "despesa" && (
            <div>
              <Label>Mês de competência <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input type="month" className="min-w-0 text-base" value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                placeholder="A qual mês essa conta se refere" />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Use quando o mês de referência é diferente do vencimento (ex: luz de junho paga em julho).
              </p>
            </div>
          )}

          {isCaixinhaMode ? (
            <div>
              <Label>Para que é a caixinha?</Label>
              <Input value={purpose} onChange={(e) => setPurpose(e.target.value)}
                placeholder="Ex: Viagem" maxLength={60} required className="text-base" />
            </div>
          ) : (
            <div>
              <Label>Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder={type === "receita" ? "Ex: Salário" : "Ex: Conta de luz"} maxLength={120} required className="text-base" />
            </div>
          )}

          {!isCaixinhaMode && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-1"><Label>Categoria</Label>
                <QuickAdd what="categoria" onSave={async (n) => { const k = await addCategoryQuick(userId, type, n); await qc.invalidateQueries({ queryKey: ["pf-categories"] }); setCategory(k); setSubcategory("Geral"); }} />
              </div>
              <Select value={category} onValueChange={handleCategoryChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cats.map((c) => (
                    <SelectItem key={c.key} value={c.key}>{c.icon} {c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-between gap-1"><Label>Subcategoria</Label>
                <QuickAdd what="subcategoria" onSave={async (n) => { const sname = await addSubcategoryQuick(userId, type, category, n); await qc.invalidateQueries({ queryKey: ["pf-categories"] }); setSubcategory(sname); }} />
              </div>
              <Select value={subcategory} onValueChange={(v) => { if (v) setSubcategory(v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {subs.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>}

          {showPerson && (
            <div>
              <Label>Pessoa</Label>
              <Select value={personId} onValueChange={setPersonId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem pessoa vinculada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem pessoa vinculada</SelectItem>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {people.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Cadastre pessoas na aba <strong>Pessoas</strong>.
                </p>
              )}
            </div>
          )}

          {(
            <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
              <Label>{type === "receita" ? "Tipo de receita" : "Tipo de pagamento"}</Label>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-background p-1 text-xs">
                {MODES[type].map((mode) => (
                  <button key={mode} type="button" onClick={() => setSeriesMode(mode)}
                    className={`rounded-md py-2 font-semibold transition ${
                      seriesMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}>
                    {MODE_LABEL[mode]}
                  </button>
                ))}
              </div>
              {seriesMode === "parcelado" && (
                <div>
                  <Label className="text-xs">Em quantas parcelas?</Label>
                  <Input type="number" inputMode="numeric" className="text-base" min={2} max={60} value={installments}
                    onChange={(e) => setInstallments(e.target.value)} />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Cria 1 lançamento por mês, dividindo o valor total.
                  </p>
                </div>
              )}
              {seriesMode === "recorrente" && (
                <div>
                  <Label className="text-xs">Por quantos meses repetir?</Label>
                  <Input type="number" inputMode="numeric" className="text-base" min={2} max={60} value={recurrenceMonths}
                    onChange={(e) => setRecurrenceMonths(e.target.value)} />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {type === "receita"
                      ? "Cria a mesma receita todo mês (ex: salário, aluguel recebido). Você marca quando receber."
                      : "Cria lançamentos iguais todo mês (ex: assinatura, aluguel)."}
                  </p>
                </div>
              )}
              {isCaixinhaMode && (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Por quantos meses guardar?</Label>
                    <Input type="number" inputMode="numeric" className="text-base" min={2} max={60} value={recurrenceMonths}
                      onChange={(e) => setRecurrenceMonths(e.target.value)} />
                  </div>
                  <div className="flex items-start gap-2 rounded-lg bg-background p-2.5 text-xs">
                    <PiggyBank className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p>
                      {monthlyValue > 0
                        ? <>Guardando <strong>{formatBRL(monthlyValue)}</strong> por mês, em {seriesMonths} meses você junta <strong>{formatBRL(monthlyValue * seriesMonths)}</strong>{purpose.trim() ? <> para <strong>{purpose.trim()}</strong></> : null}.</>
                        : "Cria um depósito por mês para você marcar quando guardar. Ele entra na sua Reserva."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {(type === "despesa" || isIncomeSeries) && (
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
              <div>
                <p className="text-sm font-medium">
                  {isCaixinhaMode ? "Já guardou o 1º depósito?"
                    : type === "receita" ? "Já recebeu a primeira?"
                    : seriesMode === "single" ? "Já está pago?" : "Primeira já está paga?"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {type === "receita"
                    ? (status === "pago" ? (isCaixinhaMode ? "Já está guardado" : "Já entrou na conta") : (isCaixinhaMode ? "Ainda vai guardar" : "Ainda vai receber"))
                    : (status === "pago" ? "Já saiu da conta" : "Ainda vai ser paga")}
                </p>
              </div>
              <Switch checked={status === "pago"}
                onCheckedChange={(v) => setStatus(v ? "pago" : "pendente")} />
            </div>
          )}

          <div>
            <Label>Observação (opcional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)}
              rows={2} maxLength={300} className="text-base" />
          </div>

          <DialogFooter className={FIN_SHEET_FOOTER_CLASS}>
            <Button type="submit" size="lg" className="h-12 w-full" disabled={busy || limitReached}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar lançamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
