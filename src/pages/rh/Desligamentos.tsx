import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserMinus, Plus, Search, Settings } from 'lucide-react';

const Desligamentos = () => {
  const { toast } = useToast();
  const [terminations, setTerminations] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [reasons, setReasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [newReason, setNewReason] = useState('');
  const [form, setForm] = useState({
    employee_id: '',
    data_desligamento: new Date().toISOString().split('T')[0],
    motivo: '',
    observacoes: '',
    responsavel_nome: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [termRes, empRes, reasonRes] = await Promise.all([
      supabase.from('employee_terminations').select('*, employees(nome, cargo, departamento)').order('data_desligamento', { ascending: false }),
      supabase.from('employees').select('id, nome, cargo, company_id').eq('status', 'ativo').order('nome'),
      supabase.from('termination_reasons').select('*').order('motivo'),
    ]);
    setTerminations(termRes.data || []);
    setEmployees(empRes.data || []);
    setReasons(reasonRes.data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.employee_id || !form.motivo || !form.data_desligamento || !form.responsavel_nome.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const emp = employees.find(e => e.id === form.employee_id);
    if (!emp?.company_id) { setSaving(false); return; }

    // Insert termination record
    const { error: termError } = await supabase.from('employee_terminations').insert({
      company_id: emp.company_id,
      employee_id: form.employee_id,
      data_desligamento: form.data_desligamento,
      motivo: form.motivo,
      observacoes: form.observacoes.trim(),
      responsavel_nome: form.responsavel_nome.trim(),
    });

    if (termError) {
      toast({ title: 'Erro', description: termError.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    // Update employee status
    const { error: empError } = await supabase.from('employees').update({ status: 'desligado' }).eq('id', form.employee_id);
    if (empError) {
      toast({ title: 'Erro ao atualizar status', description: empError.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    // Audit log
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('audit_log').insert({
        user_id: user.id,
        action: 'desligamento',
        entity_type: 'employee',
        entity_id: form.employee_id,
        details: { nome: emp.nome, ...form },
      });
    }

    toast({ title: 'Sucesso', description: `${emp.nome} foi desligado(a).` });
    setDialogOpen(false);
    setForm({ employee_id: '', data_desligamento: new Date().toISOString().split('T')[0], motivo: '', observacoes: '', responsavel_nome: '' });
    loadData();
    setSaving(false);
  };

  const handleAddReason = async () => {
    if (!newReason.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: roleData } = await supabase.from('user_roles').select('company_id').eq('user_id', user.id).not('company_id', 'is', null).limit(1).single();

    const { error } = await supabase.from('termination_reasons').insert({
      company_id: roleData?.company_id,
      motivo: newReason.trim(),
      is_default: false,
    });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Motivo adicionado!' });
      setNewReason('');
      const { data } = await supabase.from('termination_reasons').select('*').order('motivo');
      setReasons(data || []);
    }
  };

  const handleDeleteReason = async (id: string) => {
    await supabase.from('termination_reasons').delete().eq('id', id);
    setReasons(prev => prev.filter(r => r.id !== id));
  };

  const filtered = terminations.filter(t =>
    (t.employees?.nome || '').toLowerCase().includes(search.toLowerCase()) ||
    t.motivo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2"><UserMinus className="w-6 h-6" /> Desligamentos</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setReasonDialogOpen(true)} className="gap-2"><Settings className="w-4 h-4" /> Motivos</Button>
            <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Registrar Desligamento</Button>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou motivo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Data Desligamento</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum desligamento registrado.</TableCell></TableRow>
                  ) : filtered.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.employees?.nome}</TableCell>
                      <TableCell>{t.employees?.cargo}</TableCell>
                      <TableCell>{t.employees?.departamento || '—'}</TableCell>
                      <TableCell>{new Date(t.data_desligamento + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell><Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">{t.motivo}</Badge></TableCell>
                      <TableCell>{t.responsavel_nome}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{t.observacoes || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Dialog: Registrar Desligamento */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Registrar Desligamento</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Colaborador *</Label>
                <Select value={form.employee_id} onValueChange={v => setForm(p => ({ ...p, employee_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data de Desligamento *</Label>
                <Input type="date" value={form.data_desligamento} onChange={e => setForm(p => ({ ...p, data_desligamento: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Motivo *</Label>
                <Select value={form.motivo} onValueChange={v => setForm(p => ({ ...p, motivo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o motivo..." /></SelectTrigger>
                  <SelectContent>{reasons.map(r => <SelectItem key={r.id} value={r.motivo}>{r.motivo}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Responsável *</Label>
                <Input value={form.responsavel_nome} onChange={e => setForm(p => ({ ...p, responsavel_nome: e.target.value }))} placeholder="Nome do responsável" />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} placeholder="Observações adicionais..." />
              </div>
              <Button onClick={handleSave} variant="destructive" className="w-full" disabled={saving}>
                {saving ? 'Processando...' : 'Confirmar Desligamento'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog: Gerenciar Motivos */}
        <Dialog open={reasonDialogOpen} onOpenChange={setReasonDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Motivos de Desligamento</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input value={newReason} onChange={e => setNewReason(e.target.value)} placeholder="Novo motivo..." className="flex-1" />
                <Button onClick={handleAddReason} disabled={!newReason.trim()}>Adicionar</Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {reasons.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-1.5 px-2 border border-border/50 rounded">
                    <span className="text-sm">{r.motivo}</span>
                    <div className="flex items-center gap-2">
                      {r.is_default && <Badge variant="secondary" className="text-[10px]">Padrão</Badge>}
                      {!r.is_default && (
                        <Button variant="ghost" size="sm" className="text-destructive h-7 text-xs" onClick={() => handleDeleteReason(r.id)}>Remover</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Desligamentos;
