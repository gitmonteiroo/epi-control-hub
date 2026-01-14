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
import { Download, Package, Users, TrendingUp, TrendingDown, Filter, FileSpreadsheet, FileText, Calendar, Search, ShoppingCart, AlertTriangle } from "lucide-react";
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

  // Filtros gerais
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Filtros do relatório de consumo
  const [consumptionDateFrom, setConsumptionDateFrom] = useState(() => {
    const date = subDays(new Date(), 30);
    return format(date, "yyyy-MM-dd");
  });
  const [consumptionDateTo, setConsumptionDateTo] = useState(() => {
    return format(new Date(), "yyyy-MM-dd");
  });
  const [consumptionProductFilter, setConsumptionProductFilter] = useState<string>("all");
  const [consumptionEmployeeFilter, setConsumptionEmployeeFilter] = useState<string>("all");
  const [employees, setEmployees] = useState<{ id: string; full_name: string; employee_id: string }[]>([]);
  const [consumptionData, setConsumptionData] = useState<{ product_id: string; product_name: string; product_code: string | null; category: string | null; total_quantity: number; unit: string; withdrawal_count: number; employee_name?: string; employee_id_code?: string }[]>([]);
  const [loadingConsumption, setLoadingConsumption] = useState(false);

  useEffect(() => {
    fetchData();
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchConsumptionData();
  }, [consumptionDateFrom, consumptionDateTo, consumptionProductFilter, consumptionEmployeeFilter]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, employee_id")
        .eq("status", "ativo")
        .order("full_name");
      
      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchConsumptionData = async () => {
    setLoadingConsumption(true);
    try {
      let query = supabase
        .from("withdrawals")
        .select("quantity, product_id, employee_id, created_at, products(id, name, code, unit, categories(name)), profiles(full_name, employee_id)")
        .gte("created_at", startOfDay(parseISO(consumptionDateFrom)).toISOString())
        .lte("created_at", endOfDay(parseISO(consumptionDateTo)).toISOString());

      if (consumptionProductFilter !== "all") {
        query = query.eq("product_id", consumptionProductFilter);
      }

      if (consumptionEmployeeFilter !== "all") {
        query = query.eq("employee_id", consumptionEmployeeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate by product (and optionally employee)
      const aggregateByEmployee = consumptionEmployeeFilter !== "all";
      const dataMap = new Map<string, { 
        product_id: string;
        product_name: string; 
        product_code: string | null;
        category: string | null;
        total_quantity: number; 
        unit: string;
        withdrawal_count: number;
        employee_name?: string;
        employee_id_code?: string;
      }>();

      (data || []).forEach((w: any) => {
        const key = aggregateByEmployee 
          ? `${w.product_id}_${w.employee_id}` 
          : w.product_id;
        
        const existing = dataMap.get(key);
        if (existing) {
          existing.total_quantity += w.quantity;
          existing.withdrawal_count += 1;
        } else {
          dataMap.set(key, {
            product_id: w.product_id,
            product_name: w.products?.name || "Desconhecido",
            product_code: w.products?.code || null,
            category: w.products?.categories?.name || null,
            total_quantity: w.quantity,
            unit: w.products?.unit || "un",
            withdrawal_count: 1,
            employee_name: w.profiles?.full_name || undefined,
            employee_id_code: w.profiles?.employee_id || undefined,
          });
        }
      });

      const aggregatedData = Array.from(dataMap.values())
        .sort((a, b) => b.total_quantity - a.total_quantity);

      setConsumptionData(aggregatedData);
    } catch (error) {
      console.error("Error fetching consumption data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar dados de consumo",
        variant: "destructive",
      });
    } finally {
      setLoadingConsumption(false);
    }
  };

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
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          title="Relatórios"
          description="Análises e exportação de dados"
          actions={
            <div className="flex gap-2">
              <Button onClick={exportToPDF} variant="outline" size="lg" className="flex-1 sm:flex-none">
                <FileText className="mr-2 h-5 w-5" />
                PDF
              </Button>
              <Button onClick={exportToExcel} size="lg" className="flex-1 sm:flex-none">
                <FileSpreadsheet className="mr-2 h-5 w-5" />
                Excel
              </Button>
            </div>
          }
        />

        {/* Stats Cards */}
        <div className="grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-4">
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

        {/* EPIs que Necessitam Compra */}
        {(() => {
          const CRITICAL_THRESHOLD = 10;
          const needsPurchase = products.filter(p => p.stock_available <= CRITICAL_THRESHOLD)
            .sort((a, b) => a.stock_available - b.stock_available);
          
          if (needsPurchase.length === 0) return null;

          const exportNeedsPurchaseToPDF = () => {
            const doc = new jsPDF();
            
            doc.setFontSize(18);
            doc.text("Lista de EPIs que Necessitam Compra", 14, 20);
            
            doc.setFontSize(12);
            doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 14, 30);
            doc.text(`Total de itens: ${needsPurchase.length}`, 14, 38);
            doc.text(`Critério: Estoque ≤ ${CRITICAL_THRESHOLD} unidades`, 14, 46);

            const tableData = needsPurchase.map(p => [
              p.code || "-",
              p.name,
              p.categories?.name || "-",
              `${p.stock_available} ${p.unit}`,
              `${p.min_stock} ${p.unit}`,
              "Necessita Compra",
            ]);

            autoTable(doc, {
              head: [["Código", "Produto", "Categoria", "Estoque Atual", "Estoque Mínimo", "Status"]],
              body: tableData,
              startY: 54,
              styles: { fontSize: 9 },
              headStyles: { fillColor: [234, 179, 8] },
              alternateRowStyles: { fillColor: [254, 252, 232] },
            });

            doc.save(`epis-necessitam-compra-${new Date().toISOString().split("T")[0]}.pdf`);
            
            toast({
              title: "PDF exportado",
              description: `Lista com ${needsPurchase.length} EPIs que necessitam compra`,
            });
          };

          const exportNeedsPurchaseToExcel = () => {
            const data = needsPurchase.map(p => ({
              "Código": p.code || "-",
              "Produto": p.name,
              "Categoria": p.categories?.name || "-",
              "Estoque Atual": p.stock_available,
              "Unidade": p.unit,
              "Estoque Mínimo": p.min_stock,
              "Status": "Necessita Compra",
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            ws["!cols"] = [
              { wch: 12 },
              { wch: 30 },
              { wch: 18 },
              { wch: 14 },
              { wch: 10 },
              { wch: 14 },
              { wch: 16 },
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Necessitam Compra");

            XLSX.writeFile(wb, `epis-necessitam-compra-${new Date().toISOString().split("T")[0]}.xlsx`);
            
            toast({
              title: "Excel exportado",
              description: `Lista com ${needsPurchase.length} EPIs que necessitam compra`,
            });
          };
          
          return (
            <Card className="border-warning/50 bg-warning/5">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <CardTitle className="flex items-center gap-2 text-base flex-1">
                    <ShoppingCart className="h-5 w-5 text-warning" />
                    EPIs que Necessitam Compra
                    <span className="flex items-center gap-1 text-sm font-normal text-warning">
                      <AlertTriangle className="h-4 w-4" />
                      {needsPurchase.length} {needsPurchase.length === 1 ? 'item' : 'itens'}
                    </span>
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportNeedsPurchaseToPDF}
                      className="border-warning/50 hover:bg-warning/10"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportNeedsPurchaseToExcel}
                      className="border-warning/50 hover:bg-warning/10"
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-1" />
                      Excel
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  EPIs com estoque crítico (≤ {CRITICAL_THRESHOLD} unidades) que precisam de reposição
                </p>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-center">Estoque Atual</TableHead>
                      <TableHead className="text-center">Estoque Mínimo</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {needsPurchase.map((product) => (
                      <TableRow key={product.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-sm">{product.code || "-"}</TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.categories?.name || "-"}</TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold ${product.stock_available === 0 ? 'text-danger' : product.stock_available <= 5 ? 'text-danger' : 'text-warning'}`}>
                            {product.stock_available} {product.unit}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {product.min_stock} {product.unit}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-warning/20 text-warning-foreground border border-warning/30">
                            <ShoppingCart className="h-3 w-3" />
                            Necessita Compra
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })()}
        </div>

        {/* Relatório de Saída e Consumo de EPIs */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <CardTitle className="flex items-center gap-2 text-base flex-1">
                  <TrendingDown className="h-5 w-5 text-primary" />
                  Relatório de Saída e Consumo de EPIs
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const doc = new jsPDF();
                      doc.setFontSize(18);
                      doc.text("Relatório de Consumo de EPIs", 14, 20);
                      doc.setFontSize(12);
                      doc.text(`Período: ${format(parseISO(consumptionDateFrom), "dd/MM/yyyy", { locale: ptBR })} a ${format(parseISO(consumptionDateTo), "dd/MM/yyyy", { locale: ptBR })}`, 14, 30);
                      
                      let yPos = 38;
                      if (consumptionEmployeeFilter !== "all") {
                        const emp = employees.find(e => e.id === consumptionEmployeeFilter);
                        doc.text(`Funcionário: ${emp?.full_name || ""}${emp?.employee_id ? ` (${emp.employee_id})` : ""}`, 14, yPos);
                        yPos += 8;
                      }
                      
                      doc.text(`Total de itens: ${consumptionData.length}`, 14, yPos);
                      yPos += 8;
                      doc.text(`Total de saídas: ${consumptionData.reduce((sum, d) => sum + d.total_quantity, 0)}`, 14, yPos);
                      yPos += 8;

                      const hasEmployeeData = consumptionEmployeeFilter !== "all" && consumptionData.some(d => d.employee_name);
                      const tableHead = hasEmployeeData 
                        ? [["Código", "EPI", "Categoria", "Funcionário", "Qtd. Saída", "Unid.", "Nº Retiradas"]]
                        : [["Código", "EPI", "Categoria", "Qtd. Saída", "Unid.", "Nº Retiradas"]];
                        
                      const tableData = consumptionData.map(d => hasEmployeeData 
                        ? [
                            d.product_code || "-",
                            d.product_name,
                            d.category || "-",
                            d.employee_name || "-",
                            d.total_quantity.toString(),
                            d.unit,
                            d.withdrawal_count.toString(),
                          ]
                        : [
                            d.product_code || "-",
                            d.product_name,
                            d.category || "-",
                            d.total_quantity.toString(),
                            d.unit,
                            d.withdrawal_count.toString(),
                          ]
                      );

                      autoTable(doc, {
                        head: tableHead,
                        body: tableData,
                        startY: yPos + 4,
                        styles: { fontSize: 9 },
                        headStyles: { fillColor: [59, 130, 246] },
                      });

                      doc.save(`relatorio-consumo-${consumptionDateFrom}-a-${consumptionDateTo}.pdf`);
                      toast({ title: "PDF exportado", description: `Relatório de consumo gerado` });
                    }}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const hasEmployeeData = consumptionEmployeeFilter !== "all" && consumptionData.some(d => d.employee_name);
                      
                      const data = consumptionData.map(d => hasEmployeeData 
                        ? ({
                            "Código": d.product_code || "-",
                            "EPI": d.product_name,
                            "Categoria": d.category || "-",
                            "Funcionário": d.employee_name || "-",
                            "Matrícula": d.employee_id_code || "-",
                            "Quantidade Total de Saídas": d.total_quantity,
                            "Unidade": d.unit,
                            "Número de Retiradas": d.withdrawal_count,
                          })
                        : ({
                            "Código": d.product_code || "-",
                            "EPI": d.product_name,
                            "Categoria": d.category || "-",
                            "Quantidade Total de Saídas": d.total_quantity,
                            "Unidade": d.unit,
                            "Número de Retiradas": d.withdrawal_count,
                          })
                      );

                      const ws = XLSX.utils.json_to_sheet(data);
                      ws["!cols"] = hasEmployeeData 
                        ? [{ wch: 12 }, { wch: 30 }, { wch: 18 }, { wch: 25 }, { wch: 12 }, { wch: 22 }, { wch: 10 }, { wch: 18 }]
                        : [{ wch: 12 }, { wch: 30 }, { wch: 18 }, { wch: 22 }, { wch: 10 }, { wch: 18 }];

                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, "Consumo EPIs");

                      XLSX.writeFile(wb, `relatorio-consumo-${consumptionDateFrom}-a-${consumptionDateTo}.xlsx`);
                      toast({ title: "Excel exportado", description: `Relatório de consumo gerado` });
                    }}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-1" />
                    Excel
                  </Button>
                </div>
              </div>

              {/* Filtros */}
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Data Início</Label>
                  <Input
                    type="date"
                    value={consumptionDateFrom}
                    onChange={(e) => setConsumptionDateFrom(e.target.value)}
                    className="w-[150px] h-9"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Data Fim</Label>
                  <Input
                    type="date"
                    value={consumptionDateTo}
                    onChange={(e) => setConsumptionDateTo(e.target.value)}
                    className="w-[150px] h-9"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">EPI</Label>
                  <Select value={consumptionProductFilter} onValueChange={setConsumptionProductFilter}>
                    <SelectTrigger className="w-[200px] h-9">
                      <SelectValue placeholder="Todos os EPIs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os EPIs</SelectItem>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.code ? `${product.code} - ` : ""}{product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Funcionário</Label>
                  <Select value={consumptionEmployeeFilter} onValueChange={setConsumptionEmployeeFilter}>
                    <SelectTrigger className="w-[220px] h-9">
                      <SelectValue placeholder="Todos os funcionários" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os funcionários</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.employee_id ? `${emp.employee_id} - ` : ""}{emp.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loadingConsumption ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : consumptionData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma saída encontrada no período selecionado
              </div>
            ) : (
              <>
                <div className="flex gap-4 mb-4 text-sm">
                  <div className="bg-muted/50 px-3 py-2 rounded-lg">
                    <span className="text-muted-foreground">Total de EPIs:</span>
                    <span className="ml-2 font-semibold">{consumptionData.length}</span>
                  </div>
                  <div className="bg-muted/50 px-3 py-2 rounded-lg">
                    <span className="text-muted-foreground">Total de Saídas:</span>
                    <span className="ml-2 font-semibold">{consumptionData.reduce((sum, d) => sum + d.total_quantity, 0)}</span>
                  </div>
                  <div className="bg-muted/50 px-3 py-2 rounded-lg">
                    <span className="text-muted-foreground">Total de Retiradas:</span>
                    <span className="ml-2 font-semibold">{consumptionData.reduce((sum, d) => sum + d.withdrawal_count, 0)}</span>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>EPI</TableHead>
                      <TableHead>Categoria</TableHead>
                      {consumptionEmployeeFilter !== "all" && (
                        <TableHead>Funcionário</TableHead>
                      )}
                      <TableHead className="text-center">Qtd. Total de Saídas</TableHead>
                      <TableHead className="text-center">Unid.</TableHead>
                      <TableHead className="text-center">Nº de Retiradas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consumptionData.map((item, idx) => (
                      <TableRow key={`${item.product_id}_${idx}`} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-sm">{item.product_code || "-"}</TableCell>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell>{item.category || "-"}</TableCell>
                        {consumptionEmployeeFilter !== "all" && (
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{item.employee_name || "-"}</span>
                              {item.employee_id_code && (
                                <span className="text-xs text-muted-foreground">{item.employee_id_code}</span>
                              )}
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="text-center font-semibold text-primary">
                          {item.total_quantity}
                        </TableCell>
                        <TableCell className="text-center">{item.unit}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{item.withdrawal_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>

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