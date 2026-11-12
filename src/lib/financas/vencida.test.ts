import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isVencida, transactionsForMonth } from './transactions';
import { currentMonthKey } from './format';

const tx = (o: any) => ({ id: Math.random().toString(), user_id: 'u', category: 'c', subcategory: 'Geral', description: 'x', date: '2026-11-10', status: 'pendente', note: null, person_id: null, series_id: null, series_kind: null, installment_number: null, installment_total: null, competencia: null, created_at: '', ...o });

describe('Receita vencida', () => {
  it('receita pendente com data passada fica vencida', () => {
    assert.equal(isVencida(tx({ type: 'receita', date: '2026-11-01' }), '2026-11-12'), true);
  });
  it('receita pendente com data de hoje ou futura não fica vencida', () => {
    assert.equal(isVencida(tx({ type: 'receita', date: '2026-11-12' }), '2026-11-12'), false);
    assert.equal(isVencida(tx({ type: 'receita', date: '2026-11-20' }), '2026-11-12'), false);
  });
  it('receita já recebida nunca fica vencida', () => {
    assert.equal(isVencida(tx({ type: 'receita', status: 'pago', date: '2026-11-01' }), '2026-11-12'), false);
  });
  it('receita vencida de mês anterior aparece no mês atual como atrasada', () => {
    const hoje = currentMonthKey();
    const [y, m] = hoje.split('-').map(Number);
    const anterior = new Date(y, m - 2, 5);
    const data = `${anterior.getFullYear()}-${String(anterior.getMonth() + 1).padStart(2, '0')}-05`;
    const lista = transactionsForMonth([tx({ type: 'receita', date: data })] as any, hoje);
    assert.equal(lista.length, 1);
    assert.equal(lista[0].vencida, true);
    assert.equal(lista[0].carried_over, true);
  });
});
