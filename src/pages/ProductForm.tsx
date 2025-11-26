import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const productSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  category_id: z.string().min(1, "Categoria é obrigatória"),
  stock_available: z.coerce.number().min(0, "Estoque deve ser >= 0"),
  min_stock: z.coerce.number().min(0, "Estoque mínimo deve ser >= 0"),
  unit: z.string().min(1, "Unidade é obrigatória"),
});

type ProductFormData = z.infer<typeof productSchema>;

interface Category {
  id: string;
  name: string;
}

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const isEditing = !!id;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      category_id: "",
      stock_available: 0,
      min_stock: 10,
      unit: "UN",
    },
  });

  useEffect(() => {
    fetchCategories();
    if (isEditing) {
      fetchProduct();
    }
  }, [id]);

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("id, name").order("name");
    setCategories(data || []);
  };

  const fetchProduct = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Erro ao carregar produto");
      navigate("/products");
      return;
    }

    if (data) {
      form.reset({
        name: data.name,
        description: data.description || "",
        category_id: data.category_id || "",
        stock_available: data.stock_available,
        min_stock: data.min_stock,
        unit: data.unit,
      });
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true);
    try {
      const productData = {
        name: data.name,
        description: data.description || null,
        category_id: data.category_id,
        stock_available: data.stock_available,
        min_stock: data.min_stock,
        unit: data.unit,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", id);

        if (error) throw error;
        toast.success("Produto atualizado com sucesso");
      } else {
        const { error } = await supabase.from("products").insert(productData);
        if (error) throw error;
        toast.success("Produto cadastrado com sucesso");
      }
      navigate("/products");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar produto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/products")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isEditing ? "Editar Produto" : "Novo Produto"}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Atualize as informações do produto" : "Cadastre um novo produto no sistema"}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações do Produto</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Produto</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Capacete de Segurança" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descrição detalhada do produto..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="stock_available"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estoque Disponível</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="min_stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estoque Mínimo</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unidade</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="UN">Unidade (UN)</SelectItem>
                            <SelectItem value="CX">Caixa (CX)</SelectItem>
                            <SelectItem value="PC">Peça (PC)</SelectItem>
                            <SelectItem value="KG">Quilograma (KG)</SelectItem>
                            <SelectItem value="L">Litro (L)</SelectItem>
                            <SelectItem value="M">Metro (M)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-4 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/products")}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Salvando..." : isEditing ? "Atualizar Produto" : "Cadastrar Produto"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
