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
import { Package, Plus, ArrowUpCircle, ArrowDownCircle, User, Calendar, Filter, FileDown, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface Movement {
  id: string;
  type: "entrada" | "saida";
  quantity: number;
  notes: string | null;
  created_at: string;
  employee_id: string;
  products: {
    name: string;
    unit: string;
    code: string | null;
  };
  employee?: {
    full_name: string;
    employee_id: string;
  } | null;
}

export default function Movements() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "entrada" | "saida">("all");
  const { toast: toastHook } = useToast();
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
          products(name, unit, code)
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      // Fetch employee data from company_employees
      const employeeIds = [...new Set((data || []).map(m => m.employee_id))];
      const { data: employees } = await supabase
        .from("company_employees")
        .select("id, full_name, employee_id")
        .in("id", employeeIds);

      const employeeMap = new Map((employees || []).map(e => [e.id, e]));

      const movementsWithEmployees = (data || []).map(m => ({
        ...m,
        employee: employeeMap.get(m.employee_id) || null,
      }));

      setMovements(movementsWithEmployees as Movement[]);
    } catch (error) {
      console.error("Error:", error);
      toastHook({
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
      m.employee?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.employee?.employee_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || m.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const entryCount = movements.filter((m) => m.type === "entrada").length;
  const exitCount = movements.filter((m) => m.type === "saida").length;

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Histórico de Movimentações de Estoque", 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 14, 28);
    doc.text(`Total: ${filteredMovements.length} movimentações`, 14, 34);
    doc.text(`Entradas: ${entryCount} | Saídas: ${exitCount}`, 14, 40);

    const tableData = filteredMovements.map(m => [
      m.type === "entrada" ? "Entrada" : "Saída",
      m.products.code || "-",
      m.products.name,
      m.quantity.toString(),
      m.products.unit,
      m.employee?.full_name || "-",
      m.employee?.employee_id || "-",
      m.notes || "-",
      formatDate(m.created_at),
    ]);

    autoTable(doc, {
      head: [["Tipo", "Código", "Produto", "Qtd", "Unid.", "Funcionário", "Mat.", "Obs.", "Data"]],
      body: tableData,
      startY: 48,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`movimentacoes-${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("PDF exportado com sucesso");
  };

  const exportToExcel = () => {
    const data = filteredMovements.map(m => ({
      "Tipo": m.type === "entrada" ? "Entrada" : "Saída",
      "Código": m.products.code || "-",
      "Produto": m.products.name,
      "Quantidade": m.quantity,
      "Unidade": m.products.unit,
      "Funcionário": m.employee?.full_name || "-",
      "Matrícula": m.employee?.employee_id || "-",
      "Observações": m.notes || "-",
      "Data": formatDate(m.created_at),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 10 }, { wch: 12 }, { wch: 30 }, { wch: 10 },
      { wch: 8 }, { wch: 25 }, { wch: 12 }, { wch: 30 }, { wch: 18 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movimentações");

    // Resumo
    const summaryData = [
      { "Métrica": "Total de Movimentações", "Valor": filteredMovements.length },
      { "Métrica": "Entradas", "Valor": entryCount },
      { "Métrica": "Saídas", "Valor": exitCount },
      { "Métrica": "Data do Relatório", "Valor": new Date().toLocaleDateString("pt-BR") },
    ];
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, "Resumo");

    XLSX.writeFile(wb, `movimentacoes-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Excel exportado com sucesso");
  };

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
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={exportToPDF}>
                <FileDown className="mr-2 h-4 w-4" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={exportToExcel}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel
              </Button>
              {canManage && (
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
              )}
            </div>
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
                        value={`${movement.employee?.full_name || "N/A"} (Mat: ${movement.employee?.employee_id || "N/A"})`}
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
                        {movement.employee?.full_name || "N/A"}
                        <span className="block text-xs text-muted-foreground font-mono">
                          Mat: {movement.employee?.employee_id || "N/A"}
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
