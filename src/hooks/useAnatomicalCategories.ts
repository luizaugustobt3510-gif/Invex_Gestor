import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CATEGORIA_LABELS } from '@/components/clinica/anatomyMaps';

export interface AnatomicalCategory {
  id: string;
  company_id: string;
  slug: string;
  nome: string;
  ordem: number;
  is_active: boolean;
}

/** Carrega as categorias anatômicas da empresa do usuário. */
export function useAnatomicalCategories(onlyActive = true) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<AnatomicalCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.companyId) { setCategories([]); setLoading(false); return; }
    setLoading(true);
    let q = supabase
      .from('anatomical_categories')
      .select('*')
      .eq('company_id', user.companyId)
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true });
    if (onlyActive) q = q.eq('is_active', true);
    const { data } = await q;
    setCategories((data || []) as AnatomicalCategory[]);
    setLoading(false);
  }, [user?.companyId, onlyActive]);

  useEffect(() => { load(); }, [load]);

  /** Rótulo de exibição: nome cadastrado, com fallback aos rótulos padrão. */
  const labelFor = useCallback((slug: string) => {
    const found = categories.find(c => c.slug === slug);
    return found?.nome || CATEGORIA_LABELS[slug] || slug;
  }, [categories]);

  return { categories, loading, reload: load, labelFor };
}
