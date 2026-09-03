import { useMemo } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { MainLayout } from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInventoryData } from "@/hooks/useInventoryData";
import { getValidadeInfo } from "@/lib/validade";
import { StatusDistributionChart } from "@/components/charts/StatusDistributionChart";
import { CurvaABCChart } from "@/components/charts/CurvaABCChart";
import { ProductValueChart } from "@/components/charts/ProductValueChart";
import { StockEvolutionChart } from "@/components/charts/StockEvolutionChart";
import { MovementsChart } from "@/components/charts/MovementsChart";

const IndicadoresLogistica = () => {
  const { data: inventoryData, loading, error, refetch } = useInventoryData();

  // Gráfico: valor total em estoque por grupo
  const groupValueChart = useMemo(() => {
    const map = new Map<string, { nome: string; itens: number; valor: number }>();
    inventoryData.forEach(i => {
      const nome = i.groupName || 'Sem grupo';
      const g = map.get(nome) || { nome, itens: 0, valor: 0 };
      g.itens++;
      g.valor += i.valorTotal;
      map.set(nome, g);
    });
    return [...map.values()].sort((a, b) => b.valor - a.valor).slice(0, 8);
  }, [inventoryData]);

  // Gráfico: vencimentos (quantidade e valor por status de validade)
  const validadeChart = useMemo(() => {
    const base = [
      { status: 'vencido', label: 'Vencidos', cor: 'hsl(0 84% 60%)', itens: 0, valor: 0 },
      { status: 'critico', label: 'Vencem em 30d', cor: 'hsl(25 95% 53%)', itens: 0, valor: 0 },
      { status: 'atencao', label: 'Vencem em 90d', cor: 'hsl(45 93% 47%)', itens: 0, valor: 0 },
      { status: 'ok', label: 'OK (>90d)', cor: 'hsl(142 76% 36%)', itens: 0, valor: 0 },
      { status: 'sem_validade', label: 'Sem validade', cor: 'hsl(220 9% 46%)', itens: 0, valor: 0 },
    ];
    inventoryData.forEach(i => {
      const st = getValidadeInfo(i.validade).status;
      const bucket = base.find(b => b.status === st)!;
      bucket.itens++;
      bucket.valor += i.valorTotal;
    });
    return base;
  }, [inventoryData]);

  return (
    <MainLayout>
      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80 rounded-xl" />)}
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Erro ao carregar dados: {error}</p>
          <Button onClick={refetch} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" /> Tentar Novamente
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" /> Indicadores da Logística
            </h1>
            <Button onClick={refetch} variant="outline" size="icon">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Valor em estoque por grupo + Vencimentos (movidos do Dashboard) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <h2 className="text-sm font-bold text-foreground mb-1">Valor em estoque por grupo</h2>
                <p className="text-xs text-muted-foreground mb-3">Soma do valor total dos itens de cada grupo</p>
                {groupValueChart.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Sem dados para exibir.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={groupValueChart} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={(v: number) => `R$ ${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                      <YAxis dataKey="nome" type="category" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value: number, name: string) =>
                          name === 'valor'
                            ? [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor total']
                            : [value, name]
                        }
                        labelFormatter={(label: string) => `Grupo: ${label}`}
                      />
                      <Bar dataKey="valor" fill="hsl(142 76% 36%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
                <div className="mt-3 space-y-1">
                  {groupValueChart.map(g => (
                    <div key={g.nome} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate">{g.nome} · {g.itens} item(ns)</span>
                      <span className="font-medium text-foreground">R$ {g.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h2 className="text-sm font-bold text-foreground mb-1">Vencimentos</h2>
                <p className="text-xs text-muted-foreground mb-3">Itens e valores por situação de validade</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={validadeChart} margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: number, name: string, props: any) =>
                        name === 'itens'
                          ? [`${value} item(ns) · R$ ${Number(props?.payload?.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Itens / Valor']
                          : [value, name]
                      }
                    />
                    <Bar dataKey="itens" radius={[4, 4, 0, 0]}>
                      {validadeChart.map(v => (
                        <Cell key={v.status} fill={v.cor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 grid grid-cols-2 gap-1">
                  {validadeChart.map(v => (
                    <div key={v.status} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: v.cor }} />
                        {v.label}
                      </span>
                      <span className="font-medium text-foreground">
                        {v.itens} · R$ {v.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Demais gráficos do setor */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <StatusDistributionChart items={inventoryData} />
            <CurvaABCChart items={inventoryData} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ProductValueChart items={inventoryData} />
            <StockEvolutionChart items={inventoryData} />
          </div>

          <MovementsChart />
        </div>
      )}
    </MainLayout>
  );
};

export default IndicadoresLogistica;
