-- Add new columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS hire_date DATE,
ADD COLUMN IF NOT EXISTS badge_number TEXT,
ADD COLUMN IF NOT EXISTS job_function TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.hire_date IS 'Data de admissão do funcionário';
COMMENT ON COLUMN public.profiles.badge_number IS 'Número do crachá';
COMMENT ON COLUMN public.profiles.job_function IS 'Função específica do funcionário';