import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { LogOut, User, Moon, Sun, Monitor } from "lucide-react";
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

export function Header() {
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
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">EPI</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Sistema de Controle de EPIs</h1>
            <p className="text-xs text-muted-foreground">Gestão de Estoque e Almoxarifado</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={cycleTheme}
                className="h-9 w-9"
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
              <Button variant="outline" size="sm" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{profile?.full_name}</span>
                <Badge variant={profile?.role === "admin" ? "default" : "secondary"} className="ml-1">
                  {profile?.role}
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-sm">
                <p className="font-medium">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
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
