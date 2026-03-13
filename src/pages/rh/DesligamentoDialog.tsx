import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DesligamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: { id: string; nome: string } | null;
  onSuccess: () => void;
}

export const DesligamentoDialog = ({ open, onOpenChange, employee, onSuccess }: DesligamentoDialogProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [reasons, setReasons] = useState<any[]>([]);
  const [form, setForm] = useState({
    data_desligamento: new Date().toISOString().split('T')[0],
    motivo: '',
    observacoes: '',
    responsavel_nome: '',
  });

  useEffect(() => {
    if (open) {
      supabase.from('termination_reasons').select('*').order('motivo').then(({ data }) => {
        setReasons(data || []);
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !form.data_desligamento || !form.motivo || !form.responsavel_nome.trim()) {
      toast({ title: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Get company_id
      const { data: emp } = await supabase.from('employees').select('company_id').eq('id', employee.id).single();
      if (!emp?.company_id) throw new Error('Empresa não encontrada');

      // Insert termination record
      await supabase.from('employee_terminations').insert({
        company_id: emp.company_id,
        employee_id: employee.id,
        data_desligamento: form.data_desligamento,
        motivo: form.motivo,
        observacoes: form.observacoes,
        responsavel_nome: form.responsavel_nome.trim(),
      });

      // Update employee status
      const { error } = await supabase.from('employees').update({ status: 'desligado' }).eq('id', employee.id);
      if (error) throw error;

      // Audit log
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('audit_log').insert({
          user_id: user.id,
          action: 'desligamento',
          entity_type: 'employee',
          entity_id: employee.id,
          details: {
            nome: employee.nome,
            data_desligamento: form.data_desligamento,
            motivo: form.motivo,
            observacoes: form.observacoes,
            responsavel: form.responsavel_nome,
          },
        });
      }

      toast({ title: `${employee.nome} foi desligado com sucesso.` });
      onOpenChange(false);
      setForm({ data_desligamento: new Date().toISOString().split('T')[0], motivo: '', observacoes: '', responsavel_nome: '' });
      onSuccess();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desligar Colaborador — {employee?.nome}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Data de Desligamento *</Label>
            <Input type="date" value={form.data_desligamento} onChange={e => setForm(p => ({ ...p, data_desligamento: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Motivo *</Label>
            <Select value={form.motivo} onValueChange={v => setForm(p => ({ ...p, motivo: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione o motivo..." /></SelectTrigger>
              <SelectContent>
                {reasons.map(r => <SelectItem key={r.id} value={r.motivo}>{r.motivo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Responsável pelo Registro *</Label>
            <Input value={form.responsavel_nome} onChange={e => setForm(p => ({ ...p, responsavel_nome: e.target.value }))} placeholder="Nome do responsável" />
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} placeholder="Observações adicionais" />
          </div>
          <Button type="submit" variant="destructive" className="w-full" disabled={saving}>
            {saving ? 'Processando...' : 'Confirmar Desligamento'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
