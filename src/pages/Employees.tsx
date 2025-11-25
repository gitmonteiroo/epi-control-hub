import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface Employee {
  id: string;
  full_name: string;
  employee_id: string;
  department: string | null;
  position: string | null;
  email: string;
  role: "admin" | "operator";
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-3xl font-bold">Funcionários</h1>
          <p className="text-muted-foreground">Gestão de funcionários do sistema</p>
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
                    <CardTitle className="text-lg">{employee.full_name}</CardTitle>
                    <Badge variant={employee.role === "admin" ? "default" : "secondary"}>
                      {employee.role}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm"><strong>Matrícula:</strong> {employee.employee_id}</p>
                  <p className="text-sm"><strong>Email:</strong> {employee.email}</p>
                  {employee.department && (
                    <p className="text-sm"><strong>Setor:</strong> {employee.department}</p>
                  )}
                  {employee.position && (
                    <p className="text-sm"><strong>Cargo:</strong> {employee.position}</p>
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
