import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FitnessProfile {
  id: string;
  user_id: string;
  company_id: string;
  nome: string;
  foto_url: string | null;
  avatar_id: string;
  mascote_nome: string;
  nivel: number;
  xp: number;
  streak_dias: number;
  last_workout_date: string | null;
  peso_atual: number | null;
  altura: number | null;
  meta_peso: number | null;
  meta_freq_semanal: number | null;
  agua_meta_ml: number | null;
  agua_hoje_ml: number | null;
  agua_data: string | null;
  sono_horas: number | null;
  humor: string | null;
  onboarding_completo: boolean;
}

export const XP_PER_LEVEL = 500;

export const calcLevel = (xp: number) => {
  const nivel = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpAtual = xp % XP_PER_LEVEL;
  const progresso = (xpAtual / XP_PER_LEVEL) * 100;
  return { nivel, xpAtual, xpProximo: XP_PER_LEVEL, progresso };
};

export function useFitnessProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<FitnessProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data: { user: au } } = await supabase.auth.getUser();
    if (!au) { setLoading(false); return; }

    const { data } = await supabase
      .from('fitness_profiles')
      .select('*')
      .eq('user_id', au.id)
      .maybeSingle();

    if (data) {
      setProfile(data as FitnessProfile);
    } else if (user.companyId) {
      // auto-create on first access
      const { data: created } = await supabase
        .from('fitness_profiles')
        .insert({
          user_id: au.id,
          company_id: user.companyId,
          nome: user.nome,
        })
        .select()
        .single();
      if (created) setProfile(created as FitnessProfile);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const update = useCallback(async (patch: Partial<FitnessProfile>) => {
    if (!profile) return;
    const { data, error } = await supabase
      .from('fitness_profiles')
      .update(patch)
      .eq('id', profile.id)
      .select()
      .single();
    if (!error && data) setProfile(data as FitnessProfile);
    return { data, error };
  }, [profile]);

  return { profile, loading, reload: load, update };
}
