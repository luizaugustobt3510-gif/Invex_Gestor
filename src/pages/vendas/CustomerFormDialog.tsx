import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { dbErrorMessage } from '@/lib/dbErrors';
import type { Customer } from './useVendasCatalog';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  companyId: string;
  customer?: Customer | null;
  /** Formulário curto (usado no PDV) */
  compact?: boolean;
  onSaved: (c: Customer) => void;
}

const empty = {
  nome: '', tipo_pessoa: 'juridica' as 'fisica' | 'juridica', documento: '', telefone: '', email: '', endereco: '', cidade: '', uf: '',
  segmento: '', prazo: '', limite: '', nota: 5, observacoes: '', ativo: true,
};

export function CustomerFormDialog({ open, onOpenChange, companyId, customer, compact, onSaved }: Props) {
  const [f, setF] = useState(empty);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof empty>(k: K, v: (typeof empty)[K]) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!open) return;
    setF(customer ? {
      nome: customer.nome, tipo_pessoa: customer.tipo_pessoa, documento: customer.documento ?? '', telefone: customer.telefone ?? '',
      email: customer.email ?? '', endereco: customer.endereco ?? '', cidade: customer.cidade ?? '', uf: customer.uf ?? '',
      segmento: customer.segmento ?? '', prazo: String(customer.prazo_pagamento_dias || ''), limite: String(customer.limite_credito || ''),
      nota: customer.nota, observacoes: customer.observacoes ?? '', ativo: customer.ativo,
    } : empty);
  }, [open, customer]);

  const save = async () => {
    if (!f.nome.trim()) { toast.error('Informe o nome do comprador'); return; }
    const prazo = Number(f.prazo.replace(',', '.')) || 0;
    const limite = Number(f.limite.replace(',', '.')) || 0;
    if (prazo < 0 || limite < 0) { toast.error('Prazo e limite não podem ser negativos'); return; }
    const payload = {
      company_id: companyId, nome: f.nome.trim(), tipo_pessoa: f.tipo_pessoa, documento: f.documento.trim() || null,
      telefone: f.telefone.trim() || null, email: f.email.trim() || null, endereco: f.endereco.trim() || null,
      cidade: f.cidade.trim() || null, uf: f.uf.trim().toUpperCase() || null, segmento: f.segmento.trim(),
      prazo_pagamento_dias: Math.round(prazo), limite_credito: limite, nota: f.nota, observacoes: f.observacoes.trim() || null, ativo: f.ativo,
    };
    setSaving(true);
    const q = customer
      ? supabase.from('customers').update(payload).eq('id', customer.id).select().single()
      : supabase.from('customers').insert(payload).select().single();
    const { data, error } = await q;
    setSaving(false);
    if (error || !data) { toast.error(dbErrorMessage(error, 'Não foi possível salvar o comprador')); return; }
    toast.success(customer ? 'Comprador atualizado' : 'Comprador cadastrado');
    onSaved(data as unknown as Customer);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>{customer ? 'Editar comprador' : 'Novo comprador'}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-1 sm:grid-cols-2">
          <div className="sm:col-span-2 grid gap-1.5"><Label>Nome / Razão social *</Label><Input value={f.nome} onChange={(e) => set('nome', e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Tipo</Label>
            <Select value={f.tipo_pessoa} onValueChange={(v) => v && set('tipo_pessoa', v as 'fisica' | 'juridica')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="juridica">Empresa (CNPJ)</SelectItem>
                <SelectItem value="fisica">Pessoa (CPF)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5"><Label>{f.tipo_pessoa === 'fisica' ? 'CPF' : 'CNPJ'}</Label><Input value={f.documento} onChange={(e) => set('documento', e.target.value)} inputMode="numeric" /></div>
          <div className="grid gap-1.5"><Label>Telefone / WhatsApp</Label><Input value={f.telefone} onChange={(e) => set('telefone', e.target.value)} inputMode="tel" /></div>
          <div className="grid gap-1.5"><Label>Prazo de pagamento (dias)</Label><Input value={f.prazo} onChange={(e) => set('prazo', e.target.value)} inputMode="numeric" placeholder="0 = à vista" /></div>
          {!compact && (
            <>
              <div className="grid gap-1.5"><Label>E-mail</Label><Input type="email" inputMode="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></div>
              <div className="grid gap-1.5"><Label>Tipo de comprador</Label><Input value={f.segmento} onChange={(e) => set('segmento', e.target.value)} placeholder="Ex.: Atacado, Restaurante, Mercado" /></div>
              <div className="sm:col-span-2 grid gap-1.5"><Label>Endereço</Label><Input value={f.endereco} onChange={(e) => set('endereco', e.target.value)} /></div>
              <div className="grid gap-1.5"><Label>Cidade</Label><Input value={f.cidade} onChange={(e) => set('cidade', e.target.value)} /></div>
              <div className="grid gap-1.5"><Label>UF</Label><Input value={f.uf} maxLength={2} onChange={(e) => set('uf', e.target.value)} /></div>
              <div className="grid gap-1.5"><Label>Limite de crédito (R$)</Label><Input value={f.limite} onChange={(e) => set('limite', e.target.value)} inputMode="decimal" /></div>
              <div className="grid gap-1.5"><Label>Nota inicial: {f.nota}</Label><Slider min={0} max={10} step={0.5} value={[f.nota]} onValueChange={(v) => set('nota', v[0])} /></div>
              <div className="sm:col-span-2 grid gap-1.5"><Label>Observações</Label><Input value={f.observacoes} onChange={(e) => set('observacoes', e.target.value)} /></div>
              <div className="sm:col-span-2 flex items-center gap-2"><Switch checked={f.ativo} onCheckedChange={(v) => set('ativo', v)} id="cli-ativo" /><Label htmlFor="cli-ativo">Ativo (aparece no PDV)</Label></div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
