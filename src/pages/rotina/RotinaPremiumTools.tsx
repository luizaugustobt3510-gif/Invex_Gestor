import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, RotateCcw, Plus, Trash2, Sunrise, Moon, Lightbulb, FileDown } from 'lucide-react';
import { toast } from 'sonner';

const box = 'rounded-2xl border border-border p-5';

/* ---------------- Foco (Pomodoro) ---------------- */
export function FocoTimer({ tasks }: { tasks: { id: string; titulo: string }[] }) {
  const [mode, setMode] = useState<'foco' | 'pausa'>('foco');
  const [mins, setMins] = useState({ foco: 25, pausa: 5 });
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [taskId, setTaskId] = useState('');
  const [ciclos, setCiclos] = useState(() => Number(localStorage.getItem('rotina_ciclos_' + new Date().toDateString()) || 0));
  const ref = useRef<number>();

  useEffect(() => {
    if (!running) return;
    ref.current = window.setInterval(() => setLeft(s => s - 1), 1000);
    return () => clearInterval(ref.current);
  }, [running]);

  useEffect(() => {
    if (left > 0) return;
    setRunning(false);
    if (mode === 'foco') {
      const n = ciclos + 1; setCiclos(n);
      localStorage.setItem('rotina_ciclos_' + new Date().toDateString(), String(n));
      toast.success('Foco concluído! Hora da pausa.');
      setMode('pausa'); setLeft(mins.pausa * 60);
    } else {
      toast('Pausa encerrada. Bora focar!');
      setMode('foco'); setLeft(mins.foco * 60);
    }
    if ('Notification' in window && Notification.permission === 'granted') new Notification('Invex Rotina', { body: mode === 'foco' ? 'Foco concluído!' : 'Pausa encerrada!' });
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = mins[mode] * 60;
  const mm = String(Math.floor(Math.max(left, 0) / 60)).padStart(2, '0');
  const ss = String(Math.max(left, 0) % 60).padStart(2, '0');
  const reset = () => { setRunning(false); setLeft(mins[mode] * 60); };

  return (
    <section className={box + ' space-y-4'}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Modo foco</h2>
        <span className="text-xs text-muted-foreground">{ciclos} ciclo(s) hoje</span>
      </div>
      <Select value={taskId} onValueChange={setTaskId}>
        <SelectTrigger><SelectValue placeholder="Em qual tarefa vai focar?" /></SelectTrigger>
        <SelectContent>{tasks.map(t => <SelectItem key={t.id} value={t.id}>{t.titulo}</SelectItem>)}</SelectContent>
      </Select>
      <div className="text-center">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{mode === 'foco' ? 'Foco' : 'Pausa'}</p>
        <p className="text-6xl font-semibold tabular-nums my-2">{mm}:{ss}</p>
        <Progress value={((total - left) / total) * 100} />
      </div>
      <div className="flex justify-center gap-2">
        <Button onClick={() => { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); setRunning(r => !r); }}>
          {running ? <><Pause className="h-4 w-4 mr-1" />Pausar</> : <><Play className="h-4 w-4 mr-1" />Iniciar</>}
        </Button>
        <Button variant="outline" onClick={reset}><RotateCcw className="h-4 w-4 mr-1" />Reiniciar</Button>
      </div>
      <div className="flex gap-3 justify-center text-sm">
        {(['foco', 'pausa'] as const).map(k => (
          <label key={k} className="flex items-center gap-2">{k === 'foco' ? 'Foco' : 'Pausa'}
            <Input type="number" min={1} max={90} className="w-20 text-base" value={mins[k]} disabled={running}
              onChange={e => { const v = Math.max(1, Number(e.target.value) || 1); setMins(m => ({ ...m, [k]: v })); if (mode === k) setLeft(v * 60); }} /> min
          </label>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Rituais ---------------- */
type Ritual = { manha: string[]; noite: string[] };
const DEFAULT_RITUAL: Ritual = {
  manha: ['Beber um copo de água', 'Revisar prioridades do dia', '5 minutos de respiração'],
  noite: ['Anotar 3 coisas boas do dia', 'Planejar o dia seguinte', 'Desligar telas 30 min antes de dormir'],
};

export function Rituais({ userKey }: { userKey: string }) {
  const kList = `rotina_rituais_${userKey}`;
  const kDone = `rotina_rituais_done_${userKey}_${new Date().toDateString()}`;
  const [list, setList] = useState<Ritual>(() => { try { return JSON.parse(localStorage.getItem(kList) || '') } catch { return DEFAULT_RITUAL; } });
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(kDone) || '{}') } catch { return {}; } });
  const [novo, setNovo] = useState({ manha: '', noite: '' });
  useEffect(() => { localStorage.setItem(kList, JSON.stringify(list)); }, [list, kList]);
  useEffect(() => { localStorage.setItem(kDone, JSON.stringify(done)); }, [done, kDone]);

  const block = (k: keyof Ritual, title: string, Icon: typeof Sunrise) => {
    const items = list[k]; const n = items.filter(i => done[k + i]).length;
    return (
      <section className={box + ' space-y-3'}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2"><Icon className="h-4 w-4 text-primary" />{title}</h2>
          <span className="text-xs text-muted-foreground">{n}/{items.length}</span>
        </div>
        <Progress value={items.length ? (n / items.length) * 100 : 0} />
        {items.map(i => (
          <div key={i} className="flex items-center gap-3">
            <Checkbox checked={!!done[k + i]} onCheckedChange={v => setDone(d => ({ ...d, [k + i]: !!v }))} />
            <span className={'flex-1 text-sm ' + (done[k + i] ? 'line-through text-muted-foreground' : '')}>{i}</span>
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Remover" onClick={() => setList(l => ({ ...l, [k]: l[k].filter(x => x !== i) }))}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Input className="text-base" placeholder="Novo passo" value={novo[k]} onChange={e => setNovo({ ...novo, [k]: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') add(k); }} />
          <Button size="icon" onClick={() => add(k)} aria-label="Adicionar"><Plus className="h-4 w-4" /></Button>
        </div>
      </section>
    );
  };
  const add = (k: keyof Ritual) => {
    const v = novo[k].trim(); if (!v || list[k].includes(v)) return;
    setList(l => ({ ...l, [k]: [...l[k], v] })); setNovo(n => ({ ...n, [k]: '' }));
  };
  return <div className="grid gap-4 md:grid-cols-2">{block('manha', 'Ritual da manhã', Sunrise)}{block('noite', 'Ritual da noite', Moon)}</div>;
}

/* ---------------- Insights + PDF ---------------- */
type T = { titulo: string; data: string; concluida: boolean; categoria: string };
export function useInsights(weekTasks: T[], consistency: number, habitsCount: number) {
  return useMemo(() => {
    const out: string[] = [];
    const done = weekTasks.filter(t => t.concluida).length;
    const rate = weekTasks.length ? Math.round((done / weekTasks.length) * 100) : 0;
    if (!weekTasks.length) out.push('Você ainda não planejou tarefas nesta semana. Comece com 3 prioridades.');
    else if (rate >= 80) out.push(`Ótima semana: ${rate}% das tarefas concluídas. Mantenha o ritmo!`);
    else if (rate >= 50) out.push(`Você concluiu ${rate}% das tarefas. Tente planejar menos itens por dia para fechar mais.`);
    else out.push(`Só ${rate}% das tarefas foram concluídas. Escolha 1 tarefa principal por dia e use o modo foco.`);
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const pend: Record<string, number> = {};
    weekTasks.filter(t => !t.concluida).forEach(t => { const d = dias[new Date(t.data + 'T12:00').getDay()]; pend[d] = (pend[d] || 0) + 1; });
    const pior = Object.entries(pend).sort((a, b) => b[1] - a[1])[0];
    if (pior && pior[1] > 1) out.push(`${pior[0]} foi o dia com mais pendências (${pior[1]}). Deixe esse dia mais leve.`);
    if (habitsCount) out.push(consistency >= 70 ? `Hábitos em ${consistency}% de constância — excelente.` : `Constância dos hábitos em ${consistency}%. Ligue um hábito a algo que você já faz (ex.: depois do café).`);
    const cats: Record<string, number> = {};
    weekTasks.forEach(t => { cats[t.categoria] = (cats[t.categoria] || 0) + 1; });
    const top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
    if (top) out.push(`Sua semana foi focada em "${top[0]}" (${top[1]} tarefas).`);
    return { list: out, rate, done };
  }, [weekTasks, consistency, habitsCount]);
}

export function InsightsCard({ insights }: { insights: string[] }) {
  return (
    <section className={box + ' space-y-2'}>
      <h2 className="text-sm font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" />Insights da semana</h2>
      <ul className="space-y-2">{insights.map((i, k) => <li key={k} className="text-sm rounded-lg bg-muted/50 p-3">{i}</li>)}</ul>
    </section>
  );
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function ExportWeekButton(p: { nome: string; semana: string; weekTasks: T[]; consistency: number; insights: string[]; review: { realizacoes: string; reflexao: string; prioridades: string } }) {
  const run = () => {
    const w = window.open('', '_blank');
    if (!w) return toast.error('Permita pop-ups para gerar o PDF.');
    const done = p.weekTasks.filter(t => t.concluida).length;
    const rows = p.weekTasks.map(t => `<tr><td>${esc(t.data.split('-').reverse().join('/'))}</td><td>${esc(t.titulo)}</td><td>${esc(t.categoria)}</td><td>${t.concluida ? '✔' : '—'}</td></tr>`).join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Relatório semanal - Invex Rotina</title><style>
      body{font-family:system-ui,sans-serif;color:#222;padding:32px;max-width:760px;margin:auto}
      h1{color:#ea7317;margin:0}.k{display:flex;gap:12px;margin:20px 0}.k div{flex:1;border:1px solid #eee;border-radius:10px;padding:12px}
      .k b{display:block;font-size:22px}table{width:100%;border-collapse:collapse;font-size:13px}td,th{border-bottom:1px solid #eee;padding:6px;text-align:left}
      h2{font-size:15px;margin-top:24px;color:#ea7317}p,li{font-size:13px;white-space:pre-wrap}footer{margin-top:32px;font-size:11px;color:#999}
    </style></head><body>
      <h1>Relatório semanal</h1><p>${esc(p.nome)} · Semana de ${esc(p.semana)}</p>
      <div class="k"><div>Planejadas<b>${p.weekTasks.length}</b></div><div>Concluídas<b>${done}</b></div><div>Pendentes<b>${p.weekTasks.length - done}</b></div><div>Hábitos<b>${p.consistency}%</b></div></div>
      <h2>Insights</h2><ul>${p.insights.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
      ${p.review.realizacoes ? `<h2>Realizações</h2><p>${esc(p.review.realizacoes)}</p>` : ''}
      ${p.review.reflexao ? `<h2>Reflexão</h2><p>${esc(p.review.reflexao)}</p>` : ''}
      ${p.review.prioridades ? `<h2>Prioridades da próxima semana</h2><p>${esc(p.review.prioridades)}</p>` : ''}
      <h2>Tarefas</h2><table><tr><th>Data</th><th>Tarefa</th><th>Categoria</th><th>Feita</th></tr>${rows || '<tr><td colspan=4>Sem tarefas</td></tr>'}</table>
      <footer>Invex Rotina · Invex Gestor Soluções - IGS®</footer>
      <script>setTimeout(()=>window.print(),300)</script></body></html>`);
    w.document.close();
  };
  return <Button variant="outline" onClick={run}><FileDown className="h-4 w-4 mr-1" />Baixar relatório em PDF</Button>;
}

