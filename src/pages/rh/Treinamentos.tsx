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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { hardDeleteById } from '@/lib/hardDelete';
import { GraduationCap, Plus, UserPlus, AlertTriangle, Pencil, Trash2, RefreshCw, History, Search } from 'lucide-react';

const Treinamentos = () => {
  const { toast } = useToast();
  const [trainings, setTrainings] = useState<any[]>([]);
  const [employeeTrainings, setEmployeeTrainings] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [editingEtId, setEditingEtId] = useState<string | null>(null);
  const [deleteEtId, setDeleteEtId] = useState<string | null>(null);
  const [historyEmployeeId, setHistoryEmployeeId] = useState<string | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [searchET, setSearchET] = useState('');
  const [form, setForm] = useState({ nome: '', descricao: '', obrigatorio: false, periodicidade_meses: '' });
  const [linkForm, setLinkForm] = useState({ employee_id: '', training_id: '', data_realizacao: '', data_validade: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [tRes, etRes, empRes] = await Promise.all([
      supabase.from('trainings').select('*').order('nome'),
      supabase.from('employee_trainings').select('*, employees(nome), trainings(nome, obrigatorio, periodicidade_meses)').order('data_realizacao', { ascending: false }),
      supabase.from('employees').select('id, nome').eq('status', 'ativo').order('nome'),
    ]);
    setTrainings(tRes.data || []);
    setEmployeeTrainings(etRes.data || []);
    setEmployees(empRes.data || []);
    setLoading(false);
  };

  const getCompanyId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single();
    return profile?.company_id;
  };

  const handleSaveTraining = async () => {
    if (!form.nome.trim()) {
      toast({ title: 'Campo obrigatório', description: 'Informe o nome do treinamento.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const companyId = await getCompanyId();
    if (!companyId) { setSaving(false); return; }

    const { error } = await supabase.from('trainings').insert({
      company_id: companyId,
      nome: form.nome.trim(),
      descricao: form.descricao.trim(),
      obrigatorio: form.obrigatorio,
      periodicidade_meses: form.periodicidade_meses ? parseInt(form.periodicidade_meses) : null,
    });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Treinamento cadastrado!' });
      setDialogOpen(false);
      loadData();
    }
    setSaving(false);
  };

  const openNewLink = () => {
    setEditingEtId(null);
    setLinkForm({ employee_id: '', training_id: '', data_realizacao: '', data_validade: '' });
    setLinkDialogOpen(true);
  };

  const openEditLink = (et: any) => {
    setEditingEtId(et.id);
    setLinkForm({
      employee_id: et.employee_id,
      training_id: et.training_id,
      data_realizacao: et.data_realizacao,
      data_validade: et.data_validade || '',
    });
    setLinkDialogOpen(true);
  };

  const openRenewLink = (et: any) => {
    setEditingEtId(null);
    const today = new Date().toISOString().split('T')[0];
    let validade = '';
    if (et.trainings?.periodicidade_meses) {
      const d = new Date(today);
      d.setMonth(d.getMonth() + et.trainings.periodicidade_meses);
      validade = d.toISOString().split('T')[0];
    }
    setLinkForm({
      employee_id: et.employee_id,
      training_id: et.training_id,
      data_realizacao: today,
      data_validade: validade,
    });
    setLinkDialogOpen(true);
  };

  const handleSaveLink = async () => {
    if (!linkForm.employee_id || !linkForm.training_id || !linkForm.data_realizacao) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const companyId = await getCompanyId();
    if (!companyId) { setSaving(false); return; }

    let dataValidade = linkForm.data_validade || null;
    if (!dataValidade) {
      const training = trainings.find(t => t.id === linkForm.training_id);
      if (training?.periodicidade_meses) {
        const d = new Date(linkForm.data_realizacao);
        d.setMonth(d.getMonth() + training.periodicidade_meses);
        dataValidade = d.toISOString().split('T')[0];
      }
    }

    if (editingEtId) {
      const { error } = await supabase.from('employee_trainings').update({
        training_id: linkForm.training_id,
        data_realizacao: linkForm.data_realizacao,
        data_validade: dataValidade,
      }).eq('id', editingEtId);
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Treinamento atualizado!' });
      }
    } else {
      const { error } = await supabase.from('employee_trainings').insert({
        company_id: companyId,
        employee_id: linkForm.employee_id,
        training_id: linkForm.training_id,
        data_realizacao: linkForm.data_realizacao,
        data_validade: dataValidade,
        status: 'vigente',
      });
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Treinamento registrado!' });
      }
    }
    setLinkDialogOpen(false);
    loadData();
    setSaving(false);
  };

  const handleDeleteET = async () => {
    if (!deleteEtId) return;

    const result = await hardDeleteById('employee_trainings', deleteEtId);

    if (!result.success) {
      toast({ title: 'Erro ao excluir', description: result.message, variant: 'destructive' });
      return;
    }

    setEmployeeTrainings(prev => prev.filter(training => training.id !== deleteEtId));
    toast({ title: 'Treinamento excluído', description: 'Registro removido permanentemente do banco de dados.' });
    setDeleteEtId(null);
    await loadData();
  };

  const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
  const hoje = new Date().toISOString().split('T')[0];

  const getStatusBadge = (et: any) => {
    if (!et.data_validade) return <Badge variant="secondary">Sem validade</Badge>;
    const diff = (new Date(et.data_validade).getTime() - Date.now()) / 86400000;
    if (diff < 0) return <Badge variant="destructive">Vencido</Badge>;
    if (diff <= 30) return <Badge className="bg-amber-500 text-white">Vence em breve</Badge>;
    return <Badge className="bg-emerald-500 text-white">Vigente</Badge>;
  };

  const vencidos = employeeTrainings.filter(et => et.data_validade && et.data_validade < hoje);
  const proximosVencer = employeeTrainings.filter(et => {
    if (!et.data_validade) return false;
    const diff = (new Date(et.data_validade).getTime() - Date.now()) / 86400000;
    return diff >= 0 && diff <= 30;
  });

  const filteredET = employeeTrainings.filter(et =>
    (et.employees?.nome || '').toLowerCase().includes(searchET.toLowerCase()) ||
    (et.trainings?.nome || '').toLowerCase().includes(searchET.toLowerCase())
  );

  const historyETs = historyEmployeeId ? employeeTrainings.filter(et => et.employee_id === historyEmployeeId) : [];
  const historyName = historyEmployeeId ? (employeeTrainings.find(et => et.employee_id === historyEmployeeId)?.employees?.nome || '') : '';

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><GraduationCap className="w-6 h-6" /> Treinamentos</h1>
          <div className="flex gap-2">
            <Button onClick={() => { setForm({ nome: '', descricao: '', obrigatorio: false, periodicidade_meses: '' }); setDialogOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" /> Novo Treinamento
            </Button>
            <Button variant="outline" onClick={openNewLink} className="gap-2">
              <UserPlus className="w-4 h-4" /> Vincular
            </Button>
          </div>
        </div>

        {(vencidos.length > 0 || proximosVencer.length > 0) && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-destructive font-medium mb-1">
                <AlertTriangle className="w-4 h-4" /> Alertas de Treinamento
              </div>
              {vencidos.length > 0 && <p className="text-sm text-muted-foreground">{vencidos.length} treinamento(s) vencido(s)</p>}
              {proximosVencer.length > 0 && <p className="text-sm text-muted-foreground">{proximosVencer.length} próximo(s) de vencer (30 dias)</p>}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="realizados">
          <TabsList>
            <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
            <TabsTrigger value="realizados">Realizados</TabsTrigger>
          </TabsList>

          <TabsContent value="catalogo">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Obrigatório</TableHead>
                        <TableHead>Periodicidade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                      ) : trainings.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum treinamento cadastrado.</TableCell></TableRow>
                      ) : trainings.map(t => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.nome}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{t.descricao || '—'}</TableCell>
                          <TableCell><Badge variant={t.obrigatorio ? 'destructive' : 'secondary'}>{t.obrigatorio ? 'Sim' : 'Não'}</Badge></TableCell>
                          <TableCell>{t.periodicidade_meses ? `${t.periodicidade_meses} meses` : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="realizados">
            <div className="space-y-3">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar colaborador ou treinamento..." value={searchET} onChange={e => setSearchET(e.target.value)} className="pl-10" />
              </div>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Colaborador</TableHead>
                          <TableHead>Treinamento</TableHead>
                          <TableHead>Realização</TableHead>
                          <TableHead>Validade</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                        ) : filteredET.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum registro.</TableCell></TableRow>
                        ) : filteredET.map(et => (
                          <TableRow key={et.id}>
                            <TableCell className="font-medium">{et.employees?.nome}</TableCell>
                            <TableCell>{et.trainings?.nome}</TableCell>
                            <TableCell>{formatDate(et.data_realizacao)}</TableCell>
                            <TableCell>{et.data_validade ? formatDate(et.data_validade) : '—'}</TableCell>
                            <TableCell>{getStatusBadge(et)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button size="icon" variant="ghost" className="h-8 w-8" title="Renovar" onClick={() => openRenewLink(et)}>
                                  <RefreshCw className="w-4 h-4 text-emerald-600" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar" onClick={() => openEditLink(et)}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" title="Histórico" onClick={() => { setHistoryEmployeeId(et.employee_id); setHistoryDialogOpen(true); }}>
                                  <History className="w-4 h-4 text-blue-600" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" title="Excluir" onClick={() => setDeleteEtId(et.id)}>
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
            </div>
          </TabsContent>
        </Tabs>

        {/* New Training Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Novo Treinamento</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Nome do treinamento" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Descrição..." />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.obrigatorio} onCheckedChange={v => setForm(p => ({ ...p, obrigatorio: v }))} />
                <Label>Obrigatório</Label>
              </div>
              <div className="space-y-2">
                <Label>Periodicidade (meses)</Label>
                <Input type="number" min="1" value={form.periodicidade_meses} onChange={e => setForm(p => ({ ...p, periodicidade_meses: e.target.value }))} placeholder="Ex: 12" />
              </div>
              <Button onClick={handleSaveTraining} className="w-full" disabled={saving}>
                {saving ? 'Salvando...' : 'Cadastrar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Link/Edit Training Dialog */}
        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editingEtId ? 'Editar Treinamento' : 'Vincular Treinamento'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Colaborador *</Label>
                <Select value={linkForm.employee_id} onValueChange={v => setLinkForm(p => ({ ...p, employee_id: v }))} disabled={!!editingEtId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Treinamento *</Label>
                <Select value={linkForm.training_id} onValueChange={v => {
                  const tr = trainings.find(t => t.id === v);
                  const realizacao = linkForm.data_realizacao || new Date().toISOString().split('T')[0];
                  let validade = '';
                  if (tr?.periodicidade_meses) {
                    const d = new Date(realizacao);
                    d.setMonth(d.getMonth() + tr.periodicidade_meses);
                    validade = d.toISOString().split('T')[0];
                  }
                  setLinkForm(p => ({ ...p, training_id: v, data_validade: validade }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {trainings.map(t => <SelectItem key={t.id} value={t.id}>{t.nome} {t.periodicidade_meses ? `(${t.periodicidade_meses}m)` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Realização *</Label>
                  <Input type="date" value={linkForm.data_realizacao} onChange={e => {
                    const val = e.target.value;
                    setLinkForm(p => {
                      const tr = trainings.find(t => t.id === p.training_id);
                      let validade = p.data_validade;
                      if (tr?.periodicidade_meses) {
                        const d = new Date(val);
                        d.setMonth(d.getMonth() + tr.periodicidade_meses);
                        validade = d.toISOString().split('T')[0];
                      }
                      return { ...p, data_realizacao: val, data_validade: validade };
                    });
                  }} />
                </div>
                <div className="space-y-2">
                  <Label>Data Validade</Label>
                  <Input type="date" value={linkForm.data_validade} onChange={e => setLinkForm(p => ({ ...p, data_validade: e.target.value }))} />
                </div>
              </div>
              {linkForm.data_validade && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-500/10 rounded-lg px-3 py-2">
                  Validade calculada: {new Date(linkForm.data_validade + 'T00:00:00').toLocaleDateString('pt-BR')}
                </div>
              )}
              <Button onClick={handleSaveLink} className="w-full" disabled={saving}>
                {saving ? 'Salvando...' : editingEtId ? 'Atualizar' : 'Vincular'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteEtId} onOpenChange={() => setDeleteEtId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Treinamento</AlertDialogTitle>
              <AlertDialogDescription>Tem certeza? O histórico será removido permanentemente.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteET} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* History Dialog */}
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Histórico de Treinamentos — {historyName}</DialogTitle></DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Treinamento</TableHead>
                    <TableHead>Realização</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyETs.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Nenhum registro.</TableCell></TableRow>
                  ) : historyETs.map(et => (
                    <TableRow key={et.id}>
                      <TableCell>{et.trainings?.nome}</TableCell>
                      <TableCell>{formatDate(et.data_realizacao)}</TableCell>
                      <TableCell>{et.data_validade ? formatDate(et.data_validade) : '—'}</TableCell>
                      <TableCell>{getStatusBadge(et)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Treinamentos;
