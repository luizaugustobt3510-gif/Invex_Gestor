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
import { Clock, Plus, Search } from 'lucide-react';

const BancoDeHoras = () => {
  const { toast } = useToast();
  const [records, setRecords] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [form, setForm] = useState({ employee_id: '', data: '', entrada: '', saida: '', obs: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [recRes, empRes] = await Promise.all([
      supabase.from('time_records').select('*, employees(nome)').order('data', { ascending: false }).limit(200),
      supabase.from('employees').select('id, nome').eq('status', 'ativo').order('nome'),
    ]);
    setRecords(recRes.data || []);
    setEmployees(empRes.data || []);
    setLoading(false);
  };

  const calcHours = (entrada: string, saida: string) => {
    if (!entrada || !saida) return { trabalhadas: 0, extras: 0 };
    const [eh, em] = entrada.split(':').map(Number);
    const [sh, sm] = saida.split(':').map(Number);
    const totalMin = (sh * 60 + sm) - (eh * 60 + em) - 60; // 1h lunch
    const trabalhadas = Math.max(0, totalMin / 60);
    const extras = Math.max(0, trabalhadas - 8);
    return { trabalhadas: Math.round(trabalhadas * 100) / 100, extras: Math.round(extras * 100) / 100 };
  };

  const handleSave = async () => {
    if (!form.employee_id || !form.data || !form.entrada || !form.saida) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { data: emp } = await supabase.from('employees').select('company_id').eq('id', form.employee_id).single();
    if (!emp?.company_id) { setSaving(false); return; }

    const { trabalhadas, extras } = calcHours(form.entrada, form.saida);

    const { error } = await supabase.from('time_records').insert({
      company_id: emp.company_id,
      employee_id: form.employee_id,
      data: form.data,
      entrada: form.entrada,
      saida: form.saida,
      horas_trabalhadas: trabalhadas,
      horas_extras: extras,
      obs: form.obs,
    });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Registro salvo.' });
      setDialogOpen(false);
      loadData();
    }
    setSaving(false);
  };

  const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');

  // Calculate bank per employee
  const bankByEmployee = new Map<string, { nome: string; total: number }>();
  records.forEach(r => {
    const key = r.employee_id;
    const current = bankByEmployee.get(key) || { nome: r.employees?.nome || '', total: 0 };
    current.total += (r.horas_extras || 0);
    bankByEmployee.set(key, current);
  });

  const filtered = records.filter(r => {
    const matchSearch = !search || r.employees?.nome?.toLowerCase().includes(search.toLowerCase());
    const matchEmployee = filterEmployee === 'all' || r.employee_id === filterEmployee;
    return matchSearch && matchEmployee;
  });

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Clock className="w-6 h-6" /> Banco de Horas</h1>
          <Button onClick={() => { setForm({ employee_id: '', data: '', entrada: '', saida: '', obs: '' }); setDialogOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Registrar Ponto
          </Button>
        </div>

        {/* Saldo por colaborador */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from(bankByEmployee.entries()).slice(0, 8).map(([id, data]) => (
            <Card key={id}>
              <CardContent className="p-3">
                <p className="text-sm font-medium truncate">{data.nome}</p>
                <p className={`text-lg font-bold ${data.total >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {data.total >= 0 ? '+' : ''}{data.total.toFixed(1)}h
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filtrar colaborador" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Saída</TableHead>
                  <TableHead className="text-right">Trabalhadas</TableHead>
                  <TableHead className="text-right">Extras</TableHead>
                  <TableHead>Obs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum registro.</TableCell></TableRow>
                ) : filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.employees?.nome}</TableCell>
                    <TableCell>{formatDate(r.data)}</TableCell>
                    <TableCell>{r.entrada || '—'}</TableCell>
                    <TableCell>{r.saida || '—'}</TableCell>
                    <TableCell className="text-right">{r.horas_trabalhadas?.toFixed(1)}h</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={r.horas_extras > 0 ? 'default' : 'secondary'}>
                        {r.horas_extras > 0 ? `+${r.horas_extras.toFixed(1)}h` : '0h'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">{r.obs || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Registrar Ponto</DialogTitle></DialogHeader>
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
                <Label>Data *</Label>
                <Input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Entrada *</Label>
                  <Input type="time" value={form.entrada} onChange={e => setForm(p => ({ ...p, entrada: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Saída *</Label>
                  <Input type="time" value={form.saida} onChange={e => setForm(p => ({ ...p, saida: e.target.value }))} />
                </div>
              </div>
              {form.entrada && form.saida && (
                <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                  Horas: {calcHours(form.entrada, form.saida).trabalhadas.toFixed(1)}h | Extras: {calcHours(form.entrada, form.saida).extras.toFixed(1)}h
                </div>
              )}
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={form.obs} onChange={e => setForm(p => ({ ...p, obs: e.target.value }))} placeholder="Observações..." />
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

export default BancoDeHoras;
