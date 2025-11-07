import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Package, TrendingDown, AlertTriangle, DollarSign, Boxes, RefreshCw, BarChart3, Search, LayoutDashboard, TrendingUp } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { InventoryTable } from "@/components/InventoryTable";
import { useInventoryData, InventoryItem } from "@/hooks/useInventoryData";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { CurvaABCChart } from "@/components/charts/CurvaABCChart";
import { ProductValueChart } from "@/components/charts/ProductValueChart";
import { StatusDistributionChart } from "@/components/charts/StatusDistributionChart";
import { StockUpdateDialog } from "@/components/StockUpdateDialog";
import { Badge } from "@/components/ui/badge";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider } from "@/components/ui/sidebar";

const Index = () => {
  const { data: inventoryData, summary, loading, error, refetch, updateStock } = useInventoryData();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [curvaFilter, setCurvaFilter] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [isAdmin] = useState(true); // Simulando que todos são admin agora

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

  const content = (
    <div className="flex-1">
      {/* Header */}
      <header className="border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Boxes className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Invex</h1>
                <p className="text-muted-foreground">Sistema de Controle de Estoque</p>
              </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
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
                title="Valor Total em Estoque"
                value={`R$ ${summary.total_estoque_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                icon={DollarSign}
                variant="success"
              />
              <StatsCard
                title="Total de Itens"
                value={summary.total_itens}
                icon={BarChart3}
                variant="default"
              />
            </div>

            {/* Curva ABC Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <StatusDistributionChart items={inventoryData} />
              <CurvaABCChart items={inventoryData} />
              <ProductValueChart items={inventoryData} />
            </div>

            {/* Inventory Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-2xl font-bold text-foreground">Tabela Detalhada</h2>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou código..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button onClick={refetch} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Atualizar
                  </Button>
                </div>
              </div>
              <InventoryTable 
                items={filteredData} 
                onEdit={handleEditClick}
                showEditButton={isAdmin}
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
      </main>
    </div>
  );

  if (isAdmin) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <Sidebar className="border-r">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Menu Admin</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => navigate('/')}>
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Dashboard</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => navigate('/mass-update')}>
                        <Package className="w-4 h-4" />
                        <span>Atualizar Estoque</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => navigate('/stock-movement')}>
                        <TrendingUp className="w-4 h-4" />
                        <span>Movimentar Estoque</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          {content}
        </div>
      </SidebarProvider>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {content}
    </div>
  );
};

export default Index;
