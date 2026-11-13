import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ClipboardList, Plus, Pencil, Trash2 } from 'lucide-react';
import { useProducaoData, parseNum, ProdRecipe } from './useProducaoData';
import { desvioFicha } from './producaoCalc';
import { dbErrorMessage } from '@/lib/dbErrors';

export default function FichasTecnicas() {
  const { companyId, mats, orders, entryById, recipes, matById, load } = useProducaoData();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<ProdRecipe | null>(null);
  const [prodId, setProdId] = useState('');
  const [mpId, setMpId] = useState('');
  const [rend, setRend] = useState('');
  const [dias, setDias] = useState('');
  const [obs, setObs] = useState('');
  const [saving, setSaving] = useState(false);

  const mps = useMemo(() => mats.filter((m) => m.tipo === 'materia_prima'), [mats]);
  const pfs = useMemo(() => mats.filter((m) => m.tipo === 'produto_final'), [mats]);

  const real = (r: ProdRecipe) => {
    const os = orders.filter((o) => o.produto_material_id === r.produto_material_id && entryById[o.entry_id]?.material_id === r.materia_prima_id);
    const c = os.reduce((s, o) => s + o.quantidade_consumida, 0);
    const p = os.reduce((s, o) => s + o.quantidade_produzida, 0);
    return { n: os.length, pct: c > 0 ? (p / c) * 100 : null };
  };

  const abrir = (r?: ProdRecipe) => {
    setEdit(r ?? null);
    setProdId(r?.produto_material_id ?? ''); setMpId(r?.materia_prima_id ?? '');
    setRend(r ? String(r.rendimento_esperado) : ''); setDias(r?.validade_dias ? String(r.validade_dias) : ''); setObs(r?.observacoes ?? '');
    setOpen(true);
  };

  const salvar = async () => {
    const r = parseNum(rend);
    if (!companyId || !prodId || !mpId || !(r && r > 0)) { toast.error('Escolha o produto, a matéria-prima e o rendimento esperado'); return; }
    if (prodId === mpId) { toast.error('Produto e matéria-prima devem ser diferentes'); return; }
    setSaving(true);
    const payload = { company_id: companyId, produto_material_id: prodId, materia_prima_id: mpId, rendimento_esperado: r, validade_dias: parseNum(dias), observacoes: obs };
    const { error } = edit
      ? await supabase.from('production_recipes').update(payload).eq('id', edit.id)
      : await supabase.from('production_recipes').insert(payload);
    setSaving(false);
    if (error) { toast.error(dbErrorMessage(error, 'Erro ao salvar ficha')); return; }
    toast.success('Ficha técnica salva');
    setOpen(false); load();
  };

  const excluir = async (r: ProdRecipe) => {
    const { error } = await supabase.from('production_recipes').delete().eq('id', r.id);
    if (error) { toast.error(dbErrorMessage(error, 'Erro ao excluir')); return; }
    toast.success('Ficha excluída'); load();
  };

  return (
    <MainLayout>
      <div className="space-y-4 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="w-6 h-6 text-primary" /> Fichas técnicas</h1>
            <p className="text-muted-foreground text-sm">Quanto cada matéria-prima deve render. A tela Processar compara cada produção com a ficha.</p>
          </div>
          <Button onClick={() => abrir()}><Plus className="w-4 h-4 mr-1" /> Nova ficha</Button>
        </div>
        <Card>
          <CardHeader><CardTitle className="text-base">Fichas ({recipes.length})</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Produto final</TableHead><TableHead>Matéria-prima</TableHead><TableHead>Rendimento esperado</TableHead>
                <TableHead>Rendimento real</TableHead><TableHead>Validade</TableHead><TableHead>Observações</TableHead><TableHead />
              </TableRow></TableHeader>
              <TableBody>
                {recipes.map((r) => {
                  const rr = real(r);
                  const d = rr.pct != null ? desvioFicha(rr.pct, r.rendimento_esperado) : null;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{matById[r.produto_material_id]?.material}</TableCell>
                      <TableCell>{matById[r.materia_prima_id]?.material}</TableCell>
                      <TableCell>{r.rendimento_esperado}%</TableCell>
                      <TableCell>
                        {rr.pct == null ? <span className="text-muted-foreground">sem produções</span> : (
                          <span className="flex items-center gap-2">{rr.pct.toFixed(1)}%
                            <Badge variant={d! < 0 ? 'destructive' : 'secondary'}>{d! >= 0 ? '+' : ''}{d}</Badge>
                            <span className="text-xs text-muted-foreground">({rr.n})</span></span>
                        )}
                      </TableCell>
                      <TableCell>{r.validade_dias ? `${r.validade_dias} dias` : '-'}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{r.observacoes || '-'}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button size="icon" variant="ghost" onClick={() => abrir(r)} aria-label="Editar ficha"><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => excluir(r)} aria-label="Excluir ficha"><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!recipes.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhuma ficha ainda. Ex.: 10 L de leite rendem 1 kg de queijo (10%).</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit ? 'Editar ficha técnica' : 'Nova ficha técnica'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Produto final *</Label>
              <Select value={prodId} onValueChange={(v) => v && setProdId(v)}>
                <SelectTrigger><SelectValue placeholder={pfs.length ? 'Selecione' : 'Nenhum produto final cadastrado'} /></SelectTrigger>
                <SelectContent>{pfs.map((m) => <SelectItem key={m.id} value={m.id}>{m.codigo} · {m.material}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label>Matéria-prima *</Label>
              <Select value={mpId} onValueChange={(v) => v && setMpId(v)}>
                <SelectTrigger><SelectValue placeholder={mps.length ? 'Selecione' : 'Nenhuma matéria-prima cadastrada'} /></SelectTrigger>
                <SelectContent>{mps.map((m) => <SelectItem key={m.id} value={m.id}>{m.codigo} · {m.material}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Rendimento esperado (%) *</Label><Input inputMode="decimal" value={rend} onChange={(e) => setRend(e.target.value)} placeholder="Ex.: 10" /></div>
              <div><Label>Validade do produto (dias)</Label><Input inputMode="numeric" value={dias} onChange={(e) => setDias(e.target.value)} placeholder="Ex.: 30" /></div>
            </div>
            <div><Label>Observações / modo de preparo</Label><Input value={obs} onChange={(e) => setObs(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
