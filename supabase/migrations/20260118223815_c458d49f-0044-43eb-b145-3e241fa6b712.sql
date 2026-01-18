-- Fix security vulnerabilities in RLS policies

-- 1. Fix profiles table: Only allow admins to view all profiles, users can only view their own
DROP POLICY IF EXISTS "Users can view own profile or managers can view all" ON public.profiles;
CREATE POLICY "Users can view own profile or admins can view all" 
ON public.profiles 
FOR SELECT 
USING ((auth.uid() = id) OR has_role(auth.uid(), 'admin'::user_role));

-- 2. Fix company_employees table: Restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view company employees" ON public.company_employees;
CREATE POLICY "Authenticated users can view company employees" 
ON public.company_employees 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 3. Fix withdrawals table: Restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view withdrawals" ON public.withdrawals;
CREATE POLICY "Authenticated users can view withdrawals" 
ON public.withdrawals 
FOR SELECT 
USING (auth.uid() IS NOT NULL);