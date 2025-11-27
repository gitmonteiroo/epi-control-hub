import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { Users, Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
  role: "admin" | "operator";
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<string | undefined>();
  const { toast } = useToast();

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

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) throw error;

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Funcionários</h1>
            <p className="text-muted-foreground">Gestão de funcionários do sistema</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingEmployee(undefined)}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Funcionário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingEmployee ? "Editar Funcionário" : "Novo Funcionário"}
                </DialogTitle>
              </DialogHeader>
              <EmployeeForm
                employeeId={editingEmployee}
                onSuccess={handleFormSuccess}
                onCancel={() => setDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {employees.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhum funcionário cadastrado</p>
              </CardContent>
            </Card>
          ) : (
            employees.map((employee) => (
              <Card key={employee.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{employee.full_name}</CardTitle>
                      <Badge 
                        variant={employee.status === "ativo" ? "default" : "secondary"}
                        className="mt-1"
                      >
                        {employee.status === "ativo" ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={employee.role === "admin" ? "default" : "secondary"}>
                        {employee.role}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingEmployee(employee.id);
                          setDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover o funcionário {employee.full_name}? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(employee.id)}>
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm"><strong>Matrícula:</strong> {employee.employee_id}</p>
                      <p className="text-sm"><strong>Email:</strong> {employee.email}</p>
                      {employee.phone && (
                        <p className="text-sm"><strong>Telefone:</strong> {employee.phone}</p>
                      )}
                    </div>
                    <div>
                      {employee.department && (
                        <p className="text-sm"><strong>Setor:</strong> {employee.department}</p>
                      )}
                      {employee.position && (
                        <p className="text-sm"><strong>Cargo:</strong> {employee.position}</p>
                      )}
                      {employee.job_function && (
                        <p className="text-sm"><strong>Função:</strong> {employee.job_function}</p>
                      )}
                    </div>
                  </div>
                  <div className="pt-2 border-t flex gap-4">
                    {employee.badge_number && (
                      <p className="text-sm"><strong>Crachá:</strong> {employee.badge_number}</p>
                    )}
                    {employee.hire_date && (
                      <p className="text-sm"><strong>Admissão:</strong> {new Date(employee.hire_date).toLocaleDateString('pt-BR')}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
