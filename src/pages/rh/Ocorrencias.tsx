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
import { AlertTriangle, Plus, Search } from 'lucide-react';

const tipoLabels: Record<string, string> = {
  verbal: 'Advertência Verbal',
  escrita: 'Advertência Escrita',
  suspensao: 'Suspensão',
  ocorrencia: 'Ocorrência Disciplinar',
};

const tipoBadgeClass: Record<string, string> = {
  verbal: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  escrita: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  suspensao: 'bg-destructive/15 text-destructive border-destructive/30',
  ocorrencia: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
};

const Ocorrencias = () => {
  const { toast } = useToast();
  const [records, setRecords] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ employee_id: '', tipo: 'verbal', data: new Date().toISOString().split('T')[0], descricao: '', responsavel_nome: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [recRes, empRes] = await Promise.all([
      supabase.from('employee_occurrences').select('*, employees(nome)').order('data', { ascending: false }),
      supabase.from('employees').select('id, nome').eq('status', 'ativo').order('nome'),
    ]);
    setRecords(recRes.data || []);
    setEmployees(empRes.data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.employee_id || !form.descricao.trim() || !form.responsavel_nome.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha colaborador, descrição e responsável.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { data: emp } = await supabase.from('employees').select('company_id').eq('id', form.employee_id).single();
    if (!emp?.company_id) { setSaving(false); return; }

    const { error } = await supabase.from('employee_occurrences').insert({
      company_id: emp.company_id,
      employee_id: form.employee_id,
      tipo: form.tipo,
      data: form.data,
      descricao: form.descricao.trim(),
      responsavel_nome: form.responsavel_nome.trim(),
    });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Ocorrência registrada.' });
      setDialogOpen(false);
      setForm({ employee_id: '', tipo: 'verbal', data: new Date().toISOString().split('T')[0], descricao: '', responsavel_nome: '' });
      loadData();
    }
    setSaving(false);
  };

  const filtered = records.filter(r =>
    (r.employees?.nome || '').toLowerCase().includes(search.toLowerCase()) ||
    r.descricao.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2"><AlertTriangle className="w-6 h-6" /> Ocorrências</h1>
          <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Nova Ocorrência</Button>
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
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Responsável</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma ocorrência registrada.</TableCell></TableRow>
                  ) : filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.employees?.nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={tipoBadgeClass[r.tipo] || ''}>{tipoLabels[r.tipo] || r.tipo}</Badge>
                      </TableCell>
                      <TableCell>{new Date(r.data + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{r.descricao}</TableCell>
                      <TableCell>{r.responsavel_nome}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nova Ocorrência</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Colaborador *</Label>
                <Select value={form.employee_id} onValueChange={v => setForm(p => ({ ...p, employee_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verbal">Advertência Verbal</SelectItem>
                    <SelectItem value="escrita">Advertência Escrita</SelectItem>
                    <SelectItem value="suspensao">Suspensão</SelectItem>
                    <SelectItem value="ocorrencia">Ocorrência Disciplinar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Descreva a ocorrência..." />
              </div>
              <div className="space-y-2">
                <Label>Responsável *</Label>
                <Input value={form.responsavel_nome} onChange={e => setForm(p => ({ ...p, responsavel_nome: e.target.value }))} placeholder="Nome do responsável" />
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

export default Ocorrencias;
