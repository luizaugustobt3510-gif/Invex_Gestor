import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { dbErrorMessage, groupNameExists, normalizeGroupName } from './dbErrors';

describe('dbErrorMessage', () => {
  it('erro de permissão vira mensagem em português', () => {
    const msg = dbErrorMessage({ code: '42501', message: 'new row violates row-level security policy for table "materials"' });
    assert.match(msg, /não tem permissão/);
    assert.doesNotMatch(msg, /row-level/);
  });
  it('código duplicado', () => {
    assert.equal(dbErrorMessage({ code: '23505', message: 'duplicate key value' }), 'Já existe um cadastro com esses dados.');
  });
});

describe('grupos de materiais', () => {
  it('não deixa criar grupo repetido com outra grafia', () => {
    assert.equal(groupNameExists('  limpeza ', [{ nome: 'Limpeza' }]), true);
    assert.equal(groupNameExists('Escritorio', [{ nome: 'Escritório' }]), true);
    assert.equal(groupNameExists('Peixes', [{ nome: 'Limpeza' }]), false);
  });
  it('limpa espaços do nome', () => {
    assert.equal(normalizeGroupName('  Pescados   frescos '), 'Pescados frescos');
  });
});
