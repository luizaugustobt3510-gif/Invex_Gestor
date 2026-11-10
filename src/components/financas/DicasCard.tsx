import { useMemo, useState } from "react";
import { Lightbulb, AlertTriangle, ThumbsUp, ChevronRight } from "lucide-react";
import { GENERAL_TIPS, contextualTips, type TipInput } from "@/lib/financas/tips";

/** Dicas financeiras: primeiro as que olham para o seu mês, depois as gerais. */
export function DicasCard(props: TipInput) {
  const tips = useMemo(() => {
    const start = new Date().getDate() % GENERAL_TIPS.length; // dica do dia muda todo dia
    return [...contextualTips(props), ...GENERAL_TIPS.slice(start), ...GENERAL_TIPS.slice(0, start)];
  }, [props.receitas, props.despesas, props.atrasadas, props.pendentes, props.maiorCategoria?.label, props.maiorCategoria?.total]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const tip = tips[i % tips.length];
  const Icon = tip.tone === "alerta" ? AlertTriangle : tip.tone === "boa" ? ThumbsUp : Lightbulb;
  const tone = tip.tone === "alerta" ? "border-warning/40 bg-warning/10" : tip.tone === "boa" ? "border-income/30 bg-income/10" : "border-primary/20 bg-accent/50";
  const iconTone = tip.tone === "alerta" ? "text-warning-foreground" : tip.tone === "boa" ? "text-income" : "text-accent-foreground";
  return (
    <div className={`mt-4 rounded-2xl border p-4 ${tone}`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconTone}`} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dica financeira</p>
          <p className="text-sm font-semibold">{tip.title}</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{tip.text}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{(i % tips.length) + 1} de {tips.length}</span>
        <button type="button" onClick={() => setI((x) => x + 1)} className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary hover:bg-card/60">
          Próxima dica <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
