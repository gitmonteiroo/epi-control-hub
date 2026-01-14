-- Create a trigger to automatically record withdrawals as stock movements
-- This ensures all stock movements (entries and exits) are tracked in one place

CREATE OR REPLACE FUNCTION create_stock_movement_on_withdrawal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert a stock movement record for the withdrawal
  -- Note: We don't update stock here because the existing trigger already does that
  INSERT INTO stock_movements (product_id, employee_id, type, quantity, notes, created_at)
  VALUES (
    NEW.product_id,
    NEW.employee_id,
    'saida',
    NEW.quantity,
    COALESCE(NEW.reason, 'Retirada de EPI'),
    NEW.created_at
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger that fires AFTER the withdrawal insert
-- We use AFTER so the withdrawal record is already created
CREATE TRIGGER trigger_create_stock_movement_on_withdrawal
  AFTER INSERT ON withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION create_stock_movement_on_withdrawal();

-- Now we need to modify the stock_movements trigger to NOT update stock for 'saida'
-- because the withdrawals trigger already handles stock updates
DROP TRIGGER IF EXISTS on_stock_movement ON stock_movements;

CREATE OR REPLACE FUNCTION update_stock_on_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only update stock for entries
  -- Exits (saida) from withdrawals are already handled by the withdrawal trigger
  IF NEW.type = 'entrada' THEN
    UPDATE products
    SET stock_available = stock_available + NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger with the updated function
CREATE TRIGGER on_stock_movement
  AFTER INSERT ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_on_entry();