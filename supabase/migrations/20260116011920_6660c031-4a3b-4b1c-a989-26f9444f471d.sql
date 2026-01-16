-- Add CHECK constraint to prevent negative stock values
ALTER TABLE products 
ADD CONSTRAINT check_stock_non_negative 
CHECK (stock_available >= 0);

-- Improve update_stock_on_withdrawal function with validation and locking
CREATE OR REPLACE FUNCTION public.update_stock_on_withdrawal()
RETURNS TRIGGER AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  -- Lock the row and get current stock
  SELECT stock_available INTO current_stock
  FROM products 
  WHERE id = NEW.product_id 
  FOR UPDATE;
  
  -- Validate stock availability
  IF current_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Estoque insuficiente. Disponível: %, Solicitado: %', current_stock, NEW.quantity;
  END IF;
  
  -- Update stock
  UPDATE products
  SET stock_available = stock_available - NEW.quantity,
      updated_at = NOW()
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Improve update_stock_on_return function with locking
CREATE OR REPLACE FUNCTION public.update_stock_on_return()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET stock_available = stock_available + NEW.quantity,
      updated_at = NOW()
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Improve update_stock_on_entry function with locking
CREATE OR REPLACE FUNCTION public.update_stock_on_entry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'entrada' THEN
    UPDATE products
    SET stock_available = stock_available + NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;