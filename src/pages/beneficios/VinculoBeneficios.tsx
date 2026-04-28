import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Users, Plus, Trash2, Search } from 'lucide-react';
import { beneficiosService, Benefit, EmployeeBenefit, BENEFIT_TYPE_LABELS } from '@/services/beneficiosService';

interface Employee { id: string; nome: string; departamento: string | null; cargo: string; }

const empty = {
  employee_id: '', benefit_id: '', status: 'ativo' as 'ativo' | 'cancelado' | 'pendente',
  start_date: new Date().toISOString().slice(0, 10),
  custom_value: '', payroll_discount: '', dependents_count: '0', observacoes: '',
};

export default function VinculoBeneficios() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [links, setLinks] = useState<EmployeeBenefit[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');

  const empMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
  const benMap = useMemo(() => new Map(benefits.map(b => [b.id, b])), [benefits]);

  const load = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    const [{ data: l }, { data: e }, { data: b }] = await Promise.all([
      beneficiosService.listEmployeeBenefits(user.companyId),
      supabase.from('employees').select('id, nome, departamento, cargo').eq('company_id', user.companyId).eq('status', 'ativo').order('nome'),
      beneficiosService.listBenefits(user.companyId),
    ]);
    setLinks((l as EmployeeBenefit[]) || []);
    setEmployees((e as Employee[]) || []);
    setBenefits((b as Benefit[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.companyId]);

  const openNew = () => { setForm(empty); setOpen(true); };

  const handleSave = async () => {
    if (!user?.companyId) return;
    if (!form.employee_id || !form.benefit_id) {
      toast({ title: 'Selecione funcionário e benefício', variant: 'destructive' });
      return;
    }
    const benefit = benMap.get(form.benefit_id);
    const payload = {
      company_id: user.companyId,
      employee_id: form.employee_id,
      benefit_id: form.benefit_id,
      status: form.status,
      start_date: form.start_date,
      end_date: null,
      custom_value: form.custom_value === '' ? null : Number(form.custom_value),
      payroll_discount: Number(form.payroll_discount || 0),
      dependents_count: benefit?.allows_dependents ? Number(form.dependents_count || 0) : 0,
      observacoes: form.observacoes,
    };
    const { error } = await beneficiosService.createEmployeeBenefit(payload);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Benefício vinculado' });
    setOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover vínculo?')) return;
    const { error } = await beneficiosService.deleteEmployeeBenefit(id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Vínculo removido' });
    load();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await beneficiosService.updateEmployeeBenefit(id, { status: status as 'ativo' | 'cancelado' | 'pendente' });
    load();
  };

  const filtered = links.filter(l => {
    if (filterStatus !== 'todos' && l.status !== filterStatus) return false;
    if (!search) return true;
    const emp = empMap.get(l.employee_id);
    const ben = benMap.get(l.benefit_id);
    const s = search.toLowerCase();
    return (emp?.nome.toLowerCase().includes(s) || ben?.name.toLowerCase().includes(s));
  });

  const activeBenefits = benefits.filter(b => b.status === 'ativo');
  const selectedBenefit = benMap.get(form.benefit_id);

  return (
    <MainLayout>
      <div className="p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6 text-primary" /> Vínculo de Benefícios</h1>
          <p className="text-sm text-muted-foreground">Vincule benefícios aos colaboradores</p>
        </div>

        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2 flex-1 min-w-[280px]">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar funcionário ou benefício..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos status</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Novo Vínculo</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Benefício</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Desconto Folha</TableHead>
                  <TableHead>Adesão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum vínculo encontrado.</TableCell></TableRow>
                ) : filtered.map(l => {
                  const emp = empMap.get(l.employee_id);
                  const ben = benMap.get(l.benefit_id);
                  const valor = l.custom_value ?? ben?.base_value ?? 0;
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{emp?.nome || '—'}</TableCell>
                      <TableCell>{ben?.name || '—'}</TableCell>
                      <TableCell>{ben ? BENEFIT_TYPE_LABELS[ben.type] : '—'}</TableCell>
                      <TableCell>R$ {Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>R$ {Number(l.payroll_discount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>{new Date(l.start_date).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>
                        <Select value={l.status} onValueChange={(v) => handleStatusChange(l.id, v)}>
                          <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="cancelado">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(l.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Novo Vínculo de Benefício</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Funcionário *</Label>
                <Select value={form.employee_id} onValueChange={v => setForm({ ...form, employee_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar funcionário" /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}{e.departamento ? ` — ${e.departamento}` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Benefício *</Label>
                <Select value={form.benefit_id} onValueChange={v => setForm({ ...form, benefit_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar benefício" /></SelectTrigger>
                  <SelectContent>
                    {activeBenefits.length === 0 ? <SelectItem value="_" disabled>Nenhum benefício ativo</SelectItem> : activeBenefits.map(b => <SelectItem key={b.id} value={b.id}>{b.name} (R$ {Number(b.base_value).toFixed(2)})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Valor (deixe vazio p/ usar base)</Label>
                  <Input type="number" step="0.01" placeholder={selectedBenefit ? String(selectedBenefit.base_value) : ''} value={form.custom_value} onChange={e => setForm({ ...form, custom_value: e.target.value })} />
                </div>
                <div><Label>Desconto em Folha (R$)</Label><Input type="number" step="0.01" value={form.payroll_discount} onChange={e => setForm({ ...form, payroll_discount: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data de Adesão</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                {selectedBenefit?.allows_dependents && (
                  <div><Label>Dependentes</Label><Input type="number" min="0" value={form.dependents_count} onChange={e => setForm({ ...form, dependents_count: e.target.value })} /></div>
                )}
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v: 'ativo' | 'cancelado' | 'pendente') => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Observações</Label><Input value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave}>Salvar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
