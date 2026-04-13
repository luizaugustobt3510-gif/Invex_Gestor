import { useState, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useInventoryData, InventoryItem } from '@/hooks/useInventoryData';
import { useAuth } from '@/contexts/AuthContext';
import { StockUpdateDialog } from '@/components/StockUpdateDialog';
import { AlertTriangle, RefreshCw, Wrench, ShoppingCart, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ABCResult {
  material: string;
  classe: 'A' | 'B' | 'C';
  compraSugerida: number;
  consumoMensal: number;
  estoqueIdeal: number;
}

const classeBadge = (classe: string) => {
  const map: Record<string, string> = {
    A: 'bg-red-100 text-red-800 border-red-300',
    B: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    C: 'bg-green-100 text-green-800 border-green-300',
  };
  return map[classe] || '';
};

const ItensCriticos = () => {
  const { data: inventoryData, loading, refetch, updateStock } = useInventoryData();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const canAdjust = hasPermission(['superadm', 'admin']);

  // Load ABC results from localStorage
  const [abcResults, setAbcResults] = useState<ABCResult[]>([]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('invex_curva_abc_results');
      if (saved) setAbcResults(JSON.parse(saved));
    } catch { /* silent */ }
  }, []);

  const abcMap = useMemo(() => {
    const map = new Map<string, ABCResult>();
    abcResults.forEach(r => map.set(r.material.toUpperCase().trim(), r));
    return map;
  }, [abcResults]);

  // Items críticos: zerados ou abaixo do mínimo
  const criticalItems = useMemo(() => {
    return inventoryData.filter(
      item => item.status === 'Zerado' || item.status === 'Abaixo do Mínimo'
    );
  }, [inventoryData]);

  // Items com compra sugerida pela curva ABC (que não são necessariamente críticos no estoque)
  const abcReplenishItems = useMemo(() => {
    if (abcResults.length === 0) return [];
    return inventoryData.filter(item => {
      const abc = abcMap.get(item.material.toUpperCase().trim());
      if (!abc || abc.compraSugerida <= 0) return false;
      // Excluir os que já estão nos críticos para não duplicar
      return item.status !== 'Zerado' && item.status !== 'Abaixo do Mínimo';
    });
  }, [inventoryData, abcMap, abcResults]);

  // Summary
  const zerados = criticalItems.filter(i => i.status === 'Zerado').length;
  const abaixo = criticalItems.filter(i => i.status === 'Abaixo do Mínimo').length;
  const totalCompraSugerida = useMemo(() => {
    let total = 0;
    criticalItems.forEach(item => {
      const abc = abcMap.get(item.material.toUpperCase().trim());
      if (abc) total += abc.compraSugerida;
    });
    abcReplenishItems.forEach(item => {
      const abc = abcMap.get(item.material.toUpperCase().trim());
      if (abc) total += abc.compraSugerida;
    });
    return total;
  }, [criticalItems, abcReplenishItems, abcMap]);

  const handleAdjust = (item: InventoryItem) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handleUpdate = async (codigo: string, quantidade: number) => {
    await updateStock(codigo, quantidade);
    await refetch();
  };

  const renderRow = (item: InventoryItem, isCritical: boolean) => {
    const abc = abcMap.get(item.material.toUpperCase().trim());
    return (
      <TableRow key={item.id}>
        <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
        <TableCell className="font-medium max-w-[200px] truncate" title={item.material}>{item.material}</TableCell>
        <TableCell className="text-right font-bold">{item.quantidade}</TableCell>
        <TableCell className="text-right">{item.minimo}</TableCell>
        <TableCell>
          {isCritical ? (
            <Badge variant={item.status === 'Zerado' ? 'destructive' : 'secondary'}>
              {item.status === 'Zerado' ? 'Crítico' : 'Alerta'}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-primary border-primary/40">Reposição ABC</Badge>
          )}
        </TableCell>
        <TableCell className="text-center">
          {abc ? <Badge className={classeBadge(abc.classe)}>{abc.classe}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
        </TableCell>
        <TableCell className="text-right">
          {abc ? <span className="text-xs">{abc.consumoMensal.toLocaleString('pt-BR')}</span> : <span className="text-muted-foreground text-xs">—</span>}
        </TableCell>
        <TableCell className="text-right">
          {abc && abc.compraSugerida > 0 ? (
            <span className="font-semibold text-destructive">{abc.compraSugerida.toLocaleString('pt-BR')}</span>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
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
    );
  };

  const allItems = [...criticalItems, ...abcReplenishItems];

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-destructive/30">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Zerados</p>
              <p className="text-2xl font-bold text-destructive">{zerados}</p>
            </CardContent>
          </Card>
          <Card className="border-warning/30">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Abaixo do Mínimo</p>
              <p className="text-2xl font-bold text-warning">{abaixo}</p>
            </CardContent>
          </Card>
          <Card className="border-primary/30">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Reposição ABC</p>
              <p className="text-2xl font-bold text-primary">{abcReplenishItems.length}</p>
            </CardContent>
          </Card>
          <Card className="border-primary/30">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Total Compra Sugerida</p>
              <p className="text-2xl font-bold text-primary">{totalCompraSugerida.toLocaleString('pt-BR')}</p>
            </CardContent>
          </Card>
        </div>

        {/* ABC not configured warning */}
        {abcResults.length === 0 && (
          <Card className="border-warning/40 bg-warning/5 cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/curva-abc')}>
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-warning" />
              <div>
                <p className="text-sm font-medium text-foreground">Curva ABC não configurada</p>
                <p className="text-xs text-muted-foreground">Importe dados de consumo na Curva ABC Inteligente para ver sugestões de compra automáticas aqui.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Itens Críticos e Reposição ({allItems.length})
            </CardTitle>
            <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : allItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Nenhum item crítico ou com necessidade de reposição no momento. 🎉</p>
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
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Curva</TableHead>
                      <TableHead className="text-right">Consumo/Mês</TableHead>
                      <TableHead className="text-right">Compra Sugerida</TableHead>
                      {canAdjust && <TableHead className="text-right">Ação</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {criticalItems.map(item => renderRow(item, true))}
                    {abcReplenishItems.length > 0 && criticalItems.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={canAdjust ? 9 : 8} className="bg-muted/50 text-center text-xs font-medium text-muted-foreground py-2">
                          <ShoppingCart className="w-3.5 h-3.5 inline mr-1" /> Itens com reposição sugerida pela Curva ABC
                        </TableCell>
                      </TableRow>
                    )}
                    {abcReplenishItems.map(item => renderRow(item, false))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
