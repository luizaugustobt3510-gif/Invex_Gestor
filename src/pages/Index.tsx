import { Package, TrendingDown, AlertTriangle, DollarSign, Boxes, RefreshCw, TrendingUp, BarChart3 } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { InventoryTable } from "@/components/InventoryTable";
import { useInventoryData } from "@/hooks/useInventoryData";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CurvaABCChart } from "@/components/charts/CurvaABCChart";
import { ProductValueChart } from "@/components/charts/ProductValueChart";
import { StatusDistributionChart } from "@/components/charts/StatusDistributionChart";

const Index = () => {
  const { data: inventoryData, loading, error, refetch } = useInventoryData();

  const totalItems = inventoryData.length;
  const totalStockValue = inventoryData.reduce((acc, item) => acc + item.valorTotal, 0);
  const zeradosCount = inventoryData.filter(item => item.status.includes("Zerado")).length;
  const abaixoMinimoCount = inventoryData.filter(item => item.status.includes("Abaixo do mínimo")).length;
  const okCount = inventoryData.filter(item => item.status.includes("OK")).length;
  const eficienciaEstoque = totalItems > 0 ? (okCount / totalItems) * 100 : 0;
  const valorMedioPorProduto = totalItems > 0 ? totalStockValue / totalItems : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Boxes className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Controle de Estoque</h1>
              <p className="text-muted-foreground">Visualização em tempo real via Google Sheets</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
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
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatsCard
                title="Valor Total em Estoque"
                value={`R$ ${totalStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                icon={DollarSign}
                variant="success"
              />
              <StatsCard
                title="Eficiência do Estoque"
                value={`${eficienciaEstoque.toFixed(1)}%`}
                icon={TrendingUp}
                variant={eficienciaEstoque >= 80 ? "success" : eficienciaEstoque < 50 ? "danger" : "warning"}
              />
              <StatsCard
                title="Valor Médio por Produto"
                value={`R$ ${valorMedioPorProduto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                icon={BarChart3}
                variant="default"
              />
              <StatsCard
                title="Total de Itens"
                value={totalItems}
                icon={Package}
                variant="default"
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <StatusDistributionChart items={inventoryData} />
              <CurvaABCChart items={inventoryData} />
              <ProductValueChart items={inventoryData} />
            </div>

            {/* Inventory Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">Tabela Detalhada</h2>
                <Button onClick={refetch} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar
                </Button>
              </div>
              <InventoryTable items={inventoryData} />
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
