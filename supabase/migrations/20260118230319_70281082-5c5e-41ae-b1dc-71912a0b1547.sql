-- Fix the view to use SECURITY INVOKER instead of SECURITY DEFINER
-- This ensures RLS policies are respected
DROP VIEW IF EXISTS public.employees_for_selection;

CREATE VIEW public.employees_for_selection
WITH (security_invoker = true)
AS
SELECT 
  id,
  full_name,
  employee_id,
  department,
  job_function,
  status
FROM public.profiles
WHERE status = 'ativo';

-- Grant access to the view for authenticated users
GRANT SELECT ON public.employees_for_selection TO authenticated;

-- Add comment explaining purpose
COMMENT ON VIEW public.employees_for_selection IS 'View for employee selection in withdrawal/return forms. Contains only non-sensitive data.';