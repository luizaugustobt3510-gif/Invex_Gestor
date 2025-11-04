import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from "recharts";
import { InventoryItem } from "@/hooks/useInventoryData";

interface StatusDistributionChartProps {
  items: InventoryItem[];
}

export const StatusDistributionChart = ({ items }: StatusDistributionChartProps) => {
  const statusData = items.reduce((acc, item) => {
    let statusKey = 'Outros';
    if (item.status.includes('OK')) {
      statusKey = 'OK ✅';
    } else if (item.status.includes('Zerado')) {
      statusKey = 'Zerado ⚠️';
    } else if (item.status.includes('Abaixo do mínimo')) {
      statusKey = 'Abaixo do mínimo ⚠️';
    }
    acc[statusKey] = (acc[statusKey] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(statusData).map(([name, value]) => ({
    name,
    value,
    fill: name.includes('OK') ? 'hsl(var(--success))' : 
          name.includes('Zerado') ? 'hsl(var(--danger))' : 
          name.includes('Abaixo do mínimo') ? 'hsl(var(--warning))' :
          'hsl(var(--muted))'
  }));

  const chartConfig = {
    value: {
      label: "Produtos",
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição por Status</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
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
