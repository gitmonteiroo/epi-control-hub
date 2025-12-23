import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Users,
  FolderTree,
  ClipboardList,
  FileText,
  ArrowLeftRight,
  UserCheck,
  Settings,
  ShieldCheck,
  ScrollText,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Produtos",
    href: "/products",
    icon: Package,
  },
  {
    title: "Categorias",
    href: "/categories",
    icon: FolderTree,
    adminOnly: true,
  },
  {
    title: "Funcionários",
    href: "/employees",
    icon: Users,
    adminOnly: true,
  },
  {
    title: "Usuários",
    href: "/users",
    icon: ShieldCheck,
    superAdminOnly: true,
  },
  {
    title: "Retiradas",
    href: "/withdrawals",
    icon: ClipboardList,
  },
  {
    title: "Movimentações",
    href: "/movements",
    icon: ArrowLeftRight,
  },
  {
    title: "Relatórios",
    href: "/reports",
    icon: FileText,
  },
  {
    title: "EPIs por Funcionário",
    href: "/reports/employee-epi",
    icon: UserCheck,
  },
  {
    title: "Auditoria",
    href: "/audit",
    icon: ScrollText,
    superAdminOnly: true,
  },
  {
    title: "Configurações",
    href: "/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { isAdmin, canManage } = useAuth();

  const filteredNavItems = navItems.filter((item) => {
    if (item.superAdminOnly) return isAdmin;
    if (item.adminOnly) return canManage;
    return true;
  });

  const handleNavClick = () => {
    // Close sidebar on mobile after navigation
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-72 border-r border-border bg-card transition-transform duration-300 ease-in-out lg:top-16 lg:z-40 lg:h-[calc(100vh-4rem)] lg:w-64 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">EPI</span>
            </div>
            <span className="font-semibold text-foreground">Menu</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10">
            <X className="h-5 w-5" />
            <span className="sr-only">Fechar menu</span>
          </Button>
        </div>

        <ScrollArea className="h-[calc(100%-4rem)] lg:h-full">
          <nav className="flex flex-col gap-1 p-4">
            {filteredNavItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors touch-manipulation",
                    "min-h-[48px]", // Minimum touch target size
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent"
                  )
                }
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.title}</span>
              </NavLink>
            ))}
          </nav>
        </ScrollArea>
      </aside>
    </>
  );
}
