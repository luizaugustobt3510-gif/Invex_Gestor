import { Package, TrendingDown, TrendingUp, Boxes } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { InventoryTable } from "@/components/InventoryTable";

const Index = () => {
  // Mock data - em produção, virá do Google Sheets
  const inventoryData = [
    { id: "1", name: "Parafuso M6", category: "Fixação", current: 45, minimum: 50, maximum: 200, unit: "un" },
    { id: "2", name: "Porca Sextavada", category: "Fixação", current: 120, minimum: 100, maximum: 500, unit: "un" },
    { id: "3", name: "Arruela Lisa", category: "Fixação", current: 25, minimum: 80, maximum: 400, unit: "un" },
    { id: "4", name: "Cabo USB-C", category: "Eletrônicos", current: 8, minimum: 15, maximum: 50, unit: "un" },
    { id: "5", name: "Resistor 10kΩ", category: "Eletrônicos", current: 350, minimum: 200, maximum: 1000, unit: "un" },
    { id: "6", name: "LED 5mm Vermelho", category: "Eletrônicos", current: 180, minimum: 100, maximum: 500, unit: "un" },
    { id: "7", name: "Tinta Spray Preta", category: "Acabamento", current: 12, minimum: 20, maximum: 80, unit: "un" },
    { id: "8", name: "Lixa Grão 120", category: "Acabamento", current: 45, minimum: 30, maximum: 100, unit: "un" },
  ];

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
      </main>
    </div>
  );
};

export default Index;
