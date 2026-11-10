import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isChristmasSeason, heatLevel, FINANCAS_MONTHLY_CENTS, FINANCAS_ANNUAL_CENTS, FINANCAS_PREMIUM_FEATURES, premiumErrorMessage } from './plan';

describe('Invex Finanças — regras', () => {
  it('Premium custa R$ 25,90 por mês ou R$ 259,00 por ano', () => {
    assert.equal(FINANCAS_MONTHLY_CENTS, 2590);
    assert.equal(FINANCAS_ANNUAL_CENTS, 25900);
  });
  it('projeção, calendário e pessoas/compartilhar são Premium; teto de gastos não', () => {
    const all = FINANCAS_PREMIUM_FEATURES.join(' | ').toLowerCase();
    assert.ok(all.includes('projeção'));
    assert.ok(all.includes('calendário'));
    assert.ok(all.includes('pessoas'));
    assert.ok(all.includes('compartilhar'));
    assert.ok(!all.includes('teto'));
  });
  it('tema natalino só em dezembro (horário de Brasília)', () => {
    assert.equal(isChristmasSeason(new Date('2026-12-01T03:00:00Z')), true);  // 1/12 00:00 BRT
    assert.equal(isChristmasSeason(new Date('2026-12-31T23:00:00Z')), true);  // 31/12 20:00 BRT
    assert.equal(isChristmasSeason(new Date('2027-01-01T02:59:00Z')), true);  // ainda 31/12 em Brasília
    assert.equal(isChristmasSeason(new Date('2027-01-01T03:00:00Z')), false); // 1/1 00:00 BRT
    assert.equal(isChristmasSeason(new Date('2026-12-01T02:59:00Z')), false); // ainda 30/11 em Brasília
  });
  it('mapa de calor: 0 sem contas e 4 níveis proporcionais ao dia mais caro', () => {
    assert.equal(heatLevel(0, 1000), 0);
    assert.equal(heatLevel(100, 1000), 1);
    assert.equal(heatLevel(400, 1000), 2);
    assert.equal(heatLevel(600, 1000), 3);
    assert.equal(heatLevel(1000, 1000), 4);
  });
  it('erro de recurso Premium vira mensagem amigável', () => {
    assert.ok(premiumErrorMessage({ message: 'PREMIUM_FINANCAS: recurso exclusivo' }));
    assert.equal(premiumErrorMessage({ message: 'outro erro' }), null);
  });
});
