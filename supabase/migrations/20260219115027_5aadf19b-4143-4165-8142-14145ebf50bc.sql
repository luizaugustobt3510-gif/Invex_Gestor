
-- Function to check if initial setup is needed (bypasses RLS)
CREATE OR REPLACE FUNCTION public.check_setup_needed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.companies LIMIT 1);
$$;

-- Grant access to anon and authenticated
GRANT EXECUTE ON FUNCTION public.check_setup_needed() TO anon, authenticated;
