import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { fetchActiveEmployees, type Employee } from "@/services/employeeService";
import { createReturn } from "@/services/movementService";
import { EPI_CONDITIONS } from "@/utils/stock";
import { supabase } from "@/integrations/supabase/client";
import { createAuditLog } from "@/services/auditService";

const returnSchema = z.object({
  product_id: z.string().min(1, "Produto é obrigatório"),
  employee_id: z.string().min(1, "Funcionário é obrigatório"),
  quantity: z.coerce.number().min(1, "Quantidade deve ser >= 1"),
  reason: z.string().optional(),
  condition: z.string().min(1, "Condição é obrigatória"),
});

type ReturnFormData = z.infer<typeof returnSchema>;

interface Product {
  id: string;
  code: string | null;
  name: string;
  unit: string;
}

interface ReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: string;
  onSuccess?: () => void;
}

export function ReturnDialog({
  open,
  onOpenChange,
  productId,
  onSuccess,
}: ReturnDialogProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<ReturnFormData>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      product_id: productId || "",
      employee_id: "",
      quantity: 1,
      reason: "",
      condition: "bom",
    },
  });

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  useEffect(() => {
    if (productId) {
      form.setValue("product_id", productId);
    }
  }, [productId, form]);

  const loadData = async () => {
    try {
      const [employeesData, productsRes] = await Promise.all([
        fetchActiveEmployees(),
        supabase.from("products").select("id, code, name, unit").order("name"),
      ]);

      setEmployees(employeesData);
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const onSubmit = async (data: ReturnFormData) => {
    setLoading(true);
    try {
      const product = products.find(p => p.id === data.product_id);
      const employee = employees.find(e => e.id === data.employee_id);

      await createReturn({
        product_id: data.product_id,
        employee_id: data.employee_id,
        quantity: data.quantity,
        reason: data.reason || null,
        condition: data.condition,
      });

      await createAuditLog({
        acao: "Registrou Devolução",
        entidade: "Devolução",
        detalhes: {
          produto: product?.name,
          funcionario: employee?.full_name,
          quantidade: data.quantity,
          condicao: data.condition,
        },
      });

      toast.success("Devolução registrada com sucesso");
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro ao registrar devolução";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar Devolução de EPI</DialogTitle>
          <DialogDescription>
            Preencha os dados para registrar uma devolução de equipamento.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="product_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Produto</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o produto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.code ? `[${product.code}] ` : ""}
                          {product.name}
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
              name="employee_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Funcionário</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o funcionário" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.full_name} (Mat: {employee.employee_id})
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
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condição do EPI</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a condição" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EPI_CONDITIONS.map((condition) => (
                        <SelectItem
                          key={condition.value}
                          value={condition.value}
                        >
                          {condition.label}
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
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observação (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Devolução por término de contrato"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Registrando..." : "Registrar Devolução"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
