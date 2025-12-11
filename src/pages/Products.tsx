import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingPage } from "@/components/ui/loading";
import { PageHeader } from "@/components/ui/page-header";
import { StockIndicator, StockBar } from "@/components/ui/stock-indicator";
import { Plus, Package, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

export default function Products() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const navigate = useNavigate();

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

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || product.categories?.id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

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
            <Button onClick={() => navigate("/products/new")} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Novo Produto
            </Button>
          }
        />

        <Card>
          <CardContent className="pt-5">
            <div className="flex flex-col sm:flex-row gap-4">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar por nome, código..."
                className="flex-1"
              />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[220px] h-11">
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
                  searchTerm || categoryFilter !== "all"
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