import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingPage } from "@/components/ui/loading";
import { PageHeader } from "@/components/ui/page-header";
import { Plus, Package } from "lucide-react";
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
import { getStockStatus } from "@/utils/stock";

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
            <Button onClick={() => navigate("/products/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          }
        />

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar produtos..."
                className="flex-1"
              />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Categoria" />
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

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon={<Package className="h-12 w-12 text-muted-foreground mb-4" />}
                title="Nenhum produto encontrado"
                description={
                  searchTerm || categoryFilter !== "all"
                    ? "Tente ajustar os filtros"
                    : "Cadastre seu primeiro produto"
                }
              />
            </div>
          ) : (
            filteredProducts.map((product) => {
              const status = getStockStatus(
                product.stock_available,
                product.min_stock
              );
              return (
                <Card
                  key={product.id}
                  className="cursor-pointer transition-all hover:shadow-md"
                  onClick={() => navigate(`/products/${product.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        {product.code && (
                          <p className="text-sm text-muted-foreground font-mono mt-1">
                            Código: {product.code}
                          </p>
                        )}
                      </div>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    {product.categories && (
                      <p className="text-sm text-muted-foreground">
                        {product.categories.name}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    {product.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold">
                          {product.stock_available}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {product.unit} disponíveis
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Mínimo</p>
                        <p className="text-lg font-semibold">
                          {product.min_stock} {product.unit}
                        </p>
                      </div>
                    </div>
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
