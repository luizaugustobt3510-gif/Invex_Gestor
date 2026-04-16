import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { financeiroService } from '@/services/financeiroService';
import { ClipboardList, Plus, Clock, CheckCircle } from 'lucide-react';

interface ServiceOrder {
  id: string;
  equipamento: string;
  tipo_servico: string;
  descricao: string;
  prioridade: string;
  empresa_prestadora: string;
  valor: number;
  data_solicitacao: string;
  solicitante_nome: string;
  status: string;
  observacoes: string;
  created_at: string;
  data_inicio_atendimento?: string | null;
  data_conclusao?: string | null;
}

const PRIORIDADES = ['Baixa', 'Média', 'Alta', 'Urgente'];
const TIPOS_SERVICO = ['Corretiva', 'Preventiva', 'Emergencial'];
const STATUS_OPTIONS = ['pendente', 'em_andamento', 'concluida', 'cancelada'];

const prioridadeColor: Record<string, string> = {
  Baixa: 'bg-blue-100 text-blue-800', Média: 'bg-yellow-100 text-yellow-800',
  Alta: 'bg-orange-100 text-orange-800', Urgente: 'bg-red-100 text-red-800',
};

const statusColor: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800', em_andamento: 'bg-blue-100 text-blue-800',
  concluida: 'bg-green-100 text-green-800', cancelada: 'bg-gray-100 text-gray-800',
};

const statusLabel: Record<string, string> = {
  pendente: 'Pendente', em_andamento: 'Em Andamento', concluida: 'Concluída', cancelada: 'Cancelada',
};

