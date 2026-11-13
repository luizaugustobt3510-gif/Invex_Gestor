import { describe, it as test } from 'node:test';
import { strict as assert } from 'node:assert';
import { planOldestFirst, saldoSemLote, saleTotals, customerScore, type SaleLot } from './vendasCalc';

const lot = (id: string, data: string, restante: number): SaleLot => ({
  id, tipo: 'produto', material_id: 'm', lote: id, data_producao: data, validade: null, restante, created_at: `${data}T10:00:00Z`,
});

describe('venda pelo lote mais antigo', () => {
  test('vende primeiro do lote produzido antes', () => {
    const r = planOldestFirst([lot('L2', '2026-11-10', 5), lot('L1', '2026-11-01', 3)], 4);
    assert.deepEqual(r.usados.map((u) => [u.lot.id, u.qtd]), [['L1', 3], ['L2', 1]]);
    assert.equal(r.semLote, 0);
  });
  test('o que passar dos lotes sai do saldo sem lote', () => {
    const r = planOldestFirst([lot('L1', '2026-11-01', 1.5)], 2);
    assert.equal(r.usados[0].qtd, 1.5);
    assert.equal(r.semLote, 0.5);
  });
  test('saldo sem lote = estoque menos o que está nos lotes', () => {
    assert.equal(saldoSemLote(10, [lot('L1', '2026-11-01', 4)]), 6);
    assert.equal(saldoSemLote(3, [lot('L1', '2026-11-01', 4)]), 0);
  });
});

describe('total da venda', () => {
  test('1,5 kg a R$ 40 com 10% de desconto = R$ 54', () => {
    const t = saleTotals([{ quantidade: 1.5, preco_unitario: 40 }], 10, 'percentual');
    assert.equal(t.subtotal, 60);
    assert.equal(t.total, 54);
  });
  test('desconto maior que a venda não deixa total negativo', () => {
    assert.equal(saleTotals([{ quantidade: 1, preco_unitario: 10 }], 50, 'valor').total, 0);
  });
});

describe('pontuação do comprador', () => {
  test('quem mais compra e é bem avaliado fica com 100%', () => {
    const s = customerScore({ faturamento: 1000, compras: 10, avaliacao: 10, pontualidade: 10 }, { faturamento: 1000, compras: 10 },
      { faturamento: 0.4, frequencia: 0.3, avaliacao: 0.3 });
    assert.equal(Math.round(s * 100), 100);
  });
});
