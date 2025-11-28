import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Package, TrendingDown, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { WithdrawalDialog } from "@/components/products/WithdrawalDialog";

interface Product {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  stock_available: number;
  min_stock: number;
  unit: string;
  created_at: string;
  updated_at: string;
  categories: { id: string; name: string } | null;
}

interface Withdrawal {
  id: string;
  quantity: number;
  reason: string | null;
  created_at: string;
  profiles: { full_name: string; employee_id: string } | null;
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*, categories(id, name)")
        .eq("id", id!)
        .single();

      if (productError) throw productError;
      setProduct(productData);

      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from("withdrawals")
        .select("id, quantity, reason, created_at, profiles(full_name, employee_id)")
        .eq("product_id", id!)
        .order("created_at", { ascending: false })
        .limit(10);

      if (withdrawalsError) throw withdrawalsError;
      setWithdrawals(withdrawalsData || []);
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("Erro ao carregar produto");
      navigate("/products");
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (available: number, min: number) => {
    if (available === 0) return { label: "Crítico", variant: "danger" as const, color: "text-danger" };
    if (available <= min) return { label: "Baixo", variant: "warning" as const, color: "text-warning" };
    if (available <= min * 1.5) return { label: "Atenção", variant: "warning" as const, color: "text-warning" };
    return { label: "Normal", variant: "success" as const, color: "text-success" };
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

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  if (!product) {
    return null;
  }

  const status = getStockStatus(product.stock_available, product.min_stock);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/products")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{product.name}</h1>
              <p className="text-muted-foreground">
                {product.categories?.name || "Sem categoria"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setWithdrawalDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar Retirada
            </Button>
            {isAdmin && (
              <Button variant="outline" onClick={() => navigate(`/products/${id}/edit`)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Produto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {product.code && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Código</p>
                  <p className="text-lg font-semibold font-mono">{product.code}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Descrição</p>
                <p className="text-base">{product.description || "Sem descrição"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Unidade</p>
                  <p className="text-lg font-semibold">{product.unit}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estoque Mínimo</p>
                  <p className="text-lg font-semibold">{product.min_stock} {product.unit}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Cadastrado em</p>
                <p className="text-sm">{formatDate(product.created_at)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Estoque Atual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-5xl font-bold">{product.stock_available}</p>
                  <div>
                    <p className="text-sm text-muted-foreground">{product.unit}</p>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-3 mt-4">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      product.stock_available === 0
                        ? "bg-danger"
                        : product.stock_available <= product.min_stock
                        ? "bg-warning"
                        : "bg-success"
                    }`}
                    style={{
                      width: `${Math.min((product.stock_available / (product.min_stock * 2)) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
              {product.stock_available <= product.min_stock && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <TrendingDown className="h-5 w-5 text-warning mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-warning">Atenção: Estoque Baixo</p>
                    <p className="text-xs text-muted-foreground">
                      {product.stock_available === 0
                        ? "Produto sem estoque disponível"
                        : "Repor estoque para evitar falta"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Retiradas</CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma retirada registrada para este produto
              </p>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {withdrawal.profiles?.full_name || "Funcionário não encontrado"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Mat: {withdrawal.profiles?.employee_id}
                      </p>
                      {withdrawal.reason && (
                        <p className="text-sm text-muted-foreground italic mt-1">
                          {withdrawal.reason}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-danger">
                        -{withdrawal.quantity} {product.unit}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(withdrawal.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <WithdrawalDialog
        open={withdrawalDialogOpen}
        onOpenChange={setWithdrawalDialogOpen}
        productId={id}
        onSuccess={fetchData}
      />
    </AppLayout>
  );
}
