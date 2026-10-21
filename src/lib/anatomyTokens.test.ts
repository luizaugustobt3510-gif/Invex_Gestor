import { describe, it, expect } from 'vitest';
import { areaToken, highlightedAreaIds, regionForToken } from './anatomyTokens';

const regions = [{ id: 'r1', slug: 'falange_distal', nome: 'Falange distal' }];
const maps = [{ regions: [
  { id: 'a1', region_id: 'r1' }, { id: 'a2', region_id: 'r1' },
] }];

describe('anatomyTokens', () => {
  it('clicar em uma área destaca só ela, mesmo com nome repetido', () => {
    expect([...highlightedAreaIds([areaToken('a2')], regions, maps)]).toEqual(['a2']);
  });
  it('seleção pelo nome (anamneses antigas) destaca todas as áreas da região', () => {
    expect([...highlightedAreaIds(['falange_distal'], regions, maps)].sort()).toEqual(['a1', 'a2']);
  });
  it('área resolve para o nome da região', () => {
    expect(regionForToken(areaToken('a1'), regions, maps)?.nome).toBe('Falange distal');
  });
});
