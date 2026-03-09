import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  const [form, setForm] = useState({
    data_desligamento: new Date().toISOString().split('T')[0],
    motivo: '',
    observacoes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !form.data_desligamento || !form.motivo) {
      toast({ title: 'Preencha data e motivo.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Update employee status to 'desligado'
      const { error } = await supabase
        .from('employees')
        .update({ status: 'desligado' })
        .eq('id', employee.id);
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
          },
        });
      }

      toast({ title: `${employee.nome} foi desligado com sucesso.` });
      onOpenChange(false);
      setForm({ data_desligamento: new Date().toISOString().split('T')[0], motivo: '', observacoes: '' });
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
            <Input value={form.motivo} onChange={e => setForm(p => ({ ...p, motivo: e.target.value }))} placeholder="Ex: Pedido de demissão, justa causa..." />
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
