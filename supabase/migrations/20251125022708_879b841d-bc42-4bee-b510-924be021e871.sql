-- Fix security warnings by setting search_path for functions

-- Drop and recreate update_stock_on_withdrawal with proper search_path
DROP FUNCTION IF EXISTS update_stock_on_withdrawal() CASCADE;
CREATE OR REPLACE FUNCTION update_stock_on_withdrawal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE products
  SET stock_available = stock_available - NEW.quantity,
      updated_at = NOW()
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER trigger_update_stock_on_withdrawal
  AFTER INSERT ON withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_on_withdrawal();

-- Drop and recreate update_updated_at_column with proper search_path
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Drop and recreate handle_new_user with proper search_path
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, employee_id, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'employee_id', 'EMP' || SUBSTRING(NEW.id::text, 1, 8)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'operator')
  );
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();