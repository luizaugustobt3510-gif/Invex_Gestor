import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { computeSummary } from './transactions';

const tx = (o: any) => ({ id: Math.random().toString(), user_id: 'u', category: 'c', subcategory: 'Geral', description: 'x', date: '2026-11-10', status: 'pendente', note: null, person_id: null, series_id: null, series_kind: null, installment_number: null, installment_total: null, competencia: null, created_at: '', ...o });

describe('Resumo do mês', () => {
  it('A receber soma receitas ainda não recebidas, inclusive recorrentes', () => {
    const s = computeSummary([
      tx({ type: 'receita', amount: 50, status: 'pago', series_kind: 'recorrente' }),
      tx({ type: 'receita', amount: 50, status: 'pendente', series_kind: 'recorrente' }),
      tx({ type: 'receita', amount: 30, status: 'pendente' }),
    ] as any);
    assert.equal(s.aReceber, 80);
    assert.equal(s.receitas, 130);
  });
  it('Saldo na conta conta só receita recebida menos despesa paga', () => {
    const s = computeSummary([
      tx({ type: 'receita', amount: 100, status: 'pago' }),
      tx({ type: 'receita', amount: 200, status: 'pendente' }),
      tx({ type: 'despesa', amount: 40, status: 'pago' }),
      tx({ type: 'despesa', amount: 10, status: 'pendente' }),
    ] as any);
    assert.equal(s.saldoFinal, 60);
    assert.equal(s.pendentes, 10);
  });
});
