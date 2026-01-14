import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MovementForm } from "@/components/movements/MovementForm";
import { DataCard, DataCardHeader, DataCardContent, DataCardRow } from "@/components/ui/data-card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingPage } from "@/components/ui/loading";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, ArrowUpCircle, ArrowDownCircle, User, Calendar, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Movement {
  id: string;
  type: "entrada" | "saida";
  quantity: number;
  notes: string | null;
  created_at: string;
  products: {
    name: string;
    unit: string;
    code: string | null;
  };
  profiles: {
    full_name: string;
    employee_id: string;
  };
}

export default function Movements() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "entrada" | "saida">("all");
  const { toast } = useToast();
  const { canManage } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    try {
      const { data, error } = await supabase
        .from("stock_movements")
        .select(`
          *,
          products(name, unit, code),
          profiles(full_name, employee_id)
        `)
        .order("created_at", { ascending: false })
        .limit(200);

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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredMovements = movements.filter((m) => {
    const matchesSearch =
      m.products.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.products.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.profiles.employee_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || m.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const entryCount = movements.filter((m) => m.type === "entrada").length;
  const exitCount = movements.filter((m) => m.type === "saida").length;

  if (loading) {
    return (
      <AppLayout>
        <LoadingPage />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          title="Movimentações"
          description="Histórico de entradas e saídas de estoque"
          actions={
            canManage ? (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="w-full sm:w-auto">
                    <Plus className="mr-2 h-5 w-5" />
                    <span className="sm:hidden">Entrada</span>
                    <span className="hidden sm:inline">Registrar Entrada</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto sm:w-full">
                  <DialogHeader>
                    <DialogTitle>Registrar Entrada de Estoque</DialogTitle>
                  </DialogHeader>
                  <MovementForm
                    onSuccess={handleFormSuccess}
                    onCancel={() => setDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            ) : undefined
          }
        />

        {/* Filtros */}
        <Card>
          <CardContent className="p-3 sm:pt-5 sm:px-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar por produto ou funcionário..."
                className="w-full sm:max-w-md"
              />
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as "all" | "entrada" | "saida")}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos ({movements.length})</SelectItem>
                    <SelectItem value="entrada">Entradas ({entryCount})</SelectItem>
                    <SelectItem value="saida">Saídas ({exitCount})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5" />
              Histórico
              <Badge variant="secondary" className="ml-auto">
                {filteredMovements.length} registros
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredMovements.length === 0 ? (
              <EmptyState
                icon={<Package className="h-12 w-12 text-muted-foreground mb-4" />}
                title={searchTerm || typeFilter !== "all" ? "Nenhuma movimentação encontrada" : "Nenhuma movimentação registrada"}
                description={searchTerm || typeFilter !== "all" ? "Tente ajustar os filtros de busca" : "As movimentações aparecerão aqui quando forem registradas"}
              />
            ) : isMobile ? (
              // Mobile: Card layout
              <div className="space-y-3">
                {filteredMovements.map((movement) => (
                  <DataCard
                    key={movement.id}
                    statusColor={movement.type === "entrada" ? "success" : "danger"}
                  >
                    <DataCardHeader>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {movement.type === "entrada" ? (
                            <ArrowUpCircle className="h-5 w-5 text-success shrink-0" />
                          ) : (
                            <ArrowDownCircle className="h-5 w-5 text-warning shrink-0" />
                          )}
                          <span className="font-semibold truncate">
                            {movement.products.name}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={movement.type === "entrada" ? "success" : "danger"}
                        className="text-base font-bold px-3 py-1"
                      >
                        {movement.type === "entrada" ? "+" : "-"}{movement.quantity} {movement.products.unit}
                      </Badge>
                    </DataCardHeader>
                    <DataCardContent>
                      <DataCardRow
                        icon={<User className="h-4 w-4" />}
                        label="Funcionário"
                        value={`${movement.profiles.full_name} (Mat: ${movement.profiles.employee_id})`}
                      />
                      <DataCardRow
                        icon={<Calendar className="h-4 w-4" />}
                        label="Data"
                        value={formatDate(movement.created_at)}
                      />
                      {movement.notes && (
                        <p className="text-sm text-muted-foreground italic mt-2 line-clamp-2">
                          {movement.notes}
                        </p>
                      )}
                    </DataCardContent>
                  </DataCard>
                ))}
              </div>
            ) : (
              // Desktop: Table layout
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
                  {filteredMovements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        <Badge
                          variant={movement.type === "entrada" ? "success" : "danger"}
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
                      <TableCell className="font-medium">
                        {movement.products.name}
                        {movement.products.code && (
                          <span className="ml-2 text-xs font-mono text-muted-foreground">
                            #{movement.products.code}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{movement.quantity} {movement.products.unit}</TableCell>
                      <TableCell>
                        {movement.profiles.full_name}
                        <span className="block text-xs text-muted-foreground font-mono">
                          Mat: {movement.profiles.employee_id}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(movement.created_at)}</TableCell>
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
