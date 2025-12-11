import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils/cn";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  valueClassName?: string;
  trend?: {
    value: number;
    isPositive?: boolean;
  };
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  iconClassName,
  valueClassName,
  trend,
}: StatsCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && (
          <div className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center bg-primary/10",
            iconClassName?.includes("text-warning") && "bg-warning-muted",
            iconClassName?.includes("text-danger") && "bg-danger-muted",
            iconClassName?.includes("text-success") && "bg-success-muted",
            iconClassName?.includes("text-primary") && "bg-primary/10",
          )}>
            <Icon className={cn("h-5 w-5 text-primary", iconClassName)} />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className={cn("text-3xl font-bold tracking-tight", valueClassName)}>{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs mt-2",
            trend.isPositive ? "text-success" : "text-danger"
          )}>
            <span>{trend.isPositive ? "↑" : "↓"}</span>
            <span>{Math.abs(trend.value)}% vs. ontem</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}