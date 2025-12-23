import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { LoadingPage } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { Users, Plus, Edit, Trash2, Mail, Phone, Building2, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { createAuditLog } from "@/services/auditService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Employee {
  id: string;
  full_name: string;
  employee_id: string;
  department: string | null;
  position: string | null;
  job_function: string | null;
  badge_number: string | null;
  hire_date: string | null;
  email: string;
  phone: string | null;
  status: string | null;
  role: "admin" | "operator" | "supervisor";
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { canManage, isAdmin } = useAuth();

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar funcionários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) throw error;

      await createAuditLog({
        acao: "Excluiu Funcionário",
        entidade: "Funcionário",
        detalhes: { id, nome: name },
      });

      toast({
        title: "Sucesso",
        description: "Funcionário removido com sucesso",
      });
      fetchEmployees();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o funcionário",
        variant: "destructive",
      });
    }
  };

  const handleFormSuccess = () => {
    setDialogOpen(false);
    setEditingEmployee(undefined);
    fetchEmployees();
  };

  const filteredEmployees = employees.filter(
    (employee) =>
      employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          title="Funcionários"
          description="Gestão de funcionários do sistema"
          actions={
            canManage ? (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="default" className="w-full sm:w-auto" onClick={() => setEditingEmployee(undefined)}>
                    <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="sm:hidden">Novo</span>
                    <span className="hidden sm:inline">Novo Funcionário</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl overflow-y-auto sm:w-full">
                  <DialogHeader>
                    <DialogTitle>
                      {editingEmployee ? "Editar Funcionário" : "Novo Funcionário"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingEmployee
                        ? "Atualize as informações do funcionário"
                        : "Preencha os dados para cadastrar um novo funcionário"}
                    </DialogDescription>
                  </DialogHeader>
                  <EmployeeForm
                    employeeId={editingEmployee}
                    onSuccess={handleFormSuccess}
                    onCancel={() => setDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            ) : undefined
          }
        />

        <Card>
          <CardContent className="p-3 sm:pt-5 sm:px-6">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar por nome, matrícula ou email..."
              className="w-full sm:max-w-md"
            />
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEmployees.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon={<Users className="h-12 w-12 text-muted-foreground mb-4" />}
                title={searchTerm ? "Nenhum funcionário encontrado" : "Nenhum funcionário cadastrado"}
                description={
                  searchTerm
                    ? "Tente ajustar os termos de busca"
                    : "Cadastre seu primeiro funcionário para começar"
                }
              />
            </div>
          ) : (
            filteredEmployees.map((employee) => (
              <Card key={employee.id} className="group overflow-hidden">
                <div
                  className={`h-1.5 w-full ${
                    employee.status === "ativo" ? "bg-success" : "bg-muted"
                  }`}
                />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">
                        {employee.full_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground font-mono mt-1">
                        Mat: {employee.employee_id}
                      </p>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingEmployee(employee.id);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja remover o funcionário{" "}
                                  <strong>{employee.full_name}</strong>? Esta ação não
                                  pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(employee.id, employee.full_name)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant={employee.status === "ativo" ? "success" : "secondary"}
                    >
                      {employee.status === "ativo" ? "Ativo" : "Inativo"}
                    </Badge>
                    <Badge 
                      variant={
                        employee.role === "admin" 
                          ? "default" 
                          : employee.role === "supervisor" 
                            ? "secondary" 
                            : "outline"
                      }
                    >
                      {employee.role === "admin" 
                        ? "Admin" 
                        : employee.role === "supervisor" 
                          ? "Supervisor" 
                          : "Operador"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span className="truncate">{employee.email}</span>
                    </div>
                    {employee.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4 shrink-0" />
                        <span>{employee.phone}</span>
                      </div>
                    )}
                    {employee.department && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-4 w-4 shrink-0" />
                        <span>{employee.department}</span>
                      </div>
                    )}
                    {(employee.position || employee.job_function) && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Briefcase className="h-4 w-4 shrink-0" />
                        <span>{employee.position || employee.job_function}</span>
                      </div>
                    )}
                  </div>
                  
                  {(employee.badge_number || employee.hire_date) && (
                    <div className="pt-3 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
                      {employee.badge_number && (
                        <span>Crachá: {employee.badge_number}</span>
                      )}
                      {employee.hire_date && (
                        <span>
                          Admissão:{" "}
                          {new Date(employee.hire_date).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}