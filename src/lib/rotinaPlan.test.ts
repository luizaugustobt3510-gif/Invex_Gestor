import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPremium, FREE_LIMITS } from './rotinaPlan.ts';

const base = { status: 'ativo', plano: 'premium', premium_status: 'ativo', premium_fim: '2026-12-31' } as const;

test('premium ativo dentro da validade', () => assert.equal(isPremium(base, '2026-10-29'), true));
test('premium expirado pela data', () => assert.equal(isPremium(base, '2027-01-01'), false));
test('premium suspenso não vale', () => assert.equal(isPremium({ ...base, premium_status: 'suspenso' }, '2026-10-29'), false));
test('acesso revogado anula premium', () => assert.equal(isPremium({ ...base, status: 'revogado' }, '2026-10-29'), false));
test('limites gratuitos', () => assert.deepEqual(FREE_LIMITS, { habitos: 5, metas: 3 }));
