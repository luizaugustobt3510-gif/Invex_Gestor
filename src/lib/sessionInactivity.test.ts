import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { inactivityTimeoutFor } from './sessionInactivity';

describe('session inactivity policy', () => {
  it('logs out all non-Fitness roles, including administrators, after exactly two hours', () => {
    for (const role of ['superadm', 'admin', 'usuario almox', 'solicitante', 'logistica', 'rh', 'financeiro', 'visualizador', 'manutencao', 'clinica', 'enfermagem', 'enfermeiro', 'recepcionista']) {
      assert.equal(inactivityTimeoutFor({ role, companyId: 'other-company' }), 7_200_000);
    }
  });

  it('exempts Invex Fitness users from inactivity logout', () => {
    assert.equal(inactivityTimeoutFor({ role: 'fitness', companyId: null }), null);
    assert.equal(inactivityTimeoutFor({ role: 'enfermeiro', companyId: 'f54ebd25-21cc-43e8-888f-ffbbed1d4b7f' }), null);
  });
});