import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/ui/stats-card";
import { LoadingPage } from "@/components/ui/loading";
import { PageHeader } from "@/components/ui/page-header";
import {
  Package,
  AlertTriangle,
  TrendingDown,
  Activity,
  Plus,
  Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { WithdrawalDialog } from "@/components/products/WithdrawalDialog";
import { fetchLowStockProducts } from "@/services/productService";
import { fetchTodayWithdrawalsCount } from "@/services/movementService";
import { getStockStatus } from "@/utils/stock";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  name: string;
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
        .select("id, name, stock_available, min_stock, unit, categories(name)")
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
            <Button onClick={() => setWithdrawalDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar Retirada
            </Button>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Alertas de Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum produto com estoque baixo no momento.
              </p>
            ) : (
              <div className="space-y-3">
                {products.map((product) => {
                  const status = getStockStatus(
                    product.stock_available,
                    product.min_stock
                  );
                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{product.name}</p>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {product.categories?.name || "Sem categoria"}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {product.stock_available} {product.unit}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Mín: {product.min_stock} {product.unit}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/products/${product.id}`)}
                        >
                          Ver Detalhes
                        </Button>
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

      <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
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
            className="text-primary hover:underline"
          >
            Cesar Monteiro
          </a>
        </p>
      </div>
    </AppLayout>
  );
}
