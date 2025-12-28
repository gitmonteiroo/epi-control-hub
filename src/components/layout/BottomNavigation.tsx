import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  FileText,
  Menu,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Primary navigation items for bottom nav (max 5 for mobile)
const primaryNavItems: NavItem[] = [
  { title: "Início", href: "/", icon: LayoutDashboard },
  { title: "Produtos", href: "/products", icon: Package },
  { title: "Retiradas", href: "/withdrawals", icon: ClipboardList },
  { title: "Relatórios", href: "/reports", icon: FileText },
];

interface BottomNavigationProps {
  onMoreClick: () => void;
}

export function BottomNavigation({ onMoreClick }: BottomNavigationProps) {
  const { canManage } = useAuth();
  const location = useLocation();

  // Check if current route is one of the primary items
  const isPrimaryRoute = primaryNavItems.some(item => {
    if (item.href === "/") return location.pathname === "/";
    return location.pathname.startsWith(item.href);
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden safe-area-bottom">
      <div className="flex h-16 items-center justify-around px-2">
        {primaryNavItems.map((item) => {
          const isActive = item.href === "/" 
            ? location.pathname === "/" 
            : location.pathname.startsWith(item.href);

          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors touch-manipulation",
                "min-h-[56px] min-w-[64px]", // Minimum touch target
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground active:text-primary"
              )}
            >
              <item.icon className={cn(
                "h-6 w-6 transition-transform",
                isActive && "scale-110"
              )} />
              <span className="truncate max-w-[64px]">{item.title}</span>
              {isActive && (
                <span className="absolute bottom-1 h-1 w-8 rounded-full bg-primary" />
              )}
            </NavLink>
          );
        })}

        {/* More menu button */}
        <button
          onClick={onMoreClick}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors touch-manipulation",
            "min-h-[56px] min-w-[64px]",
            !isPrimaryRoute
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground active:text-primary"
          )}
        >
          <Menu className={cn(
            "h-6 w-6 transition-transform",
            !isPrimaryRoute && "scale-110"
          )} />
          <span>Mais</span>
          {!isPrimaryRoute && (
            <span className="absolute bottom-1 h-1 w-8 rounded-full bg-primary" />
          )}
        </button>
      </div>
    </nav>
  );
}
