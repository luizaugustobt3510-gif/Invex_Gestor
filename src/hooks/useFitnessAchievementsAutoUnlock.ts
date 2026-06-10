import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFitnessProfile, calcLevel } from './useFitnessProfile';
import { useFitnessDailyLog } from './useFitnessDailyLog';
import { useFitnessTodayMeals } from './useFitnessTodayMeals';
import { toast } from 'sonner';

/**
 * Verifica condições e desbloqueia conquistas automaticamente.
 * Roda quando perfil/log do dia/refeições mudam.
 */
export function useFitnessAchievementsAutoUnlock() {
  const { profile } = useFitnessProfile();
  const { log, history } = useFitnessDailyLog();
  const { totals } = useFitnessTodayMeals();

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: catalog }, { data: unlocked }] = await Promise.all([
        supabase.from('fitness_achievements').select('id, codigo, xp_recompensa'),
        supabase.from('fitness_user_achievements').select('achievement_id').eq('user_id', user.id),
      ]);
      if (!catalog) return;
      const owned = new Set((unlocked || []).map((u: any) => u.achievement_id));
      const byCode = new Map(catalog.map((c: any) => [c.codigo, c]));

      // Contagens
      const [{ count: workoutCount }, { count: mealCount }] = await Promise.all([
        supabase.from('fitness_workout_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('fitness_meal_logs' as any).select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      const { nivel } = calcLevel(profile.xp || 0);
      const aguaMeta = profile.agua_meta_ml || 2500;
      const metaSono = Number(profile.meta_sono_horas ?? 8);

      // Dias batendo meta de água
      const aguaDaysHit = (history || []).filter(h => (h.agua_ml || 0) >= aguaMeta).length;
      const moodDays = (history || []).filter(h => !!h.humor).length;

      const toUnlock: string[] = [];
      const check = (code: string, cond: boolean) => {
        if (!cond) return;
        const c: any = byCode.get(code);
        if (!c) return;
        if (owned.has(c.id)) return;
        toUnlock.push(c.id);
      };

      check('profile_complete', !!profile.onboarding_completo);
      check('first_workout', (workoutCount || 0) > 0);
      check('workout_10', (workoutCount || 0) >= 10);
      check('workout_50', (workoutCount || 0) >= 50);
      check('first_meal', (mealCount || 0) > 0);
      check('meal_logger_10', (mealCount || 0) >= 10);
      check('streak_3', (profile.streak_dias || 0) >= 3);
      check('streak_7', (profile.streak_dias || 0) >= 7);
      check('streak_14', (profile.streak_dias || 0) >= 14);
      check('streak_30', (profile.streak_dias || 0) >= 30);
      check('streak_60', (profile.streak_dias || 0) >= 60);
      check('level_5', nivel >= 5);
      check('level_10', nivel >= 10);
      check('water_1L', (log?.agua_ml || 0) >= 1000);
      check('water_goal_day', (log?.agua_ml || 0) >= aguaMeta);
      check('hydration_hero', aguaDaysHit >= 7);
      check('sleep_goal_day', (log?.sono_horas || 0) >= metaSono);
      check('mood_logger', moodDays >= 5);
      check(
        'perfect_day',
        !!log && (log.agua_ml || 0) >= aguaMeta && !!log.humor && (log.sono_horas || 0) >= metaSono && !!log.treino_feito,
      );
      check('weight_goal', !!profile.meta_peso && !!profile.peso_atual && profile.peso_atual <= profile.meta_peso);

      // Emagrecimento iniciado
      const { count: emagCount } = await supabase
        .from('fitness_emagrecimento_logs' as any)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      check('emagrecimento_start', (emagCount || 0) > 0);

      if (toUnlock.length === 0) return;

      const rows = toUnlock.map(id => ({ user_id: user.id, achievement_id: id }));
      const { error } = await supabase.from('fitness_user_achievements').insert(rows);
      if (!error) {
        // bônus de XP
        let bonus = 0;
        toUnlock.forEach(id => {
          const c: any = catalog.find((x: any) => x.id === id);
          if (c) bonus += Number(c.xp_recompensa || 0);
        });
        if (bonus > 0) {
          await supabase
            .from('fitness_profiles')
            .update({ xp: (profile.xp || 0) + bonus })
            .eq('id', profile.id);
        }
        toast.success(`🏆 ${toUnlock.length} conquista(s) desbloqueada(s)! +${bonus} XP`);
      }
    })().catch(() => { /* silencia */ });
  }, [profile?.id, profile?.xp, profile?.streak_dias, profile?.peso_atual, log?.id, log?.agua_ml, log?.humor, log?.sono_horas, log?.treino_feito, totals.refeicoes]);
}
