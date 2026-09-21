import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MapPoint { x: number; y: number }

export interface AnatomicalMapRegion {
  id: string;
  map_id: string;
  region_id: string;
  points: MapPoint[];
}

export interface AnatomicalMap {
  id: string;
  company_id: string;
  nome: string;
  categoria: string;
  vista: string;
  image_path: string | null;
  ordem: number;
  is_active: boolean;
  imageUrl?: string | null;
  regions: AnatomicalMapRegion[];
}

const BUCKET = 'anatomical-maps';

/** Carrega os mapas anatômicos da empresa, com polígonos e URL assinada da imagem. */
export function useAnatomicalMaps(onlyActive = true) {
  const { user } = useAuth();
  const [maps, setMaps] = useState<AnatomicalMap[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.companyId) { setMaps([]); setLoading(false); return; }
    setLoading(true);
    let q = supabase
      .from('anatomical_maps')
      .select('*')
      .eq('company_id', user.companyId)
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true });
    if (onlyActive) q = q.eq('is_active', true);
    const { data: mapRows } = await q;
    const rows = mapRows || [];

    const { data: regionRows } = await supabase
      .from('anatomical_map_regions')
      .select('*')
      .eq('company_id', user.companyId);

    const withUrls = await Promise.all(rows.map(async (m: any) => {
      let imageUrl: string | null = null;
      if (m.image_path) {
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(m.image_path, 3600);
        imageUrl = data?.signedUrl || null;
      }
      return {
        ...m,
        imageUrl,
        regions: (regionRows || [])
          .filter((r: any) => r.map_id === m.id)
          .map((r: any) => ({
            id: r.id,
            map_id: r.map_id,
            region_id: r.region_id,
            points: Array.isArray(r.points) ? (r.points as MapPoint[]) : [],
          })),
      } as AnatomicalMap;
    }));

    setMaps(withUrls);
    setLoading(false);
  }, [user?.companyId, onlyActive]);

  useEffect(() => { load(); }, [load]);

  return { maps, loading, reload: load };
}

export const ANATOMICAL_MAPS_BUCKET = BUCKET;
