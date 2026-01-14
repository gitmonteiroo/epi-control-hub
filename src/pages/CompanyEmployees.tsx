import { useEffect, useState } from "react";
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
import { CompanyEmployeeForm } from "@/components/employees/CompanyEmployeeForm";
import { LoadingPage } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { UserRound, Plus, Edit, Trash2, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { createAuditLog } from "@/services/auditService";
import {
  fetchCompanyEmployees,
  deleteCompanyEmployee,
  type CompanyEmployee,
} from "@/services/companyEmployeeService";
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

export default function CompanyEmployees() {
  const [employees, setEmployees] = useState<CompanyEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { canManage, isAdmin } = useAuth();

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const data = await fetchCompanyEmployees();
      setEmployees(data);
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
      await deleteCompanyEmployee(id);

      await createAuditLog({
        acao: "Excluiu Funcionário da Empresa",
        entidade: "Funcionário",
        detalhes: { id, nome: name },
      });

      toast({
        title: "Sucesso",
        description: "Funcionário removido com sucesso",
      });
      loadEmployees();
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
    loadEmployees();
  };

  const filteredEmployees = employees.filter(
    (employee) =>
      employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (employee.department?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
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
          title="Funcionários da Empresa"
          description="Cadastro de colaboradores para registro de retiradas de EPIs"
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
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-lg overflow-y-auto sm:w-full">
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
                  <CompanyEmployeeForm
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
              placeholder="Buscar por nome, matrícula ou setor..."
              className="w-full sm:max-w-md"
            />
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredEmployees.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon={<UserRound className="h-12 w-12 text-muted-foreground mb-4" />}
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
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {employee.department && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span>{employee.department}</span>
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
