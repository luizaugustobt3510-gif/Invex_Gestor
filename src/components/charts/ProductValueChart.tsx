import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { InventoryItem } from "@/hooks/useInventoryData";

interface ProductValueChartProps {
  items: InventoryItem[];
}

export const ProductValueChart = ({ items }: ProductValueChartProps) => {
  const sortedItems = [...items]
    .sort((a, b) => b.valorTotal - a.valorTotal)
    .slice(0, 10); // Top 10 produtos

  const chartData = sortedItems.map(item => ({
    material: item.material,
    materialShort: item.material.length > 30 ? item.material.substring(0, 30) + '...' : item.material,
    valorTotal: item.valorTotal,
  }));

  const chartConfig = {
    valorTotal: {
      label: "Valor Total (R$)",
      color: "hsl(var(--primary))",
    },
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-3 rounded-lg shadow-lg">
          <p className="font-medium text-sm mb-1">{payload[0].payload.material}</p>
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
        <CardTitle>Top 10 Itens por Valor Total</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 120, right: 20, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis 
                dataKey="materialShort" 
                type="category" 
                width={150}
                tick={{ fontSize: 11 }}
              />
              <ChartTooltip content={<CustomTooltip />} />
              <Bar dataKey="valorTotal" fill="hsl(142 76% 36%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
