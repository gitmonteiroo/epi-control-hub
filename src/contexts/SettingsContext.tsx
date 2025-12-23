import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

export interface UserSettings {
  default_min_stock: number;
  critical_stock_threshold: number;
  low_stock_notifications: boolean;
  critical_stock_notifications: boolean;
  withdrawal_notifications: boolean;
  email_notifications: boolean;
  items_per_page: number;
}

const defaultSettings: UserSettings = {
  default_min_stock: 5,
  critical_stock_threshold: 0,
  low_stock_notifications: true,
  critical_stock_notifications: true,
  withdrawal_notifications: false,
  email_notifications: false,
  items_per_page: 10,
};

interface SettingsContextType {
  settings: UserSettings;
  isLoading: boolean;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  refetch: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSettings, setHasSettings] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(defaultSettings);
      setIsLoading(false);
      return;
    }

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
          items_per_page: data.items_per_page,
        });
        setHasSettings(true);
      } else {
        setSettings(defaultSettings);
        setHasSettings(false);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      setSettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) return;

    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    try {
      if (hasSettings) {
        const { error } = await supabase
          .from("user_settings")
          .update({
            ...updatedSettings,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_settings")
          .insert({
            user_id: user.id,
            ...updatedSettings,
          });

        if (error) throw error;
        setHasSettings(true);
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      // Revert on error
      await fetchSettings();
      throw error;
    }
  };

  const resetSettings = async () => {
    if (!user) return;

    setSettings(defaultSettings);

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
    } catch (error) {
      console.error("Error resetting settings:", error);
      await fetchSettings();
      throw error;
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoading,
        updateSettings,
        resetSettings,
        refetch: fetchSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
