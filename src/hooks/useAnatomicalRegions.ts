import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AnatomicalRegion {
  id: string;
  company_id: string;
  slug: string;
  nome: string;
  categoria: string;
  lado: string | null;
  ordem: number;
  is_active: boolean;
}

/** Carrega as regiões anatômicas da empresa do usuário. */
export function useAnatomicalRegions(onlyActive = true) {
  const { user } = useAuth();
  const [regions, setRegions] = useState<AnatomicalRegion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.companyId) { setRegions([]); setLoading(false); return; }
    setLoading(true);
    let q = supabase
      .from('anatomical_regions')
      .select('*')
      .eq('company_id', user.companyId)
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true });
    if (onlyActive) q = q.eq('is_active', true);
    const { data } = await q;
    setRegions((data || []) as AnatomicalRegion[]);
    setLoading(false);
  }, [user?.companyId, onlyActive]);

  useEffect(() => { load(); }, [load]);

  return { regions, loading, reload: load };
}
