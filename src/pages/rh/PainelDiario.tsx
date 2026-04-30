import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarDays, Cake, GraduationCap, HeartPulse, Umbrella, BellRing, Plus, Trash2, Clock } from 'lucide-react';
import { ptBR } from 'date-fns/locale';

type EventType = 'ferias' | 'treinamento' | 'aso' | 'aniversario' | 'agendamento';

interface CalendarEvent {
  date: Date;
  label: string;
  type: EventType;
  notificar?: boolean;
  appointmentId?: string;
  hora?: string | null;
}

interface Appointment {
  id: string;
  company_id: string;
  titulo: string;
  descricao: string | null;
  data_evento: string;
  hora_evento: string | null;
  notificar: boolean;
}

const eventColors: Record<EventType, string> = {
  ferias: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  treinamento: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
  aso: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  aniversario: 'bg-pink-500/15 text-pink-700 border-pink-500/30',
  agendamento: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
};

const eventIcons: Record<EventType, any> = {
  ferias: Umbrella,
  treinamento: GraduationCap,
  aso: HeartPulse,
  aniversario: Cake,
  agendamento: BellRing,
};

const eventTypeLabel: Record<EventType, string> = {
  ferias: 'Férias',
  treinamento: 'Treinamento',
  aso: 'ASO',
  aniversario: 'Aniversário',
  agendamento: 'Agendamento',
};

const NOTIFIED_KEY = 'invex:hr-notified-appointments';

const loadNotifiedSet = (): Set<string> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const raw = window.sessionStorage.getItem(NOTIFIED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (parsed.date !== today) return new Set();
    return new Set(parsed.ids || []);
  } catch {
    return new Set();
  }
};

const saveNotifiedSet = (set: Set<string>) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    window.sessionStorage.setItem(NOTIFIED_KEY, JSON.stringify({ date: today, ids: [...set] }));
  } catch { /* ignore */ }
};

