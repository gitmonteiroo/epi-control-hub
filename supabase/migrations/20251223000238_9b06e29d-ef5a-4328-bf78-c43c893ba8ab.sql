-- Atualizar políticas de produtos para incluir supervisor
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Admins and supervisors can insert products" 
ON public.products 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'supervisor')
));

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins and supervisors can update products" 
ON public.products 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'supervisor')
));

-- Atualizar políticas de categorias para incluir supervisor
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
CREATE POLICY "Admins and supervisors can insert categories" 
ON public.categories 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'supervisor')
));

DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins and supervisors can update categories" 
ON public.categories 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'supervisor')
));

-- Atualizar políticas de perfis para incluir supervisor
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins and supervisors can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles profiles_1
  WHERE profiles_1.id = auth.uid() 
  AND profiles_1.role IN ('admin', 'supervisor')
));