import { describe, it as test } from 'node:test';
import { strict as assert } from 'node:assert';
import { DEFAULT_STATUS_FILTER, matchesOrigem, origemLabel } from './contasUtils';

describe('origem das contas', () => {
  test('lançamento gerado pelo PDV aparece como Venda', () => {
    assert.equal(origemLabel('vendas'), 'Venda');
  });
  test('entrada de matéria-prima aparece como Matéria-prima', () => {
    assert.equal(origemLabel('producao'), 'Matéria-prima');
  });
  test('filtro Vendas mostra só vendas', () => {
    assert.equal(matchesOrigem('vendas', 'vendas'), true);
    assert.equal(matchesOrigem('manual', 'vendas'), false);
  });
  test('filtro Matéria-prima mostra só compras de matéria-prima', () => {
    assert.equal(matchesOrigem('producao', 'producao'), true);
    assert.equal(matchesOrigem('vendas', 'producao'), false);
  });
  test('lista abre mostrando também vendas já recebidas', () => {
    assert.equal(DEFAULT_STATUS_FILTER, 'tudo');
  });
});
