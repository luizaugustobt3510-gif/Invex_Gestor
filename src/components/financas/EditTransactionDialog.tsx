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

export function EditTransactionDialog({
  transaction, open, onOpenChange, ownerId,
}: {
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

  useEffect(() => {
    if (!transaction) return;
    setDescription(transaction.description);
    setAmount(String(transaction.amount).replace(".", ","));
    setDate(transaction.date);
    setCompetencia(transaction.competencia ?? "");
    setCategory(transaction.category);
    setSubcategory(transaction.subcategory);
    setStatus(transaction.status);
    setNote(transaction.note ?? "");
  }, [transaction]);

  if (!transaction) return null;

  const cats = transaction.type === "receita" ? INC : EXP;
  const subs = findCategory(category)?.subcategories ?? [];

  const handleCategoryChange = (k: string) => {
    setCategory(k);
    setSubcategory(findCategory(k)?.subcategories[0] ?? "");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount.replace(",", "."));
    if (!value || value <= 0) return toast.error("Informe um valor válido");
    if (!description.trim()) return toast.error("Informe uma descrição");

    setBusy(true);
    const { error } = await supabase.from("personal_transactions").update({
      description: description.trim(),
      amount: value,
      date,
      competencia: competencia || null,
      category,
      subcategory,
      status: transaction.type === "receita" ? "pago" : status,
      note: note.trim() || null,
    }).eq("id", transaction.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Lançamento atualizado");
    qc.invalidateQueries({ queryKey: ["pf-transactions", ownerId] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar lançamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor (R$)</Label>
              <Input inputMode="decimal" value={amount}
                onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div>
              <Label>Vencimento</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>

          {transaction.type === "despesa" && (
            <div>
              <Label>Mês de competência <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input type="month" value={competencia}
                onChange={(e) => setCompetencia(e.target.value)} />
            </div>
          )}

          <div>
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)}
              maxLength={120} required />
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
              rows={2} maxLength={300} />
          </div>

          {transaction.series_id && (
            <p className="rounded-lg bg-muted/40 p-2 text-[11px] text-muted-foreground">
              ℹ️ Este lançamento faz parte de uma série ({transaction.series_kind}).
              As alterações afetam <strong>apenas esta parcela</strong>.
            </p>
          )}

          <DialogFooter>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
