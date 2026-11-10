/**
 * Calculadora segura (sem eval): + − × ÷, parênteses, vírgula decimal e % .
 * "200+10%" = 220 ; "50%" = 0,5 ; "100×10%" = 10.
 */
export function evaluateExpression(input: string): number {
  const src = input.replace(/\s+/g, "").replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/,/g, ".");
  if (!src) throw new Error("vazio");
  let i = 0;
  const peek = () => src[i];
  const number = (): number => {
    const start = i;
    while (i < src.length && /[0-9.]/.test(src[i])) i++;
    const s = src.slice(start, i);
    if (!s || (s.match(/\./g) || []).length > 1) throw new Error("número inválido");
    return parseFloat(s);
  };
  const factor = (): number => {
    if (peek() === "-") { i++; return -factor(); }
    if (peek() === "+") { i++; return factor(); }
    let v: number;
    if (peek() === "(") { i++; v = expr(); if (peek() !== ")") throw new Error(")"); i++; }
    else v = number();
    return v;
  };
  const term = (): number => {
    let v = factor();
    if (peek() === "%") { i++; v = v / 100; }
    while (peek() === "*" || peek() === "/") {
      const op = src[i++];
      let r = factor();
      if (peek() === "%") { i++; r = r / 100; }
      if (op === "/" && r === 0) throw new Error("divisão por zero");
      v = op === "*" ? v * r : v / r;
    }
    return v;
  };
  const expr = (): number => {
    let v = term();
    while (peek() === "+" || peek() === "-") {
      const op = src[i++];
      const start = i;
      let r = factor();
      // "200+10%" → soma 10% de 200
      if (peek() === "%" ) { i++; r = (v * r) / 100; }
      else { i = start; r = term(); }
      v = op === "+" ? v + r : v - r;
    }
    return v;
  };
  const result = expr();
  if (i !== src.length || !Number.isFinite(result)) throw new Error("expressão inválida");
  return Math.round(result * 1e8) / 1e8;
}

export function formatCalc(n: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 8 }).format(n);
}

export type CalcEntry = { expr: string; result: string; at: number };
export const CALC_HISTORY_LIMIT = 30;

export function pushHistory(list: CalcEntry[], entry: CalcEntry): CalcEntry[] {
  return [entry, ...list].slice(0, CALC_HISTORY_LIMIT);
}
