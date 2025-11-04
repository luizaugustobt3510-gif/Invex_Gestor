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
    material: item.material.length > 20 ? item.material.substring(0, 20) + '...' : item.material,
    valorTotal: item.valorTotal,
  }));

  const chartConfig = {
    valorTotal: {
      label: "Valor Total (R$)",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Top 10 Produtos por Valor</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="material" type="category" width={80} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="valorTotal" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
