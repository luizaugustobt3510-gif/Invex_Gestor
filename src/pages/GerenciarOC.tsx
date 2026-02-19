import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, RefreshCw, Download, PackageCheck, XCircle, Trash2, Eye } from 'lucide-react';

interface PurchaseOrder {
  id: string;
  setor: string;
  fornecedor: string;
  cond_pagto: string;
  obs: string | null;
  total: number | null;
  status: string;
  pdf_url: string | null;
  created_at: string;
}

interface OrderItem {
  id: string;
  codigo: string;
  material: string;
  unidade: string | null;
  quantidade: number;
  preco: number;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendente: { label: 'Pendente', variant: 'secondary' },
  entrada: { label: 'Entrada realizada', variant: 'default' },
  cancelada: { label: 'Cancelada', variant: 'destructive' },
};

const GerenciarOC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'entrada' | 'cancelar' | 'excluir' } | null>(null);
  const [viewItems, setViewItems] = useState<{ order: PurchaseOrder; items: OrderItem[] } | null>(null);
  const [loadingItems, setLoadingItems] = useState(false);

  const getCompanyId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('user_roles')
      .select('company_id')
      .eq('user_id', user.id)
      .not('company_id', 'is', null)
      .limit(1)
      .single();
    return data?.company_id || null;
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const cid = companyId || await getCompanyId();
      if (!cid) return;
      if (!companyId) setCompanyId(cid);

      const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, setor, fornecedor, cond_pagto, obs, total, status, pdf_url, created_at')
        .eq('company_id', cid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch {
      toast({ title: 'Erro', description: 'Erro ao carregar ordens de compra.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleDownloadPdf = async (order: PurchaseOrder) => {
    if (!order.pdf_url) {
      toast({ title: 'Erro', description: 'PDF não disponível.', variant: 'destructive' });
      return;
    }
    try {
      const { data, error } = await supabase.storage
        .from('oc-pdfs')
        .createSignedUrl(order.pdf_url, 3600);
      if (error || !data?.signedUrl) throw error;
      window.open(data.signedUrl, '_blank');
    } catch {
      toast({ title: 'Erro', description: 'Erro ao gerar link do PDF.', variant: 'destructive' });
    }
  };

  const handleViewItems = async (order: PurchaseOrder) => {
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select('id, codigo, material, unidade, quantidade, preco')
        .eq('purchase_order_id', order.id);
      if (error) throw error;
      setViewItems({ order, items: data || [] });
    } catch {
      toast({ title: 'Erro', description: 'Erro ao carregar itens.', variant: 'destructive' });
    } finally {
      setLoadingItems(false);
    }
  };

  const handleEntrada = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      // Get order items
      const { data: items, error: itemsError } = await supabase
        .from('purchase_order_items')
        .select('codigo, quantidade')
        .eq('purchase_order_id', orderId);

      if (itemsError || !items) throw itemsError;

      const cid = companyId!;

      // For each item, find the material and update stock
      for (const item of items) {
        const { data: material } = await supabase
          .from('materials')
          .select('id, quantidade')
          .eq('company_id', cid)
          .eq('codigo', item.codigo)
          .limit(1)
          .single();

        if (material) {
          const newQty = Number(material.quantidade) + Number(item.quantidade);
          await supabase
            .from('materials')
            .update({ quantidade: newQty })
            .eq('id', material.id);

          // Register stock movement
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('stock_movements').insert({
              company_id: cid,
              material_id: material.id,
              quantidade: Number(item.quantidade),
              tipo: 'entrada',
              obs: `Entrada via OC ${orderId.substring(0, 8).toUpperCase()}`,
              user_id: user.id,
            });
          }
        }
      }

      // Update order status
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status: 'entrada' })
        .eq('id', orderId);

      if (error) throw error;

      toast({ title: 'Sucesso!', description: 'Entrada no estoque realizada com sucesso.' });
      fetchOrders();
    } catch {
      toast({ title: 'Erro', description: 'Erro ao dar entrada no estoque.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  };

  const handleCancelar = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status: 'cancelada' })
        .eq('id', orderId);
      if (error) throw error;
      toast({ title: 'Sucesso!', description: 'Ordem de compra cancelada.' });
      fetchOrders();
    } catch {
      toast({ title: 'Erro', description: 'Erro ao cancelar ordem.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  };

  const handleExcluir = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      // Delete items first
      await supabase.from('purchase_order_items').delete().eq('purchase_order_id', orderId);
      const { error } = await supabase.from('purchase_orders').delete().eq('id', orderId);
      if (error) throw error;
      toast({ title: 'Sucesso!', description: 'Ordem de compra excluída.' });
      fetchOrders();
    } catch {
      toast({ title: 'Erro', description: 'Erro ao excluir ordem.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  };

  const executeAction = () => {
    if (!confirmAction) return;
    if (confirmAction.action === 'entrada') handleEntrada(confirmAction.id);
    else if (confirmAction.action === 'cancelar') handleCancelar(confirmAction.id);
    else if (confirmAction.action === 'excluir') handleExcluir(confirmAction.id);
  };

  const actionLabels = {
    entrada: { title: 'Dar entrada no estoque', desc: 'Os saldos dos materiais serão atualizados automaticamente. Esta ação não pode ser desfeita.', btn: 'Confirmar Entrada' },
    cancelar: { title: 'Cancelar ordem de compra', desc: 'A ordem será marcada como cancelada. Os materiais não serão afetados.', btn: 'Cancelar OC' },
    excluir: { title: 'Excluir ordem de compra', desc: 'A ordem e todos os seus itens serão removidos permanentemente. Esta ação não pode ser desfeita.', btn: 'Excluir' },
  };

  return (
    <MainLayout>
      <Card className="max-w-6xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Ordens de Compra
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma ordem de compra encontrada.</div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OC</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const cfg = statusConfig[order.status] || statusConfig.pendente;
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">{order.id.substring(0, 8).toUpperCase()}</TableCell>
                        <TableCell className="text-sm">{new Date(order.created_at).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{order.setor}</TableCell>
                        <TableCell>{order.fornecedor}</TableCell>
                        <TableCell className="font-medium">R$ {(order.total || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" title="Ver itens" onClick={() => handleViewItems(order)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            {order.pdf_url && (
                              <Button variant="ghost" size="icon" title="Baixar PDF" onClick={() => handleDownloadPdf(order)}>
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                            {order.status === 'pendente' && (
                              <>
                                <Button variant="ghost" size="icon" title="Dar entrada no estoque" onClick={() => setConfirmAction({ id: order.id, action: 'entrada' })}>
                                  <PackageCheck className="w-4 h-4 text-primary" />
                                </Button>
                                <Button variant="ghost" size="icon" title="Cancelar OC" onClick={() => setConfirmAction({ id: order.id, action: 'cancelar' })}>
                                  <XCircle className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </>
                            )}
                            <Button variant="ghost" size="icon" title="Excluir" onClick={() => setConfirmAction({ id: order.id, action: 'excluir' })}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Action Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAction ? actionLabels[confirmAction.action].title : ''}</DialogTitle>
            <DialogDescription>{confirmAction ? actionLabels[confirmAction.action].desc : ''}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancelar</Button>
            <Button
              variant={confirmAction?.action === 'excluir' ? 'destructive' : 'default'}
              onClick={executeAction}
              disabled={!!actionLoading}
            >
              {actionLoading ? 'Processando...' : confirmAction ? actionLabels[confirmAction.action].btn : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Items Dialog */}
      <Dialog open={!!viewItems} onOpenChange={(open) => !open && setViewItems(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Itens da OC {viewItems?.order.id.substring(0, 8).toUpperCase()}</DialogTitle>
            <DialogDescription>
              {viewItems?.order.fornecedor} — {viewItems?.order.setor}
            </DialogDescription>
          </DialogHeader>
          {loadingItems ? (
            <div className="text-center py-4 text-muted-foreground">Carregando...</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewItems?.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.codigo}</TableCell>
                      <TableCell>{item.material}</TableCell>
                      <TableCell>{item.unidade || '-'}</TableCell>
                      <TableCell>{item.quantidade}</TableCell>
                      <TableCell>R$ {Number(item.preco).toFixed(2)}</TableCell>
                      <TableCell className="font-medium">R$ {(Number(item.quantidade) * Number(item.preco)).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default GerenciarOC;
