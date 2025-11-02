import { Package, TrendingDown, TrendingUp, Boxes, RefreshCw } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { InventoryTable } from "@/components/InventoryTable";
import { useInventoryData } from "@/hooks/useInventoryData";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const { data: inventoryData, loading, error, refetch } = useInventoryData();

  const totalItems = inventoryData.length;
  const criticalItems = inventoryData.filter(item => item.current <= item.minimum).length;
  const totalValue = inventoryData.reduce((acc, item) => acc + item.current, 0);
  const stockPercentage = ((totalValue / inventoryData.reduce((acc, item) => acc + item.maximum, 0)) * 100).toFixed(1);

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
                title="Total de Itens"
                value={totalItems}
                icon={Package}
                trend={{ value: "12% vs mês anterior", positive: true }}
                variant="default"
              />
              <StatsCard
                title="Itens Críticos"
                value={criticalItems}
                icon={TrendingDown}
                variant="danger"
              />
              <StatsCard
                title="Capacidade do Estoque"
                value={`${stockPercentage}%`}
                icon={TrendingUp}
                trend={{ value: "5% vs semana anterior", positive: false }}
                variant="warning"
              />
              <StatsCard
                title="Unidades Totais"
                value={totalValue.toLocaleString()}
                icon={Boxes}
                trend={{ value: "8% vs mês anterior", positive: true }}
                variant="success"
              />
            </div>

            {/* Inventory Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">Itens do Estoque</h2>
                <div className="flex gap-2">
                  <Button onClick={refetch} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Atualizar
                  </Button>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-success-light">
                    <div className="w-2 h-2 rounded-full bg-success"></div>
                    <span className="text-sm font-medium">Normal</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-warning-light">
                    <div className="w-2 h-2 rounded-full bg-warning"></div>
                    <span className="text-sm font-medium">Atenção</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-danger-light">
                    <div className="w-2 h-2 rounded-full bg-danger"></div>
                    <span className="text-sm font-medium">Crítico</span>
                  </div>
                </div>
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
