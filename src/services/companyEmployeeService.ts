import { supabase } from "@/integrations/supabase/client";

export interface CompanyEmployee {
  id: string;
  full_name: string;
  employee_id: string;
  department: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function fetchCompanyEmployees() {
  const { data, error } = await supabase
    .from("company_employees")
    .select("*")
    .order("full_name");

  if (error) throw error;
  return data as CompanyEmployee[];
}

export async function fetchActiveCompanyEmployees() {
  const { data, error } = await supabase
    .from("company_employees")
    .select("*")
    .eq("status", "ativo")
    .order("full_name");

  if (error) throw error;
  return data as CompanyEmployee[];
}

export async function fetchCompanyEmployeeById(id: string) {
  const { data, error } = await supabase
    .from("company_employees")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as CompanyEmployee;
}

export async function createCompanyEmployee(employee: Omit<CompanyEmployee, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("company_employees")
    .insert(employee)
    .select()
    .single();

  if (error) throw error;
  return data as CompanyEmployee;
}

export async function updateCompanyEmployee(id: string, employee: Partial<Omit<CompanyEmployee, "id" | "created_at" | "updated_at">>) {
  const { data, error } = await supabase
    .from("company_employees")
    .update(employee)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as CompanyEmployee;
}

export async function deleteCompanyEmployee(id: string) {
  const { error } = await supabase
    .from("company_employees")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
