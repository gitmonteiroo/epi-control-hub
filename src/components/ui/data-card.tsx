import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface DataCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  onClick?: () => void;
  statusColor?: "success" | "warning" | "danger" | "muted" | "primary";
}

const DataCard = React.forwardRef<HTMLDivElement, DataCardProps>(
  ({ className, children, onClick, statusColor, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          "relative overflow-hidden transition-all touch-manipulation",
          onClick && "cursor-pointer active:scale-[0.98] hover:shadow-md",
          className
        )}
        onClick={onClick}
        {...props}
      >
        {statusColor && (
          <div
            className={cn(
              "absolute left-0 top-0 h-full w-1",
              statusColor === "success" && "bg-success",
              statusColor === "warning" && "bg-warning",
              statusColor === "danger" && "bg-danger",
              statusColor === "muted" && "bg-muted-foreground",
              statusColor === "primary" && "bg-primary"
            )}
          />
        )}
        {children}
      </Card>
    );
  }
);
DataCard.displayName = "DataCard";

interface DataCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const DataCardHeader = React.forwardRef<HTMLDivElement, DataCardHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-start justify-between gap-3 p-4 pb-2", className)}
      {...props}
    >
      {children}
    </div>
  )
);
DataCardHeader.displayName = "DataCardHeader";

interface DataCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const DataCardContent = React.forwardRef<HTMLDivElement, DataCardContentProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("px-4 pb-4 pt-2", className)}
      {...props}
    >
      {children}
    </div>
  )
);
DataCardContent.displayName = "DataCardContent";

interface DataCardRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}

const DataCardRow = React.forwardRef<HTMLDivElement, DataCardRowProps>(
  ({ className, label, value, icon, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-2 py-1.5 text-sm",
        className
      )}
      {...props}
    >
      {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  )
);
DataCardRow.displayName = "DataCardRow";

interface DataCardActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const DataCardActions = React.forwardRef<HTMLDivElement, DataCardActionsProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-2 border-t border-border px-4 py-3 bg-muted/30",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
DataCardActions.displayName = "DataCardActions";

export { DataCard, DataCardHeader, DataCardContent, DataCardRow, DataCardActions };
