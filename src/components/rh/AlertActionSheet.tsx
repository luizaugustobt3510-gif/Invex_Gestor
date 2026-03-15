import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Calendar, GraduationCap, HeartPulse, AlertTriangle, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AlertEmployee {
  id: string;
  nome: string;
  cargo: string;
  departamento?: string;
  data_admissao: string;
  company_id: string;
}

interface AlertActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'ferias' | 'treinamento' | 'aso' | null;
  employees: AlertEmployee[];
  trainings?: any[];
  onSuccess: () => void;
}

export const AlertActionSheet = ({ open, onOpenChange, type, employees, trainings = [], onSuccess }: AlertActionSheetProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<AlertEmployee | null>(null);
  const [view, setView] = useState<'list' | 'form'>('list');

  // Férias form
  const [feriasForm, setFeriasForm] = useState({
    periodo_aquisitivo_inicio: '', periodo_aquisitivo_fim: '',
    data_inicio: '', data_fim: '', dias: '30', status: 'agendada', obs: '',
  });

  // Training form
  const [trainForm, setTrainForm] = useState({
    training_id: '', data_realizacao: '', data_validade: '',
  });

  // ASO form
  const [asoForm, setAsoForm] = useState({
    tipo: 'periodico', data_realizacao: '', data_vencimento: '', observacoes: '',
  });

  const resetAndClose = () => {
    setSelectedEmployee(null);
    setView('list');
    onOpenChange(false);
  };

  const selectEmployee = (emp: AlertEmployee) => {
    setSelectedEmployee(emp);
    setView('form');

    if (type === 'ferias') {
      const admDate = new Date(emp.data_admissao);
      const paiStart = emp.data_admissao;
      const paiEnd = new Date(admDate.getFullYear() + 1, admDate.getMonth(), admDate.getDate()).toISOString().split('T')[0];
      setFeriasForm({
        periodo_aquisitivo_inicio: paiStart,
        periodo_aquisitivo_fim: paiEnd,
        data_inicio: '', data_fim: '', dias: '30', status: 'agendada', obs: '',
      });
    } else if (type === 'treinamento') {
      const today = new Date().toISOString().split('T')[0];
      setTrainForm({ training_id: '', data_realizacao: today, data_validade: '' });
    } else if (type === 'aso') {
      const today = new Date().toISOString().split('T')[0];
      setAsoForm({ tipo: 'periodico', data_realizacao: today, data_vencimento: '', observacoes: '' });
    }
  };

  const handleSaveFerias = async () => {
    if (!selectedEmployee || !feriasForm.data_inicio || !feriasForm.data_fim) {
      toast({ title: 'Preencha as datas de início e fim.', variant: 'destructive' });
      return;
    }
    setSaving(true);

    // Auto-calculate days
    const start = new Date(feriasForm.data_inicio);
    const end = new Date(feriasForm.data_fim);
    const dias = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

    // Auto-determine status
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let status = 'agendada';
    if (start <= today && end >= today) status = 'em_andamento';
    else if (end < today) status = 'concluida';

    const { error } = await supabase.from('employee_vacations').insert({
      employee_id: selectedEmployee.id,
      company_id: selectedEmployee.company_id,
      periodo_aquisitivo_inicio: feriasForm.periodo_aquisitivo_inicio,
      periodo_aquisitivo_fim: feriasForm.periodo_aquisitivo_fim,
      data_inicio: feriasForm.data_inicio,
      data_fim: feriasForm.data_fim,
      dias: dias > 0 ? dias : parseInt(feriasForm.dias),
      status,
      obs: feriasForm.obs,
    });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Férias registradas com sucesso!' });
      onSuccess();
      resetAndClose();
    }
    setSaving(false);
  };

  const handleSaveTraining = async () => {
    if (!selectedEmployee || !trainForm.training_id || !trainForm.data_realizacao) {
      toast({ title: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }
    setSaving(true);

    // Auto-calculate validade based on training periodicidade
    let dataValidade = trainForm.data_validade || null;
    if (!dataValidade) {
      const training = trainings.find(t => t.id === trainForm.training_id);
      if (training?.periodicidade_meses) {
        const d = new Date(trainForm.data_realizacao);
        d.setMonth(d.getMonth() + training.periodicidade_meses);
        dataValidade = d.toISOString().split('T')[0];
      }
    }

    const { error } = await supabase.from('employee_trainings').insert({
      employee_id: selectedEmployee.id,
      company_id: selectedEmployee.company_id,
      training_id: trainForm.training_id,
      data_realizacao: trainForm.data_realizacao,
      data_validade: dataValidade,
      status: 'vigente',
    });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Treinamento registrado com sucesso!' });
      onSuccess();
      resetAndClose();
    }
    setSaving(false);
  };

  const handleSaveASO = async () => {
    if (!selectedEmployee || !asoForm.data_realizacao) {
      toast({ title: 'Preencha a data de realização.', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const { error } = await supabase.from('employee_asos').insert({
      employee_id: selectedEmployee.id,
      company_id: selectedEmployee.company_id,
      tipo: asoForm.tipo,
      data_realizacao: asoForm.data_realizacao,
      data_vencimento: asoForm.data_vencimento || null,
      observacoes: asoForm.observacoes,
    });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'ASO registrado com sucesso!' });
      onSuccess();
      resetAndClose();
    }
    setSaving(false);
  };

  const getIcon = () => {
    if (type === 'ferias') return <Calendar className="w-5 h-5 text-blue-600" />;
    if (type === 'treinamento') return <GraduationCap className="w-5 h-5 text-amber-600" />;
    if (type === 'aso') return <HeartPulse className="w-5 h-5 text-destructive" />;
    return <AlertTriangle className="w-5 h-5" />;
  };

  const getTitle = () => {
    if (type === 'ferias') return 'Resolver Pendência de Férias';
    if (type === 'treinamento') return 'Renovar Treinamento';
    if (type === 'aso') return 'Registrar ASO';
    return 'Resolver Pendência';
  };

  const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) resetAndClose(); else onOpenChange(v); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0">
        <SheetHeader className="p-4 sm:p-6 pb-2">
          <div className="flex items-center gap-2">
            {getIcon()}
            <SheetTitle className="text-base sm:text-lg">{getTitle()}</SheetTitle>
          </div>
          <SheetDescription className="text-xs sm:text-sm">
            {view === 'list'
              ? `${employees.length} colaborador(es) com pendência. Clique para resolver.`
              : `Resolvendo pendência de ${selectedEmployee?.nome}`
            }
          </SheetDescription>
        </SheetHeader>
        <Separator />

        <ScrollArea className="h-[calc(100vh-120px)]">
          {view === 'list' ? (
            <div className="p-4 sm:p-6 space-y-2">
              {employees.map(emp => {
                const admDate = new Date(emp.data_admissao);
                const months = (new Date().getFullYear() - admDate.getFullYear()) * 12 + (new Date().getMonth() - admDate.getMonth());
                return (
                  <button
                    key={emp.id}
                    onClick={() => selectEmployee(emp)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{emp.nome}</p>
                      <p className="text-xs text-muted-foreground">{emp.cargo}{emp.departamento ? ` • ${emp.departamento}` : ''}</p>
                      {type === 'ferias' && months >= 23 && (
                        <Badge variant="destructive" className="text-[10px] mt-1">⚠️ Risco trabalhista — {months} meses</Badge>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 sm:p-6 space-y-4">
              <Button variant="ghost" size="sm" onClick={() => setView('list')} className="text-xs -ml-2">
                ← Voltar à lista
              </Button>

              {/* Employee info card */}
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm font-semibold">{selectedEmployee?.nome}</p>
                <p className="text-xs text-muted-foreground">{selectedEmployee?.cargo}{selectedEmployee?.departamento ? ` • ${selectedEmployee.departamento}` : ''}</p>
                <p className="text-xs text-muted-foreground mt-1">Admissão: {selectedEmployee ? formatDate(selectedEmployee.data_admissao) : ''}</p>
              </div>

              {/* FÉRIAS FORM */}
              {type === 'ferias' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Período Aquisitivo Início</Label>
                      <Input type="date" className="text-sm h-9" value={feriasForm.periodo_aquisitivo_inicio} onChange={e => setFeriasForm(p => ({ ...p, periodo_aquisitivo_inicio: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Período Aquisitivo Fim</Label>
                      <Input type="date" className="text-sm h-9" value={feriasForm.periodo_aquisitivo_fim} onChange={e => setFeriasForm(p => ({ ...p, periodo_aquisitivo_fim: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Data Início *</Label>
                      <Input type="date" className="text-sm h-9" value={feriasForm.data_inicio} onChange={e => {
                        const start = e.target.value;
                        setFeriasForm(p => {
                          const dias = parseInt(p.dias) || 30;
                          const endDate = new Date(start);
                          endDate.setDate(endDate.getDate() + dias - 1);
                          return { ...p, data_inicio: start, data_fim: endDate.toISOString().split('T')[0] };
                        });
                      }} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Data Fim *</Label>
                      <Input type="date" className="text-sm h-9" value={feriasForm.data_fim} onChange={e => setFeriasForm(p => ({ ...p, data_fim: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Observações</Label>
                    <Textarea value={feriasForm.obs} onChange={e => setFeriasForm(p => ({ ...p, obs: e.target.value }))} rows={2} className="text-sm" placeholder="Observações..." />
                  </div>
                  <Button onClick={handleSaveFerias} className="w-full gap-2" disabled={saving}>
                    <CheckCircle className="w-4 h-4" />
                    {saving ? 'Registrando...' : 'Registrar Férias'}
                  </Button>
                </div>
              )}

              {/* TREINAMENTO FORM */}
              {type === 'treinamento' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Treinamento *</Label>
                    <Select value={trainForm.training_id} onValueChange={v => {
                      const tr = trainings.find(t => t.id === v);
                      const today = trainForm.data_realizacao || new Date().toISOString().split('T')[0];
                      let validade = '';
                      if (tr?.periodicidade_meses) {
                        const d = new Date(today);
                        d.setMonth(d.getMonth() + tr.periodicidade_meses);
                        validade = d.toISOString().split('T')[0];
                      }
                      setTrainForm(p => ({ ...p, training_id: v, data_validade: validade }));
                    }}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione o treinamento" /></SelectTrigger>
                      <SelectContent>
                        {trainings.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.nome} {t.periodicidade_meses ? `(${t.periodicidade_meses}m)` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Data Realização *</Label>
                      <Input type="date" className="text-sm h-9" value={trainForm.data_realizacao} onChange={e => {
                        const val = e.target.value;
                        setTrainForm(p => {
                          const tr = trainings.find(t => t.id === p.training_id);
                          let validade = p.data_validade;
                          if (tr?.periodicidade_meses) {
                            const d = new Date(val);
                            d.setMonth(d.getMonth() + tr.periodicidade_meses);
                            validade = d.toISOString().split('T')[0];
                          }
                          return { ...p, data_realizacao: val, data_validade: validade };
                        });
                      }} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Validade (auto)</Label>
                      <Input type="date" className="text-sm h-9" value={trainForm.data_validade} onChange={e => setTrainForm(p => ({ ...p, data_validade: e.target.value }))} />
                    </div>
                  </div>
                  {trainForm.data_validade && (
                    <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-500/10 rounded-lg px-3 py-2">
                      <Clock className="w-3 h-3" /> Nova validade: {formatDate(trainForm.data_validade)}
                    </div>
                  )}
                  <Button onClick={handleSaveTraining} className="w-full gap-2" disabled={saving}>
                    <CheckCircle className="w-4 h-4" />
                    {saving ? 'Registrando...' : 'Renovar Treinamento'}
                  </Button>
                </div>
              )}

              {/* ASO FORM */}
              {type === 'aso' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo de Exame *</Label>
                    <Select value={asoForm.tipo} onValueChange={v => setAsoForm(p => ({ ...p, tipo: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admissional">Admissional</SelectItem>
                        <SelectItem value="periodico">Periódico</SelectItem>
                        <SelectItem value="demissional">Demissional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Data Realização *</Label>
                      <Input type="date" className="text-sm h-9" value={asoForm.data_realizacao} onChange={e => setAsoForm(p => ({ ...p, data_realizacao: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Data Vencimento</Label>
                      <Input type="date" className="text-sm h-9" value={asoForm.data_vencimento} onChange={e => setAsoForm(p => ({ ...p, data_vencimento: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Observações</Label>
                    <Textarea value={asoForm.observacoes} onChange={e => setAsoForm(p => ({ ...p, observacoes: e.target.value }))} rows={2} className="text-sm" placeholder="Observações..." />
                  </div>
                  <Button onClick={handleSaveASO} className="w-full gap-2" disabled={saving}>
                    <CheckCircle className="w-4 h-4" />
                    {saving ? 'Registrando...' : 'Registrar ASO'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
