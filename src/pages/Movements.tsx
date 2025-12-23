import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MovementForm } from "@/components/movements/MovementForm";
import { Package, Plus, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Movement {
  id: string;
  type: "entrada" | "saida";
  quantity: number;
  notes: string | null;
  created_at: string;
  products: {
    name: string;
  };
  profiles: {
    full_name: string;
  };
}

export default function Movements() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const { canManage } = useAuth();

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    try {
      const { data, error } = await supabase
        .from("stock_movements")
        .select(`
          *,
          products(name),
          profiles(full_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMovements((data || []) as Movement[]);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar movimentações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = () => {
    setDialogOpen(false);
    fetchMovements();
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Movimentações</h1>
            <p className="text-muted-foreground">Histórico de entradas e saídas de estoque</p>
          </div>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar Entrada
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Registrar Entrada de Estoque</DialogTitle>
                </DialogHeader>
                <MovementForm
                  onSuccess={handleFormSuccess}
                  onCancel={() => setDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Histórico de Movimentações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">Nenhuma movimentação registrada</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        <Badge
                          variant={movement.type === "entrada" ? "default" : "secondary"}
                          className="flex items-center gap-1 w-fit"
                        >
                          {movement.type === "entrada" ? (
                            <ArrowUpCircle className="h-3 w-3" />
                          ) : (
                            <ArrowDownCircle className="h-3 w-3" />
                          )}
                          {movement.type === "entrada" ? "Entrada" : "Saída"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{movement.products.name}</TableCell>
                      <TableCell>{movement.quantity}</TableCell>
                      <TableCell>{movement.profiles.full_name}</TableCell>
                      <TableCell>
                        {new Date(movement.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {movement.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
