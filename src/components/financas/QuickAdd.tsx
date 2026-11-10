import { useState } from "react";
import { Plus, Check, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

/** Botão "+ Nova" que vira um campo para criar categoria/subcategoria sem sair do lançamento. */
export function QuickAdd({ what, onSave }: { what: string; onSave: (name: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try { await onSave(name.trim()); setName(""); setOpen(false); toast.success(`${what[0].toUpperCase()}${what.slice(1)} criada`); }
    catch (e) { toast.error((e as Error).message || "Não foi possível criar."); }
    finally { setBusy(false); }
  };
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary">
        <Plus className="h-3 w-3" /> Nova
      </button>
    );
  }
  return (
    <div className="flex basis-full items-center gap-1">
      <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={`Nome da ${what}`} maxLength={40}
        className="h-9 text-base"
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save(); } if (e.key === "Escape") setOpen(false); }} />
      <button type="button" onClick={save} disabled={busy} aria-label="Salvar" className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </button>
      <button type="button" onClick={() => setOpen(false)} aria-label="Cancelar" className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
