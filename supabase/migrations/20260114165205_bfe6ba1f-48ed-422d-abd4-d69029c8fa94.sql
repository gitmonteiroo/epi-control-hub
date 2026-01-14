-- Criar tabela de funcionários da empresa (sem login)
CREATE TABLE public.company_employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  employee_id TEXT NOT NULL UNIQUE,
  department TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_employees ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Anyone can view company employees" 
ON public.company_employees 
FOR SELECT 
USING (true);

CREATE POLICY "Managers can insert company employees" 
ON public.company_employees 
FOR INSERT 
WITH CHECK (can_manage(auth.uid()));

CREATE POLICY "Managers can update company employees" 
ON public.company_employees 
FOR UPDATE 
USING (can_manage(auth.uid()));

CREATE POLICY "Admins can delete company employees" 
ON public.company_employees 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_company_employees_updated_at
BEFORE UPDATE ON public.company_employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();