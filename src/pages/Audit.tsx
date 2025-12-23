import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Filter, Calendar, User, Activity, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDenied } from "@/components/AccessDenied";
import { 
  fetchAuditLogs, 
  fetchDistinctActions, 
  fetchDistinctEntities,
  AuditLog 
} from "@/services/auditService";
import { supabase } from "@/integrations/supabase/client";

export default function Audit() {
  const { isAdmin } = useAuth();
  const [filters, setFilters] = useState({
    userId: "",
    acao: "",
    entidade: "",
    startDate: "",
    endDate: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs", appliedFilters],
    queryFn: () => fetchAuditLogs({
      userId: appliedFilters.userId || undefined,
      acao: appliedFilters.acao || undefined,
      entidade: appliedFilters.entidade || undefined,
      startDate: appliedFilters.startDate || undefined,
      endDate: appliedFilters.endDate || undefined,
    }),
    enabled: isAdmin,
  });

  const { data: actions } = useQuery({
    queryKey: ["audit-actions"],
    queryFn: fetchDistinctActions,
    enabled: isAdmin,
  });

  const { data: entities } = useQuery({
    queryKey: ["audit-entities"],
    queryFn: fetchDistinctEntities,
    enabled: isAdmin,
  });

  const { data: users } = useQuery({
    queryKey: ["audit-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return <AccessDenied />;
  }

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
  };

  const handleClearFilters = () => {
    const cleared = {
      userId: "",
      acao: "",
      entidade: "",
      startDate: "",
      endDate: "",
    };
    setFilters(cleared);
    setAppliedFilters(cleared);
  };

  const hasActiveFilters = Object.values(appliedFilters).some(v => v !== "");

  const getActionBadgeVariant = (acao: string): "default" | "secondary" | "destructive" | "outline" => {
    if (acao.toLowerCase().includes("exclu") || acao.toLowerCase().includes("remov")) {
      return "destructive";
    }
    if (acao.toLowerCase().includes("cri") || acao.toLowerCase().includes("cadastr")) {
      return "default";
    }
    if (acao.toLowerCase().includes("edit") || acao.toLowerCase().includes("alter")) {
      return "secondary";
    }
    return "outline";
  };

  const formatDetails = (detalhes: Record<string, any> | null): string => {
    if (!detalhes) return "-";
    try {
      return JSON.stringify(detalhes, null, 2);
    } catch {
      return "-";
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Auditoria"
          description="Histórico de ações realizadas no sistema"
        />

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Usuário
                </Label>
                <Select
                  value={filters.userId}
                  onValueChange={(value) => setFilters({ ...filters, userId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  Ação
                </Label>
                <Select
                  value={filters.acao}
                  onValueChange={(value) => setFilters({ ...filters, acao: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    {actions?.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Entidade</Label>
                <Select
                  value={filters.entidade}
                  onValueChange={(value) => setFilters({ ...filters, entidade: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    {entities?.map((entity) => (
                      <SelectItem key={entity} value={entity}>
                        {entity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Data Início
                </Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Data Fim
                </Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleApplyFilters}>
                <Filter className="h-4 w-4 mr-2" />
                Aplicar Filtros
              </Button>
              {hasActiveFilters && (
                <Button variant="outline" onClick={handleClearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Registros de Auditoria
              {logs && (
                <Badge variant="secondary" className="ml-2">
                  {logs.length} registro(s)
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : logs && logs.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Entidade</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log: AuditLog) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {log.user_email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActionBadgeVariant(log.acao)}>
                            {log.acao}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.entidade}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-20">
                            {formatDetails(log.detalhes)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                icon={<FileText className="h-10 w-10" />}
                title="Nenhum registro encontrado"
                description={hasActiveFilters 
                  ? "Tente ajustar os filtros para encontrar registros" 
                  : "Os registros de auditoria aparecerão aqui conforme as ações forem realizadas"
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
