import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Settings as SettingsIcon, Bell, Package, Palette, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface SystemSettings {
  defaultMinStock: number;
  criticalStockThreshold: number;
  lowStockNotifications: boolean;
  criticalStockNotifications: boolean;
  withdrawalNotifications: boolean;
  emailNotifications: boolean;
  theme: "light" | "dark" | "system";
  itemsPerPage: number;
}

const defaultSettings: SystemSettings = {
  defaultMinStock: 5,
  criticalStockThreshold: 0,
  lowStockNotifications: true,
  criticalStockNotifications: true,
  withdrawalNotifications: false,
  emailNotifications: false,
  theme: "light",
  itemsPerPage: 10,
};

export default function Settings() {
  const { profile, canManage } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem("system-settings");
    return saved ? JSON.parse(saved) : defaultSettings;
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem("system-settings", JSON.stringify(settings));
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    localStorage.removeItem("system-settings");
    toast.info("Configurações restauradas para o padrão");
  };

  const updateSetting = <K extends keyof SystemSettings>(
    key: K,
    value: SystemSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

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
                  value={settings.defaultMinStock}
                  onChange={(e) =>
                    updateSetting("defaultMinStock", parseInt(e.target.value) || 0)
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
                  value={settings.criticalStockThreshold}
                  onChange={(e) =>
                    updateSetting(
                      "criticalStockThreshold",
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
                  checked={settings.lowStockNotifications}
                  onCheckedChange={(checked) =>
                    updateSetting("lowStockNotifications", checked)
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
                  checked={settings.criticalStockNotifications}
                  onCheckedChange={(checked) =>
                    updateSetting("criticalStockNotifications", checked)
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
                  checked={settings.withdrawalNotifications}
                  onCheckedChange={(checked) =>
                    updateSetting("withdrawalNotifications", checked)
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
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) =>
                    updateSetting("emailNotifications", checked)
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
                  onValueChange={(value: "light" | "dark" | "system") =>
                    updateSetting("theme", value)
                  }
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
                  value={settings.itemsPerPage.toString()}
                  onValueChange={(value) =>
                    updateSetting("itemsPerPage", parseInt(value))
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
          <Button variant="outline" onClick={handleReset}>
            Restaurar Padrão
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
