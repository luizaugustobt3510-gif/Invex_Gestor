import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getPaddleEnvironment } from '@/lib/paddle';

export interface FinancasSub {
  status: string;
  price_id: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
}

/** Premium é decidido no banco (financas_is_premium); aqui só lemos para a tela. */
export function useFinancasPremium() {
  const [premium, setPremium] = useState(false);
  const [sub, setSub] = useState<FinancasSub | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return false; }
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.rpc('financas_is_premium', { _uid: user.id }),
      supabase.from('subscriptions')
        .select('status, price_id, current_period_end, cancel_at_period_end')
        .eq('user_id', user.id).eq('product_id', 'financas_premium')
        .eq('environment', getPaddleEnvironment())
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setPremium(!!p); setSub((s as FinancasSub) || null); setLoading(false);
    return !!p;
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { premium, sub, loading, refresh };
}
