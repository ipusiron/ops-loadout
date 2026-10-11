const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../loadout-core');
const item = (id, overrides = {}) => ({ id, name: 'Item', ...overrides });
const zeroTotals = { weight: 0, volume: 0, quantity: 0, rows: 0 };

test('comparison of empty lists returns the complete empty result', () => {
  assert.deepEqual(C.compareItems([], []), {
    rows: [], counts: { added: 0, removed: 0, changed: 0, unchanged: 0 },
    currentTotals: zeroTotals, referenceTotals: zeroTotals, delta: zeroTotals
  });
});

test('comparison reports all four statuses in current order then removed reference order', () => {
  const current = [item('same'), item('added'), item('changed', { quantity: 2 })];
  const reference = [item('removed-b'), item('changed'), item('same'), item('removed-a')];
  const result = C.compareItems(current, reference);
  assert.deepEqual(result.rows.map(row => [row.id, row.status, row.changes]), [
    ['same', 'unchanged', []], ['added', 'added', []], ['changed', 'changed', ['quantity']],
    ['removed-b', 'removed', []], ['removed-a', 'removed', []]
  ]);
  assert.deepEqual(result.counts, { added: 1, removed: 2, changed: 1, unchanged: 1 });
  assert.deepEqual(result.rows[0].current, C.normalizeItem(current[0]));
  assert.deepEqual(result.rows[0].reference, C.normalizeItem(reference[2]));
  assert.equal(result.rows[1].reference, null);
  assert.equal(result.rows[3].current, null);
  assert.equal(result.rows[4].current, null);
});

test('comparison handles either empty side without inferring field changes', () => {
  const value = item('only', { quantity: 2, checked: true, weight_g: 3, volume_cm3: 4 });
  const added = C.compareItems([value], []);
  const removed = C.compareItems([], [value]);
  assert.deepEqual(added.counts, { added: 1, removed: 0, changed: 0, unchanged: 0 });
  assert.deepEqual(removed.counts, { added: 0, removed: 1, changed: 0, unchanged: 0 });
  assert.deepEqual(added.delta, { weight: 6, volume: 8, quantity: 2, rows: 1 });
  assert.deepEqual(removed.delta, { weight: -6, volume: -8, quantity: -2, rows: -1 });
  assert.deepEqual(added.rows[0].changes, []);
  assert.deepEqual(removed.rows[0].changes, []);
});

test('comparison matches IDs only: same names with different IDs stay added and removed', () => {
  const result = C.compareItems([item('new')], [item('old')]);
  assert.deepEqual(result.rows.map(row => [row.id, row.status]), [['new', 'added'], ['old', 'removed']]);
  assert.deepEqual(result.counts, { added: 1, removed: 1, changed: 0, unchanged: 0 });
});

test('comparison retains a renamed shared ID and compares both effective names', () => {
  const result = C.compareItems([item('same', { name: 'New' })], [item('same', { name: 'Old' })]);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].status, 'changed');
  assert.deepEqual(result.rows[0].changes, ['name_ja', 'name_en']);
});

const comparedFields = {
  quantity: 2, recommended_quantity: 3, checked: true, weight_g: 1.25, volume_cm3: 2.5,
  name_ja: '名前', name_en: 'Name', category_ja: '分類', category_en: 'Category',
  purpose_short_ja: '用途', purpose_short_en: 'Purpose'
};
for (const [field, value] of Object.entries(comparedFields)) {
  test(`comparison detects only the changed declared field: ${field}`, () => {
    const result = C.compareItems([item('x', { [field]: value })], [item('x')]);
    assert.deepEqual(result.rows[0].changes, [field]);
    assert.deepEqual(result.counts, { added: 0, removed: 0, changed: 1, unchanged: 0 });
  });
}

test('comparison lists every declared change in a fixed order', () => {
  const result = C.compareItems([item('x', comparedFields)], [item('x')]);
  assert.deepEqual(result.rows[0].changes, Object.keys(comparedFields));
});

test('comparison uses effective translations rather than raw translation field presence', () => {
  const current = item('x', { name: 'Ignored', name_ja: 'Same', name_en: 'Same', category_ja: '', category_en: '' });
  const reference = item('x', { name: 'Same', purpose_short: '' });
  const result = C.compareItems([current], [reference]);
  assert.equal(result.rows[0].status, 'unchanged');
  assert.deepEqual(result.rows[0].changes, []);
  const fallback = C.compareItems([item('x', { category: 'Tools' })], [item('x')]);
  assert.deepEqual(fallback.rows[0].changes, ['category_ja', 'category_en']);
});

