import { useEffect, useState, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wrench, AlertTriangle, CheckCircle, Clock, ClipboardList, DollarSign, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface MaintenanceRecord {
  id: string;
  equipamento: string;
  controle: string;
  frequencia: string;
  data_validade: string;
  manutencao_preventiva: string;
  setor?: string;
  sala?: string;
  parent_id?: string | null;
}

interface ServiceOrder {
  id: string;
  status: string;
  valor: number;
  data_solicitacao: string;
  equipamento: string;
  prioridade: string;
  created_at: string;
  data_inicio_atendimento?: string | null;
  data_conclusao?: string | null;
}

const WEEKDAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const DashboardManutencao = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  useEffect(() => {
    if (!user?.companyId) return;
    const load = async () => {
      const [recRes, osRes] = await Promise.all([
        supabase.from('maintenance_records').select('*').eq('company_id', user.companyId!),
        supabase.from('maintenance_service_orders').select('*').eq('company_id', user.companyId!),
      ]);
      setRecords((recRes.data || []) as MaintenanceRecord[]);
      setOrders((osRes.data || []) as ServiceOrder[]);
    };
    load();
  }, [user?.companyId]);

  const today = new Date().toISOString().split('T')[0];
  const calcDias = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

  const stats = useMemo(() => {
    const parentRecords = records.filter(r => !r.parent_id);
    const emDia = parentRecords.filter(r => r.data_validade >= today).length;
    const vencidos = parentRecords.filter(r => r.data_validade < today).length;
    const proximosVencer = parentRecords.filter(r => {
      const d = calcDias(r.data_validade);
      return d > 0 && d <= 15;
    }).length;
    const osPendentes = orders.filter(o => o.status === 'pendente').length;
    const osAbertas = orders.filter(o => o.status === 'pendente' || o.status === 'em_andamento').length;
    const custoMes = orders
      .filter(o => {
        const d = o.data_solicitacao;
        const now = new Date();
        return d && d.startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
      })
      .reduce((s, o) => s + Number(o.valor || 0), 0);
    return { total: parentRecords.length, emDia, vencidos, proximosVencer, osPendentes, osAbertas, custoMes };
  }, [records, orders, today]);

  // Calendar events
  const calendarEvents = useMemo(() => {
    const events: { date: string; label: string; type: 'vencido' | 'proximo' | 'futuro' | 'preventiva' }[] = [];
    records.filter(r => !r.parent_id).forEach(r => {
      const dias = calcDias(r.data_validade);
      const type = dias <= 0 ? 'vencido' : dias <= 15 ? 'proximo' : 'futuro';
      events.push({ date: r.data_validade, label: `${r.equipamento} (validade)`, type });
      if (r.manutencao_preventiva) {
        events.push({ date: r.manutencao_preventiva, label: `${r.equipamento} (preventiva)`, type: 'preventiva' });
      }
    });
    return events;
  }, [records]);

  // Calendar rendering
  const calYear = calendarMonth.getFullYear();
  const calMonth = calendarMonth.getMonth();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calDays.push(i);

  const getEventsForDay = (day: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendarEvents.filter(e => e.date === dateStr);
  };

  const eventColors = {
    vencido: 'bg-red-500',
    proximo: 'bg-yellow-500',
    futuro: 'bg-green-500',
    preventiva: 'bg-blue-500',
  };

  // Alertas inteligentes
  const alerts = useMemo(() => {
    const list: { message: string; severity: 'danger' | 'warning' | 'info'; path?: string }[] = [];
    const vencidos = records.filter(r => !r.parent_id && r.data_validade < today);
    if (vencidos.length > 0) {
      list.push({ message: `${vencidos.length} equipamento(s) com manutenção vencida!`, severity: 'danger', path: '/manutencao/listagem?status=vencido' });
    }
    const proximos = records.filter(r => !r.parent_id && calcDias(r.data_validade) > 0 && calcDias(r.data_validade) <= 7);
    if (proximos.length > 0) {
      list.push({ message: `${proximos.length} equipamento(s) vencem nos próximos 7 dias`, severity: 'warning', path: '/manutencao/listagem' });
    }
    const osUrgentes = orders.filter(o => o.status === 'pendente' && (o.prioridade === 'Alta' || o.prioridade === 'Urgente'));
    if (osUrgentes.length > 0) {
      list.push({ message: `${osUrgentes.length} OS urgente(s) pendente(s)`, severity: 'danger', path: '/manutencao/solicitacao-os' });
    }
    // SLA alerts
    orders.filter(o => o.status === 'em_andamento' && o.created_at).forEach(o => {
      const hoursOpen = (Date.now() - new Date(o.created_at).getTime()) / 3600000;
      if (hoursOpen > 48) {
        list.push({ message: `OS "${o.equipamento}" aberta há ${Math.floor(hoursOpen)}h`, severity: 'warning', path: '/manutencao/solicitacao-os' });
      }
    });
    return list;
  }, [records, orders, today]);

  // Sorted equipment for attention list
  const attentionEquipments = useMemo(() => {
    return [...records]
      .filter(r => !r.parent_id)
      .sort((a, b) => calcDias(a.data_validade) - calcDias(b.data_validade))
      .slice(0, 8);
  }, [records]);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wrench className="w-6 h-6" /> Manutenção
        </h1>

        {/* Alertas inteligentes */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div
                key={i}
                onClick={() => a.path && navigate(a.path)}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  a.severity === 'danger' ? 'bg-red-50 border-red-200 hover:bg-red-100 text-red-800' :
                  a.severity === 'warning' ? 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100 text-yellow-800' :
                  'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-800'
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">{a.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/manutencao/listagem?status=vencido')}>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-7 h-7 mx-auto mb-1 text-red-500" />
              <p className="text-2xl font-bold text-red-600">{stats.vencidos}</p>
              <p className="text-xs text-muted-foreground">Vencidos</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/manutencao/listagem')}>
            <CardContent className="p-4 text-center">
              <Clock className="w-7 h-7 mx-auto mb-1 text-yellow-500" />
              <p className="text-2xl font-bold text-yellow-600">{stats.proximosVencer}</p>
              <p className="text-xs text-muted-foreground">Prox. Vencer</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/manutencao/listagem?status=em_dia')}>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-7 h-7 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold text-green-600">{stats.emDia}</p>
              <p className="text-xs text-muted-foreground">Em Dia</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/manutencao/solicitacao-os')}>
            <CardContent className="p-4 text-center">
              <ClipboardList className="w-7 h-7 mx-auto mb-1 text-orange-500" />
              <p className="text-2xl font-bold text-orange-600">{stats.osAbertas}</p>
              <p className="text-xs text-muted-foreground">OS Abertas</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/manutencao/listagem')}>
            <CardContent className="p-4 text-center">
              <Wrench className="w-7 h-7 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Equip.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="w-7 h-7 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">R$ {stats.custoMes.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
              <p className="text-xs text-muted-foreground">Custo do Mês</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Equipment list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="w-5 h-5" /> Equipamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attentionEquipments.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum equipamento cadastrado.</p>
              ) : (
                <div className="space-y-2">
                  {attentionEquipments.map(r => {
                    const dias = calcDias(r.data_validade);
                    const vencido = dias <= 0;
                    const proximo = dias > 0 && dias <= 15;
                    return (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate('/manutencao/listagem')}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{r.equipamento}</p>
                          <p className="text-xs text-muted-foreground">{r.controle} • {r.frequencia}{r.setor ? ` • ${r.setor}` : ''}</p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <Badge
                            variant={vencido ? 'destructive' : 'default'}
                            className={proximo ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' : !vencido ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                          >
                            {vencido ? 'VENCIDO' : proximo ? 'PRÓXIMO' : 'EM DIA'}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">{dias} dias</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" /> Calendário de Manutenções
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalendarMonth(new Date(calYear, calMonth - 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[140px] text-center">{MONTHS_PT[calMonth]} {calYear}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalendarMonth(new Date(calYear, calMonth + 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-0">
                {WEEKDAYS_PT.map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
                {calDays.map((day, i) => {
                  if (day === null) return <div key={`empty-${i}`} className="h-10" />;
                  const events = getEventsForDay(day);
                  const todayStr = new Date().toISOString().split('T')[0];
                  const dayStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isToday = dayStr === todayStr;
                  return (
                    <div
                      key={day}
                      className={`h-10 flex flex-col items-center justify-center text-xs rounded relative ${isToday ? 'bg-primary/10 font-bold' : ''}`}
                      title={events.map(e => e.label).join('\n')}
                    >
                      <span>{day}</span>
                      {events.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5">
                          {events.slice(0, 3).map((e, j) => (
                            <div key={j} className={`w-1.5 h-1.5 rounded-full ${eventColors[e.type]}`} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-3 mt-3 text-xs">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Vencido</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500" /> Próximo</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Em dia</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Preventiva</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default DashboardManutencao;
