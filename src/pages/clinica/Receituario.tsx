import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  ArrowLeft, Save, Loader2, FileText, ChevronsUpDown, Check, Plus, Trash2, Pencil, Printer, History, Sparkles,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { DocumentSignaturePicker, DocumentSignatureValue } from '@/components/DocumentSignaturePicker';

interface Patient { id: string; nome: string; cpf: string | null; birth_date: string | null; }

interface Prescription {
  id: string;
  patient_id: string;
  tipo: string;
  content: string;
  observacoes: string | null;
  professional_name: string | null;
  professional_signature: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

const TIPOS: { value: string; label: string }[] = [
  { value: 'simples', label: 'Receita Simples' },
  { value: 'especial', label: 'Receita Especial' },
  { value: 'controlada', label: 'Receita Controlada' },
];

const tipoLabel = (t: string) => TIPOS.find(x => x.value === t)?.label || t;

const TEMPLATE_PLACEHOLDER =
  '1) Medicamento — dosagem\n    Tomar ___ a cada ___ horas por ___ dias.\n\n2) Medicamento — dosagem\n    ...';

const QUICK_MEDS: { label: string; text: string }[] = [
  { label: 'Dipirona 500mg', text: 'Dipirona 500mg — 1 comprimido via oral a cada 6 horas em caso de dor ou febre por até 3 dias.' },
  { label: 'Paracetamol 750mg', text: 'Paracetamol 750mg — 1 comprimido via oral a cada 6 horas em caso de dor ou febre por até 3 dias.' },
  { label: 'Ibuprofeno 600mg', text: 'Ibuprofeno 600mg — 1 comprimido via oral a cada 8 horas após as refeições por 5 dias.' },
  { label: 'Amoxicilina 500mg', text: 'Amoxicilina 500mg — 1 cápsula via oral a cada 8 horas por 7 dias.' },
  { label: 'Azitromicina 500mg', text: 'Azitromicina 500mg — 1 comprimido via oral 1x ao dia por 5 dias.' },
  { label: 'Omeprazol 20mg', text: 'Omeprazol 20mg — 1 cápsula via oral em jejum, 1x ao dia por 30 dias.' },
  { label: 'Loratadina 10mg', text: 'Loratadina 10mg — 1 comprimido via oral 1x ao dia por 7 dias.' },
  { label: 'Dexametasona 4mg', text: 'Dexametasona 4mg — 1 comprimido via oral 1x ao dia por 3 dias.' },
  { label: 'Soro fisiológico nasal', text: 'Soro fisiológico 0,9% — 2 jatos em cada narina 3x ao dia por 7 dias.' },
  { label: 'Repouso e hidratação', text: 'Orientações: repouso relativo e hidratação oral abundante por 48 horas.' },
];

export default function Receituario() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams<{ patientId?: string }>();

