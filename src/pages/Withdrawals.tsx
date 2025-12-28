import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingPage } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { ClipboardList, ArrowDownRight, User, Package } from "lucide-react";

interface Withdrawal {
  id: string;
  quantity: number;
  reason: string | null;
  created_at: string;
  products: { name: string; unit: string; code: string | null } | null;
  profiles: { full_name: string; employee_id: string } | null;
}

export default function Withdrawals() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*, products(name, unit, code), profiles(full_name, employee_id)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
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

  const filteredWithdrawals = withdrawals.filter((w) => {
    const term = searchTerm.toLowerCase();
    return (
      w.products?.name.toLowerCase().includes(term) ||
      w.products?.code?.toLowerCase().includes(term) ||
      w.profiles?.full_name.toLowerCase().includes(term) ||
      w.profiles?.employee_id.toLowerCase().includes(term)
    );
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
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          title="Retiradas"
          description="Histórico de retiradas de EPIs"
        />

        <Card>
          <CardContent className="p-3 sm:pt-5 sm:px-6">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar por produto ou funcionário..."
              className="w-full sm:max-w-md"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5" />
              <span className="sm:hidden">Últimas</span>
              <span className="hidden sm:inline">Últimas Retiradas</span>
              <Badge variant="secondary" className="ml-auto">
                {filteredWithdrawals.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredWithdrawals.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />}
                title={searchTerm ? "Nenhuma retirada encontrada" : "Nenhuma retirada registrada"}
                description={
                  searchTerm
                    ? "Tente ajustar os termos de busca"
                    : "As retiradas aparecerão aqui quando forem registradas"
                }
              />
            ) : (
              <div className="space-y-3">
                {filteredWithdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition-all hover:shadow-md hover:border-primary/20"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-danger-muted flex items-center justify-center shrink-0">
                        <ArrowDownRight className="h-5 w-5 text-danger" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium truncate">{w.products?.name}</p>
                          {w.products?.code && (
                            <span className="text-xs font-mono text-muted-foreground">
                              #{w.products.code}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="truncate">
                            {w.profiles?.full_name}{" "}
                            <span className="font-mono">(Mat: {w.profiles?.employee_id})</span>
                          </span>
                        </div>
                        {w.reason && (
                          <p className="text-sm text-muted-foreground italic mt-1 truncate">
                            {w.reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:text-right">
                      <Badge variant="danger" className="text-base font-semibold px-3 py-1">
                        -{w.quantity} {w.products?.unit}
                      </Badge>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(w.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}