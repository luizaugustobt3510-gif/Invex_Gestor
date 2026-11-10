import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { evaluateExpression, pushHistory, CALC_HISTORY_LIMIT } from './calc';
import { buildDre, transactionsForPeriod } from './dre';
import { contextualTips } from './tips';

const tx = (o: any) => ({ id: Math.random().toString(), user_id: 'u', subcategory: 'Geral', description: 'x', status: 'pendente', note: null, person_id: null, series_id: null, series_kind: null, installment_number: null, installment_total: null, competencia: null, created_at: '', ...o });

describe('Calculadora', () => {
  it('faz contas básicas com vírgula e símbolos', () => {
    assert.equal(evaluateExpression('2+3×4'), 14);
    assert.equal(evaluateExpression('10÷4'), 2.5);
    assert.equal(evaluateExpression('1,5+1,5'), 3);
    assert.equal(evaluateExpression('(2+3)×2'), 10);
    assert.equal(evaluateExpression('10−3'), 7);
  });
  it('porcentagem: 200+10% = 220 e 100×10% = 10', () => {
    assert.equal(evaluateExpression('200+10%'), 220);
    assert.equal(evaluateExpression('200-10%'), 180);
    assert.equal(evaluateExpression('100×10%'), 10);
  });
  it('recusa divisão por zero e texto inválido', () => {
    assert.throws(() => evaluateExpression('5÷0'));
    assert.throws(() => evaluateExpression('2+'));
    assert.throws(() => evaluateExpression('alert(1)'));
  });
  it('histórico guarda o mais novo primeiro e no máximo 30', () => {
    let h: any[] = [];
    for (let i = 0; i < 40; i++) h = pushHistory(h, { expr: `${i}`, result: `${i}`, at: i });
    assert.equal(h.length, CALC_HISTORY_LIMIT);
    assert.equal(h[0].expr, '39');
  });
});

describe('DRE pessoal', () => {
  const info = (k: string) => ({ casa: { label: 'Contas Casa', icon: '🏠' }, receitas: { label: 'Receitas', icon: '💰' } } as any)[k];
  const all = [
    tx({ type: 'receita', category: 'receitas', amount: 5000, date: '2026-11-05', status: 'pago' }),
    tx({ type: 'despesa', category: 'casa', subcategory: 'Aluguel', amount: 1500, date: '2026-11-10', status: 'pago' }),
    tx({ type: 'despesa', category: 'casa', subcategory: 'Luz', amount: 500, date: '2026-11-20' }),
    tx({ type: 'despesa', category: 'casa', amount: 999, date: '2026-10-20' }), // outro mês
    tx({ type: 'despesa', category: 'casa', amount: 100, date: '2026-12-02', competencia: '2026-11' }), // competência novembro
  ];
  it('resultado = receitas − despesas do período, por competência', () => {
    const d = buildDre(transactionsForPeriod(all as any, '2026-11'), info);
    assert.equal(d.receitas, 5000);
    assert.equal(d.despesas, 2100);
    assert.equal(d.resultado, 2900);
    assert.equal(d.margem, 58);
    assert.equal(d.pago, 1500);
    assert.equal(d.aPagar, 600);
    assert.equal(d.despesasLinhas[0].pct, 42);
  });
  it('visão anual soma o ano inteiro', () => {
    const d = buildDre(transactionsForPeriod(all as any, '2026'), info);
    assert.equal(d.despesas, 3099);
  });
});

describe('Dicas', () => {
  it('avisa quando gasta mais do que ganha e quando há atrasadas', () => {
    const t = contextualTips({ receitas: 1000, despesas: 1500, atrasadas: 200, pendentes: 0 });
    assert.ok(t.some(x => x.title.includes('atrasadas')));
    assert.ok(t.some(x => x.title.includes('mais do que ganha')));
  });
  it('elogia quando gasta até 80% da renda sem atrasos', () => {
    const t = contextualTips({ receitas: 1000, despesas: 700, atrasadas: 0, pendentes: 0 });
    assert.ok(t.some(x => x.tone === 'boa'));
  });
});
