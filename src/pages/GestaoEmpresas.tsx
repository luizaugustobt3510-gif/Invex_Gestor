import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Building, Edit, RefreshCw, Plus, Users, ShieldCheck, ShieldOff, Trash2, DollarSign, History, KeyRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COMPANY_TYPES, COMPANY_TYPE_LABELS, COMPANY_TYPE_TEMPLATES, type CompanyType } from '@/config/companyTypeTemplates';
import { MODULES_CATALOG } from '@/config/modules';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';

type PlanType = 'mensal' | 'trimestral' | 'semestral' | 'anual';
type SubStatus = 'ativa' | 'em_atraso' | 'bloqueada';

interface Company {
  id: string;
  name: string;
  cnpj: string | null;
  status: string;
  created_at: string;
  company_type?: CompanyType;
  user_count?: number;
  monthly_fee: number;
  plan_type: PlanType;
  next_due_date: string | null;
  grace_days: number;
  auto_block: boolean;
  subscription_status: SubStatus;
}

interface PaymentRecord {
  id: string;
  due_date: string;
  amount: number;
  status: string;
  payment_date: string | null;
  registered_by_name: string | null;
  notes: string | null;
  created_at: string;
}

const PLAN_LABELS: Record<PlanType, string> = {
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
};

const STATUS_META: Record<SubStatus, { label: string; className: string }> = {
  ativa: { label: 'Ativa', className: 'bg-success/15 text-success border-success/30' },
  em_atraso: { label: 'Em atraso', className: 'bg-warning/15 text-warning border-warning/30' },
  bloqueada: { label: 'Bloqueada', className: 'bg-destructive/15 text-destructive border-destructive/30' },
};

