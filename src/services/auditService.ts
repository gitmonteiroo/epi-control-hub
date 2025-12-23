import { supabase } from "@/integrations/supabase/client";

export interface AuditLogData {
  acao: string;
  entidade: string;
  detalhes?: Record<string, any>;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string;
  acao: string;
  entidade: string;
  detalhes: Record<string, any> | null;
  created_at: string;
}

export const createAuditLog = async (data: AuditLogData): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn("Tentativa de criar log de auditoria sem usuário autenticado");
      return;
    }

    const { error } = await supabase
      .from("audit_logs")
      .insert({
        user_id: user.id,
        user_email: user.email || "email@desconhecido.com",
        acao: data.acao,
        entidade: data.entidade,
        detalhes: data.detalhes || null,
      });

    if (error) {
      console.error("Erro ao criar log de auditoria:", error);
    }
  } catch (error) {
    console.error("Erro ao criar log de auditoria:", error);
  }
};

export const fetchAuditLogs = async (filters?: {
  userId?: string;
  acao?: string;
  entidade?: string;
  startDate?: string;
  endDate?: string;
}): Promise<AuditLog[]> => {
  let query = supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.userId) {
    query = query.eq("user_id", filters.userId);
  }

  if (filters?.acao) {
    query = query.eq("acao", filters.acao);
  }

  if (filters?.entidade) {
    query = query.eq("entidade", filters.entidade);
  }

  if (filters?.startDate) {
    query = query.gte("created_at", filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte("created_at", filters.endDate + "T23:59:59");
  }

  const { data, error } = await query.limit(500);

  if (error) throw error;
  return (data || []) as AuditLog[];
};

export const fetchDistinctActions = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("acao")
    .limit(100);

  if (error) throw error;
  
  const uniqueActions = [...new Set((data || []).map(d => d.acao))];
  return uniqueActions;
};

export const fetchDistinctEntities = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("entidade")
    .limit(100);

  if (error) throw error;
  
  const uniqueEntities = [...new Set((data || []).map(d => d.entidade))];
  return uniqueEntities;
};
