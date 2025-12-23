import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { LogOut, User, Moon, Sun, Monitor, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { profile, signOut } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  const getThemeIcon = () => {
    if (theme === "system") {
      return <Monitor className="h-4 w-4" />;
    }
    return resolvedTheme === "dark" ? (
      <Moon className="h-4 w-4" />
    ) : (
      <Sun className="h-4 w-4" />
    );
  };

  const getThemeLabel = () => {
    if (theme === "system") return "Sistema";
    return theme === "dark" ? "Escuro" : "Claro";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-3 sm:h-16 sm:px-4 lg:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile menu button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onMenuClick}
            className="h-10 w-10 shrink-0 lg:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menu</span>
          </Button>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden h-9 w-9 items-center justify-center rounded-lg bg-primary sm:flex sm:h-10 sm:w-10">
              <span className="text-base font-bold text-primary-foreground sm:text-lg">EPI</span>
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-foreground sm:text-base lg:text-lg">
                <span className="sm:hidden">Controle EPIs</span>
                <span className="hidden sm:inline">Sistema de Controle de EPIs</span>
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Gestão de Estoque e Almoxarifado
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={cycleTheme}
                className="h-9 w-9 sm:h-10 sm:w-10"
              >
                {getThemeIcon()}
                <span className="sr-only">Alternar tema: {getThemeLabel()}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tema: {getThemeLabel()}</p>
            </TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1 px-2 sm:h-10 sm:gap-2 sm:px-3">
                <User className="h-4 w-4" />
                <span className="hidden max-w-[100px] truncate sm:inline md:max-w-[150px]">
                  {profile?.full_name}
                </span>
                <Badge 
                  variant={profile?.role === "admin" ? "default" : "secondary"} 
                  className="ml-0.5 hidden text-[10px] xs:inline-flex sm:ml-1 sm:text-xs"
                >
                  {profile?.role}
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-sm">
                <p className="font-medium">{profile?.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
                <p className="text-xs text-muted-foreground">Matrícula: {profile?.employee_id}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-danger">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
