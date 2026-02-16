
-- ==========================================
-- INVEX 5.0 - Multi-tenant Database Schema
-- ==========================================

-- 1. Role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin_empresa', 'usuario_almox', 'solicitante');

-- 2. Companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 4. User roles table (separate from profiles as required)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'solicitante',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- 5. Sectors table
CREATE TABLE public.sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Materials table
CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  material TEXT NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'UNIDADE',
  localizacao TEXT DEFAULT '',
  validade DATE,
  quantidade NUMERIC NOT NULL DEFAULT 0,
  minimo NUMERIC NOT NULL DEFAULT 0,
  maximo NUMERIC NOT NULL DEFAULT 0,
  preco NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, codigo)
);

-- 7. Stock movements table
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  quantidade NUMERIC NOT NULL,
  obs TEXT DEFAULT '',
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Purchase orders table
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  setor TEXT NOT NULL,
  fornecedor TEXT NOT NULL,
  cond_pagto TEXT NOT NULL,
  obs TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pendente',
  total NUMERIC(12,2) DEFAULT 0,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Purchase order items table
CREATE TABLE public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  material TEXT NOT NULL,
  unidade TEXT DEFAULT '',
  quantidade NUMERIC NOT NULL,
  preco NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Material requests table
CREATE TABLE public.material_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  setor TEXT NOT NULL,
  codigo TEXT NOT NULL,
  material TEXT NOT NULL,
  quantidade NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pendente',
  obs TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- SECURITY DEFINER HELPER FUNCTIONS
-- ==========================================

-- Check if user has a specific role (global, any company)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- Check if user is member of a company
CREATE OR REPLACE FUNCTION public.is_company_member(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND (company_id = _company_id OR role = 'super_admin')
  )
$$;

-- Check if user is admin of a company (admin_empresa or super_admin)
CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND (
      role = 'super_admin' OR (company_id = _company_id AND role = 'admin_empresa')
    )
  )
$$;

-- Get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.user_roles
  WHERE user_id = _user_id AND company_id IS NOT NULL
  LIMIT 1
$$;

-- Get user's role for a company
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID, _company_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id AND (company_id = _company_id OR role = 'super_admin')
  ORDER BY CASE role WHEN 'super_admin' THEN 1 WHEN 'admin_empresa' THEN 2 WHEN 'usuario_almox' THEN 3 ELSE 4 END
  LIMIT 1
$$;

-- ==========================================
-- ENABLE RLS ON ALL TABLES
-- ==========================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_requests ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- COMPANIES
CREATE POLICY "Super admin full access to companies" ON public.companies
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Members can view their company" ON public.companies
  FOR SELECT USING (public.is_company_member(auth.uid(), id));

-- PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Super admin full access to profiles" ON public.profiles
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Company members can view profiles" ON public.profiles
  FOR SELECT USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "System can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- USER ROLES
CREATE POLICY "Super admin full access to roles" ON public.user_roles
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Company admins can manage roles" ON public.user_roles
  FOR SELECT USING (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (
    public.is_company_admin(auth.uid(), company_id) AND role != 'super_admin'
  );

CREATE POLICY "Company admins can update roles" ON public.user_roles
  FOR UPDATE USING (
    public.is_company_admin(auth.uid(), company_id) AND role != 'super_admin'
  );

CREATE POLICY "Company admins can delete roles" ON public.user_roles
  FOR DELETE USING (
    public.is_company_admin(auth.uid(), company_id) AND role != 'super_admin'
  );

-- SECTORS
CREATE POLICY "Super admin full access to sectors" ON public.sectors
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Company members can view sectors" ON public.sectors
  FOR SELECT USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company admins can manage sectors" ON public.sectors
  FOR INSERT WITH CHECK (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins can update sectors" ON public.sectors
  FOR UPDATE USING (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins can delete sectors" ON public.sectors
  FOR DELETE USING (public.is_company_admin(auth.uid(), company_id));

-- MATERIALS
CREATE POLICY "Super admin full access to materials" ON public.materials
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Company members can view materials" ON public.materials
  FOR SELECT USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company admins can insert materials" ON public.materials
  FOR INSERT WITH CHECK (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins can update materials" ON public.materials
  FOR UPDATE USING (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins can delete materials" ON public.materials
  FOR DELETE USING (public.is_company_admin(auth.uid(), company_id));

-- STOCK MOVEMENTS
CREATE POLICY "Super admin full access to movements" ON public.stock_movements
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Company members can view movements" ON public.stock_movements
  FOR SELECT USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company members can insert movements" ON public.stock_movements
  FOR INSERT WITH CHECK (public.is_company_member(auth.uid(), company_id));

-- PURCHASE ORDERS
CREATE POLICY "Super admin full access to orders" ON public.purchase_orders
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Company members can view orders" ON public.purchase_orders
  FOR SELECT USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company admins can manage orders" ON public.purchase_orders
  FOR INSERT WITH CHECK (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins can update orders" ON public.purchase_orders
  FOR UPDATE USING (public.is_company_admin(auth.uid(), company_id));

-- PURCHASE ORDER ITEMS
CREATE POLICY "Super admin full access to order items" ON public.purchase_order_items
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Company members can view order items" ON public.purchase_order_items
  FOR SELECT USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company admins can manage order items" ON public.purchase_order_items
  FOR INSERT WITH CHECK (public.is_company_admin(auth.uid(), company_id));

-- MATERIAL REQUESTS
CREATE POLICY "Super admin full access to requests" ON public.material_requests
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Company members can view requests" ON public.material_requests
  FOR SELECT USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company members can create requests" ON public.material_requests
  FOR INSERT WITH CHECK (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company admins can update requests" ON public.material_requests
  FOR UPDATE USING (public.is_company_admin(auth.uid(), company_id));

-- ==========================================
-- TRIGGERS
-- ==========================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sectors_updated_at BEFORE UPDATE ON public.sectors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_material_requests_updated_at BEFORE UPDATE ON public.material_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, nome)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_company_id ON public.user_roles(company_id);
CREATE INDEX idx_sectors_company_id ON public.sectors(company_id);
CREATE INDEX idx_materials_company_id ON public.materials(company_id);
CREATE INDEX idx_materials_codigo ON public.materials(company_id, codigo);
CREATE INDEX idx_stock_movements_company_id ON public.stock_movements(company_id);
CREATE INDEX idx_stock_movements_material_id ON public.stock_movements(material_id);
CREATE INDEX idx_purchase_orders_company_id ON public.purchase_orders(company_id);
CREATE INDEX idx_material_requests_company_id ON public.material_requests(company_id);
CREATE INDEX idx_material_requests_user_id ON public.material_requests(user_id);
