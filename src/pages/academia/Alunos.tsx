import { useState, useEffect } from 'react';
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
import { UserPlus, Search, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const EMPTY_FORM = {
  nome: '', cpf: '', telefone: '', email: '', data_nascimento: '',
  data_matricula: format(new Date(), 'yyyy-MM-dd'),
  plano: 'mensal', valor_mensalidade: '', dia_vencimento: '10', observacoes: '',
};

const Alunos = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadStudents = async () => {
    if (!user?.companyId) return;
    const { data } = await supabase.from('academy_students').select('*').eq('company_id', user.companyId).order('nome');
    setStudents(data || []);
  };

  useEffect(() => { loadStudents(); }, [user?.companyId]);

  const handleSave = async () => {
    if (!form.nome.trim()) { toast({ title: 'Informe o nome', variant: 'destructive' }); return; }
    if (!form.valor_mensalidade) { toast({ title: 'Informe o valor da mensalidade', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const payload = {
        company_id: user!.companyId!,
        nome: form.nome.trim(),
        cpf: form.cpf.trim() || null,
        telefone: form.telefone.trim() || null,
        email: form.email.trim() || null,
        data_nascimento: form.data_nascimento || null,
        data_matricula: form.data_matricula,
        plano: form.plano,
        valor_mensalidade: Number(form.valor_mensalidade),
        dia_vencimento: Number(form.dia_vencimento) || 10,
        observacoes: form.observacoes,
      };

      if (editId) {
        const { error } = await supabase.from('academy_students').update(payload).eq('id', editId);
        if (error) throw error;
        toast({ title: 'Aluno atualizado!' });
      } else {
        const { error } = await supabase.from('academy_students').insert(payload);
        if (error) throw error;
        toast({ title: 'Aluno cadastrado!' });
      }
      setDialogOpen(false);
      setEditId(null);
      setForm(EMPTY_FORM);
      loadStudents();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (s: any) => {
    setEditId(s.id);
    setForm({
      nome: s.nome, cpf: s.cpf || '', telefone: s.telefone || '', email: s.email || '',
      data_nascimento: s.data_nascimento || '', data_matricula: s.data_matricula,
      plano: s.plano, valor_mensalidade: String(s.valor_mensalidade),
      dia_vencimento: String(s.dia_vencimento), observacoes: s.observacoes || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('academy_students').delete().eq('id', deleteId);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Aluno excluído' });
      setStudents(prev => prev.filter(s => s.id !== deleteId));
    }
    setDeleteId(null);
  };

  const handleToggleStatus = async (s: any) => {
    const newStatus = s.status === 'ativo' ? 'inativo' : 'ativo';
    await supabase.from('academy_students').update({ status: newStatus }).eq('id', s.id);
    loadStudents();
    toast({ title: newStatus === 'ativo' ? 'Aluno reativado' : 'Aluno inativado' });
  };

  const filtered = students.filter(s => {
    const matchSearch = s.nome.toLowerCase().includes(search.toLowerCase()) || (s.cpf || '').includes(search);
    const matchStatus = filterStatus === 'todos' || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">Alunos</h1>
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditId(null); setForm(EMPTY_FORM); } }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><UserPlus className="w-4 h-4" /> Novo Aluno</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editId ? 'Editar Aluno' : 'Cadastrar Aluno'}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>CPF</Label><Input value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))} /></div>
                  <div><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} /></div>
                </div>
                <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Data Nascimento</Label><Input type="date" value={form.data_nascimento} onChange={e => setForm(p => ({ ...p, data_nascimento: e.target.value }))} /></div>
                  <div><Label>Data Matrícula</Label><Input type="date" value={form.data_matricula} onChange={e => setForm(p => ({ ...p, data_matricula: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Plano</Label>
                    <Select value={form.plano} onValueChange={v => setForm(p => ({ ...p, plano: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="trimestral">Trimestral</SelectItem>
                        <SelectItem value="semestral">Semestral</SelectItem>
                        <SelectItem value="anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Valor (R$) *</Label><Input type="number" value={form.valor_mensalidade} onChange={e => setForm(p => ({ ...p, valor_mensalidade: e.target.value }))} /></div>
                  <div><Label>Dia Vencimento</Label><Input type="number" min={1} max={31} value={form.dia_vencimento} onChange={e => setForm(p => ({ ...p, dia_vencimento: e.target.value }))} /></div>
                </div>
                <div><Label>Observações</Label><Input value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} /></div>
                <Button className="w-full" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : editId ? 'Atualizar' : 'Cadastrar'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar por nome ou CPF..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Mensalidade</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum aluno encontrado</TableCell></TableRow>
                  ) : filtered.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.nome}</TableCell>
                      <TableCell className="capitalize">{s.plano}</TableCell>
                      <TableCell>R$ {Number(s.valor_mensalidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>Dia {s.dia_vencimento}</TableCell>
                      <TableCell>
                        <Badge
                          variant={s.status === 'ativo' ? 'default' : 'secondary'}
                          className="cursor-pointer"
                          onClick={() => handleToggleStatus(s)}
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(s)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(s.id)}><Trash2 className="w-4 h-4" /></Button>
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
            <AlertDialogTitle>Excluir aluno?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. O aluno e todos os pagamentos vinculados serão removidos permanentemente.</AlertDialogDescription>
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

export default Alunos;
