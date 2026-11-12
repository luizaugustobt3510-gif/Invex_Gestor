import { useEffect, useMemo, useRef, useState } from "react";
import { Lightbulb, AlertTriangle, ThumbsUp, ChevronRight, X } from "lucide-react";
import { GENERAL_TIPS, contextualTips, type TipInput } from "@/lib/financas/tips";

/** Aviso para os outros flutuantes (calculadora) se fecharem. */
export const FINANCAS_FLUTUANT_OPEN = "financas-flutuante-aberto";

/** Lâmpada flutuante: as dicas financeiras abrem num cartão flutuante, acima da calculadora. */
export function FinancasTips(props: TipInput) {
  const tips = useMemo(() => {
    const start = new Date().getDate() % GENERAL_TIPS.length; // dica do dia muda todo dia
    return [...contextualTips(props), ...GENERAL_TIPS.slice(start), ...GENERAL_TIPS.slice(0, start)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.receitas, props.despesas, props.atrasadas, props.pendentes, props.maiorCategoria?.label, props.maiorCategoria?.total]);

  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener(FINANCAS_FLUTUANT_OPEN, close);
    return () => window.removeEventListener(FINANCAS_FLUTUANT_OPEN, close);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const tip = tips[i % tips.length] ?? GENERAL_TIPS[0];
  const Icon = tip.tone === "alerta" ? AlertTriangle : tip.tone === "boa" ? ThumbsUp : Lightbulb;
  const tone = tip.tone === "alerta" ? "border-warning/40 bg-warning/10" : tip.tone === "boa" ? "border-income/30 bg-income/10" : "border-primary/20 bg-accent/50";
  const iconTone = tip.tone === "alerta" ? "text-warning-foreground" : tip.tone === "boa" ? "text-income" : "text-accent-foreground";

  return (
    <div ref={box} className="contents">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Abrir dicas financeiras" aria-expanded={open}
        className="fixed bottom-[calc(max(1.5rem,env(safe-area-inset-bottom))+4.25rem)] right-4 z-40 grid h-14 w-14 place-items-center rounded-2xl border border-border bg-card text-primary shadow-lg transition active:scale-95 sm:right-6">
        <Lightbulb className="h-6 w-6" />
      </button>

      {open && (
        <div role="dialog" aria-label="Dicas financeiras"
          className="fixed bottom-[calc(max(1.5rem,env(safe-area-inset-bottom))+8.25rem)] right-3 z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-3xl border border-border bg-card p-3 shadow-2xl sm:right-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-semibold"><Lightbulb className="h-4 w-4 text-primary" />Dicas financeiras</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar dicas" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>

          <div className={`rounded-2xl border p-3 ${tone}`}>
            <div className="flex items-start gap-3">
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconTone}`} />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dica financeira</p>
                <p className="text-sm font-semibold">{tip.title}</p>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{tip.text}</p>
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">{(i % tips.length) + 1} de {tips.length}</span>
            <button type="button" onClick={() => setI((x) => x + 1)} className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary hover:bg-muted">
              Próxima dica <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