test('comparison normalizes both sides and preserves explicit zero and false', () => {
  const current = item('x', { quantity: 0, recommended_quantity: 0, checked: false, packed_by_default: true });
  const reference = item('x', { packed_by_default: true });
  const result = C.compareItems([current], [reference]);
  assert.deepEqual(result.rows[0].changes, ['quantity', 'recommended_quantity', 'checked']);
  assert.equal(result.rows[0].current.quantity, 0);
  assert.equal(result.rows[0].current.recommended_quantity, 0);
  assert.equal(result.rows[0].current.checked, false);
  assert.equal(result.rows[0].reference.quantity, 1);
  assert.equal(result.rows[0].reference.checked, true);
  assert.deepEqual(result.delta, { weight: 0, volume: 0, quantity: -1, rows: -1 });
  assert.equal(C.compareItems([item('x')], [C.normalizeItem(item('x'))]).rows[0].status, 'unchanged');
});

test('comparison totals use checked quantities, count checked zero rows and exclude unchecked rows', () => {
  const current = [
    item('a', { checked: true, quantity: 0, weight_g: 90, volume_cm3: 30 }),
    item('b', { checked: true, quantity: 3, weight_g: 20, volume_cm3: 10 }),
    item('new-unchecked', { checked: false, quantity: 9, weight_g: 99, volume_cm3: 99 })
  ];
  const reference = [
    item('a', { checked: true, quantity: 2, weight_g: 90, volume_cm3: 30 }),
    item('b', { checked: true, quantity: 1, weight_g: 20, volume_cm3: 10 }),
    item('old-unchecked', { checked: false, quantity: 9, weight_g: 99, volume_cm3: 99 })
  ];
  const result = C.compareItems(current, reference);
  assert.deepEqual(result.currentTotals, { weight: 60, volume: 30, quantity: 3, rows: 2 });
  assert.deepEqual(result.referenceTotals, { weight: 200, volume: 70, quantity: 3, rows: 2 });
  assert.deepEqual(result.delta, { weight: -140, volume: -40, quantity: 0, rows: 0 });
  assert.deepEqual(result.counts, { added: 1, removed: 1, changed: 2, unchanged: 0 });
});

test('comparison can find quantity differences while both rows are unchecked and totals stay zero', () => {
  const result = C.compareItems([item('x', { quantity: 2 })], [item('x', { quantity: 1 })]);
  assert.equal(result.rows[0].status, 'changed');
  assert.deepEqual(result.currentTotals, zeroTotals);
  assert.deepEqual(result.referenceTotals, zeroTotals);
  assert.deepEqual(result.delta, zeroTotals);
});

test('comparison uses exact numeric values without rounding small differences away', () => {
  const current = item('x', { checked: true, weight_g: 0.1 + 0.2, volume_cm3: 0.3 });
  const reference = item('x', { checked: true, weight_g: 0.3, volume_cm3: 0.3 });
  const result = C.compareItems([current], [reference]);
  assert.deepEqual(result.rows[0].changes, ['weight_g']);
  assert.equal(result.delta.weight, (0.1 + 0.2) - 0.3);
  assert.equal(result.delta.volume, 0);
});

test('comparison excludes metadata and flags but keeps them in normalized rows', () => {
  const current = item('x', {
    description: 'New description', recommended_location_on_body: 'Bag', dual_use: true, hazard_flag: true,
    legality_notes: { JP: 'Check rules' }, sources: [{ title: 'Example' }], scores: { survivability: 2 },
    category_tags: ['new'], repack_frequency: 'daily', packed_by_default: true, checked: false,
    custom_meta: { note: 'Preserved' }, concealability: 1
  });
  const result = C.compareItems([current], [item('x')]);
  assert.equal(result.rows[0].status, 'unchanged');
  assert.deepEqual(result.rows[0].changes, []);
  assert.deepEqual(result.rows[0].current.custom_meta, { note: 'Preserved' });
  assert.equal(result.rows[0].current.hazard_flag, true);
});

