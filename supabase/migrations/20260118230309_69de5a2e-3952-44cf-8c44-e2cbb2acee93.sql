-- Create a view for employee selection in dropdowns (non-sensitive data only)
-- This allows any authenticated user to see basic employee info for withdrawals/returns
CREATE OR REPLACE VIEW public.employees_for_selection AS
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