const daysBetween = (fromISO: string) => {
  const target = new Date(fromISO + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
};

const GestaoEmpresas = () => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [newDialog, setNewDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCnpj, setNewCnpj] = useState('');
  const [newType, setNewType] = useState<CompanyType>('personalizado');
  const [newFee, setNewFee] = useState<string>('0');
  const [newPlan, setNewPlan] = useState<PlanType>('mensal');
  const [newDue, setNewDue] = useState<string>('');
  const [newGrace, setNewGrace] = useState<string>('5');
  const [newAutoBlock, setNewAutoBlock] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<Company | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [newModules, setNewModules] = useState<Record<string, boolean>>({});

  // Payment / history
  const [payDialog, setPayDialog] = useState<Company | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payNotes, setPayNotes] = useState('');
  const [paying, setPaying] = useState(false);
  const [historyDialog, setHistoryDialog] = useState<Company | null>(null);
  const [historyRecords, setHistoryRecords] = useState<PaymentRecord[]>([]);
  // Auth methods per company
  const [authDialog, setAuthDialog] = useState<Company | null>(null);
  const [authMethods, setAuthMethods] = useState<{ email: boolean; google: boolean; microsoft: boolean }>({ email: true, google: false, microsoft: false });
  const [savingAuth, setSavingAuth] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const suggested = COMPANY_TYPE_TEMPLATES[newType] || [];
    const map: Record<string, boolean> = {};
    MODULES_CATALOG.filter(m => !m.core).forEach(m => { map[m.key] = suggested.includes(m.key); });
    setNewModules(map);
  }, [newType, newDialog]);

  const fetchCompanies = async () => {
    setLoading(true);
    const { data: companiesData } = await supabase.from('companies').select('*').order('name');
    const { data: roles } = await supabase.from('user_roles').select('company_id');

    const countMap: Record<string, number> = {};
    (roles || []).forEach(r => { if (r.company_id) countMap[r.company_id] = (countMap[r.company_id] || 0) + 1; });

    // Re-evaluate subscription status for each company (idempotent)
    await Promise.all((companiesData || []).map(c =>
      supabase.rpc('evaluate_subscription_status', { _company_id: c.id })
    ));
    const { data: refreshed } = await supabase.from('companies').select('*').order('name');

    setCompanies((refreshed || []).map(c => ({
      ...(c as any),
      status: (c as any).status || 'ativa',
      company_type: ((c as any).company_type as CompanyType) || 'personalizado',
      user_count: countMap[c.id] || 0,
      monthly_fee: Number((c as any).monthly_fee) || 0,
      plan_type: ((c as any).plan_type as PlanType) || 'mensal',
      next_due_date: (c as any).next_due_date || null,
      grace_days: (c as any).grace_days ?? 5,
      auto_block: (c as any).auto_block ?? true,
      subscription_status: ((c as any).subscription_status as SubStatus) || 'ativa',
    })));
    setLoading(false);
  };

  useEffect(() => { fetchCompanies(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert({
          name: newName.trim(),
          cnpj: newCnpj.trim() || null,
          company_type: newType,
          monthly_fee: Number(newFee) || 0,
          plan_type: newPlan,
          next_due_date: newDue || null,
          grace_days: Number(newGrace) || 0,
          auto_block: newAutoBlock,
        } as any)
        .select('id')
        .single();
      if (error) throw error;

      const selected = Object.entries(newModules).filter(([, v]) => v).map(([k]) => k);
      if (data?.id && selected.length > 0) {
        await supabase.from('company_modules').upsert(
          selected.map((key) => ({ company_id: data.id, module_key: key, is_active: true })),
          { onConflict: 'company_id,module_key' },
        );
      }

      toast({ title: 'Empresa criada!', description: selected.length ? `${selected.length} módulo(s) ativados.` : 'Nenhum módulo ativado.' });
      setNewDialog(false);
      setNewName(''); setNewCnpj(''); setNewType('personalizado');
      setNewFee('0'); setNewPlan('mensal'); setNewDue(''); setNewGrace('5'); setNewAutoBlock(true);
      fetchCompanies();
    } catch {
      toast({ title: 'Erro', description: 'Erro ao criar empresa.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editCompany) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('companies')
        .update({
          name: editCompany.name,
          cnpj: editCompany.cnpj,
          status: editCompany.status,
          company_type: editCompany.company_type || 'personalizado',
          monthly_fee: editCompany.monthly_fee,
          plan_type: editCompany.plan_type,
          next_due_date: editCompany.next_due_date,
          grace_days: editCompany.grace_days,
          auto_block: editCompany.auto_block,
        } as any)
        .eq('id', editCompany.id);
      if (error) throw error;
      // recompute status right away
      await supabase.rpc('evaluate_subscription_status', { _company_id: editCompany.id });
      toast({ title: 'Empresa atualizada!' });
      setEditCompany(null);
      fetchCompanies();
    } catch {
      toast({ title: 'Erro', description: 'Erro ao atualizar empresa.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (company: Company) => {
    const newStatus = company.status === 'ativa' ? 'inativa' : 'ativa';
    try {
      await supabase.from('companies').update({ status: newStatus }).eq('id', company.id);
      toast({ title: `Empresa ${newStatus === 'ativa' ? 'ativada' : 'desativada'}` });
      fetchCompanies();
    } catch {
      toast({ title: 'Erro', variant: 'destructive' });
    }
  };

  const handleDeleteCompany = async () => {
    if (!deleteDialog || deleteConfirmText !== deleteDialog.name) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-company', {
        body: { company_id: deleteDialog.id },
      });
      if (error) throw error;
      toast({ title: 'Empresa excluída', description: data?.message || 'Empresa e todos os dados foram removidos.' });
      setDeleteDialog(null);
      setDeleteConfirmText('');
      fetchCompanies();
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Erro ao excluir empresa.', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const openPayDialog = (c: Company) => {
    setPayDialog(c);
    setPayAmount(String(c.monthly_fee || ''));
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayNotes('');
  };

  const handleRegisterPayment = async () => {
    if (!payDialog) return;
    setPaying(true);
    try {
      const { error } = await supabase.rpc('register_subscription_payment', {
        _company_id: payDialog.id,
        _amount: Number(payAmount) || 0,
        _payment_date: payDate,
        _notes: payNotes || null,
      });
      if (error) throw error;
      toast({ title: 'Pagamento registrado', description: 'Vencimento atualizado e status renovado.' });
      setPayDialog(null);
      fetchCompanies();
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Erro ao registrar pagamento.', variant: 'destructive' });
    } finally {
      setPaying(false);
    }
  };

  const openHistory = async (c: Company) => {
    setHistoryDialog(c);
    setLoadingHistory(true);
    const { data } = await supabase
      .from('subscription_payments')
      .select('*')
      .eq('company_id', c.id)
      .order('created_at', { ascending: false });
    setHistoryRecords((data || []) as PaymentRecord[]);
    setLoadingHistory(false);
  };

  return (
    <MainLayout>
      <Card className="max-w-6xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Gestão de Empresas
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setNewDialog(true)} className="gap-1">
              <Plus className="w-4 h-4" /> Nova Empresa
            </Button>
            <Button variant="outline" size="sm" onClick={fetchCompanies} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead className="text-right">Mensalidade</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-center">Atraso</TableHead>
                    <TableHead className="text-center">Assinatura</TableHead>
                    <TableHead className="text-center">Bloqueio</TableHead>
                    <TableHead className="text-center">Usuários</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map(c => {
                    const meta = STATUS_META[c.subscription_status];
                    const overdueDays = c.next_due_date ? daysBetween(c.next_due_date) : 0;
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{c.cnpj || '-'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{PLAN_LABELS[c.plan_type]}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {c.monthly_fee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell>
                          {c.next_due_date ? new Date(c.next_due_date + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {overdueDays > 0 ? <span className="text-destructive font-medium">{overdueDays}d</span> : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={meta.className} variant="outline">{meta.label}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={c.auto_block ? 'default' : 'outline'} className="text-xs">
                            {c.auto_block ? 'Auto' : 'Off'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="w-3.5 h-3.5 text-muted-foreground" />
                            {c.user_count}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-0.5">
                            <Button variant="ghost" size="sm" title="Editar" onClick={() => setEditCompany({ ...c })}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Registrar pagamento" onClick={() => openPayDialog(c)}>
                              <DollarSign className="w-4 h-4 text-success" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Histórico financeiro" onClick={() => openHistory(c)}>
                              <History className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title={c.status === 'ativa' ? 'Desativar' : 'Ativar'} onClick={() => toggleStatus(c)}>
                              {c.status === 'ativa' ? <ShieldOff className="w-4 h-4 text-destructive" /> : <ShieldCheck className="w-4 h-4 text-primary" />}
                            </Button>
                            <Button variant="ghost" size="sm" title="Excluir" onClick={() => setDeleteDialog(c)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Company Dialog */}
      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Empresa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 col-span-2">
                <Label>Nome *</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome da empresa" />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={newCnpj} onChange={e => setNewCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Empresa</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as CompanyType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMPANY_TYPES.map(t => <SelectItem key={t} value={t}>{COMPANY_TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">Assinatura</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Valor da mensalidade (R$)</Label>
                  <Input type="number" step="0.01" value={newFee} onChange={e => setNewFee(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo do plano</Label>
                  <Select value={newPlan} onValueChange={(v) => setNewPlan(v as PlanType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PLAN_LABELS) as PlanType[]).map(p => <SelectItem key={p} value={p}>{PLAN_LABELS[p]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Próximo vencimento</Label>
                  <Input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Dias de tolerância</Label>
                  <Input type="number" value={newGrace} onChange={e => setNewGrace(e.target.value)} />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <Switch checked={newAutoBlock} onCheckedChange={setNewAutoBlock} id="auto-block-new" />
                  <Label htmlFor="auto-block-new" className="cursor-pointer">Bloqueio automático após tolerância</Label>
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <Label>Módulos ativados na criação</Label>
              <div className="max-h-56 overflow-y-auto border rounded-md p-3 space-y-2">
                {MODULES_CATALOG.filter(m => !m.core).map(m => (
                  <label key={m.key} className="flex items-start gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={!!newModules[m.key]}
                      onCheckedChange={(v) => setNewModules(prev => ({ ...prev, [m.key]: !!v }))}
                    />
                    <div>
                      <div className="font-medium">{m.label}</div>
                      <div className="text-xs text-muted-foreground">{m.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !newName.trim()}>
              {saving ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Company Dialog */}
      <Dialog open={!!editCompany} onOpenChange={open => { if (!open) setEditCompany(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Empresa</DialogTitle></DialogHeader>
          {editCompany && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 col-span-2">
                  <Label>Nome</Label>
                  <Input value={editCompany.name} onChange={e => setEditCompany({ ...editCompany, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input value={editCompany.cnpj || ''} onChange={e => setEditCompany({ ...editCompany, cnpj: e.target.value || null })} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={editCompany.company_type || 'personalizado'} onValueChange={(v) => setEditCompany({ ...editCompany, company_type: v as CompanyType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COMPANY_TYPES.map(t => <SelectItem key={t} value={t}>{COMPANY_TYPE_LABELS[t]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-3">Assinatura</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Valor da mensalidade (R$)</Label>
                    <Input type="number" step="0.01" value={editCompany.monthly_fee}
                      onChange={e => setEditCompany({ ...editCompany, monthly_fee: Number(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo do plano</Label>
                    <Select value={editCompany.plan_type} onValueChange={(v) => setEditCompany({ ...editCompany, plan_type: v as PlanType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(PLAN_LABELS) as PlanType[]).map(p => <SelectItem key={p} value={p}>{PLAN_LABELS[p]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Próximo vencimento</Label>
                    <Input type="date" value={editCompany.next_due_date || ''}
                      onChange={e => setEditCompany({ ...editCompany, next_due_date: e.target.value || null })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Dias de tolerância</Label>
                    <Input type="number" value={editCompany.grace_days}
                      onChange={e => setEditCompany({ ...editCompany, grace_days: Number(e.target.value) || 0 })} />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <Switch checked={editCompany.auto_block}
                      onCheckedChange={(v) => setEditCompany({ ...editCompany, auto_block: v })}
                      id="auto-block-edit" />
                    <Label htmlFor="auto-block-edit" className="cursor-pointer">Bloqueio automático após tolerância</Label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  O status da assinatura é recalculado automaticamente a cada login e alteração.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCompany(null)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Register Payment Dialog */}
      <Dialog open={!!payDialog} onOpenChange={open => { if (!open) setPayDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-success" />
              Registrar Pagamento — {payDialog?.name}
            </DialogTitle>
            <DialogDescription>
              O próximo vencimento será avançado conforme o plano ({payDialog && PLAN_LABELS[payDialog.plan_type]}).
              O status voltará para <strong>Ativa</strong> e qualquer bloqueio será removido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Valor pago (R$)</Label>
              <Input type="number" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data do pagamento</Label>
              <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Input value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Ex.: PIX recebido / Boleto quitado" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(null)}>Cancelar</Button>
            <Button onClick={handleRegisterPayment} disabled={paying}>
              {paying ? 'Registrando...' : 'Registrar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={!!historyDialog} onOpenChange={open => { if (!open) setHistoryDialog(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Histórico Financeiro — {historyDialog?.name}
            </DialogTitle>
            <DialogDescription>Registros são permanentes e não podem ser excluídos.</DialogDescription>
          </DialogHeader>
          {loadingHistory ? (
            <div className="text-center py-6 text-muted-foreground">Carregando...</div>
          ) : historyRecords.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">Nenhum pagamento registrado ainda.</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pago em</TableHead>
                    <TableHead>Registrado por</TableHead>
                    <TableHead>Obs.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyRecords.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>{new Date(r.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="text-right font-mono">
                        {Number(r.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{r.status}</Badge></TableCell>
                      <TableCell>{r.payment_date ? new Date(r.payment_date + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</TableCell>
                      <TableCell className="text-sm">{r.registered_by_name || '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Company Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={open => { if (!open) { setDeleteDialog(null); setDeleteConfirmText(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Excluir Empresa
            </DialogTitle>
            <DialogDescription>
              <strong>Esta ação é irreversível!</strong> A empresa <strong>"{deleteDialog?.name}"</strong> e TODOS os seus dados serão permanentemente removidos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Digite o nome da empresa <strong>"{deleteDialog?.name}"</strong> para confirmar:</Label>
            <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder={deleteDialog?.name || ''} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialog(null); setDeleteConfirmText(''); }}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteCompany} disabled={deleteConfirmText !== deleteDialog?.name || deleting}>
              {deleting ? 'Excluindo...' : 'Excluir Permanentemente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default GestaoEmpresas;
