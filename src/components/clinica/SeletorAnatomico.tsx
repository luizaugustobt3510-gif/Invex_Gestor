import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { CATEGORIA_LABELS } from './anatomyMaps';
import type { AnatomicalRegion } from '@/hooks/useAnatomicalRegions';
import { useAnatomicalMaps } from '@/hooks/useAnatomicalMaps';

export interface SeletorAnatomicoProps {
  regions: AnatomicalRegion[];
  /** slugs selecionados */
  value: string[];
  onChange: (slugs: string[]) => void;
  /** permite mais de uma região (padrão: true) */
  multiple?: boolean;
  /** limita as categorias disponíveis; vazio = todas */
  categorias?: string[];
  disabled?: boolean;
}

/**
 * Seletor Anatômico reutilizável.
 * - Usa as imagens anatômicas cadastradas pelo administrador, com áreas desenhadas.
 * - Lista de regiões clicáveis sempre disponível como alternativa/complemento.
 */
export function SeletorAnatomico({
  regions, value, onChange, multiple = true, categorias, disabled,
}: SeletorAnatomicoProps) {
  const { maps } = useAnatomicalMaps(true);

  const allowed = useMemo(
    () => (categorias && categorias.length
      ? regions.filter(r => categorias.includes(r.categoria))
      : regions),
    [regions, categorias],
  );

  const bySlug = useMemo(() => {
    const m: Record<string, AnatomicalRegion> = {};
    allowed.forEach(r => { m[r.slug] = r; });
    return m;
  }, [allowed]);

  const byId = useMemo(() => {
    const m: Record<string, AnatomicalRegion> = {};
    allowed.forEach(r => { m[r.id] = r; });
    return m;
  }, [allowed]);

  const usableMaps = useMemo(
    () => maps.filter(m =>
      !!m.imageUrl
      && (!categorias || categorias.length === 0 || categorias.includes(m.categoria))
      && m.regions.some(r => byId[r.region_id]),
    ),
    [maps, categorias, byId],
  );

  const groups = useMemo(() => {
    const g: Record<string, AnatomicalRegion[]> = {};
    allowed.forEach(r => { (g[r.categoria] ||= []).push(r); });
    return g;
  }, [allowed]);

  const [mapId, setMapId] = useState<string>('');
  const activeMap = usableMaps.find(m => m.id === mapId) || usableMaps[0];

  const toggle = (slug?: string) => {
    if (disabled || !slug || !bySlug[slug]) return;
    const has = value.includes(slug);
    if (has) onChange(value.filter(s => s !== slug));
    else onChange(multiple ? [...value, slug] : [slug]);
  };

  const selected = value.map(s => bySlug[s]).filter(Boolean) as AnatomicalRegion[];

  return (
    <div className="space-y-4">
      {activeMap && (
        <div className="rounded-lg border p-3 bg-muted/20">
          {usableMaps.length > 1 && (
            <div className="flex gap-1 flex-wrap mb-2">
              {usableMaps.map(m => (
                <Button
                  key={m.id} type="button" size="sm"
                  variant={m.id === activeMap.id ? 'default' : 'outline'}
                  onClick={() => setMapId(m.id)}
                >
                  {m.nome}{m.vista ? ` · ${m.vista}` : ''}
                </Button>
              ))}
            </div>
          )}
          <div className="relative w-full max-w-[380px] mx-auto select-none">
            <img
              src={activeMap.imageUrl!}
              alt={`Mapa anatômico — ${activeMap.nome}`}
              className="w-full h-auto rounded-md pointer-events-none"
            />
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full touch-manipulation"
            >
              {activeMap.regions.map(mr => {
                const region = byId[mr.region_id];
                if (!region || mr.points.length < 3) return null;
                const on = value.includes(region.slug);
                return (
                  <polygon
                    key={mr.id}
                    points={mr.points.map(p => `${p.x},${p.y}`).join(' ')}
                    onClick={() => toggle(region.slug)}
                    className={disabled ? '' : 'cursor-pointer transition-all'}
                    fill={on ? 'hsl(var(--primary) / 0.55)' : 'hsl(var(--primary) / 0.12)'}
                    stroke={on ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.5)'}
                    strokeWidth={0.5}
                    vectorEffect="non-scaling-stroke"
                  >
                    <title>{region.nome}</title>
                  </polygon>
                );
              })}
            </svg>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Toque nas áreas para selecionar. Toque novamente para remover.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {Object.entries(groups).map(([cat, list]) => (
          <div key={cat}>
            <div className="text-xs font-medium text-muted-foreground mb-1.5">
              {CATEGORIA_LABELS[cat] || cat}
            </div>
            <div className="flex flex-wrap gap-2">
              {list.map(r => {
                const on = value.includes(r.slug);
                return (
                  <button
                    key={r.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggle(r.slug)}
                    className={`px-3 py-2 rounded-lg border-2 text-sm transition-all active:scale-[0.98] ${
                      on
                        ? 'border-primary bg-primary/10 font-medium'
                        : 'border-border hover:border-primary/40 hover:bg-muted'
                    }`}
                  >
                    {r.nome}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {allowed.length === 0 && (
          <div className="text-sm text-muted-foreground">
            Nenhuma região anatômica cadastrada.
          </div>
        )}
      </div>

      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1.5">Regiões selecionadas</div>
        {selected.length === 0 ? (
          <div className="text-sm text-muted-foreground italic">Nenhuma região selecionada.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selected.map(r => (
              <Badge key={r.id} variant="secondary" className="gap-1 py-1.5 pl-3 pr-1.5 text-sm">
                {r.nome}
                {!disabled && (
                  <button type="button" onClick={() => toggle(r.slug)} aria-label={`Remover ${r.nome}`}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
