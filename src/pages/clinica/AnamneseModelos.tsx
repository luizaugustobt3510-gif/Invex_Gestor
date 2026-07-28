import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Pencil, ArrowUp, ArrowDown, ClipboardList, GitBranch } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type AnswerType = 'sim_nao' | 'texto_curto' | 'texto_longo' | 'numero' | 'lista' | 'multi_escolha';

export interface QuestionCondition {
  /** id of the source question (must appear earlier) */
  questionId: string;
  /** any of these values (case-insensitive) triggers visibility */
  values: string[];
}

export interface Question {
  id: string;
  text: string;
  type: AnswerType;
  required: boolean;
  /** Options for `lista` and `multi_escolha`. */
  options?: string[];
  /** Legacy field kept for backwards compatibility with older templates. */
  condition?: { equals: string };
  /** New cascading logic — question shown when ALL conditions match. */
  conditions?: QuestionCondition[];
}

interface Template {
  id: string;
  name: string;
  exam_type: string;
  questions: Question[];
  is_active: boolean;
}

const ANSWER_TYPES: { value: AnswerType; label: string }[] = [
  { value: 'sim_nao', label: 'Sim / Não' },
  { value: 'lista', label: 'Lista (uma opção)' },
  { value: 'multi_escolha', label: 'Múltipla escolha' },
  { value: 'texto_curto', label: 'Texto curto' },
  { value: 'texto_longo', label: 'Texto longo' },
  { value: 'numero', label: 'Número' },
];

const uid = () => Math.random().toString(36).slice(2, 10);

const emptyTemplate: Omit<Template, 'id'> = {
  name: '',
  exam_type: '',
  questions: [],
  is_active: true,
};

/** All possible answer values a source question could yield (for the conditions UI). */
const possibleValuesFor = (q: Question): string[] => {
  if (q.type === 'sim_nao') return ['Sim', 'Não'];
  if (q.type === 'lista' || q.type === 'multi_escolha') return q.options || [];
  return [];
};

