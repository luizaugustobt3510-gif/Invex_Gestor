import { useCallback, useEffect, useState } from 'react';

export type ReminderKind = 'agua' | 'refeicao';
export interface ReminderItem {
  id: string;
  kind: ReminderKind;
  hora: string;        // 'HH:MM'
  label: string;
}

const DEFAULTS: ReminderItem[] = [
  { id: 'cafe', kind: 'refeicao', hora: '07:30', label: 'Café da manhã' },
  { id: 'agua1', kind: 'agua', hora: '09:00', label: 'Beber 250 ml' },
  { id: 'lanche-m', kind: 'refeicao', hora: '10:30', label: 'Lanche da manhã' },
  { id: 'agua2', kind: 'agua', hora: '11:30', label: 'Beber 250 ml' },
  { id: 'almoco', kind: 'refeicao', hora: '12:30', label: 'Almoço' },
  { id: 'agua3', kind: 'agua', hora: '14:30', label: 'Beber 250 ml' },
  { id: 'lanche-t', kind: 'refeicao', hora: '16:00', label: 'Lanche da tarde' },
  { id: 'agua4', kind: 'agua', hora: '17:30', label: 'Beber 250 ml' },
  { id: 'jantar', kind: 'refeicao', hora: '19:30', label: 'Jantar' },
  { id: 'agua5', kind: 'agua', hora: '21:00', label: 'Beber 250 ml' },
];

const today = () => new Date().toISOString().slice(0, 10);
const KEY = () => `fitness_reminders_${today()}`;

export function useFitnessReminders() {
  const [done, setDone] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try { return new Set(JSON.parse(localStorage.getItem(KEY()) || '[]')); }
    catch { return new Set(); }
  });

  // limpa marcações de dias anteriores
  useEffect(() => {
    Object.keys(localStorage)
      .filter(k => k.startsWith('fitness_reminders_') && k !== KEY())
      .forEach(k => localStorage.removeItem(k));
  }, []);

  const toggle = useCallback((id: string) => {
    setDone(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem(KEY(), JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  const items = DEFAULTS;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const proximo = items
    .filter(i => !done.has(i.id))
    .map(i => {
      const [h, m] = i.hora.split(':').map(Number);
      return { ...i, min: h * 60 + m };
    })
    .sort((a, b) => Math.abs(a.min - nowMin) - Math.abs(b.min - nowMin))[0] || null;

  return { items, done, toggle, proximo };
}
