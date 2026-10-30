import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROTINA_MONTHLY_CENTS } from './publicCommerce.ts';

test('Invex Rotina mensal custa R$ 25,90', () => {
  assert.equal(ROTINA_MONTHLY_CENTS, 2590);
});