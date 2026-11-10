import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isWorkoutIdle, WORKOUT_IDLE_LIMIT_MS } from './fitnessSessionIdle';

describe('auto stop de treino por inatividade', () => {
  const start = new Date('2026-11-10T10:00:00Z').getTime();
  it('o limite é de exatamente 2 horas', () => {
    assert.equal(WORKOUT_IDLE_LIMIT_MS, 7_200_000);
  });
  it('não encerra antes de 2 horas sem atividade', () => {
    const s = { startedAt: start, lastActivityAt: start + 60_000 };
    assert.equal(isWorkoutIdle(s, start + 60_000 + 7_199_999), false);
  });
  it('encerra com 2 horas sem atividade, mesmo pausado', () => {
    assert.equal(isWorkoutIdle({ startedAt: start, lastActivityAt: start }, start + 7_200_000), true);
    assert.equal(isWorkoutIdle({ startedAt: start, pausedAt: start, lastActivityAt: start }, start + 7_200_000), true);
  });
  it('treino que ainda não começou (contagem inicial) não é encerrado', () => {
    assert.equal(isWorkoutIdle({ startedAt: 0 }, start), false);
  });
});
