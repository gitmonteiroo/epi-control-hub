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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4 sm:px-6 sm:pt-6">
        <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">{title}</CardTitle>
        {Icon && (
          <div className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center bg-primary/10 sm:h-9 sm:w-9",
            iconClassName?.includes("text-warning") && "bg-warning-muted",
            iconClassName?.includes("text-danger") && "bg-danger-muted",
            iconClassName?.includes("text-success") && "bg-success-muted",
            iconClassName?.includes("text-primary") && "bg-primary/10",
          )}>
            <Icon className={cn("h-4 w-4 text-primary sm:h-5 sm:w-5", iconClassName)} />
          </div>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
        <div className={cn("text-2xl font-bold tracking-tight sm:text-3xl", valueClassName)}>{value}</div>
        {description && (
          <p className="text-[10px] text-muted-foreground mt-1 sm:text-xs">{description}</p>
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