import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deleteBlockReason, manualPremiumActive } from './personalAccountAdmin';

const base = { user_id: 'u1', email: 'a@b.com', tem_empresa: false };

test('conta pessoal pode ser excluída', () => {
  assert.equal(deleteBlockReason(base, 'admin'), null);
});
test('conta com acesso empresarial não pode ser excluída aqui', () => {
  assert.match(deleteBlockReason({ ...base, tem_empresa: true }, 'admin')!, /empresarial/);
});
test('super admin não exclui a si mesmo', () => {
  assert.ok(deleteBlockReason(base, 'u1'));
});
test('conta master luiz@invex.com é protegida', () => {
  assert.ok(deleteBlockReason({ ...base, email: 'LUIZ@invex.com' }, 'admin'));
});
test('premium manual respeita a data de término', () => {
  assert.equal(manualPremiumActive(true, null, '2026-11-12'), true);
  assert.equal(manualPremiumActive(true, '2026-11-12', '2026-11-12'), true);
  assert.equal(manualPremiumActive(true, '2026-11-11', '2026-11-12'), false);
  assert.equal(manualPremiumActive(false, null, '2026-11-12'), false);
});
