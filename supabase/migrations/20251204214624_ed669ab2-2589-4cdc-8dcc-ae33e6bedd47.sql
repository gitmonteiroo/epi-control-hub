-- Add CA number and size fields to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS ca_number text,
ADD COLUMN IF NOT EXISTS size text;

-- Create returns table for EPI returns
CREATE TABLE public.returns (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id),
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  quantity integer NOT NULL,
  reason text,
  condition text DEFAULT 'bom',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on returns table
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

-- Create policies for returns
CREATE POLICY "Anyone can view returns" 
ON public.returns 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert returns" 
ON public.returns 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger to update stock on return
CREATE OR REPLACE FUNCTION public.update_stock_on_return()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE products
  SET stock_available = stock_available + NEW.quantity,
      updated_at = NOW()
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_return_insert
AFTER INSERT ON public.returns
FOR EACH ROW
EXECUTE FUNCTION public.update_stock_on_return();