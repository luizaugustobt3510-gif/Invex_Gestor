import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Eye, XCircle, ShoppingCart } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Sale {
  id: string;
  valor_total: number;
  desconto: number;
  forma_pagamento: string;
  status: string;
  created_at: string;
  observacoes: string | null;
}

interface SaleItem {
  id: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  material_id: string;
  materials?: { material: string; codigo: string } | null;
}

const paymentLabels: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_credito: 'Cartão Crédito',
  cartao_debito: 'Cartão Débito',
};

const HistoricoVendas = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchDate, setSearchDate] = useState('');
  const [filterPayment, setFilterPayment] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [cancelSaleId, setCancelSaleId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.companyId) fetchSales();
  }, [user?.companyId]);

  const fetchSales = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('sales')
      .select('*')
      .eq('company_id', user!.companyId!)
      .order('created_at', { ascending: false });
    if (data) setSales(data as Sale[]);
    setLoading(false);
  };

  const viewDetails = async (sale: Sale) => {
    setSelectedSale(sale);
    const { data } = await supabase
      .from('sale_items')
      .select('*, materials(material, codigo)')
      .eq('sale_id', sale.id);
    if (data) setSaleItems(data as unknown as SaleItem[]);
  };

  const cancelSale = async () => {
    if (!cancelSaleId || !user?.companyId) return;
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      // Get sale items to restore stock
      const { data: items } = await supabase
        .from('sale_items')
        .select('material_id, quantidade')
        .eq('sale_id', cancelSaleId);

      // Restore stock
      if (items) {
        for (const item of items) {
          const { data: mat } = await supabase
            .from('materials')
            .select('quantidade')
            .eq('id', item.material_id)
            .single();
          if (mat) {
            await supabase
              .from('materials')
              .update({ quantidade: mat.quantidade + item.quantidade })
              .eq('id', item.material_id);
            // Record return movement
            await supabase.from('stock_movements').insert({
              company_id: user.companyId!,
              material_id: item.material_id,
              quantidade: item.quantidade,
              tipo: 'entrada',
              user_id: userId!,
              obs: `Estorno venda #${cancelSaleId.slice(0, 8)}`,
            });
          }
        }
      }

      // Update sale status
      await supabase.from('sales').update({ status: 'cancelada' }).eq('id', cancelSaleId);

      // Update financial entry
      await supabase
        .from('financial_entries')
        .update({ status: 'cancelado' })
        .eq('origem', 'vendas')
        .eq('origem_id', cancelSaleId);

      toast({ title: 'Venda cancelada', description: 'Estoque restaurado e financeiro ajustado.' });
      setCancelSaleId(null);
      fetchSales();
    } catch (err: any) {
      toast({ title: 'Erro ao cancelar', description: err.message, variant: 'destructive' });
    }
  };

  const filtered = sales.filter(s => {
    if (searchDate && !s.created_at.startsWith(searchDate)) return false;
    if (filterPayment !== 'todos' && s.forma_pagamento !== filterPayment) return false;
    if (filterStatus !== 'todos' && s.status !== filterStatus) return false;
    return true;
  });

  return (
    <MainLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Histórico de Vendas</h1>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap gap-3">
              <Input type="date" value={searchDate} onChange={e => setSearchDate(e.target.value)} className="w-40" />
              <Select value={filterPayment} onValueChange={setFilterPayment}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Pagamento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="finalizada">Finalizada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Carregando...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma venda encontrada</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Desconto</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(sale => (
                      <TableRow key={sale.id} className={sale.status === 'cancelada' ? 'opacity-50' : ''}>
                        <TableCell>{format(parseISO(sale.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</TableCell>
                        <TableCell className="font-semibold">R$ {sale.valor_total.toFixed(2)}</TableCell>
                        <TableCell>{sale.desconto > 0 ? `R$ ${sale.desconto.toFixed(2)}` : '-'}</TableCell>
                        <TableCell>{paymentLabels[sale.forma_pagamento] || sale.forma_pagamento}</TableCell>
                        <TableCell>
                          <Badge variant={sale.status === 'finalizada' ? 'default' : 'destructive'}>
                            {sale.status === 'finalizada' ? 'Finalizada' : 'Cancelada'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => viewDetails(sale)}>
                              <Eye className="h-3 w-3 mr-1" /> Ver
                            </Button>
                            {sale.status === 'finalizada' && (
                              <Button size="sm" variant="destructive" onClick={() => setCancelSaleId(sale.id)}>
                                <XCircle className="h-3 w-3 mr-1" /> Cancelar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sale details dialog */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Venda</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Data:</span> {format(parseISO(selectedSale.created_at), 'dd/MM/yyyy HH:mm')}</div>
                <div><span className="text-muted-foreground">Status:</span> {selectedSale.status}</div>
                <div><span className="text-muted-foreground">Pagamento:</span> {paymentLabels[selectedSale.forma_pagamento]}</div>
                <div><span className="text-muted-foreground">Total:</span> R$ {selectedSale.valor_total.toFixed(2)}</div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saleItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{(item.materials as any)?.material || '-'}</TableCell>
                      <TableCell>{item.quantidade}</TableCell>
                      <TableCell>R$ {item.preco_unitario.toFixed(2)}</TableCell>
                      <TableCell>R$ {item.subtotal.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation */}
      <AlertDialog open={!!cancelSaleId} onOpenChange={() => setCancelSaleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Venda</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá restaurar o estoque e ajustar o lançamento financeiro. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={cancelSale}>Sim, cancelar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default HistoricoVendas;
