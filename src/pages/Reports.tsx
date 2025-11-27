import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Package, Users, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface Stats {
  totalProducts: number;
  totalEmployees: number;
  lowStockProducts: number;
  totalWithdrawals: number;
}

interface Product {
  id: string;
  name: string;
  stock_available: number;
  min_stock: number;
  unit: string;
  categories: { name: string } | null;
}

export default function Reports() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalEmployees: 0,
    lowStockProducts: 0,
    totalWithdrawals: 0,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, employeesRes, withdrawalsRes] = await Promise.all([
        supabase.from("products").select("*, categories(name)"),
        supabase.from("profiles").select("id"),
        supabase.from("withdrawals").select("id"),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (employeesRes.error) throw employeesRes.error;
      if (withdrawalsRes.error) throw withdrawalsRes.error;

      const productsData = productsRes.data || [];
      const lowStock = productsData.filter(p => p.stock_available <= p.min_stock).length;

      setStats({
        totalProducts: productsData.length,
        totalEmployees: employeesRes.data?.length || 0,
        lowStockProducts: lowStock,
        totalWithdrawals: withdrawalsRes.data?.length || 0,
      });

      setProducts(productsData);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Relatório de Estoque", 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 14, 30);
    
    doc.setFontSize(10);
    doc.text(`Total de Produtos: ${stats.totalProducts}`, 14, 40);
    doc.text(`Produtos com Estoque Baixo: ${stats.lowStockProducts}`, 14, 46);
    doc.text(`Total de Retiradas: ${stats.totalWithdrawals}`, 14, 52);

    const tableData = products.map(p => [
      p.name,
      p.categories?.name || "-",
      p.stock_available.toString(),
      p.min_stock.toString(),
      p.unit,
      p.stock_available <= p.min_stock ? "Baixo" : "Normal",
    ]);

    autoTable(doc, {
      head: [["Produto", "Categoria", "Estoque", "Mín.", "Unid.", "Status"]],
      body: tableData,
      startY: 60,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`relatorio-estoque-${new Date().toISOString().split("T")[0]}.pdf`);
    
    toast({
      title: "Sucesso",
      description: "Relatório PDF gerado com sucesso",
    });
  };

  const exportToExcel = () => {
    const data = products.map(p => ({
      Produto: p.name,
      Categoria: p.categories?.name || "-",
      "Estoque Atual": p.stock_available,
      "Estoque Mínimo": p.min_stock,
      Unidade: p.unit,
      Status: p.stock_available <= p.min_stock ? "Baixo" : "Normal",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estoque");

    XLSX.writeFile(wb, `relatorio-estoque-${new Date().toISOString().split("T")[0]}.xlsx`);
    
    toast({
      title: "Sucesso",
      description: "Relatório Excel gerado com sucesso",
    });
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
            <h1 className="text-3xl font-bold">Relatórios</h1>
            <p className="text-muted-foreground">Análises e exportação de dados</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToPDF} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
            <Button onClick={exportToExcel}>
              <Download className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Funcionários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.lowStockProducts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Retiradas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalWithdrawals}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Status de Estoque</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Estoque Atual</TableHead>
                  <TableHead>Estoque Mínimo</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.categories?.name || "-"}</TableCell>
                    <TableCell>{product.stock_available}</TableCell>
                    <TableCell>{product.min_stock}</TableCell>
                    <TableCell>{product.unit}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          product.stock_available <= product.min_stock
                            ? "bg-destructive/10 text-destructive"
                            : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        }`}
                      >
                        {product.stock_available <= product.min_stock ? "Baixo" : "Normal"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
