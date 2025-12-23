-- Drop the overly permissive INSERT policy that allows impersonation
DROP POLICY IF EXISTS "Anyone can insert withdrawals" ON public.withdrawals;

-- Create new INSERT policy: only admins and supervisors can register withdrawals
-- This makes sense because withdrawals are registered by managers on behalf of employees
CREATE POLICY "Managers can insert withdrawals"
ON public.withdrawals
FOR INSERT
WITH CHECK (can_manage(auth.uid()));