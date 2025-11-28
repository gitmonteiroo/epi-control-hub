import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const withdrawalSchema = z.object({
  product_id: z.string().min(1, "Produto é obrigatório"),
  employee_id: z.string().min(1, "Funcionário é obrigatório"),
  quantity: z.coerce.number().min(1, "Quantidade deve ser >= 1"),
  reason: z.string().min(1, "Motivo é obrigatório"),
});

type WithdrawalFormData = z.infer<typeof withdrawalSchema>;

interface Employee {
  id: string;
  full_name: string;
  employee_id: string;
}

interface Product {
  id: string;
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

export function WithdrawalDialog({ open, onOpenChange, productId, onSuccess }: WithdrawalDialogProps) {
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
      fetchEmployees();
      fetchProducts();
    }
  }, [open]);

  useEffect(() => {
    if (productId) {
      form.setValue("product_id", productId);
    }
  }, [productId]);

  useEffect(() => {
    const product = products.find(p => p.id === form.watch("product_id"));
    setSelectedProduct(product || null);
  }, [form.watch("product_id"), products]);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, employee_id")
      .order("full_name");
    setEmployees(data || []);
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name, stock_available, unit")
      .order("name");
    setProducts(data || []);
  };

  const onSubmit = async (data: WithdrawalFormData) => {
    if (!selectedProduct) {
      toast.error("Selecione um produto");
      return;
    }

    if (data.quantity > selectedProduct.stock_available) {
      toast.error(`Quantidade indisponível. Estoque atual: ${selectedProduct.stock_available} ${selectedProduct.unit}`);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("withdrawals").insert({
        product_id: data.product_id,
        employee_id: data.employee_id,
        quantity: data.quantity,
        reason: data.reason,
      });

      if (error) throw error;

      toast.success("Retirada registrada com sucesso");
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Erro ao registrar retirada");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar Retirada de EPI</DialogTitle>
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
                          {product.name} ({product.stock_available} {product.unit} disponíveis)
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
                      Disponível: {selectedProduct.stock_available} {selectedProduct.unit}
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
                      <SelectItem value="uso_trabalho">Uso no Trabalho</SelectItem>
                      <SelectItem value="treinamento">Treinamento</SelectItem>
                      <SelectItem value="substituicao">Substituição (Dano/Perda)</SelectItem>
                      <SelectItem value="manutencao">Manutenção</SelectItem>
                      <SelectItem value="primeiro_fornecimento">Primeiro Fornecimento</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
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
