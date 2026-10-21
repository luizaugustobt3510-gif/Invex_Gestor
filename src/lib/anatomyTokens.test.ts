import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { areaToken, highlightedAreaIds, regionForToken } from './anatomyTokens';

const regions = [{ id: 'r1', slug: 'falange_distal', nome: 'Falange distal' }];
const maps = [{ regions: [
  { id: 'a1', region_id: 'r1' }, { id: 'a2', region_id: 'r1' },
] }];

describe('anatomyTokens', () => {
  it('clicar em uma área destaca só ela, mesmo com nome repetido', () => {
    assert.deepEqual([...highlightedAreaIds([areaToken('a2')], regions, maps)], ['a2']);
  });
  it('seleção pelo nome (anamneses antigas) destaca todas as áreas da região', () => {
    assert.deepEqual([...highlightedAreaIds(['falange_distal'], regions, maps)].sort(), ['a1', 'a2']);
  });
  it('área resolve para o nome da região', () => {
    assert.equal(regionForToken(areaToken('a1'), regions, maps)?.nome, 'Falange distal');
  });
});
