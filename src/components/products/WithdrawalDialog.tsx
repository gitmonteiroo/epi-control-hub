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
import { fetchEmployees, type Employee } from "@/services/employeeService";
import { createWithdrawal } from "@/services/movementService";
import { WITHDRAWAL_REASONS } from "@/utils/stock";
import { supabase } from "@/integrations/supabase/client";
import { createAuditLog } from "@/services/auditService";

const withdrawalSchema = z.object({
  product_id: z.string().min(1, "Produto é obrigatório"),
  employee_id: z.string().min(1, "Funcionário é obrigatório"),
  quantity: z.coerce.number().min(1, "Quantidade deve ser >= 1"),
  reason: z.string().min(1, "Motivo é obrigatório"),
});

type WithdrawalFormData = z.infer<typeof withdrawalSchema>;

interface Product {
  id: string;
  code: string | null;
  name: string;
  stock_available: number;
  unit: string;
}

interface WithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: string;
  onSuccess?: () => void;
}

export function WithdrawalDialog({
  open,
  onOpenChange,
  productId,
  onSuccess,
}: WithdrawalDialogProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const form = useForm<WithdrawalFormData>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      product_id: productId || "",
      employee_id: "",
      quantity: 1,
      reason: "uso_trabalho",
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

  useEffect(() => {
    const productIdValue = form.watch("product_id");
    const product = products.find((p) => p.id === productIdValue);
    setSelectedProduct(product || null);
  }, [form.watch("product_id"), products]);

  const loadData = async () => {
    try {
      const [employeesData, productsRes] = await Promise.all([
        fetchEmployees(),
        supabase
          .from("products")
          .select("id, code, name, stock_available, unit")
          .order("name"),
      ]);

      setEmployees(employeesData);
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const onSubmit = async (data: WithdrawalFormData) => {
    if (!selectedProduct) {
      toast.error("Selecione um produto");
      return;
    }

    if (data.quantity > selectedProduct.stock_available) {
      toast.error(
        `Quantidade indisponível. Estoque atual: ${selectedProduct.stock_available} ${selectedProduct.unit}`
      );
      return;
    }

    setLoading(true);
    try {
      await createWithdrawal({
        product_id: data.product_id,
        employee_id: data.employee_id,
        quantity: data.quantity,
        reason: data.reason,
      });

      const employee = employees.find(e => e.id === data.employee_id);
      await createAuditLog({
        acao: "Registrou Retirada",
        entidade: "Retirada",
        detalhes: {
          produto: selectedProduct?.name,
          funcionario: employee?.full_name,
          quantidade: data.quantity,
          motivo: data.reason,
        },
      });

      toast.success("Retirada registrada com sucesso");
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro ao registrar retirada";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar Retirada de EPI</DialogTitle>
          <DialogDescription>
            Preencha os dados para registrar uma nova retirada de equipamento.
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
                          {product.name} ({product.stock_available}{" "}
                          {product.unit} disponíveis)
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
                    <Input
                      type="number"
                      min="1"
                      max={selectedProduct?.stock_available || 999999}
                      {...field}
                    />
                  </FormControl>
                  {selectedProduct && (
                    <p className="text-sm text-muted-foreground">
                      Disponível: {selectedProduct.stock_available}{" "}
                      {selectedProduct.unit}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo da Retirada</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o motivo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {WITHDRAWAL_REASONS.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                {loading ? "Registrando..." : "Registrar Retirada"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
