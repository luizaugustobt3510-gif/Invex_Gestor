import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { ANATOMY_MAPS, CATEGORIA_LABELS, AnatomyShape } from './anatomyMaps';
import type { AnatomicalRegion } from '@/hooks/useAnatomicalRegions';

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
 * - Ilustração SVG interativa para categorias que possuem mapa (ex.: cabeça).
 * - Lista de regiões clicáveis para as demais categorias.
 * - Seleção múltipla, remoção individual e persistência ao trocar de visualização.
 */
export function SeletorAnatomico({
  regions, value, onChange, multiple = true, categorias, disabled,
}: SeletorAnatomicoProps) {
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

  const maps = useMemo(
    () => ANATOMY_MAPS.filter(m => allowed.some(r => r.categoria === m.categoria)),
    [allowed],
  );

  const groups = useMemo(() => {
    const g: Record<string, AnatomicalRegion[]> = {};
    allowed.forEach(r => { (g[r.categoria] ||= []).push(r); });
    return g;
  }, [allowed]);

  const [mapKey, setMapKey] = useState(() => maps[0]?.key || '');
  const activeMap = maps.find(m => m.key === mapKey) || maps[0];
  const [viewKey, setViewKey] = useState(() => activeMap?.views[0]?.key || '');
  const activeView = activeMap?.views.find(v => v.key === viewKey) || activeMap?.views[0];

  const toggle = (slug: string) => {
    if (disabled || !bySlug[slug]) return;
    const has = value.includes(slug);
    if (has) onChange(value.filter(s => s !== slug));
    else onChange(multiple ? [...value, slug] : [slug]);
  };

  const shapeProps = (s: AnatomyShape) => {
    const known = !!bySlug[s.slug];
    const on = value.includes(s.slug);
    return {
      className: known
        ? `cursor-pointer transition-all ${on ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`
        : 'opacity-20 pointer-events-none',
      fill: on ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
      stroke: on ? 'hsl(var(--primary))' : 'hsl(var(--border))',
      strokeWidth: 1.5,
      onClick: () => toggle(s.slug),
    };
  };

  const renderShape = (s: AnatomyShape) => {
    const props = shapeProps(s);
    const title = <title>{bySlug[s.slug]?.nome || s.slug}</title>;
    switch (s.type) {
      case 'ellipse':
        return <ellipse key={s.slug + s.cx} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...props}>{title}</ellipse>;
      case 'circle':
        return <circle key={s.slug + s.cx} cx={s.cx} cy={s.cy} r={s.r} {...props}>{title}</circle>;
      case 'rect':
        return <rect key={s.slug + s.x} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx ?? 6} {...props}>{title}</rect>;
      default:
        return <path key={s.slug + s.d.slice(0, 8)} d={s.d} {...props}>{title}</path>;
    }
  };

  const selected = value.map(s => bySlug[s]).filter(Boolean) as AnatomicalRegion[];

  return (
    <div className="space-y-4">
      {activeMap && activeView && (
        <div className="rounded-lg border p-3 bg-muted/20">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex gap-1 flex-wrap">
              {maps.map(m => (
                <Button
                  key={m.key} type="button" size="sm"
                  variant={m.key === activeMap.key ? 'default' : 'outline'}
                  onClick={() => { setMapKey(m.key); setViewKey(m.views[0].key); }}
                >
                  {m.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-1 flex-wrap">
              {activeMap.views.map(v => (
                <Button
                  key={v.key} type="button" size="sm"
                  variant={v.key === activeView.key ? 'secondary' : 'ghost'}
                  onClick={() => setViewKey(v.key)}
                >
                  {v.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            <svg
              viewBox={activeMap.viewBox}
              className="w-full max-w-[260px] h-auto touch-manipulation select-none"
              role="img"
              aria-label={`Seletor anatômico — ${activeMap.label} (${activeView.label})`}
            >
              {activeView.outline.map((d, i) => (
                <path key={i} d={d} fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth={2} />
              ))}
              {activeView.shapes.map(renderShape)}
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
