import { describe, expect, test } from 'bun:test';
import { anamneseEntryPhase, isAnamneseAnswerComplete } from './anamneseReview';

describe('Revisão da anamnese', () => {
  test('edição de anamnese pronta abre na revisão', () => {
    expect(anamneseEntryPhase('anamnese-concluida')).toBe('review');
    expect(anamneseEntryPhase('')).toBe('questions');
  });
  test('pergunta opcional não exige resposta para finalizar', () => {
    expect(isAnamneseAnswerComplete(false, '')).toBe(true);
  });
  test('revisão não permite salvar pergunta obrigatória vazia', () => {
    expect(isAnamneseAnswerComplete(true, '')).toBe(false);
    expect(isAnamneseAnswerComplete(true, '[]')).toBe(false);
    expect(isAnamneseAnswerComplete(true, '[""]')).toBe(false);
    expect(isAnamneseAnswerComplete(true, 'Sim')).toBe(true);
  });
  test('uma ou várias regiões preenchem uma pergunta obrigatória', () => {
    expect(isAnamneseAnswerComplete(true, '["frontal"]')).toBe(true);
    expect(isAnamneseAnswerComplete(true, '["frontal","mandibula"]')).toBe(true);
  });
});