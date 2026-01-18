-- Fix profiles table: Allow users to see their own profile, and managers (admin/supervisor) to see all profiles
-- This is necessary for employee management functionality while restricting operators from seeing other employees' personal data

DROP POLICY IF EXISTS "Users can view own profile or admins can view all" ON public.profiles;
CREATE POLICY "Users can view own profile or managers can view all" 
ON public.profiles 
FOR SELECT 
USING ((auth.uid() = id) OR can_manage(auth.uid()));