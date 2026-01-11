-- Fix: Audit Logs Lack User Identity Validation
-- Drop the permissive policy that allows inserting with any user_id
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

-- Create restrictive policy enforcing user_id must match authenticated user
CREATE POLICY "Users can insert own audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);