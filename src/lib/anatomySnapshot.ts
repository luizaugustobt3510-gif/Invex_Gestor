import type { AnatomicalMap } from '@/hooks/useAnatomicalMaps';

const MAX_WIDTH = 520; // px — suficiente para ~55mm impressos, mantém o PDF leve

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('imagem indisponível'));
    img.src = url;
  });

/**
 * Gera uma miniatura (JPEG comprimido) da imagem anatômica com as áreas
 * selecionadas destacadas. Retorna null quando não há mapa/área utilizável.
 * Coordenadas dos polígonos são percentuais (0-100) em relação à imagem.
 */
export async function buildAnatomySnapshot(
  maps: AnatomicalMap[],
  selectedRegionIds: string[],
): Promise<string | null> {
  if (!selectedRegionIds.length) return null;
  const map = maps.find(
    m => m.imageUrl && m.regions.some(r => selectedRegionIds.includes(r.region_id) && r.points.length >= 3),
  );
  if (!map?.imageUrl) return null;

  try {
    const img = await loadImage(map.imageUrl);
    const scale = Math.min(1, MAX_WIDTH / (img.naturalWidth || MAX_WIDTH));
    const w = Math.max(1, Math.round((img.naturalWidth || MAX_WIDTH) * scale));
    const h = Math.max(1, Math.round((img.naturalHeight || MAX_WIDTH) * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    ctx.lineWidth = Math.max(1.5, w / 260);
    ctx.strokeStyle = '#0f6b5c';
    ctx.fillStyle = 'rgba(16, 122, 102, 0.42)';

    map.regions
      .filter(r => selectedRegionIds.includes(r.region_id) && r.points.length >= 3)
      .forEach(r => {
        ctx.beginPath();
        r.points.forEach((p, i) => {
          const x = (p.x / 100) * w;
          const y = (p.y / 100) * h;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });

    return canvas.toDataURL('image/jpeg', 0.7);
  } catch {
    return null;
  }
}
