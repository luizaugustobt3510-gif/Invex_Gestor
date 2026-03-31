import { Lightbulb, Package, DollarSign, ShoppingCart, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Insight } from './types';
import { InsightCard } from './InsightCard';
import { MODULE_LABELS } from './types';

const moduleIcons: Record<string, React.ReactNode> = {
  logistica: <Package className="w-4 h-4" />,
  financeiro: <DollarSign className="w-4 h-4" />,
  vendas: <ShoppingCart className="w-4 h-4" />,
  rh: <Users className="w-4 h-4" />,
};

interface InsightsPanelProps {
  insights: Insight[];
  title?: string;
  groupByModule?: boolean;
  maxItems?: number;
}

const priorityOrder = { danger: 0, warning: 1, success: 2 };

export const InsightsPanel = ({
  insights,
  title = 'Insights Inteligentes',
  groupByModule = false,
  maxItems = 12,
}: InsightsPanelProps) => {
  if (insights.length === 0) return null;

  const sorted = [...insights].sort((a, b) => priorityOrder[a.type] - priorityOrder[b.type]);
  const limited = sorted.slice(0, maxItems);

  if (groupByModule) {
    const groups: Record<string, Insight[]> = {};
    limited.forEach(i => {
      if (!groups[i.module]) groups[i.module] = [];
      groups[i.module].push(i);
    });

    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 font-medium mb-4 text-primary">
            <Lightbulb className="w-5 h-5" /> {title}
          </div>
          <div className="space-y-4">
            {Object.entries(groups).map(([mod, items]) => (
              <div key={mod}>
                <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-foreground">
                  {moduleIcons[mod]} {MODULE_LABELS[mod] || mod}
                </div>
                <div className="grid gap-2">
                  {items.map((insight, i) => (
                    <InsightCard key={i} insight={insight} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 font-medium mb-3 text-primary">
          <Lightbulb className="w-5 h-5" /> {title}
        </div>
        <div className="grid gap-2">
          {limited.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