test('comparison accepts prototype-like IDs safely and does not coalesce case or whitespace', () => {
  const ids = ['__proto__', 'constructor', 'prototype', 'toString', 'hasOwnProperty', 'A', 'a', ' a '];
  const current = ids.map(id => item(id));
  const reference = ids.toReversed().map(id => item(id));
  const result = C.compareItems(current, reference);
  assert.deepEqual(result.rows.map(row => row.id), ids);
  assert.deepEqual(result.counts, { added: 0, removed: 0, changed: 0, unchanged: 8 });
  const unmatched = C.compareItems([item('__proto__')], [item('constructor')]);
  assert.deepEqual(unmatched.rows.map(row => row.status), ['added', 'removed']);
  assert.equal({}.polluted, undefined);
});

test('comparison rejects invalid lists, duplicate IDs and invalid items on either side', () => {
  const badLists = [null, {}, '[]', [item('a'), item('a')], [item('')], [item('x'.repeat(257))],
    [item('x', { name: {} })], [item('x', { checked: 1 })], [item('x', { scores: { x: 6 } })]];
  for (const bad of badLists) {
    assert.throws(() => C.compareItems(bad, []), TypeError);
    assert.throws(() => C.compareItems([], bad), TypeError);
  }
  for (const field of ['quantity', 'recommended_quantity', 'weight_g', 'volume_cm3']) {
    for (const value of [-1, Infinity, NaN, '1']) {
      assert.throws(() => C.compareItems([item('x', { [field]: value })], []), { name: 'TypeError', message: 'invalidNumber' });
      assert.throws(() => C.compareItems([], [item('x', { [field]: value })]), { name: 'TypeError', message: 'invalidNumber' });
    }
  }
});

test('comparison supports maximum valid numeric values and rejects the next value', () => {
  const max = item('x', { checked: true, quantity: 999, recommended_quantity: 999, weight_g: 1e9, volume_cm3: 1e9 });
  const result = C.compareItems([max], []);
  assert.deepEqual(result.currentTotals, { weight: 999e9, volume: 999e9, quantity: 999, rows: 1 });
  assert.deepEqual(result.delta, result.currentTotals);
  for (const [field, value] of [['quantity', 1000], ['recommended_quantity', 1000], ['weight_g', 1e9 + 1], ['volume_cm3', 1e9 + 1]]) {
    assert.throws(() => C.compareItems([item('x', { [field]: value })], []), TypeError);
    assert.throws(() => C.compareItems([], [item('x', { [field]: value })]), TypeError);
  }
});

test('comparison allows 10000 items per side, including 20000 different result rows', () => {
  const current = Array.from({ length: 10000 }, (_, i) => item('current-' + i));
  const reference = Array.from({ length: 10000 }, (_, i) => item('reference-' + i));
  const result = C.compareItems(current, reference);
  assert.equal(result.rows.length, 20000);
  assert.deepEqual(result.counts, { added: 10000, removed: 10000, changed: 0, unchanged: 0 });
  assert.equal(result.rows[9999].id, 'current-9999');
  assert.equal(result.rows[10000].id, 'reference-0');
  assert.equal(result.rows[19999].id, 'reference-9999');
  assert.throws(() => C.compareItems([...current, item('overflow')], []), { name: 'TypeError', message: 'invalidItems' });
  assert.throws(() => C.compareItems([], [...reference, item('overflow')]), { name: 'TypeError', message: 'invalidItems' });
});

test('comparison does not mutate frozen inputs or treat row reordering as a change', () => {
  function freeze(value) {
    if (value && typeof value === 'object') {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }
  const current = freeze([item('b', { custom_meta: { values: [0, false] } }), item('a', { quantity: 0 })]);
  const reference = freeze([item('a', { quantity: 0 }), item('b', { custom_meta: { values: [1, true] } })]);
  const before = JSON.stringify({ current, reference });
  const result = C.compareItems(current, reference);
  assert.equal(JSON.stringify({ current, reference }), before);
  assert.deepEqual(result.rows.map(row => [row.id, row.status]), [['b', 'unchanged'], ['a', 'unchanged']]);
  assert.notStrictEqual(result.rows[0].current, current[0]);
  assert.notStrictEqual(result.rows[0].reference, reference[1]);
  assert.deepEqual(result, C.compareItems(current, reference));
});
