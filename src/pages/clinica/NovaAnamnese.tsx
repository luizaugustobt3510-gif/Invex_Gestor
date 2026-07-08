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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import type { Question } from './AnamneseModelos';

interface Template {
  id: string;
  name: string;
  exam_type: string;
  questions: Question[];
}

interface Patient { id: string; nome: string; cpf: string | null; }

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

  useEffect(() => {
    if (!user?.companyId) return;
    (async () => {
      const [{ data: pats }, { data: tpls }] = await Promise.all([
        supabase.from('patients').select('id, nome, cpf').eq('company_id', user.companyId).order('nome'),
        supabase.from('anamnese_templates').select('*').eq('company_id', user.companyId).eq('is_active', true).order('name'),
      ]);
      setPatients((pats || []) as any);
      setTemplates((tpls || []) as any);
    })();
  }, [user?.companyId]);

  const template = useMemo(() => templates.find(t => t.id === templateId), [templates, templateId]);

  useEffect(() => {
    if (template) {
      setExamType(template.exam_type);
      setAnswers({});
    }
  }, [templateId]);

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

  const renderInput = (q: Question) => {
    const val = answers[q.id] || '';
    const set = (v: string) => setAnswers(a => ({ ...a, [q.id]: v }));
    switch (q.type) {
      case 'sim_nao':
        return (
          <RadioGroup value={val} onValueChange={set} className="flex gap-4 mt-1">
            <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="Sim" /> Sim</label>
            <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="Não" /> Não</label>
          </RadioGroup>
        );
      case 'texto_longo':
        return <Textarea rows={3} value={val} onChange={e => set(e.target.value)} />;
      case 'numero':
        return <Input type="number" value={val} onChange={e => set(e.target.value)} />;
      case 'lista':
        return (
          <Select value={val} onValueChange={set}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {(q.options || []).map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      default:
        return <Input value={val} onChange={e => set(e.target.value)} />;
    }
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to={initialPatient ? `/clinica/pacientes/${initialPatient}` : '/clinica/pacientes'}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Nova Anamnese</h1>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Dados</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Paciente *</Label>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
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
                  <SelectTrigger><SelectValue placeholder="Selecione o modelo" /></SelectTrigger>
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
                <Input value={examType} onChange={e => setExamType(e.target.value)} />
              </div>
            </div>

            {template && (
              <div className="space-y-4">
                <h3 className="font-semibold border-t pt-4">Perguntas</h3>
                {visibleQuestions.map((q, idx) => (
                  <div key={q.id}>
                    <Label>
                      {idx + 1}. {q.text}
                      {q.required && <span className="text-destructive"> *</span>}
                    </Label>
                    {renderInput(q)}
                  </div>
                ))}
                {visibleQuestions.length === 0 && (
                  <div className="text-sm text-muted-foreground">Este modelo não possui perguntas.</div>
                )}
              </div>
            )}

            <div>
              <Label>Observações</Label>
              <Textarea rows={3} value={observations} onChange={e => setObservations(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
              <Button onClick={submit} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Salvar e gerar PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
