import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { hardDeleteById } from '@/lib/hardDelete';
import { Users, Plus, Pencil, Search, Trash2 } from 'lucide-react';

interface Employee {
  id: string;
  company_id: string;
  nome: string;
  cpf: string;
  cargo: string;
  data_admissao: string;
  salario: number;
  status: string;
}

const emptyForm = { nome: '', cpf: '', cargo: '', departamento: '', data_admissao: '', data_nascimento: '', salario: '', status: 'ativo' };

const Colaboradores = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadEmployees(); }, []);

  const loadEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('employees').select('*').order('nome');
    if (!error) setEmployees(data || []);
    setLoading(false);
  };

  const formatCPF = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const handleOpenNew = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };

  const handleEdit = (emp: any) => {
    setEditingId(emp.id);
    setForm({
      nome: emp.nome, cpf: emp.cpf, cargo: emp.cargo, departamento: emp.departamento || '',
      data_admissao: emp.data_admissao, data_nascimento: emp.data_nascimento || '',
      salario: String(emp.salario), status: emp.status,
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    const result = await hardDeleteById('employees', deleteId);

    if (!result.success) {
      toast({ title: 'Erro ao excluir', description: result.message, variant: 'destructive' });
      setDeleting(false);
      return;
    }

    setEmployees(prev => prev.filter(employee => employee.id !== deleteId));
    toast({ title: 'Colaborador excluído', description: 'Registro removido permanentemente do banco de dados.' });
    setDeleteId(null);
    setDeleteName('');
    setDeleting(false);
    await loadEmployees();
  };

  const handleSave = async () => {
    if (!form.nome.trim() || !form.cpf.trim() || !form.cargo.trim() || !form.data_admissao) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }
    const salario = parseFloat(form.salario) || 0;
    if (salario < 0) {
      toast({ title: 'Valor inválido', description: 'Salário não pode ser negativo.', variant: 'destructive' });
      return;
    }
    setSaving(true);

    if (editingId) {
      const { error } = await supabase.from('employees')
        .update({ nome: form.nome.trim(), cpf: form.cpf.trim(), cargo: form.cargo.trim(), departamento: form.departamento.trim(), data_admissao: form.data_admissao, data_nascimento: form.data_nascimento || null, salario, status: form.status })
        .eq('id', editingId);
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso', description: 'Colaborador atualizado.' });
      }
    } else {
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', (await supabase.auth.getUser()).data.user?.id || '').single();
      const companyId = profile?.company_id;
      if (!companyId) {
        toast({ title: 'Erro', description: 'Empresa não encontrada.', variant: 'destructive' });
        setSaving(false);
        return;
      }
      const { error } = await supabase.from('employees')
        .insert({ nome: form.nome.trim(), cpf: form.cpf.trim(), cargo: form.cargo.trim(), departamento: form.departamento.trim(), data_admissao: form.data_admissao, data_nascimento: form.data_nascimento || null, salario, status: form.status, company_id: companyId });
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Colaborador cadastrado com sucesso', description: `${form.nome.trim()} foi adicionado à lista de colaboradores.` });
      }
    }
    setSaving(false);
    setDialogOpen(false);
    loadEmployees();
  };

  const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const filtered = employees.filter(e =>
    e.nome.toLowerCase().includes(search.toLowerCase()) ||
    e.cpf.includes(search) ||
    e.cargo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6" /> Colaboradores</h1>
          <Button onClick={handleOpenNew} className="gap-2"><Plus className="w-4 h-4" /> Novo Colaborador</Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, CPF ou cargo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Admissão</TableHead>
                    <TableHead className="text-right">Salário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20 text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum colaborador encontrado.</TableCell></TableRow>
                  ) : filtered.map(emp => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.nome}</TableCell>
                      <TableCell className="font-mono text-sm">{emp.cpf}</TableCell>
                      <TableCell>{emp.cargo}</TableCell>
                      <TableCell>{formatDate(emp.data_admissao)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(emp.salario)}</TableCell>
                      <TableCell>
                        <Badge variant={emp.status === 'ativo' ? 'default' : 'secondary'}>
                          {emp.status === 'ativo' ? 'Ativo' : emp.status === 'inativo' ? 'Inativo' : emp.status === 'afastado' ? 'Afastado' : 'Em Férias'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(emp)}><Pencil className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { setDeleteId(emp.id); setDeleteName(emp.nome); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Form Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editingId ? 'Editar Colaborador' : 'Novo Colaborador'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Nome completo" />
              </div>
              <div className="space-y-2">
                <Label>CPF *</Label>
                <Input value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: formatCPF(e.target.value) }))} placeholder="000.000.000-00" maxLength={14} />
              </div>
              <div className="space-y-2">
                <Label>Cargo *</Label>
                <Input value={form.cargo} onChange={e => setForm(p => ({ ...p, cargo: e.target.value }))} placeholder="Cargo" />
              </div>
              <div className="space-y-2">
                <Label>Departamento / Setor</Label>
                <Input value={form.departamento} onChange={e => setForm(p => ({ ...p, departamento: e.target.value }))} placeholder="Ex: Logística, Administrativo..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Admissão *</Label>
                  <Input type="date" value={form.data_admissao} onChange={e => setForm(p => ({ ...p, data_admissao: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Data Nascimento</Label>
                  <Input type="date" value={form.data_nascimento} onChange={e => setForm(p => ({ ...p, data_nascimento: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Salário (R$)</Label>
                <Input type="number" min="0" step="0.01" value={form.salario} onChange={e => setForm(p => ({ ...p, salario: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="afastado">Afastado</SelectItem>
                    <SelectItem value="ferias">Em Férias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full" disabled={saving}>
                {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Cadastrar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir colaborador</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir <strong>{deleteName}</strong>? Esta ação não pode ser desfeita e todos os dados relacionados serão removidos permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleting ? 'Excluindo...' : 'Excluir permanentemente'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default Colaboradores;
