import supino from '@/assets/exercises/supino.jpg';
import agachamento from '@/assets/exercises/agachamento.jpg';
import legPress from '@/assets/exercises/leg-press.jpg';
import remada from '@/assets/exercises/remada.jpg';
import puxada from '@/assets/exercises/puxada.jpg';
import rosca from '@/assets/exercises/rosca.jpg';
import triceps from '@/assets/exercises/triceps.jpg';
import desenvolvimento from '@/assets/exercises/desenvolvimento.jpg';
import elevacaoLateral from '@/assets/exercises/elevacao-lateral.jpg';
import terra from '@/assets/exercises/terra.jpg';
import afundo from '@/assets/exercises/afundo.jpg';
import abdominal from '@/assets/exercises/abdominal.jpg';
import panturrilha from '@/assets/exercises/panturrilha.jpg';
import extensora from '@/assets/exercises/extensora.jpg';
import flexora from '@/assets/exercises/flexora.jpg';
import cardio from '@/assets/exercises/cardio.jpg';

/** Ordem importa: termos mais específicos antes dos genéricos. */
const RULES: [string[], string][] = [
  [['leg press', 'legpress'], legPress],
  [['extensora', 'extensao de perna'], extensora],
  [['flexora', 'flexao de perna', 'stiff'], flexora],
  [['elevacao lateral', 'elevacao frontal', 'crucifixo inverso'], elevacaoLateral],
  [['panturrilha', 'gemeos'], panturrilha],
  [['terra', 'deadlift'], terra],
  [['afundo', 'avanco', 'passada', 'lunge', 'bulgaro'], afundo],
  [['agachamento', 'squat', 'hack', 'sumo'], agachamento],
  [['supino', 'crucifixo', 'flexao de braco', 'peck', 'voador', 'crossover'], supino],
  [['puxada', 'pulldown', 'barra fixa', 'pull'], puxada],
  [['remada', 'row', 'serrote'], remada],
  [['triceps', 'frances', 'testa', 'mergulho'], triceps],
  [['rosca', 'biceps', 'curl'], rosca],
  [['desenvolvimento', 'militar', 'arnold', 'ombro'], desenvolvimento],
  [['abdominal', 'prancha', 'crunch', 'core'], abdominal],
  [['esteira', 'corrida', 'bike', 'bicicleta', 'eliptico', 'escada', 'cardio', 'caminhada', 'polichinelo', 'hiit'], cardio],
];

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Ilustração do exercício a partir do nome (null quando não reconhecido). */
export function exerciseImage(nome: string | null | undefined): string | null {
  if (!nome) return null;
  const n = norm(nome);
  for (const [keys, img] of RULES) if (keys.some(k => n.includes(k))) return img;
  return null;
}
