import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Package, Plus, Edit2, Layers, Search, ShoppingCart, Factory } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { dbErrorMessage } from '@/lib/dbErrors';
import { UnitSelect } from '@/components/UnitSelect';
import { formatQty, parseQty, unitShort } from '@/lib/units';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useVendasCatalog, brl, fmtDate, type CatalogProduct } from './useVendasCatalog';
import { saldoSemLote, sortOldestFirst } from './vendasCalc';

const hoje = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const parseMoney = (s: string) => { const v = Number(s.replace(/\./g, '').replace(',', '.')); return Number.isFinite(v) ? v : NaN; };

/** Produtos e lotes dentro de Vendas — para empresas que vendem sem usar Logística ou Produção. */
export default function ProdutosVendas() {
  const navigate = useNavigate();
  const { companyId, products, lotsByMaterial, load } = useVendasCatalog();
  const { canAccessModule } = useModuleAccess();
  const temProducao = canAccessModule('producao');
  const [busca, setBusca] = useState('');
  const [prodOpen, setProdOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogProduct | null>(null);
  const [pf, setPf] = useState({ codigo: '', material: '', unidade: 'UN', preco: '', minimo: '' });
  const [lotFor, setLotFor] = useState<CatalogProduct | null>(null);
  const [lf, setLf] = useState({ quantidade: '', lote: '', data_producao: hoje(), validade: '', observacoes: '' });
  const [viewLots, setViewLots] = useState<CatalogProduct | null>(null);
  const [saving, setSaving] = useState(false);

  const lista = useMemo(() => products
    .filter((p) => { const t = busca.toLowerCase(); return !t || p.material.toLowerCase().includes(t) || p.codigo.toLowerCase().includes(t); })
    .sort((a, b) => Number(b.tipo === 'produto_final') - Number(a.tipo === 'produto_final') || a.material.localeCompare(b.material)), [products, busca]);

  const openNew = () => { setEditing(null); setPf({ codigo: '', material: '', unidade: 'UN', preco: '', minimo: '' }); setProdOpen(true); };
  const openEdit = (p: CatalogProduct) => {
    setEditing(p);
    setPf({ codigo: p.codigo, material: p.material, unidade: p.unidade, preco: String(p.preco).replace('.', ','), minimo: String(p.minimo || '').replace('.', ',') });
    setProdOpen(true);
  };

  const saveProduct = async () => {
    if (!companyId) return;
    const preco = pf.preco.trim() ? parseMoney(pf.preco) : 0;
    const minimo = pf.minimo.trim() ? Number(pf.minimo.replace(',', '.')) : 0;
    if (!pf.material.trim()) { toast.error('Informe o nome do produto'); return; }
    if (!editing && !pf.codigo.trim()) { toast.error('Informe o código do produto'); return; }
    if (!pf.unidade.trim()) { toast.error('Escolha a unidade'); return; }
    if (!Number.isFinite(preco) || preco < 0) { toast.error('Preço inválido'); return; }
    if (!Number.isFinite(minimo) || minimo < 0) { toast.error('Estoque mínimo inválido'); return; }
    setSaving(true);
    const { error } = await supabase.rpc('save_sale_product', {
      _company_id: companyId, _id: (editing?.id ?? null) as string, _codigo: pf.codigo, _material: pf.material,
      _unidade: pf.unidade, _preco: preco, _minimo: minimo,
    });
    setSaving(false);
    if (error) { toast.error(dbErrorMessage(error, 'Não foi possível salvar o produto')); return; }
    toast.success(editing ? 'Produto atualizado' : 'Produto cadastrado');
    setProdOpen(false);
    load();
  };

  const openLot = (p: CatalogProduct) => { setLotFor(p); setLf({ quantidade: '', lote: '', data_producao: hoje(), validade: '', observacoes: '' }); };
  const saveLot = async () => {
    if (!companyId || !lotFor) return;
    const q = parseQty(lf.quantidade, lotFor.unidade);
    if (q.value == null) { toast.error(q.error ?? 'Quantidade inválida'); return; }
    if (lf.validade && lf.data_producao && lf.validade < lf.data_producao) { toast.error('A validade não pode ser antes da data de produção'); return; }
    setSaving(true);
    const { error } = await supabase.rpc('register_product_lot', {
      _company_id: companyId, _material_id: lotFor.id, _quantidade: q.value, _lote: lf.lote,
      _data_producao: (lf.data_producao || null) as string, _validade: (lf.validade || null) as string, _observacoes: lf.observacoes,
    });
    setSaving(false);
    if (error) { toast.error(dbErrorMessage(error, 'Não foi possível registrar o lote')); return; }
    toast.success(`Lote registrado: +${formatQty(q.value, lotFor.unidade)} de ${lotFor.material}`);
    setLotFor(null);
    load();
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Package className="w-6 h-6 text-primary" /> Produtos e lotes</h1>
            <p className="text-sm text-muted-foreground">Preço, unidade e lotes dos produtos vendidos no PDV.</p>
          </div>
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Novo produto</Button>
        </div>

        {temProducao && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-3 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>A empresa usa o módulo Produção: os lotes entram pela produção (Processar) ou pela entrada de matéria-prima.</span>
              <Button size="sm" variant="outline" onClick={() => navigate('/producao/processar')}><Factory className="w-4 h-4 mr-1" /> Ir para Processar</Button>
            </CardContent>
          </Card>
        )}

        <div className="relative sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10 text-base md:text-sm" placeholder="Buscar por nome ou código" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead>Lote mais antigo</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lista.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum produto cadastrado</TableCell></TableRow>
                  ) : lista.map((p) => {
                    const lots = sortOldestFirst(lotsByMaterial[p.id] ?? []);
                    const critico = p.quantidade <= 0 || (p.minimo > 0 && p.quantidade <= p.minimo);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.material}
                          <span className="block text-xs text-muted-foreground">{p.codigo}
                            {p.tipo === 'produto_final' && <Badge variant="secondary" className="ml-2 text-[10px]">Produto final</Badge>}
                            {p.tipo === 'materia_prima' && <Badge variant="outline" className="ml-2 text-[10px]">Matéria-prima</Badge>}
                          </span>
                        </TableCell>
                        <TableCell>{unitShort(p.unidade)}</TableCell>
                        <TableCell className="text-right">{brl(p.preco)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={critico ? 'destructive' : 'default'}>{formatQty(p.quantidade, p.unidade)}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {lots.length ? (
                            <button className="text-left hover:underline" onClick={() => setViewLots(p)}>
                              {lots[0].lote || '-'} · prod. {fmtDate(lots[0].data_producao)}
                              <span className="block text-xs text-muted-foreground">{lots.length} lote(s) com saldo</span>
                            </button>
                          ) : <span className="text-muted-foreground">Sem lote</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1 flex-wrap">
                            {!temProducao && (
                              <Button size="sm" variant="outline" onClick={() => openLot(p)}><Layers className="w-3.5 h-3.5 mr-1" /> Entrada de lote</Button>
                            )}
                            <Button size="icon" variant="ghost" aria-label={`Editar ${p.material}`} onClick={() => openEdit(p)}><Edit2 className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" aria-label={`Vender ${p.material}`} disabled={p.quantidade <= 0} onClick={() => navigate(`/vendas/pdv?material=${p.id}`)}><ShoppingCart className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={prodOpen} onOpenChange={setProdOpen}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar produto' : 'Novo produto'}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5"><Label htmlFor="pv-codigo">Código *</Label><Input id="pv-codigo" className="text-base md:text-sm" value={pf.codigo} disabled={!!editing} onChange={(e) => setPf({ ...pf, codigo: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label htmlFor="pv-nome">Nome *</Label><Input id="pv-nome" className="text-base md:text-sm" value={pf.material} onChange={(e) => setPf({ ...pf, material: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label htmlFor="pv-unidade">Unidade de venda *</Label><UnitSelect id="pv-unidade" value={pf.unidade} onChange={(v) => setPf({ ...pf, unidade: v })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label htmlFor="pv-preco">Preço por {unitShort(pf.unidade)} (R$)</Label><Input id="pv-preco" className="text-base md:text-sm" inputMode="decimal" value={pf.preco} onChange={(e) => setPf({ ...pf, preco: e.target.value })} placeholder="0,00" /></div>
              <div className="grid gap-1.5"><Label htmlFor="pv-min">Estoque mínimo</Label><Input id="pv-min" className="text-base md:text-sm" inputMode="decimal" value={pf.minimo} onChange={(e) => setPf({ ...pf, minimo: e.target.value })} placeholder="0" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProdOpen(false)}>Cancelar</Button>
            <Button onClick={saveProduct} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!lotFor} onOpenChange={(o) => !o && setLotFor(null)}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Entrada de lote — {lotFor?.material}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="lt-qtd">Quantidade ({unitShort(lotFor?.unidade)}) *</Label>
              <Input id="lt-qtd" className="text-base md:text-sm" inputMode="decimal" value={lf.quantidade} onChange={(e) => setLf({ ...lf, quantidade: e.target.value })} />
            </div>
            <div className="grid gap-1.5"><Label htmlFor="lt-lote">Nº do lote</Label><Input id="lt-lote" className="text-base md:text-sm" value={lf.lote} onChange={(e) => setLf({ ...lf, lote: e.target.value })} placeholder="Automático se vazio" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label htmlFor="lt-prod">Data de produção</Label><Input id="lt-prod" type="date" className="text-base md:text-sm" value={lf.data_producao} onChange={(e) => setLf({ ...lf, data_producao: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label htmlFor="lt-val">Validade</Label><Input id="lt-val" type="date" className="text-base md:text-sm" value={lf.validade} onChange={(e) => setLf({ ...lf, validade: e.target.value })} /></div>
            </div>
            <div className="grid gap-1.5"><Label htmlFor="lt-obs">Observações</Label><Input id="lt-obs" className="text-base md:text-sm" value={lf.observacoes} onChange={(e) => setLf({ ...lf, observacoes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLotFor(null)}>Cancelar</Button>
            <Button onClick={saveLot} disabled={saving}>{saving ? 'Salvando...' : 'Registrar lote'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewLots} onOpenChange={(o) => !o && setViewLots(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Lotes — {viewLots?.material}</DialogTitle></DialogHeader>
          {viewLots && (
            <div className="space-y-2 text-sm">
              <Table>
                <TableHeader><TableRow><TableHead>Lote</TableHead><TableHead>Produção</TableHead><TableHead>Validade</TableHead><TableHead className="text-right">Saldo</TableHead></TableRow></TableHeader>
                <TableBody>
                  {sortOldestFirst(lotsByMaterial[viewLots.id] ?? []).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{l.lote || '-'}{l.tipo === 'materia_prima' && <span className="block text-xs text-muted-foreground">matéria-prima</span>}</TableCell>
                      <TableCell>{fmtDate(l.data_producao)}</TableCell>
                      <TableCell>{fmtDate(l.validade)}</TableCell>
                      <TableCell className="text-right">{formatQty(l.restante, viewLots.unidade)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {saldoSemLote(viewLots.quantidade, lotsByMaterial[viewLots.id] ?? []) > 0 && (
                <p className="text-muted-foreground">Sem lote: {formatQty(saldoSemLote(viewLots.quantidade, lotsByMaterial[viewLots.id] ?? []), viewLots.unidade)}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
