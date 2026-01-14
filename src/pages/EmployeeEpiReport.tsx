import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { LoadingPage, LoadingInline } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, User, TrendingDown, RotateCcw, Package } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { getConditionLabel } from "@/utils/stock";
import { formatDate } from "@/utils/formatters";

interface Employee {
  id: string;
  full_name: string;
  employee_id: string;
  department: string | null;
}

interface EpiMovement {
  id: string;
  type: "withdrawal" | "return";
  quantity: number;
  reason: string | null;
  condition?: string | null;
  created_at: string;
  product: {
    id: string;
    code: string | null;
    name: string;
    ca_number: string | null;
    size: string | null;
    unit: string;
  };
}

interface EmployeeEpiSummary {
  employee: Employee;
  movements: EpiMovement[];
  totalWithdrawals: number;
  totalReturns: number;
  balance: number;
}

export default function EmployeeEpiReport() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [summaries, setSummaries] = useState<EmployeeEpiSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (employees.length > 0) {
      fetchAllData();
    }
  }, [employees, selectedEmployee]);

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from("company_employees")
      .select("id, full_name, employee_id, department")
      .eq("status", "ativo")
      .order("full_name");

    if (error) {
      console.error("Error fetching employees:", error);
      toast.error("Erro ao carregar funcionários");
      return;
    }

    setEmployees(data || []);
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const employeesToProcess = selectedEmployee 
        ? employees.filter(e => e.id === selectedEmployee)
        : employees;

      const summariesData: EmployeeEpiSummary[] = [];

      for (const employee of employeesToProcess) {
        const [withdrawalsRes, returnsRes] = await Promise.all([
          supabase
            .from("withdrawals")
            .select("id, quantity, reason, created_at, products(id, code, name, ca_number, size, unit)")
            .eq("employee_id", employee.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("returns")
            .select("id, quantity, reason, condition, created_at, products(id, code, name, ca_number, size, unit)")
            .eq("employee_id", employee.id)
            .order("created_at", { ascending: false }),
        ]);

        const movements: EpiMovement[] = [];
        let totalWithdrawals = 0;
        let totalReturns = 0;

        if (withdrawalsRes.data) {
          withdrawalsRes.data.forEach((w: any) => {
            movements.push({
              id: w.id,
              type: "withdrawal",
              quantity: w.quantity,
              reason: w.reason,
              created_at: w.created_at,
              product: w.products,
            });
            totalWithdrawals += w.quantity;
          });
        }

        if (returnsRes.data) {
          returnsRes.data.forEach((r: any) => {
            movements.push({
              id: r.id,
              type: "return",
              quantity: r.quantity,
              reason: r.reason,
              condition: r.condition,
              created_at: r.created_at,
              product: r.products,
            });
            totalReturns += r.quantity;
          });
        }

        // Sort by date descending
        movements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        if (movements.length > 0 || selectedEmployee) {
          summariesData.push({
            employee,
            movements,
            totalWithdrawals,
            totalReturns,
            balance: totalWithdrawals - totalReturns,
          });
        }
      }

      setSummaries(summariesData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const filteredSummaries = summaries.filter(s => 
    s.employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Relatório de EPIs por Funcionário", 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 28);

    let yPosition = 40;

    filteredSummaries.forEach((summary, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`${summary.employee.full_name} (Mat: ${summary.employee.employee_id})`, 14, yPosition);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Retiradas: ${summary.totalWithdrawals} | Devoluções: ${summary.totalReturns} | Em posse: ${summary.balance}`, 14, yPosition + 6);
      
      yPosition += 12;

      if (summary.movements.length > 0) {
        const tableData = summary.movements.map(m => [
          m.type === "withdrawal" ? "Retirada" : "Devolução",
          m.product.code || "-",
          m.product.name,
          m.product.ca_number || "-",
          m.product.size || "-",
          m.quantity.toString(),
          formatDate(m.created_at),
        ]);

        autoTable(doc, {
          head: [["Tipo", "Código", "Produto", "CA", "Tam.", "Qtd", "Data"]],
          body: tableData,
          startY: yPosition,
          styles: { fontSize: 7 },
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: 14 },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }
    });

    doc.save(`relatorio-epis-funcionarios-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF exportado com sucesso");
  };

  const exportToExcel = () => {
    const data: any[] = [];

    filteredSummaries.forEach(summary => {
      summary.movements.forEach(m => {
        data.push({
          Funcionário: summary.employee.full_name,
          Matrícula: summary.employee.employee_id,
          Departamento: summary.employee.department || "-",
          Tipo: m.type === "withdrawal" ? "Retirada" : "Devolução",
          "Código Produto": m.product.code || "-",
          Produto: m.product.name,
          CA: m.product.ca_number || "-",
          Tamanho: m.product.size || "-",
          Quantidade: m.quantity,
          Condição: m.type === "return" ? getConditionLabel(m.condition) : "-",
          Motivo: m.reason || "-",
          Data: formatDate(m.created_at),
        });
      });

      if (summary.movements.length === 0) {
        data.push({
          Funcionário: summary.employee.full_name,
          Matrícula: summary.employee.employee_id,
          Departamento: summary.employee.department || "-",
          Tipo: "-",
          "Código Produto": "-",
          Produto: "Sem movimentações",
          CA: "-",
          Tamanho: "-",
          Quantidade: 0,
          Condição: "-",
          Motivo: "-",
          Data: "-",
        });
      }
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "EPIs por Funcionário");
    XLSX.writeFile(wb, `relatorio-epis-funcionarios-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Excel exportado com sucesso");
  };

  if (loading && employees.length === 0) {
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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">EPIs por Funcionário</h1>
            <p className="text-muted-foreground">Histórico completo de retiradas e devoluções por colaborador</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToPDF} variant="outline" disabled={filteredSummaries.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
            <Button onClick={exportToExcel} disabled={filteredSummaries.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar por nome ou matrícula..."
              />
              <Select value={selectedEmployee || "all"} onValueChange={(val) => setSelectedEmployee(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os funcionários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os funcionários</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} (Mat: {emp.employee_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredSummaries.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum registro encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredSummaries.map((summary) => (
              <Card key={summary.employee.id}>
                <CardHeader>
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{summary.employee.full_name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Mat: {summary.employee.employee_id}
                          {summary.employee.department && ` | ${summary.employee.department}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1 text-danger">
                        <TrendingDown className="h-4 w-4" />
                        <span className="font-semibold">{summary.totalWithdrawals}</span>
                        <span className="text-muted-foreground">retiradas</span>
                      </div>
                      <div className="flex items-center gap-1 text-success">
                        <RotateCcw className="h-4 w-4" />
                        <span className="font-semibold">{summary.totalReturns}</span>
                        <span className="text-muted-foreground">devoluções</span>
                      </div>
                      <Badge variant={summary.balance > 0 ? "warning" : "success"}>
                        {summary.balance} em posse
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {summary.movements.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma movimentação registrada
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead>CA</TableHead>
                            <TableHead>Tamanho</TableHead>
                            <TableHead>Qtd</TableHead>
                            <TableHead>Condição</TableHead>
                            <TableHead>Data</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summary.movements.map((movement) => (
                            <TableRow key={`${movement.type}-${movement.id}`}>
                              <TableCell>
                                <Badge variant={movement.type === "withdrawal" ? "danger" : "success"}>
                                  {movement.type === "withdrawal" ? "Retirada" : "Devolução"}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {movement.product.code || "-"}
                              </TableCell>
                              <TableCell className="font-medium">
                                {movement.product.name}
                              </TableCell>
                              <TableCell>{movement.product.ca_number || "-"}</TableCell>
                              <TableCell>
                                {movement.product.size ? (
                                  <Badge variant="outline">{movement.product.size}</Badge>
                                ) : "-"}
                              </TableCell>
                              <TableCell className="font-semibold">
                                <span className={movement.type === "withdrawal" ? "text-danger" : "text-success"}>
                                  {movement.type === "withdrawal" ? "-" : "+"}{movement.quantity}
                                </span>
                              </TableCell>
                              <TableCell>
                                {movement.type === "return" && movement.condition ? (
                                  <Badge variant="outline">{getConditionLabel(movement.condition)}</Badge>
                                ) : "-"}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {formatDate(movement.created_at)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}