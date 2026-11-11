import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isChristmasSeason, heatLevel, FINANCAS_MONTHLY_CENTS, FINANCAS_ANNUAL_CENTS, FINANCAS_PREMIUM_FEATURES, premiumErrorMessage, FINANCAS_FREE_MONTHLY_LIMIT, txBucket, monthlyUsage, freeLimitBlock, limitErrorMessage } from './plan';

describe('Invex Finanças — regras', () => {
  it('Premium custa R$ 25,90 por mês ou R$ 259,00 por ano', () => {
    assert.equal(FINANCAS_MONTHLY_CENTS, 2590);
    assert.equal(FINANCAS_ANNUAL_CENTS, 25900);
  });
  it('projeção, calendário, pessoas/compartilhar e DRE são Premium; teto de gastos não', () => {
    const all = FINANCAS_PREMIUM_FEATURES.join(' | ').toLowerCase();
    assert.ok(all.includes('projeção'));
    assert.ok(all.includes('calendário'));
    assert.ok(all.includes('pessoas'));
    assert.ok(all.includes('compartilhar'));
    assert.ok(all.includes('dre pessoal'));
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

const tx = (type: 'receita' | 'despesa', date: string, extra: Record<string, string> = {}) =>
  ({ type, date, subcategory: extra.subcategory ?? 'Geral', description: extra.description ?? 'x', competencia: extra.competencia ?? null });

describe('Invex Finanças — limite do plano gratuito', () => {
  it('gratuito permite 5 lançamentos de cada tipo por mês', () => {
    assert.equal(FINANCAS_FREE_MONTHLY_LIMIT, 5);
  });
  it('reserva é receita em "Outros" com "reserva" na descrição', () => {
    assert.equal(txBucket(tx('receita', '2026-11-01', { subcategory: 'Outros', description: 'Reserva de emergência' })), 'reserva');
    assert.equal(txBucket(tx('receita', '2026-11-01', { subcategory: 'Salário', description: 'Salário' })), 'receita');
    assert.equal(txBucket(tx('despesa', '2026-11-01')), 'despesa');
  });
  it('a 6ª despesa do mês é bloqueada, mas cabe em outro mês', () => {
    const five = Array.from({ length: 5 }, () => tx('despesa', '2026-11-10'));
    assert.deepEqual(freeLimitBlock(five, [tx('despesa', '2026-11-20')]), { bucket: 'despesa', month: '2026-11' });
    assert.equal(freeLimitBlock(five, [tx('despesa', '2026-12-01')]), null);
  });
  it('5 despesas não impedem receitas nem reservas no mesmo mês', () => {
    const five = Array.from({ length: 5 }, () => tx('despesa', '2026-11-10'));
    assert.equal(freeLimitBlock(five, [tx('receita', '2026-11-10')]), null);
    assert.equal(freeLimitBlock(five, [tx('receita', '2026-11-10', { subcategory: 'Outros', description: 'reserva' })]), null);
  });
  it('o mês de competência conta no lugar do vencimento', () => {
    const usage = monthlyUsage([tx('despesa', '2026-12-05', { competencia: '2026-11' })], '2026-11');
    assert.equal(usage.despesa, 1);
  });
  it('mensagem do banco vira texto amigável', () => {
    assert.ok(limitErrorMessage({ message: 'LIMITE_FINANCAS: o plano gratuito permite 5 despesas por mês (11/2026).' })?.startsWith('O plano gratuito'));
    assert.equal(limitErrorMessage({ message: 'outro erro' }), null);
  });
});
