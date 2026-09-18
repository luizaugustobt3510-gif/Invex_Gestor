/**
 * Mapas anatômicos interativos (SVG).
 * Estrutura modular: cada mapa tem uma ou mais visualizações (frente, perfil...)
 * e cada visualização tem formas clicáveis associadas ao `slug` da região.
 * Para adicionar coluna, membros etc., basta acrescentar um novo mapa aqui.
 */

export type AnatomyShape =
  | { slug: string; type: 'ellipse'; cx: number; cy: number; rx: number; ry: number; rotate?: number }
  | { slug: string; type: 'circle'; cx: number; cy: number; r: number }
  | { slug: string; type: 'rect'; x: number; y: number; w: number; h: number; rx?: number }
  | { slug: string; type: 'path'; d: string };

export interface AnatomyView {
  key: string;
  label: string;
  /** Contorno de fundo (não clicável) */
  outline: string[];
  shapes: AnatomyShape[];
}

export interface AnatomyMap {
  key: string;
  label: string;
  /** Categoria de regiões que este mapa representa */
  categoria: string;
  viewBox: string;
  views: AnatomyView[];
}

export const ANATOMY_MAPS: AnatomyMap[] = [
  {
    key: 'cabeca',
    label: 'Cabeça / Crânio',
    categoria: 'cabeca',
    viewBox: '0 0 200 280',
    views: [
      {
        key: 'frente',
        label: 'Frente',
        outline: [
          'M100 12 C55 12 30 48 30 100 C30 140 40 158 52 170 C58 200 72 236 100 248 C128 236 142 200 148 170 C160 158 170 140 170 100 C170 48 145 12 100 12 Z',
        ],
        shapes: [
          { slug: 'parietal', type: 'ellipse', cx: 100, cy: 44, rx: 44, ry: 22 },
          { slug: 'frontal', type: 'ellipse', cx: 100, cy: 80, rx: 46, ry: 24 },
          { slug: 'temporal_direita', type: 'ellipse', cx: 50, cy: 104, rx: 14, ry: 24 },
          { slug: 'temporal_esquerda', type: 'ellipse', cx: 150, cy: 104, rx: 14, ry: 24 },
          { slug: 'orbital_direita', type: 'ellipse', cx: 76, cy: 112, rx: 17, ry: 11 },
          { slug: 'orbital_esquerda', type: 'ellipse', cx: 124, cy: 112, rx: 17, ry: 11 },
          { slug: 'nasal', type: 'path', d: 'M100 122 L90 152 Q100 160 110 152 Z' },
          { slug: 'atm_direita', type: 'circle', cx: 52, cy: 148, r: 9 },
          { slug: 'atm_esquerda', type: 'circle', cx: 148, cy: 148, r: 9 },
          { slug: 'maxilar', type: 'rect', x: 66, y: 160, w: 68, h: 22, rx: 11 },
          { slug: 'mandibula', type: 'rect', x: 62, y: 190, w: 76, h: 32, rx: 16 },
        ],
      },
      {
        key: 'perfil',
        label: 'Perfil',
        outline: [
          'M92 14 C48 14 24 52 26 102 C28 140 44 160 58 172 C64 204 80 238 110 246 C138 240 152 214 156 188 L170 150 L156 142 C160 120 168 102 160 74 C150 38 130 14 92 14 Z',
        ],
        shapes: [
          { slug: 'parietal', type: 'ellipse', cx: 96, cy: 44, rx: 44, ry: 20 },
          { slug: 'frontal', type: 'ellipse', cx: 140, cy: 84, rx: 20, ry: 26 },
          { slug: 'occipital', type: 'ellipse', cx: 44, cy: 108, rx: 20, ry: 30 },
          { slug: 'temporal_direita', type: 'ellipse', cx: 94, cy: 108, rx: 30, ry: 26 },
          { slug: 'orbital_direita', type: 'ellipse', cx: 142, cy: 118, rx: 13, ry: 10 },
          { slug: 'nasal', type: 'path', d: 'M156 124 L172 150 L152 152 Z' },
          { slug: 'atm_direita', type: 'circle', cx: 98, cy: 152, r: 9 },
          { slug: 'maxilar', type: 'rect', x: 112, y: 160, w: 48, h: 20, rx: 10 },
          { slug: 'mandibula', type: 'rect', x: 98, y: 188, w: 66, h: 30, rx: 15 },
        ],
      },
    ],
  },
];

export const getMapForCategoria = (categoria: string) =>
  ANATOMY_MAPS.find(m => m.categoria === categoria);

export const CATEGORIA_LABELS: Record<string, string> = {
  cabeca: 'Cabeça',
  pescoco: 'Pescoço',
  tronco: 'Tronco',
  membros_superiores: 'Membros superiores',
  membros_inferiores: 'Membros inferiores',
  geral: 'Geral',
};

export const LADO_LABELS: Record<string, string> = {
  direito: 'Direito',
  esquerdo: 'Esquerdo',
  bilateral: 'Bilateral',
  nao_aplica: 'Não se aplica',
};
