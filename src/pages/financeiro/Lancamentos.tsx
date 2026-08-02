import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Trash2, CheckCircle, TrendingUp, TrendingDown, Pencil, Tags } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const emptyForm = {
  tipo: 'despesa',
  descricao: '',
  valor: '',
  data: format(new Date(), 'yyyy-MM-dd'),
  data_vencimento: '',
  categoria_id: '',
  centro_custo_id: '',
  conta_bancaria_id: '',
  forma_pagamento: '',
  recorrente: false,
  periodicidade: 'mensal',
  observacoes: '',
};

const Lancamentos = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catForm, setCatForm] = useState<{ id: string | null; nome: string; tipo: string }>({ id: null, nome: '', tipo: 'despesa' });
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);

  const loadData = async () => {
    if (!user?.companyId) return;
    const [{ data: e }, { data: c }, { data: cc }, { data: ba }] = await Promise.all([
      supabase.from('financial_entries').select('*').eq('company_id', user.companyId).order('data', { ascending: false }).limit(500),
      supabase.from('financial_categories').select('*').eq('company_id', user.companyId).order('nome'),
      supabase.from('cost_centers').select('*').eq('company_id', user.companyId).order('nome'),
      supabase.from('bank_accounts').select('*').eq('company_id', user.companyId).order('nome'),
    ]);
    setEntries(e || []);
    setCategories(c || []);
    setCostCenters(cc || []);
    setAccounts(ba || []);
  };

  useEffect(() => { loadData(); }, [user?.companyId]);

  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c.nome])), [categories]);

  const openNew = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };

  const openEdit = (e: any) => {
    setEditingId(e.id);
    setForm({
      tipo: e.tipo,
      descricao: e.descricao,
      valor: String(e.valor),
      data: e.data,
      data_vencimento: e.data_vencimento || '',
      categoria_id: e.categoria_id || '',
      centro_custo_id: e.centro_custo_id || '',
      conta_bancaria_id: e.conta_bancaria_id || '',
      forma_pagamento: e.forma_pagamento || '',
      recorrente: !!e.recorrente,
      periodicidade: e.periodicidade || 'mensal',
      observacoes: e.observacoes || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.descricao || !form.valor) {
      toast({ title: 'Preencha descrição e valor', variant: 'destructive' });
      return;
    }
    const isPaid = !!form.forma_pagamento;
    const payload = {
      tipo: form.tipo,
      descricao: form.descricao,
      valor: Number(form.valor),
      data: form.data,
      data_vencimento: form.data_vencimento || null,
      categoria_id: form.categoria_id || null,
      centro_custo_id: form.centro_custo_id || null,
      conta_bancaria_id: form.conta_bancaria_id || null,
      forma_pagamento: form.forma_pagamento || null,
      recorrente: form.recorrente,
      periodicidade: form.recorrente ? form.periodicidade : null,
      observacoes: form.observacoes,
    };

    if (editingId) {
      const { error } = await supabase.from('financial_entries').update(payload).eq('id', editingId);
      if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      toast({ title: 'Lançamento atualizado!' });
    } else {
      const { error } = await supabase.from('financial_entries').insert({
        ...payload,
        company_id: user!.companyId!,
        status: isPaid ? 'pago' : 'pendente',
        data_pagamento: isPaid ? form.data : null,
        origem: 'manual',
        user_id: (await supabase.auth.getUser()).data.user!.id,
      });
      if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      toast({ title: 'Lançamento registrado!' });
    }
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    loadData();
  };

  const handlePay = async (id: string) => {
    const { error } = await supabase.from('financial_entries').update({ status: 'pago', data_pagamento: format(new Date(), 'yyyy-MM-dd') }).eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Marcado como pago!' }); loadData(); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('financial_entries').delete().eq('id', deleteId);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Lançamento excluído' }); setEntries(prev => prev.filter(e => e.id !== deleteId)); }
    setDeleteId(null);
  };

  const handleSaveCategory = async () => {
    if (!catForm.nome.trim()) return;
    if (catForm.id) {
      const { error } = await supabase.from('financial_categories').update({ nome: catForm.nome, tipo: catForm.tipo }).eq('id', catForm.id);
      if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      toast({ title: 'Categoria atualizada!' });
    } else {
      const { error } = await supabase.from('financial_categories').insert({ company_id: user!.companyId!, nome: catForm.nome, tipo: catForm.tipo });
      if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      toast({ title: 'Categoria criada!' });
    }
    setCatForm({ id: null, nome: '', tipo: 'despesa' });
    loadData();
  };

  const handleDeleteCategory = async () => {
    if (!deleteCatId) return;
    const { error } = await supabase.from('financial_categories').delete().eq('id', deleteCatId);
    if (error) toast({ title: 'Erro', description: 'Não foi possível excluir. Pode haver lançamentos vinculados.', variant: 'destructive' });
    else { toast({ title: 'Categoria excluída' }); setCategories(prev => prev.filter(c => c.id !== deleteCatId)); }
    setDeleteCatId(null);
  };

  const filtered = entries.filter(e => {
    const matchSearch = e.descricao.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === 'todos' || e.tipo === filterTipo;
    return matchSearch && matchTipo;
  });

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">Lançamentos Financeiros</h1>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => { setCatForm({ id: null, nome: '', tipo: 'despesa' }); setCatDialogOpen(true); }}>
              <Tags className="w-4 h-4" /> Categorias
            </Button>
            <Button className="gap-2" onClick={openNew}><Plus className="w-4 h-4" /> Novo Lançamento</Button>
          </div>
        </div>

        {/* DIALOG LANÇAMENTO */}
        <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) setEditingId(null); }}>
          <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[85dvh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle></DialogHeader>
            <div className="space-y-3 pb-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Tipo *</Label>
                  <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v, categoria_id: '' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="receita">Receita</SelectItem><SelectItem value="despesa">Despesa</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Valor (R$) *</Label><Input type="number" inputMode="decimal" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} /></div>
              </div>
              <div><Label>Descrição *</Label><Input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Data</Label><Input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} /></div>
                <div><Label>Vencimento</Label><Input type="date" value={form.data_vencimento} onChange={e => setForm(p => ({ ...p, data_vencimento: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Categoria</Label>
                  <Select value={form.categoria_id} onValueChange={v => setForm(p => ({ ...p, categoria_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{categories.filter(c => c.tipo === form.tipo).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Forma de Pagamento</Label>
                  <Select value={form.forma_pagamento} onValueChange={v => setForm(p => ({ ...p, forma_pagamento: v }))}>
                    <SelectTrigger><SelectValue placeholder="(pendente)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                      <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Centro de Custo</Label>
                  <Select value={form.centro_custo_id} onValueChange={v => setForm(p => ({ ...p, centro_custo_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="(nenhum)" /></SelectTrigger>
                    <SelectContent>{costCenters.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Conta Bancária</Label>
                  <Select value={form.conta_bancaria_id} onValueChange={v => setForm(p => ({ ...p, conta_bancaria_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="(nenhuma)" /></SelectTrigger>
                    <SelectContent>{accounts.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Switch checked={form.recorrente} onCheckedChange={v => setForm(p => ({ ...p, recorrente: v }))} />
                <Label>Conta recorrente</Label>
                {form.recorrente && (
                  <Select value={form.periodicidade} onValueChange={v => setForm(p => ({ ...p, periodicidade: v }))}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                      <SelectItem value="semestral">Semestral</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleSubmit}>{editingId ? 'Salvar alterações' : 'Salvar'}</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* DIALOG CATEGORIAS */}
        <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
          <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[85dvh] overflow-y-auto">
            <DialogHeader><DialogTitle>Categorias Financeiras</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-sm font-medium">{catForm.id ? 'Editar categoria' : 'Nova categoria'}</p>
                <div><Label>Nome</Label><Input value={catForm.nome} onChange={e => setCatForm(p => ({ ...p, nome: e.target.value }))} /></div>
                <div><Label>Tipo</Label>
                  <Select value={catForm.tipo} onValueChange={v => setCatForm(p => ({ ...p, tipo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="receita">Receita</SelectItem><SelectItem value="despesa">Despesa</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={handleSaveCategory}>{catForm.id ? 'Salvar' : 'Adicionar'}</Button>
                  {catForm.id && <Button variant="outline" onClick={() => setCatForm({ id: null, nome: '', tipo: 'despesa' })}>Cancelar</Button>}
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {categories.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma categoria cadastrada</p>}
                {categories.map(c => (
                  <div key={c.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant={c.tipo === 'receita' ? 'default' : 'secondary'}>{c.tipo === 'receita' ? 'Receita' : 'Despesa'}</Badge>
                      <span className="truncate text-sm">{c.nome}</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => setCatForm({ id: c.id, nome: c.nome, tipo: c.tipo })}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteCatId(c.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="receita">Receitas</SelectItem>
                  <SelectItem value="despesa">Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {/* Mobile: cards */}
            <div className="space-y-2 md:hidden">
              {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum lançamento</p>}
              {filtered.map(e => (
                <div key={e.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{e.descricao}</p>
                      <p className="text-xs text-muted-foreground">{format(parseISO(e.data), 'dd/MM/yyyy')} · {catMap.get(e.categoria_id) || 'Sem categoria'}</p>
                    </div>
                    <p className={`font-bold whitespace-nowrap ${e.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>{fmt(Number(e.valor))}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    {e.status === 'pago' ? <Badge className="bg-green-600 text-white">Pago</Badge>
                      : e.status === 'cancelado' ? <Badge variant="secondary">Cancelado</Badge>
                      : <Badge variant="outline">Pendente</Badge>}
                    <div className="flex gap-1">
                      {e.status !== 'pago' && e.status !== 'cancelado' && (
                        <Button size="icon" variant="outline" className="text-green-600" onClick={() => handlePay(e.id)}><CheckCircle className="w-4 h-4" /></Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => openEdit(e)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(e.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: tabela */}
            <div className="overflow-x-auto hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum lançamento</TableCell></TableRow>
                  ) : filtered.map(e => (
                    <TableRow key={e.id}>
                      <TableCell>
                        {e.tipo === 'receita'
                          ? <Badge className="bg-green-600 text-white gap-1"><TrendingUp className="w-3 h-3" />Receita</Badge>
                          : <Badge className="bg-red-600 text-white gap-1"><TrendingDown className="w-3 h-3" />Despesa</Badge>
                        }
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{e.descricao}</TableCell>
                      <TableCell>{catMap.get(e.categoria_id) || '—'}</TableCell>
                      <TableCell className={e.tipo === 'receita' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{fmt(Number(e.valor))}</TableCell>
                      <TableCell>{format(parseISO(e.data), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        {e.status === 'pago' ? <Badge className="bg-green-600 text-white">Pago</Badge>
                          : e.status === 'cancelado' ? <Badge variant="secondary">Cancelado</Badge>
                          : <Badge variant="outline">Pendente</Badge>}
                      </TableCell>
                      <TableCell><span className="text-xs text-muted-foreground capitalize">{e.origem || 'manual'}</span></TableCell>
                      <TableCell className="text-right space-x-1">
                        {e.status !== 'pago' && e.status !== 'cancelado' && (
                          <Button size="sm" variant="outline" className="gap-1 text-green-600" onClick={() => handlePay(e.id)}>
                            <CheckCircle className="w-3 h-3" /> Pagar
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => openEdit(e)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(e.id)}><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir? Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteCatId} onOpenChange={() => setDeleteCatId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>Lançamentos vinculados ficarão sem categoria.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Lancamentos;
