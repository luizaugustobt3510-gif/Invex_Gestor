import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FitnessDailyLog {
  id: string;
  user_id: string;
  company_id: string;
  data: string;
  sono_horas: number | null;
  humor: string | null;
  agua_ml: number | null;
  treino_feito: boolean | null;
  peso: number | null;
}

const today = () => new Date().toISOString().slice(0, 10);

export function useFitnessDailyLog() {
  const { user } = useAuth();
  const [log, setLog] = useState<FitnessDailyLog | null>(null);
  const [history, setHistory] = useState<FitnessDailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data: { user: au } } = await supabase.auth.getUser();
    if (!au) { setLoading(false); return; }

    const { data: todayLog } = await (supabase as any)
      .from('fitness_daily_logs')
      .select('*')
      .eq('user_id', au.id)
      .eq('data', today())
      .maybeSingle();

    const { data: hist } = await (supabase as any)
      .from('fitness_daily_logs')
      .select('*')
      .eq('user_id', au.id)
      .order('data', { ascending: false })
      .limit(30);

    setLog(todayLog || null);
    setHistory(hist || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const upsertToday = useCallback(async (patch: Partial<FitnessDailyLog>) => {
    if (!user?.companyId) return;
    const { data: { user: au } } = await supabase.auth.getUser();
    if (!au) return;
    const payload: any = {
      user_id: au.id,
      company_id: user.companyId,
      data: today(),
      ...patch,
    };
    const { data, error } = await (supabase as any)
      .from('fitness_daily_logs')
      .upsert(payload, { onConflict: 'user_id,data' })
      .select()
      .single();
    if (!error && data) {
      setLog(data);
      setHistory(prev => {
        const others = prev.filter(p => p.data !== data.data);
        return [data, ...others];
      });
    }
    return { data, error };
  }, [user]);

  return { log, history, loading, reload: load, upsertToday };
}
