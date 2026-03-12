import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Target, Plus, Search } from 'lucide-react';

const tipoLabels: Record<string, string> = { meta: 'Meta', plano: 'Plano de Desenvolvimento', curso: 'Curso Obrigatório' };
const statusLabels: Record<string, string> = { em_andamento: 'Em Andamento', concluido: 'Concluído', cancelado: 'Cancelado' };
const statusBadge: Record<string, string> = {
  em_andamento: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  concluido: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  cancelado: 'bg-muted text-muted-foreground border-border',
};

const Desenvolvimento = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ employee_id: '', titulo: '', descricao: '', tipo: 'meta', status: 'em_andamento', prazo: '', evaluation_id: '', training_id: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [planRes, empRes, evalRes, trainRes] = await Promise.all([
      supabase.from('development_plans').select('*, employees(nome), performance_evaluations(nota, created_at), trainings(nome)').order('created_at', { ascending: false }),
      supabase.from('employees').select('id, nome').eq('status', 'ativo').order('nome'),
      supabase.from('performance_evaluations').select('id, employee_id, nota, created_at, employees(nome)').order('created_at', { ascending: false }).limit(50),
      supabase.from('trainings').select('id, nome').order('nome'),
    ]);
    setPlans(planRes.data || []);
    setEmployees(empRes.data || []);
    setEvaluations(evalRes.data || []);
    setTrainings(trainRes.data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.employee_id || !form.titulo.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha colaborador e título.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { data: emp } = await supabase.from('employees').select('company_id').eq('id', form.employee_id).single();
    if (!emp?.company_id) { setSaving(false); return; }

    const { error } = await supabase.from('development_plans').insert({
      company_id: emp.company_id,
      employee_id: form.employee_id,
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim(),
      tipo: form.tipo,
      status: form.status,
      prazo: form.prazo || null,
      evaluation_id: form.evaluation_id || null,
      training_id: form.training_id || null,
    });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Plano criado.' });
      setDialogOpen(false);
      setForm({ employee_id: '', titulo: '', descricao: '', tipo: 'meta', status: 'em_andamento', prazo: '', evaluation_id: '', training_id: '' });
      loadData();
    }
    setSaving(false);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await supabase.from('development_plans').update({ status: newStatus }).eq('id', id);
    loadData();
  };

  const filtered = plans.filter(p =>
    (p.employees?.nome || '').toLowerCase().includes(search.toLowerCase()) ||
    p.titulo.toLowerCase().includes(search.toLowerCase())
  );

  const notaEmoji: Record<number, string> = { 1: '😞', 2: '😐', 3: '🙂', 4: '😃' };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Target className="w-6 h-6" /> Metas e Desenvolvimento</h1>
          <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Novo Plano</Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Vínculo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum plano registrado.</TableCell></TableRow>
                  ) : filtered.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.employees?.nome}</TableCell>
                      <TableCell>{p.titulo}</TableCell>
                      <TableCell><Badge variant="outline">{tipoLabels[p.tipo] || p.tipo}</Badge></TableCell>
                      <TableCell>{p.prazo ? new Date(p.prazo + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</TableCell>
                      <TableCell className="text-xs">
                        {p.performance_evaluations && <span>Avaliação {notaEmoji[p.performance_evaluations.nota]}</span>}
                        {p.trainings && <span>Treinamento: {p.trainings.nome}</span>}
                        {!p.performance_evaluations && !p.trainings && '—'}
                      </TableCell>
                      <TableCell>
                        <Select value={p.status} onValueChange={v => handleStatusChange(p.id, v)}>
                          <SelectTrigger className="h-7 text-xs w-32">
                            <Badge variant="outline" className={statusBadge[p.status] || ''}>{statusLabels[p.status]}</Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="em_andamento">Em Andamento</SelectItem>
                            <SelectItem value="concluido">Concluído</SelectItem>
                            <SelectItem value="cancelado">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
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
            <DialogHeader><DialogTitle>Novo Plano de Desenvolvimento</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Colaborador *</Label>
                <Select value={form.employee_id} onValueChange={v => setForm(p => ({ ...p, employee_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ex: Melhorar atendimento ao cliente" />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meta">Meta</SelectItem>
                    <SelectItem value="plano">Plano de Desenvolvimento</SelectItem>
                    <SelectItem value="curso">Curso Obrigatório</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input type="date" value={form.prazo} onChange={e => setForm(p => ({ ...p, prazo: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Detalhes..." />
              </div>
              <div className="space-y-2">
                <Label>Vincular a Avaliação (opcional)</Label>
                <Select value={form.evaluation_id} onValueChange={v => setForm(p => ({ ...p, evaluation_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {evaluations.map(ev => (
                      <SelectItem key={ev.id} value={ev.id}>
                        {ev.employees?.nome} — {notaEmoji[ev.nota]} ({new Date(ev.created_at).toLocaleDateString('pt-BR')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vincular a Treinamento (opcional)</Label>
                <Select value={form.training_id} onValueChange={v => setForm(p => ({ ...p, training_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {trainings.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full" disabled={saving}>
                {saving ? 'Salvando...' : 'Criar Plano'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Desenvolvimento;
