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

/**
 * Progresso das caixinhas (reservas com propósito, ex: Viagem) com meta editável.
 * `insideCard` = dentro do cartão verde "Você ainda pode gastar"; sem caixinhas fica desativado.
 */
export function CaixinhasCard({ all, ownerId, readOnly, insideCard }: { all: Transaction[]; ownerId: string; readOnly?: boolean; insideCard?: boolean }) {
  const { goals, saveGoal } = useCaixinhaGoals(ownerId);
  const items = useMemo(() => summarizeCaixinhas(all, goals), [all, goals]);
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const empty = items.length === 0;

  const soft = insideCard ? "text-primary-foreground" : "text-muted-foreground";
  const strong = insideCard ? "text-primary-foreground" : "text-foreground";
  const action = insideCard ? "text-primary-foreground" : "text-primary";

  const save = async (purpose: string) => {
    try {
      await saveGoal(purpose, parseBRL(value));
      toast.success("Meta salva");
      setEditing(null);
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div aria-disabled={empty || undefined}
      className={`mt-4 rounded-2xl border p-3 ${insideCard ? "border-primary-foreground/40 bg-primary-foreground/12" : "border-border bg-card shadow-[var(--shadow-card)]"} ${empty && insideCard ? "border-dashed" : ""}`}>
      <p className={`mb-2 flex items-center gap-1.5 text-xs font-bold ${insideCard ? "text-primary-foreground" : "text-primary"}`}>
        <Users className="h-4 w-4" /> Minhas caixinhas
      </p>

      {empty ? (
        <p className={`text-[11px] leading-5 ${insideCard ? "text-primary-foreground" : "text-muted-foreground"}`}>
          Nenhuma caixinha ainda. Ao editar uma receita, escolha “Guardar numa caixinha” para juntar dinheiro com meta.
        </p>
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((c) => {
              const pct = c.goal > 0 ? Math.min(100, Math.round((c.saved / c.goal) * 100)) : 0;
              const done = c.saved >= c.goal && c.goal > 0;
              const falta = Math.max(0, c.goal - c.saved);
              return (
                <li key={c.seriesId}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className={`inline-flex min-w-0 items-center gap-1.5 font-semibold ${strong}`}>
                      <Users className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{c.purpose}</span>
                    </span>
                    <span className={`shrink-0 text-xs tabular-nums ${soft}`}>
                      <strong className={strong}>{formatBRL(c.saved)}</strong> de {formatBRL(c.goal)} · {pct}%
                    </span>
                  </div>
                  <div className={`mt-1.5 h-2.5 overflow-hidden rounded-full ${insideCard ? "bg-primary-foreground/25" : "bg-muted"}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Caixinha ${c.purpose}`}>
                    <div className={`h-full rounded-full transition-all ${insideCard ? "bg-primary-foreground" : "bg-income"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className={`mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] ${soft}`}>
                    <span>
                      {c.paidCount}/{c.months} depósitos · {done ? "Meta alcançada! 🎉" : `faltam ${formatBRL(falta)}`}
                      {!done && c.nextDate ? ` · próximo ${formatDate(c.nextDate)}` : ""}
                    </span>
                    {!readOnly && editing !== c.seriesId && (
                      <button type="button" className={`inline-flex items-center gap-1 font-medium ${action}`}
                        onClick={() => { setEditing(c.seriesId); setValue(String(c.goal).replace(".", ",")); }}>
                        <Target className="h-3.5 w-3.5" /> {c.customGoal ? "Mudar meta" : "Definir meta"}
                      </button>
                    )}
                  </div>
                  {editing === c.seriesId && (
                    <div className="mt-2 flex items-center gap-2">
                      <Input inputMode="decimal" className="h-9 text-base" value={value} autoFocus
                        onChange={(e) => setValue(e.target.value)} placeholder="Meta em R$" aria-label={`Meta da caixinha ${c.purpose}`} />
                      <Button size="icon" className={`h-9 w-9 shrink-0 ${insideCard ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : ""}`} onClick={() => save(c.purpose)} aria-label="Salvar meta"><Check className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className={`h-9 w-9 shrink-0 ${insideCard ? "text-primary-foreground hover:bg-primary-foreground/15" : ""}`} onClick={() => setEditing(null)} aria-label="Cancelar"><X className="h-4 w-4" /></Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <p className={`mt-2 text-[11px] ${soft}`}>O dinheiro das caixinhas fica guardado à parte e não entra no saldo livre.</p>
        </>
      )}
    </div>
  );
}