const SolicitacaoOS = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ equipamento: '', tipo_servico: '', descricao: '', prioridade: 'Média', empresa_prestadora: '', valor: '', observacoes: '' });

  const canManage = user?.role === 'admin' || user?.role === 'logistica' || user?.role === 'manutencao' || user?.role === 'superadm';

  useEffect(() => { if (user?.companyId) loadOrders(); }, [user?.companyId]);

  const loadOrders = async () => {
    setLoading(true);
    const { data } = await supabase.from('maintenance_service_orders').select('*').eq('company_id', user!.companyId!).order('created_at', { ascending: false });
    setOrders((data || []) as ServiceOrder[]);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.companyId || !form.equipamento || !form.tipo_servico || !form.descricao) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' }); return;
    }
    setSubmitting(true);
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || '';
    const valor = parseFloat(form.valor) || 0;

    const { error } = await supabase.from('maintenance_service_orders').insert({
      company_id: user.companyId, equipamento: form.equipamento.trim(), tipo_servico: form.tipo_servico,
      descricao: form.descricao.trim(), prioridade: form.prioridade, empresa_prestadora: form.empresa_prestadora.trim(),
      valor, solicitante_id: userId, solicitante_nome: user.nome, observacoes: form.observacoes.trim(),
    });

    if (error) { toast({ title: 'Erro ao criar OS', description: error.message, variant: 'destructive' }); setSubmitting(false); return; }

    if (valor > 0) {
      await financeiroService.createEntry({
        company_id: user.companyId, user_id: userId, tipo: 'despesa',
        descricao: `OS Manutenção: ${form.equipamento} - ${form.tipo_servico}`, valor,
        data: new Date().toISOString().split('T')[0], status: 'pendente', origem: 'manutencao_os',
        observacoes: `Empresa: ${form.empresa_prestadora}`,
      });
    }

    setSubmitting(false);
    toast({ title: 'OS criada com sucesso!' });
    setForm({ equipamento: '', tipo_servico: '', descricao: '', prioridade: 'Média', empresa_prestadora: '', valor: '', observacoes: '' });
    loadOrders();
  };

  const handleStatusChange = async (order: ServiceOrder, newStatus: string) => {
    const updates: Record<string, any> = { status: newStatus };

    // SLA tracking
    if (newStatus === 'em_andamento' && !order.data_inicio_atendimento) {
      updates.data_inicio_atendimento = new Date().toISOString();
    }
    if (newStatus === 'concluida' && !order.data_conclusao) {
      updates.data_conclusao = new Date().toISOString();
    }

    await supabase.from('maintenance_service_orders').update(updates).eq('id', order.id);
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...updates } : o));
    toast({ title: `Status atualizado para ${statusLabel[newStatus]}` });
  };

  // SLA calculation
  const calcSLA = (order: ServiceOrder) => {
    if (!order.created_at) return null;
    const start = new Date(order.created_at).getTime();
    const startAtend = order.data_inicio_atendimento ? new Date(order.data_inicio_atendimento).getTime() : null;
    const end = order.data_conclusao ? new Date(order.data_conclusao).getTime() : null;

    const tempoResposta = startAtend ? Math.round((startAtend - start) / 3600000) : null;
    const tempoTotal = end ? Math.round((end - start) / 3600000) : null;

    let classificacao: 'no_prazo' | 'atrasado' | 'pendente' = 'pendente';
    if (tempoTotal !== null) classificacao = tempoTotal <= 48 ? 'no_prazo' : 'atrasado';
    else if (tempoResposta !== null) classificacao = tempoResposta <= 24 ? 'no_prazo' : 'atrasado';

    return { tempoResposta, tempoTotal, classificacao };
  };

  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
  const fmtVal = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="w-6 h-6" /> Ordens de Serviço
        </h1>

        <Tabs defaultValue="nova">
          <TabsList>
            <TabsTrigger value="nova"><Plus className="w-4 h-4 mr-1" /> Nova OS</TabsTrigger>
            <TabsTrigger value="lista">Lista de OS ({orders.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="nova">
            <Card>
              <CardHeader><CardTitle>Nova Solicitação de OS</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label>Equipamento *</Label><Input value={form.equipamento} onChange={e => setForm(p => ({ ...p, equipamento: e.target.value }))} placeholder="Equipamento" /></div>
                    <div><Label>Tipo de Serviço *</Label>
                      <Select value={form.tipo_servico} onValueChange={v => setForm(p => ({ ...p, tipo_servico: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{TIPOS_SERVICO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Descrição do problema *</Label><Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Descreva o problema..." /></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><Label>Prioridade</Label>
                      <Select value={form.prioridade} onValueChange={v => setForm(p => ({ ...p, prioridade: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{PRIORIDADES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Empresa Prestadora</Label><Input value={form.empresa_prestadora} onChange={e => setForm(p => ({ ...p, empresa_prestadora: e.target.value }))} placeholder="Nome da empresa" /></div>
                    <div><Label>Valor do Serviço (R$)</Label><Input type="number" step="0.01" min="0" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} placeholder="0,00" /></div>
                  </div>
                  <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} placeholder="Informações adicionais..." /></div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>Solicitante: <strong>{user?.nome}</strong></span>
                    <span>Data: <strong>{new Date().toLocaleDateString('pt-BR')}</strong></span>
                  </div>
                  <Button type="submit" disabled={submitting}>{submitting ? 'Criando...' : 'Criar Ordem de Serviço'}</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lista">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Equipamento</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>SLA</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                      ) : orders.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma OS encontrada</TableCell></TableRow>
                      ) : (
                        orders.map(o => {
                          const sla = calcSLA(o);
                          return (
                            <TableRow key={o.id}>
                              <TableCell className="font-medium">{o.equipamento}</TableCell>
                              <TableCell>{o.tipo_servico}</TableCell>
                              <TableCell><Badge className={`${prioridadeColor[o.prioridade] || ''} hover:opacity-80`}>{o.prioridade}</Badge></TableCell>
                              <TableCell>{o.empresa_prestadora || '—'}</TableCell>
                              <TableCell>{fmtVal(Number(o.valor))}</TableCell>
                              <TableCell>{fmt(o.data_solicitacao)}</TableCell>
                              <TableCell>
                                {sla && (
                                  <div className="text-xs">
                                    {sla.tempoResposta !== null && <div>Resp: {sla.tempoResposta}h</div>}
                                    {sla.tempoTotal !== null && <div>Total: {sla.tempoTotal}h</div>}
                                    <Badge variant="outline" className={`text-xs mt-0.5 ${
                                      sla.classificacao === 'no_prazo' ? 'border-green-500 text-green-700' :
                                      sla.classificacao === 'atrasado' ? 'border-red-500 text-red-700' : ''
                                    }`}>
                                      {sla.classificacao === 'no_prazo' ? 'No prazo' : sla.classificacao === 'atrasado' ? 'Atrasado' : 'Aguardando'}
                                    </Badge>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {canManage ? (
                                  <Select value={o.status} onValueChange={v => handleStatusChange(o, v)}>
                                    <SelectTrigger className="w-[140px] h-8">
                                      <Badge className={`${statusColor[o.status] || ''} hover:opacity-80`}>{statusLabel[o.status]}</Badge>
                                    </SelectTrigger>
                                    <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}</SelectContent>
                                  </Select>
                                ) : (
                                  <Badge className={`${statusColor[o.status] || ''} hover:opacity-80`}>{statusLabel[o.status]}</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default SolicitacaoOS;
