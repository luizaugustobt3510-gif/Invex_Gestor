import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EXPENSE_CATEGORIES, INCOME_CATEGORY, findCategory } from "@/lib/financas/categories";
import type { Transaction } from "@/lib/financas/transactions";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useCategories } from "@/hooks/useFinancasCategories";
import { QuickAdd } from "@/components/financas/QuickAdd";
import { addCategoryQuick, addSubcategoryQuick } from "@/lib/financas/categories-db";
import { FIN_SHEET_CLASS, FIN_SHEET_FOOTER_CLASS } from "@/components/financas/sheet";
import { limitErrorMessage } from "@/lib/financas/plan";
import { isCaixinha, caixinhaPurpose, caixinhaLabel, caixinhaDescription, currentLabel, nextDescription } from "@/lib/financas/caixinha";
import { Checkbox } from "@/components/ui/checkbox";

export function EditTransactionDialog({
  transaction, open, onOpenChange, ownerId, purposes = [],
}: {
  /** Nomes das caixinhas já existentes, para sugerir. */
  purposes?: string[];
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ownerId: string;
}) {
  const qc = useQueryClient();
  const { expense: EXP, income: INC } = useCategories(ownerId);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [competencia, setCompetencia] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [status, setStatus] = useState<"pago" | "pendente">("pendente");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [toCaixinha, setToCaixinha] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [applySeries, setApplySeries] = useState(false);

  useEffect(() => {
    if (!transaction) return;
    // Na caixinha, o campo mostra só o nome (pessoa/descrição), sem o prefixo "Reserva · ...".
    setDescription(isCaixinha(transaction) ? caixinhaLabel(transaction) : transaction.description);
    setAmount(String(transaction.amount).replace(".", ","));
    setDate(transaction.date);
    setCompetencia(transaction.competencia ?? "");
    setCategory(transaction.category);
    setSubcategory(transaction.subcategory);
    setStatus(transaction.status);
    setNote(transaction.note ?? "");
    const cx = isCaixinha(transaction);
    setToCaixinha(cx);
    setPurpose(cx ? caixinhaPurpose(transaction) : "");
    setApplySeries(false);
  }, [transaction]);

  if (!transaction) return null;

  const cats = transaction.type === "receita" ? INC : EXP;
  const subs = findCategory(category)?.subcategories ?? [];

  const handleCategoryChange = (k: string) => {
    if (!k) return; // o seletor às vezes avisa "vazio" ao trocar a lista; ignorar
    setCategory(k);
    setSubcategory(findCategory(k)?.subcategories[0] ?? "");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount.replace(",", "."));
    if (!value || value <= 0) return toast.error("Informe um valor válido");
    const isRec = transaction.type === "receita";
    const cx = isRec && toCaixinha;
    if (!cx && !description.trim()) return toast.error("Informe uma descrição");
    if (cx && !purpose.trim()) return toast.error("Informe o nome da caixinha");
    const wasCx = isCaixinha(transaction);
    const label = description.trim();
    let desc = label;
    let cat = category, sub = subcategory;
    if (cx) { desc = caixinhaDescription(purpose, label); cat = "receitas"; sub = "Outros"; }
    else if (wasCx) desc = label || caixinhaPurpose(transaction);

    setBusy(true);
    const { error } = await supabase.from("personal_transactions").update({
      description: desc,
      amount: value,
      date,
      competencia: competencia || null,
      category: cat,
      subcategory: sub,
      status: isRec ? transaction.status : status,
      note: note.trim() || null,
    }).eq("id", transaction.id);
    let seriesErr = null as null | { message: string };
    if (!error && applySeries && transaction.series_id) {
      // Muda só o destino (caixinha) das outras parcelas; valores e datas ficam iguais.
      // O nome de cada parcela (ex: a pessoa) é mantido, a não ser que ele tenha sido trocado aqui.
      const labelChanged = label !== currentLabel(transaction).trim();
      const { data: rows, error: readErr } = await supabase.from("personal_transactions")
        .select("id, description, type, subcategory, series_kind")
        .eq("series_id", transaction.series_id).neq("id", transaction.id);
      seriesErr = readErr;
      const groups = new Map<string, string[]>();
      for (const r of rows ?? []) {
        const rowLabel = labelChanged ? label : currentLabel(r as Transaction);
        const rowDesc = nextDescription({
          toCaixinha: cx,
          purpose: cx ? purpose : caixinhaPurpose(r as Transaction),
          label: rowLabel,
        });
        groups.set(rowDesc, [...(groups.get(rowDesc) ?? []), r.id]);
      }
      for (const [d, ids] of groups) {
        if (seriesErr) break;
        const r = await supabase.from("personal_transactions")
          .update({ description: d, category: cat, subcategory: sub }).in("id", ids);
        seriesErr = r.error;
      }
    }
    setBusy(false);
    if (seriesErr) return toast.error(seriesErr.message);
    if (error) return toast.error(limitErrorMessage(error) ?? error.message);
    toast.success("Lançamento atualizado");
    qc.invalidateQueries({ queryKey: ["pf-transactions", ownerId] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={FIN_SHEET_CLASS}>
        <DialogHeader>
          <DialogTitle>Editar lançamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <Label>Valor (R$)</Label>
              <Input inputMode="decimal" className="text-base" value={amount}
                onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="min-w-0">
              <Label>Vencimento</Label>
              <Input type="date" className="min-w-0 text-base" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>

          {transaction.type === "despesa" && (
            <div>
              <Label>Mês de competência <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input type="month" className="min-w-0 text-base" value={competencia}
                onChange={(e) => setCompetencia(e.target.value)} />
            </div>
          )}

          {transaction.type === "receita" && (
            <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">🐷 Guardar numa caixinha</p>
                  <p className="text-xs text-muted-foreground">O valor vai para a reserva e não entra no saldo livre</p>
                </div>
                <Switch checked={toCaixinha} onCheckedChange={setToCaixinha} aria-label="Guardar numa caixinha" />
              </div>
              {toCaixinha && (
                <div>
                  <Label>Nome da caixinha</Label>
                  <Input list="pf-caixinhas" value={purpose} onChange={(e) => setPurpose(e.target.value)}
                    maxLength={60} placeholder="Ex: Viagem" className="text-base" />
                  <datalist id="pf-caixinhas">{purposes.map((p) => <option key={p} value={p} />)}</datalist>
                </div>
              )}
            </div>
          )}

          <div>
            {transaction.type === "receita" && toCaixinha ? (
              <Label>Nome da pessoa ou descrição <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            ) : <Label>Descrição</Label>}
            <Input value={description} onChange={(e) => setDescription(e.target.value)}
              maxLength={80} required={!(transaction.type === "receita" && toCaixinha)} className="text-base"
              placeholder={transaction.type === "receita" && toCaixinha ? "Ex: Carlos" : undefined} />
          </div>

          {!(transaction.type === "receita" && toCaixinha) && (<>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-1"><Label>Categoria</Label>
                <QuickAdd what="categoria" onSave={async (n) => { const k = await addCategoryQuick(ownerId, transaction.type, n); await qc.invalidateQueries({ queryKey: ["pf-categories"] }); setCategory(k); setSubcategory("Geral"); }} />
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
                <QuickAdd what="subcategoria" onSave={async (n) => { const sname = await addSubcategoryQuick(ownerId, transaction.type, category, n); await qc.invalidateQueries({ queryKey: ["pf-categories"] }); setSubcategory(sname); }} />
              </div>
              <Select value={subcategory} onValueChange={(v) => { if (v) setSubcategory(v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {subs.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          </>)}

          {transaction.type === "despesa" && (
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
              <div>
                <p className="text-sm font-medium">Já está pago?</p>
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
              rows={2} maxLength={300} className="text-base" />
          </div>

          {transaction.series_id && (
            <p className="rounded-lg bg-muted/40 p-2 text-[11px] text-muted-foreground">
              ℹ️ Este lançamento faz parte de uma série ({transaction.series_kind}).
              As alterações afetam <strong>apenas esta parcela</strong>.
            </p>
          )}
          {transaction.series_id && transaction.type === "receita" && (
            <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
              <Checkbox checked={applySeries} onCheckedChange={(v) => setApplySeries(v === true)} className="mt-0.5" />
              <span>Aplicar a caixinha e o nome a <strong>todas as parcelas desta série</strong> (valores e datas não mudam)</span>
            </label>
          )}

          <DialogFooter className={FIN_SHEET_FOOTER_CLASS}>
            <Button type="submit" size="lg" className="h-12 w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
