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
import { downloadPdfFromUrl, buildPatientPdfFilename } from '@/lib/pdfDownload';
import {
  ArrowLeft, FileText, Loader2, Check, ChevronRight, ChevronLeft,
  User, ClipboardList, Pencil, CheckCircle2, ChevronsUpDown, History, SkipForward,
} from 'lucide-react';
import type { Question } from './AnamneseModelos';
import { SignaturePad, SignaturePadHandle } from '@/components/SignaturePad';
import { DocumentSignaturePicker, DocumentSignatureValue } from '@/components/DocumentSignaturePicker';
import { SeletorAnatomico } from '@/components/clinica/SeletorAnatomico';
import { useAnatomicalRegions } from '@/hooks/useAnatomicalRegions';
import { useAnatomicalMaps } from '@/hooks/useAnatomicalMaps';
import { buildAnatomySnapshot } from '@/lib/anatomySnapshot';
import { highlightedAreaIds, regionForToken } from '@/lib/anatomyTokens';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { combineTemplates, type ExtraSection, type SectionQuestion } from '@/lib/anamneseCombine';
import { anamneseEntryPhase, isAnamneseAnswerComplete } from '@/lib/anamneseReview';

// Small local component to bridge ref to inline pad
function InlineSignaturePad({ refObj }: { refObj: React.MutableRefObject<any> }) {
  return <SignaturePad ref={refObj as React.Ref<SignaturePadHandle>} height={140} />;
}

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
  const { regions: anatomicalRegions } = useAnatomicalRegions(true);
  const { maps: anatomicalMaps } = useAnatomicalMaps(true);
  const navigate = useNavigate();
  const params = useParams<{ patientId?: string }>();
  const [sp] = useSearchParams();
  const initialPatient = params.patientId || sp.get('patient') || '';
  const editId = sp.get('edit') || '';
  const addPrescription = sp.get('receita') === '1';
  const [editLoading, setEditLoading] = useState(!!editId);
  const reviewingAnswer = useRef(false);
  const pendingEdit = useRef<{ answers: Record<string, string>; examType: string; extras: ExtraSection[] } | null>(null);
  const [extras, setExtras] = useState<ExtraSection[]>([]);
  const [comboOpen, setComboOpen] = useState(false);
  const [comboTplId, setComboTplId] = useState('');
  const [comboSel, setComboSel] = useState<Set<string>>(new Set());

  const [patients, setPatients] = useState<Patient[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [patientId, setPatientId] = useState<string>(initialPatient);
  const [templateId, setTemplateId] = useState<string>('');
  const [examType, setExamType] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // Perguntas puladas pelo usuário: não bloqueiam o avanço e não saem no PDF
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [observations, setObservations] = useState('');
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState<Phase>('setup');
  const [idx, setIdx] = useState(0);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [signatures, setSignatures] = useState<Array<{ id: string; nome: string; credencial: string | null; image_url: string; is_default: boolean; _signed?: string }>>([]);
  const [signatureId, setSignatureId] = useState<string>('');
  const [signOnFly, setSignOnFly] = useState(false);
  const inlinePadRef = useRef<any>(null);
  const [tecName, setTecName] = useState('');
  const [tecSig, setTecSig] = useState<DocumentSignatureValue>({ mode: 'none' });
  const [medName, setMedName] = useState('');
  const [medSig, setMedSig] = useState<DocumentSignatureValue>({ mode: 'none' });

  const handleMedSigChange = (v: DocumentSignatureValue) => {
    setMedSig(v);
    if (v.mode === 'saved') {
      const label = [v.nome, v.credencial].filter(Boolean).join(' — ');
      if (label) setMedName(label);
    }
  };

  const handleTecSigChange = (v: DocumentSignatureValue) => {
    setTecSig(v);
    if (v.mode === 'saved') {
      const label = [v.nome, v.credencial].filter(Boolean).join(' — ');
      if (label) setTecName(label);
    }
  };

  const [patientPopoverOpen, setPatientPopoverOpen] = useState(false);

  // Receita vinculada (opcional) — vai no mesmo PDF da anamnese
  const [rxEnabled, setRxEnabled] = useState(addPrescription);
  const [rxTipo, setRxTipo] = useState('simples');
  const [rxContent, setRxContent] = useState('');
  const [quickMeds, setQuickMeds] = useState<Array<{ id: string; title: string; content: string }>>([]);
  const [quickAnswers, setQuickAnswers] = useState<Array<{ id: string; title: string; content: string }>>([]);

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
      if (editId && !tpls?.length) {
        setEditLoading(false);
        toast.error('Nenhum modelo ativo disponível para editar esta anamnese');
      }
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

      const { data: qm } = await (supabase.from('prescription_quick_items' as any) as any)
        .select('id, title, content')
        .eq('company_id', user.companyId)
        .eq('is_active', true)
        .order('title');
      setQuickMeds((qm || []) as any);

      const { data: qa } = await (supabase.from('anamnese_quick_answers' as any) as any)
        .select('id, title, content')
        .eq('company_id', user.companyId)
        .eq('is_active', true)
        .order('title');
      setQuickAnswers((qa || []) as any);
    })();
  }, [user?.companyId]);

  const baseTemplate = useMemo(() => templates.find(t => t.id === templateId), [templates, templateId]);
  const template = useMemo(
    () => (baseTemplate ? { ...baseTemplate, questions: combineTemplates(baseTemplate, extras) } : undefined),
    [baseTemplate, extras],
  );
  const selectedPatient = useMemo(() => patients.find(p => p.id === patientId), [patients, patientId]);
  const lastPatient = useMemo(() => {
    if (!patients.length) return null;
    return [...patients].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];
  }, [patients]);

  useEffect(() => {
    if (template) {
      if (pendingEdit.current) {
        setExamType(pendingEdit.current.examType);
        setAnswers(pendingEdit.current.answers);
        setExtras(pendingEdit.current.extras);
        // Perguntas sem resposta salva voltam como "puladas" para não bloquear a regravação
        const ans = pendingEdit.current.answers;
        setSkippedIds(new Set(template.questions.filter(q => !(ans[q.id] || '').trim()).map(q => q.id)));
        pendingEdit.current = null;
        setPhase(anamneseEntryPhase(editId));
      } else {
        setExamType(baseTemplate!.exam_type);
        setAnswers({});
        setExtras([]);
        setSkippedIds(new Set());
      }
      setIdx(0);
    }
  }, [templateId, baseTemplate]);

  // Modo edição: carrega a anamnese existente e preenche as respostas
  const editLoaded = useRef(false);
  useEffect(() => {
    if (!editId || !user?.companyId || editLoaded.current || !templates.length) return;
    editLoaded.current = true;
    (async () => {
      try {
      const { data, error } = await supabase.from('anamneses')
        .select('id, patient_id, template_id, exam_type, observations, responses')
        .eq('id', editId).eq('company_id', user.companyId).maybeSingle();
      if (error || !data) { toast.error('Anamnese não encontrada'); return; }
      const tpl = templates.find(t => t.id === data.template_id);
      if (!tpl) { toast.error('O modelo desta anamnese não está mais ativo'); return; }
      const resp = (Array.isArray(data.responses) ? data.responses : []) as any[];
      const ans: Record<string, string> = {};
      // Exames adicionais combinados nesta anamnese
      const extrasLoaded: ExtraSection[] = [];
      for (const r of resp) {
        const tid = r?.section_template_id;
        if (!tid || tid === tpl.id || extrasLoaded.some(e => e.templateId === tid)) continue;
        const et = templates.find(t => t.id === tid);
        if (!et) continue;
        const texts = new Set(resp.filter(x => x?.section_template_id === tid).map(x => x.question));
        const ids = et.questions.filter(q => texts.has(q.text)).map(q => q.id);
        // inclui subperguntas condicionais do mesmo modelo
        et.questions.forEach(q => { if (q.conditions?.some(c => ids.includes(c.questionId)) || q.condition) ids.push(q.id); });
        extrasLoaded.push({ templateId: et.id, name: et.name, questions: et.questions, selectedIds: [...new Set(ids)] });
      }
      const allQs: Array<{ q: Question; sid: string; key: string }> = [
        ...tpl.questions.map(q => ({ q, sid: tpl.id, key: q.id })),
        ...extrasLoaded.flatMap((e, i) => e.questions.map(q => ({ q, sid: e.templateId, key: `x${i}:${q.id}` }))),
      ];
      for (const { q, sid, key } of allQs) {
        const r = resp.find(x => x?.question === q.text && (x?.section_template_id ? x.section_template_id === sid : sid === tpl.id));
        if (!r) continue;
        if (Array.isArray(r.regions)) ans[key] = JSON.stringify(r.regions);
        else if (q.type === 'multi_escolha' && r.answer) ans[key] = JSON.stringify(String(r.answer).split(', ').filter(Boolean));
        else ans[key] = String(r.answer ?? '');
      }
      pendingEdit.current = { answers: ans, examType: data.exam_type, extras: extrasLoaded };
      setPatientId(data.patient_id);
      setObservations(data.observations || '');
      setTemplateId(tpl.id);
      toast.info('Editando anamnese — revise e salve para regerar o PDF');
      } catch {
        toast.error('Não foi possível carregar a anamnese');
      } finally {
        setEditLoading(false);
      }
    })();
  }, [editId, templates, user?.companyId]);

  useEffect(() => {
    if (phase === 'review' && addPrescription && !editLoading) {
      document.getElementById('receita-vinculada')?.scrollIntoView({ block: 'center' });
    }
  }, [phase, addPrescription, editLoading]);

  // Parse a stored answer into the set of selected values (works for single or multi).
  const parseAnswerValues = (raw: string | undefined): string[] => {
    const s = (raw || '').trim();
    if (!s) return [];
    if (s.startsWith('[')) {
      try {
        const arr = JSON.parse(s);
        if (Array.isArray(arr)) return arr.map(v => String(v));
      } catch { /* fallthrough */ }
    }
    return [s];
  };

  // Filter questions visible under current conditional state.
  // Supports both legacy `condition.equals` (previous question) and the new
  // `conditions[]` cascade (AND across conditions, OR across values within a condition).
  const visibleQuestions = useMemo(() => {
    if (!template) return [] as Question[];
    const out: Question[] = [];
    template.questions.forEach((q, i) => {
      // Legacy single-condition support
      if (q.condition?.equals && i > 0 && !q.conditions?.length) {
        const prev = template.questions[i - 1];
        const prevAns = parseAnswerValues(answers[prev.id]).map(v => v.trim().toLowerCase());
        const target = q.condition.equals.trim().toLowerCase();
        if (!prevAns.includes(target)) return;
      }
      // New cascade
      if (q.conditions?.length) {
        const allMatch = q.conditions.every(c => {
          const ans = parseAnswerValues(answers[c.questionId]).map(v => v.trim().toLowerCase());
          return c.values.some(v => ans.includes(v.trim().toLowerCase()));
        });
        if (!allMatch) return;
      }
      out.push(q);
    });
    return out;
  }, [template, answers]);

  const totalQ = visibleQuestions.length;
  const activeQ = visibleQuestions[Math.min(idx, Math.max(0, totalQ - 1))];
  const progress = phase === 'review' ? 100 : totalQ === 0 ? 0 : Math.round((idx / totalQ) * 100);

  // Ref that always reflects the *current* visible-question list. Prevents stale-closure
  // bugs where auto-advance uses an outdated totalQ after a conditional reveals/hides
  // a downstream question.
  const visibleRef = useRef<Question[]>(visibleQuestions);
  useEffect(() => { visibleRef.current = visibleQuestions; }, [visibleQuestions]);

  const isAnswered = (q?: Question) => {
    if (!q) return false;
    if (skippedIds.has(q.id)) return true;
    return isAnamneseAnswerComplete(q.required, answers[q.id]);
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

  // Pula a pergunta atual: limpa a resposta, marca como pulada e avança.
  // Perguntas puladas não aparecem no PDF.
  const skipQuestion = () => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    if (!activeQ) return;
    setSkippedIds(prev => new Set(prev).add(activeQ.id));
    setAnswers(a => {
      const n = { ...a };
      delete n[activeQ.id];
      return n;
    });
    if (idx + 1 >= totalQ) {
      setPhase('review');
    } else {
      setIdx(idx + 1);
    }
  };

  const finishReview = () => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    reviewingAnswer.current = false;
    setPhase('review');
  };

  const goBack = () => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    if (phase === 'review') {
      reviewingAnswer.current = true;
      setPhase('questions');
      setIdx(Math.max(0, totalQ - 1));
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
    // Responder (ou voltar a responder) tira a pergunta da lista de puladas
    setSkippedIds(prev => {
      if (!prev.has(q.id)) return prev;
      const n = new Set(prev);
      n.delete(q.id);
      return n;
    });
    if (autoAdvance && !reviewingAnswer.current) {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = setTimeout(() => {
        // Read fresh values from the ref — the visible list may have grown/shrunk
        // because this answer unlocked or hid a conditional question.
        const freshTotal = visibleRef.current.length;
        setIdx(current => {
          if (current + 1 >= freshTotal) {
            setPhase('review');
            return current;
          }
          return current + 1;
        });
      }, 280);
    }
  };


  const jumpTo = (i: number) => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    reviewingAnswer.current = true;
    setPhase('questions');
    setIdx(Math.max(0, Math.min(i, Math.max(0, visibleQuestions.length - 1))));
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
    reviewingAnswer.current = false;
    setPhase('questions');
    setIdx(0);
  };

  const comboTpl = templates.find(t => t.id === comboTplId);
  const openCombo = () => { setComboTplId(''); setComboSel(new Set()); setComboOpen(true); };
  const pickComboTpl = (id: string) => {
    setComboTplId(id);
    const t = templates.find(x => x.id === id);
    const used = new Set((template?.questions || []).map(q => q.text.trim().toLowerCase()));
    // Pré-marca as perguntas que ainda não foram feitas
    setComboSel(new Set((t?.questions || []).filter(q => !used.has(q.text.trim().toLowerCase())).map(q => q.id)));
  };
  const confirmCombo = () => {
    if (!comboTpl || comboSel.size === 0) { toast.error('Selecione ao menos uma pergunta'); return; }
    // Subperguntas seguem a pergunta de origem selecionada
    const ids = new Set(comboSel);
    comboTpl.questions.forEach((q, i) => {
      if (q.conditions?.some(c => ids.has(c.questionId))) ids.add(q.id);
      if (q.condition?.equals && i > 0 && ids.has(comboTpl.questions[i - 1].id)) ids.add(q.id);
    });
    const firstNew = visibleQuestions.length;
    setExtras(prev => [...prev, { templateId: comboTpl.id, name: comboTpl.name, questions: comboTpl.questions, selectedIds: [...ids] }]);
    setExamType(prev => `${prev} + ${comboTpl.name}`);
    setComboOpen(false);
    reviewingAnswer.current = false;
    setPhase('questions');
    setIdx(firstNew);
    toast.success(`${comboTpl.name} adicionado. Responda as novas perguntas.`);
  };
  const removeExtra = (i: number) => {
    const e = extras[i];
    setExtras(prev => prev.filter((_, j) => j !== i));
    setExamType(prev => prev.replace(` + ${e.name}`, ''));
  };

  const submit = async (download = true) => {
    if (!patientId || !template || !examType.trim()) {
      toast.error('Dados incompletos'); return;
    }
    for (const q of visibleQuestions) {
      if (!isAnswered(q)) {
        toast.error(`Responda: ${q.text}`); return;
      }
    }
    const regionName = (tok: string) =>
      regionForToken(tok, anatomicalRegions, anatomicalMaps)?.nome || tok;

    // Pergunta de origem (quando esta pergunta só apareceu por causa de outra resposta)
    const parentOf = (q: Question): { question: string; trigger: string } | undefined => {
      const all = template.questions;
      if (q.conditions?.length) {
        const c = q.conditions[0];
        const src = all.find(p => p.id === c.questionId);
        if (src) return { question: src.text, trigger: (c.values || []).join(' / ') };
      }
      if (q.condition?.equals) {
        const i = all.findIndex(p => p.id === q.id);
        const src = i > 0 ? all[i - 1] : null;
        if (src) return { question: src.text, trigger: q.condition.equals };
      }
      return undefined;
    };

    const base = visibleQuestions
      // Perguntas puladas não entram no PDF
      .filter(q => !skippedIds.has(q.id))
      .map(q => {
        const vals = parseAnswerValues(answers[q.id]);
        const isAnatomy = q.type === 'localizacao_anatomica';
        const parent = parentOf(q);
        return {
          required: !!q.required,
          question: q.text,
          // Texto legível para exibição/PDF
          answer: (isAnatomy ? vals.map(regionName) : vals).join(', '),
          // Resposta estruturada (slugs) preservada no registro da anamnese
          regions: isAnatomy ? vals : undefined,
          parent_question: parent?.question,
          parent_trigger: parent?.trigger,
          section: (q as SectionQuestion).section,
          section_template_id: (q as SectionQuestion).sectionTemplateId,
        };
      })
      // Omite perguntas NÃO obrigatórias deixadas em branco
      .filter(r => r.required || r.answer.trim().length > 0);

    const responses = await Promise.all(base.map(async (r) => {
      const out: Record<string, unknown> = { question: r.question, answer: r.answer };
      if (extras.length) { out.section = r.section; out.section_template_id = r.section_template_id; }
      if (r.parent_question) {
        out.parent_question = r.parent_question;
        if (r.parent_trigger) out.parent_trigger = r.parent_trigger;
      }
      if (r.regions) {
        out.regions = r.regions;
        const areaIds = [...highlightedAreaIds(r.regions, anatomicalRegions, anatomicalMaps)];
        const snap = await buildAnatomySnapshot(anatomicalMaps, areaIds);
        if (snap) out.image = snap;
      }
      return out;
    }));



    const hasRx = rxEnabled && !!rxContent.trim();

    // Anamnese: assinada apenas pelo técnico
    const tecUrl = tecSig.mode === 'now' ? tecSig.dataUrl : tecSig.mode === 'saved' ? tecSig.signedUrl : undefined;
    // Receita vinculada: assinada apenas pelo médico
    const medUrl = medSig.mode === 'now' ? medSig.dataUrl : medSig.mode === 'saved' ? medSig.signedUrl : undefined;

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-anamnese-pdf', {
        body: {
          anamnese_id: editId || undefined,
          patient_id: patientId,
          template_id: template.id,
          template_name: template.name,
          exam_type: examType,
          responses,
          observations: observations || undefined,
          signature_image_url: hasRx ? medUrl : undefined,
          signature_source: medSig.mode === 'saved' ? 'saved' : medSig.mode === 'now' ? 'inline' : undefined,
          signature_name: hasRx ? (medName.trim() || medSig.nome) : undefined,
          signature_credencial: hasRx ? medSig.credencial : undefined,
          anamnese_signature_image_url: tecUrl,
          anamnese_signature_name: tecName.trim() || tecSig.nome,
          anamnese_signature_credencial: tecSig.credencial,
          prescription: hasRx
            ? { tipo: rxTipo, content: rxContent.trim() }
            : undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(download
        ? (editId ? 'Anamnese atualizada e PDF regerado' : 'Anamnese finalizada com sucesso')
        : 'Anamnese salva. Você pode editá-la depois pela ficha do paciente.');
      const pdfUrl = (data as any)?.pdf_url;
      if (download && pdfUrl) await downloadPdfFromUrl(pdfUrl, buildPatientPdfFilename(selectedPatient?.nome));
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
      case 'localizacao_anatomica': {
        const selectedSlugs = parseAnswerValues(val);
        return (
          <div className="mt-4 space-y-2">
            {q.description && (
              <div className="text-sm text-muted-foreground">{q.description}</div>
            )}
            <SeletorAnatomico
              regions={anatomicalRegions}
              value={selectedSlugs}
              multiple={q.allowMultiple !== false}
              categorias={q.categorias}
              onChange={(slugs) => setAnswer(q, slugs.length ? JSON.stringify(slugs) : '')}
            />
          </div>
        );
      }
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
      case 'multi_escolha': {
        const selected = parseAnswerValues(val);
        const toggle = (op: string) => {
          const has = selected.includes(op);
          const next = has ? selected.filter(v => v !== op) : [...selected, op];
          setAnswer(q, JSON.stringify(next));
        };
        return (
          <div className="space-y-2 mt-4">
            <div className="text-xs text-muted-foreground">Selecione uma ou mais opções.</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {(q.options || []).map(op => {
                const on = selected.includes(op);
                return (
                  <button
                    key={op}
                    type="button"
                    onClick={() => toggle(op)}
                    className={`min-h-14 px-4 py-3 rounded-lg border-2 text-base text-left transition-all active:scale-[0.98] flex items-center gap-2 ${
                      on
                        ? 'border-primary bg-primary/10 text-foreground font-medium'
                        : 'border-border hover:border-primary/40 hover:bg-muted'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                      on ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'
                    }`}>
                      {on && <Check className="w-3.5 h-3.5" />}
                    </span>
                    <span className="flex-1">{op}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      }
      case 'texto_longo':
        return (
          <div className="mt-4 space-y-2">
            <Textarea
              autoFocus rows={5}
              className="text-base"
              value={val}
              onChange={e => setAnswer(q, e.target.value)}
              placeholder="Digite sua resposta..."
            />
            {renderQuickAnswers(q, val)}
          </div>
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
          <div className="mt-4 space-y-2">
            <Input
              autoFocus
              className="h-14 text-lg"
              value={val}
              onChange={e => setAnswer(q, e.target.value)}
              placeholder="Digite sua resposta..."
            />
            {renderQuickAnswers(q, val)}
          </div>
        );
    }
  };

  // Respostas rápidas — apenas em perguntas de texto curto e longo
  const renderQuickAnswers = (q: Question, val: string) => {
    if (quickAnswers.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2">
        {quickAnswers.map(qa => (
          <Button
            key={qa.id}
            type="button"
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => setAnswer(q, val ? `${val.trim()} ${qa.content}` : qa.content)}
          >
            {qa.title}
          </Button>
        ))}
      </div>
    );
  };

  const requiresManualNext = (q?: Question) =>
    !!q && (q.type === 'texto_curto' || q.type === 'texto_longo' || q.type === 'numero'
      || q.type === 'multi_escolha' || q.type === 'localizacao_anatomica');

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-4 pb-8">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to={initialPatient ? `/clinica/pacientes/${initialPatient}` : '/clinica/pacientes'}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{editId ? 'Editar Anamnese' : 'Nova Anamnese'}</h1>
        </div>

        {editLoading && <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Carregando anamnese…</div>}

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
        {phase === 'setup' && !editLoading && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="w-4 h-4" /> Dados do atendimento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
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
                <div className="md:col-span-2">
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
          <Card className="animate-in fade-in slide-in-from-right-2 duration-200 flex flex-col max-h-[calc(100dvh-11rem)]" key={activeQ.id}>
            <CardContent className="p-6 md:p-8 flex-1 overflow-y-auto">
              <div className="flex items-center gap-2 text-xs font-medium text-primary mb-3">
                <span>PERGUNTA {idx + 1} DE {totalQ}</span>
                {activeQ.required && <span className="text-destructive">*obrigatória</span>}
              </div>
              <div className="text-xl md:text-2xl font-semibold leading-snug text-foreground">
                {activeQ.text}
              </div>
              {renderActiveInput(activeQ)}
            </CardContent>
            <div className="flex flex-wrap items-center justify-between gap-2 px-6 md:px-8 py-4 border-t bg-card">
              <Button variant="outline" onClick={goBack} size="lg" className="gap-1">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button
                variant="ghost"
                onClick={skipQuestion}
                size="lg"
                className="gap-1 text-muted-foreground"
                title="Pular esta pergunta — ela não aparecerá no PDF"
              >
                <SkipForward className="w-4 h-4" /> Pular
              </Button>
              <Button onClick={finishReview} variant="outline" size="lg" className="gap-1">
                <CheckCircle2 className="w-4 h-4" /> Finalizar revisão
              </Button>
              {reviewingAnswer.current ? null : requiresManualNext(activeQ) ? (
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
                    <div className="text-muted-foreground">Modelo: {baseTemplate?.name}{extras.map(e => ` + ${e.name}`).join('')}</div>
                  </div>
                </div>

                <div className="rounded-lg border border-dashed p-3 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="text-sm font-medium">Exames combinados no mesmo PDF</div>
                    <Button type="button" size="sm" variant="outline" onClick={openCombo}>
                      + Adicionar outro exame
                    </Button>
                  </div>
                  {extras.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {extras.map((e, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {e.name} ({e.selectedIds.length})
                          <button type="button" onClick={() => removeExtra(i)} className="ml-1 text-muted-foreground hover:text-destructive" aria-label={`Remover ${e.name}`}>×</button>
                        </Badge>
                      ))}
                    </div>
                  )}
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
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${skippedIds.has(q.id) ? 'bg-warning-light text-warning' : 'bg-primary/15 text-primary'}`}>
                        {skippedIds.has(q.id) ? <SkipForward className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground">
                          Pergunta {i + 1}{extras.length > 0 && (q as SectionQuestion).section ? ` · ${(q as SectionQuestion).section}` : ''}
                          {skippedIds.has(q.id) && <span className="ml-1.5 text-warning font-medium">· pulada (não sai no PDF)</span>}
                        </div>
                        <div className="text-sm font-medium">{q.text}</div>
                        <div className="text-sm text-foreground/80 break-words">
                          {skippedIds.has(q.id) ? (
                            <span className="text-muted-foreground italic">pulada — toque para responder</span>
                          ) : (() => {
                            const vals = parseAnswerValues(answers[q.id]);
                            const shown = (q.type === 'localizacao_anatomica'
                              ? vals.map(s => regionForToken(s, anatomicalRegions, anatomicalMaps)?.nome || s)
                              : vals).join(', ');
                            return shown || <span className="text-muted-foreground italic">sem resposta</span>;
                          })()}
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

                <div id="receita-vinculada" className="rounded-lg border border-warning bg-warning-light p-3 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Label className="text-sm font-medium">Receita vinculada (opcional)</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant={rxEnabled ? 'default' : 'outline'}
                      onClick={() => setRxEnabled(v => !v)}
                    >
                      <FileText className="w-4 h-4 mr-1" /> {rxEnabled ? 'Vinculada' : 'Adicionar receita'}
                    </Button>
                  </div>
                  {rxEnabled && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        A receita será salva no prontuário do paciente e impressa no mesmo PDF da anamnese.
                      </p>
                      <div className="grid gap-2 md:grid-cols-[220px_1fr] md:items-start">
                        <div>
                          <Label className="text-xs">Tipo</Label>
                          <Select value={rxTipo} onValueChange={setRxTipo}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="simples">Receita Simples</SelectItem>
                              <SelectItem value="especial">Receita Especial</SelectItem>
                              <SelectItem value="controlada">Receita Controlada</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Medicamentos e posologia</Label>
                          <Textarea
                            rows={6}
                            className="text-base font-mono bg-background"
                            placeholder={'1) Medicamento — dosagem\n    Tomar ___ a cada ___ horas por ___ dias.'}
                            value={rxContent}
                            onChange={e => setRxContent(e.target.value)}
                          />
                        </div>
                      </div>
                      {quickMeds.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {quickMeds.map(q => (
                            <Button
                              key={q.id}
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs bg-background"
                              onClick={() => setRxContent(prev => (prev ? prev.trimEnd() + '\n\n' : '') + q.content)}
                            >
                              + {q.title}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border p-3 space-y-3 bg-muted/20">
                  <Label className="text-sm font-medium">Assinatura da anamnese (técnico)</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Técnico responsável</Label>
                      <Input
                        value={tecName}
                        onChange={e => setTecName(e.target.value)}
                        placeholder="Nome / registro do técnico"
                        readOnly={tecSig.mode === 'saved'}
                        className={tecSig.mode === 'saved' ? 'bg-muted' : ''}
                      />
                    </div>
                    <DocumentSignaturePicker
                      label="Assinatura do técnico"
                      signatureType="tecnico"
                      onChange={handleTecSigChange}
                    />
                  </div>
                </div>

                {rxEnabled && (
                  <div className="rounded-lg border border-warning bg-warning-light p-3 space-y-4">
                    <Label className="text-sm font-medium">Assinatura da receita vinculada (médico)</Label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Médico responsável</Label>
                        <Input
                          value={medName}
                          onChange={e => setMedName(e.target.value)}
                          placeholder="Nome / CRM"
                          readOnly={medSig.mode === 'saved'}
                          className={medSig.mode === 'saved' ? 'bg-muted' : ''}
                        />
                      </div>
                      <DocumentSignaturePicker
                        label="Assinatura do médico"
                        signatureType="medico"
                        highlight
                        onChange={handleMedSigChange}
                      />
                    </div>
                  </div>
                )}



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
                  <div className="flex flex-col md:flex-row gap-2">
                    <Button onClick={() => submit(false)} disabled={saving || !allAnswered} size="lg" className="gap-2 bg-info text-info-foreground hover:bg-info/90">
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      Salvar
                    </Button>
                    <Button onClick={() => submit(true)} disabled={saving || !allAnswered} size="lg" className="gap-2">
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      <FileText className="w-4 h-4" /> Finalizar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Dialog open={comboOpen} onOpenChange={setComboOpen}>
        <DialogContent className="max-w-lg max-h-[85dvh] flex flex-col">
          <DialogHeader><DialogTitle>Adicionar outro exame</DialogTitle></DialogHeader>
          <div className="space-y-3 overflow-y-auto flex-1">
            <div>
              <Label>Modelo de anamnese</Label>
              <Select value={comboTplId} onValueChange={pickComboTpl}>
                <SelectTrigger><SelectValue placeholder="Escolha o modelo" /></SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.id !== templateId && !extras.some(e => e.templateId === t.id)).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {comboTpl && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Marque as perguntas que quer usar (repetidas já vêm desmarcadas)</span>
                  <button type="button" className="underline" onClick={() => setComboSel(new Set(comboTpl.questions.filter(q => !q.conditions?.length && !q.condition).map(q => q.id)))}>Todas</button>
                </div>
                {comboTpl.questions.filter(q => !q.conditions?.length && !q.condition).map(q => (
                  <label key={q.id} className="flex items-start gap-2 p-2 rounded border cursor-pointer hover:bg-muted">
                    <Checkbox
                      checked={comboSel.has(q.id)}
                      onCheckedChange={(v) => setComboSel(prev => { const n = new Set(prev); v ? n.add(q.id) : n.delete(q.id); return n; })}
                    />
                    <span className="text-sm">{q.text}{q.type === 'localizacao_anatomica' && <Badge variant="outline" className="ml-2 text-[10px]">mapa</Badge>}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComboOpen(false)}>Cancelar</Button>
            <Button onClick={confirmCombo} disabled={!comboTpl || comboSel.size === 0}>Adicionar perguntas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
