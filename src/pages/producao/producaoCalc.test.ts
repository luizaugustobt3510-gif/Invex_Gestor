import { describe, it as test } from 'node:test';
import { strict as assert } from 'node:assert';
import { rendimento } from './producaoCalc';

describe('rendimento da produção', () => {
  test('100 kg viram 85 kg: rendimento 85% e perda 15 kg', () => {
    const r = rendimento(100, 85);
    assert.equal(r.rendimento, 85);
    assert.equal(r.perda, 15);
    assert.equal(r.perdaPct, 15);
  });
});
