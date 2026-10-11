const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../loadout-core');

// Check state is independent of the quantity comparison, including a zero recommendation.
const cases = [
  [true, 0, 0, false, false, 0, false],
  [false, 0, 0, true, false, 0, true],
  [true, 0, 1, false, true, 1, true],
  [false, 0, 1, true, true, 1, true],
  [true, 1, 0, false, false, 0, false],
  [false, 1, 0, true, false, 0, true],
  [true, 1, 1, false, false, 0, false],
  [false, 1, 1, true, false, 0, true],
  [true, 1, 2, false, true, 1, true],
  [false, 1, 2, true, true, 1, true]
];
for (const [checked, quantity, recommended_quantity, unchecked, belowRecommended, shortfall, needsReview] of cases) {
  test(`review checked=${checked}, quantity=${quantity}, recommended=${recommended_quantity}`, () => {
    const item = C.normalizeItem({ id: 'x', checked, quantity, recommended_quantity });
    const before = JSON.stringify(item);
    Object.freeze(item);
    assert.deepEqual(C.itemReview(item), { unchecked, belowRecommended, shortfall, needsReview });
    assert.deepEqual(['all', 'unchecked', 'below', 'either'].map(mode => C.matchesReview(item, mode)),
      [true, unchecked, belowRecommended, needsReview]);
    assert.equal(JSON.stringify(item), before);
  });
}

test('review preserves the largest valid shortfall and never reports a negative shortfall', () => {
  const below = C.normalizeItem({ id: 'x', checked: true, quantity: 0, recommended_quantity: 999 });
  assert.deepEqual(C.itemReview(below), { unchecked: false, belowRecommended: true, shortfall: 999, needsReview: true });
  const above = C.normalizeItem({ id: 'x', checked: true, quantity: 999, recommended_quantity: 0 });
  assert.deepEqual(C.itemReview(above), { unchecked: false, belowRecommended: false, shortfall: 0, needsReview: false });
});

test('review uses normalized packed defaults and explicit false without coercing check state', () => {
  assert.equal(C.itemReview(C.normalizeItem({ id: 'x', packed_by_default: true })).unchecked, false);
  assert.equal(C.itemReview(C.normalizeItem({ id: 'x', checked: false, packed_by_default: true })).unchecked, true);
  assert.equal(C.itemReview(C.normalizeItem({ id: 'x' })).unchecked, true);
  assert.equal(C.itemReview({ quantity: 1, recommended_quantity: 1 }).unchecked, false);
});

test('review reuses numeric defaults and validation without coercing numeric strings', () => {
  assert.deepEqual(C.itemReview({ checked: false }), { unchecked: true, belowRecommended: false, shortfall: 0, needsReview: true });
  for (const field of ['quantity', 'recommended_quantity']) {
    for (const value of ['1', false, -1, 0.5, 1000, Infinity, NaN]) {
      assert.throws(() => C.itemReview({ checked: true, [field]: value }), { name: 'TypeError', message: 'invalidNumber' });
    }
  }
});

test('review rejects unsupported modes, including inherited object property names', () => {
  const item = C.normalizeItem({ id: 'x' });
  for (const mode of [undefined, null, '', 'ALL', 'missing', 'constructor', '__proto__', {}, []]) {
    assert.throws(() => C.matchesReview(item, mode), { name: 'TypeError', message: 'invalidReviewMode' });
  }
});
