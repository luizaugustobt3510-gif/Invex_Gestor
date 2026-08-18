import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { hardDeleteById } from '@/lib/hardDelete';
import { FileText, Plus, Download, Pencil, Trash2, ListChecks, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Atestados = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ employee_id: '', data_inicio: '', data_fim: '', dias: '', motivo: '', cid: '' });
  const [reasons, setReasons] = useState<any[]>([]);
  const [reasonsOpen, setReasonsOpen] = useState(false);
  const [newReason, setNewReason] = useState('');
  const [savingReason, setSavingReason] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [certRes, empRes, reasonRes] = await Promise.all([
      supabase.from('employee_certificates').select('*, employees(nome)').order('data_inicio', { ascending: false }),
      supabase.from('employees').select('id, nome').eq('status', 'ativo').order('nome'),
      supabase.from('certificate_reasons').select('*').order('motivo'),
    ]);
    setCertificates(certRes.data || []);
    setEmployees(empRes.data || []);
    setReasons(reasonRes.data || []);
    setLoading(false);
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setForm({ employee_id: '', data_inicio: '', data_fim: '', dias: '', motivo: '', cid: '' });
    setFile(null);
    setDialogOpen(true);
  };

  const handleEdit = (c: any) => {
    setEditingId(c.id);
    setForm({ employee_id: c.employee_id, data_inicio: c.data_inicio, data_fim: c.data_fim, dias: String(c.dias), motivo: c.motivo || '', cid: c.cid || '' });
    setFile(null);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);

    const result = await hardDeleteById('employee_certificates', deleteId);

    if (!result.success) {
      toast({ title: 'Erro ao excluir', description: result.message, variant: 'destructive' });
      setDeleting(false);
      return;
    }

    setCertificates(prev => prev.filter(certificate => certificate.id !== deleteId));
    toast({ title: 'Atestado excluído', description: 'Registro removido permanentemente do banco de dados.' });
    setDeleting(false);
    setDeleteId(null);
    await loadData();
  };

  const handleSave = async () => {
    if (!form.employee_id || !form.data_inicio || !form.data_fim || !form.dias) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha colaborador, datas e dias.', variant: 'destructive' });
      return;
    }
    const dias = parseInt(form.dias);
    if (dias <= 0) {
      toast({ title: 'Valor inválido', description: 'Dias deve ser positivo.', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const retorno = new Date(new Date(form.data_fim + 'T00:00:00').getTime() + 86400000).toISOString().split('T')[0];

    let arquivo_url: string | null = null;
    if (file) {
      const ext = file.name.split('.').pop();
      const path = `${form.employee_id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('atestados').upload(path, file);
      if (uploadError) {
        toast({ title: 'Erro no upload', description: uploadError.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('atestados').getPublicUrl(path);
      arquivo_url = urlData.publicUrl;
    }

    if (editingId) {
      const updateData: any = { data_inicio: form.data_inicio, data_fim: form.data_fim, dias, motivo: form.motivo, cid: form.cid || null, data_retorno: retorno };
      if (arquivo_url) updateData.arquivo_url = arquivo_url;
      const { error } = await supabase.from('employee_certificates').update(updateData).eq('id', editingId);
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso', description: 'Atestado atualizado.' });
        setDialogOpen(false);
        loadData();
      }
    } else {
      const { data: emp } = await supabase.from('employees').select('company_id').eq('id', form.employee_id).single();
      const { error } = await supabase.from('employee_certificates').insert({
        employee_id: form.employee_id, company_id: emp?.company_id,
        data_inicio: form.data_inicio, data_fim: form.data_fim, dias, motivo: form.motivo, cid: form.cid || null, data_retorno: retorno, arquivo_url,
      });
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso', description: 'Atestado registrado.' });
        setDialogOpen(false);
        loadData();
      }
    }
    setFile(null);
    setSaving(false);
  };

  const handleAddReason = async () => {
    const motivo = newReason.trim();
    if (!motivo) return;
    if (reasons.some(r => r.motivo.toLowerCase() === motivo.toLowerCase())) {
      toast({ title: 'Motivo já cadastrado', variant: 'destructive' });
      return;
    }
    setSavingReason(true);
    const { data, error } = await supabase
      .from('certificate_reasons')
      .insert({ motivo, company_id: user?.companyId || null })
      .select()
      .single();
    setSavingReason(false);
    if (error) {
      toast({ title: 'Erro ao salvar motivo', description: error.message, variant: 'destructive' });
      return;
    }
    setReasons(prev => [...prev, data].sort((a, b) => a.motivo.localeCompare(b.motivo)));
    setNewReason('');
  };

  const handleRemoveReason = async (id: string) => {
    const { error } = await supabase.from('certificate_reasons').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir motivo', description: error.message, variant: 'destructive' });
      return;
    }
    setReasons(prev => prev.filter(r => r.id !== id));
  };

  const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6" /> Atestados Médicos</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={handleOpenNew} className="gap-2"><Plus className="w-4 h-4" /> Registrar Atestado</Button>
            <Button variant="outline" onClick={() => setReasonsOpen(true)} className="gap-2"><ListChecks className="w-4 h-4" /> Motivos</Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Data Início</TableHead>
                    <TableHead>Data Fim</TableHead>
                    <TableHead className="text-center">Dias</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>CID</TableHead>
                    <TableHead>Retorno</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead className="w-24 text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : certificates.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum atestado registrado.</TableCell></TableRow>
                  ) : certificates.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.employees?.nome}</TableCell>
                      <TableCell>{formatDate(c.data_inicio)}</TableCell>
                      <TableCell>{formatDate(c.data_fim)}</TableCell>
                      <TableCell className="text-center font-bold">{c.dias}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{c.motivo || '—'}</TableCell>
                      <TableCell className="uppercase">{c.cid || '—'}</TableCell>
                      <TableCell>{c.data_retorno ? formatDate(c.data_retorno) : (c.data_fim ? formatDate(c.data_fim) : '—')}</TableCell>
                      <TableCell>
                        {c.arquivo_url ? (
                          <Button size="sm" variant="outline" asChild className="gap-1">
                            <a href={c.arquivo_url} target="_blank" rel="noopener noreferrer"><Download className="w-3 h-3" /> PDF</a>
                          </Button>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(c)}><Pencil className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(c.id)}>
                            <Trash2 className="w-4 h-4" />
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

        {/* Form Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editingId ? 'Editar Atestado' : 'Registrar Atestado'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Colaborador *</Label>
                <Select value={form.employee_id} onValueChange={v => setForm(p => ({ ...p, employee_id: v }))} disabled={!!editingId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Início *</Label>
                  <Input type="date" value={form.data_inicio} onChange={e => setForm(p => ({ ...p, data_inicio: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim *</Label>
                  <Input type="date" value={form.data_fim} onChange={e => setForm(p => ({ ...p, data_fim: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Quantidade de Dias *</Label>
                <Input type="number" min="1" value={form.dias} onChange={e => setForm(p => ({ ...p, dias: e.target.value }))} placeholder="Ex: 3" />
              </div>
              <div className="space-y-2">
                <Label>Motivo</Label>
                {reasons.length > 0 && (
                  <Select value={reasons.some(r => r.motivo === form.motivo) ? form.motivo : ''} onValueChange={v => setForm(p => ({ ...p, motivo: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione um motivo cadastrado..." /></SelectTrigger>
                    <SelectContent>
                      {reasons.map(r => <SelectItem key={r.id} value={r.motivo}>{r.motivo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <Textarea value={form.motivo} onChange={e => setForm(p => ({ ...p, motivo: e.target.value }))} placeholder="Motivo do atestado..." />
              </div>
              <div className="space-y-2">
                <Label>CID</Label>
                <Input value={form.cid} onChange={e => setForm(p => ({ ...p, cid: e.target.value.toUpperCase() }))} placeholder="Ex: M54.5" className="uppercase" />
              </div>
              <div className="space-y-2">
                <Label>Arquivo (PDF)</Label>
                <Input type="file" accept=".pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
              </div>
              <Button onClick={handleSave} className="w-full" disabled={saving}>
                {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Registrar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reasons Management */}
        <Dialog open={reasonsOpen} onOpenChange={setReasonsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Motivos de Atestado</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newReason}
                  onChange={e => setNewReason(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddReason(); }}
                  placeholder="Novo motivo (ex: Consulta médica)"
                />
                <Button onClick={handleAddReason} disabled={savingReason}>Adicionar</Button>
              </div>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {reasons.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum motivo cadastrado.</p>
                ) : reasons.map(r => (
                  <div key={r.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                    <span className="text-sm">{r.motivo}</span>
                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleRemoveReason(r.id)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir atestado</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este atestado? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleting ? 'Excluindo...' : 'Excluir permanentemente'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default Atestados;
