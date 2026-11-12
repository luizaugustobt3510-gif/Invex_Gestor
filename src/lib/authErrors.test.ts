import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { authErrorMessage } from './authErrors';

describe('authErrorMessage', () => {
  it('explica senha vazada/fraca em vez de erro genérico', () => {
    const msg = authErrorMessage({ code: 'weak_password', message: 'Password is known to be weak and easy to guess, please choose a different one.' });
    assert.match(msg, /senha é muito comum/);
  });
  it('e-mail já cadastrado', () => {
    assert.equal(authErrorMessage({ message: 'User already registered' }), 'Este e-mail já tem conta. Entre com ele.');
  });
  it('login errado', () => {
    assert.equal(authErrorMessage({ code: 'invalid_credentials', message: 'Invalid login credentials' }), 'E-mail ou senha incorretos.');
  });
  it('muitas tentativas', () => {
    assert.match(authErrorMessage({ status: 429, message: 'email rate limit exceeded' }), /Muitas tentativas/);
  });
  it('erro desconhecido usa o texto padrão informado', () => {
    assert.equal(authErrorMessage({ message: 'xyz' }, 'Falhou.'), 'Falhou.');
  });
});
