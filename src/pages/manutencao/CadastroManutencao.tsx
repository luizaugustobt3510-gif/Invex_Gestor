import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PackagePlus } from 'lucide-react';

const CONTROLES = ['Preventiva', 'Calibração', 'Aplicação', 'Inspeção', 'Limpeza', 'Troca de peça', 'Outro'];
const FREQUENCIAS = ['Mensal', 'Bimestral', 'Trimestral', 'Semestral', 'Anual', 'Sob demanda'];

const CadastroManutencao = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    equipamento: '',
    controle: '',
    frequencia: '',
    empresa_prestadora: '',
    manutencao_preventiva: '',
    data_validade: '',
    manutencao_corretiva: '',
    observacoes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.companyId) return;
    if (!form.equipamento || !form.controle || !form.frequencia || !form.empresa_prestadora || !form.manutencao_preventiva || !form.data_validade) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase.from('maintenance_records').insert({
      company_id: user.companyId,
      equipamento: form.equipamento.trim(),
      controle: form.controle,
      frequencia: form.frequencia,
      empresa_prestadora: form.empresa_prestadora.trim(),
      manutencao_preventiva: form.manutencao_preventiva,
      data_validade: form.data_validade,
      manutencao_corretiva: form.manutencao_corretiva || null,
      observacoes: form.observacoes.trim(),
      created_by: authData?.user?.id || '',
    });
    setLoading(false);

    if (error) {
      toast({ title: 'Erro ao cadastrar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Manutenção cadastrada com sucesso!' });
      navigate('/manutencao/listagem');
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackagePlus className="w-5 h-5" /> Cadastrar Manutenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Equipamento *</Label>
                <Input value={form.equipamento} onChange={e => setForm(p => ({ ...p, equipamento: e.target.value }))} placeholder="Nome do equipamento" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Controle *</Label>
                  <Select value={form.controle} onValueChange={v => setForm(p => ({ ...p, controle: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {CONTROLES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Frequência *</Label>
                  <Select value={form.frequencia} onValueChange={v => setForm(p => ({ ...p, frequencia: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {FREQUENCIAS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Empresa Prestadora *</Label>
                <Input value={form.empresa_prestadora} onChange={e => setForm(p => ({ ...p, empresa_prestadora: e.target.value }))} placeholder="Nome da empresa" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Manutenção Preventiva (data) *</Label>
                  <Input type="date" value={form.manutencao_preventiva} onChange={e => setForm(p => ({ ...p, manutencao_preventiva: e.target.value }))} />
                </div>
                <div>
                  <Label>Data de Validade *</Label>
                  <Input type="date" value={form.data_validade} onChange={e => setForm(p => ({ ...p, data_validade: e.target.value }))} />
                </div>
              </div>

              <div>
                <Label>Manutenção Corretiva (data opcional)</Label>
                <Input type="date" value={form.manutencao_corretiva} onChange={e => setForm(p => ({ ...p, manutencao_corretiva: e.target.value }))} />
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} placeholder="Observações adicionais..." />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Cadastrar'}</Button>
                <Button type="button" variant="outline" onClick={() => navigate('/manutencao/listagem')}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default CadastroManutencao;
