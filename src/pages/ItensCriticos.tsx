import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useInventoryData, InventoryItem } from '@/hooks/useInventoryData';
import { useAuth } from '@/contexts/AuthContext';
import { StockUpdateDialog } from '@/components/StockUpdateDialog';
import { AlertTriangle, RefreshCw, Wrench } from 'lucide-react';

const ItensCriticos = () => {
  const { data: inventoryData, loading, refetch, updateStock } = useInventoryData();
  const { hasPermission } = useAuth();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const canAdjust = hasPermission(['superadm', 'admin']);

  const criticalItems = inventoryData.filter(
    item => item.status === 'Zerado' || item.status === 'Abaixo do Mínimo'
  );

  const handleAdjust = (item: InventoryItem) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handleUpdate = async (codigo: string, quantidade: number) => {
    await updateStock(codigo, quantidade);
    await refetch();
  };

  return (
    <MainLayout>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Itens Críticos ({criticalItems.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : criticalItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum item crítico no momento. 🎉</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="text-right">Mínimo</TableHead>
                    <TableHead className="text-right">Máximo</TableHead>
                    <TableHead>Status</TableHead>
                    {canAdjust && <TableHead className="text-right">Ação</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criticalItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.codigo}</TableCell>
                      <TableCell className="font-medium">{item.material}</TableCell>
                      <TableCell className="text-right font-bold">{item.quantidade}</TableCell>
                      <TableCell className="text-right">{item.minimo}</TableCell>
                      <TableCell className="text-right">{item.maximo}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'Zerado' ? 'destructive' : 'secondary'}>
                          {item.status === 'Zerado' ? 'Crítico' : 'Alerta'}
                        </Badge>
                      </TableCell>
                      {canAdjust && (
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => handleAdjust(item)} className="gap-1">
                            <Wrench className="w-3.5 h-3.5" />
                            Ajustar
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <StockUpdateDialog
        item={selectedItem}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUpdate={handleUpdate}
      />
    </MainLayout>
  );
};

export default ItensCriticos;
