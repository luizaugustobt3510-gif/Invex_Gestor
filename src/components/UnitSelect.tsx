import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { UNIT_OPTIONS, unitOptionFor, isFractionalUnit } from '@/lib/units';

interface Props { id?: string; value: string; onChange: (v: string) => void }

/** Lista de unidades (un, kg, t, L, pacote…) com opção de digitar outra. */
export function UnitSelect({ id, value, onChange }: Props) {
  const known = unitOptionFor(value);
  const [custom, setCustom] = useState(!!value && !known);
  const selectValue = custom ? '__outra' : known?.value ?? '';
  return (
    <div className="space-y-1">
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (!v) return;
          if (v === '__outra') { setCustom(true); return; }
          setCustom(false); onChange(v);
        }}
      >
        <SelectTrigger id={id}><SelectValue placeholder="Escolha a unidade" /></SelectTrigger>
        <SelectContent>
          {UNIT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          <SelectItem value="__outra">Outra…</SelectItem>
        </SelectContent>
      </Select>
      {custom && <Input value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} placeholder="Ex.: BANDEJA, GALÃO" />}
      {value && (
        <p className="text-xs text-muted-foreground">
          {isFractionalUnit(value) ? 'Aceita quantidade fracionada (ex.: 1,5).' : 'Só números inteiros (ex.: 1, 2, 3).'}
        </p>
      )}
    </div>
  );
}
