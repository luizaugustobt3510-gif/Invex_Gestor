import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const todayStr = () => new Date().toISOString().slice(0, 10);

export interface DayTotals {
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  fibras: number;
  refeicoes: number;
}

const empty: DayTotals = { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0, refeicoes: 0 };

export function useFitnessTodayMeals() {
  const [totals, setTotals] = useState<DayTotals>(empty);
  const [meta, setMeta] = useState<{ calorias: number; proteinas: number; carboidratos: number; gorduras: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const [{ data: meals }, { data: m }] = await Promise.all([
      supabase
        .from('fitness_meal_logs' as any)
        .select('calorias, proteinas, carboidratos, gorduras, fibras')
        .eq('user_id', user.id)
        .eq('log_date', todayStr()),
      supabase
        .from('fitness_emagrecimento_logs' as any)
        .select('calorias, proteinas, carboidratos, gorduras')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    const t = (meals || []).reduce<DayTotals>((acc, r: any) => ({
      calorias: acc.calorias + Number(r.calorias || 0),
      proteinas: acc.proteinas + Number(r.proteinas || 0),
      carboidratos: acc.carboidratos + Number(r.carboidratos || 0),
      gorduras: acc.gorduras + Number(r.gorduras || 0),
      fibras: acc.fibras + Number(r.fibras || 0),
      refeicoes: acc.refeicoes + 1,
    }), { ...empty });
    setTotals(t);
    if (m) setMeta(m as any);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { totals, meta, loading, reload: load };
}
