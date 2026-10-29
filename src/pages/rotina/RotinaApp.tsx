import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { CalendarCheck, LogOut, Plus, Trash2, Sparkles, Lock, Flame, Sun, ListTodo, Repeat, Target, BarChart3, NotebookPen, Bell, StickyNote, UserCircle, Timer, Sunrise } from 'lucide-react';
import { format, startOfWeek, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { FocoTimer, Rituais, useInsights, InsightsCard, ExportWeekButton } from './RotinaPremiumTools';
import { FREE_LIMITS, isPremium, type RotinaAccess } from '@/lib/rotinaPlan';

const db = supabase as any;
const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
const CATS = ['pessoal', 'trabalho', 'estudos', 'saude'];
const CAT_LABEL: Record<string, string> = { pessoal: 'Pessoal', trabalho: 'Trabalho', estudos: 'Estudos', saude: 'Saúde' };

interface Task { id: string; titulo: string; data: string; horario: string | null; categoria: string; prioridade: string; concluida: boolean }
interface Habit { id: string; nome: string; ativo: boolean }
interface Goal { id: string; titulo: string; periodo: string; prazo: string | null; progresso: number; concluida: boolean }

const errMsg = (e: any) => String(e?.message || '').includes('LIMITE_GRATUITO')
  ? String(e.message).replace('LIMITE_GRATUITO: ', 'Limite do plano gratuito: ') : 'Não foi possível salvar.';

export default function RotinaApp() {
  const navigate = useNavigate();
  const [state, setState] = useState<'loading' | 'ok' | 'blocked'>('loading');
  const [access, setAccess] = useState<RotinaAccess | null>(null);
  const [nome, setNome] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<{ habit_id: string; data: string }[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [review, setReview] = useState({ realizacoes: '', reflexao: '', prioridades: '' });

  const today = new Date();
  const todayS = ymd(today);
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekStartS = ymd(weekStart);
  const premium = isPremium(access, todayS);
  const [uid, setUid] = useState('');

  const load = useCallback(async () => {
    const [t, h, l, g, r] = await Promise.all([
      db.from('routine_tasks').select('*').gte('data', ymd(subDays(today, 30))).order('data').order('horario'),
      db.from('routine_habits').select('*').eq('ativo', true).order('created_at'),
      db.from('routine_habit_logs').select('habit_id, data').gte('data', ymd(subDays(today, 60))),
      db.from('routine_goals').select('*').order('created_at'),
      db.from('routine_weekly_reviews').select('*').eq('semana_inicio', weekStartS).maybeSingle(),
    ]);
    setTasks(t.data || []); setHabits(h.data || []); setLogs(l.data || []); setGoals(g.data || []);
    if (r.data) setReview({ realizacoes: r.data.realizacoes || '', reflexao: r.data.reflexao || '', prioridades: r.data.prioridades || '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartS]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/rotina/entrar', { replace: true }); return; }
      setUid(user.id);
      setNome(user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.nome || user.email?.split('@')[0] || '');
      const { data: st, error } = await db.rpc('routine_join');
      if (error || st !== 'ativo') { setState('blocked'); return; }
      const { data: acc } = await db.from('routine_access').select('status, plano, premium_status, premium_fim').eq('user_id', user.id).single();
      setAccess(acc); setState('ok'); load();
    })();
  }, [navigate, load]);

  const logout = async () => { await supabase.auth.signOut(); navigate('/rotina/entrar'); };

  // ---- Tarefas
  const [nt, setNt] = useState({ titulo: '', data: todayS, horario: '', categoria: 'pessoal', prioridade: 'media' });
  const addTask = async () => {
    if (!nt.titulo.trim()) return;
    const { error } = await db.from('routine_tasks').insert({ ...nt, titulo: nt.titulo.trim(), horario: nt.horario || null });
    if (error) return toast.error(errMsg(error));
    setNt({ ...nt, titulo: '', horario: '' }); load();
  };
  const toggleTask = async (t: Task) => { await db.from('routine_tasks').update({ concluida: !t.concluida }).eq('id', t.id); load(); };
  const moveTomorrow = async (t: Task) => { await db.from('routine_tasks').update({ data: ymd(addDays(today, 1)) }).eq('id', t.id); load(); };
  const delTask = async (id: string) => { await db.from('routine_tasks').delete().eq('id', id); load(); };

  const [qt, setQt] = useState('');
  const addQuick = async () => {
    if (!qt.trim()) return;
    const { error } = await db.from('routine_tasks').insert({ titulo: qt.trim(), data: todayS, categoria: 'pessoal', prioridade: 'media' });
    if (error) return toast.error(errMsg(error));
    setQt(''); load();
  };

  // ---- Lembretes
  const [reminders, setReminders] = useState<{ id: string; titulo: string; lembrar_em: string; concluido: boolean }[]>([]);
  const [nr, setNr] = useState({ titulo: '', quando: '' });
  const loadReminders = useCallback(async () => {
    const { data } = await db.from('routine_reminders').select('*').order('lembrar_em');
    setReminders(data || []);
  }, []);
  const addReminder = async () => {
    if (!nr.titulo.trim() || !nr.quando) return toast.error('Informe o lembrete e a data/hora.');
    const { error } = await db.from('routine_reminders').insert({ titulo: nr.titulo.trim(), lembrar_em: new Date(nr.quando).toISOString() });
    if (error) return toast.error('Não foi possível salvar.');
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    setNr({ titulo: '', quando: '' }); loadReminders();
  };
  const doneReminder = async (id: string, v: boolean) => { await db.from('routine_reminders').update({ concluido: v }).eq('id', id); loadReminders(); };
  const delReminder = async (id: string) => { await db.from('routine_reminders').delete().eq('id', id); loadReminders(); };
  useEffect(() => {
    if (state !== 'ok') return;
    loadReminders();
    const shown = new Set<string>();
    const tick = async () => {
      const { data } = await db.from('routine_reminders').select('id, titulo, lembrar_em').eq('concluido', false).lte('lembrar_em', new Date().toISOString());
      (data || []).forEach((r: any) => {
        if (shown.has(r.id)) return; shown.add(r.id);
        toast(`🔔 ${r.titulo}`, { duration: 15000 });
        if ('Notification' in window && Notification.permission === 'granted') new Notification('Invex Rotina', { body: r.titulo });
      });
    };
    tick(); const iv = setInterval(tick, 30000); return () => clearInterval(iv);
  }, [state, loadReminders]);

  // ---- Notas
  const [notes, setNotes] = useState<{ id: string; titulo: string; conteudo: string; updated_at: string }[]>([]);
  const [nn, setNn] = useState({ id: '', titulo: '', conteudo: '' });
  const loadNotes = useCallback(async () => {
    const { data } = await db.from('routine_notes').select('*').order('updated_at', { ascending: false });
    setNotes(data || []);
  }, []);
  useEffect(() => { if (state === 'ok') loadNotes(); }, [state, loadNotes]);
  const saveNote = async () => {
    if (!nn.titulo.trim() && !nn.conteudo.trim()) return;
    const row = { titulo: nn.titulo.trim(), conteudo: nn.conteudo, updated_at: new Date().toISOString() };
    const { error } = nn.id ? await db.from('routine_notes').update(row).eq('id', nn.id) : await db.from('routine_notes').insert(row);
    if (error) return toast.error('Não foi possível salvar a nota.');
    toast.success('Nota salva.'); setNn({ id: '', titulo: '', conteudo: '' }); loadNotes();
  };
  const delNote = async (id: string) => { await db.from('routine_notes').delete().eq('id', id); if (nn.id === id) setNn({ id: '', titulo: '', conteudo: '' }); loadNotes(); };

  // ---- Perfil
  const [email, setEmail] = useState('');
  const [pf, setPf] = useState({ nome: '', senha: '', senha2: '' });
  const [avatar, setAvatar] = useState<string | null>(null);
  const [upAv, setUpAv] = useState(false);
  const loadAvatar = useCallback(async (id: string) => {
    const { data } = await supabase.storage.from('rotina-avatars').createSignedUrl(`${id}/avatar.jpg`, 3600);
    setAvatar(data?.signedUrl ? `${data.signedUrl}&t=${Date.now()}` : null);
  }, []);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email || '')); }, []);
  useEffect(() => { if (uid) loadAvatar(uid); }, [uid, loadAvatar]);
  const uploadAvatar = async (file?: File) => {
    if (!file || !uid) return;
    if (!file.type.startsWith('image/')) return toast.error('Escolha uma imagem.');
    setUpAv(true);
    try {
      const img = await createImageBitmap(file);
      const s = Math.min(img.width, img.height);
      const c = document.createElement('canvas'); c.width = c.height = 320;
      c.getContext('2d')!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 320, 320);
      const blob: Blob = await new Promise((r, j) => c.toBlob(b => b ? r(b) : j(new Error('blob')), 'image/jpeg', 0.85));
      const { error } = await supabase.storage.from('rotina-avatars').upload(`${uid}/avatar.jpg`, blob, { upsert: true, contentType: 'image/jpeg' });
      if (error) throw error;
      await loadAvatar(uid); toast.success('Foto atualizada.');
    } catch { toast.error('Não foi possível enviar a foto.'); } finally { setUpAv(false); }
  };
  const removeAvatar = async () => {
    if (!uid) return;
    await supabase.storage.from('rotina-avatars').remove([`${uid}/avatar.jpg`]);
    setAvatar(null); toast.success('Foto removida.');
  };
  useEffect(() => { setPf(p => ({ ...p, nome })); }, [nome]);
  const saveName = async () => {
    if (!pf.nome.trim()) return toast.error('Informe seu nome.');
    const { error } = await supabase.auth.updateUser({ data: { full_name: pf.nome.trim(), nome: pf.nome.trim() } });
    if (error) return toast.error('Não foi possível salvar o nome.');
    setNome(pf.nome.trim()); toast.success('Nome atualizado.');
  };
  const savePassword = async () => {
    if (pf.senha.length < 8) return toast.error('A senha precisa ter ao menos 8 caracteres.');
    if (pf.senha !== pf.senha2) return toast.error('As senhas não conferem.');
    const { error } = await supabase.auth.updateUser({ password: pf.senha });
    if (error) return toast.error('Não foi possível alterar a senha.');
    setPf(p => ({ ...p, senha: '', senha2: '' })); toast.success('Senha alterada.');
  };

  // ---- Hábitos
  const [nh, setNh] = useState('');
  const addHabit = async () => {
    if (!nh.trim()) return;
    const { error } = await db.from('routine_habits').insert({ nome: nh.trim() });
    if (error) return toast.error(errMsg(error));
    setNh(''); load();
  };
  const doneToday = (hid: string) => logs.some(l => l.habit_id === hid && l.data === todayS);
  const toggleHabit = async (hid: string) => {
    if (doneToday(hid)) await db.from('routine_habit_logs').delete().eq('habit_id', hid).eq('data', todayS);
    else await db.from('routine_habit_logs').insert({ habit_id: hid, data: todayS });
    load();
  };
  const streak = (hid: string) => {
    const set = new Set(logs.filter(l => l.habit_id === hid).map(l => l.data));
    let n = 0, d = set.has(todayS) ? today : subDays(today, 1);
    while (set.has(ymd(d))) { n++; d = subDays(d, 1); }
    return n;
  };
  const delHabit = async (id: string) => { await db.from('routine_habits').update({ ativo: false }).eq('id', id); load(); };

  // ---- Metas
  const [ng, setNg] = useState({ titulo: '', periodo: 'semanal' });
  const addGoal = async () => {
    if (!ng.titulo.trim()) return;
    const { error } = await db.from('routine_goals').insert({ ...ng, titulo: ng.titulo.trim() });
    if (error) return toast.error(errMsg(error));
    setNg({ ...ng, titulo: '' }); load();
  };
  const setProgress = async (g: Goal, p: number) => {
    await db.from('routine_goals').update({ progresso: p, concluida: p >= 100 }).eq('id', g.id); load();
  };
  const delGoal = async (id: string) => { await db.from('routine_goals').delete().eq('id', id); load(); };

  // ---- Indicadores reais
  const todayTasks = tasks.filter(t => t.data === todayS);
  const overdue = tasks.filter(t => t.data < todayS && !t.concluida);
  const weekDays = Array.from({ length: 7 }, (_, i) => ymd(addDays(weekStart, i)));
  const weekTasks = tasks.filter(t => weekDays.includes(t.data));
  const weekHabitDone = logs.filter(l => weekDays.includes(l.data) && l.data <= todayS).length;
  const elapsed = weekDays.filter(d => d <= todayS).length;
  const consistency = habits.length ? Math.round((weekHabitDone / (habits.length * elapsed)) * 100) : 0;
  const insights = useInsights(weekTasks, consistency, habits.length);
  const activeGoals = goals.filter(g => !g.concluida);
  const upcoming = useMemo(() => tasks.filter(t => t.data > todayS && !t.concluida).slice(0, 5), [tasks, todayS]);

  const last14 = Array.from({ length: 14 }, (_, i) => ymd(subDays(today, 13 - i)));
  const chartTasks = last14.map(d => ({ dia: format(new Date(d + 'T12:00'), 'dd/MM'), Concluídas: tasks.filter(t => t.data === d && t.concluida).length, Pendentes: tasks.filter(t => t.data === d && !t.concluida).length }));
  const chartHabits = last14.map(d => ({ dia: format(new Date(d + 'T12:00'), 'dd/MM'), pct: habits.length ? Math.round(logs.filter(l => l.data === d && habits.some(h => h.id === l.habit_id)).length / habits.length * 100) : 0 }));
  const chartCats = CATS.map(c => ({ name: CAT_LABEL[c], value: tasks.filter(t => t.categoria === c).length })).filter(x => x.value > 0);
  const PIE = ['hsl(24 95% 53%)', 'hsl(32 98% 60%)', 'hsl(14 85% 50%)', 'hsl(40 95% 55%)'];

  const saveReview = async () => {
    const { error } = await db.from('routine_weekly_reviews').upsert({ semana_inicio: weekStartS, ...review }, { onConflict: 'user_id,semana_inicio' });
    if (error) return toast.error('A revisão semanal é um recurso Premium.');
    toast.success('Revisão salva.');
  };

  if (state === 'loading') return <div className="min-h-[100dvh] flex items-center justify-center text-sm text-muted-foreground">Carregando...</div>;
  if (state === 'blocked') return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3 px-6 text-center">
      <Lock className="h-8 w-8 text-muted-foreground" />
      <p className="font-medium">Seu acesso ao Invex Rotina está suspenso.</p>
      <p className="text-sm text-muted-foreground">Seus dados continuam guardados. Fale com o suporte Invex.</p>
      <Button variant="outline" onClick={logout}>Sair</Button>
    </div>
  );

  const TaskRow = ({ t }: { t: Task }) => (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <Checkbox checked={t.concluida} onCheckedChange={() => toggleTask(t)} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${t.concluida ? 'line-through text-muted-foreground' : ''}`}>{t.titulo}</p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(t.data + 'T12:00'), "EEE, dd/MM", { locale: ptBR })}{t.horario ? ` · ${t.horario.slice(0, 5)}` : ''} · {CAT_LABEL[t.categoria] || t.categoria}
        </p>
      </div>
      {t.prioridade === 'alta' && <Badge variant="destructive" className="text-[10px]">Urgente</Badge>}
      {!t.concluida && t.data <= todayS && <Button size="sm" variant="ghost" className="text-xs" onClick={() => moveTomorrow(t)}>Amanhã</Button>}
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => delTask(t.id)} aria-label="Excluir"><Trash2 className="h-4 w-4" /></Button>
    </div>
  );

  const Card = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
    <section className="rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-semibold">{title}</h2>{action}</div>
      {children}
    </section>
  );

  const Upgrade = ({ what }: { what: string }) => (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center space-y-2">
      <Sparkles className="h-6 w-6 text-primary mx-auto" />
      <p className="font-medium">{what} é Premium</p>
      <p className="text-sm text-muted-foreground">Fale com a equipe Invex para ativar o Premium. Seus dados ficam guardados.</p>
    </div>
  );

  return (
    <div className="rotina-theme min-h-[100dvh] bg-background overflow-x-hidden">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="max-w-6xl mx-auto px-3 sm:px-5 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold min-w-0"><CalendarCheck className="h-5 w-5 text-primary shrink-0" /><span className="truncate">Invex Rotina</span></div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={premium ? 'default' : 'secondary'}>{premium ? 'Premium' : 'Gratuito'}</Badge>
            <div className="h-8 w-8 rounded-full overflow-hidden bg-muted flex items-center justify-center">
              {avatar ? <img src={avatar} alt="Sua foto" className="h-full w-full object-cover" onError={() => setAvatar(null)} /> : <UserCircle className="h-5 w-5 text-muted-foreground" />}
            </div>
            <Button size="icon" variant="ghost" className="h-10 w-10" onClick={logout} aria-label="Sair"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-5 py-4 sm:py-6 space-y-5 sm:space-y-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold truncate">Olá, {nome.split(' ')[0]}</h1>
          <p className="text-sm text-muted-foreground capitalize">{format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
        </div>

        <Tabs defaultValue="hoje" orientation="vertical" className="md:flex md:gap-6">
          <TabsList className="h-auto w-full md:w-48 md:shrink-0 flex md:flex-col justify-start md:items-stretch overflow-x-auto md:sticky md:top-20 md:self-start bg-muted/60 p-1.5 gap-1 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {([
              ['hoje', 'Hoje', Sun], ['tarefas', 'Tarefas', ListTodo], ['habitos', 'Hábitos', Repeat], ['metas', 'Metas', Target], ['foco', 'Foco', Timer], ['rituais', 'Rituais', Sunrise],
              ['lembretes', 'Lembretes', Bell], ['notas', 'Notas', StickyNote], ['graficos', 'Gráficos', BarChart3],
              ['revisao', 'Revisão', NotebookPen], ['perfil', 'Perfil', UserCircle],
            ] as const).map(([v, l, I]) => (
              <TabsTrigger key={v} value={v} className="md:justify-start gap-2 px-3 py-2.5 min-h-10 shrink-0 snap-start"><I className="h-4 w-4" />{l}</TabsTrigger>
            ))}
          </TabsList>
          <div className="flex-1 min-w-0">

          <TabsContent value="hoje" className="space-y-4 mt-4 md:mt-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ['Hoje', `${todayTasks.filter(t => t.concluida).length}/${todayTasks.length}`],
                ['Atrasadas', overdue.length],
                ['Hábitos hoje', `${habits.filter(h => doneToday(h.id)).length}/${habits.length}`],
                ['Consistência', `${consistency}%`],
              ].map(([l, v]) => (
                <div key={l as string} className="rounded-2xl border border-border p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="text-xl font-semibold mt-1">{v}</p></div>
              ))}
            </div>
            <Card title="Prioridades de hoje">
              <div className="flex gap-2 mb-3"><Input className="text-base" placeholder="Nova tarefa de hoje..." value={qt} onChange={e => setQt(e.target.value)} onKeyDown={e => e.key === 'Enter' && addQuick()} /><Button onClick={addQuick} size="icon" aria-label="Adicionar tarefa de hoje"><Plus className="h-4 w-4" /></Button></div>
              {todayTasks.length === 0 && overdue.length === 0 ? <p className="text-sm text-muted-foreground">Nada para hoje. Adicione em Tarefas.</p> :
                [...overdue, ...todayTasks].map(t => <TaskRow key={t.id} t={t} />)}
            </Card>
            <div className="grid sm:grid-cols-2 gap-4">
              <Card title="Hábitos do dia">
                {habits.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum hábito ainda.</p> : habits.map(h => (
                  <label key={h.id} className="flex items-center gap-3 py-2"><Checkbox checked={doneToday(h.id)} onCheckedChange={() => toggleHabit(h.id)} /><span className="text-sm flex-1">{h.nome}</span></label>
                ))}
              </Card>
              <Card title="Próximos compromissos">
                {upcoming.length === 0 ? <p className="text-sm text-muted-foreground">Sem compromissos futuros.</p> : upcoming.map(t => (
                  <p key={t.id} className="text-sm py-1.5">{format(new Date(t.data + 'T12:00'), 'dd/MM')}{t.horario ? ` ${t.horario.slice(0, 5)}` : ''} — {t.titulo}</p>
                ))}
              </Card>
            </div>
            <Card title="Metas em andamento">
              {activeGoals.length === 0 ? <p className="text-sm text-muted-foreground">Sem metas ativas.</p> : activeGoals.map(g => (
                <div key={g.id} className="py-2"><div className="flex justify-between text-sm mb-1"><span>{g.titulo}</span><span className="text-muted-foreground">{g.progresso}%</span></div><Progress value={g.progresso} /></div>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="tarefas" className="space-y-4 mt-4 md:mt-0">
            <Card title="Nova tarefa">
              <div className="grid gap-2 sm:grid-cols-6">
                <Input className="sm:col-span-2 text-base" placeholder="O que precisa fazer?" value={nt.titulo} onChange={e => setNt({ ...nt, titulo: e.target.value })} onKeyDown={e => e.key === 'Enter' && addTask()} />
                <Input type="date" className="text-base" value={nt.data} onChange={e => setNt({ ...nt, data: e.target.value })} />
                <Input type="time" className="text-base" value={nt.horario} onChange={e => setNt({ ...nt, horario: e.target.value })} />
                <Select value={nt.categoria} onValueChange={v => setNt({ ...nt, categoria: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATS.map(c => <SelectItem key={c} value={c}>{CAT_LABEL[c]}</SelectItem>)}</SelectContent></Select>
                <Select value={nt.prioridade} onValueChange={v => setNt({ ...nt, prioridade: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="baixa">Baixa</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="alta">Urgente</SelectItem></SelectContent></Select>
              </div>
              <Button className="mt-3" onClick={addTask}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
            </Card>
            <Card title="Esta semana">
              {weekTasks.length === 0 ? <p className="text-sm text-muted-foreground">Sem tarefas nesta semana.</p> : weekTasks.map(t => <TaskRow key={t.id} t={t} />)}
            </Card>
            {overdue.length > 0 && <Card title="Atrasadas">{overdue.map(t => <TaskRow key={t.id} t={t} />)}</Card>}
          </TabsContent>

          <TabsContent value="habitos" className="space-y-4 mt-4 md:mt-0">
            <Card title="Meus hábitos" action={!premium && <span className="text-xs text-muted-foreground">{habits.length}/{FREE_LIMITS.habitos} no gratuito</span>}>
              <div className="flex gap-2 mb-3">
                <Input className="text-base" placeholder="Ex.: Beber 2L de água" value={nh} onChange={e => setNh(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHabit()} />
                <Button onClick={addHabit}><Plus className="h-4 w-4" /></Button>
              </div>
              {habits.map(h => (
                <div key={h.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                  <Checkbox checked={doneToday(h.id)} onCheckedChange={() => toggleHabit(h.id)} />
                  <span className="text-sm flex-1">{h.nome}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Flame className="h-3.5 w-3.5" />{streak(h.id)} dias</span>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => delHabit(h.id)} aria-label="Remover"><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="metas" className="space-y-4 mt-4 md:mt-0">
            <Card title="Metas" action={!premium && <span className="text-xs text-muted-foreground">{activeGoals.length}/{FREE_LIMITS.metas} ativas no gratuito</span>}>
              <div className="flex gap-2 mb-3">
                <Input className="text-base" placeholder="Ex.: Ler 2 livros" value={ng.titulo} onChange={e => setNg({ ...ng, titulo: e.target.value })} />
                <Select value={ng.periodo} onValueChange={v => setNg({ ...ng, periodo: v })}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="semanal">Semanal</SelectItem><SelectItem value="mensal">Mensal</SelectItem></SelectContent></Select>
                <Button onClick={addGoal}><Plus className="h-4 w-4" /></Button>
              </div>
              {goals.map(g => (
                <div key={g.id} className="py-3 border-b border-border last:border-0 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className={g.concluida ? 'line-through text-muted-foreground' : ''}>{g.titulo} <span className="text-xs text-muted-foreground">· {g.periodo}</span></span>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => delGoal(g.id)} aria-label="Excluir"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <Progress value={g.progresso} />
                  <div className="flex gap-1">{[0, 25, 50, 75, 100].map(p => (
                    <Button key={p} size="sm" variant={g.progresso === p ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setProgress(g, p)}>{p}%</Button>
                  ))}</div>
                </div>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="revisao" className="space-y-4 mt-4 md:mt-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ['Planejadas', weekTasks.length],
                ['Concluídas', weekTasks.filter(t => t.concluida).length],
                ['Pendentes', weekTasks.filter(t => !t.concluida).length],
                ['Consistência', `${consistency}%`],
              ].map(([l, v]) => (
                <div key={l as string} className="rounded-2xl border border-border p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="text-xl font-semibold mt-1">{v}</p></div>
              ))}
            </div>
            {premium ? (
              <Card title={`Semana de ${format(weekStart, 'dd/MM')}`}>
                <div className="space-y-3">
                  <Textarea className="text-base" placeholder="Principais realizações" value={review.realizacoes} onChange={e => setReview({ ...review, realizacoes: e.target.value })} />
                  <Textarea className="text-base" placeholder="O que aprendi / reflexão" value={review.reflexao} onChange={e => setReview({ ...review, reflexao: e.target.value })} />
                  <Textarea className="text-base" placeholder="Prioridades da próxima semana" value={review.prioridades} onChange={e => setReview({ ...review, prioridades: e.target.value })} />
                  <Button onClick={saveReview}>Salvar revisão</Button>
                </div>
              </Card>
            ) : <Upgrade what="A revisão semanal com reflexão" />}
            {premium ? (<>
              <InsightsCard insights={insights.list} />
              <ExportWeekButton nome={nome} semana={format(weekStart, 'dd/MM/yyyy')} weekTasks={weekTasks} consistency={consistency} insights={insights.list} review={review} />
            </>) : <Upgrade what="Insights e relatório em PDF" />}
          </TabsContent>

          <TabsContent value="foco" className="space-y-4 mt-4 md:mt-0">
            {premium ? <FocoTimer tasks={tasks.filter(t => !t.concluida && t.data <= todayS)} /> : <Upgrade what="O modo foco (Pomodoro)" />}
          </TabsContent>
          <TabsContent value="rituais" className="space-y-4 mt-4 md:mt-0">
            {premium ? (uid && <Rituais userKey={uid} />) : <Upgrade what="Os rituais da manhã e da noite" />}
          </TabsContent>

          <TabsContent value="graficos" className="space-y-4 mt-4 md:mt-0">
            {premium ? (<>
              <Card title="Tarefas – últimos 14 dias">
                <div className="h-56"><ResponsiveContainer><BarChart data={chartTasks}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="dia" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} width={24} /><Tooltip />
                  <Bar dataKey="Concluídas" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} /><Bar dataKey="Pendentes" stackId="a" fill="hsl(var(--muted-foreground) / 0.3)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
              </Card>
              <div className="grid gap-4 sm:grid-cols-2">
                <Card title="Hábitos cumpridos (%)">
                  <div className="h-48"><ResponsiveContainer><LineChart data={chartHabits}><XAxis dataKey="dia" fontSize={11} /><YAxis domain={[0, 100]} fontSize={11} width={28} /><Tooltip /><Line type="monotone" dataKey="pct" name="%" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
                </Card>
                <Card title="Tarefas por categoria">
                  {chartCats.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados ainda.</p> :
                  <div className="h-48"><ResponsiveContainer><PieChart><Pie data={chartCats} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} label>{chartCats.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>}
                </Card>
              </div>
            </>) : <Upgrade what="Os gráficos de desempenho" />}
          </TabsContent>

          <TabsContent value="lembretes" className="space-y-4 mt-4 md:mt-0">
            <Card title="Novo lembrete">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <Input className="text-base" placeholder="Lembrar de..." value={nr.titulo} onChange={e => setNr({ ...nr, titulo: e.target.value })} />
                <Input type="datetime-local" className="text-base" value={nr.quando} onChange={e => setNr({ ...nr, quando: e.target.value })} />
                <Button onClick={addReminder}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">O aviso aparece na tela quando chegar a hora, com o Rotina aberto.</p>
            </Card>
            <Card title="Meus lembretes">
              {reminders.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum lembrete.</p> : reminders.map(r => {
                const late = !r.concluido && new Date(r.lembrar_em) <= new Date();
                return (
                  <div key={r.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                    <Checkbox checked={r.concluido} onCheckedChange={v => doneReminder(r.id, !!v)} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${r.concluido ? 'line-through text-muted-foreground' : ''}`}>{r.titulo}</p>
                      <p className={`text-xs ${late ? 'text-primary font-medium' : 'text-muted-foreground'}`}>{format(new Date(r.lembrar_em), "EEE, dd/MM 'às' HH:mm", { locale: ptBR })}</p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => delReminder(r.id)} aria-label="Excluir"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                );
              })}
            </Card>
          </TabsContent>

          <TabsContent value="notas" className="space-y-4 mt-4 md:mt-0">
            <Card title={nn.id ? 'Editar nota' : 'Nova nota'} action={nn.id && <Button size="sm" variant="ghost" onClick={() => setNn({ id: '', titulo: '', conteudo: '' })}>Cancelar</Button>}>
              <div className="space-y-2">
                <Input className="text-base" placeholder="Título" value={nn.titulo} onChange={e => setNn({ ...nn, titulo: e.target.value })} />
                <Textarea className="text-base min-h-32" placeholder="Escreva sua nota..." value={nn.conteudo} onChange={e => setNn({ ...nn, conteudo: e.target.value })} />
                <Button onClick={saveNote}>Salvar nota</Button>
              </div>
            </Card>
            <div className="grid gap-3 sm:grid-cols-2">
              {notes.map(n => (
                <div key={n.id} className="rounded-2xl border border-border p-4 cursor-pointer hover:border-primary/50" onClick={() => setNn({ id: n.id, titulo: n.titulo, conteudo: n.conteudo })}>
                  <div className="flex items-start gap-2">
                    <p className="font-medium text-sm flex-1 truncate">{n.titulo || 'Sem título'}</p>
                    <Button size="icon" variant="ghost" className="h-7 w-7 -mt-1" onClick={e => { e.stopPropagation(); delNote(n.id); }} aria-label="Excluir"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap mt-1">{n.conteudo}</p>
                  <p className="text-[11px] text-muted-foreground mt-2">{format(new Date(n.updated_at), 'dd/MM/yyyy HH:mm')}</p>
                </div>
              ))}
              {notes.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma nota ainda.</p>}
            </div>
          </TabsContent>

          <TabsContent value="perfil" className="space-y-4 mt-4 md:mt-0">
            <Card title="Meus dados">
              <div className="space-y-2 max-w-md">
                <div className="flex items-center gap-4 pb-2">
                  <div className="h-20 w-20 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 border border-border">
                    {avatar ? <img src={avatar} alt="Sua foto" className="h-full w-full object-cover" /> : <UserCircle className="h-10 w-10 text-muted-foreground" />}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm" disabled={upAv}>
                      <label className="cursor-pointer">{upAv ? 'Enviando...' : avatar ? 'Trocar foto' : 'Adicionar foto'}
                        <input type="file" accept="image/*" className="hidden" onChange={e => { uploadAvatar(e.target.files?.[0]); e.target.value = ''; }} />
                      </label>
                    </Button>
                    {avatar && <Button variant="ghost" size="sm" onClick={removeAvatar}>Remover</Button>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground break-all">E-mail: {email}</p>
                <Input className="text-base" placeholder="Nome de usuário" value={pf.nome} onChange={e => setPf({ ...pf, nome: e.target.value })} />
                <Button onClick={saveName}>Salvar nome</Button>
              </div>
            </Card>
            <Card title="Alterar senha">
              <div className="space-y-2 max-w-md">
                <Input type="password" className="text-base" placeholder="Nova senha (mín. 8 caracteres)" value={pf.senha} onChange={e => setPf({ ...pf, senha: e.target.value })} />
                <Input type="password" className="text-base" placeholder="Repita a nova senha" value={pf.senha2} onChange={e => setPf({ ...pf, senha2: e.target.value })} />
                <Button onClick={savePassword}>Alterar senha</Button>
              </div>
            </Card>
            <h2 className="text-sm font-semibold pt-2">Gestão do plano</h2>
            <Card title="Seu plano">
              <p className="text-sm">Plano atual: <strong>{premium ? 'Premium' : 'Gratuito'}</strong></p>
              {access?.premium_fim && <p className="text-sm text-muted-foreground">Válido até {format(new Date(access.premium_fim + 'T12:00'), 'dd/MM/yyyy')}</p>}
              {access?.premium_status === 'expirado' && <p className="text-sm text-destructive mt-1">Seu Premium expirou.</p>}
            </Card>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border p-5 space-y-2">
                <p className="font-semibold">Gratuito</p>
                <ul className="text-sm text-muted-foreground space-y-1"><li>Tarefas ilimitadas</li><li>Até {FREE_LIMITS.habitos} hábitos</li><li>Até {FREE_LIMITS.metas} metas ativas</li><li>Resumo da semana</li></ul>
              </div>
              <div className="rounded-2xl border border-primary p-5 space-y-2">
                <p className="font-semibold flex items-center gap-1"><Sparkles className="h-4 w-4 text-primary" />Premium</p>
                <ul className="text-sm text-muted-foreground space-y-1"><li>Hábitos e metas ilimitados</li><li>Revisão semanal com reflexão</li><li>Planejamento da próxima semana</li></ul>
                {!premium && <p className="text-xs text-muted-foreground pt-2">Pagamento online em breve. Por enquanto, a equipe Invex ativa para você.</p>}
              </div>
            </div>
          </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
