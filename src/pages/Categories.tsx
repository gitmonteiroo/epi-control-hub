import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, FolderTree } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", color: "#6366f1" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Erro ao carregar categorias");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (selectedCategory) {
        const { error } = await supabase
          .from("categories")
          .update(formData)
          .eq("id", selectedCategory.id);

        if (error) throw error;
        toast.success("Categoria atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("categories")
          .insert([formData]);

        if (error) throw error;
        toast.success("Categoria criada com sucesso!");
      }

      setDialogOpen(false);
      setFormData({ name: "", description: "", color: "#6366f1" });
      setSelectedCategory(null);
      fetchCategories();
    } catch (error: any) {
      console.error("Error saving category:", error);
      toast.error(error.message || "Erro ao salvar categoria");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", selectedCategory.id);

      if (error) throw error;
      toast.success("Categoria excluída com sucesso!");
      setDeleteDialogOpen(false);
      setSelectedCategory(null);
      fetchCategories();
    } catch (error: any) {
      console.error("Error deleting category:", error);
      if (error.code === "23503") {
        toast.error("Não é possível excluir categoria com produtos vinculados");
      } else {
        toast.error("Erro ao excluir categoria");
      }
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (category: Category) => {
    setSelectedCategory(category);
    setFormData({ name: category.name, description: category.description || "", color: category.color || "#6366f1" });
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    setSelectedCategory(null);
    setFormData({ name: "", description: "", color: "#6366f1" });
    setDialogOpen(true);
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
            <h1 className="text-3xl font-bold text-foreground">Categorias</h1>
            <p className="text-muted-foreground">Organize seus produtos por categoria</p>
          </div>
          <Button onClick={openNewDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Categoria
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderTree className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhuma categoria cadastrada</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Cadastre sua primeira categoria
                </p>
                <Button onClick={openNewDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Categoria
                </Button>
              </CardContent>
            </Card>
          ) : (
            categories.map((category) => (
              <Card key={category.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full border-2 border-border" 
                        style={{ backgroundColor: category.color || "#6366f1" }}
                      />
                      <span className="text-lg">{category.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => openEditDialog(category)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          setSelectedCategory(category);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {category.description || "Sem descrição"}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCategory ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
            <DialogDescription>
              {selectedCategory
                ? "Atualize as informações da categoria"
                : "Preencha os dados da nova categoria"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={saving}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Cor</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  disabled={saving}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  disabled={saving}
                  placeholder="#6366f1"
                  className="flex-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria "{selectedCategory?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              {saving ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
