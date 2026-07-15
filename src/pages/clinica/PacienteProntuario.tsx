import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Search, Paperclip, Trash2, Pencil, Download, FileText, ClipboardList, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { toast } from 'sonner';
import { downloadPdfFromUrl } from '@/lib/pdfDownload';
import { Link as RouterLink } from 'react-router-dom';

interface Patient {
  id: string; company_id: string; nome: string; cpf: string | null;
  birth_date: string | null; phone: string | null; email: string | null;
  gender: string | null; address: string | null; notes: string | null;
}

interface MRecord {
  id: string;
  record_date: string;
  record_time: string;
  professional_name: string | null;
  attendance_type: string | null;
  clinical_evolution: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

interface Attachment {
  id: string; record_id: string; file_path: string; file_name: string; mime_type: string | null;
}

const ACCEPT = 'application/pdf,image/jpeg,image/png';

interface Anamnese {
  id: string;
  created_at: string;
  exam_type: string;
  template_name: string | null;
  created_by_name: string | null;
  pdf_path: string | null;
}

export default function PacienteProntuario() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { canAccessModule } = useModuleAccess();
  const hasAnamnese = canAccessModule('anamnese');
  const hasEvolucao = canAccessModule('evolucao');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [records, setRecords] = useState<MRecord[]>([]);
  const [anamneses, setAnamneses] = useState<Anamnese[]>([]);
  const [attachments, setAttachments] = useState<{ [recordId: string]: Attachment[] }>({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [searchProf, setSearchProf] = useState('');
  const [searchDate, setSearchDate] = useState('');

  const [dlgOpen, setDlgOpen] = useState(false);
  const [editing, setEditing] = useState<MRecord | null>(null);
  const [form, setForm] = useState({
    record_date: new Date().toISOString().slice(0, 10),
    record_time: new Date().toTimeString().slice(0, 5),
    professional_name: '',
    attendance_type: '',
    clinical_evolution: '',
    observations: '',
  });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: p }, { data: rs }, { data: ans }] = await Promise.all([
      supabase.from('patients').select('*').eq('id', id).maybeSingle(),
      supabase.from('medical_records').select('*').eq('patient_id', id).order('record_date', { ascending: false }).order('record_time', { ascending: false }),
      supabase.from('anamneses').select('id, created_at, exam_type, template_name, created_by_name, pdf_path').eq('patient_id', id).order('created_at', { ascending: false }),
    ]);
    setPatient((p as Patient) || null);
    setRecords((rs as MRecord[]) || []);
    setAnamneses((ans as Anamnese[]) || []);

