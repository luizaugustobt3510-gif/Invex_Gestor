import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { lastTrainedDays, heatLevel, musclesForExercise } from './muscleHeat';

describe('muscle heatmap', () => {
  const now = new Date('2026-11-04T12:00:00Z').getTime();
  it('maps exercise names to muscles', () => {
    assert.deepEqual(musclesForExercise('Supino reto'), ['peito']);
    assert.deepEqual(musclesForExercise('Agachamento livre'), ['pernas']);
  });
  it('uses the most recent session and ignores skipped exercises', () => {
    const r = lastTrainedDays([
      { created_at: '2026-11-01T12:00:00Z', exercicios: [{ nome: 'Supino reto', feito: true }] },
      { created_at: '2026-11-04T10:00:00Z', exercicios: [{ nome: 'Supino inclinado', feito: true }, { nome: 'Rosca direta', feito: false }] },
    ], now);
    assert.equal(r.peito, 0);
    assert.equal(r.bracos, null);
  });
  it('classifies recovery: 0-1 days hot, 2-3 recovering, 4-7 ready, else idle', () => {
    assert.equal(heatLevel(1), 0);
    assert.equal(heatLevel(3), 1);
    assert.equal(heatLevel(7), 2);
    assert.equal(heatLevel(8), 3);
    assert.equal(heatLevel(null), 3);
  });
});
