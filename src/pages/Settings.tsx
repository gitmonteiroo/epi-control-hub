import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Settings as SettingsIcon, Bell, Package, Palette, Save, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface UserSettings {
  default_min_stock: number;
  critical_stock_threshold: number;
  low_stock_notifications: boolean;
  critical_stock_notifications: boolean;
  withdrawal_notifications: boolean;
  email_notifications: boolean;
  theme: string;
  items_per_page: number;
}

const defaultSettings: UserSettings = {
  default_min_stock: 5,
  critical_stock_threshold: 0,
  low_stock_notifications: true,
  critical_stock_notifications: true,
  withdrawal_notifications: false,
  email_notifications: false,
  theme: "light",
  items_per_page: 10,
};

export default function Settings() {
  const { user, profile, canManage } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSettings, setHasSettings] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          default_min_stock: data.default_min_stock,
          critical_stock_threshold: data.critical_stock_threshold,
          low_stock_notifications: data.low_stock_notifications,
          critical_stock_notifications: data.critical_stock_notifications,
          withdrawal_notifications: data.withdrawal_notifications,
          email_notifications: data.email_notifications,
          theme: data.theme,
          items_per_page: data.items_per_page,
        });
        setHasSettings(true);
      } else {
        setSettings(defaultSettings);
        setHasSettings(false);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      if (hasSettings) {
        const { error } = await supabase
          .from("user_settings")
          .update({
            ...settings,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_settings")
          .insert({
            user_id: user.id,
            ...settings,
          });

        if (error) throw error;
        setHasSettings(true);
      }

      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      if (hasSettings) {
        const { error } = await supabase
          .from("user_settings")
          .update({
            ...defaultSettings,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);

        if (error) throw error;
      }

      setSettings(defaultSettings);
      toast.info("Configurações restauradas para o padrão");
    } catch (error) {
      console.error("Error resetting settings:", error);
      toast.error("Erro ao restaurar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <PageHeader
            title="Configurações"
            description="Gerencie as preferências do sistema"
          />
          <div className="grid gap-6 lg:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-60" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Configurações"
          description="Gerencie as preferências do sistema"
        />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Níveis de Estoque */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Níveis de Estoque</CardTitle>
              </div>
              <CardDescription>
                Configure os níveis padrão para alertas de estoque
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultMinStock">
                  Estoque mínimo padrão
                </Label>
                <Input
                  id="defaultMinStock"
                  type="number"
                  min={0}
                  value={settings.default_min_stock}
                  onChange={(e) =>
                    updateSetting("default_min_stock", parseInt(e.target.value) || 0)
                  }
                  disabled={!canManage}
                />
                <p className="text-xs text-muted-foreground">
                  Valor padrão ao criar novos produtos
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="criticalThreshold">
                  Limite de estoque crítico
                </Label>
                <Input
                  id="criticalThreshold"
                  type="number"
                  min={0}
                  value={settings.critical_stock_threshold}
                  onChange={(e) =>
                    updateSetting(
                      "critical_stock_threshold",
                      parseInt(e.target.value) || 0
                    )
                  }
                  disabled={!canManage}
                />
                <p className="text-xs text-muted-foreground">
                  Produtos com estoque igual ou abaixo serão marcados como críticos
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notificações */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Notificações</CardTitle>
              </div>
              <CardDescription>
                Configure os alertas e notificações do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Estoque baixo</Label>
                  <p className="text-xs text-muted-foreground">
                    Alertar quando produtos atingirem estoque baixo
                  </p>
                </div>
                <Switch
                  checked={settings.low_stock_notifications}
                  onCheckedChange={(checked) =>
                    updateSetting("low_stock_notifications", checked)
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Estoque crítico</Label>
                  <p className="text-xs text-muted-foreground">
                    Alertar quando produtos atingirem estoque crítico
                  </p>
                </div>
                <Switch
                  checked={settings.critical_stock_notifications}
                  onCheckedChange={(checked) =>
                    updateSetting("critical_stock_notifications", checked)
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Retiradas</Label>
                  <p className="text-xs text-muted-foreground">
                    Notificar sobre novas retiradas de EPIs
                  </p>
                </div>
                <Switch
                  checked={settings.withdrawal_notifications}
                  onCheckedChange={(checked) =>
                    updateSetting("withdrawal_notifications", checked)
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações por e-mail</Label>
                  <p className="text-xs text-muted-foreground">
                    Receber alertas importantes por e-mail
                  </p>
                </div>
                <Switch
                  checked={settings.email_notifications}
                  onCheckedChange={(checked) =>
                    updateSetting("email_notifications", checked)
                  }
                  disabled
                />
              </div>
            </CardContent>
          </Card>

          {/* Preferências Visuais */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Preferências Visuais</CardTitle>
              </div>
              <CardDescription>
                Personalize a aparência do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Tema</Label>
                <Select
                  value={settings.theme}
                  onValueChange={(value) => updateSetting("theme", value)}
                  disabled
                >
                  <SelectTrigger id="theme">
                    <SelectValue placeholder="Selecione o tema" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Claro</SelectItem>
                    <SelectItem value="dark">Escuro</SelectItem>
                    <SelectItem value="system">Sistema</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Em breve: suporte a tema escuro
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemsPerPage">Itens por página</Label>
                <Select
                  value={settings.items_per_page.toString()}
                  onValueChange={(value) =>
                    updateSetting("items_per_page", parseInt(value))
                  }
                >
                  <SelectTrigger id="itemsPerPage">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 itens</SelectItem>
                    <SelectItem value="10">10 itens</SelectItem>
                    <SelectItem value="20">20 itens</SelectItem>
                    <SelectItem value="50">50 itens</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Informações do Usuário */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Informações da Conta</CardTitle>
              </div>
              <CardDescription>
                Dados do seu perfil de usuário
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Nome</Label>
                  <p className="text-sm font-medium">{profile?.full_name || "-"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">E-mail</Label>
                  <p className="text-sm font-medium">{profile?.email || "-"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Matrícula</Label>
                  <p className="text-sm font-medium">{profile?.employee_id || "-"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Função</Label>
                  <p className="text-sm font-medium capitalize">{profile?.role || "-"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Departamento</Label>
                  <p className="text-sm font-medium">{profile?.department || "-"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Cargo</Label>
                  <p className="text-sm font-medium">{profile?.position || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ações */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            Restaurar Padrão
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isSaving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
