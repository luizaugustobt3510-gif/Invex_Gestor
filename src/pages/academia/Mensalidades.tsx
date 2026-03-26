import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DollarSign, Search, Plus, CheckCircle, Trash2, RefreshCw } from 'lucide-react';
import { format, parseISO, isBefore, addMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Mensalidades = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ student_id: '', valor: '', data_vencimento: '', referencia: '', forma_pagamento: '', observacoes: '' });

  const loadData = async () => {
    if (!user?.companyId) return;
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from('academy_payments').select('*').eq('company_id', user.companyId).order('data_vencimento', { ascending: false }),
      supabase.from('academy_students').select('id, nome, valor_mensalidade, dia_vencimento, status').eq('company_id', user.companyId).eq('status', 'ativo').order('nome'),
    ]);
    setPayments(p || []);
    setStudents(s || []);
  };

  useEffect(() => { loadData(); }, [user?.companyId]);

  // Enrich payments with student name
  const enriched = useMemo(() => {
    const map = new Map(students.map(s => [s.id, s.nome]));
    return payments.map(p => ({ ...p, student_nome: map.get(p.student_id) || 'Aluno removido' }));
  }, [payments, students]);

  const handleGenerateMonth = async () => {
    if (!user?.companyId) return;
    setGenerating(true);
    try {
      const now = new Date();
      const ref = format(now, 'MM/yyyy');
      const activeStudents = students.filter(s => s.status === 'ativo');

      // Check which students already have a payment for this month
      const existingRefs = new Set(
        payments.filter(p => p.referencia === ref).map(p => p.student_id)
      );

      const newPayments = activeStudents
        .filter(s => !existingRefs.has(s.id))
        .map(s => ({
          company_id: user.companyId!,
          student_id: s.id,
          valor: s.valor_mensalidade,
          data_vencimento: format(new Date(now.getFullYear(), now.getMonth(), s.dia_vencimento), 'yyyy-MM-dd'),
          referencia: ref,
          status: 'pendente',
        }));

      if (newPayments.length === 0) {
        toast({ title: 'Mensalidades já geradas', description: 'Todos os alunos ativos já possuem mensalidade para este mês.' });
        setGenerating(false);
        return;
      }

      const { error } = await supabase.from('academy_payments').insert(newPayments);
      if (error) throw error;
      toast({ title: 'Mensalidades geradas!', description: `${newPayments.length} mensalidades criadas para ${ref}.` });
      loadData();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handlePay = async (paymentId: string) => {
    const { error } = await supabase.from('academy_payments')
      .update({ status: 'pago', data_pagamento: format(new Date(), 'yyyy-MM-dd') })
      .eq('id', paymentId);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Pagamento registrado!' });
      loadData();
    }
  };

  const handlePayWithMethod = async () => {
    if (!form.student_id || !form.valor || !form.data_vencimento) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('academy_payments').insert({
      company_id: user!.companyId!,
      student_id: form.student_id,
      valor: Number(form.valor),
      data_vencimento: form.data_vencimento,
      referencia: form.referencia || format(parseISO(form.data_vencimento), 'MM/yyyy'),
      forma_pagamento: form.forma_pagamento || null,
      status: form.forma_pagamento ? 'pago' : 'pendente',
      data_pagamento: form.forma_pagamento ? format(new Date(), 'yyyy-MM-dd') : null,
      observacoes: form.observacoes,
    });
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Mensalidade registrada!' });
      setDialogOpen(false);
      setForm({ student_id: '', valor: '', data_vencimento: '', referencia: '', forma_pagamento: '', observacoes: '' });
      loadData();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('academy_payments').delete().eq('id', deleteId);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Mensalidade excluída' });
      setPayments(prev => prev.filter(p => p.id !== deleteId));
    }
    setDeleteId(null);
  };

  const filtered = enriched.filter(p => {
    const matchSearch = p.student_nome.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'todos' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (p: any) => {
    if (p.status === 'pago') return <Badge className="bg-green-600 text-white">Pago</Badge>;
    if (isBefore(parseISO(p.data_vencimento), new Date())) return <Badge variant="destructive">Atrasado</Badge>;
    return <Badge variant="secondary">Pendente</Badge>;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">Mensalidades</h1>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleGenerateMonth} disabled={generating}>
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} /> Gerar Mês Atual
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Lançar Manual</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Lançar Mensalidade</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Aluno *</Label>
                    <Select value={form.student_id} onValueChange={v => {
                      const st = students.find(s => s.id === v);
                      setForm(p => ({ ...p, student_id: v, valor: st ? String(st.valor_mensalidade) : p.valor }));
                    }}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Valor (R$) *</Label><Input type="number" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} /></div>
                    <div><Label>Vencimento *</Label><Input type="date" value={form.data_vencimento} onChange={e => setForm(p => ({ ...p, data_vencimento: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Referência</Label><Input placeholder="MM/AAAA" value={form.referencia} onChange={e => setForm(p => ({ ...p, referencia: e.target.value }))} /></div>
                    <div>
                      <Label>Forma de Pagamento</Label>
                      <Select value={form.forma_pagamento} onValueChange={v => setForm(p => ({ ...p, forma_pagamento: v }))}>
                        <SelectTrigger><SelectValue placeholder="(pendente)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                          <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                          <SelectItem value="boleto">Boleto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Observações</Label><Input value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} /></div>
                  <Button className="w-full" onClick={handlePayWithMethod}>Salvar</Button>
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
                <Input className="pl-9" placeholder="Buscar por aluno..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pago">Pagos</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma mensalidade encontrada</TableCell></TableRow>
                  ) : filtered.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.student_nome}</TableCell>
                      <TableCell>{p.referencia}</TableCell>
                      <TableCell>R$ {Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>{format(parseISO(p.data_vencimento), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{getStatusBadge(p)}</TableCell>
                      <TableCell>{p.data_pagamento ? format(parseISO(p.data_pagamento), 'dd/MM/yyyy') : '—'}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {p.status !== 'pago' && (
                          <Button size="sm" variant="outline" className="gap-1 text-green-600" onClick={() => handlePay(p.id)}>
                            <CheckCircle className="w-3 h-3" /> Pagar
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(p.id)}><Trash2 className="w-4 h-4" /></Button>
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
            <AlertDialogTitle>Excluir mensalidade?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
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

export default Mensalidades;
