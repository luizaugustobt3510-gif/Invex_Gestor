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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, Plus, UserPlus, AlertTriangle } from 'lucide-react';

const Treinamentos = () => {
  const { toast } = useToast();
  const [trainings, setTrainings] = useState<any[]>([]);
  const [employeeTrainings, setEmployeeTrainings] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', descricao: '', obrigatorio: false, periodicidade_meses: '' });
  const [linkForm, setLinkForm] = useState({ employee_id: '', training_id: '', data_realizacao: '', data_validade: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [tRes, etRes, empRes] = await Promise.all([
      supabase.from('trainings').select('*').order('nome'),
      supabase.from('employee_trainings').select('*, employees(nome), trainings(nome, obrigatorio)').order('data_realizacao', { ascending: false }),
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
      toast({ title: 'Sucesso', description: 'Treinamento cadastrado.' });
      setDialogOpen(false);
      loadData();
    }
    setSaving(false);
  };

  const handleLinkTraining = async () => {
    if (!linkForm.employee_id || !linkForm.training_id || !linkForm.data_realizacao) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const companyId = await getCompanyId();
    if (!companyId) { setSaving(false); return; }

    const { error } = await supabase.from('employee_trainings').insert({
      company_id: companyId,
      employee_id: linkForm.employee_id,
      training_id: linkForm.training_id,
      data_realizacao: linkForm.data_realizacao,
      data_validade: linkForm.data_validade || null,
      status: 'vigente',
    });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Treinamento vinculado.' });
      setLinkDialogOpen(false);
      loadData();
    }
    setSaving(false);
  };

  const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
  const hoje = new Date().toISOString().split('T')[0];

  const vencidos = employeeTrainings.filter(et => et.data_validade && et.data_validade < hoje);
  const proximosVencer = employeeTrainings.filter(et => {
    if (!et.data_validade) return false;
    const diff = (new Date(et.data_validade).getTime() - Date.now()) / 86400000;
    return diff >= 0 && diff <= 30;
  });

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2"><GraduationCap className="w-6 h-6" /> Treinamentos</h1>
          <div className="flex gap-2">
            <Button onClick={() => { setForm({ nome: '', descricao: '', obrigatorio: false, periodicidade_meses: '' }); setDialogOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" /> Novo Treinamento
            </Button>
            <Button variant="outline" onClick={() => { setLinkForm({ employee_id: '', training_id: '', data_realizacao: '', data_validade: '' }); setLinkDialogOpen(true); }} className="gap-2">
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

        <Tabs defaultValue="catalogo">
          <TabsList>
            <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
            <TabsTrigger value="realizados">Realizados</TabsTrigger>
          </TabsList>

          <TabsContent value="catalogo">
            <Card>
              <CardContent className="p-0">
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="realizados">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Treinamento</TableHead>
                      <TableHead>Realização</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                    ) : employeeTrainings.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum registro.</TableCell></TableRow>
                    ) : employeeTrainings.map(et => {
                      const vencido = et.data_validade && et.data_validade < hoje;
                      return (
                        <TableRow key={et.id}>
                          <TableCell className="font-medium">{et.employees?.nome}</TableCell>
                          <TableCell>{et.trainings?.nome}</TableCell>
                          <TableCell>{formatDate(et.data_realizacao)}</TableCell>
                          <TableCell>{et.data_validade ? formatDate(et.data_validade) : '—'}</TableCell>
                          <TableCell>
                            <Badge variant={vencido ? 'destructive' : 'default'}>
                              {vencido ? 'Vencido' : 'Vigente'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
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

        {/* Link Training Dialog */}
        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Vincular Treinamento</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Colaborador *</Label>
                <Select value={linkForm.employee_id} onValueChange={v => setLinkForm(p => ({ ...p, employee_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Treinamento *</Label>
                <Select value={linkForm.training_id} onValueChange={v => setLinkForm(p => ({ ...p, training_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {trainings.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Realização *</Label>
                  <Input type="date" value={linkForm.data_realizacao} onChange={e => setLinkForm(p => ({ ...p, data_realizacao: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Data Validade</Label>
                  <Input type="date" value={linkForm.data_validade} onChange={e => setLinkForm(p => ({ ...p, data_validade: e.target.value }))} />
                </div>
              </div>
              <Button onClick={handleLinkTraining} className="w-full" disabled={saving}>
                {saving ? 'Salvando...' : 'Vincular'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Treinamentos;
