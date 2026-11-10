/** Treino em andamento é encerrado sozinho após este tempo sem nenhuma interação. */
export const WORKOUT_IDLE_LIMIT_MS = 2 * 60 * 60 * 1000;

export interface IdleTrackedSession {
  startedAt: number;
  pausedAt?: number | null;
  lastActivityAt?: number | null;
}

/** Último momento em que a pessoa mexeu no treino (sessões antigas caem no início). */
export function lastActivityOf(s: IdleTrackedSession): number | null {
  const t = s.lastActivityAt ?? (s.startedAt || null);
  return t && t > 0 ? t : null;
}

/** true quando o treino ficou parado por 2 horas ou mais. */
export function isWorkoutIdle(s: IdleTrackedSession, now: number = Date.now()): boolean {
  const last = lastActivityOf(s);
  if (last == null) return false;
  return now - last >= WORKOUT_IDLE_LIMIT_MS;
}
