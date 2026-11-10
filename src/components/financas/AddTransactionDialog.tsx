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
import { Plus, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  EXPENSE_CATEGORIES, INCOME_CATEGORY, findCategory, PERSON_CATEGORY_KEYS,
} from "@/lib/financas/categories";
import { addMonthsISO } from "@/lib/financas/transactions";
import { fetchPeople } from "@/lib/financas/people";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useCategories } from "@/hooks/useFinancasCategories";

type SeriesMode = "single" | "parcelado" | "recorrente";

export function AddTransactionDialog({ userId, canUsePeople = false }: { userId: string; canUsePeople?: boolean }) {
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
  const [busy, setBusy] = useState(false);

  const { data: people = [] } = useQuery({
    queryKey: ["pf-people", userId],
    queryFn: () => fetchPeople(userId),
    enabled: open,
    staleTime: 60_000,
  });


  const { expense: EXP, income: INC } = useCategories(userId);
  const cats = type === "receita" ? INC : EXP;
  const subs = findCategory(category)?.subcategories ?? [];
  const showPerson = canUsePeople && type === "despesa" && PERSON_CATEGORY_KEYS.has(category);
  const showSeries = type === "despesa";

  const handleTypeChange = (t: "receita" | "despesa") => {
    setType(t);
    const first = t === "receita" ? INC[0] : EXP[0];
    setCategory(first.key);
    setSubcategory(first.subcategories[0]);
    if (t === "receita") setSeriesMode("single");
  };

  const handleCategoryChange = (k: string) => {
    setCategory(k);
    setSubcategory(findCategory(k)?.subcategories[0] ?? "");
    if (!PERSON_CATEGORY_KEYS.has(k)) setPersonId("none");
  };

  const reset = () => {
    setDescription(""); setAmount(""); setNote(""); setStatus("pendente");
    setDate(new Date().toISOString().slice(0, 10));
    setCompetencia("");
    setSeriesMode("single"); setInstallments("2"); setRecurrenceMonths("12");
    setPersonId("none");
  };

  const buildRows = (baseId: string) => {
    const value = parseFloat(amount.replace(",", "."));
    const baseDescription = description.trim();
    const common = {
      user_id: userId,
      type,
      category,
      subcategory,
      note: note.trim() || null,
      person_id: personId !== "none" ? personId : null,
      competencia: competencia || null,
      status: type === "receita" ? "pago" as const : status,
    };

    if (type === "receita" || seriesMode === "single") {
      return [{
        ...common,
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
        status: i === 0 ? common.status : "pendente" as const,
      }));
    }

    // recorrente
    const months = Math.max(2, Math.min(60, parseInt(recurrenceMonths, 10) || 12));
    return Array.from({ length: months }, (_, i) => ({
      ...common,
      description: baseDescription,
      amount: value,
      date: addMonthsISO(date, i),
      series_id: baseId,
      series_kind: "recorrente" as const,
      installment_number: i + 1,
      installment_total: months,
      status: i === 0 ? common.status : "pendente" as const,
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount.replace(",", "."));
    if (!value || value <= 0) return toast.error("Informe um valor válido");
    if (!description.trim()) return toast.error("Informe uma descrição");

    setBusy(true);
    const baseId = crypto.randomUUID();
    const rows = buildRows(baseId);
    const { error } = await supabase.from("personal_transactions").insert(rows as never);
    setBusy(false);
    if (error) return toast.error(error.message);

    const msg =
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
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor (R$){seriesMode === "parcelado" ? " · total" : ""}</Label>
              <Input inputMode="decimal" className="text-base" placeholder="0,00" value={amount}
                onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div>
              <Label>Vencimento {seriesMode !== "single" ? "(1ª)" : ""}</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>

          {type === "despesa" && (
            <div>
              <Label>Mês de competência <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input type="month" value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                placeholder="A qual mês essa conta se refere" />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Use quando o mês de referência é diferente do vencimento (ex: luz de junho paga em julho).
              </p>
            </div>
          )}

          <div>
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Conta de luz" maxLength={120} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
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
              <Label>Subcategoria</Label>
              <Select value={subcategory} onValueChange={setSubcategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {subs.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

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

          {showSeries && (
            <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
              <Label>Tipo de pagamento</Label>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-background p-1 text-xs">
                {(["single", "parcelado", "recorrente"] as SeriesMode[]).map((mode) => (
                  <button key={mode} type="button" onClick={() => setSeriesMode(mode)}
                    className={`rounded-md py-1.5 font-semibold capitalize transition ${
                      seriesMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}>
                    {mode === "single" ? "Único" : mode === "parcelado" ? "Parcelado" : "Recorrente"}
                  </button>
                ))}
              </div>
              {seriesMode === "parcelado" && (
                <div>
                  <Label className="text-xs">Em quantas parcelas?</Label>
                  <Input type="number" min={2} max={60} value={installments}
                    onChange={(e) => setInstallments(e.target.value)} />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Cria 1 lançamento por mês, dividindo o valor total.
                  </p>
                </div>
              )}
              {seriesMode === "recorrente" && (
                <div>
                  <Label className="text-xs">Por quantos meses repetir?</Label>
                  <Input type="number" min={2} max={60} value={recurrenceMonths}
                    onChange={(e) => setRecurrenceMonths(e.target.value)} />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Cria lançamentos iguais todo mês (ex: assinatura, aluguel).
                  </p>
                </div>
              )}
            </div>
          )}

          {type === "despesa" && (
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
              <div>
                <p className="text-sm font-medium">
                  {seriesMode === "single" ? "Já está pago?" : "Primeira já está paga?"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {status === "pago" ? "Já saiu da conta" : "Ainda vai ser paga"}
                </p>
              </div>
              <Switch checked={status === "pago"}
                onCheckedChange={(v) => setStatus(v ? "pago" : "pendente")} />
            </div>
          )}

          <div>
            <Label>Observação (opcional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)}
              rows={2} maxLength={300} />
          </div>

          <DialogFooter>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar lançamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
