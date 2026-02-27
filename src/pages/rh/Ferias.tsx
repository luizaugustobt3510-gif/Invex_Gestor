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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Plus } from 'lucide-react';

const Ferias = () => {
  const { toast } = useToast();
  const [vacations, setVacations] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
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
    setVacations(vacRes.data || []);
    setEmployees(empRes.data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.employee_id || !form.data_inicio || !form.data_fim || !form.periodo_aquisitivo_inicio || !form.periodo_aquisitivo_fim) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos.', variant: 'destructive' });
      return;
    }
    const dias = parseInt(form.dias) || 30;
    if (dias <= 0) {
      toast({ title: 'Valor inválido', description: 'Dias deve ser positivo.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    // Get company_id from selected employee
    const { data: emp } = await supabase.from('employees').select('company_id').eq('id', form.employee_id).single();
    
    const { error } = await supabase.from('employee_vacations').insert({
      employee_id: form.employee_id,
      company_id: emp?.company_id,
      periodo_aquisitivo_inicio: form.periodo_aquisitivo_inicio,
      periodo_aquisitivo_fim: form.periodo_aquisitivo_fim,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim,
      dias,
      status: form.status,
      obs: form.obs,
    });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Férias registradas.' });
      setDialogOpen(false);
      loadData();
    }
    setSaving(false);
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

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Calendar className="w-6 h-6" /> Controle de Férias</h1>
          <Button onClick={() => { setForm({ employee_id: '', periodo_aquisitivo_inicio: '', periodo_aquisitivo_fim: '', data_inicio: '', data_fim: '', dias: '30', status: 'agendada', obs: '' }); setDialogOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Registrar Férias
          </Button>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : vacations.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum registro de férias.</TableCell></TableRow>
                  ) : vacations.map(v => (
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Registrar Férias</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Colaborador *</Label>
                <Select value={form.employee_id} onValueChange={v => setForm(p => ({ ...p, employee_id: v }))}>
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
                  <Input type="date" value={form.data_inicio} onChange={e => setForm(p => ({ ...p, data_inicio: e.target.value }))} />
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
                {saving ? 'Salvando...' : 'Registrar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Ferias;
