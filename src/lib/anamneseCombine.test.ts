import { test } from 'node:test';
import assert from 'node:assert/strict';
import { combineTemplates } from './anamneseCombine';

const q = (id: string, extra: any = {}) => ({ id, text: id, type: 'texto', required: true, ...extra }) as any;

test('only selected questions of the extra exam are added, after the base ones', () => {
  const out = combineTemplates(
    { id: 'a', name: 'Abdome', questions: [q('1')] },
    [{ templateId: 'p', name: 'Pelve', questions: [q('1'), q('2')], selectedIds: ['2'] }],
  );
  assert.deepEqual(out.map(x => x.id), ['1', 'x0:2']);
  assert.equal((out[1] as any).section, 'Pelve');
});

test('extra conditions point to the prefixed question ids', () => {
  const out = combineTemplates(
    { id: 'a', name: 'Abdome', questions: [] },
    [{ templateId: 'p', name: 'Pelve', questions: [q('1'), q('2', { conditions: [{ questionId: '1', values: ['Sim'] }] })], selectedIds: ['1', '2'] }],
  );
  assert.equal(out[1].conditions![0].questionId, 'x0:1');
});
