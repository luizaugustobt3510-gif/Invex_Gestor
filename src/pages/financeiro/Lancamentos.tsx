import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Trash2, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const Lancamentos = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [newCat, setNewCat] = useState({ nome: '', tipo: 'despesa' });

  const [form, setForm] = useState({
    tipo: 'despesa',
    descricao: '',
    valor: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    data_vencimento: '',
    categoria_id: '',
    forma_pagamento: '',
    recorrente: false,
    periodicidade: 'mensal',
    observacoes: '',
  });

  const loadData = async () => {
    if (!user?.companyId) return;
    const [{ data: e }, { data: c }] = await Promise.all([
      supabase.from('financial_entries').select('*').eq('company_id', user.companyId).order('data', { ascending: false }).limit(500),
      supabase.from('financial_categories').select('*').eq('company_id', user.companyId).order('nome'),
    ]);
    setEntries(e || []);
    setCategories(c || []);
  };

  useEffect(() => { loadData(); }, [user?.companyId]);

  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c.nome])), [categories]);

  const handleSubmit = async () => {
    if (!form.descricao || !form.valor) {
      toast({ title: 'Preencha descrição e valor', variant: 'destructive' });
      return;
    }
    const isPaid = !!form.forma_pagamento;
    const { error } = await supabase.from('financial_entries').insert({
      company_id: user!.companyId!,
      tipo: form.tipo,
      descricao: form.descricao,
      valor: Number(form.valor),
      data: form.data,
      data_vencimento: form.data_vencimento || null,
      categoria_id: form.categoria_id || null,
      forma_pagamento: form.forma_pagamento || null,
      status: isPaid ? 'pago' : 'pendente',
      data_pagamento: isPaid ? form.data : null,
      recorrente: form.recorrente,
      periodicidade: form.recorrente ? form.periodicidade : null,
      origem: 'manual',
      observacoes: form.observacoes,
      user_id: (await supabase.auth.getUser()).data.user!.id,
    });
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Lançamento registrado!' });
      setDialogOpen(false);
      setForm({ tipo: 'despesa', descricao: '', valor: '', data: format(new Date(), 'yyyy-MM-dd'), data_vencimento: '', categoria_id: '', forma_pagamento: '', recorrente: false, periodicidade: 'mensal', observacoes: '' });
      loadData();
    }
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

  const handleAddCategory = async () => {
    if (!newCat.nome) return;
    const { error } = await supabase.from('financial_categories').insert({ company_id: user!.companyId!, nome: newCat.nome, tipo: newCat.tipo });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Categoria criada!' }); setNewCat({ nome: '', tipo: 'despesa' }); setCatDialogOpen(false); loadData(); }
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
          <div className="flex gap-2">
            <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
              <DialogTrigger asChild><Button variant="outline" size="sm">+ Categoria</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Categoria</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Nome</Label><Input value={newCat.nome} onChange={e => setNewCat(p => ({ ...p, nome: e.target.value }))} /></div>
                  <div><Label>Tipo</Label>
                    <Select value={newCat.tipo} onValueChange={v => setNewCat(p => ({ ...p, tipo: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="receita">Receita</SelectItem><SelectItem value="despesa">Despesa</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={handleAddCategory}>Salvar</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" /> Novo Lançamento</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Novo Lançamento</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Tipo *</Label>
                      <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="receita">Receita</SelectItem><SelectItem value="despesa">Despesa</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Valor (R$) *</Label><Input type="number" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} /></div>
                  </div>
                  <div><Label>Descrição *</Label><Input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Data</Label><Input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} /></div>
                    <div><Label>Vencimento</Label><Input type="date" value={form.data_vencimento} onChange={e => setForm(p => ({ ...p, data_vencimento: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
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
                  <div className="flex items-center gap-3">
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
                  <Button className="w-full" onClick={handleSubmit}>Salvar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="receita">Receitas</SelectItem>
                  <SelectItem value="despesa">Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
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
    </MainLayout>
  );
};

export default Lancamentos;
