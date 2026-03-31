import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type { Insight } from './types';

const typeConfig = {
  success: {
    bg: 'bg-emerald-500/5 border-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    Icon: CheckCircle,
  },
  warning: {
    bg: 'bg-amber-500/5 border-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    Icon: AlertTriangle,
  },
  danger: {
    bg: 'bg-destructive/5 border-destructive/20',
    text: 'text-destructive',
    Icon: XCircle,
  },
};

export const InsightCard = ({ insight }: { insight: Insight }) => {
  const { bg, text, Icon } = typeConfig[insight.type];

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${bg}`}>
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${text}`} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{insight.message}</p>
        {insight.suggestion && (
          <p className="text-xs text-muted-foreground mt-1">💡 {insight.suggestion}</p>
        )}
      </div>
    </div>
  );
};
