import { describe, it as test } from 'node:test';
import { strict as assert } from 'node:assert';
import { rendimento, stockStatus, custoConsumo, custoUnitario, desvioFicha, producaoEsperada } from './producaoCalc';

describe('rendimento da produção', () => {
  test('100 kg viram 85 kg: rendimento 85% e perda 15 kg', () => {
    const r = rendimento(100, 85);
    assert.equal(r.rendimento, 85);
    assert.equal(r.perda, 15);
    assert.equal(r.perdaPct, 15);
  });
});

describe('situação do estoque', () => {
  test('estoque zerado após venda/consumo/produção vira crítico', () => {
    assert.equal(stockStatus(0, 5), 'Zerado');
  });
  test('estoque negativo também é crítico', () => {
    assert.equal(stockStatus(-2, 0), 'Zerado');
  });
  test('abaixo do mínimo é alerta', () => {
    assert.equal(stockStatus(3, 5), 'Abaixo do Mínimo');
  });
  test('no mínimo ou acima fica OK', () => {
    assert.equal(stockStatus(5, 5), 'OK');
  });
});

describe('custos e ficha técnica', () => {
  test('lote de 100 kg custou R$ 500: consumir 40 kg custa R$ 200', () => {
    assert.equal(custoConsumo(500, 100, 40), 200);
  });
  test('R$ 200 de matéria-prima para 8 unidades: R$ 25 cada', () => {
    assert.equal(custoUnitario(200, 8), 25);
  });
  test('rendimento real 80% com ficha de 85%: 5 pontos abaixo', () => {
    assert.equal(desvioFicha(80, 85), -5);
  });
  test('ficha de 10%: 100 litros devem render 10', () => {
    assert.equal(producaoEsperada(100, 10), 10);
  });
});
