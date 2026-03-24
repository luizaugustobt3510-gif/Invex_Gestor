import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Thermometer, Calendar, History, CheckCircle, XCircle, Download, ScanLine } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { writeExcelFromJson } from '@/lib/excelUtils';

const LOCAIS = [
  { key: 'almoxarifado', label: 'Almoxarifado' },
  { key: 'armario_medicamentos', label: 'Armário de Medicamentos' },
];

const ConferenciaTemperatura = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [tab, setTab] = useState('registrar');
  const [local, setLocal] = useState('almoxarifado');
  const [filterLocal, setFilterLocal] = useState('todos');
  const [filterDate, setFilterDate] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [dayDetail, setDayDetail] = useState<any[] | null>(null);
  const [dayDetailDate, setDayDetailDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    temperatura_atual: '', temperatura_min: '', temperatura_max: '',
    umidade_atual: '', umidade_min: '', umidade_max: '',
  });

  // Today's status for dashboard indicator
  const [todayStatus, setTodayStatus] = useState<Record<string, boolean>>({});

  useEffect(() => { loadRecords(); }, []);

  const loadRecords = async () => {
    try {
      const { data } = await supabase
        .from('temperature_records')
        .select('*')
        .order('data', { ascending: false })
        .order('hora', { ascending: false });
      setRecords(data || []);

      // Check today's registrations
      const hoje = new Date().toISOString().split('T')[0];
      const todayRecs = (data || []).filter((r: any) => r.data === hoje);
      const status: Record<string, boolean> = {};
      LOCAIS.forEach(l => {
        status[l.key] = todayRecs.some((r: any) => r.local === l.key);
      });
      setTodayStatus(status);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.temperatura_atual || !form.umidade_atual) {
      toast({ title: 'Preencha temperatura e umidade atuais.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Não autenticado');
      const { data: roleData } = await supabase.from('user_roles').select('company_id').eq('user_id', authUser.id).not('company_id', 'is', null).limit(1).single();
      if (!roleData?.company_id) throw new Error('Sem empresa vinculada');

      const now = new Date();
      const { error } = await supabase.from('temperature_records').insert({
        company_id: roleData.company_id,
        local,
        data: now.toISOString().split('T')[0],
        hora: now.toTimeString().split(' ')[0],
        temperatura_atual: Number(form.temperatura_atual),
        temperatura_min: Number(form.temperatura_min || form.temperatura_atual),
        temperatura_max: Number(form.temperatura_max || form.temperatura_atual),
        umidade_atual: Number(form.umidade_atual),
        umidade_min: Number(form.umidade_min || form.umidade_atual),
        umidade_max: Number(form.umidade_max || form.umidade_atual),
        responsavel_id: authUser.id,
        responsavel_nome: user?.nome || 'Usuário',
      } as any);

      if (error) throw error;

      toast({ title: 'Registro salvo com sucesso!' });
      setForm({ temperatura_atual: '', temperatura_min: '', temperatura_max: '', umidade_atual: '', umidade_min: '', umidade_max: '' });
      loadRecords();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Calendar logic
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: { date: string; dayNum: number; isWeekend: boolean; hasRecord: Record<string, boolean> }[] = [];

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dt = new Date(year, month, d);
      const dateStr = dt.toISOString().split('T')[0];
      const dayOfWeek = dt.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dayRecs = records.filter(r => r.data === dateStr);
      const hasRecord: Record<string, boolean> = {};
      LOCAIS.forEach(l => {
        hasRecord[l.key] = dayRecs.some(r => r.local === l.key);
      });
      days.push({ date: dateStr, dayNum: d, isWeekend, hasRecord });
    }
    return days;
  }, [calendarMonth, records]);

  const handleDayClick = (dateStr: string) => {
    const dayRecs = records.filter(r => r.data === dateStr);
    if (dayRecs.length > 0) {
      setDayDetail(dayRecs);
      setDayDetailDate(dateStr);
    }
  };

  // Filtered history
  const filteredHistory = useMemo(() => {
    return records.filter(r => {
      if (filterLocal !== 'todos' && r.local !== filterLocal) return false;
      if (filterDate && r.data !== filterDate) return false;
      return true;
    });
  }, [records, filterLocal, filterDate]);

  const handleExport = () => {
    writeExcelFromJson(
      `Conferencias_Temperatura_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`,
      'Conferências',
      filteredHistory.map(r => ({
        Data: r.data,
        Hora: r.hora,
        Local: LOCAIS.find(l => l.key === r.local)?.label || r.local,
        'Temp. Atual': r.temperatura_atual,
        'Temp. Mín': r.temperatura_min,
        'Temp. Máx': r.temperatura_max,
        'Umid. Atual': r.umidade_atual,
        'Umid. Mín': r.umidade_min,
        'Umid. Máx': r.umidade_max,
        Responsável: r.responsavel_nome,
      }))
    );
    toast({ title: 'Relatório exportado!' });
  };

  const handleQRScan = () => {
    // Use existing QR scanner infrastructure - redirect with context
    // For now, show a simple prompt
    const code = prompt('Escaneie ou digite o código do local:\n\n- ALMOX → Almoxarifado\n- MEDIC → Armário de Medicamentos');
    if (code) {
      const normalized = code.trim().toUpperCase();
      if (normalized.includes('ALMOX')) {
        setLocal('almoxarifado');
        setTab('registrar');
        toast({ title: 'Local identificado: Almoxarifado' });
      } else if (normalized.includes('MEDIC')) {
        setLocal('armario_medicamentos');
        setTab('registrar');
        toast({ title: 'Local identificado: Armário de Medicamentos' });
      } else {
        toast({ title: 'Código não reconhecido', variant: 'destructive' });
      }
    }
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
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Thermometer className="w-6 h-6 text-primary" /> Conferência de Temperatura
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleQRScan}>
              <ScanLine className="w-4 h-4" /> QR Code
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
              <Download className="w-4 h-4" /> Exportar
            </Button>
          </div>
        </div>

        {/* Today's Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {LOCAIS.map(l => (
            <Card key={l.key} className={`border-2 ${todayStatus[l.key] ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-destructive/40 bg-destructive/5'}`}>
              <CardContent className="p-4 flex items-center gap-3">
                {todayStatus[l.key] ? (
                  <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-destructive shrink-0" />
                )}
                <div>
                  <p className="font-semibold text-sm">{l.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {todayStatus[l.key] ? '✔ Registrado hoje' : '❌ Pendente hoje'}
                  </p>
                </div>
                {!todayStatus[l.key] && (
                  <Button size="sm" className="ml-auto" onClick={() => { setLocal(l.key); setTab('registrar'); }}>
                    Registrar
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="registrar">Registrar</TabsTrigger>
            <TabsTrigger value="calendario">Calendário</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          {/* Registration Tab */}
          <TabsContent value="registrar">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Novo Registro de Temperatura</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Local</Label>
                      <Select value={local} onValueChange={setLocal}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LOCAIS.map(l => <SelectItem key={l.key} value={l.key}>{l.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Data / Hora</Label>
                      <Input value={`${new Date().toLocaleDateString('pt-BR')} — ${new Date().toLocaleTimeString('pt-BR')}`} disabled />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Temperatura Atual (°C) *</Label>
                      <Input type="number" step="0.1" value={form.temperatura_atual} onChange={e => setForm(p => ({ ...p, temperatura_atual: e.target.value }))} placeholder="Ex: 22.5" />
                    </div>
                    <div className="space-y-2">
                      <Label>Temp. Mínima (°C)</Label>
                      <Input type="number" step="0.1" value={form.temperatura_min} onChange={e => setForm(p => ({ ...p, temperatura_min: e.target.value }))} placeholder="Ex: 20.0" />
                    </div>
                    <div className="space-y-2">
                      <Label>Temp. Máxima (°C)</Label>
                      <Input type="number" step="0.1" value={form.temperatura_max} onChange={e => setForm(p => ({ ...p, temperatura_max: e.target.value }))} placeholder="Ex: 25.0" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Umidade Atual (%) *</Label>
                      <Input type="number" step="0.1" value={form.umidade_atual} onChange={e => setForm(p => ({ ...p, umidade_atual: e.target.value }))} placeholder="Ex: 60" />
                    </div>
                    <div className="space-y-2">
                      <Label>Umid. Mínima (%)</Label>
                      <Input type="number" step="0.1" value={form.umidade_min} onChange={e => setForm(p => ({ ...p, umidade_min: e.target.value }))} placeholder="Ex: 50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Umid. Máxima (%)</Label>
                      <Input type="number" step="0.1" value={form.umidade_max} onChange={e => setForm(p => ({ ...p, umidade_max: e.target.value }))} placeholder="Ex: 70" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Responsável</Label>
                    <Input value={user?.nome || ''} disabled />
                  </div>

                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar Registro'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendario">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5" /> Calendário de Conferências
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>←</Button>
                    <span className="text-sm font-medium min-w-[120px] text-center">
                      {calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>→</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">🟢 Registrado</span>
                  <span className="flex items-center gap-1">🔴 Não registrado</span>
                  <span className="flex items-center gap-1">⚪ Fim de semana</span>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                    <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                  ))}
                  {/* Empty cells for offset */}
                  {Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {calendarDays.map(day => {
                    const allDone = !day.isWeekend && LOCAIS.every(l => day.hasRecord[l.key]);
                    const someDone = !day.isWeekend && LOCAIS.some(l => day.hasRecord[l.key]);
                    const isPast = new Date(day.date) < new Date(new Date().toISOString().split('T')[0]);

                    return (
                      <button
                        key={day.date}
                        onClick={() => handleDayClick(day.date)}
                        className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm border transition-colors ${
                          day.isWeekend ? 'bg-muted/50 text-muted-foreground border-transparent' :
                          allDone ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/20' :
                          someDone ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 hover:bg-amber-500/20' :
                          isPast ? 'bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20' :
                          'bg-muted/30 border-border hover:bg-muted/50'
                        }`}
                      >
                        <span className="font-medium">{day.dayNum}</span>
                        {!day.isWeekend && (
                          <span className="text-[10px]">
                            {allDone ? '✔' : someDone ? '◐' : isPast ? '✕' : ''}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="historico">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="w-5 h-5" /> Histórico
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={filterLocal} onValueChange={setFilterLocal}>
                      <SelectTrigger className="w-40 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {LOCAIS.map(l => <SelectItem key={l.key} value={l.key}>{l.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-40 h-8 text-sm" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Local</TableHead>
                        <TableHead>Temp.</TableHead>
                        <TableHead>Umid.</TableHead>
                        <TableHead>Responsável</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistory.slice(0, 100).map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="text-sm">{new Date(r.data + 'T00:00').toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell className="text-sm">{r.hora?.slice(0, 5)}</TableCell>
                          <TableCell className="text-sm">{LOCAIS.find(l => l.key === r.local)?.label}</TableCell>
                          <TableCell className="text-sm">{r.temperatura_atual}°C <span className="text-muted-foreground">({r.temperatura_min}–{r.temperatura_max})</span></TableCell>
                          <TableCell className="text-sm">{r.umidade_atual}% <span className="text-muted-foreground">({r.umidade_min}–{r.umidade_max})</span></TableCell>
                          <TableCell className="text-sm">{r.responsavel_nome}</TableCell>
                        </TableRow>
                      ))}
                      {filteredHistory.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Day Detail Dialog */}
        <Dialog open={!!dayDetail} onOpenChange={() => setDayDetail(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registros — {dayDetailDate ? new Date(dayDetailDate + 'T00:00').toLocaleDateString('pt-BR') : ''}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {(dayDetail || []).map((r: any) => (
                <Card key={r.id}>
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{LOCAIS.find(l => l.key === r.local)?.label}</Badge>
                      <span className="text-xs text-muted-foreground">{r.hora?.slice(0, 5)}</span>
                    </div>
                    <p className="text-sm">🌡️ {r.temperatura_atual}°C ({r.temperatura_min}–{r.temperatura_max})</p>
                    <p className="text-sm">💧 {r.umidade_atual}% ({r.umidade_min}–{r.umidade_max})</p>
                    <p className="text-xs text-muted-foreground">Por: {r.responsavel_nome}</p>
                  </CardContent>
                </Card>
              ))}
              {(!dayDetail || dayDetail.length === 0) && (
                <p className="text-center text-muted-foreground text-sm py-4">Nenhum registro neste dia.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default ConferenciaTemperatura;