    if (rs && rs.length) {
      const ids = rs.map((r: any) => r.id);
      const { data: atts } = await supabase.from('medical_record_attachments').select('*').in('record_id', ids);
      const grouped: any = {};
      (atts || []).forEach((a: any) => {
        grouped[a.record_id] = grouped[a.record_id] || [];
        grouped[a.record_id].push(a);
      });
      setAttachments(grouped);
    } else {
      setAttachments({});
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const openNew = () => {
    setEditing(null);
    setForm({
      record_date: new Date().toISOString().slice(0, 10),
      record_time: new Date().toTimeString().slice(0, 5),
      professional_name: user?.nome || '',
      attendance_type: '',
      clinical_evolution: '',
      observations: '',
    });
    setPendingFiles([]);
    setDlgOpen(true);
  };

  const openEdit = (r: MRecord) => {
    setEditing(r);
    setForm({
      record_date: r.record_date,
      record_time: (r.record_time || '').slice(0, 5),
      professional_name: r.professional_name || '',
      attendance_type: r.attendance_type || '',
      clinical_evolution: r.clinical_evolution || '',
      observations: r.observations || '',
    });
    setPendingFiles([]);
    setDlgOpen(true);
  };

  const uploadFiles = async (recordId: string, files: File[]) => {
    if (!patient) return;
    const uid = (await supabase.auth.getUser()).data.user?.id;
    for (const f of files) {
      const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${patient.company_id}/${recordId}/${Date.now()}_${safe}`;
      const { error: upErr } = await supabase.storage.from('prontuario-anexos').upload(path, f, {
        contentType: f.type, upsert: false,
      });
      if (upErr) { toast.error(`Falha no upload de ${f.name}`); continue; }
      await supabase.from('medical_record_attachments').insert({
        company_id: patient.company_id,
        record_id: recordId,
        file_path: path,
        file_name: f.name,
        mime_type: f.type,
        size_bytes: f.size,
        uploaded_by: uid,
      });
    }
  };

  const save = async () => {
    if (!patient) return;
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!form.clinical_evolution.trim() && !form.observations.trim()) {
      toast.error('Preencha a evolução ou observação'); return;
    }
    if (editing) {
      const { error } = await supabase.from('medical_records').update({
        record_date: form.record_date,
        record_time: form.record_time,
        professional_name: form.professional_name || null,
        attendance_type: form.attendance_type || null,
        clinical_evolution: form.clinical_evolution || null,
        observations: form.observations || null,
        updated_by: uid,
      }).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
      if (pendingFiles.length) await uploadFiles(editing.id, pendingFiles);
      toast.success('Registro atualizado');
    } else {
      const { data, error } = await supabase.from('medical_records').insert({
        company_id: patient.company_id,
        patient_id: patient.id,
        record_date: form.record_date,
        record_time: form.record_time,
        professional_name: form.professional_name || null,
        professional_user_id: uid,
        attendance_type: form.attendance_type || null,
        clinical_evolution: form.clinical_evolution || null,
        observations: form.observations || null,
        created_by: uid,
      }).select('id').single();
      if (error || !data) { toast.error(error?.message || 'Erro ao salvar'); return; }
      if (pendingFiles.length) await uploadFiles(data.id, pendingFiles);
      toast.success('Registro criado');
    }
    setDlgOpen(false);
    load();
  };

  const remove = async (r: MRecord) => {
    if (!confirm('Excluir este registro e todos os anexos?')) return;
    // Remove attachment files
    const atts = attachments[r.id] || [];
    for (const a of atts) {
      await supabase.storage.from('prontuario-anexos').remove([a.file_path]);
    }
    await supabase.from('medical_records').delete().eq('id', r.id);
    toast.success('Registro excluído');
    load();
  };

  const download = async (a: Attachment) => {
    const { data, error } = await supabase.storage.from('prontuario-anexos').createSignedUrl(a.file_path, 60);
    if (error || !data) { toast.error('Erro ao gerar link'); return; }
    window.open(data.signedUrl, '_blank');
  };

  const deleteAttachment = async (a: Attachment) => {
    if (!confirm('Excluir anexo?')) return;
    await supabase.storage.from('prontuario-anexos').remove([a.file_path]);
    await supabase.from('medical_record_attachments').delete().eq('id', a.id);
    load();
  };

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (searchDate && r.record_date !== searchDate) return false;
      if (searchProf && !(r.professional_name || '').toLowerCase().includes(searchProf.toLowerCase())) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${r.attendance_type || ''} ${r.clinical_evolution || ''} ${r.observations || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [records, search, searchProf, searchDate]);

  if (loading) return <MainLayout><div className="p-8 text-center text-muted-foreground">Carregando...</div></MainLayout>;
  if (!patient) return <MainLayout><div className="p-8 text-center">Paciente não encontrado.</div></MainLayout>;

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm"><Link to="/clinica/pacientes"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Link></Button>
          <div>
            <h1 className="text-2xl font-bold">{patient.nome}</h1>
            <p className="text-sm text-muted-foreground">
              {patient.cpf && <>CPF: {patient.cpf} · </>}
              {patient.phone && <>Tel: {patient.phone}</>}
            </p>
          </div>
        </div>

        <Tabs defaultValue="prontuario">
          <TabsList>
            <TabsTrigger value="ficha">Ficha</TabsTrigger>
            <TabsTrigger value="prontuario">📄 Prontuário</TabsTrigger>
            {hasAnamnese && <TabsTrigger value="anamneses">Anamneses</TabsTrigger>}
          </TabsList>

          <TabsContent value="ficha">
            <Card>
              <CardContent className="grid grid-cols-2 gap-4 pt-6">
                <div><Label>Nascimento</Label><div className="text-sm">{patient.birth_date || '-'}</div></div>
                <div><Label>Sexo</Label><div className="text-sm">{patient.gender || '-'}</div></div>
                <div><Label>E-mail</Label><div className="text-sm">{patient.email || '-'}</div></div>
                <div><Label>Endereço</Label><div className="text-sm">{patient.address || '-'}</div></div>
                <div className="col-span-2"><Label>Observações</Label><div className="text-sm whitespace-pre-wrap">{patient.notes || '-'}</div></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prontuario" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><FileText className="w-4 h-4" /> Histórico clínico</CardTitle>
                <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Novo registro</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Palavra-chave" value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <Input placeholder="Profissional" value={searchProf} onChange={e => setSearchProf(e.target.value)} />
                  <Input type="date" value={searchDate} onChange={e => setSearchDate(e.target.value)} />
                </div>

                {filtered.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">Nenhum registro encontrado.</div>
                ) : (
                  <div className="space-y-3">
                    {filtered.map(r => (
                      <Card key={r.id} className="border">
                        <CardContent className="pt-4 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">{new Date(r.record_date + 'T00:00:00').toLocaleDateString('pt-BR')} · {(r.record_time || '').slice(0, 5)}</Badge>
                              {r.attendance_type && <Badge>{r.attendance_type}</Badge>}
                              {r.professional_name && <span className="text-sm text-muted-foreground">Prof.: {r.professional_name}</span>}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                              <Button size="sm" variant="destructive" onClick={() => remove(r)}><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          </div>
                          {r.clinical_evolution && (
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground uppercase">Evolução</div>
                              <div className="text-sm whitespace-pre-wrap">{r.clinical_evolution}</div>
                            </div>
                          )}
                          {r.observations && (
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground uppercase">Observações</div>
                              <div className="text-sm whitespace-pre-wrap">{r.observations}</div>
                            </div>
                          )}
                          {(attachments[r.id] || []).length > 0 && (
                            <div className="pt-2 border-t">
                              <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Anexos</div>
                              <div className="flex flex-wrap gap-2">
                                {(attachments[r.id] || []).map((a: Attachment) => (
                                  <div key={a.id} className="flex items-center gap-1 border rounded px-2 py-1 text-xs">
                                    <Paperclip className="w-3 h-3" />
                                    <button className="hover:underline" onClick={() => download(a)}>{a.file_name}</button>
                                    <Download className="w-3 h-3 cursor-pointer" onClick={() => download(a)} />
                                    <Trash2 className="w-3 h-3 cursor-pointer text-destructive" onClick={() => deleteAttachment(a)} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="text-[10px] text-muted-foreground pt-1">
                            Criado em {new Date(r.created_at).toLocaleString('pt-BR')} · Atualizado em {new Date(r.updated_at).toLocaleString('pt-BR')}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {hasAnamnese && (
            <TabsContent value="anamneses" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Anamneses do paciente</CardTitle>
                  <Button asChild className="gap-2">
                    <RouterLink to={`/clinica/anamnese/nova?patient=${id}`}>
                      <Plus className="w-4 h-4" /> Nova anamnese
                    </RouterLink>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {anamneses.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">Nenhuma anamnese registrada.</div>
                  ) : (
                    <div className="space-y-2">
                      {anamneses.map(a => (
                        <div key={a.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{new Date(a.created_at).toLocaleString('pt-BR')}</Badge>
                              <Badge>{a.exam_type}</Badge>
                              {a.template_name && <span className="text-xs text-muted-foreground">Modelo: {a.template_name}</span>}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              ID: {a.id.substring(0, 8).toUpperCase()}
                              {a.created_by_name && <> · Por: {a.created_by_name}</>}
                            </div>
                          </div>
                          {a.pdf_path && (
                            <Button size="sm" variant="outline" onClick={async () => {
                              const { data } = await supabase.storage.from('anamnese-pdfs').createSignedUrl(a.pdf_path!, 3600);
                              if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                              else toast.error('Não foi possível abrir o PDF');
                            }}>
                              <Download className="w-3.5 h-3.5 mr-1" /> PDF
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing ? 'Editar registro' : 'Novo registro de prontuário'}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data *</Label><Input type="date" value={form.record_date} onChange={e => setForm({ ...form, record_date: e.target.value })} /></div>
              <div><Label>Hora *</Label><Input type="time" value={form.record_time} onChange={e => setForm({ ...form, record_time: e.target.value })} /></div>
              <div><Label>Profissional responsável</Label><Input value={form.professional_name} onChange={e => setForm({ ...form, professional_name: e.target.value })} /></div>
              <div><Label>Tipo de atendimento</Label><Input placeholder="Ex.: Consulta, Retorno..." value={form.attendance_type} onChange={e => setForm({ ...form, attendance_type: e.target.value })} /></div>
              <div className="col-span-2"><Label>Evolução clínica</Label><Textarea rows={5} value={form.clinical_evolution} onChange={e => setForm({ ...form, clinical_evolution: e.target.value })} /></div>
              <div className="col-span-2"><Label>Observações</Label><Textarea rows={3} value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} /></div>
              <div className="col-span-2">
                <Label>Anexos (PDF, JPG, PNG)</Label>
                <input ref={fileRef} type="file" multiple accept={ACCEPT} className="hidden"
                  onChange={e => setPendingFiles(Array.from(e.target.files || []))} />
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                    <Paperclip className="w-4 h-4 mr-1" /> Selecionar arquivos
                  </Button>
                  <span className="text-xs text-muted-foreground">{pendingFiles.length} arquivo(s)</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDlgOpen(false)}>Cancelar</Button>
              <Button onClick={save}>{editing ? 'Salvar alterações' : 'Criar registro'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
