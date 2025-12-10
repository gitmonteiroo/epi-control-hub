import { supabase } from "@/integrations/supabase/client";

export interface Employee {
  id: string;
  full_name: string;
  employee_id: string;
  department?: string | null;
  job_function?: string | null;
  status?: string | null;
}

export async function fetchEmployees() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, employee_id")
    .order("full_name");

  if (error) throw error;
  return data as Employee[];
}

export async function fetchActiveEmployees() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, employee_id, department, job_function")
    .eq("status", "ativo")
    .order("full_name");

  if (error) throw error;
  return data as Employee[];
}
