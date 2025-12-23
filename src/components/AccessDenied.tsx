import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function AccessDenied() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6">
      <ShieldX className="h-16 w-16 text-destructive mb-4" />
      <h1 className="text-2xl font-bold text-foreground mb-2">
        Acesso restrito a administradores
      </h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        Você não tem permissão para acessar esta página. Entre em contato com um administrador se precisar de acesso.
      </p>
      <Button onClick={() => navigate("/")} variant="default">
        Voltar ao Início
      </Button>
    </div>
  );
}
