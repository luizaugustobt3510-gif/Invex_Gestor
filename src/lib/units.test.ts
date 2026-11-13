import { describe, it as test } from 'node:test';
import { strict as assert } from 'node:assert';
import { isFractionalUnit, parseQty, formatQty, unitShort } from './units';

describe('unidades de venda e produção', () => {
  test('quilo, tonelada e litro aceitam fração', () => {
    assert.equal(isFractionalUnit('KG'), true);
    assert.equal(isFractionalUnit('Kg'), true);
    assert.equal(isFractionalUnit('TON'), true);
    assert.equal(isFractionalUnit('LITRO'), true);
  });
  test('unidade, pacote e caixa não aceitam fração', () => {
    assert.equal(isFractionalUnit('UNIDADE'), false);
    assert.equal(isFractionalUnit('PACOTE'), false);
    assert.equal(isFractionalUnit('CX'), false);
  });
  test('1,5 kg digitado com vírgula vira 1.5', () => {
    assert.equal(parseQty('1,5', 'KG').value, 1.5);
  });
  test('1,5 pacote é recusado', () => {
    const r = parseQty('1,5', 'PCT');
    assert.equal(r.value, null);
    assert.ok(r.error);
  });
  test('zero ou vazio é recusado', () => {
    assert.equal(parseQty('0', 'KG').value, null);
    assert.equal(parseQty('', 'UN').value, null);
  });
  test('quantidade mostra a unidade curta', () => {
    assert.equal(formatQty(2.5, 'KG'), '2,5 kg');
    assert.equal(formatQty(3, 'UNIDADE'), '3 un');
    assert.equal(unitShort('TON'), 't');
  });
});
