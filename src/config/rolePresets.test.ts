import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { presetAllows } from './rolePresets';

describe('role presets', () => {
  it('enfermeiro gets anamnese but not financeiro/logistica', () => {
    assert.equal(presetAllows('enfermeiro', 'anamnese'), true);
    assert.equal(presetAllows('enfermeiro', 'financeiro'), false);
    assert.equal(presetAllows('enfermeiro', 'logistica'), false);
  });
  it('unknown role gets nothing', () => {
    assert.equal(presetAllows('xyz', 'dashboard'), false);
  });
});
