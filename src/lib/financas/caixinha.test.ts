import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildMonthlySeries, caixinhaDescription, isCaixinha, summarizeCaixinhas, clampMonths, nextDescription, parseCaixinha, txTitle, caixinhaPurpose, caixinhaLabel } from './caixinha';
import { txBucket } from './plan';

const base = { user_id: 'u', type: 'receita' as const, category: 'receitas', subcategory: 'Outros', description: caixinhaDescription('Viagem'), note: null, person_id: null, competencia: null };

describe('Receita recorrente e caixinha', () => {
  it('cria 1 lançamento por mês pelo número de meses escolhido', () => {
    const rows = buildMonthlySeries(base, { amount: 250, date: '2026-01-31', months: 12, seriesId: 's', firstPaid: false });
    assert.equal(rows.length, 12);
    assert.deepEqual(rows.slice(0, 3).map((r) => r.date), ['2026-01-31', '2026-02-28', '2026-03-31']);
    assert.ok(rows.every((r) => r.amount === 250 && r.series_kind === 'recorrente'));
  });
  it('só o primeiro mês pode nascer pago; os outros ficam a pagar', () => {
    const rows = buildMonthlySeries(base, { amount: 100, date: '2026-11-10', months: 3, seriesId: 's', firstPaid: true });
    assert.deepEqual(rows.map((r) => r.status), ['pago', 'pendente', 'pendente']);
  });
  it('limita entre 2 e 60 meses', () => {
    assert.equal(clampMonths('1'), 2);
    assert.equal(clampMonths('99'), 60);
  });
  it('cada depósito da caixinha conta como reserva', () => {
    const rows = buildMonthlySeries(base, { amount: 100, date: '2026-11-10', months: 2, seriesId: 's', firstPaid: false });
    assert.ok(rows.every((r) => isCaixinha(r) && txBucket(r) === 'reserva'));
  });
  it('mostra quanto já foi guardado do total da caixinha', () => {
    const rows = buildMonthlySeries(base, { amount: 250, date: '2026-11-10', months: 12, seriesId: 's', firstPaid: true })
      .map((r, i) => ({ ...r, id: String(i), created_at: '', status: i < 3 ? 'pago' as const : r.status }));
    const [c] = summarizeCaixinhas(rows as never);
    assert.equal(c.purpose, 'Viagem');
    assert.equal(c.goal, 3000);
    assert.equal(c.saved, 750);
    assert.equal(c.paidCount, 3);
    assert.equal(c.nextDate, '2027-02-10');
  });
  it('meta definida pelo usuário substitui o total previsto', () => {
    const rows = [0, 1].map((i) => ({ ...base, id: String(i), created_at: '', amount: 500, date: '2026-11-10', status: 'pago' as const, series_id: null, series_kind: null }));
    const [c] = summarizeCaixinhas(rows as never, { 'meta:viagem': 10000 });
    assert.equal(c.goal, 10000);
    assert.equal(c.planned, 1000);
    assert.equal(c.saved, 1000);
  });
});

describe('Caixinha mantém o nome da pessoa', () => {
  const tx = (description: string) => ({ type: 'receita' as const, subcategory: 'Outros', description, series_kind: 'recorrente' as const });
  it('guardar numa caixinha não apaga o nome da pessoa', () => {
    const d = nextDescription({ toCaixinha: true, purpose: 'Ônibus - Viagem Curitiba', label: '03 - Carlos' });
    assert.equal(d, 'Reserva · Ônibus - Viagem Curitiba — 03 - Carlos');
    assert.deepEqual(parseCaixinha(d), { purpose: 'Ônibus - Viagem Curitiba', label: '03 - Carlos' });
  });
  it('a lista mostra o nome da pessoa e a caixinha agrupa pelo propósito', () => {
    const t = tx('Reserva · Viagem — Carlos');
    assert.equal(txTitle(t), 'Carlos');
    assert.equal(caixinhaPurpose(t), 'Viagem');
    assert.ok(isCaixinha(t));
  });
  it('caixinha sem nome continua funcionando como antes', () => {
    const t = tx('Reserva · Viagem');
    assert.equal(txTitle(t), 'Viagem');
    assert.equal(caixinhaLabel(t), '');
  });
  it('tirar da caixinha devolve o nome da pessoa', () => {
    assert.equal(nextDescription({ toCaixinha: false, purpose: 'Viagem', label: 'Carlos' }), 'Carlos');
    assert.equal(nextDescription({ toCaixinha: false, purpose: 'Viagem', label: '' }), 'Viagem');
  });
  it('várias pessoas na mesma caixinha somam juntas', () => {
    const rows = ['Ana', 'Bia'].map((n, i) => ({ ...tx(`Reserva · Viagem — ${n}`), id: String(i), created_at: '', amount: 100, date: '2026-11-10', status: 'pago' as const }));
    const list = summarizeCaixinhas(rows as never);
    assert.equal(list.length, 1);
    assert.equal(list[0].saved, 200);
  });
});
