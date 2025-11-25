import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

interface Withdrawal {
  id: string;
  quantity: number;
  reason: string | null;
  created_at: string;
  products: { name: string; unit: string } | null;
  profiles: { full_name: string; employee_id: string } | null;
}

export default function Withdrawals() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*, products(name, unit), profiles(full_name, employee_id)")
        .order("created_at", { ascending: false })
        .limit(50);

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
        <div>
          <h1 className="text-3xl font-bold">Retiradas</h1>
          <p className="text-muted-foreground">Histórico de retiradas de EPIs</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {withdrawals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhuma retirada registrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((w) => (
                  <div key={w.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium">{w.products?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {w.profiles?.full_name} (Mat: {w.profiles?.employee_id})
                      </p>
                      {w.reason && <p className="text-sm text-muted-foreground italic">{w.reason}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-danger">
                        -{w.quantity} {w.products?.unit}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(w.created_at)}</p>
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
