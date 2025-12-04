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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
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
];

export function Sidebar() {
  const { isAdmin } = useAuth();

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <aside className="fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r border-border bg-card">
      <nav className="flex h-full flex-col gap-2 p-4">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.title}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
