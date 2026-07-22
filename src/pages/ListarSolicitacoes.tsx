import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ClipboardList, RefreshCw, Filter, PackageCheck, XCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Solicitacao {
  id: string;
  created_at: string;
  user_id: string;
  setor: string;
  codigo: string;
  material: string;
  quantidade: number;
  status: string;
  obs: string | null;
}

const ListarSolicitacoes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ id: string; material: string } | null>(null);
  const [rejectObs, setRejectObs] = useState('');
  const [confirmDeliver, setConfirmDeliver] = useState<Solicitacao | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Solicitacao | null>(null);

  const fetchSolicitacoes = async () => {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('company_id, role')
        .eq('user_id', authUser.id)
        .limit(1)
        .single();

      let query = supabase
        .from('material_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (roleData?.company_id) {
        query = query.eq('company_id', roleData.company_id);
      }

      // Solicitantes only see their own requests
      if (roleData?.role === 'solicitante') {
        query = query.eq('user_id', authUser.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSolicitacoes(data || []);
    } catch {
      toast({ title: 'Erro', description: 'Erro ao carregar solicitações.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSolicitacoes(); }, []);

  const filteredSolicitacoes = solicitacoes.filter(sol => {
    if (!dataInicial && !dataFinal) return true;
    const solDate = new Date(sol.created_at);
    const startDate = dataInicial ? new Date(dataInicial) : null;
    const endDate = dataFinal ? new Date(dataFinal + 'T23:59:59') : null;
    if (startDate && endDate) return solDate >= startDate && solDate <= endDate;
    if (startDate) return solDate >= startDate;
    if (endDate) return solDate <= endDate;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('pendente')) return <Badge variant="secondary">{status}</Badge>;
    if (s.includes('aprovad') || s.includes('entreg')) return <Badge className="bg-green-500 text-white">{status}</Badge>;
    if (s.includes('rejeitad') || s.includes('negad') || s.includes('recusad')) return <Badge variant="destructive">{status}</Badge>;
    return <Badge>{status}</Badge>;
  };

  const handleDeliver = async (sol: Solicitacao) => {
    setActionLoading(sol.id);
    try {
      const { error } = await supabase.rpc('deliver_material_request', {
        _request_id: sol.id,
        _sector_id: undefined as any,
      } as any);
      if (error) throw error;
      toast({
        title: 'Entrega registrada',
        description: `Material transferido do almoxarifado para o setor ${sol.setor}.`,
      });
      fetchSolicitacoes();
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.message || 'Erro ao entregar material.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
      setConfirmDeliver(null);
    }
  };


  const handleReject = async () => {
    if (!rejectDialog) return;
    setActionLoading(rejectDialog.id);
    try {
      const obs = rejectObs.trim() ? `Recusada: ${rejectObs.trim()}` : 'Recusada';
      await supabase
        .from('material_requests')
        .update({ status: 'Recusada', obs })
        .eq('id', rejectDialog.id);

      toast({ title: 'Solicitação recusada.' });
      fetchSolicitacoes();
    } catch {
      toast({ title: 'Erro', description: 'Erro ao recusar solicitação.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
      setRejectDialog(null);
      setRejectObs('');
    }
  };

  const handleDelete = async (sol: Solicitacao) => {
    setActionLoading(sol.id);
    try {
      const { error } = await supabase.from('material_requests').delete().eq('id', sol.id);
      if (error) throw error;
      toast({ title: 'Solicitação excluída.' });
      fetchSolicitacoes();
    } catch {
      toast({ title: 'Erro', description: 'Erro ao excluir solicitação.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
      setConfirmDelete(null);
    }
  };

  const isAdmin = user?.role === 'superadm' || user?.role === 'admin' || user?.role === 'usuario almox';

  return (
    <MainLayout>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Solicitações
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchSolicitacoes} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end p-4 bg-muted/50 rounded-lg">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="space-y-1">
              <Label className="text-xs">Data Inicial</Label>
              <Input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} className="w-[160px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data Final</Label>
              <Input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} className="w-[160px]" />
            </div>
            {(dataInicial || dataFinal) && (
              <Button variant="ghost" size="sm" onClick={() => { setDataInicial(''); setDataFinal(''); }}>Limpar</Button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredSolicitacoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma solicitação encontrada.</div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Obs</TableHead>
                    {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSolicitacoes.map((sol) => (
                    <TableRow key={sol.id}>
                      <TableCell className="text-sm">{new Date(sol.created_at).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{sol.setor}</TableCell>
                      <TableCell className="font-mono">{sol.codigo}</TableCell>
                      <TableCell>{sol.material}</TableCell>
                      <TableCell>{sol.quantidade}</TableCell>
                      <TableCell>{getStatusBadge(sol.status)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{sol.obs || '-'}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {sol.status.toLowerCase() === 'pendente' && (
                              <>
                                <Button
                                  variant="ghost" size="icon" title="Aprovar e entregar"
                                  onClick={() => setConfirmDeliver(sol)}
                                  disabled={actionLoading === sol.id}
                                >
                                  <PackageCheck className="w-4 h-4 text-primary" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon" title="Recusar"
                                  onClick={() => setRejectDialog({ id: sol.id, material: sol.material })}
                                  disabled={actionLoading === sol.id}
                                >
                                  <XCircle className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost" size="icon" title="Excluir"
                              onClick={() => setConfirmDelete(sol)}
                              disabled={actionLoading === sol.id}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            Exibindo {filteredSolicitacoes.length} de {solicitacoes.length} solicitações
          </div>
        </CardContent>
      </Card>

      {/* Confirm Deliver Dialog */}
      <Dialog open={!!confirmDeliver} onOpenChange={(open) => !open && setConfirmDeliver(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar e entregar material</DialogTitle>
            <DialogDescription>
              Confirma a entrega de {confirmDeliver?.quantidade} unidade(s) de {confirmDeliver?.material}? 
              Isso dará baixa no estoque automaticamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeliver(null)}>Cancelar</Button>
            <Button onClick={() => confirmDeliver && handleDeliver(confirmDeliver)} disabled={!!actionLoading}>
              {actionLoading ? 'Processando...' : 'Confirmar Entrega'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(open) => { if (!open) { setRejectDialog(null); setRejectObs(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar solicitação</DialogTitle>
            <DialogDescription>
              Recusar solicitação de {rejectDialog?.material}. Informe o motivo (opcional):
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivo da recusa..."
            value={rejectObs}
            onChange={(e) => setRejectObs(e.target.value)}
            className="min-h-[80px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialog(null); setRejectObs(''); }}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!!actionLoading}>
              {actionLoading ? 'Processando...' : 'Recusar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir solicitação</DialogTitle>
            <DialogDescription>
              Deseja excluir permanentemente a solicitação de {confirmDelete?.material}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmDelete && handleDelete(confirmDelete)} disabled={!!actionLoading}>
              {actionLoading ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default ListarSolicitacoes;
