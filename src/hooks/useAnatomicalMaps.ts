import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MapPoint { x: number; y: number }

export interface AnatomicalMapRegion {
  id: string;
  map_id: string;
  region_id: string;
  points: MapPoint[];
  cor: string;
}

/** Cores disponíveis para as áreas do mapa (valores HSL sem hsl()). */
export const AREA_COLORS: Record<string, { label: string; hsl: string }> = {
  amarelo: { label: 'Amarelo', hsl: '45 95% 50%' },
  verde: { label: 'Verde', hsl: '142 70% 40%' },
  azul: { label: 'Azul', hsl: '217 90% 55%' },
  vermelho: { label: 'Vermelho', hsl: '0 80% 50%' },
};
export const areaHsl = (cor?: string) => (AREA_COLORS[cor || ''] || AREA_COLORS.verde).hsl;

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
            cor: r.cor || 'verde',
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
