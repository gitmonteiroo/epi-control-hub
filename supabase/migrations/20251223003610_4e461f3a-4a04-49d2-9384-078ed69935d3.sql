-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user can manage (admin or supervisor)
CREATE OR REPLACE FUNCTION public.can_manage(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role IN ('admin', 'supervisor')
  )
$$;

-- Drop existing policies that may cause recursion
DROP POLICY IF EXISTS "Admins and supervisors can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admins and supervisors can update categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;

DROP POLICY IF EXISTS "Admins and supervisors can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins and supervisors can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;

DROP POLICY IF EXISTS "Admins and supervisors can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;

-- Recreate policies using security definer functions
-- Categories policies
CREATE POLICY "Admins and supervisors can insert categories" 
ON public.categories 
FOR INSERT 
WITH CHECK (public.can_manage(auth.uid()));

CREATE POLICY "Admins and supervisors can update categories" 
ON public.categories 
FOR UPDATE 
USING (public.can_manage(auth.uid()));

CREATE POLICY "Admins can delete categories" 
ON public.categories 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Products policies
CREATE POLICY "Admins and supervisors can insert products" 
ON public.products 
FOR INSERT 
WITH CHECK (public.can_manage(auth.uid()));

CREATE POLICY "Admins and supervisors can update products" 
ON public.products 
FOR UPDATE 
USING (public.can_manage(auth.uid()));

CREATE POLICY "Admins can delete products" 
ON public.products 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Profiles policies
CREATE POLICY "Admins and supervisors can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (public.can_manage(auth.uid()));

CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Set admin@gmail.com as admin (if exists)
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'admin@gmail.com';