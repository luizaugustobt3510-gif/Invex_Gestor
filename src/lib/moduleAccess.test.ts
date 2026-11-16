import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { resolveModuleAccess, type ModuleAccessInput } from './moduleAccess';

const base = (over: Partial<ModuleAccessInput>): ModuleAccessInput => ({
  role: 'admin', dbRole: 'admin_empresa', companyModules: {}, userModules: {}, roleModules: {}, ...over,
});

describe('acesso a módulos', () => {
  it('módulo desligado na empresa some até para o admin', () => {
    assert.equal(resolveModuleAccess(base({ companyModules: { rh: false } }), 'rh'), false);
  });
  it('submódulo desligado na empresa some até para o admin', () => {
    assert.equal(resolveModuleAccess(base({ companyModules: { 'financeiro.dre': false } }), 'financeiro.dre'), false);
  });
  it('módulo desligado para o usuário admin fica bloqueado', () => {
    assert.equal(resolveModuleAccess(base({ userModules: { financeiro: false } }), 'financeiro'), false);
    assert.equal(resolveModuleAccess(base({ userModules: { financeiro: false } }), 'financeiro.dre'), false);
  });
  it('admin continua com os módulos ligados', () => {
    assert.equal(resolveModuleAccess(base({}), 'logistica'), true);
  });
  it('Clínica desligada desliga os submódulos mesmo com eles marcados', () => {
    const input = base({ companyModules: { clinica: false, prontuario: true } });
    assert.equal(resolveModuleAccess(input, 'prontuario'), false);
    assert.equal(resolveModuleAccess(input, 'prontuario.pacientes'), false);
  });
  it('anamnese só aparece quando ligada na empresa', () => {
    assert.equal(resolveModuleAccess(base({}), 'anamnese'), false);
    assert.equal(resolveModuleAccess(base({ companyModules: { anamnese: true } }), 'anamnese'), true);
  });
  it('liberação do usuário não vence módulo desligado na empresa', () => {
    const input = base({ role: 'logistica', dbRole: 'logistica', companyModules: { rh: false }, userModules: { rh: true } });
    assert.equal(resolveModuleAccess(input, 'rh'), false);
  });
  it('perfil comum segue usuário, depois Perfis × Módulos, depois padrão', () => {
    const l = { role: 'logistica', dbRole: 'logistica' };
    assert.equal(resolveModuleAccess(base({ ...l }), 'logistica'), true);
    assert.equal(resolveModuleAccess(base({ ...l, roleModules: { logistica: false } }), 'logistica'), false);
    assert.equal(resolveModuleAccess(base({ ...l, roleModules: { logistica: false }, userModules: { logistica: true } }), 'logistica'), true);
    assert.equal(resolveModuleAccess(base({ ...l }), 'financeiro'), false);
  });
});
