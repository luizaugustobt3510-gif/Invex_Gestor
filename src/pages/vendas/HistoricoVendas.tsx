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
import { Eye, XCircle } from 'lucide-react';
import { formatQty, unitShort } from '@/lib/units';
import { dbErrorMessage } from '@/lib/dbErrors';
import { CONSUMIDOR_NAO_IDENTIFICADO } from './vendasCalc';
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
  customer_id: string | null;
  cliente_nome: string | null;
}

interface SaleItem {
  id: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  material_id: string;
  materials?: { material: string; codigo: string; unidade: string | null } | null;
}

interface ItemLot {
  sale_item_id: string;
  lote: string | null;
  data_producao: string | null;
  validade: string | null;
  quantidade: number;
}

const paymentLabels: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_credito: 'Cartão Crédito',
  cartao_debito: 'Cartão Débito',
  a_prazo: 'A prazo',
};

const fmtD = (d: string | null) => (d ? format(parseISO(d), 'dd/MM/yyyy') : '-');
const compradorDe = (s: Sale) => s.cliente_nome || CONSUMIDOR_NAO_IDENTIFICADO;

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
  const [itemLots, setItemLots] = useState<ItemLot[]>([]);
  const [filterComprador, setFilterComprador] = useState('');
  const [canceling, setCanceling] = useState(false);

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
    setSaleItems([]);
    setItemLots([]);
    const [items, lots] = await Promise.all([
      supabase.from('sale_items').select('*, materials(material, codigo, unidade)').eq('sale_id', sale.id),
      supabase.from('sale_item_lots').select('sale_item_id, lote, data_producao, validade, quantidade').eq('sale_id', sale.id).order('data_producao', { ascending: true }),
    ]);
    if (items.data) setSaleItems(items.data as unknown as SaleItem[]);
    if (lots.data) setItemLots(lots.data as ItemLot[]);
  };

  const cancelSale = async () => {
    if (!cancelSaleId || !user?.companyId || canceling) return;
    setCanceling(true);
    // Tudo no servidor numa única operação: devolve estoque e lotes, cancela a venda e o lançamento financeiro
    const { error } = await supabase.rpc('cancel_sale', { _sale_id: cancelSaleId });
    setCanceling(false);
    if (error) {
      toast({ title: 'Erro ao cancelar', description: dbErrorMessage(error), variant: 'destructive' });
      return;
    }
    toast({ title: 'Venda cancelada', description: 'Estoque e lotes restaurados, financeiro ajustado.' });
    setCancelSaleId(null);
    fetchSales();
  };

  const filtered = sales.filter(s => {
    if (searchDate && !s.created_at.startsWith(searchDate)) return false;
    if (filterPayment !== 'todos' && s.forma_pagamento !== filterPayment) return false;
    if (filterStatus !== 'todos' && s.status !== filterStatus) return false;
    if (filterComprador.trim() && !compradorDe(s).toLowerCase().includes(filterComprador.trim().toLowerCase())) return false;
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
              <Input placeholder="Comprador" value={filterComprador} onChange={e => setFilterComprador(e.target.value)} className="w-48" />
              <Select value={filterPayment} onValueChange={setFilterPayment}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Pagamento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                  <SelectItem value="a_prazo">A prazo</SelectItem>
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
                      <TableHead>Comprador</TableHead>
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
                        <TableCell className={sale.customer_id ? '' : 'text-muted-foreground'}>{compradorDe(sale)}</TableCell>
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
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
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
                <div className="col-span-2"><span className="text-muted-foreground">Comprador:</span> {compradorDe(selectedSale)}</div>
                {selectedSale.observacoes && (
                  <div className="col-span-2"><span className="text-muted-foreground">Observações:</span> {selectedSale.observacoes}</div>
                )}
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
                  {saleItems.map(item => {
                    const un = item.materials?.unidade;
                    const lots = itemLots.filter(l => l.sale_item_id === item.id);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>{item.materials?.material || '-'}</div>
                          {lots.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {lots.map((l, i) => (
                                <div key={i} className="text-xs text-muted-foreground">
                                  Lote {l.lote || 's/ nº'} · prod. {fmtD(l.data_producao)}{l.validade ? ` · val. ${fmtD(l.validade)}` : ''} · {formatQty(Number(l.quantidade), un)}
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatQty(Number(item.quantidade), un)}</TableCell>
                        <TableCell className="whitespace-nowrap">R$ {Number(item.preco_unitario).toFixed(2)}/{unitShort(un)}</TableCell>
                        <TableCell>R$ {Number(item.subtotal).toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
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
              Esta ação irá devolver o estoque aos lotes de origem e cancelar o lançamento financeiro. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={cancelSale} disabled={canceling}>{canceling ? 'Cancelando...' : 'Sim, cancelar'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default HistoricoVendas;
