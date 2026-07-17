import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { downloadPdfFromUrl } from '@/lib/pdfDownload';
import {
  ArrowLeft, FileText, Loader2, Check, ChevronRight, ChevronLeft,
  User, ClipboardList, Pencil, CheckCircle2, ChevronsUpDown, History,
} from 'lucide-react';
import type { Question } from './AnamneseModelos';

interface Template {
  id: string;
  name: string;
  exam_type: string;
  questions: Question[];
}

interface Patient { id: string; nome: string; cpf: string | null; birth_date?: string | null; created_at?: string; }

type Phase = 'setup' | 'questions' | 'review';

export default function NovaAnamnese() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams<{ patientId?: string }>();
  const [sp] = useSearchParams();
  const initialPatient = params.patientId || sp.get('patient') || '';

  const [patients, setPatients] = useState<Patient[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [patientId, setPatientId] = useState<string>(initialPatient);
  const [templateId, setTemplateId] = useState<string>('');
  const [examType, setExamType] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [observations, setObservations] = useState('');
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState<Phase>('setup');
  const [idx, setIdx] = useState(0);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [signatures, setSignatures] = useState<Array<{ id: string; nome: string; credencial: string | null; image_url: string; is_default: boolean; _signed?: string }>>([]);
  const [signatureId, setSignatureId] = useState<string>('');
  const [signOnFly, setSignOnFly] = useState(false);
  const inlinePadRef = useRef<any>(null);

  const [patientPopoverOpen, setPatientPopoverOpen] = useState(false);

  useEffect(() => {
    if (!user?.companyId) return;
    (async () => {
      const { data: authUser } = await supabase.auth.getUser();
      const uid = authUser.user?.id;
      const [{ data: pats }, { data: tpls }, sigsRes] = await Promise.all([
        supabase.from('patients').select('id, nome, cpf, birth_date, created_at').eq('company_id', user.companyId).order('nome'),
        supabase.from('anamnese_templates').select('*').eq('company_id', user.companyId).eq('is_active', true).order('name'),
        uid ? supabase.from('user_signatures').select('id, nome, credencial, image_url, is_default').eq('user_id', uid).order('is_default', { ascending: false }) : Promise.resolve({ data: [] as any }),
      ]);
      setPatients((pats || []) as any);
      setTemplates((tpls || []) as any);
      const sigs = ((sigsRes as any)?.data || []) as any[];
      // Pre-sign non-http paths
      const withUrls = await Promise.all(sigs.map(async (s) => {
        if (!s.image_url || s.image_url.startsWith('http') || s.image_url.startsWith('data:')) return { ...s, _signed: s.image_url };
        const { data: signed } = await supabase.storage.from('signatures').createSignedUrl(s.image_url, 3600);
        return { ...s, _signed: signed?.signedUrl || '' };
      }));
      setSignatures(withUrls);
      const def = withUrls.find(s => s.is_default);
      if (def) setSignatureId(def.id);
    })();
  }, [user?.companyId]);

  const template = useMemo(() => templates.find(t => t.id === templateId), [templates, templateId]);
  const selectedPatient = useMemo(() => patients.find(p => p.id === patientId), [patients, patientId]);
  const lastPatient = useMemo(() => {
    if (!patients.length) return null;
    return [...patients].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];
  }, [patients]);

  useEffect(() => {
    if (template) {
      setExamType(template.exam_type);
      setAnswers({});
      setIdx(0);
    }
  }, [templateId]);

  // Filter questions visible under current conditional state.
  const visibleQuestions = useMemo(() => {
    if (!template) return [] as Question[];
    const out: Question[] = [];
    template.questions.forEach((q, i) => {
      if (q.condition?.equals && i > 0) {
        const prev = template.questions[i - 1];
        const prevAns = (answers[prev.id] || '').trim().toLowerCase();
        if (prevAns !== q.condition.equals.trim().toLowerCase()) return;
      }
      out.push(q);
    });
    return out;
  }, [template, answers]);

  const totalQ = visibleQuestions.length;
  const activeQ = visibleQuestions[idx];
  const progress = totalQ === 0 ? 0 : Math.round(((idx + (phase === 'review' ? 1 : 0)) / totalQ) * 100);

  const isAnswered = (q?: Question) => {
    if (!q) return false;
    const v = (answers[q.id] || '').toString().trim();
    if (!q.required) return true;
    return v.length > 0;
  };

  const allAnswered = totalQ > 0 && visibleQuestions.every(isAnswered);

  const setupReady = !!patientId && !!template && !!examType.trim();

  const goNext = () => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    if (!activeQ || !isAnswered(activeQ)) {
      toast.error('Responda a pergunta para continuar');
      return;
    }
    if (idx + 1 >= totalQ) {
      setPhase('review');
    } else {
      setIdx(idx + 1);
    }
  };

  const goBack = () => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    if (phase === 'review') {
      setPhase('questions');
      setIdx(totalQ - 1);
      return;
    }
    if (idx === 0) {
      setPhase('setup');
      return;
    }
    setIdx(idx - 1);
  };

  const setAnswer = (q: Question, v: string, autoAdvance = false) => {
    setAnswers(a => ({ ...a, [q.id]: v }));
    if (autoAdvance) {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = setTimeout(() => {
        // read fresh idx via functional; use closure — this is safe because we only rely on current active question
        if (idx + 1 >= totalQ) setPhase('review');
        else setIdx(i => i + 1);
      }, 280);
    }
  };

  const jumpTo = (i: number) => {
    setPhase('questions');
    setIdx(i);
  };

  const startQuestions = () => {
    if (!setupReady) {
      toast.error('Preencha paciente, modelo e tipo de exame');
      return;
    }
    if (!template || template.questions.length === 0) {
      toast.error('Este modelo não possui perguntas');
      return;
    }
    setPhase('questions');
    setIdx(0);
  };

  const submit = async () => {
    if (!patientId || !template || !examType.trim()) {
      toast.error('Dados incompletos'); return;
    }
    for (const q of visibleQuestions) {
      if (q.required && !(answers[q.id] || '').toString().trim()) {
        toast.error(`Responda: ${q.text}`); return;
      }
    }
    const responses = visibleQuestions.map(q => ({
      question: q.text, answer: (answers[q.id] || '').toString(),
    }));

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-anamnese-pdf', {
        body: {
          patient_id: patientId,
          template_id: template.id,
          template_name: template.name,
          exam_type: examType,
          responses,
          observations: observations || undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success('Anamnese salva com sucesso');
      const pdfUrl = (data as any)?.pdf_url;
      if (pdfUrl) await downloadPdfFromUrl(pdfUrl, `anamnese-${(data as any)?.number || 'invex'}.pdf`);
      navigate(`/clinica/pacientes/${patientId}`);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar anamnese');
    } finally {
      setSaving(false);
    }
  };

  // Render the active question with type-appropriate input; auto-advance for selectable types.
  const renderActiveInput = (q: Question) => {
    const val = answers[q.id] || '';
    switch (q.type) {
      case 'sim_nao':
        return (
          <div className="grid grid-cols-2 gap-3 md:gap-4 mt-4">
            {['Sim', 'Não'].map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setAnswer(q, opt, true)}
                className={`h-20 md:h-24 rounded-xl border-2 text-xl font-semibold transition-all active:scale-95 ${
                  val === opt
                    ? 'border-primary bg-primary text-primary-foreground shadow-lg'
                    : 'border-border bg-background hover:border-primary/50 hover:bg-muted'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        );
      case 'lista':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
            {(q.options || []).map(op => (
              <button
                key={op}
                type="button"
                onClick={() => setAnswer(q, op, true)}
                className={`min-h-14 px-4 py-3 rounded-lg border-2 text-base text-left transition-all active:scale-[0.98] ${
                  val === op
                    ? 'border-primary bg-primary/10 text-foreground font-medium'
                    : 'border-border hover:border-primary/40 hover:bg-muted'
                }`}
              >
                {op}
              </button>
            ))}
          </div>
        );
      case 'texto_longo':
        return (
          <Textarea
            autoFocus rows={5}
            className="mt-4 text-base"
            value={val}
            onChange={e => setAnswer(q, e.target.value)}
            placeholder="Digite sua resposta..."
          />
        );
      case 'numero':
        return (
          <Input
            autoFocus type="number" inputMode="decimal"
            className="mt-4 h-14 text-lg"
            value={val}
            onChange={e => setAnswer(q, e.target.value)}
            placeholder="0"
          />
        );
      default:
        return (
          <Input
            autoFocus
            className="mt-4 h-14 text-lg"
            value={val}
            onChange={e => setAnswer(q, e.target.value)}
            placeholder="Digite sua resposta..."
          />
        );
    }
  };

  const requiresManualNext = (q?: Question) =>
    !!q && (q.type === 'texto_curto' || q.type === 'texto_longo' || q.type === 'numero');

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-4 pb-8">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to={initialPatient ? `/clinica/pacientes/${initialPatient}` : '/clinica/pacientes'}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Nova Anamnese</h1>
        </div>

        {/* Progress bar — only during questions/review */}
        {phase !== 'setup' && totalQ > 0 && (
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border rounded-lg p-3">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">
                {phase === 'review' ? 'Revisão final' : `Pergunta ${idx + 1} de ${totalQ}`}
              </span>
              <Badge variant="secondary">{progress}%</Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* SETUP PHASE */}
        {phase === 'setup' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="w-4 h-4" /> Dados do atendimento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Paciente *</Label>
                  <div className="flex gap-2">
                    <Popover open={patientPopoverOpen} onOpenChange={setPatientPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="h-12 text-base justify-between flex-1 font-normal"
                        >
                          <span className="truncate text-left">
                            {selectedPatient
                              ? `${selectedPatient.nome}${selectedPatient.cpf ? ` · ${selectedPatient.cpf}` : ''}`
                              : 'Buscar paciente...'}
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
                                  onSelect={() => {
                                    setPatientId(p.id);
                                    setPatientPopoverOpen(false);
                                  }}
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
                    {lastPatient && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 shrink-0"
                        title={`Usar último paciente: ${lastPatient.nome}`}
                        onClick={() => setPatientId(lastPatient.id)}
                      >
                        <History className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Modelo de anamnese *</Label>
                  <Select value={templateId} onValueChange={setTemplateId}>
                    <SelectTrigger className="h-12 text-base"><SelectValue placeholder="Selecione o modelo" /></SelectTrigger>
                    <SelectContent>
                      {templates.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">Nenhum modelo ativo.</div>
                      ) : templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Tipo de exame *</Label>
                  <Input className="h-12 text-base" value={examType} onChange={e => setExamType(e.target.value)} />
                </div>
              </div>

              {selectedPatient && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded p-2">
                  <User className="w-4 h-4" />
                  <span className="font-medium text-foreground">{selectedPatient.nome}</span>
                  {selectedPatient.cpf && <span>· CPF {selectedPatient.cpf}</span>}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  onClick={startQuestions}
                  disabled={!setupReady}
                  size="lg"
                  className="gap-2"
                >
                  Iniciar anamnese <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* QUESTIONS PHASE — one at a time */}
        {phase === 'questions' && activeQ && (
          <Card className="animate-in fade-in slide-in-from-right-2 duration-200" key={activeQ.id}>
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center gap-2 text-xs font-medium text-primary mb-3">
                <span>PERGUNTA {idx + 1} DE {totalQ}</span>
                {activeQ.required && <span className="text-destructive">*obrigatória</span>}
              </div>
              <div className="text-xl md:text-2xl font-semibold leading-snug text-foreground">
                {activeQ.text}
              </div>
              {renderActiveInput(activeQ)}

              <div className="flex items-center justify-between gap-2 mt-6 pt-4 border-t">
                <Button variant="outline" onClick={goBack} size="lg" className="gap-1">
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </Button>
                {requiresManualNext(activeQ) ? (
                  <Button
                    onClick={goNext}
                    disabled={!isAnswered(activeQ)}
                    size="lg"
                    className="gap-1"
                  >
                    {idx + 1 >= totalQ ? 'Revisar' : 'Próxima'} <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <div className="text-xs text-muted-foreground text-right">
                    {isAnswered(activeQ) ? 'Avançando…' : 'Selecione uma opção'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* REVIEW PHASE */}
        {phase === 'review' && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Revisão da anamnese
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted/40 rounded p-3">
                    <div className="text-xs text-muted-foreground">Paciente</div>
                    <div className="font-medium">{selectedPatient?.nome}</div>
                    {selectedPatient?.cpf && <div className="text-muted-foreground">CPF {selectedPatient.cpf}</div>}
                  </div>
                  <div className="bg-muted/40 rounded p-3">
                    <div className="text-xs text-muted-foreground">Tipo de exame</div>
                    <div className="font-medium">{examType}</div>
                    <div className="text-muted-foreground">Modelo: {template?.name}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Respostas ({visibleQuestions.length})
                  </div>
                  {visibleQuestions.map((q, i) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => jumpTo(i)}
                      className="w-full text-left flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted transition"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground">Pergunta {i + 1}</div>
                        <div className="text-sm font-medium">{q.text}</div>
                        <div className="text-sm text-foreground/80 break-words">
                          {answers[q.id] || <span className="text-muted-foreground italic">sem resposta</span>}
                        </div>
                      </div>
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-1" />
                    </button>
                  ))}
                </div>

                <div>
                  <Label>Observações (opcional)</Label>
                  <Textarea rows={3} className="text-base" value={observations} onChange={e => setObservations(e.target.value)} />
                </div>

                <div className={`flex items-center gap-2 rounded p-3 text-sm ${
                  allAnswered ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                }`}>
                  <CheckCircle2 className="w-4 h-4" />
                  {allAnswered
                    ? 'Todos os campos obrigatórios foram preenchidos.'
                    : 'Existem perguntas obrigatórias sem resposta.'}
                </div>

                <div className="flex flex-col-reverse md:flex-row justify-between gap-2 pt-2">
                  <Button variant="outline" onClick={goBack} size="lg" className="gap-1">
                    <ChevronLeft className="w-4 h-4" /> Editar respostas
                  </Button>
                  <Button onClick={submit} disabled={saving || !allAnswered} size="lg" className="gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <FileText className="w-4 h-4" /> Salvar e gerar PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
