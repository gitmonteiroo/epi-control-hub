import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { createAuditLog } from "@/services/auditService";
import { 
  fetchCompanyEmployeeById, 
  createCompanyEmployee, 
  updateCompanyEmployee 
} from "@/services/companyEmployeeService";

const DEPARTMENTS = [
  "Produção",
  "Logística",
  "Manutenção",
  "Administrativo",
  "Qualidade",
  "Segurança",
  "RH",
  "Almoxarifado",
  "Expedição",
  "Outro",
];

const companyEmployeeSchema = z.object({
  full_name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(100, "Nome muito longo"),
  employee_id: z.string().min(1, "Matrícula é obrigatória").max(50, "Matrícula muito longa"),
  department: z.string().optional(),
  status: z.enum(["ativo", "inativo"], {
    required_error: "Situação é obrigatória",
  }),
});

type CompanyEmployeeFormValues = z.infer<typeof companyEmployeeSchema>;

interface CompanyEmployeeFormProps {
  employeeId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CompanyEmployeeForm({ employeeId, onSuccess, onCancel }: CompanyEmployeeFormProps) {
  const { toast } = useToast();
  const isEditing = !!employeeId;

  const form = useForm<CompanyEmployeeFormValues>({
    resolver: zodResolver(companyEmployeeSchema),
    defaultValues: {
      full_name: "",
      employee_id: "",
      department: "",
      status: "ativo",
    },
  });

  useEffect(() => {
    if (employeeId) {
      loadEmployee();
    }
  }, [employeeId]);

  const loadEmployee = async () => {
    try {
      const data = await fetchCompanyEmployeeById(employeeId!);
      form.reset({
        full_name: data.full_name,
        employee_id: data.employee_id,
        department: data.department || "",
        status: data.status as "ativo" | "inativo",
      });
    } catch (error) {
      console.error("Erro ao carregar funcionário:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do funcionário",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (values: CompanyEmployeeFormValues) => {
    try {
      if (isEditing) {
        await updateCompanyEmployee(employeeId!, {
          full_name: values.full_name,
          department: values.department || null,
          status: values.status,
        });

        await createAuditLog({
          acao: "Editou Funcionário da Empresa",
          entidade: "Funcionário",
          detalhes: { id: employeeId, nome: values.full_name, matricula: values.employee_id },
        });

        toast({
          title: "Sucesso",
          description: "Funcionário atualizado com sucesso",
        });
      } else {
        await createCompanyEmployee({
          full_name: values.full_name,
          employee_id: values.employee_id,
          department: values.department || null,
          status: values.status,
        });

        await createAuditLog({
          acao: "Criou Funcionário da Empresa",
          entidade: "Funcionário",
          detalhes: { nome: values.full_name, matricula: values.employee_id },
        });

        toast({
          title: "Sucesso",
          description: "Funcionário cadastrado com sucesso",
        });
      }

      onSuccess?.();
    } catch (error: any) {
      console.error("Erro ao salvar funcionário:", error);
      
      // Check for unique constraint violation
      if (error.code === "23505") {
        toast({
          title: "Erro",
          description: "Já existe um funcionário com esta matrícula",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: error.message || "Não foi possível salvar o funcionário",
          variant: "destructive",
        });
      }
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
                <FormLabel>Matrícula / ID Interno *</FormLabel>
                <FormControl>
                  <Input placeholder="001234" {...field} disabled={isEditing} />
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
                <FormLabel>Setor</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Situação *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a situação" />
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
        </div>

        <div className="flex gap-4 justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Atualizar" : "Cadastrar"} Funcionário
          </Button>
        </div>
      </form>
    </Form>
  );
}
