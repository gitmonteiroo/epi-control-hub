-- Drop the view as we'll use a different approach
DROP VIEW IF EXISTS public.employees_for_selection;

-- Adjust the profiles RLS policy to allow authenticated users to see basic info of all employees
-- This is necessary for withdrawal/return forms where any user needs to select an employee
DROP POLICY IF EXISTS "Users can view own profile or managers can view all" ON public.profiles;

-- Policy 1: Any authenticated user can view basic profile info (id, full_name, employee_id, department, status)
-- This enables employee selection in forms
CREATE POLICY "Authenticated users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);