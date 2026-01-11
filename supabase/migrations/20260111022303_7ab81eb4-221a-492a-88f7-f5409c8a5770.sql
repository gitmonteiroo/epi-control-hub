-- Drop the restrictive policy that only allows managers to insert
DROP POLICY IF EXISTS "Managers can insert withdrawals" ON public.withdrawals;

-- Create a new policy that allows all authenticated users to insert withdrawals
CREATE POLICY "Authenticated users can insert withdrawals" 
ON public.withdrawals 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);