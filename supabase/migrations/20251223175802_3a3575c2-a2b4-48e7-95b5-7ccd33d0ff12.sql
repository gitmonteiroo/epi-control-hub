-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create new SELECT policy: users can view their own profile OR admins/supervisors can view all
CREATE POLICY "Users can view own profile or managers can view all"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR can_manage(auth.uid())
);