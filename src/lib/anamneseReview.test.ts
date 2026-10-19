import { describe, it as test } from 'node:test';
import { strict as assert } from 'node:assert';
import { anamneseEntryPhase, isAnamneseAnswerComplete } from './anamneseReview';

describe('Revisão da anamnese', () => {
  test('edição de anamnese pronta abre na revisão', () => {
    assert.equal(anamneseEntryPhase('anamnese-concluida'), 'review');
    assert.equal(anamneseEntryPhase(''), 'questions');
  });
  test('pergunta opcional não exige resposta para finalizar', () => {
    assert.equal(isAnamneseAnswerComplete(false, ''), true);
  });
  test('revisão não permite salvar pergunta obrigatória vazia', () => {
    assert.equal(isAnamneseAnswerComplete(true, ''), false);
    assert.equal(isAnamneseAnswerComplete(true, '[]'), false);
    assert.equal(isAnamneseAnswerComplete(true, '[""]'), false);
    assert.equal(isAnamneseAnswerComplete(true, 'Sim'), true);
  });
  test('uma ou várias regiões preenchem uma pergunta obrigatória', () => {
    assert.equal(isAnamneseAnswerComplete(true, '["frontal"]'), true);
    assert.equal(isAnamneseAnswerComplete(true, '["frontal","mandibula"]'), true);
  });
});