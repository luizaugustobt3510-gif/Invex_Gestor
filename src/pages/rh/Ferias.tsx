import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Plus, Pencil, Trash2, Search } from 'lucide-react';

const Ferias = () => {
  const { toast } = useToast();
  const [vacations, setVacations] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    employee_id: '',
    periodo_aquisitivo_inicio: '',
    periodo_aquisitivo_fim: '',
    data_inicio: '',
    data_fim: '',
    dias: '30',
    status: 'agendada',
    obs: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [vacRes, empRes] = await Promise.all([
      supabase.from('employee_vacations').select('*, employees(nome)').order('data_inicio', { ascending: false }),
      supabase.from('employees').select('id, nome').eq('status', 'ativo').order('nome'),
    ]);

    // Auto-update statuses
    const today = new Date().toISOString().split('T')[0];
    const vacs = vacRes.data || [];
    for (const vac of vacs) {
      let newStatus: string | null = null;
      if (vac.status === 'agendada' && vac.data_inicio <= today && vac.data_fim >= today) {
        newStatus = 'em_andamento';
      } else if ((vac.status === 'agendada' || vac.status === 'em_andamento') && vac.data_fim < today) {
        newStatus = 'concluida';
      }
      if (newStatus) {
        await supabase.from('employee_vacations').update({ status: newStatus }).eq('id', vac.id);
        vac.status = newStatus;
      }
    }

    setVacations(vacs);
    setEmployees(empRes.data || []);
    setLoading(false);
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ employee_id: '', periodo_aquisitivo_inicio: '', periodo_aquisitivo_fim: '', data_inicio: '', data_fim: '', dias: '30', status: 'agendada', obs: '' });
    setDialogOpen(true);
  };

  const openEdit = (v: any) => {
    setEditingId(v.id);
    setForm({
      employee_id: v.employee_id,
      periodo_aquisitivo_inicio: v.periodo_aquisitivo_inicio,
      periodo_aquisitivo_fim: v.periodo_aquisitivo_fim,
      data_inicio: v.data_inicio,
      data_fim: v.data_fim,
      dias: String(v.dias),
      status: v.status,
      obs: v.obs || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.employee_id || !form.data_inicio || !form.data_fim || !form.periodo_aquisitivo_inicio || !form.periodo_aquisitivo_fim) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos.', variant: 'destructive' });
      return;
    }

    // Auto-calculate days
    const start = new Date(form.data_inicio);
    const end = new Date(form.data_fim);
    const dias = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

    // Auto-determine status
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let status = form.status;
    if (status !== 'cancelada') {
      if (start <= today && end >= today) status = 'em_andamento';
      else if (end < today) status = 'concluida';
      else status = 'agendada';
    }

    setSaving(true);

    if (editingId) {
      const { error } = await supabase.from('employee_vacations').update({
        periodo_aquisitivo_inicio: form.periodo_aquisitivo_inicio,
        periodo_aquisitivo_fim: form.periodo_aquisitivo_fim,
        data_inicio: form.data_inicio,
        data_fim: form.data_fim,
        dias: dias > 0 ? dias : parseInt(form.dias),
        status,
        obs: form.obs,
      }).eq('id', editingId);

      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Férias atualizadas!' });
      }
    } else {
      const { data: emp } = await supabase.from('employees').select('company_id').eq('id', form.employee_id).single();
      const { error } = await supabase.from('employee_vacations').insert({
        employee_id: form.employee_id,
        company_id: emp?.company_id,
        periodo_aquisitivo_inicio: form.periodo_aquisitivo_inicio,
        periodo_aquisitivo_fim: form.periodo_aquisitivo_fim,
        data_inicio: form.data_inicio,
        data_fim: form.data_fim,
        dias: dias > 0 ? dias : parseInt(form.dias),
        status,
        obs: form.obs,
      });

      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Férias registradas!' });
      }
    }

    setDialogOpen(false);
    loadData();
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('employee_vacations').delete().eq('id', deleteId);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Férias excluídas!' });
      loadData();
    }
    setDeleteId(null);
  };

  const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');

  const statusColors: Record<string, string> = {
    agendada: 'secondary',
    em_andamento: 'default',
    concluida: 'outline',
    cancelada: 'destructive',
  };

  const statusLabels: Record<string, string> = {
    agendada: 'Agendada',
    em_andamento: 'Em Andamento',
    concluida: 'Concluída',
    cancelada: 'Cancelada',
  };

  const filtered = vacations.filter(v =>
    (v.employees?.nome || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Calendar className="w-6 h-6" /> Controle de Férias</h1>
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" /> Registrar Férias
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar colaborador..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Período Aquisitivo</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead className="text-center">Dias</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum registro de férias.</TableCell></TableRow>
                  ) : filtered.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.employees?.nome}</TableCell>
                      <TableCell className="text-sm">{formatDate(v.periodo_aquisitivo_inicio)} a {formatDate(v.periodo_aquisitivo_fim)}</TableCell>
                      <TableCell>{formatDate(v.data_inicio)}</TableCell>
                      <TableCell>{formatDate(v.data_fim)}</TableCell>
                      <TableCell className="text-center font-bold">{v.dias}</TableCell>
                      <TableCell>
                        <Badge variant={statusColors[v.status] as any || 'secondary'}>
                          {statusLabels[v.status] || v.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar" onClick={() => openEdit(v)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Excluir" onClick={() => setDeleteId(v.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editingId ? 'Editar Férias' : 'Registrar Férias'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Colaborador *</Label>
                <Select value={form.employee_id} onValueChange={v => setForm(p => ({ ...p, employee_id: v }))} disabled={!!editingId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Período Aquisitivo Início *</Label>
                  <Input type="date" value={form.periodo_aquisitivo_inicio} onChange={e => setForm(p => ({ ...p, periodo_aquisitivo_inicio: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Período Aquisitivo Fim *</Label>
                  <Input type="date" value={form.periodo_aquisitivo_fim} onChange={e => setForm(p => ({ ...p, periodo_aquisitivo_fim: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Início *</Label>
                  <Input type="date" value={form.data_inicio} onChange={e => {
                    const start = e.target.value;
                    setForm(p => {
                      const dias = parseInt(p.dias) || 30;
                      const endDate = new Date(start);
                      endDate.setDate(endDate.getDate() + dias - 1);
                      return { ...p, data_inicio: start, data_fim: endDate.toISOString().split('T')[0] };
                    });
                  }} />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim *</Label>
                  <Input type="date" value={form.data_fim} onChange={e => setForm(p => ({ ...p, data_fim: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dias</Label>
                  <Input type="number" min="1" value={form.dias} onChange={e => setForm(p => ({ ...p, dias: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agendada">Agendada</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={form.obs} onChange={e => setForm(p => ({ ...p, obs: e.target.value }))} placeholder="Observações opcionais..." />
              </div>
              <Button onClick={handleSave} className="w-full" disabled={saving}>
                {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Registrar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Férias</AlertDialogTitle>
              <AlertDialogDescription>Tem certeza que deseja excluir este registro de férias?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default Ferias;
