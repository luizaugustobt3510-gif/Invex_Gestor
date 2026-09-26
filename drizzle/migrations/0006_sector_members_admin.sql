CREATE TABLE public.sector_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sector_id uuid NOT NULL REFERENCES public.sectors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sector_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sector_members TO authenticated;
GRANT ALL ON public.sector_members TO service_role;
ALTER TABLE public.sector_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_sector_admin(_user_id uuid, _sector_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.sector_members sm
    WHERE sm.user_id = _user_id AND sm.sector_id = _sector_id AND sm.is_admin
      AND public.is_company_member(_user_id, sm.company_id))
$$;

CREATE OR REPLACE FUNCTION public.is_sector_admin_of_user(_admin uuid, _target uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _target IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.sector_members a
    JOIN public.sector_members t ON t.sector_id = a.sector_id
    WHERE a.user_id = _admin AND a.is_admin AND t.user_id = _target
      AND a.company_id = _company_id AND t.company_id = _company_id
      AND public.is_company_member(_admin, _company_id))
$$;

CREATE POLICY "Members view sector members" ON public.sector_members FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Company admins manage sector members" ON public.sector_members FOR ALL TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_company_admin(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Sector admins manage own sector members" ON public.sector_members FOR ALL TO authenticated
  USING (public.is_sector_admin(auth.uid(), sector_id) AND user_id <> auth.uid())
  WITH CHECK (public.is_sector_admin(auth.uid(), sector_id) AND is_admin = false AND user_id <> auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = sector_members.user_id AND p.company_id = sector_members.company_id));

-- Estoque do setor: dispensações da equipe
CREATE POLICY "Sector admins update team dispensations" ON public.material_dispensations FOR UPDATE TO authenticated
  USING (public.is_sector_admin_of_user(auth.uid(), user_id, company_id))
  WITH CHECK (public.is_sector_admin_of_user(auth.uid(), user_id, company_id));
CREATE POLICY "Sector admins delete team dispensations" ON public.material_dispensations FOR DELETE TO authenticated
  USING (public.is_sector_admin_of_user(auth.uid(), user_id, company_id));

-- Clínica: anamneses da equipe
CREATE POLICY "Sector admins delete team anamneses" ON public.anamneses FOR DELETE TO authenticated
  USING (public.is_sector_admin_of_user(auth.uid(), created_by, company_id));

-- Assinaturas da equipe
CREATE POLICY "Sector admins view team signatures" ON public.user_signatures FOR SELECT TO authenticated
  USING (public.is_sector_admin_of_user(auth.uid(), user_id, company_id)
    OR (sector_id IS NOT NULL AND public.is_sector_admin(auth.uid(), sector_id)));
CREATE POLICY "Sector admins update team signatures" ON public.user_signatures FOR UPDATE TO authenticated
  USING (public.is_sector_admin_of_user(auth.uid(), user_id, company_id)
    OR (sector_id IS NOT NULL AND public.is_sector_admin(auth.uid(), sector_id)))
  WITH CHECK (public.is_sector_admin_of_user(auth.uid(), user_id, company_id)
    OR (sector_id IS NOT NULL AND public.is_sector_admin(auth.uid(), sector_id)));