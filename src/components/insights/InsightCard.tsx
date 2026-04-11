import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { bg, text, Icon } = typeConfig[insight.type];
  const isClickable = !!insight.action;

  const handleClick = () => {
    if (insight.action) {
      navigate(insight.action);
    }
  };

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border ${bg} ${isClickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={handleClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter') handleClick(); } : undefined}
    >
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${text}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{insight.message}</p>
        {insight.suggestion && (
          <p className="text-xs text-muted-foreground mt-1">💡 {insight.suggestion}</p>
        )}
      </div>
      {isClickable && (
        <span className="text-xs text-muted-foreground shrink-0 mt-0.5">→</span>
      )}
    </div>
  );
};
