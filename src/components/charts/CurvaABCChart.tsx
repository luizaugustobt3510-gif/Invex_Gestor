import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from "recharts";
import { InventoryItem } from "@/hooks/useInventoryData";

interface CurvaABCChartProps {
  items: InventoryItem[];
}

export const CurvaABCChart = ({ items }: CurvaABCChartProps) => {
  const curvaData = items.reduce((acc, item) => {
    const curva = item.curva || 'Sem classificação';
    acc[curva] = (acc[curva] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(curvaData).map(([name, value]) => ({
    name: `Curva ${name}`,
    value,
    fill: name === 'A' ? 'hsl(142 76% 36%)' : 
          name === 'B' ? 'hsl(45 97% 70%)' : 
          name === 'C' ? 'hsl(0 72% 51%)' :
          'hsl(var(--muted))'
  }));

  const chartConfig = {
    value: {
      label: "Produtos",
    },
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Curva ABC</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
