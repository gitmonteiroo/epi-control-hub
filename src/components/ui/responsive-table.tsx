import * as React from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  renderMobileCard?: (item: T) => React.ReactNode;
  emptyState?: React.ReactNode;
  className?: string;
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  renderMobileCard,
  emptyState,
  className,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  // Mobile: Render as cards
  if (isMobile && renderMobileCard) {
    return (
      <div className={cn("space-y-3", className)}>
        {data.map((item) => (
          <div
            key={keyExtractor(item)}
            onClick={() => onRowClick?.(item)}
            className={cn(onRowClick && "cursor-pointer")}
          >
            {renderMobileCard(item)}
          </div>
        ))}
      </div>
    );
  }

  // Desktop: Render as table
  return (
    <div className={cn("relative w-full overflow-auto", className)}>
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b">
          <tr className="border-b transition-colors hover:bg-muted/50">
            {columns
              .filter((col) => !isMobile || !col.hideOnMobile)
              .map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    "h-12 px-4 text-left align-middle font-medium text-muted-foreground",
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              className={cn(
                "border-b transition-colors hover:bg-muted/50",
                onRowClick && "cursor-pointer"
              )}
            >
              {columns
                .filter((col) => !isMobile || !col.hideOnMobile)
                .map((column) => (
                  <td
                    key={String(column.key)}
                    className={cn("p-4 align-middle", column.className)}
                  >
                    {column.render
                      ? column.render(item)
                      : String(item[column.key as keyof T] ?? "-")}
                  </td>
                ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
