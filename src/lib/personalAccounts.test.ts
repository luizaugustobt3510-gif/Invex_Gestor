import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { filterPersonalAccounts, type PersonalAccount } from './personalAccounts';

const base: PersonalAccount = {
  user_id: '1', nome: 'Ana', email: 'ana@x.com', created_at: '2026-01-01', last_sign_in_at: null,
  login_google: false, email_confirmado: true, tem_empresa: false, empresa: null,
  usa_rotina: false, usa_fitness: false, usa_financas: false,
  rotina_premium: false, fitness_premium: false, financas_premium: false,
  telefone: '(11) 91234-5678', cidade: null, uf: null,
};
const fin = { ...base, user_id: 'f', nome: 'Bruno', email: 'bruno@x.com', usa_financas: true };
const fit = { ...base, user_id: 'g', nome: 'Carla', email: 'carla@x.com', usa_fitness: true, telefone: null };

describe('filterPersonalAccounts', () => {
  it('filtro Finanças mostra só quem usa Finanças', () => {
    assert.deepEqual(filterPersonalAccounts([base, fin, fit], 'financas', '').map(r => r.user_id), ['f']);
  });
  it('filtro Fitness mostra só quem usa Fitness', () => {
    assert.deepEqual(filterPersonalAccounts([base, fin, fit], 'fitness', '').map(r => r.user_id), ['g']);
  });
  it('Todos inclui contas que ainda não abriram app', () => {
    assert.equal(filterPersonalAccounts([base, fin, fit], 'todos', '').length, 3);
  });
  it('busca por telefone ignora máscara', () => {
    assert.deepEqual(filterPersonalAccounts([base, fin, fit], 'todos', '912345').map(r => r.user_id), ['1', 'f']);
  });
});
