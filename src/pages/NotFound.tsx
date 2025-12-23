import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { ShieldAlert, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const path = location.pathname.toLowerCase();
  
  // Check if user is trying to access registration/signup routes
  const isRegistrationAttempt = 
    path.includes("signup") || 
    path.includes("sign-up") || 
    path.includes("register") || 
    path.includes("cadastro") || 
    path.includes("cadastrar") ||
    path.includes("criar-conta") ||
    path.includes("nova-conta");

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  if (isRegistrationAttempt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-destructive/10 shadow-lg">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h1 className="mb-4 text-2xl font-bold text-foreground">Acesso Restrito</h1>
          <p className="mb-6 text-muted-foreground">
            Cadastro de usuários disponível apenas para administradores.
          </p>
          <p className="mb-6 text-sm text-muted-foreground">
            Se você precisa de acesso ao sistema, entre em contato com o administrador.
          </p>
          <Button asChild>
            <Link to="/auth">
              <Home className="mr-2 h-4 w-4" />
              Ir para Login
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Página não encontrada</p>
        <Button asChild variant="link">
          <Link to="/">Voltar para o início</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
