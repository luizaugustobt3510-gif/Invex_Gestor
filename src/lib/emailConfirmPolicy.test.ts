import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { emailConfirmState, daysLeft } from './emailConfirmPolicy';

const created = '2026-11-01T12:00:00Z';
describe('confirmação de e-mail depois', () => {
  it('conta confirmada nunca é avisada nem bloqueada', () => {
    assert.equal(emailConfirmState(true, created, new Date('2026-12-30T00:00:00Z')), 'ok');
  });
  it('sem confirmar, dentro de 1 semana só mostra aviso', () => {
    assert.equal(emailConfirmState(false, created, new Date('2026-11-08T11:59:00Z')), 'aviso');
  });
  it('sem confirmar, depois de 1 semana bloqueia', () => {
    assert.equal(emailConfirmState(false, created, new Date('2026-11-08T12:00:00Z')), 'bloqueado');
  });
  it('conta os dias que faltam', () => {
    assert.equal(daysLeft(created, new Date('2026-11-01T12:00:00Z')), 7);
    assert.equal(daysLeft(created, new Date('2026-11-07T13:00:00Z')), 1);
    assert.equal(daysLeft(created, new Date('2026-11-09T00:00:00Z')), 0);
  });
});
