import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  variant?: "default" | "success" | "warning" | "danger";
}

export const StatsCard = ({ title, value, icon: Icon, trend, variant = "default" }: StatsCardProps) => {
  const variantClasses = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
  };

  return (
    <Card className="h-full transition-all duration-300 hover:shadow-lg border-border/50">
      <CardContent className="p-4 sm:p-6 h-full">
        <div className="flex items-start justify-between gap-3 h-full">
          <div className="space-y-2 min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground break-words leading-tight">{value}</p>
            {trend && (
              <p className={`text-xs font-medium ${trend.positive ? "text-success" : "text-danger"}`}>
                {trend.positive ? "↑" : "↓"} {trend.value}
              </p>
            )}
          </div>
          <div className={`shrink-0 p-2 sm:p-3 rounded-xl ${variantClasses[variant]}`}>
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
