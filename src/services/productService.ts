import { supabase } from "@/integrations/supabase/client";

export interface Product {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  stock_available: number;
  min_stock: number;
  unit: string;
  ca_number: string | null;
  size: string | null;
  created_at: string;
  updated_at: string;
  category_id: string | null;
  categories?: { id: string; name: string } | null;
}

export interface ProductListItem {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  stock_available: number;
  min_stock: number;
  unit: string;
  categories: { id: string; name: string } | null;
}

export async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("id, code, name, description, stock_available, min_stock, unit, categories(id, name)")
    .order("name");

  if (error) throw error;
  return data as ProductListItem[];
}

export async function fetchProductById(id: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(id, name)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Product;
}

export async function fetchLowStockProducts(limit = 10) {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, stock_available, min_stock, unit, categories(name)")
    .order("stock_available", { ascending: true });

  if (error) throw error;

  return (data || [])
    .filter((p) => p.stock_available <= p.min_stock * 1.5)
    .slice(0, limit);
}
