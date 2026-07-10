import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Loader2, Check, Lock, ChevronRight, User, ClipboardList, Pencil } from 'lucide-react';
import type { Question } from './AnamneseModelos';

interface Template {
  id: string;
  name: string;
  exam_type: string;
  questions: Question[];
}

interface Patient { id: string; nome: string; cpf: string | null; birth_date?: string | null; }

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
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    if (!user?.companyId) return;
    (async () => {
      const [{ data: pats }, { data: tpls }] = await Promise.all([
        supabase.from('patients').select('id, nome, cpf, birth_date').eq('company_id', user.companyId).order('nome'),
        supabase.from('anamnese_templates').select('*').eq('company_id', user.companyId).eq('is_active', true).order('name'),
      ]);
      setPatients((pats || []) as any);
      setTemplates((tpls || []) as any);
    })();
  }, [user?.companyId]);

  const template = useMemo(() => templates.find(t => t.id === templateId), [templates, templateId]);
  const selectedPatient = useMemo(() => patients.find(p => p.id === patientId), [patients, patientId]);

  useEffect(() => {
    if (template) {
      setExamType(template.exam_type);
      setAnswers({});
      setCurrentIdx(0);
    }
  }, [templateId]);

  // Filter questions that are actually visible given conditional logic on previous answers.
  const visibleQuestions = useMemo(() => {
    if (!template) return [] as Question[];
    const out: Question[] = [];
    template.questions.forEach((q, idx) => {
      if (q.condition?.equals && idx > 0) {
        const prev = template.questions[idx - 1];
        const prevAns = (answers[prev.id] || '').trim().toLowerCase();
        if (prevAns !== q.condition.equals.trim().toLowerCase()) return;
      }
      out.push(q);
    });
    return out;
  }, [template, answers]);

  const isAnswered = (q: Question) => {
    const v = (answers[q.id] || '').toString().trim();
    if (!q.required) return true;
    return v.length > 0;
  };

  // Compute how many questions are "unlocked" — one past the last answered required question.
  const unlockedUpTo = useMemo(() => {
    let i = 0;
    for (; i < visibleQuestions.length; i++) {
      if (!isAnswered(visibleQuestions[i])) break;
    }
    return i; // index of first unanswered (== current active)
  }, [visibleQuestions, answers]);

  // Clamp currentIdx to unlocked range
  useEffect(() => {
    if (currentIdx > unlockedUpTo) setCurrentIdx(unlockedUpTo);
  }, [unlockedUpTo]);

  const activeIdx = Math.min(currentIdx, unlockedUpTo);
  const activeQ = visibleQuestions[activeIdx];
  const totalQ = visibleQuestions.length;
  const answeredCount = unlockedUpTo;
  const progress = totalQ === 0 ? 0 : Math.round((answeredCount / totalQ) * 100);
  const allAnswered = totalQ > 0 && answeredCount >= totalQ;

  const advance = () => {
    if (!activeQ) return;
    if (!isAnswered(activeQ)) {
      toast.error('Responda a pergunta atual para continuar');
      return;
    }
    if (activeIdx + 1 < totalQ) setCurrentIdx(activeIdx + 1);
  };

  const submit = async () => {
    if (!patientId) { toast.error('Selecione um paciente'); return; }
    if (!template) { toast.error('Selecione um modelo'); return; }
    if (!examType.trim()) { toast.error('Informe o tipo de exame'); return; }

    for (const q of visibleQuestions) {
      if (q.required && !(answers[q.id] || '').toString().trim()) {
        toast.error(`Responda: ${q.text}`); return;
      }
    }

    const responses = visibleQuestions.map(q => ({ question: q.text, answer: (answers[q.id] || '').toString() }));

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
      toast.success('Anamnese registrada');
      const pdfUrl = (data as any)?.pdf_url;
      if (pdfUrl) window.open(pdfUrl, '_blank');
      navigate(`/clinica/pacientes/${patientId}`);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar anamnese');
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (q: Question, autoFocus = false) => {
    const val = answers[q.id] || '';
    const set = (v: string) => setAnswers(a => ({ ...a, [q.id]: v }));
    switch (q.type) {
      case 'sim_nao':
        return (
          <div className="grid grid-cols-2 gap-3 mt-2">
            <button
              type="button"
              onClick={() => set('Sim')}
              className={`h-14 rounded-lg border-2 text-base font-medium transition ${
                val === 'Sim' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40'
              }`}
            >
              Sim
            </button>
            <button
              type="button"
              onClick={() => set('Não')}
              className={`h-14 rounded-lg border-2 text-base font-medium transition ${
                val === 'Não' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40'
              }`}
            >
              Não
            </button>
          </div>
        );
      case 'texto_longo':
        return <Textarea autoFocus={autoFocus} rows={4} className="mt-2 text-base" value={val} onChange={e => set(e.target.value)} />;
      case 'numero':
        return <Input autoFocus={autoFocus} type="number" inputMode="decimal" className="mt-2 h-12 text-base" value={val} onChange={e => set(e.target.value)} />;
      case 'lista':
        return (
          <Select value={val} onValueChange={set}>
            <SelectTrigger className="mt-2 h-12 text-base"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {(q.options || []).map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      default:
        return <Input autoFocus={autoFocus} className="mt-2 h-12 text-base" value={val} onChange={e => set(e.target.value)} />;
    }
  };

  const setupReady = !!patientId && !!template && !!examType.trim();

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-4 pb-8">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to={initialPatient ? `/clinica/pacientes/${initialPatient}` : '/clinica/pacientes'}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Nova Anamnese</h1>
        </div>

        {/* Setup card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="w-4 h-4" /> Dados do atendimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Paciente *</Label>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger className="h-11 text-base"><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}{p.cpf ? ` · ${p.cpf}` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Modelo de anamnese *</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger className="h-11 text-base"><SelectValue placeholder="Selecione o modelo" /></SelectTrigger>
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
                <Input className="h-11 text-base" value={examType} onChange={e => setExamType(e.target.value)} />
              </div>
            </div>

            {selectedPatient && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded p-2">
                <User className="w-4 h-4" />
                <span className="font-medium text-foreground">{selectedPatient.nome}</span>
                {selectedPatient.cpf && <span>· CPF {selectedPatient.cpf}</span>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progressive questions */}
        {setupReady && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Anamnese guiada</CardTitle>
                <Badge variant="secondary">
                  {answeredCount} / {totalQ}
                </Badge>
              </div>
              <Progress value={progress} className="h-2 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              {totalQ === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-6">
                  Este modelo não possui perguntas.
                </div>
              ) : (
                <>
                  {/* Answered / previous questions summary — compact and editable */}
                  {visibleQuestions.slice(0, activeIdx).map((q, i) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentIdx(i)}
                      className="w-full text-left flex items-start gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted transition"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground">Pergunta {i + 1}</div>
                        <div className="text-sm font-medium truncate">{q.text}</div>
                        <div className="text-sm text-muted-foreground truncate">{answers[q.id] || '—'}</div>
                      </div>
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-1" />
                    </button>
                  ))}

                  {/* Active question — the only one editable */}
                  {activeQ && (
                    <div className="p-4 md:p-5 rounded-lg border-2 border-primary bg-primary/5">
                      <div className="flex items-center gap-2 text-xs text-primary font-medium mb-2">
                        <span>PERGUNTA {activeIdx + 1} DE {totalQ}</span>
                        {activeQ.required && <span className="text-destructive">*obrigatória</span>}
                      </div>
                      <div className="text-lg font-semibold leading-snug">{activeQ.text}</div>
                      {renderInput(activeQ, true)}
                      <div className="flex justify-end mt-4">
                        {activeIdx + 1 < totalQ ? (
                          <Button onClick={advance} disabled={!isAnswered(activeQ)} className="gap-1">
                            Próxima <ChevronRight className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {isAnswered(activeQ) ? 'Última pergunta respondida' : 'Responda para concluir'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Locked upcoming questions */}
                  {visibleQuestions.slice(activeIdx + 1).map((q, i) => (
                    <div
                      key={q.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-dashed bg-muted/20 text-muted-foreground"
                    >
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Lock className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs">Pergunta {activeIdx + 2 + i}</div>
                        <div className="text-sm truncate">Responda a atual para liberar</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Observations + submit — only after all answered */}
        {setupReady && allAnswered && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-4 h-4" /> Observações e finalização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Observações (opcional)</Label>
                <Textarea rows={3} className="text-base" value={observations} onChange={e => setObservations(e.target.value)} />
              </div>
              <div className="flex flex-col-reverse md:flex-row justify-end gap-2">
                <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
                <Button onClick={submit} disabled={saving} className="gap-1">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <FileText className="w-4 h-4" /> Salvar e gerar PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
