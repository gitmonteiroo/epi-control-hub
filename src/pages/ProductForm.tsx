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
import { createAuditLog } from "@/services/auditService";

const productSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  category_id: z.string().min(1, "Categoria é obrigatória"),
  stock_available: z.coerce.number().min(0, "Estoque deve ser >= 0"),
  min_stock: z.coerce.number().min(0, "Estoque mínimo deve ser >= 0"),
  unit: z.string().min(1, "Unidade é obrigatória"),
  ca_number: z.string().optional(),
  size: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface Category {
  id: string;
  name: string;
}

const SIZES = ["PP", "P", "M", "G", "GG", "XG", "XXG", "34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "Único"];

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const isEditing = !!id;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      category_id: "",
      stock_available: 0,
      min_stock: 5,
      unit: "UN",
      ca_number: "",
      size: "",
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
        code: data.code || "",
        name: data.name,
        description: data.description || "",
        category_id: data.category_id || "",
        stock_available: data.stock_available,
        min_stock: data.min_stock,
        unit: data.unit,
        ca_number: data.ca_number || "",
        size: data.size || "",
      });
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true);
    try {
      const productData = {
        code: data.code || null,
        name: data.name,
        description: data.description || null,
        category_id: data.category_id,
        stock_available: data.stock_available,
        min_stock: data.min_stock,
        unit: data.unit,
        ca_number: data.ca_number || null,
        size: data.size || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", id);

        if (error) throw error;
        await createAuditLog({
          acao: "Editou EPI",
          entidade: "EPI",
          detalhes: { id, nome: data.name, codigo: data.code },
        });
        toast.success("Produto atualizado com sucesso");
      } else {
        const { data: insertedData, error } = await supabase.from("products").insert(productData).select().single();
        if (error) throw error;
        await createAuditLog({
          acao: "Criou EPI",
          entidade: "EPI",
          detalhes: { id: insertedData?.id, nome: data.name, codigo: data.code },
        });
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
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="EPI-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ca_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CA (Certificado de Aprovação)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tamanho</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tamanho" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SIZES.map((size) => (
                          <SelectItem key={size} value={size}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
