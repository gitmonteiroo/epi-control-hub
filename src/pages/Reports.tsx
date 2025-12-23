import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Package, Users, TrendingUp, TrendingDown, Filter, FileSpreadsheet, FileText, Calendar, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingPage } from "@/components/ui/loading";
import { StockIndicator } from "@/components/ui/stock-indicator";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, subDays, startOfDay, endOfDay, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Stats {
  totalProducts: number;
  totalEmployees: number;
  lowStockProducts: number;
  totalWithdrawals: number;
}

interface Product {
  id: string;
  name: string;
  code: string | null;
  stock_available: number;
  min_stock: number;
  unit: string;
  categories: { id: string; name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

interface WithdrawalData {
  product_name: string;
  total: number;
}

interface MovementData {
  date: string;
  entradas: number;
  saidas: number;
}

interface StockTrendData {
  date: string;
  estoque: number;
}

type StockFilter = "all" | "critical" | "low" | "normal";

export default function Reports() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalEmployees: 0,
    lowStockProducts: 0,
    totalWithdrawals: 0,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [topWithdrawals, setTopWithdrawals] = useState<WithdrawalData[]>([]);
  const [movementTrend, setMovementTrend] = useState<MovementData[]>([]);
  const [stockTrend, setStockTrend] = useState<StockTrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      
      const [productsRes, employeesRes, withdrawalsRes, topWithdrawalsRes, movementsRes, categoriesRes] = await Promise.all([
        supabase.from("products").select("*, categories(id, name)"),
        supabase.from("profiles").select("id"),
        supabase.from("withdrawals").select("id"),
        supabase.from("withdrawals").select("quantity, products(name)"),
        supabase.from("stock_movements").select("type, quantity, created_at").gte("created_at", thirtyDaysAgo),
        supabase.from("categories").select("id, name").order("name"),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (employeesRes.error) throw employeesRes.error;
      if (withdrawalsRes.error) throw withdrawalsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      const productsData = productsRes.data || [];
      const lowStock = productsData.filter(p => p.stock_available <= p.min_stock).length;

      setStats({
        totalProducts: productsData.length,
        totalEmployees: employeesRes.data?.length || 0,
        lowStockProducts: lowStock,
        totalWithdrawals: withdrawalsRes.data?.length || 0,
      });

      setProducts(productsData);
      setCategories(categoriesRes.data || []);

      // Process top withdrawals
      if (topWithdrawalsRes.data) {
        const withdrawalMap = new Map<string, number>();
        topWithdrawalsRes.data.forEach((w: any) => {
          const productName = w.products?.name || "Desconhecido";
          withdrawalMap.set(productName, (withdrawalMap.get(productName) || 0) + w.quantity);
        });
        
        const topWithdrawalsData = Array.from(withdrawalMap.entries())
          .map(([product_name, total]) => ({ product_name, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 10);
        
        setTopWithdrawals(topWithdrawalsData);
      }

      // Process movement trends
      if (movementsRes.data) {
        const movementMap = new Map<string, { entradas: number; saidas: number }>();
        
        movementsRes.data.forEach((m: any) => {
          const date = format(new Date(m.created_at), "dd/MM");
          const current = movementMap.get(date) || { entradas: 0, saidas: 0 };
          
          if (m.type === "entrada") {
            current.entradas += m.quantity;
          } else {
            current.saidas += m.quantity;
          }
          
          movementMap.set(date, current);
        });
        
        const movementData = Array.from(movementMap.entries())
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => {
            const [dayA, monthA] = a.date.split("/").map(Number);
            const [dayB, monthB] = b.date.split("/").map(Number);
            return monthA !== monthB ? monthA - monthB : dayA - dayB;
          });
        
        setMovementTrend(movementData);

        // Calculate stock trend
        let currentStock = productsData.reduce((sum, p) => sum + p.stock_available, 0);
        const stockData: StockTrendData[] = [];
        
        for (let i = 29; i >= 0; i--) {
          const date = format(subDays(new Date(), i), "dd/MM");
          const dayMovements = movementsRes.data.filter((m: any) => 
            format(new Date(m.created_at), "dd/MM") === date
          );
          
          const dayChange = dayMovements.reduce((sum: number, m: any) => {
            return sum + (m.type === "entrada" ? -m.quantity : m.quantity);
          }, 0);
          
          currentStock -= dayChange;
          stockData.push({ date, estoque: Math.max(0, currentStock) });
        }
        
        setStockTrend(stockData.reverse());
      }
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

  // Aplicar filtros aos produtos
  const filteredProducts = products.filter((product) => {
    // Filtro de busca
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        product.name.toLowerCase().includes(search) ||
        (product.code?.toLowerCase() || "").includes(search);
      if (!matchesSearch) return false;
    }

    // Filtro de categoria
    if (categoryFilter !== "all" && product.categories?.id !== categoryFilter) {
      return false;
    }

    // Filtro de status de estoque
    if (stockFilter !== "all") {
      const isCritical = product.stock_available === 0;
      const isLow = product.stock_available <= product.min_stock && product.stock_available > 0;
      const isNormal = product.stock_available > product.min_stock;

      switch (stockFilter) {
        case "critical":
          if (!isCritical) return false;
          break;
        case "low":
          if (!isLow) return false;
          break;
        case "normal":
          if (!isNormal) return false;
          break;
      }
    }

    return true;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setStockFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const hasFilters = searchTerm || categoryFilter !== "all" || stockFilter !== "all" || dateFrom || dateTo;

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Relatório de Estoque", 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 14, 30);
    
    // Adicionar informações de filtros se houver
    let yPosition = 40;
    if (hasFilters) {
      doc.setFontSize(10);
      doc.text("Filtros aplicados:", 14, yPosition);
      yPosition += 6;
      
      if (searchTerm) {
        doc.text(`  - Busca: "${searchTerm}"`, 14, yPosition);
        yPosition += 5;
      }
      if (categoryFilter !== "all") {
        const categoryName = categories.find(c => c.id === categoryFilter)?.name || categoryFilter;
        doc.text(`  - Categoria: ${categoryName}`, 14, yPosition);
        yPosition += 5;
      }
      if (stockFilter !== "all") {
        const stockLabels = { critical: "Crítico", low: "Baixo", normal: "Normal" };
        doc.text(`  - Status de Estoque: ${stockLabels[stockFilter]}`, 14, yPosition);
        yPosition += 5;
      }
      if (dateFrom || dateTo) {
        doc.text(`  - Período: ${dateFrom || "..."} a ${dateTo || "..."}`, 14, yPosition);
        yPosition += 5;
      }
      yPosition += 5;
    }
    
    doc.setFontSize(10);
    doc.text(`Total de Produtos (filtrado): ${filteredProducts.length}`, 14, yPosition);
    yPosition += 6;
    doc.text(`Produtos com Estoque Baixo: ${filteredProducts.filter(p => p.stock_available <= p.min_stock).length}`, 14, yPosition);
    yPosition += 6;

    const tableData = filteredProducts.map(p => [
      p.code || "-",
      p.name,
      p.categories?.name || "-",
      p.stock_available.toString(),
      p.min_stock.toString(),
      p.unit,
      p.stock_available === 0 ? "Crítico" : p.stock_available <= p.min_stock ? "Baixo" : "Normal",
    ]);

    autoTable(doc, {
      head: [["Código", "Produto", "Categoria", "Estoque", "Mín.", "Unid.", "Status"]],
      body: tableData,
      startY: yPosition + 5,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    const fileName = `relatorio-estoque-${new Date().toISOString().split("T")[0]}${hasFilters ? "-filtrado" : ""}.pdf`;
    doc.save(fileName);
    
    toast({
      title: "Sucesso",
      description: `Relatório PDF gerado com ${filteredProducts.length} produtos`,
    });
  };

  const exportToExcel = () => {
    const data = filteredProducts.map(p => ({
      "Código": p.code || "-",
      "Produto": p.name,
      "Categoria": p.categories?.name || "-",
      "Estoque Atual": p.stock_available,
      "Estoque Mínimo": p.min_stock,
      "Unidade": p.unit,
      "Status": p.stock_available === 0 ? "Crítico" : p.stock_available <= p.min_stock ? "Baixo" : "Normal",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    
    // Ajustar largura das colunas
    ws["!cols"] = [
      { wch: 12 }, // Código
      { wch: 30 }, // Produto
      { wch: 18 }, // Categoria
      { wch: 12 }, // Estoque Atual
      { wch: 12 }, // Estoque Mínimo
      { wch: 10 }, // Unidade
      { wch: 10 }, // Status
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estoque");

    // Adicionar aba de resumo
    const summaryData = [
      { "Métrica": "Total de Produtos", "Valor": filteredProducts.length },
      { "Métrica": "Estoque Crítico", "Valor": filteredProducts.filter(p => p.stock_available === 0).length },
      { "Métrica": "Estoque Baixo", "Valor": filteredProducts.filter(p => p.stock_available <= p.min_stock && p.stock_available > 0).length },
      { "Métrica": "Estoque Normal", "Valor": filteredProducts.filter(p => p.stock_available > p.min_stock).length },
      { "Métrica": "Data do Relatório", "Valor": new Date().toLocaleDateString("pt-BR") },
    ];
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    summaryWs["!cols"] = [{ wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, "Resumo");

    const fileName = `relatorio-estoque-${new Date().toISOString().split("T")[0]}${hasFilters ? "-filtrado" : ""}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({
      title: "Sucesso",
      description: `Relatório Excel gerado com ${filteredProducts.length} produtos`,
    });
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
      <div className="space-y-6">
        <PageHeader
          title="Relatórios"
          description="Análises e exportação de dados"
          actions={
            <div className="flex flex-wrap gap-2">
              <Button onClick={exportToPDF} variant="outline" size="sm">
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </Button>
              <Button onClick={exportToExcel} size="sm">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel
              </Button>
            </div>
          }
        />

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <TrendingDown className="h-4 w-4 text-danger" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-danger">{stats.lowStockProducts}</div>
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

        {/* Filtros Avançados */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4" />
                Filtros Avançados
              </CardTitle>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="search" className="text-sm font-medium">
                  Buscar produto
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Nome ou código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium">
                  Categoria
                </Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock" className="text-sm font-medium">
                  Status de Estoque
                </Label>
                <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as StockFilter)}>
                  <SelectTrigger id="stock">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="critical">Crítico (zerado)</SelectItem>
                    <SelectItem value="low">Baixo (≤ mínimo)</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFrom" className="text-sm font-medium">
                  Período
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            
            {hasFilters && (
              <p className="mt-4 text-sm text-muted-foreground">
                Exibindo {filteredProducts.length} de {products.length} produtos
              </p>
            )}
          </CardContent>
        </Card>

        {/* Gráficos */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução do Estoque (30 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={stockTrend}>
                  <defs>
                    <linearGradient id="colorEstoque" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px"
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="estoque" 
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1} 
                    fill="url(#colorEstoque)" 
                    name="Estoque Total"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Movimentações (30 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={movementTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px"
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Line 
                    type="monotone" 
                    dataKey="entradas" 
                    stroke="hsl(var(--success))" 
                    strokeWidth={2}
                    name="Entradas"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="saidas" 
                    stroke="hsl(var(--danger))" 
                    strokeWidth={2}
                    name="Saídas"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top EPIs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 EPIs Mais Retirados</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={topWithdrawals} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis dataKey="product_name" type="category" width={140} className="text-xs" tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px"
                  }} 
                />
                <Bar 
                  dataKey="total" 
                  fill="hsl(var(--primary))" 
                  radius={[0, 6, 6, 0]}
                  name="Quantidade Retirada"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tabela de Estoque */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Status de Estoque
              {hasFilters && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({filteredProducts.length} resultados)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-center">Estoque</TableHead>
                  <TableHead className="text-center">Mínimo</TableHead>
                  <TableHead className="text-center">Unid.</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum produto encontrado com os filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-sm">{product.code || "-"}</TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.categories?.name || "-"}</TableCell>
                      <TableCell className="text-center font-semibold">{product.stock_available}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{product.min_stock}</TableCell>
                      <TableCell className="text-center">{product.unit}</TableCell>
                      <TableCell className="text-center">
                        <StockIndicator
                          available={product.stock_available}
                          minimum={product.min_stock}
                          unit={product.unit}
                          showIcon={false}
                          showLabel={false}
                          size="sm"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}