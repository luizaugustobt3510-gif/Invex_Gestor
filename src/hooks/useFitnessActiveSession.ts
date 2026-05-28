import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'fitness_active_session_v1';

export interface ActiveSessionExercise {
  id: string;
  nome: string;
  tipo: 'musculacao' | 'cardio' | 'alongamento';
  series?: number;
  repeticoes?: string;
  carga_kg?: number | null;
  descanso_seg?: number | null;
  duracao_min?: number | null;
  distancia_km?: number | null;
  calorias?: number | null;
  intensidade?: string | null;
  ordem: number;
  feito: boolean;
  pulado?: boolean;
  cargaReal?: string;
  /** Carga registrada na sessão imediatamente anterior do mesmo exercício */
  cargaUltima?: number | null;
}

export interface ActiveSession {
  workoutId: string;
  workoutNome: string;
  startedAt: number;       // epoch ms
  pausedAt?: number | null;
  pausedAcc: number;        // ms acumulados em pausa
  exercises: ActiveSessionExercise[];
  currentIndex: number;
  restEndsAt?: number | null;
  userId: string;
}

export function readSession(): ActiveSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function writeSession(s: ActiveSession | null) {
  if (!s) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function elapsedSec(s: ActiveSession): number {
  const now = s.pausedAt ?? Date.now();
  return Math.max(0, Math.floor((now - s.startedAt - s.pausedAcc) / 1000));
}

export function useFitnessActiveSession() {
  const [session, setSessionState] = useState<ActiveSession | null>(() => readSession());

  const setSession = useCallback((s: ActiveSession | null) => {
    writeSession(s);
    setSessionState(s);
  }, []);

  const patch = useCallback((p: Partial<ActiveSession>) => {
    setSessionState(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...p };
      writeSession(next);
      return next;
    });
  }, []);

  // sync across tabs
  useEffect(() => {
    const h = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSessionState(readSession());
    };
    window.addEventListener('storage', h);
    return () => window.removeEventListener('storage', h);
  }, []);

  return { session, setSession, patch };
}
