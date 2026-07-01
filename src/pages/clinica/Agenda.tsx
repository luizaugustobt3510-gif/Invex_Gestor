import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Calendar, Trash2, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Appt {
  id: string;
  patient_id: string | null;
  professional_name: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  attendance_type: string | null;
  notes: string | null;
}

interface PatientOpt { id: string; nome: string; }

const STATUS = ['agendado', 'confirmado', 'realizado', 'cancelado', 'faltou'];

export default function Agenda() {
  const { user } = useAuth();
  const [appts, setAppts] = useState<Appt[]>([]);
  const [patients, setPatients] = useState<PatientOpt[]>([]);
  const [day, setDay] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [editing, setEditing] = useState<Appt | null>(null);
  const [form, setForm] = useState({
    patient_id: '', professional_name: '', scheduled_date: day, scheduled_time: '09:00',
    duration_minutes: 30, status: 'agendado', attendance_type: '', notes: '',
  });

  const load = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    const start = `${day}T00:00:00`;
    const end = `${day}T23:59:59`;
    const [{ data: a }, { data: p }] = await Promise.all([
      supabase.from('clinic_appointments').select('*').eq('company_id', user.companyId)
        .gte('scheduled_at', start).lte('scheduled_at', end).order('scheduled_at'),
      supabase.from('patients').select('id, nome').eq('company_id', user.companyId).order('nome'),
    ]);
    setAppts((a as Appt[]) || []);
    setPatients((p as PatientOpt[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.companyId, day]);

  const openNew = () => {
    setEditing(null);
    setForm({
      patient_id: '', professional_name: user?.nome || '',
      scheduled_date: day, scheduled_time: '09:00',
      duration_minutes: 30, status: 'agendado', attendance_type: '', notes: '',
    });
    setDlgOpen(true);
  };

  const openEdit = (a: Appt) => {
    setEditing(a);
    const dt = new Date(a.scheduled_at);
    setForm({
      patient_id: a.patient_id || '',
      professional_name: a.professional_name || '',
      scheduled_date: dt.toISOString().slice(0, 10),
      scheduled_time: dt.toTimeString().slice(0, 5),
      duration_minutes: a.duration_minutes,
      status: a.status,
      attendance_type: a.attendance_type || '',
      notes: a.notes || '',
    });
    setDlgOpen(true);
  };

  const save = async () => {
    if (!user?.companyId) return;
    const uid = (await supabase.auth.getUser()).data.user?.id;
    const scheduled_at = new Date(`${form.scheduled_date}T${form.scheduled_time}:00`).toISOString();
    const payload = {
      company_id: user.companyId,
      patient_id: form.patient_id || null,
      professional_name: form.professional_name || null,
      professional_user_id: uid,
      scheduled_at,
      duration_minutes: Number(form.duration_minutes) || 30,
      status: form.status,
      attendance_type: form.attendance_type || null,
      notes: form.notes || null,
    };
    if (editing) {
      const { error } = await supabase.from('clinic_appointments').update({ ...payload, updated_by: uid }).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Agendamento atualizado');
    } else {
      const { error } = await supabase.from('clinic_appointments').insert({ ...payload, created_by: uid });
      if (error) { toast.error(error.message); return; }
      toast.success('Agendamento criado');
    }
    setDlgOpen(false);
    load();
  };

  const remove = async (a: Appt) => {
    if (!confirm('Excluir agendamento?')) return;
    await supabase.from('clinic_appointments').delete().eq('id', a.id);
    load();
  };

  const patientName = (pid: string | null) => patients.find(p => p.id === pid)?.nome || '—';

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Calendar className="w-6 h-6" /> Agenda</h1>
            <p className="text-sm text-muted-foreground">Atendimentos agendados por dia.</p>
          </div>
          <div className="flex gap-2">
            <Input type="date" value={day} onChange={e => setDay(e.target.value)} className="w-auto" />
            <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={openNew}><Plus className="w-4 h-4" /> Novo</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>{editing ? 'Editar agendamento' : 'Novo agendamento'}</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Paciente</Label>
                    <Select value={form.patient_id} onValueChange={v => setForm({ ...form, patient_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
                      <SelectContent>
                        {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Data</Label><Input type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} /></div>
                  <div><Label>Hora</Label><Input type="time" value={form.scheduled_time} onChange={e => setForm({ ...form, scheduled_time: e.target.value })} /></div>
                  <div><Label>Duração (min)</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })} /></div>
                  <div>
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Profissional</Label><Input value={form.professional_name} onChange={e => setForm({ ...form, professional_name: e.target.value })} /></div>
                  <div><Label>Tipo</Label><Input value={form.attendance_type} onChange={e => setForm({ ...form, attendance_type: e.target.value })} /></div>
                  <div className="col-span-2"><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDlgOpen(false)}>Cancelar</Button>
                  <Button onClick={save}>Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Atendimentos de {new Date(day + 'T00:00:00').toLocaleDateString('pt-BR')}</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center text-muted-foreground py-8">Carregando...</div>
            ) : appts.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">Nenhum agendamento neste dia.</div>
            ) : (
              <div className="space-y-2">
                {appts.map(a => (
                  <div key={a.id} className="flex items-center justify-between border rounded-md p-3">
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-semibold">
                        {new Date(a.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div>
                        <div className="font-medium">{patientName(a.patient_id)}</div>
                        <div className="text-xs text-muted-foreground">
                          {a.professional_name || 'Sem profissional'} · {a.duration_minutes}min
                          {a.attendance_type && <> · {a.attendance_type}</>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={a.status === 'cancelado' || a.status === 'faltou' ? 'destructive' : a.status === 'realizado' ? 'default' : 'secondary'}>
                        {a.status}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => openEdit(a)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => remove(a)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
