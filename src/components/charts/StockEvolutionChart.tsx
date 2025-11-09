import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { InventoryItem } from "@/hooks/useInventoryData";
import { useMemo } from "react";

interface StockEvolutionChartProps {
  items: InventoryItem[];
}

export const StockEvolutionChart = ({ items }: StockEvolutionChartProps) => {
  // Gerar dados simulados dos últimos 6 meses baseado no valor atual
  const chartData = useMemo(() => {
    const totalValue = items.reduce((sum, item) => sum + item.valorTotal, 0);
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    
    return months.map((month, index) => {
      // Simular variação de -10% a +10% do valor total
      const variation = (Math.random() - 0.5) * 0.2;
      const value = totalValue * (1 + variation - (0.05 * (5 - index)));
      
      return {
        month,
        valor: Math.max(0, value),
      };
    });
  }, [items]);

  const chartConfig = {
    valor: {
      label: "Valor Total (R$)",
      color: "hsl(var(--primary))",
    },
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-3 rounded-lg shadow-lg">
          <p className="font-medium text-sm mb-1">{payload[0].payload.month}</p>
          <p className="text-primary font-bold">
            R$ {payload[0].value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Evolução do Valor Total em Estoque</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="valor" 
                stroke="hsl(142 76% 36%)" 
                strokeWidth={2}
                dot={{ fill: "hsl(142 76% 36%)", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
