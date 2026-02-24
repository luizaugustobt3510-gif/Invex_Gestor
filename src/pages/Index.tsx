import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Package, TrendingDown, AlertTriangle, DollarSign, RefreshCw, BarChart3, Search, TrendingUp, ScanLine } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { InventoryTable } from "@/components/InventoryTable";
import { useInventoryData, InventoryItem } from "@/hooks/useInventoryData";
import { MainLayout } from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { CurvaABCChart } from "@/components/charts/CurvaABCChart";
import { ProductValueChart } from "@/components/charts/ProductValueChart";
import { StatusDistributionChart } from "@/components/charts/StatusDistributionChart";
import { StockUpdateDialog } from "@/components/StockUpdateDialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const { data: inventoryData, summary, loading, error, refetch, updateStock } = useInventoryData();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [curvaFilter, setCurvaFilter] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  const filteredData = useMemo(() => {
    let filtered = inventoryData;

    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.material.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.codigo.toString().includes(searchQuery)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(item => item.status.includes(statusFilter));
    }

    if (curvaFilter) {
      filtered = filtered.filter(item => item.curva === curvaFilter);
    }

    return filtered;
  }, [inventoryData, searchQuery, statusFilter, curvaFilter]);

  const handleStatusCardClick = (status: string) => {
    setStatusFilter(statusFilter === status ? null : status);
    setCurvaFilter(null);
  };

  const handleCurvaFilterClick = (curva: string) => {
    setCurvaFilter(curvaFilter === curva ? null : curva);
    setStatusFilter(null);
  };

  const handleUpdateStock = async (codigo: string, quantidade: number) => {
    await updateStock(codigo, quantidade);
  };

  const handleEditClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setUpdateDialogOpen(true);
  };

  const handleExportReport = () => {
    try {
      const csvContent = [
        ['Código', 'Material', 'Quantidade', 'Valor Unitário', 'Valor Total', 'Status'],
        ...inventoryData.map(item => [
          item.codigo,
          item.material,
          item.quantidade,
          item.preco.toFixed(2),
          item.valorTotal.toFixed(2),
          item.status
        ])
      ].map(row => row.join(';')).join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
      const timeStr = now.toLocaleTimeString('pt-BR').replace(/:/g, '-');
      
      link.setAttribute('href', url);
      link.setAttribute('download', `Relatorio_Estoque_Invex_${dateStr}_${timeStr}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Relatório exportado com sucesso!",
        description: "O arquivo CSV foi baixado.",
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar relatório",
        description: "Ocorreu um erro ao gerar o arquivo.",
        variant: "destructive",
      });
    }
  };

  return (
    <MainLayout onExportReport={handleExportReport} showExport={true} showQRCode={true}>
      {loading ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-lg" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Erro ao carregar dados: {error}</p>
          <Button onClick={refetch} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
      ) : (
        <>
          {/* Quick Action - QR Scanner */}
          <div className="mb-4 md:mb-6">
            <Button
              onClick={() => navigate('/qr-scanner')}
              size="lg"
              className="gap-3 text-sm md:text-base font-semibold shadow-md w-full sm:w-auto"
            >
              <ScanLine className="w-5 h-5" />
              Escanear QR Code
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="cursor-pointer" onClick={() => handleStatusCardClick("OK")}>
              <StatsCard
                title="Produtos OK"
                value={summary.total_ok}
                icon={Package}
                variant="success"
              />
            </div>
            <div className="cursor-pointer" onClick={() => handleStatusCardClick("Abaixo")}>
              <StatsCard
                title="Abaixo do Mínimo"
                value={summary.total_abaixo}
                icon={AlertTriangle}
                variant="warning"
              />
            </div>
            <div className="cursor-pointer" onClick={() => handleStatusCardClick("Zerado")}>
              <StatsCard
                title="Zerados"
                value={summary.total_zerado}
                icon={TrendingDown}
                variant="danger"
              />
            </div>
            <StatsCard
              title="Valor Total"
              value={`R$ ${summary.total_estoque_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={DollarSign}
              variant="success"
            />
            <div className="col-span-2 md:col-span-1">
              <StatsCard
                title="Total de Itens"
                value={summary.total_itens}
                icon={BarChart3}
                variant="default"
              />
            </div>
          </div>

          {/* Curva ABC Cards */}
          <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="cursor-pointer" onClick={() => handleCurvaFilterClick("A")}>
              <StatsCard
                title="Curva A"
                value={summary.curvaA}
                icon={TrendingUp}
                variant="success"
              />
            </div>
            <div className="cursor-pointer" onClick={() => handleCurvaFilterClick("B")}>
              <StatsCard
                title="Curva B"
                value={summary.curvaB}
                icon={BarChart3}
                variant="warning"
              />
            </div>
            <div className="cursor-pointer" onClick={() => handleCurvaFilterClick("C")}>
              <StatsCard
                title="Curva C"
                value={summary.curvaC}
                icon={Package}
                variant="default"
              />
            </div>
          </div>

          {/* Active Filters */}
          {(statusFilter || curvaFilter) && (
            <div className="mb-6 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Filtros ativos:</span>
              {statusFilter && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setStatusFilter(null)}>
                  Status: {statusFilter} ✕
                </Badge>
              )}
              {curvaFilter && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setCurvaFilter(null)}>
                  Curva: {curvaFilter} ✕
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter(null);
                  setCurvaFilter(null);
                }}
              >
                Limpar Todos
              </Button>
            </div>
          )}

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
            <StatusDistributionChart items={inventoryData} />
            <CurvaABCChart items={inventoryData} />
          </div>

          <div className="mb-6 md:mb-8">
            <ProductValueChart items={inventoryData} />
          </div>

          {/* Inventory Table */}
          <div className="space-y-3 md:space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Tabela Detalhada</h2>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>
                <Button onClick={refetch} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <InventoryTable 
              items={filteredData} 
              onEdit={handleEditClick}
              showEditButton={true}
            />
          </div>

          <StockUpdateDialog
            item={selectedItem}
            open={updateDialogOpen}
            onOpenChange={setUpdateDialogOpen}
            onUpdate={handleUpdateStock}
          />
        </>
      )}
    </MainLayout>
  );
};

export default Index;
