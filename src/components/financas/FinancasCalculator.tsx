import { useEffect, useState } from "react";
import { Calculator, X, History, Trash2, Delete } from "lucide-react";
import { evaluateExpression, formatCalc, pushHistory, type CalcEntry } from "@/lib/financas/calc";
import { FINANCAS_FLUTUANT_OPEN } from "@/components/financas/FinancasTips";

const KEY = "pf-calc-history";
const KEYS = ["C", "(", ")", "÷", "7", "8", "9", "×", "4", "5", "6", "−", "1", "2", "3", "+", "%", "0", ",", "="];

function loadHistory(): CalcEntry[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}

/** Calculadora flutuante com histórico (fica salvo neste aparelho). */
export function FinancasCalculator() {
  const [open, setOpen] = useState(false);
  const [expr, setExpr] = useState("");
  const [preview, setPreview] = useState("");
  const [history, setHistory] = useState<CalcEntry[]>(loadHistory);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(history)); }, [history]);
  useEffect(() => {
    try { setPreview(expr && /[+−×÷%]/.test(expr) ? formatCalc(evaluateExpression(expr)) : ""); } catch { setPreview(""); }
  }, [expr]);

  const press = (k: string) => {
    if (k === "C") { setExpr(""); return; }
    if (k === "=") {
      try {
        const r = formatCalc(evaluateExpression(expr));
        setHistory((h) => pushHistory(h, { expr, result: r, at: Date.now() }));
        setExpr(r.replace(/\./g, ""));
      } catch { setPreview("Conta inválida"); }
      return;
    }
    setExpr((e) => e + k);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const map: Record<string, string> = { "*": "×", "/": "÷", "-": "−", "+": "+", ".": ",", ",": ",", Enter: "=", "=": "=", "%": "%", "(": "(", ")": ")" };
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (map[e.key]) { e.preventDefault(); press(map[e.key]); }
      else if (e.key === "Backspace") setExpr((x) => x.slice(0, -1));
      else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) {
    return (
      <button type="button" onClick={() => { window.dispatchEvent(new Event(FINANCAS_FLUTUANT_OPEN)); setOpen(true); }} aria-label="Abrir calculadora"
        className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-4 z-40 grid h-14 w-14 place-items-center rounded-2xl border border-border bg-card text-primary shadow-lg transition active:scale-95 sm:right-6">
        <Calculator className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div role="dialog" aria-label="Calculadora"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-3 z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-3xl border border-border bg-card p-3 shadow-2xl sm:right-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold"><Calculator className="h-4 w-4 text-primary" />Calculadora</span>
        <div className="flex gap-1">
          <button type="button" onClick={() => setShowHistory((v) => !v)} aria-label="Histórico"
            className={`grid h-9 w-9 place-items-center rounded-lg ${showHistory ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}><History className="h-4 w-4" /></button>
          <button type="button" onClick={() => setOpen(false)} aria-label="Fechar calculadora" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
      </div>

      {showHistory ? (
        <div className="mb-2 max-h-72 min-h-[12rem] overflow-y-auto rounded-2xl bg-muted/40 p-2">
          {history.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Nenhuma conta ainda.</p>
          ) : (
            <>
              <ul className="space-y-1">
                {history.map((h) => (
                  <li key={h.at}>
                    <button type="button" onClick={() => { setExpr(h.result.replace(/\./g, "")); setShowHistory(false); }}
                      className="w-full rounded-lg px-2 py-1.5 text-right hover:bg-card">
                      <span className="block truncate text-xs text-muted-foreground">{h.expr} =</span>
                      <span className="block text-base font-semibold tabular-nums">{h.result}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setHistory([])} className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-xs text-muted-foreground hover:bg-card">
                <Trash2 className="h-3.5 w-3.5" />Limpar histórico
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="mb-2 rounded-2xl bg-muted/40 px-3 py-2 text-right">
          <div className="flex items-center justify-end gap-2">
            <p className="min-h-[2.25rem] flex-1 break-all text-2xl font-semibold tabular-nums">{expr || "0"}</p>
            <button type="button" onClick={() => setExpr((x) => x.slice(0, -1))} aria-label="Apagar" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-card"><Delete className="h-4 w-4" /></button>
          </div>
          <p className="h-4 text-xs text-muted-foreground tabular-nums">{preview && `= ${preview}`}</p>
        </div>
      )}

      <div className="grid grid-cols-4 gap-1.5">
        {KEYS.map((k) => {
          const op = ["÷", "×", "−", "+", "%", "(", ")"].includes(k);
          const cls = k === "=" ? "bg-primary text-primary-foreground" : k === "C" ? "bg-expense/10 text-expense" : op ? "bg-primary/10 text-primary" : "bg-muted/60";
          return (
            <button key={k} type="button" onClick={() => press(k)} className={`h-12 rounded-xl text-lg font-semibold transition active:scale-95 ${cls}`}>{k}</button>
          );
        })}
      </div>
    </div>
  );
}
