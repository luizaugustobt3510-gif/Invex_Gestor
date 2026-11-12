import { useMemo, useState } from "react";
import { Users, Target, Check, X } from "lucide-react";
import { toast } from "sonner";
import type { Transaction } from "@/lib/financas/transactions";
import { summarizeCaixinhas } from "@/lib/financas/caixinha";
import { formatBRL, formatDate } from "@/lib/financas/format";
import { useCaixinhaGoals } from "@/hooks/useCaixinhaGoals";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const parseBRL = (v: string) => Number(v.replace(/\./g, "").replace(",", ".")) || 0;

/** Progresso das caixinhas (reservas com propósito, ex: Viagem) com meta editável. */
export function CaixinhasCard({ all, ownerId, readOnly }: { all: Transaction[]; ownerId: string; readOnly?: boolean }) {
  const { goals, saveGoal } = useCaixinhaGoals(ownerId);
  const items = useMemo(() => summarizeCaixinhas(all, goals), [all, goals]);
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  if (items.length === 0) return null;

  const save = async (purpose: string) => {
    try {
      await saveGoal(purpose, parseBRL(value));
      toast.success("Meta salva");
      setEditing(null);
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="mt-3 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary"><Users className="h-4 w-4" /> Minhas caixinhas</p>
      <ul className="space-y-3">
        {items.map((c) => {
          const pct = c.goal > 0 ? Math.min(100, Math.round((c.saved / c.goal) * 100)) : 0;
          const done = c.saved >= c.goal && c.goal > 0;
          const falta = Math.max(0, c.goal - c.saved);
          return (
            <li key={c.seriesId}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-semibold">👥 {c.purpose}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  <strong className="text-foreground">{formatBRL(c.saved)}</strong> de {formatBRL(c.goal)} · {pct}%
                </span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Caixinha ${c.purpose}`}>
                <div className="h-full rounded-full bg-income transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>
                  {c.paidCount}/{c.months} depósitos · {done ? "Meta alcançada! 🎉" : `faltam ${formatBRL(falta)}`}
                  {!done && c.nextDate ? ` · próximo ${formatDate(c.nextDate)}` : ""}
                </span>
                {!readOnly && editing !== c.seriesId && (
                  <button type="button" className="inline-flex items-center gap-1 font-medium text-primary"
                    onClick={() => { setEditing(c.seriesId); setValue(String(c.goal).replace(".", ",")); }}>
                    <Target className="h-3.5 w-3.5" /> {c.customGoal ? "Mudar meta" : "Definir meta"}
                  </button>
                )}
              </div>
              {editing === c.seriesId && (
                <div className="mt-2 flex items-center gap-2">
                  <Input inputMode="decimal" className="h-9 text-base" value={value} autoFocus
                    onChange={(e) => setValue(e.target.value)} placeholder="Meta em R$" aria-label={`Meta da caixinha ${c.purpose}`} />
                  <Button size="icon" className="h-9 w-9 shrink-0" onClick={() => save(c.purpose)} aria-label="Salvar meta"><Check className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => setEditing(null)} aria-label="Cancelar"><X className="h-4 w-4" /></Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-muted-foreground">O dinheiro das caixinhas fica guardado à parte e não entra no saldo livre.</p>
    </div>
  );
}
