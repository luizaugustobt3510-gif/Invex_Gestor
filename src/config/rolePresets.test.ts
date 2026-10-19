import { describe, it, expect } from 'vitest';
import { presetAllows } from './rolePresets';

describe('role presets', () => {
  it('enfermeiro gets anamnese but not financeiro', () => {
    expect(presetAllows('enfermeiro', 'anamnese')).toBe(true);
    expect(presetAllows('enfermeiro', 'financeiro')).toBe(false);
    expect(presetAllows('enfermeiro', 'logistica')).toBe(false);
  });
  it('unknown role gets nothing', () => {
    expect(presetAllows('xyz', 'dashboard')).toBe(false);
  });
});
