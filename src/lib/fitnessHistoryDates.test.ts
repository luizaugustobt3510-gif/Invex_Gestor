import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { inFitnessDateRange, validFitnessDateRange } from './fitnessHistoryDates';

describe('período do histórico Fitness', () => {
  it('inclui as duas datas escolhidas', () => {
    assert.equal(inFitnessDateRange('2026-11-01', '2026-11-01', '2026-11-24'), true);
    assert.equal(inFitnessDateRange('2026-11-24', '2026-11-01', '2026-11-24'), true);
    assert.equal(inFitnessDateRange('2026-10-31', '2026-11-01', '2026-11-24'), false);
    assert.equal(inFitnessDateRange('2026-11-25', '2026-11-01', '2026-11-24'), false);
  });
  it('rejeita período invertido', () => {
    assert.equal(validFitnessDateRange('2026-11-24', '2026-11-01'), false);
  });
  it('permite intervalo aberto e datas com horário', () => {
    assert.equal(inFitnessDateRange('2026-11-24T23:59:00', '', '2026-11-24'), true);
    assert.equal(inFitnessDateRange('2026-11-23', '2026-11-24', ''), false);
    assert.equal(inFitnessDateRange('2020-01-01', '', ''), true);
  });
});