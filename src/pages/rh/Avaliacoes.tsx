import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Star, Plus } from 'lucide-react';

const notaEmoji: Record<number, string> = { 1: '😞', 2: '😐', 3: '🙂', 4: '😃' };
const notaLabel: Record<number, string> = { 1: 'Insatisfatório', 2: 'Regular', 3: 'Bom', 4: 'Excelente' };

const Avaliacoes = () => {
  const { toast } = useToast();
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ employee_id: '', nota: '', observacoes: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [evRes, empRes] = await Promise.all([
      supabase.from('performance_evaluations').select('*, employees(nome)').order('created_at', { ascending: false }),
      supabase.from('employees').select('id, nome').eq('status', 'ativo').order('nome'),
    ]);
    setEvaluations(evRes.data || []);
    setEmployees(empRes.data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.employee_id || !form.nota) {
      toast({ title: 'Campos obrigatórios', description: 'Selecione colaborador e nota.', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    const { data: emp } = await supabase.from('employees').select('company_id').eq('id', form.employee_id).single();
    if (!emp?.company_id || !user) { setSaving(false); return; }

    const { error } = await supabase.from('performance_evaluations').insert({
      company_id: emp.company_id,
      employee_id: form.employee_id,
      avaliador_id: user.id,
      nota: parseInt(form.nota),
      observacoes: form.observacoes,
    });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Avaliação registrada.' });
      setDialogOpen(false);
      loadData();
    }
    setSaving(false);
  };

  const formatDateTime = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Star className="w-6 h-6" /> Avaliações de Desempenho</h1>
          <Button onClick={() => { setForm({ employee_id: '', nota: '', observacoes: '' }); setDialogOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Avaliação
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-center">Avaliação</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : evaluations.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma avaliação registrada.</TableCell></TableRow>
                ) : evaluations.map(ev => (
                  <TableRow key={ev.id}>
                    <TableCell className="font-medium">{ev.employees?.nome}</TableCell>
                    <TableCell>{formatDateTime(ev.created_at)}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-2xl" title={notaLabel[ev.nota]}>{notaEmoji[ev.nota]}</span>
                      <span className="block text-xs text-muted-foreground">{notaLabel[ev.nota]}</span>
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate">{ev.observacoes || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nova Avaliação</DialogTitle></DialogHeader>
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
              <div className="space-y-2">
                <Label>Avaliação *</Label>
                <div className="flex gap-3 justify-center">
                  {[1, 2, 3, 4].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, nota: String(n) }))}
                      className={`text-3xl p-2 rounded-lg transition-all ${form.nota === String(n) ? 'bg-primary/20 ring-2 ring-primary scale-110' : 'hover:bg-muted'}`}
                    >
                      {notaEmoji[n]}
                    </button>
                  ))}
                </div>
                {form.nota && <p className="text-center text-sm text-muted-foreground">{notaLabel[parseInt(form.nota)]}</p>}
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} placeholder="Observações..." />
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

export default Avaliacoes;