export default function AnamneseModelos() {
  const { user } = useAuth();
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState<Omit<Template, 'id'>>(emptyTemplate);
  const [saving, setSaving] = useState(false);
  const [openCond, setOpenCond] = useState<Record<string, boolean>>({});

  const load = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    const { data } = await supabase
      .from('anamnese_templates')
      .select('*')
      .eq('company_id', user.companyId)
      .order('created_at', { ascending: false });
    setItems((data || []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user?.companyId]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyTemplate);
    setDlgOpen(true);
  };
  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({ name: t.name, exam_type: t.exam_type, questions: t.questions || [], is_active: t.is_active });
    setDlgOpen(true);
  };

  const addQuestion = () => {
    setForm(f => ({
      ...f,
      questions: [...f.questions, { id: uid(), text: '', type: 'texto_curto', required: false }],
    }));
  };
  const updateQ = (id: string, patch: Partial<Question>) => {
    setForm(f => ({ ...f, questions: f.questions.map(q => q.id === id ? { ...q, ...patch } : q) }));
  };
  const removeQ = (id: string) => {
    setForm(f => ({
      ...f,
      questions: f.questions
        .filter(q => q.id !== id)
        // clean up any conditions that referenced the removed question
        .map(q => ({
          ...q,
          conditions: (q.conditions || []).filter(c => c.questionId !== id),
        })),
    }));
  };
  const moveQ = (idx: number, dir: -1 | 1) => {
    setForm(f => {
      const arr = [...f.questions];
      const to = idx + dir;
      if (to < 0 || to >= arr.length) return f;
      [arr[idx], arr[to]] = [arr[to], arr[idx]];
      return { ...f, questions: arr };
    });
  };

  const save = async () => {
    if (!user?.companyId || saving) return;
    if (!form.name.trim() || !form.exam_type.trim()) {
      toast.error('Preencha nome e tipo de exame'); return;
    }
    if (form.questions.some(q => !q.text.trim())) {
      toast.error('Todas as perguntas precisam de texto'); return;
    }
    setSaving(true);
    try {
      const uidUser = (await supabase.auth.getUser()).data.user?.id;
      const payload = {
        company_id: user.companyId,
        name: form.name.trim(),
        exam_type: form.exam_type.trim(),
        questions: form.questions as any,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await supabase.from('anamnese_templates').update(payload).eq('id', editing.id);
        if (error) { toast.error(error.message); return; }
        toast.success('Modelo atualizado');
      } else {
        const { error } = await supabase.from('anamnese_templates').insert({ ...payload, created_by: uidUser });
        if (error) { toast.error(error.message); return; }
        toast.success('Modelo criado');
      }
      setDlgOpen(false);
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: Template) => {
    if (!confirm(`Excluir modelo "${t.name}"?`)) return;
    const { error } = await supabase.from('anamnese_templates').delete().eq('id', t.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Modelo excluído');
    load();
  };

  /** Any other question with enumerable answers can be a trigger (order-independent). */
  const sourcesFor = (qId: string) =>
    form.questions.filter(q =>
      q.id !== qId && (q.type === 'sim_nao' || q.type === 'lista' || q.type === 'multi_escolha')
    );

  const setConditions = (qId: string, conditions: QuestionCondition[]) => {
    updateQ(qId, { conditions: conditions.length ? conditions : undefined });
  };


  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" /> Modelos de Anamnese
            </CardTitle>
            <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Novo modelo</Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center text-muted-foreground py-8">Carregando...</div>
            ) : items.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">Nenhum modelo cadastrado.</div>
            ) : (
              <div className="space-y-3">
                {items.map(t => (
                  <Card key={t.id} className="border">
                    <CardContent className="pt-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{t.name}</span>
                          <Badge variant="secondary">{t.exam_type}</Badge>
                          {!t.is_active && <Badge variant="destructive">Inativo</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(t.questions || []).length} pergunta(s)
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(t)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="destructive" onClick={() => remove(t)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* MAIN TEMPLATE DIALOG */}
        <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle>{editing ? 'Editar modelo' : 'Novo modelo de anamnese'}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Nome do modelo *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>Tipo de exame *</Label>
                  <Input placeholder="Ex.: Clínico geral, Cardiológico..." value={form.exam_type} onChange={e => setForm({ ...form, exam_type: e.target.value })} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label className="mb-0">Ativo</Label>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Perguntas</Label>
                  <Button size="sm" variant="outline" onClick={addQuestion} className="gap-1">
                    <Plus className="w-3.5 h-3.5" /> Pergunta
                  </Button>
                </div>
                {form.questions.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground border rounded p-4">
                    Nenhuma pergunta ainda.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {form.questions.map((q, idx) => {
                      const canHaveConditions = idx > 0 && form.questions.slice(0, idx).some(p =>
                        p.type === 'sim_nao' || p.type === 'lista' || p.type === 'multi_escolha'
                      );
                      const conds = q.conditions || (q.condition?.equals && idx > 0
                        ? [{ questionId: form.questions[idx - 1].id, values: [q.condition.equals] }]
                        : []);
                      return (
                        <Card key={q.id} className="border">
                          <CardContent className="pt-4 space-y-2">
                            <div className="flex items-start gap-2">
                              <div className="flex flex-col gap-1">
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveQ(idx, -1)}><ArrowUp className="w-3.5 h-3.5" /></Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveQ(idx, 1)}><ArrowDown className="w-3.5 h-3.5" /></Button>
                              </div>
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-2">
                                <div className="md:col-span-4">
                                  <Label className="text-xs">Pergunta {idx + 1}</Label>
                                  <Input value={q.text} onChange={e => updateQ(q.id, { text: e.target.value })} />
                                </div>
                                <div className="md:col-span-2">
                                  <Label className="text-xs">Tipo</Label>
                                  <Select value={q.type} onValueChange={(v) => updateQ(q.id, { type: v as AnswerType })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {ANSWER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {(q.type === 'lista' || q.type === 'multi_escolha') && (
                                  <div className="md:col-span-6">
                                    <Label className="text-xs">Opções (separadas por vírgula)</Label>
                                    <Input
                                      value={(q.options || []).join(', ')}
                                      onChange={e => updateQ(q.id, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                    />
                                  </div>
                                )}
                                <div className="md:col-span-3 flex items-center gap-2 mt-1">
                                  <Switch checked={q.required} onCheckedChange={(v) => updateQ(q.id, { required: v })} />
                                  <Label className="mb-0 text-xs">Obrigatória</Label>
                                </div>
                                {canHaveConditions && (
                                  <div className="md:col-span-3 flex items-center justify-end">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={conds.length ? 'default' : 'outline'}
                                      className="gap-1"
                                      onClick={() => setCondDlg({ qId: q.id })}
                                    >
                                      <GitBranch className="w-3.5 h-3.5" />
                                      {conds.length ? `Exibir se (${conds.length})` : 'Exibir sempre'}
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => removeQ(q.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                            {conds.length > 0 && (
                              <div className="text-xs text-muted-foreground pl-10 space-y-0.5">
                                {conds.map((c, i) => {
                                  const src = form.questions.find(qq => qq.id === c.questionId);
                                  return (
                                    <div key={i}>
                                      Se "{src?.text || '?'}" = {c.values.join(' ou ')}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="p-6 pt-3 border-t">
              <Button variant="outline" onClick={() => setDlgOpen(false)}>Cancelar</Button>
              <Button onClick={save}>{editing ? 'Salvar' : 'Criar modelo'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CONDITIONS DIALOG */}
        <Dialog open={!!condDlg} onOpenChange={(o) => !o && setCondDlg(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Condições de exibição</DialogTitle>
            </DialogHeader>
            {currentCondQ && (
              <ConditionsEditor
                sources={eligibleSources}
                value={
                  currentCondQ.conditions ||
                  (currentCondQ.condition?.equals && currentCondIdx > 0
                    ? [{ questionId: form.questions[currentCondIdx - 1].id, values: [currentCondQ.condition.equals] }]
                    : [])
                }
                onChange={(next) => setConditions(currentCondQ.id, next)}
              />
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setCondDlg(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

function ConditionsEditor({
  sources, value, onChange,
}: {
  sources: Question[];
  value: QuestionCondition[];
  onChange: (v: QuestionCondition[]) => void;
}) {
  const addRow = () => {
    const first = sources[0];
    if (!first) return;
    onChange([...value, { questionId: first.id, values: [] }]);
  };
  const removeRow = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const updateRow = (i: number, patch: Partial<QuestionCondition>) =>
    onChange(value.map((c, idx) => idx === i ? { ...c, ...patch } : c));

  if (sources.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Não há perguntas anteriores com respostas selecionáveis (Sim/Não, Lista, Múltipla escolha) para usar como gatilho.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        A pergunta só aparece quando <strong>todas</strong> as condições abaixo forem satisfeitas.
        Cada condição casa se a resposta do usuário for <strong>qualquer uma</strong> das marcadas.
      </p>
      {value.length === 0 && (
        <div className="text-sm text-muted-foreground italic">
          Sem condições — a pergunta aparece sempre.
        </div>
      )}
      {value.map((c, i) => {
        const src = sources.find(s => s.id === c.questionId) || sources[0];
        const opts = possibleValuesFor(src);
        return (
          <div key={i} className="border rounded-md p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Select value={c.questionId} onValueChange={(v) => updateRow(i, { questionId: v, values: [] })}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sources.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.text.slice(0, 60) || '(sem texto)'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="icon" variant="ghost" onClick={() => removeRow(i)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">Responder com:</div>
            <div className="grid grid-cols-2 gap-2">
              {opts.map(o => {
                const checked = c.values.includes(o);
                return (
                  <label key={o} className="flex items-center gap-2 border rounded px-2 py-1.5 cursor-pointer hover:bg-muted">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        const next = v
                          ? [...c.values, o]
                          : c.values.filter(x => x !== o);
                        updateRow(i, { values: next });
                      }}
                    />
                    <span className="text-sm">{o}</span>
                  </label>
                );
              })}
              {opts.length === 0 && (
                <div className="col-span-2 text-xs text-muted-foreground italic">
                  Configure as opções desta pergunta primeiro.
                </div>
              )}
            </div>
          </div>
        );
      })}
      <Button size="sm" variant="outline" onClick={addRow} className="gap-1">
        <Plus className="w-3.5 h-3.5" /> Adicionar condição
      </Button>
    </div>
  );
}
