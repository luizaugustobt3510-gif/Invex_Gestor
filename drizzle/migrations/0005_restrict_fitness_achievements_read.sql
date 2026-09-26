DROP POLICY IF EXISTS "Anyone authenticated reads achievements" ON public.fitness_achievements;
CREATE POLICY "Fitness members read achievements" ON public.fitness_achievements
FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.get_user_company_id(auth.uid()) = 'f54ebd25-21cc-43e8-888f-ffbbed1d4b7f'::uuid
);