const PainelDiario = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [month, setMonth] = useState<Date>(new Date());

  // Dialog: novo agendamento
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    data_evento: new Date().toISOString().split('T')[0],
    hora_evento: '',
    notificar: true,
  });

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    try {
      const [vacRes, trainRes, asoRes, empRes, apptRes] = await Promise.all([
        supabase.from('employee_vacations').select('data_inicio, data_fim, employees(nome)').eq('status', 'agendada'),
        supabase.from('employee_trainings').select('data_validade, employees(nome), trainings(nome)').not('data_validade', 'is', null),
        supabase.from('employee_asos').select('data_vencimento, employees(nome)').not('data_vencimento', 'is', null),
        supabase.from('employees').select('nome, data_nascimento').not('data_nascimento', 'is', null).eq('status', 'ativo'),
        supabase.from('hr_appointments').select('*').order('data_evento'),
      ]);

      const evts: CalendarEvent[] = [];

      (vacRes.data || []).forEach((v: any) => {
        evts.push({ date: new Date(v.data_inicio + 'T00:00:00'), label: `Férias: ${v.employees?.nome} (início)`, type: 'ferias' });
        evts.push({ date: new Date(v.data_fim + 'T00:00:00'), label: `Férias: ${v.employees?.nome} (fim)`, type: 'ferias' });
      });

      (trainRes.data || []).forEach((t: any) => {
        evts.push({ date: new Date(t.data_validade + 'T00:00:00'), label: `Venc. Treinamento: ${t.employees?.nome} — ${t.trainings?.nome}`, type: 'treinamento' });
      });

      (asoRes.data || []).forEach((a: any) => {
        evts.push({ date: new Date(a.data_vencimento + 'T00:00:00'), label: `Venc. ASO: ${a.employees?.nome}`, type: 'aso' });
      });

      const year = new Date().getFullYear();
      (empRes.data || []).forEach((e: any) => {
        const bd = new Date(e.data_nascimento + 'T00:00:00');
        evts.push({ date: new Date(year, bd.getMonth(), bd.getDate()), label: `🎂 Aniversário: ${e.nome}`, type: 'aniversario' });
      });

      const appts = (apptRes.data || []) as Appointment[];
      setAppointments(appts);
      appts.forEach(a => {
        const horaTxt = a.hora_evento ? ` às ${a.hora_evento.slice(0, 5)}` : '';
        evts.push({
          date: new Date(a.data_evento + 'T00:00:00'),
          label: `${a.titulo}${horaTxt}${a.descricao ? ` — ${a.descricao}` : ''}`,
          type: 'agendamento',
          notificar: a.notificar,
          appointmentId: a.id,
          hora: a.hora_evento,
        });
      });

      setEvents(evts);

      // Notificações para agendamentos de hoje (uma vez por dia / sessão)
      const todayStr = new Date().toISOString().split('T')[0];
      const notified = loadNotifiedSet();
      const todays = appts.filter(a => a.data_evento === todayStr && a.notificar && !notified.has(a.id));
      todays.forEach(a => {
        const horaTxt = a.hora_evento ? ` às ${a.hora_evento.slice(0, 5)}` : '';
        toast({
          title: `🔔 Agendamento hoje${horaTxt}`,
          description: a.titulo + (a.descricao ? ` — ${a.descricao}` : ''),
          duration: 8000,
        });
        notified.add(a.id);
      });
      if (todays.length > 0) saveNotifiedSet(notified);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => setForm({ titulo: '', descricao: '', data_evento: new Date().toISOString().split('T')[0], hora_evento: '', notificar: true });

  const handleOpenNew = () => {
    resetForm();
    // Preenche com a data selecionada do calendário, se houver
    setForm(p => ({ ...p, data_evento: selectedDate.toISOString().split('T')[0] }));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) {
      toast({ title: 'Título obrigatório', variant: 'destructive' });
      return;
    }
    if (!user?.companyId) {
      toast({ title: 'Empresa não encontrada', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { error } = await supabase.from('hr_appointments').insert({
      company_id: user.companyId,
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      data_evento: form.data_evento,
      hora_evento: form.hora_evento || null,
      notificar: form.notificar,
      created_by: authUser?.id || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao agendar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Agendamento criado!', description: form.notificar ? 'Você será notificado(a) no dia do evento.' : undefined });
    setDialogOpen(false);
    resetForm();
    await loadEvents();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('hr_appointments').delete().eq('id', deleteId);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Agendamento excluído.' });
      setAppointments(prev => prev.filter(a => a.id !== deleteId));
      await loadEvents();
    }
    setDeleteId(null);
  };

  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const selectedEvents = events.filter(e => isSameDay(e.date, selectedDate));

  const eventDates = events.map(e => e.date);
  const modifiers = { hasEvent: eventDates };
  const modifiersStyles = { hasEvent: { fontWeight: 'bold' as const, textDecoration: 'underline' as const } };

  const todayEvents = events.filter(e => isSameDay(e.date, new Date()));

  const thisMonthEvents = events.filter(e => e.date.getMonth() === month.getMonth() && e.date.getFullYear() === month.getFullYear());

  // Próximos agendamentos (hoje em diante, ordenados)
  const upcomingAppointments = [...appointments]
    .filter(a => a.data_evento >= new Date().toISOString().split('T')[0])
    .sort((a, b) => (a.data_evento + (a.hora_evento || '')).localeCompare(b.data_evento + (b.hora_evento || '')))
    .slice(0, 8);

  const formatDatePtBR = (date: Date, opts: Intl.DateTimeFormatOptions) => date.toLocaleDateString('pt-BR', opts);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6" /> Painel Diário — Gestão de Pessoas
          </h1>
          <Button onClick={handleOpenNew} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Agendamento
          </Button>
        </div>

        {todayEvents.length > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2"><CardTitle className="text-base">📌 Hoje — {formatDatePtBR(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {todayEvents.map((e, i) => {
                const Icon = eventIcons[e.type];
                return (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="break-words">{e.label}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-4 flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={d => d && setSelectedDate(d)}
                month={month}
                onMonthChange={setMonth}
                modifiers={modifiers}
                modifiersStyles={modifiersStyles}
                locale={ptBR}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-base">
                {formatDatePtBR(selectedDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </CardTitle>
              <Button size="sm" variant="outline" className="gap-1" onClick={handleOpenNew}>
                <Plus className="w-3 h-3" /> Agendar
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum evento nesta data.</p>
              ) : selectedEvents.map((e, i) => {
                const Icon = eventIcons[e.type];
                return (
                  <div key={i} className="flex items-center justify-between gap-2 group">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className={`gap-1 shrink-0 ${eventColors[e.type]}`}>
                        <Icon className="w-3 h-3" /> {eventTypeLabel[e.type]}
                      </Badge>
                      <span className="text-sm break-words">{e.label}</span>
                      {e.type === 'agendamento' && e.notificar && (
                        <BellRing className="w-3 h-3 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    {e.appointmentId && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100"
                        onClick={() => setDeleteId(e.appointmentId!)}
                        aria-label="Excluir agendamento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Próximos Agendamentos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BellRing className="w-4 h-4 text-emerald-600" /> Próximos Agendamentos ({upcomingAppointments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum agendamento futuro. Clique em "Novo Agendamento" para criar.</p>
            ) : (
              <div className="space-y-2">
                {upcomingAppointments.map(a => (
                  <div key={a.id} className="flex items-start justify-between gap-2 py-2 px-3 rounded-md border border-border/60 bg-card hover:bg-muted/40 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground shrink-0">
                          {new Date(a.data_evento + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          {a.hora_evento ? ` ${a.hora_evento.slice(0, 5)}` : ''}
                        </span>
                        <span className="text-sm font-medium break-words">{a.titulo}</span>
                        {a.notificar && (
                          <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                            <BellRing className="w-2.5 h-2.5" /> Notificar
                          </Badge>
                        )}
                      </div>
                      {a.descricao && <p className="text-xs text-muted-foreground mt-0.5 break-words">{a.descricao}</p>}
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0" onClick={() => setDeleteId(a.id)} aria-label="Excluir">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Eventos do Mês ({thisMonthEvents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {thisMonthEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum evento este mês.</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {thisMonthEvents.sort((a, b) => a.date.getTime() - b.date.getTime()).map((e, i) => {
                  const Icon = eventIcons[e.type];
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm py-1 border-b border-border/50 last:border-0">
                      <span className="text-xs text-muted-foreground w-10 shrink-0">{e.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                      <Icon className="w-3 h-3 shrink-0" />
                      <span className="break-words">{e.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog: Novo Agendamento */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Novo Agendamento</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ex: Reunião com equipe" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Input type="date" value={form.data_evento} onChange={e => setForm(p => ({ ...p, data_evento: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Clock className="w-3 h-3" /> Hora</Label>
                  <Input type="time" value={form.hora_evento} onChange={e => setForm(p => ({ ...p, hora_evento: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Detalhes do agendamento..." rows={3} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                <div>
                  <Label className="flex items-center gap-1 cursor-pointer"><BellRing className="w-3.5 h-3.5 text-emerald-600" /> Notificar no dia</Label>
                  <p className="text-[10px] text-muted-foreground">Você verá um aviso ao abrir o painel no dia do evento.</p>
                </div>
                <Switch checked={form.notificar} onCheckedChange={v => setForm(p => ({ ...p, notificar: v }))} />
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? 'Salvando...' : 'Criar Agendamento'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirm delete */}
        <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita. O agendamento será removido permanentemente.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default PainelDiario;
