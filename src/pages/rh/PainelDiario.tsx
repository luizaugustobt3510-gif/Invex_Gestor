import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { CalendarDays, Cake, GraduationCap, HeartPulse, Umbrella } from 'lucide-react';
import { ptBR } from 'date-fns/locale';

interface CalendarEvent {
  date: Date;
  label: string;
  type: 'ferias' | 'treinamento' | 'aso' | 'aniversario';
}

const eventColors: Record<string, string> = {
  ferias: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  treinamento: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
  aso: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  aniversario: 'bg-pink-500/15 text-pink-700 border-pink-500/30',
};

const eventIcons: Record<string, any> = {
  ferias: Umbrella,
  treinamento: GraduationCap,
  aso: HeartPulse,
  aniversario: Cake,
};

const PainelDiario = () => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [month, setMonth] = useState<Date>(new Date());

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    try {
      const [vacRes, trainRes, asoRes, empRes] = await Promise.all([
        supabase.from('employee_vacations').select('data_inicio, data_fim, employees(nome)').eq('status', 'agendada'),
        supabase.from('employee_trainings').select('data_validade, employees(nome), trainings(nome)').not('data_validade', 'is', null),
        supabase.from('employee_asos').select('data_vencimento, employees(nome)').not('data_vencimento', 'is', null),
        supabase.from('employees').select('nome, data_nascimento').not('data_nascimento', 'is', null).eq('status', 'ativo'),
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

      setEvents(evts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const selectedEvents = events.filter(e => isSameDay(e.date, selectedDate));

  const eventDates = events.map(e => e.date);
  const modifiers = { hasEvent: eventDates };
  const modifiersStyles = { hasEvent: { fontWeight: 'bold' as const, textDecoration: 'underline' as const } };

  const todayEvents = events.filter(e => isSameDay(e.date, new Date()));

  const thisMonthEvents = events.filter(e => e.date.getMonth() === month.getMonth() && e.date.getFullYear() === month.getFullYear());

  const formatDatePtBR = (date: Date, opts: Intl.DateTimeFormatOptions) => {
    return date.toLocaleDateString('pt-BR', opts);
  };

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
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><CalendarDays className="w-5 h-5 sm:w-6 sm:h-6" /> Painel Diário — Gestão de Pessoas</h1>

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
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {formatDatePtBR(selectedDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum evento nesta data.</p>
              ) : selectedEvents.map((e, i) => {
                const Icon = eventIcons[e.type];
                return (
                  <div key={i} className="flex items-center gap-2">
                    <Badge variant="outline" className={`gap-1 shrink-0 ${eventColors[e.type]}`}>
                      <Icon className="w-3 h-3" /> {e.type === 'ferias' ? 'Férias' : e.type === 'treinamento' ? 'Treinamento' : e.type === 'aso' ? 'ASO' : 'Aniversário'}
                    </Badge>
                    <span className="text-sm break-words">{e.label}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

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
      </div>
    </MainLayout>
  );
};

export default PainelDiario;
