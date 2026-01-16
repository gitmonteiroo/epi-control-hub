import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingPage } from "@/components/ui/loading";
import { PageHeader } from "@/components/ui/page-header";
import { StockBar } from "@/components/ui/stock-indicator";
import { Plus, Package, ChevronRight, AlertTriangle, CheckCircle, XCircle, FileDown, FileSpreadsheet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchProducts,
  type ProductListItem,
} from "@/services/productService";
import { fetchCategories, type Category } from "@/services/categoryService";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

type StockStatusFilter = "all" | "critical" | "low" | "normal";

const stockStatusOptions = [
  { value: "all", label: "Todos os status", icon: null },
  { value: "critical", label: "Crítico (zerado)", icon: XCircle, color: "text-danger" },
  { value: "low", label: "Estoque baixo", icon: AlertTriangle, color: "text-warning" },
  { value: "normal", label: "Estoque normal", icon: CheckCircle, color: "text-success" },
];

export default function Products() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<StockStatusFilter>("all");
  const navigate = useNavigate();
  const { canManage } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
      ]);

      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatusForProduct = (product: ProductListItem): StockStatusFilter => {
    if (product.stock_available === 0) return "critical";
    if (product.stock_available <= product.min_stock) return "low";
    return "normal";
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || product.categories?.id === categoryFilter;
    const matchesStock =
      stockFilter === "all" || getStockStatusForProduct(product) === stockFilter;
    return matchesSearch && matchesCategory && matchesStock;
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Lista de Produtos", 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 14, 28);
    doc.text(`Total: ${filteredProducts.length} produtos`, 14, 34);

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
      startY: 42,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`produtos-${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("PDF exportado com sucesso");
  };

  const exportToExcel = () => {
    const data = filteredProducts.map(p => ({
      "Código": p.code || "-",
      "Produto": p.name,
      "Descrição": p.description || "-",
      "Categoria": p.categories?.name || "-",
      "Estoque Atual": p.stock_available,
      "Estoque Mínimo": p.min_stock,
      "Unidade": p.unit,
      "Status": p.stock_available === 0 ? "Crítico" : p.stock_available <= p.min_stock ? "Baixo" : "Normal",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 12 }, { wch: 30 }, { wch: 40 }, { wch: 18 },
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    XLSX.writeFile(wb, `produtos-${new Date().toISOString().split("T")[0]}.xlsx`);
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
      <div className="space-y-6">
        <PageHeader
          title="Produtos"
          description="Gestão de produtos e EPIs"
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
                <Button onClick={() => navigate("/products/new")} size="lg">
                  <Plus className="mr-2 h-5 w-5" />
                  Novo Produto
                </Button>
              )}
            </div>
          }
        />

        <Card>
          <CardContent className="pt-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <SearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Buscar por nome, código..."
                  className="flex-1"
                />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[200px] h-11">
                    <SelectValue placeholder="Todas categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Categorias</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as StockStatusFilter)}>
                  <SelectTrigger className="w-full sm:w-[200px] h-11">
                    <SelectValue placeholder="Status de estoque" />
                  </SelectTrigger>
                  <SelectContent>
                    {stockStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          {option.icon && <option.icon className={`h-4 w-4 ${option.color}`} />}
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Stock status quick filters */}
              <div className="flex flex-wrap gap-2">
                {stockStatusOptions.map((option) => {
                  const count = option.value === "all" 
                    ? products.length 
                    : products.filter(p => getStockStatusForProduct(p) === option.value).length;
                  const isActive = stockFilter === option.value;
                  
                  return (
                    <button
                      key={option.value}
                      onClick={() => setStockFilter(option.value as StockStatusFilter)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        isActive
                          ? option.value === "critical"
                            ? "bg-danger text-danger-foreground"
                            : option.value === "low"
                            ? "bg-warning text-warning-foreground"
                            : option.value === "normal"
                            ? "bg-success text-success-foreground"
                            : "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      }`}
                    >
                      {option.icon && <option.icon className="h-3.5 w-3.5" />}
                      <span>{option.value === "all" ? "Todos" : option.label.split(" ")[0]}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                        isActive ? "bg-white/20" : "bg-background"
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon={<Package className="h-12 w-12 text-muted-foreground mb-4" />}
                title="Nenhum produto encontrado"
                description={
                  searchTerm || categoryFilter !== "all" || stockFilter !== "all"
                    ? "Tente ajustar os filtros de busca"
                    : "Cadastre seu primeiro produto para começar"
                }
              />
            </div>
          ) : (
            filteredProducts.map((product) => {
              const isCritical = product.stock_available === 0;
              const isLow = product.stock_available <= product.min_stock;
              
              return (
                <Card
                  key={product.id}
                  className="group card-interactive overflow-hidden"
                  onClick={() => navigate(`/products/${product.id}`)}
                >
                  {/* Status bar no topo */}
                  <div
                    className={`h-1.5 w-full ${
                      isCritical
                        ? "bg-danger"
                        : isLow
                        ? "bg-warning"
                        : "bg-success"
                    }`}
                  />
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">
                          {product.name}
                        </CardTitle>
                        {product.code && (
                          <p className="text-sm text-muted-foreground font-mono mt-1">
                            #{product.code}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                    {product.categories && (
                      <Badge variant="secondary" className="w-fit mt-2">
                        {product.categories.name}
                      </Badge>
                    )}
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {product.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Disponível</p>
                        <p className={`text-3xl font-bold ${
                          isCritical ? "text-danger" : isLow ? "text-warning" : "text-success"
                        }`}>
                          {product.stock_available}
                          <span className="text-base font-normal text-muted-foreground ml-1">
                            {product.unit}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground mb-1">Mínimo</p>
                        <p className="text-lg font-semibold text-muted-foreground">
                          {product.min_stock} {product.unit}
                        </p>
                      </div>
                    </div>
                    
                    <StockBar
                      available={product.stock_available}
                      minimum={product.min_stock}
                    />
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
