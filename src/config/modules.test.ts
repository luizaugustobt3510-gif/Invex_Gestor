import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { CHILD_MODULES, isModuleOnForCompany, MODULES_CATALOG } from './modules';

describe('Clínica e submódulos', () => {
  it('Clínica agrupa prontuário, evolução e demais submódulos', () => {
    for (const k of ['agenda', 'prontuario', 'anamnese', 'evolucao', 'receituario', 'dispensacao', 'faturamento']) {
      assert.ok(CHILD_MODULES.clinica.includes(k), k);
    }
  });
  it('submódulo segue a Clínica desligada na empresa', () => {
    assert.equal(isModuleOnForCompany({ clinica: false }, 'prontuario'), false);
    assert.equal(isModuleOnForCompany({ clinica: true }, 'prontuario'), true);
  });
  it('Clínica desligada desliga o submódulo mesmo marcado', () => {
    assert.equal(isModuleOnForCompany({ clinica: false, prontuario: true }, 'prontuario'), false);
  });
  it('conferência de temperatura não existe mais no catálogo', () => {
    const keys = MODULES_CATALOG.flatMap((m) => [m.key, ...m.submodules.map((s) => s.key)]);
    assert.ok(!keys.some((k) => k.includes('conferencia')));
  });
});
