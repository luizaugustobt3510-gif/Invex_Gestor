import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { HeartPulse, Plus, Upload, Download, Search } from 'lucide-react';

interface ASO {
  id: string;
  employee_id: string;
  tipo: string;
  data_realizacao: string;
  data_vencimento: string | null;
  arquivo_url: string | null;
  status: string;
  observacoes: string;
  employees?: { nome: string };
}

interface Employee {
  id: string;
  nome: string;
}

const tipoLabels: Record<string, string> = { admissional: 'Admissional', periodico: 'Periódico', demissional: 'Demissional' };

const ASOControl = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isViewer = user?.role === 'visualizador';
  const [asos, setAsos] = useState<ASO[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    employee_id: '', tipo: 'periodico', data_realizacao: '', data_vencimento: '', observacoes: '',
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { setLoading(false); return; }
    const { data: roleData } = await supabase.from('user_roles').select('company_id').eq('user_id', authUser.id).not('company_id', 'is', null).limit(1).single();
    const cId = roleData?.company_id || null;
    setCompanyId(cId);

    const [asoRes, empRes] = await Promise.all([
      supabase.from('employee_asos').select('*, employees(nome)').order('data_realizacao', { ascending: false }),
      supabase.from('employees').select('id, nome').eq('status', 'ativo').order('nome'),
    ]);

    setAsos(asoRes.data || []);
    setEmployees(empRes.data || []);
    setLoading(false);
  };

  const getStatusBadge = (aso: ASO) => {
    if (!aso.data_vencimento) return <Badge variant="secondary">N/A</Badge>;
    const diff = (new Date(aso.data_vencimento).getTime() - Date.now()) / 86400000;
    if (diff < 0) return <Badge variant="destructive">Vencido</Badge>;
    if (diff <= 30) return <Badge className="bg-amber-500 text-white">Próximo</Badge>;
    return <Badge className="bg-emerald-500 text-white">Válido</Badge>;
  };

  const handleSave = async () => {
    if (!form.employee_id || !form.data_realizacao) {
      toast({ title: 'Campos obrigatórios', description: 'Selecione colaborador e data.', variant: 'destructive' });
      return;
    }
    if (!companyId) return;
    setSaving(true);

    let arquivo_url: string | null = null;
    if (file) {
      const path = `${companyId}/${form.employee_id}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from('atestados').upload(path, file);
      if (!uploadErr) arquivo_url = path;
    }

    const { error } = await supabase.from('employee_asos').insert({
      company_id: companyId,
      employee_id: form.employee_id,
      tipo: form.tipo,
      data_realizacao: form.data_realizacao,
      data_vencimento: form.data_vencimento || null,
      observacoes: form.observacoes,
      arquivo_url,
    });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'ASO registrado!' });
      setDialogOpen(false);
      setForm({ employee_id: '', tipo: 'periodico', data_realizacao: '', data_vencimento: '', observacoes: '' });
      setFile(null);
      loadData();
    }
    setSaving(false);
  };

  const handleDownload = async (url: string) => {
    const { data } = await supabase.storage.from('atestados').createSignedUrl(url, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const filtered = asos.filter(a =>
    (a.employees?.nome || '').toLowerCase().includes(search.toLowerCase()) ||
    tipoLabels[a.tipo]?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2"><HeartPulse className="w-6 h-6" /> ASO — Atestado de Saúde Ocupacional</h1>
          {!isViewer && (
            <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Novo ASO</Button>
          )}
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar colaborador..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Realização</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Documento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum ASO registrado.</TableCell></TableRow>
                  ) : filtered.map(aso => (
                    <TableRow key={aso.id}>
                      <TableCell className="font-medium">{aso.employees?.nome}</TableCell>
                      <TableCell>{tipoLabels[aso.tipo] || aso.tipo}</TableCell>
                      <TableCell>{new Date(aso.data_realizacao + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{aso.data_vencimento ? new Date(aso.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</TableCell>
                      <TableCell>{getStatusBadge(aso)}</TableCell>
                      <TableCell>
                        {aso.arquivo_url ? (
                          <Button size="sm" variant="ghost" onClick={() => handleDownload(aso.arquivo_url!)}>
                            <Download className="w-4 h-4" />
                          </Button>
                        ) : '—'}
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
            <DialogHeader><DialogTitle>Novo ASO</DialogTitle></DialogHeader>
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
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admissional">Admissional</SelectItem>
                    <SelectItem value="periodico">Periódico</SelectItem>
                    <SelectItem value="demissional">Demissional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Realização *</Label>
                  <Input type="date" value={form.data_realizacao} onChange={e => setForm(p => ({ ...p, data_realizacao: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Data Vencimento</Label>
                  <Input type="date" value={form.data_vencimento} onChange={e => setForm(p => ({ ...p, data_vencimento: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} placeholder="Observações..." rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Documento (PDF)</Label>
                <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Registrar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default ASOControl;
