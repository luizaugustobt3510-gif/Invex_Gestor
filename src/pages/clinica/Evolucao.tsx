import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  ArrowLeft, Save, Loader2, Activity, ChevronsUpDown, Check, MessageSquarePlus,
  History, Trash2, FileText, Type as TypeIcon, PenLine,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { SignaturePad, SignaturePadHandle } from '@/components/SignaturePad';
import { DocumentSignaturePicker, DocumentSignatureValue } from '@/components/DocumentSignaturePicker';

interface Patient { id: string; nome: string; cpf: string | null; created_at?: string; }

interface QuickMsg { id: string; title: string; content: string; }

interface Evolution {
  id: string;
  patient_id: string;
  content: string;
  professional_name: string | null;
  created_by_name: string | null;
  patient_signature: string | null;
  professional_signature: string | null;
  signature_type: string | null;
  created_at: string;
}

type SigMode = 'draw' | 'type' | 'none';


export default function Evolucao() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams<{ patientId?: string }>();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState<string>(params.patientId || '');
  const [patientPopoverOpen, setPatientPopoverOpen] = useState(false);

  const [quickMsgs, setQuickMsgs] = useState<QuickMsg[]>([]);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const [patientSigMode, setPatientSigMode] = useState<SigMode>('draw');
  const [patientTypedSig, setPatientTypedSig] = useState('');
  const patientSigRef = useRef<SignaturePadHandle>(null);
  // Professional signature — supports saved | draw-now | none via DocumentSignaturePicker
  const [profSig, setProfSig] = useState<DocumentSignatureValue>({ mode: 'none' });


  const [history, setHistory] = useState<Evolution[]>([]);
  const [viewing, setViewing] = useState<Evolution | null>(null);

  const load = async () => {
    if (!user?.companyId) return;
    const [{ data: pats }, { data: msgs }] = await Promise.all([
      supabase.from('patients').select('id, nome, cpf, created_at').eq('company_id', user.companyId).order('nome'),
      (supabase.from('evolution_quick_messages' as any) as any)
        .select('id, title, content')
        .eq('company_id', user.companyId).eq('is_active', true).order('title'),
    ]);
    setPatients((pats || []) as any);
    setQuickMsgs(((msgs || []) as any) as QuickMsg[]);
  };

  const loadHistory = async (pid: string) => {
    if (!pid) { setHistory([]); return; }
    const { data } = await (supabase.from('clinical_evolutions' as any) as any)
      .select('*')
      .eq('patient_id', pid)
      .order('created_at', { ascending: false });
    setHistory(((data || []) as any) as Evolution[]);
  };

  useEffect(() => { load(); }, [user?.companyId]);
  useEffect(() => { loadHistory(patientId); }, [patientId]);

  const selectedPatient = useMemo(() => patients.find(p => p.id === patientId), [patients, patientId]);
  const lastPatient = useMemo(() => {
    if (!patients.length) return null;
    return [...patients].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];
  }, [patients]);

  const insertMessage = (m: QuickMsg) => {
    setContent(prev => (prev ? `${prev}\n\n${m.content}` : m.content));
  };

  const buildTypedSignature = (name: string): string | null => {
    if (!name.trim()) return null;
    // Render typed name onto canvas for consistent storage format
    const c = document.createElement('canvas');
    c.width = 600;
    c.height = 160;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#111';
    ctx.font = 'italic 44px "Segoe Script", "Brush Script MT", cursive';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(name.trim(), c.width / 2, c.height / 2);
    return c.toDataURL('image/png');
  };

  const getPatientSignature = (): string | null => {
    if (patientSigMode === 'draw') return patientSigRef.current?.toDataURL() || null;
    if (patientSigMode === 'type') return buildTypedSignature(patientTypedSig);
    return null;
  };
  const resolveProfSignature = async (): Promise<string | null> => {
    if (profSig.mode === 'none') return null;
    if (profSig.mode === 'now') return profSig.dataUrl || null;
    if (profSig.mode === 'saved' && profSig.signedUrl) {
      try {
        // Convert saved image URL to data URL for embedded storage
        const resp = await fetch(profSig.signedUrl);
        if (!resp.ok) return null;
        const blob = await resp.blob();
        return await new Promise<string>((resolve) => {
          const fr = new FileReader();
          fr.onload = () => resolve(String(fr.result));
          fr.readAsDataURL(blob);
        });
      } catch { return null; }
    }
    return null;
  };

  const save = async () => {
    if (!user?.companyId) return;
    if (!patientId) return toast.error('Selecione o paciente');
    if (!content.trim()) return toast.error('Preencha a evolução');

    const patientSigData = getPatientSignature();
    const profSigData = await resolveProfSignature();

    setSaving(true);
    const { data: authUser } = await supabase.auth.getUser();
    const { error } = await (supabase.from('clinical_evolutions' as any) as any).insert({
      company_id: user.companyId,
      patient_id: patientId,
      content: content.trim(),
      patient_signature: patientSigData,
      professional_signature: profSigData,
      professional_name: profSig.nome || user.nome || null,
      signature_type: `${patientSigMode}/${profSig.mode}`,
      created_by: authUser.user?.id,
      created_by_name: user.nome || user.email || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }

    toast.success('Evolução registrada');
    setContent('');
    setPatientTypedSig('');
    patientSigRef.current?.clear();
    loadHistory(patientId);
  };


  const remove = async (id: string) => {
    if (!confirm('Excluir esta evolução?')) return;
    const { error } = await (supabase.from('clinical_evolutions' as any) as any).delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Excluída');
    loadHistory(patientId);
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-4 pb-8">
        <div className="flex items-center gap-3 flex-wrap">
          <Button asChild variant="ghost" size="sm">
            <Link to="/clinica/pacientes"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Link>
          </Button>
          <h1 className="text-2xl font-bold flex-1">Evolução Clínica</h1>
          <Button asChild variant="outline" size="sm">
            <Link to="/clinica/evolucao/mensagens">
              <MessageSquarePlus className="w-4 h-4 mr-1" /> Mensagens rápidas
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" /> Nova evolução
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Paciente *</Label>
              <div className="flex gap-2">
                <Popover open={patientPopoverOpen} onOpenChange={setPatientPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="h-11 justify-between flex-1 font-normal">
                      <span className="truncate text-left">
                        {selectedPatient ? `${selectedPatient.nome}${selectedPatient.cpf ? ` · ${selectedPatient.cpf}` : ''}` : 'Buscar paciente...'}
                      </span>
                      <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0 ml-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar por nome ou CPF..." />
                      <CommandList>
                        <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
                        <CommandGroup>
                          {patients.map(p => (
                            <CommandItem
                              key={p.id}
                              value={`${p.nome} ${p.cpf || ''}`}
                              onSelect={() => { setPatientId(p.id); setPatientPopoverOpen(false); }}
                            >
                              <Check className={`w-4 h-4 mr-2 ${patientId === p.id ? 'opacity-100' : 'opacity-0'}`} />
                              <span className="truncate">{p.nome}{p.cpf ? ` · ${p.cpf}` : ''}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {lastPatient && lastPatient.id !== patientId && (
                  <Button type="button" variant="outline" className="h-11 shrink-0 gap-1"
                    title={`Último paciente: ${lastPatient.nome}`}
                    onClick={() => setPatientId(lastPatient.id)}>
                    <History className="w-4 h-4" /> Último
                  </Button>
                )}
              </div>
            </div>

            {quickMsgs.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Mensagens rápidas</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {quickMsgs.map(m => (
                    <Button
                      key={m.id}
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => insertMessage(m)}
                      title={m.content}
                    >
                      + {m.title}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>Evolução *</Label>
              <Textarea
                rows={10}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Descreva a evolução do paciente..."
                className="text-base"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SignatureField
                label="Assinatura do paciente"
                mode={patientSigMode}
                onModeChange={setPatientSigMode}
                typed={patientTypedSig}
                onTypedChange={setPatientTypedSig}
                padRef={patientSigRef}
              />
              <DocumentSignaturePicker
                label={`Assinatura do profissional${user?.nome ? ` (${user.nome})` : ''}`}
                onChange={setProfSig}
              />
            </div>


            <div className="flex justify-end pt-2">
              <Button onClick={save} disabled={saving} size="lg" className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar evolução
              </Button>
            </div>
          </CardContent>
        </Card>

        {patientId && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" /> Histórico de evoluções
                <Badge variant="secondary">{history.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center text-muted-foreground py-6 text-sm">
                  Nenhuma evolução registrada para este paciente.
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map(ev => (
                    <div key={ev.id} className="border rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <Badge variant="secondary">{new Date(ev.created_at).toLocaleString('pt-BR')}</Badge>
                          {ev.created_by_name && <span className="text-muted-foreground text-xs">Por: {ev.created_by_name}</span>}
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => setViewing(ev)}>Ver</Button>
                          <Button size="sm" variant="destructive" onClick={() => remove(ev.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm whitespace-pre-wrap line-clamp-3">{ev.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {viewing && (
          <Card className="border-primary">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Evolução — {new Date(viewing.created_at).toLocaleString('pt-BR')}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setViewing(null)}>Fechar</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="whitespace-pre-wrap text-sm bg-muted/40 rounded p-3">{viewing.content}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Assinatura do paciente</div>
                  {viewing.patient_signature
                    ? <img src={viewing.patient_signature} alt="Assinatura paciente" className="border rounded bg-white max-h-32" />
                    : <div className="text-xs text-muted-foreground italic">Não assinado</div>}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Assinatura do profissional{viewing.professional_name ? ` (${viewing.professional_name})` : ''}</div>
                  {viewing.professional_signature
                    ? <img src={viewing.professional_signature} alt="Assinatura profissional" className="border rounded bg-white max-h-32" />
                    : <div className="text-xs text-muted-foreground italic">Não assinado</div>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

function SignatureField({
  label, mode, onModeChange, typed, onTypedChange, padRef,
}: {
  label: string;
  mode: SigMode;
  onModeChange: (m: SigMode) => void;
  typed: string;
  onTypedChange: (v: string) => void;
  padRef: React.Ref<SignaturePadHandle>;
}) {
  return (
    <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Label className="text-sm">{label}</Label>
        <Tabs value={mode} onValueChange={v => onModeChange(v as SigMode)}>
          <TabsList className="h-8">
            <TabsTrigger value="draw" className="text-xs gap-1"><PenLine className="w-3 h-3" /> Manual</TabsTrigger>
            <TabsTrigger value="type" className="text-xs gap-1"><TypeIcon className="w-3 h-3" /> Digitada</TabsTrigger>
            <TabsTrigger value="none" className="text-xs">Sem</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {mode === 'draw' && <SignaturePad ref={padRef} height={140} />}
      {mode === 'type' && (
        <div>
          <Input
            placeholder="Digite o nome completo"
            value={typed}
            onChange={e => onTypedChange(e.target.value)}
          />
          {typed.trim() && (
            <div className="mt-2 rounded border bg-white p-3 text-center">
              <span style={{ fontFamily: '"Segoe Script","Brush Script MT",cursive', fontStyle: 'italic', fontSize: 28 }}>
                {typed}
              </span>
            </div>
          )}
        </div>
      )}
      {mode === 'none' && (
        <div className="text-xs text-muted-foreground italic py-4 text-center">Sem assinatura</div>
      )}
    </div>
  );
}
