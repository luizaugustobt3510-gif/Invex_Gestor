import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { useMemo } from "react";

export const MovementsChart = () => {
  // Gerar dados simulados de entradas e saídas por mês
  const chartData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    
    return months.map((month) => ({
      month,
      entradas: Math.floor(Math.random() * 50) + 30,
      saidas: Math.floor(Math.random() * 40) + 20,
    }));
  }, []);

  const chartConfig = {
    entradas: {
      label: "Entradas",
      color: "hsl(142 76% 36%)",
    },
    saidas: {
      label: "Saídas",
      color: "hsl(0 72% 51%)",
    },
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-3 rounded-lg shadow-lg">
          <p className="font-medium text-sm mb-2">{payload[0].payload.month}</p>
          <p className="text-sm" style={{ color: chartConfig.entradas.color }}>
            Entradas: {payload[0].value}
          </p>
          <p className="text-sm" style={{ color: chartConfig.saidas.color }}>
            Saídas: {payload[1].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Movimentações (Entradas x Saídas)</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="entradas" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saidas" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
