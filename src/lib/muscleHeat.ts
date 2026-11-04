export type Muscle = 'peito' | 'costas' | 'ombros' | 'bracos' | 'abdomen' | 'pernas';

export const MUSCLE_LABEL: Record<Muscle, string> = {
  peito: 'Peito', costas: 'Costas', ombros: 'Ombros', bracos: 'Braços', abdomen: 'Abdômen', pernas: 'Pernas',
};

const KEYWORDS: [Muscle, RegExp][] = [
  ['peito', /supino|peito|crucifixo|flex[aã]o|peck|crossover|voador/i],
  ['costas', /costas|remada|puxada|pulldown|barra fixa|serrote|levantamento terra|lombar/i],
  ['ombros', /ombro|desenvolvimento|eleva[cç][aã]o lateral|eleva[cç][aã]o frontal|arnold|deltoide/i],
  ['bracos', /b[ií]ceps|tr[ií]ceps|rosca|bra[cç]o|testa|martelo|franc[eê]s|pulley/i],
  ['abdomen', /abd[oô]m|prancha|crunch|abdominal|core/i],
  ['pernas', /agachamento|leg|perna|cadeira|mesa flexora|extensora|stiff|panturrilha|afundo|gl[uú]teo|hack|avan[cç]o|passada/i],
];

const GROUP_MAP: Record<string, Muscle[]> = {
  peito: ['peito'], costas: ['costas'], pernas: ['pernas'], ombros: ['ombros'],
  'braços': ['bracos'], bracos: ['bracos'], 'abdômen': ['abdomen'], abdomen: ['abdomen'],
  'full body': ['peito', 'costas', 'ombros', 'bracos', 'abdomen', 'pernas'],
};

export function musclesForExercise(nome: string): Muscle[] {
  return KEYWORDS.filter(([, re]) => re.test(nome)).map(([m]) => m);
}

export interface HeatLog { created_at: string; grupo?: string | null; exercicios: { nome: string; feito?: boolean }[] }

/** Days since each muscle was last trained (null = not in window). */
export function lastTrainedDays(logs: HeatLog[], now = Date.now()): Record<Muscle, number | null> {
  const out: Record<Muscle, number | null> = { peito: null, costas: null, ombros: null, bracos: null, abdomen: null, pernas: null };
  for (const l of logs) {
    const days = Math.max(0, Math.floor((now - new Date(l.created_at).getTime()) / 86_400_000));
    const set = new Set<Muscle>();
    for (const e of l.exercicios || []) if (e.feito !== false) musclesForExercise(e.nome).forEach(m => set.add(m));
    if (set.size === 0 && l.grupo) (GROUP_MAP[l.grupo.toLowerCase()] || []).forEach(m => set.add(m));
    set.forEach(m => { if (out[m] == null || days < (out[m] as number)) out[m] = days; });
  }
  return out;
}

/** 0 = hoje/ontem (quente), 1 = recuperando, 2 = pronto, 3 = sem treino na semana */
export function heatLevel(days: number | null): 0 | 1 | 2 | 3 {
  if (days == null || days > 7) return 3;
  if (days <= 1) return 0;
  if (days <= 3) return 1;
  return 2;
}
