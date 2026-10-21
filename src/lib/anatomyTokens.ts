/**
 * Resposta anatômica: lista de tokens. Cada token é
 *  - `area:<id da área desenhada>` → seleciona só aquele contorno do mapa; ou
 *  - `<slug da região>` → seleção pela lista (ou anamneses antigas).
 */
export const AREA_PREFIX = 'area:';

export const isAreaToken = (t: string) => t.startsWith(AREA_PREFIX);
export const areaToken = (areaId: string) => `${AREA_PREFIX}${areaId}`;
export const areaIdOf = (t: string) => t.slice(AREA_PREFIX.length);

interface MapLike { regions: { id: string; region_id: string }[] }
interface RegionLike { id: string; slug: string; nome: string }

/** Resolve o token para a região cadastrada correspondente. */
export function regionForToken<R extends RegionLike>(
  token: string, regions: R[], maps: MapLike[],
): R | undefined {
  if (!isAreaToken(token)) return regions.find(r => r.slug === token);
  const id = areaIdOf(token);
  for (const m of maps) {
    const a = m.regions.find(x => x.id === id);
    if (a) return regions.find(r => r.id === a.region_id);
  }
  return undefined;
}

/** Áreas a destacar: as clicadas + todas as das regiões escolhidas por nome. */
export function highlightedAreaIds(
  tokens: string[], regions: RegionLike[], maps: MapLike[],
): Set<string> {
  const out = new Set<string>();
  const slugRegionIds = new Set(
    regions.filter(r => tokens.includes(r.slug)).map(r => r.id),
  );
  tokens.filter(isAreaToken).forEach(t => out.add(areaIdOf(t)));
  maps.forEach(m => m.regions.forEach(a => {
    if (slugRegionIds.has(a.region_id)) out.add(a.id);
  }));
  return out;
}