  const isAdmin = ['super_admin', 'admin_empresa', 'superadm', 'admin'].includes(user?.role || '');
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setAuthUserId(data.user?.id || null)); }, []);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState<string>(params.patientId || '');
  const [patientPopoverOpen, setPatientPopoverOpen] = useState(false);

  const [items, setItems] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);

  const [tipo, setTipo] = useState<string>('simples');
  const [content, setContent] = useState('');
  const [obs, setObs] = useState('');
  const [profName, setProfName] = useState(user?.nome || '');
  const [profSig, setProfSig] = useState<DocumentSignatureValue>({ mode: 'none' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [viewing, setViewing] = useState<Prescription | null>(null);

  const patient = useMemo(() => patients.find(p => p.id === patientId) || null, [patients, patientId]);

  const [lastPatient, setLastPatient] = useState<Patient | null>(null);

  const loadPatients = async () => {
    if (!user?.companyId) return;
    const { data } = await supabase
      .from('patients')
      .select('id, nome, cpf, birth_date, created_at')
      .eq('company_id', user.companyId)
      .order('nome');
    const rows = (data || []) as any[];
    setPatients(rows as any);
    const latest = [...rows].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0];
    setLastPatient((latest as any) || null);
  };

  const loadItems = async (pid: string) => {
    if (!pid) { setItems([]); return; }
    setLoading(true);
    const { data, error } = await (supabase.from('prescriptions' as any) as any)
      .select('*').eq('patient_id', pid).order('created_at', { ascending: false });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setItems((data || []) as any);
  };

  useEffect(() => { loadPatients(); }, [user?.companyId]);
  useEffect(() => { loadItems(patientId); }, [patientId]);

  const resetForm = () => {
    setEditingId(null);
    setTipo('simples');
    setContent('');
    setObs('');
    setProfName(user?.nome || '');
    setProfSig({ mode: 'none' });
  };

  const openEdit = (rx: Prescription) => {
    setEditingId(rx.id);
    setTipo(rx.tipo || 'simples');
    setContent(rx.content || '');
    setObs(rx.observacoes || '');
    setProfName(rx.professional_name || user?.nome || '');
    if (rx.professional_signature) {
      setProfSig({ mode: 'now', dataUrl: rx.professional_signature });
    } else {
      setProfSig({ mode: 'none' });
    }
  };

  const save = async () => {
    if (!user?.companyId) return;
    if (!patientId) { toast.error('Selecione o paciente'); return; }
    if (!content.trim()) { toast.error('Descreva os medicamentos e a posologia'); return; }
    setSaving(true);
    const uidUser = (await supabase.auth.getUser()).data.user?.id;
    const payload: any = {
      company_id: user.companyId,
      patient_id: patientId,
      tipo,
      content: content.trim(),
      observacoes: obs.trim() || null,
      professional_name: profName.trim() || null,
      professional_signature:
        profSig.mode === 'now'
          ? profSig.dataUrl || null
          : profSig.mode === 'saved'
            ? profSig.signedUrl || null
            : null,
    };
    let error: any = null;
    if (editingId) {
      const res = await (supabase.from('prescriptions' as any) as any)
        .update(payload).eq('id', editingId);
      error = res.error;
    } else {
      payload.created_by = uidUser;
      payload.created_by_name = user.nome || null;
      const res = await (supabase.from('prescriptions' as any) as any).insert(payload);
      error = res.error;
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? 'Receita atualizada' : 'Receita registrada');
    resetForm();
    loadItems(patientId);
  };

  const remove = async (rx: Prescription) => {
    if (!confirm('Excluir esta receita?')) return;
    const { error } = await (supabase.from('prescriptions' as any) as any).delete().eq('id', rx.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Receita excluída');
    if (editingId === rx.id) resetForm();
    loadItems(patientId);
  };

  const printRx = (rx: Prescription) => {
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) { toast.error('Ative popups para imprimir'); return; }
    const dt = new Date(rx.created_at);
    const dataStr = dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR').slice(0, 5);
    const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const sigImg = rx.professional_signature
      ? `<img src="${rx.professional_signature}" style="max-height:80px;" />`
      : '';
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receita - ${esc(patient?.nome || '')}</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color:#111; }
        h1 { font-size: 20px; margin: 0 0 6px; }
        .muted { color:#555; font-size: 12px; }
        .box { border:1px solid #ddd; border-radius:8px; padding:16px; margin-top:16px; }
        pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; line-height: 1.5; margin:0; }
        .sig { margin-top: 60px; text-align:center; }
        .sig .line { border-top:1px solid #333; width: 320px; margin: 0 auto 6px; }
      </style></head><body>
      <h1>Receita Médica</h1>
      <div class="muted">Emitida em ${dataStr}</div>
      <div class="box">
        <div><strong>Paciente:</strong> ${esc(patient?.nome || '')} ${patient?.cpf ? ' — CPF: ' + esc(patient.cpf) : ''}</div>
      </div>
      <div class="box">
        <div class="muted" style="margin-bottom:8px;">Prescrição</div>
        <pre>${esc(rx.content)}</pre>
      </div>
      ${rx.observacoes ? `<div class="box"><div class="muted" style="margin-bottom:8px;">Observações</div><pre>${esc(rx.observacoes)}</pre></div>` : ''}
      <div class="sig">
        ${sigImg}
        <div class="line"></div>
        <div>${esc(rx.professional_name || rx.created_by_name || '')}</div>
      </div>
      <script>window.onload = () => { window.print(); }<\/script>
      </body></html>`);
    w.document.close();
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" /> Receituário
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? 'Editar receita' : 'Nova receita'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <Label>Paciente *</Label>
                <div className="flex gap-2">
                  <Popover open={patientPopoverOpen} onOpenChange={setPatientPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="flex-1 justify-between">
                        {patient ? patient.nome : 'Selecione um paciente'}
                        <ChevronsUpDown className="w-4 h-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar paciente..." />
                        <CommandList>
                          <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
                          <CommandGroup>
                            {patients.map(p => (
                              <CommandItem
                                key={p.id}
                                value={`${p.nome} ${p.cpf || ''}`}
                                onSelect={() => {
                                  setPatientId(p.id);
                                  setPatientPopoverOpen(false);
                                }}
                              >
                                <Check className={`w-4 h-4 mr-2 ${p.id === patientId ? 'opacity-100' : 'opacity-0'}`} />
                                <span>{p.nome}</span>
                                {p.cpf && <span className="ml-2 text-xs text-muted-foreground">{p.cpf}</span>}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {lastPatient && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title={`Usar último paciente: ${lastPatient.nome}`}
                      onClick={() => setPatientId(lastPatient.id)}
                    >
                      <History className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Label>Tipo de receita *</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Medicamentos e posologia *</Label>
              <Textarea
                rows={8}
                placeholder={TEMPLATE_PLACEHOLDER}
                value={content}
                onChange={e => setContent(e.target.value)}
              />
              <div className="mt-2">
                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                  <Sparkles className="w-3.5 h-3.5" /> Prescrições rápidas (clique para adicionar)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_MEDS.map(qm => (
                    <Button
                      key={qm.label}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        const line = `${content.trim() ? content.trimEnd() + '\n' : ''}${qm.text}\n`;
                        setContent(line);
                      }}
                    >
                      + {qm.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea rows={3} value={obs} onChange={e => setObs(e.target.value)} placeholder="Orientações adicionais ao paciente" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Profissional</Label>
                <Input value={profName} onChange={e => setProfName(e.target.value)} placeholder="Nome / CRM" />
              </div>
              <div>
                <DocumentSignaturePicker onChange={setProfSig} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-end pt-2">
              {editingId && (
                <Button variant="ghost" onClick={resetForm}>Cancelar edição</Button>
              )}
              <Button onClick={save} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingId ? 'Salvar alterações' : 'Registrar receita'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico do paciente</CardTitle>
          </CardHeader>
          <CardContent>
            {!patientId ? (
              <div className="text-center text-muted-foreground py-8">Selecione um paciente para ver as receitas.</div>
            ) : loading ? (
              <div className="text-center text-muted-foreground py-8">Carregando...</div>
            ) : items.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">Nenhuma receita registrada.</div>
            ) : (
              <div className="space-y-2">
                {items.map(rx => {
                  const canEdit = isAdmin || rx.created_by === authUserId;
                  return (
                    <div key={rx.id} className="border rounded-md p-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary">{tipoLabel(rx.tipo)}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(rx.created_at).toLocaleString('pt-BR')}
                          </span>
                          {rx.created_by_name && (
                            <span className="text-xs text-muted-foreground">· {rx.created_by_name}</span>
                          )}
                        </div>
                        <div className="text-sm mt-1 line-clamp-2 whitespace-pre-wrap">{rx.content}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setViewing(rx)}>Ver</Button>
                        <Button size="sm" variant="outline" onClick={() => printRx(rx)} className="gap-1">
                          <Printer className="w-3.5 h-3.5" /> Imprimir
                        </Button>
                        {canEdit && (
                          <Button size="sm" variant="outline" onClick={() => openEdit(rx)} className="gap-1">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {canEdit && (
                          <Button size="sm" variant="destructive" onClick={() => remove(rx)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {viewing ? tipoLabel(viewing.tipo) : 'Receita'}
              </DialogTitle>
            </DialogHeader>
            {viewing && (
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  {new Date(viewing.created_at).toLocaleString('pt-BR')} · {viewing.professional_name || viewing.created_by_name || '-'}
                </div>
                <div>
                  <Label className="text-xs">Prescrição</Label>
                  <pre className="text-sm whitespace-pre-wrap border rounded p-3 bg-muted/30">{viewing.content}</pre>
                </div>
                {viewing.observacoes && (
                  <div>
                    <Label className="text-xs">Observações</Label>
                    <pre className="text-sm whitespace-pre-wrap border rounded p-3 bg-muted/30">{viewing.observacoes}</pre>
                  </div>
                )}
                {viewing.professional_signature && (
                  <div>
                    <Label className="text-xs">Assinatura</Label>
                    <img src={viewing.professional_signature} className="max-h-24 border rounded bg-white p-2" alt="Assinatura" />
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              {viewing && (
                <Button onClick={() => printRx(viewing)} className="gap-2">
                  <Printer className="w-4 h-4" /> Imprimir
                </Button>
              )}
              <Button variant="outline" onClick={() => setViewing(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
