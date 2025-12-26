-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view stock movements" ON public.stock_movements;

-- Create a new restrictive policy: only managers and supervisors can view stock movements
CREATE POLICY "Managers can view stock movements"
ON public.stock_movements
FOR SELECT
USING (can_manage(auth.uid()));