import { supabase } from "@/integrations/supabase/client";

export interface WithdrawalData {
  product_id: string;
  employee_id: string;
  quantity: number;
  reason: string;
}

export interface ReturnData {
  product_id: string;
  employee_id: string;
  quantity: number;
  reason?: string | null;
  condition: string;
}

export interface Withdrawal {
  id: string;
  quantity: number;
  reason: string | null;
  created_at: string;
  profiles: { full_name: string; employee_id: string } | null;
}

export interface Return {
  id: string;
  quantity: number;
  reason: string | null;
  condition: string | null;
  created_at: string;
  profiles: { full_name: string; employee_id: string } | null;
}

export async function createWithdrawal(data: WithdrawalData) {
  const { error } = await supabase.from("withdrawals").insert(data);
  if (error) throw error;
}

export async function createReturn(data: ReturnData) {
  const { error } = await supabase.from("returns").insert(data);
  if (error) throw error;
}

export async function fetchWithdrawalsByProduct(productId: string, limit = 10) {
  const { data, error } = await supabase
    .from("withdrawals")
    .select("id, quantity, reason, created_at, profiles(full_name, employee_id)")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as Withdrawal[];
}

export async function fetchReturnsByProduct(productId: string, limit = 10) {
  const { data, error } = await supabase
    .from("returns")
    .select("id, quantity, reason, condition, created_at, profiles(full_name, employee_id)")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as Return[];
}

export async function fetchTodayWithdrawalsCount() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("withdrawals")
    .select("*", { count: "exact", head: true })
    .gte("created_at", today.toISOString());

  if (error) throw error;
  return count || 0;
}
