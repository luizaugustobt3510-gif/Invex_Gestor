import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus } from 'lucide-react';
import { isFractionalUnit, parseQty, unitShort } from '@/lib/units';

interface Props {
  value: number;
  unidade?: string | null;
  max?: number;
  onChange: (n: number) => void;
  onInvalid?: (msg: string) => void;
  label?: string;
}

/** Quantidade com botões − / + e campo para digitar (aceita 1,5 em kg, t, L…). */
export function QuantityInput({ value, unidade, max, onChange, onInvalid, label }: Props) {
  const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 3, useGrouping: false });
  const [text, setText] = useState(fmt(value));
  useEffect(() => { setText(fmt(value)); }, [value]);

  const commit = (t: string) => {
    const r = parseQty(t, unidade);
    if (r.value == null) { onInvalid?.(r.error ?? 'Quantidade inválida'); setText(fmt(value)); return; }
    if (max != null && r.value > max) { onInvalid?.(`Disponível: ${fmt(max)} ${unitShort(unidade)}`); setText(fmt(value)); return; }
    onChange(r.value);
  };
  const step = (d: number) => {
    const n = Math.round((value + d) * 1000) / 1000;
    if (n <= 0) return;
    if (max != null && n > max) { onInvalid?.(`Disponível: ${fmt(max)} ${unitShort(unidade)}`); return; }
    onChange(n);
  };

  return (
    <div className="flex items-center gap-1">
      <Button type="button" size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => step(-1)} aria-label="Diminuir">
        <Minus className="h-3 w-3" />
      </Button>
      <Input
        aria-label={label ?? 'Quantidade'}
        inputMode={isFractionalUnit(unidade) ? 'decimal' : 'numeric'}
        className="h-8 w-20 text-center text-base md:text-sm px-1"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit((e.target as HTMLInputElement).value); } }}
        onFocus={(e) => e.target.select()}
      />
      <Button type="button" size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => step(1)} aria-label="Aumentar">
        <Plus className="h-3 w-3" />
      </Button>
      <span className="text-xs text-muted-foreground w-7">{unitShort(unidade)}</span>
    </div>
  );
}
