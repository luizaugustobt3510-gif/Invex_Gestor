import { describe, it, expect } from 'vitest';
import { rendimento } from './producaoCalc';

describe('rendimento da produção', () => {
  it('100 kg viram 85 kg: rendimento 85% e perda 15 kg', () => {
    const r = rendimento(100, 85);
    expect(r.rendimento).toBe(85);
    expect(r.perda).toBe(15);
    expect(r.perdaPct).toBe(15);
  });
});
