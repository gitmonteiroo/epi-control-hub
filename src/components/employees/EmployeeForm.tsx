import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { createAuditLog } from "@/services/auditService";

const employeeSchema = z.object({
  full_name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(100, "Nome muito longo"),
  employee_id: z.string().min(1, "Matrícula é obrigatória").max(50, "Matrícula muito longa"),
  email: z.string().email("Email inválido"),
  department: z.string().min(1, "Setor é obrigatório").max(100, "Setor muito longo"),
  position: z.string().min(1, "Cargo é obrigatório").max(100, "Cargo muito longo"),
  job_function: z.string().min(1, "Função é obrigatória").max(100, "Função muito longa"),
  badge_number: z.string().min(1, "Número do crachá é obrigatório").max(50, "Número muito longo"),
  hire_date: z.string().min(1, "Data de admissão é obrigatória"),
  phone: z.string().optional(),
  status: z.enum(["ativo", "inativo"], {
    required_error: "Status é obrigatório",
  }),
  role: z.enum(["admin", "operator", "supervisor"], {
    required_error: "Papel é obrigatório",
  }),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface EmployeeFormProps {
  employeeId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EmployeeForm({ employeeId, onSuccess, onCancel }: EmployeeFormProps) {
  const { toast } = useToast();
  const isEditing = !!employeeId;

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      full_name: "",
      employee_id: "",
      email: "",
      department: "",
      position: "",
      job_function: "",
      badge_number: "",
      hire_date: "",
      phone: "",
      status: "ativo",
      role: "operator",
    },
  });

  useEffect(() => {
    if (employeeId) {
      loadEmployee();
    }
  }, [employeeId]);

  const loadEmployee = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", employeeId)
        .single();

      if (error) throw error;

      if (data) {
        form.reset({
          full_name: data.full_name,
          employee_id: data.employee_id,
          email: data.email,
          department: data.department || "",
          position: data.position || "",
          job_function: data.job_function || "",
          badge_number: data.badge_number || "",
          hire_date: data.hire_date || "",
          phone: data.phone || "",
          status: (data.status as "ativo" | "inativo") || "ativo",
          role: data.role,
        });
      }
    } catch (error) {
      console.error("Erro ao carregar funcionário:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do funcionário",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (values: EmployeeFormValues) => {
    try {
      if (isEditing) {
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: values.full_name,
            employee_id: values.employee_id,
            email: values.email,
            department: values.department,
            position: values.position,
            job_function: values.job_function,
            badge_number: values.badge_number,
            hire_date: values.hire_date,
            phone: values.phone || null,
            status: values.status,
            role: values.role,
          })
          .eq("id", employeeId);

        if (error) throw error;

        await createAuditLog({
          acao: "Editou Funcionário",
          entidade: "Funcionário",
          detalhes: { id: employeeId, nome: values.full_name, matricula: values.employee_id },
        });

        toast({
          title: "Sucesso",
          description: "Funcionário atualizado com sucesso",
        });
      } else {
        // Para criar novo funcionário, precisamos primeiro criar o usuário no Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: values.email,
          password: values.employee_id, // Senha temporária = matrícula
          options: {
            data: {
              full_name: values.full_name,
              employee_id: values.employee_id,
              role: values.role,
            },
          },
        });

        if (authError) throw authError;

        if (authData.user) {
          // Atualizar o perfil criado automaticamente pelo trigger
          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              department: values.department,
              position: values.position,
              job_function: values.job_function,
              badge_number: values.badge_number,
              hire_date: values.hire_date,
              phone: values.phone || null,
              status: values.status,
            })
            .eq("id", authData.user.id);

          if (updateError) throw updateError;
        }

        await createAuditLog({
          acao: "Criou Funcionário",
          entidade: "Funcionário",
          detalhes: { nome: values.full_name, matricula: values.employee_id, email: values.email },
        });

        toast({
          title: "Sucesso",
          description: "Funcionário criado com sucesso. Senha temporária: matrícula do funcionário",
        });
      }

      onSuccess?.();
    } catch (error: any) {
      console.error("Erro ao salvar funcionário:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar o funcionário",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Completo *</FormLabel>
                <FormControl>
                  <Input placeholder="João Silva" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="employee_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Matrícula *</FormLabel>
                <FormControl>
                  <Input placeholder="EMP001" {...field} disabled={isEditing} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="joao@empresa.com" {...field} disabled={isEditing} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="badge_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número do Crachá *</FormLabel>
                <FormControl>
                  <Input placeholder="12345" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Setor *</FormLabel>
                <FormControl>
                  <Input placeholder="Produção" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cargo *</FormLabel>
                <FormControl>
                  <Input placeholder="Operador" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="job_function"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Função *</FormLabel>
                <FormControl>
                  <Input placeholder="Operador de Máquina" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hire_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Admissão *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input placeholder="(11) 98765-4321" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Papel *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o papel" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="operator">Operador</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-4 justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Atualizar" : "Criar"} Funcionário
          </Button>
        </div>
      </form>
    </Form>
  );
}