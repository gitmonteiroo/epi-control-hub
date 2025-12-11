import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface StockIndicatorProps {
  available: number;
  minimum: number;
  unit?: string;
  showIcon?: boolean;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StockIndicator({
  available,
  minimum,
  unit = "un",
  showIcon = true,
  showLabel = true,
  size = "md",
  className,
}: StockIndicatorProps) {
  const isCritical = available === 0;
  const isLow = available <= minimum;
  const isWarning = available <= minimum * 1.5;

  const getStatus = () => {
    if (isCritical) return { label: "Crítico", color: "danger", Icon: XCircle };
    if (isLow) return { label: "Baixo", color: "warning", Icon: AlertTriangle };
    if (isWarning) return { label: "Atenção", color: "warning", Icon: AlertTriangle };
    return { label: "Normal", color: "success", Icon: CheckCircle };
  };

  const status = getStatus();
  const Icon = status.Icon;

  const sizeClasses = {
    sm: "text-xs px-2 py-1 gap-1",
    md: "text-sm px-3 py-1.5 gap-1.5",
    lg: "text-base px-4 py-2 gap-2",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const colorClasses = {
    danger: "bg-danger-muted text-danger border-danger/30",
    warning: "bg-warning-muted text-warning border-warning/30",
    success: "bg-success-muted text-success border-success/30",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        sizeClasses[size],
        colorClasses[status.color as keyof typeof colorClasses],
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {showLabel && <span>{status.label}</span>}
      <span className="font-semibold">
        {available} {unit}
      </span>
    </div>
  );
}

interface StockBarProps {
  available: number;
  minimum: number;
  maximum?: number;
  className?: string;
}

export function StockBar({ available, minimum, maximum, className }: StockBarProps) {
  const max = maximum || minimum * 3;
  const percentage = Math.min((available / max) * 100, 100);
  
  const isCritical = available === 0;
  const isLow = available <= minimum;

  const barColor = isCritical
    ? "bg-danger"
    : isLow
    ? "bg-warning"
    : "bg-success";

  return (
    <div className={cn("w-full", className)}>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
        <span>0</span>
        <span className="text-warning">Mín: {minimum}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}