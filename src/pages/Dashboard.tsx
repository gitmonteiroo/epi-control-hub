import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/ui/stats-card";
import { LoadingPage } from "@/components/ui/loading";
import { PageHeader } from "@/components/ui/page-header";
import { StockIndicator } from "@/components/ui/stock-indicator";
import {
  Package,
  AlertTriangle,
  TrendingDown,
  Activity,
  Plus,
  Settings,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { WithdrawalDialog } from "@/components/products/WithdrawalDialog";
import { fetchTodayWithdrawalsCount } from "@/services/movementService";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  name: string;
  code: string | null;
  stock_available: number;
  min_stock: number;
  unit: string;
  categories: { name: string } | null;
}

interface Stats {
  totalProducts: number;
  lowStockCount: number;
  todayWithdrawals: number;
  criticalStock: number;
}

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    lowStockCount: 0,
    todayWithdrawals: 0,
    criticalStock: 0,
  });
  const [loading, setLoading] = useState(true);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: allProducts, error: productsError } = await supabase
        .from("products")
        .select("id, name, code, stock_available, min_stock, unit, categories(name)")
        .order("stock_available", { ascending: true });

      if (productsError) throw productsError;

      const lowStockProducts = (allProducts || [])
        .filter((p) => p.stock_available <= p.min_stock * 1.5)
        .slice(0, 10);
      setProducts(lowStockProducts);

      const totalCount = allProducts?.length || 0;
      const lowStockCount =
        allProducts?.filter((p) => p.stock_available <= p.min_stock).length ||
        0;
      const criticalCount =
        allProducts?.filter((p) => p.stock_available === 0).length || 0;

      const todayCount = await fetchTodayWithdrawalsCount();

      setStats({
        totalProducts: totalCount,
        lowStockCount: lowStockCount,
        todayWithdrawals: todayCount,
        criticalStock: criticalCount,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
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
          title="Dashboard"
          description="Visão geral do sistema de EPIs"
          actions={
            <Button onClick={() => setWithdrawalDialogOpen(true)} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Registrar Retirada
            </Button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total de Produtos"
            value={stats.totalProducts}
            description="Produtos cadastrados"
            icon={Package}
          />
          <StatsCard
            title="Estoque Baixo"
            value={stats.lowStockCount}
            description="Necessitam reposição"
            icon={TrendingDown}
            iconClassName="text-warning"
            valueClassName="text-warning"
          />
          <StatsCard
            title="Crítico"
            value={stats.criticalStock}
            description="Estoque zerado"
            icon={AlertTriangle}
            iconClassName="text-danger"
            valueClassName="text-danger"
          />
          <StatsCard
            title="Retiradas Hoje"
            value={stats.todayWithdrawals}
            description="Movimentações do dia"
            icon={Activity}
            iconClassName="text-primary"
            valueClassName="text-primary"
          />
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Alertas de Estoque
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate("/products")}>
              Ver todos
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-12 w-12 rounded-full bg-success-muted flex items-center justify-center mb-3">
                  <Package className="h-6 w-6 text-success" />
                </div>
                <p className="font-medium text-foreground">Tudo em ordem!</p>
                <p className="text-sm text-muted-foreground">
                  Nenhum produto com estoque baixo no momento.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((product) => {
                  const isCritical = product.stock_available === 0;
                  const isLow = product.stock_available <= product.min_stock;
                  
                  return (
                    <div
                      key={product.id}
                      className="group flex items-center justify-between rounded-xl border p-4 transition-all hover:shadow-md hover:border-primary/20 cursor-pointer"
                      onClick={() => navigate(`/products/${product.id}`)}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          isCritical ? "bg-danger-muted" : isLow ? "bg-warning-muted" : "bg-success-muted"
                        }`}>
                          <Package className={`h-5 w-5 ${
                            isCritical ? "text-danger" : isLow ? "text-warning" : "text-success"
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">{product.name}</p>
                            {product.code && (
                              <span className="text-xs font-mono text-muted-foreground">#{product.code}</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {product.categories?.name || "Sem categoria"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <StockIndicator
                          available={product.stock_available}
                          minimum={product.min_stock}
                          unit={product.unit}
                          showIcon={true}
                          size="sm"
                        />
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <WithdrawalDialog
        open={withdrawalDialogOpen}
        onOpenChange={setWithdrawalDialogOpen}
        onSuccess={fetchDashboardData}
      />

      <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/settings")}
        >
          <Settings className="mr-2 h-4 w-4" />
          Configurações
        </Button>
        <p className="text-sm text-muted-foreground">
          Criado por:{" "}
          <a
            href="https://www.linkedin.com/in/cesar-monteiro-030bb3170"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            Cesar Monteiro
          </a>
        </p>
      </div>
    </AppLayout>
  );
}