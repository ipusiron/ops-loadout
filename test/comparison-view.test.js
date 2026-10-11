// Structural regression tests for the real renderer, core, and language resources.
// This small DOM stub models nodes/text/fragments only. It does not model layout,
// browser HTML parsing, focus, or input events; real-browser QA covers those areas.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../loadout-core');
const rendererSource = fs.readFileSync(path.join(__dirname, '../comparison-view.js'), 'utf8');
const languageSource = fs.readFileSync(path.join(__dirname, '../i18n.js'), 'utf8');
const item = (id, overrides = {}) => ({ id, name: 'Item', ...overrides });
const rowFields = ['name', 'category', 'purpose_short', 'quantity', 'recommended_quantity', 'checked', 'weight_g', 'volume_cm3'];

function harness(lang = 'en') {
  const forbidden = [];
  const created = [];
  function denied(operation) {
    forbidden.push(operation);
    throw new Error('Renderer must not access ' + operation);
  }
  class Node {
    constructor(tag) {
      this.tag = tag;
      this.children = [];
      this.dataset = Object.create(null);
      this.className = '';
      this.disabled = false;
      this._text = '';
    }
    get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
    set textContent(value) { this._text = value === null ? '' : String(value); this.children = []; }
    append(...children) {
      for (const child of children) {
        assert.ok(child instanceof Node, 'This renderer appends DOM nodes, not markup');
        if (child.tag === '#fragment') this.children.push(...child.children.splice(0));
        else this.children.push(child);
      }
    }
    replaceChildren(...children) { this._text = ''; this.children = []; this.append(...children); }
    addEventListener() { denied('element.addEventListener'); }
    focus() { denied('element.focus'); }
    insertAdjacentHTML() { denied('element.insertAdjacentHTML'); }
    get innerHTML() { return denied('element.innerHTML'); }
    set innerHTML(value) { denied('element.innerHTML'); }
    get outerHTML() { return denied('element.outerHTML'); }
    set outerHTML(value) { denied('element.outerHTML'); }
  }
  const roots = Object.fromEntries(['comparisonSummary', 'comparisonNames', 'comparisonStats',
    'comparisonRows', 'comparisonPage', 'comparisonPrev', 'comparisonNext'].map(id => [id, new Node('root')]));
  const document = {
    createElement(tag) { const node = new Node(tag); created.push(node); return node; },
    createDocumentFragment() { return new Node('#fragment'); },
    getElementById(id) { assert.ok(Object.hasOwn(roots, id), 'Unexpected renderer root: ' + id); return roots[id]; },
    // Only i18n initialization may register its normal DOMContentLoaded hook.
    addEventListener() {}
  };
  const context = vm.createContext({ document, LoadoutCore: C, localStorage: { getItem: () => lang } });
  vm.runInContext(languageSource, context, { filename: 'i18n.js' });
  document.addEventListener = () => denied('document.addEventListener');
  document.write = () => denied('document.write');
  for (const key of ['localStorage', 'sessionStorage', 'fetch', 'XMLHttpRequest', 'navigator',
    'location', 'setTimeout', 'setInterval', 'requestAnimationFrame', 'addEventListener']) {
    Object.defineProperty(context, key, { configurable: true,
      get: () => denied(key), set: () => denied(key) });
  }
  vm.runInContext(rendererSource, context, { filename: 'comparison-view.js' });
  return {
    roots, created, forbidden,
    language(value) {
      assert.ok(['ja', 'en'].includes(value));
      vm.runInContext(`currentLang = '${value}'`, context);
    },
    render(result, options) {
      const paging = context.LoadoutComparisonView.render(result, options);
      assert.deepEqual(forbidden, [], 'Even a caught forbidden access is a regression');
      return JSON.parse(JSON.stringify(paging));
    }
  };
}

function descendants(node, predicate) {
  return node.children.flatMap(child => [...(predicate(child) ? [child] : []), ...descendants(child, predicate)]);
}
function rows(h) { return descendants(h.roots.comparisonRows, node => node.className === 'comparison-row'); }
function one(node, predicate) {
  const matches = descendants(node, predicate);
  assert.equal(matches.length, 1, 'Expected exactly one matching node');
  return matches[0];
}
function side(row, value) { return one(row, node => node.tag === 'section' && node.dataset.side === value); }
function field(section, value) { return one(section, node => node.tag === 'dd' && node.dataset.field === value); }
function changes(row) { return descendants(row, node => node.tag === 'li' && Object.hasOwn(node.dataset, 'field')); }
function metrics(h) {
  return Object.fromEntries(h.roots.comparisonStats.children.map(card => [card.dataset.metric,
    Object.fromEntries(descendants(card, node => node.tag === 'dd').map(node => [node.dataset.side, node.textContent]))]));
}
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

test('renderer empty result has four zero metrics, an empty message and disabled paging', () => {
  const h = harness();
  assert.deepEqual(h.render(C.compareItems([], [])), { pageIndex: 0, pageCount: 1, total: 0 });
  assert.equal(rows(h).length, 0);
  assert.equal(h.roots.comparisonRows.children.length, 1);
  assert.equal(h.roots.comparisonRows.children[0].tag, 'p');
  assert.equal(h.roots.comparisonRows.textContent, 'No items to display for this comparison and filter.');
  assert.equal(h.roots.comparisonSummary.textContent, 'Added 0 / Removed 0 / Changed 0 / Compared fields unchanged 0');
  assert.equal(h.roots.comparisonPage.textContent, 'Showing 0–0 / 0 rows');
  assert.equal(h.roots.comparisonPrev.disabled, true);
  assert.equal(h.roots.comparisonNext.disabled, true);
  assert.deepEqual(metrics(h), {
    weight: { reference: '0 g', current: '0 g', delta: '0 g' },
    volume: { reference: '0 cm³', current: '0 cm³', delta: '0 cm³' },
    quantity: { reference: '0', current: '0', delta: '0' },
    rows: { reference: '0', current: '0', delta: '0' }
  });
});

for (const [count, pageCount, lastCount] of [[50, 1, 50], [51, 2, 1], [61, 2, 11]]) {
  test(`renderer pagination boundary: ${count} rows`, () => {
    const h = harness();
    const result = C.compareItems(Array.from({ length: count }, (_, i) => item('row-' + i)), []);
    assert.deepEqual(h.render(result), { pageIndex: 0, pageCount, total: count });
    assert.equal(rows(h).length, 50);
    assert.equal(rows(h)[0].dataset.id, 'row-0');
    assert.equal(rows(h)[49].dataset.id, 'row-49');
    assert.equal(h.roots.comparisonPage.textContent, `Showing 1–50 / ${count} rows`);
    assert.equal(h.roots.comparisonPrev.disabled, true);
    assert.equal(h.roots.comparisonNext.disabled, pageCount === 1);
    const lastPage = pageCount - 1;
    assert.deepEqual(h.render(result, { pageIndex: lastPage }), { pageIndex: lastPage, pageCount, total: count });
    assert.equal(rows(h).length, lastCount);
    assert.equal(rows(h)[0].dataset.id, 'row-' + lastPage * 50);
    assert.equal(rows(h).at(-1).dataset.id, 'row-' + (count - 1));
    assert.equal(h.roots.comparisonPage.textContent, `Showing ${lastPage * 50 + 1}–${count} / ${count} rows`);
    assert.equal(h.roots.comparisonPrev.disabled, lastPage === 0);
    assert.equal(h.roots.comparisonNext.disabled, true);
  });
}

test('renderer creates at most 50 item articles for the 20000-row comparison limit', () => {
  const current = Array.from({ length: 10000 }, (_, i) => item('current-' + i));
  const reference = Array.from({ length: 10000 }, (_, i) => item('reference-' + i));
  const result = C.compareItems(current, reference);
  const h = harness();
  assert.deepEqual(h.render(result, { pageIndex: 99999 }), { pageIndex: 399, pageCount: 400, total: 20000 });
  assert.equal(h.created.filter(node => node.className === 'comparison-row').length, 50);
  assert.equal(h.created.filter(node => node.className === 'comparison-metric').length, 4);
  assert.equal(rows(h).length, 50);
  assert.equal(rows(h)[0].dataset.id, 'reference-9950');
  assert.equal(rows(h).at(-1).dataset.id, 'reference-9999');
  assert.equal(h.roots.comparisonPage.textContent, 'Showing 19951–20000 / 20000 rows');
  assert.equal(h.roots.comparisonPrev.disabled, false);
  assert.equal(h.roots.comparisonNext.disabled, true);
});

test('renderer clamps out-of-range and fractional pages and defaults non-finite or non-numeric pages', () => {
  const result = C.compareItems(Array.from({ length: 61 }, (_, i) => item(String(i))), []);
  const h = harness();
  for (const [requested, expected] of [[-7, 0], [-0.5, 0], [0.9, 0], [1.9, 1], [999, 1],
    [NaN, 0], [Infinity, 0], [-Infinity, 0], ['1', 0], [null, 0]]) {
    assert.deepEqual(h.render(result, { pageIndex: requested }), { pageIndex: expected, pageCount: 2, total: 61 });
    assert.equal(rows(h)[0].dataset.id, String(expected * 50));
  }
});

test('renderer difference filter keeps complete counts and totals while omitting unchanged rows', () => {
  const current = [item('new', { checked: true, weight_g: 5 }),
    item('shared', { checked: true, quantity: 2, weight_g: 10 }), item('same')];
  const reference = [item('old', { checked: true, weight_g: 7 }),
    item('shared', { checked: true, quantity: 1, weight_g: 10 }), item('same')];
  const result = C.compareItems(current, reference);
  const h = harness();
  assert.deepEqual(h.render(result), { pageIndex: 0, pageCount: 1, total: 4 });
  const summary = h.roots.comparisonSummary.textContent;
  const allMetrics = metrics(h);
  assert.equal(summary, 'Added 1 / Removed 1 / Changed 1 / Compared fields unchanged 1');
  assert.deepEqual(h.render(result, { onlyChanges: true }), { pageIndex: 0, pageCount: 1, total: 3 });
  assert.deepEqual(rows(h).map(row => [row.dataset.id, row.dataset.status]),
    [['new', 'added'], ['shared', 'changed'], ['old', 'removed']]);
  assert.equal(h.roots.comparisonSummary.textContent, summary);
  assert.deepEqual(metrics(h), allMetrics);
  assert.deepEqual(allMetrics.weight, { reference: '17 g', current: '25 g', delta: '+8 g' });
});

test('renderer resets an out-of-range page when the difference filter reduces the result', () => {
  const reference = Array.from({ length: 61 }, (_, i) => item(String(i)));
  const current = reference.map(value => ({ ...value, quantity: value.id === '60' ? 2 : 1 }));
  const h = harness();
  const result = C.compareItems(current, reference);
  assert.deepEqual(h.render(result, { pageIndex: 1 }), { pageIndex: 1, pageCount: 2, total: 61 });
  assert.deepEqual(h.render(result, { pageIndex: 1, onlyChanges: true }), { pageIndex: 0, pageCount: 1, total: 1 });
  assert.equal(rows(h)[0].dataset.id, '60');
  assert.equal(h.roots.comparisonSummary.textContent, 'Added 0 / Removed 0 / Changed 1 / Compared fields unchanged 60');
  assert.equal(h.roots.comparisonPrev.disabled, true);
  assert.equal(h.roots.comparisonNext.disabled, true);
});

test('renderer localizes side fields but always displays changes in both effective languages', () => {
  const reference = item('x', { name_ja: '旧名', name_en: 'Old name', category_ja: '旧分類',
    category_en: 'Old category', purpose_short_ja: '旧用途', purpose_short_en: 'Old purpose' });
  const current = item('x', { name_ja: '新名', name_en: 'New name', category_ja: '新分類',
    category_en: 'New category', purpose_short_ja: '新用途', purpose_short_en: 'New purpose' });
  const result = C.compareItems([current], [reference]);
  const h = harness();
  for (const [lang, title, heading] of [['en', 'New name', 'Changed — x'], ['ja', '新名', '変更あり — x']]) {
    h.language(lang);
    h.render(result);
    const row = rows(h)[0];
    assert.equal(row.children[0].tag, 'h4');
    assert.equal(row.children[0].textContent, heading);
    assert.equal(field(side(row, 'current'), 'name').textContent, title);
    assert.equal(field(side(row, 'reference'), 'category').textContent, reference['category_' + lang]);
    const actual = changes(row);
    assert.deepEqual(actual.map(node => node.dataset.field),
      ['name_ja', 'name_en', 'category_ja', 'category_en', 'purpose_short_ja', 'purpose_short_en']);
    assert.equal(actual[0].textContent, (lang === 'ja' ? '名前' : 'Name') + ' (JA): 旧名 → 新名');
    assert.equal(actual[1].textContent, (lang === 'ja' ? '名前' : 'Name') + ' (EN): Old name → New name');
    assert.equal(actual[4].textContent, (lang === 'ja' ? '用途' : 'Purpose') + ' (JA): 旧用途 → 新用途');
    assert.equal(actual[5].textContent, (lang === 'ja' ? '用途' : 'Purpose') + ' (EN): Old purpose → New purpose');
    assert.equal(one(row, node => node.tag === 'ul').className, 'comparison-changes');
  }
});

test('renderer retains a translation-only difference even when the visible language text is unchanged', () => {
  const result = C.compareItems([item('x', { name_ja: '変更後', name_en: 'Same visible name' })],
    [item('x', { name_ja: '変更前', name_en: 'Same visible name' })]);
  const h = harness('en');
  h.render(result, { onlyChanges: true });
  const row = rows(h)[0];
  assert.equal(row.dataset.status, 'changed');
  assert.equal(field(side(row, 'current'), 'name').textContent, 'Same visible name');
  assert.equal(field(side(row, 'reference'), 'name').textContent, 'Same visible name');
  assert.deepEqual(changes(row).map(node => node.textContent), ['Name (JA): 変更前 → 変更後']);
});

test('renderer keeps markup, quotes and replacement patterns literal in names, IDs and values', () => {
  const marker = '<img src=x onerror="alert(1)"><script>bad()</script> & " \' $& $$ $` ${x}';
  const result = C.compareItems([item(marker, { name: marker, category: marker, purpose_short: marker })], []);
  const h = harness();
  h.render(result, { currentName: marker, referenceName: marker });
  const row = rows(h)[0];
  assert.equal(row.dataset.id, marker);
  assert.equal(row.children[0].textContent, 'Added in current — ' + marker);
  for (const value of ['name', 'category', 'purpose_short']) assert.equal(field(side(row, 'current'), value).textContent, marker);
  assert.equal(h.roots.comparisonNames.textContent, 'Reference: ' + marker + ' → Current: ' + marker);
  assert.ok(h.created.every(node => !['img', 'script', 'iframe', 'svg'].includes(node.tag)));
  assert.deepEqual(h.forbidden, []);
});

test('renderer added and removed rows have an explicit absent side and eight fields on the present side', () => {
  const h = harness();
  h.render(C.compareItems([item('new')], [item('old')]));
  for (const [row, missing, present] of [[rows(h)[0], 'reference', 'current'], [rows(h)[1], 'current', 'reference']]) {
    const absent = side(row, missing);
    assert.equal(absent.children[0].tag, 'h5');
    assert.equal(absent.children[1].tag, 'p');
    assert.equal(absent.children[1].dataset.empty, 'true');
    assert.equal(absent.children[1].textContent, 'Not in this list');
    assert.equal(descendants(absent, node => node.tag === 'dd').length, 0);
    assert.deepEqual(descendants(side(row, present), node => node.tag === 'dd').map(node => node.dataset.field), rowFields);
    assert.equal(changes(row).length, 0);
  }
});

test('renderer checked zero quantities keep zero weight and quantity but count a checked row', () => {
  const h = harness();
  const result = C.compareItems([item('x', { checked: true, quantity: 0, recommended_quantity: 0, weight_g: 90, volume_cm3: 30 })],
    [item('x', { checked: false, quantity: 3, weight_g: 90, volume_cm3: 30 })]);
  h.render(result);
  assert.deepEqual(metrics(h).weight, { reference: '0 g', current: '0 g', delta: '0 g' });
  assert.deepEqual(metrics(h).quantity, { reference: '0', current: '0', delta: '0' });
  assert.deepEqual(metrics(h).rows, { reference: '0', current: '1', delta: '+1' });
  const row = rows(h)[0];
  assert.equal(field(side(row, 'current'), 'quantity').textContent, '0');
  assert.equal(field(side(row, 'current'), 'recommended_quantity').textContent, '0');
  assert.equal(field(side(row, 'current'), 'checked').textContent, 'Checked');
  assert.equal(field(side(row, 'reference'), 'checked').textContent, 'Unchecked');
  h.language('ja');
  h.render(result);
  assert.equal(field(side(rows(h)[0], 'current'), 'checked').textContent, 'チェック済み');
  assert.equal(field(side(rows(h)[0], 'reference'), 'checked').textContent, '未チェック');
});

test('renderer metrics distinguish positive, negative and zero deltas and use units only in numeric metrics', () => {
  const h = harness();
  h.render(C.compareItems([item('x', { checked: true, quantity: 2, weight_g: 5, volume_cm3: 3 })],
    [item('x', { checked: true, quantity: 3, weight_g: 2, volume_cm3: 4 })]));
  assert.deepEqual(metrics(h), {
    weight: { reference: '6 g', current: '10 g', delta: '+4 g' },
    volume: { reference: '12 cm³', current: '6 cm³', delta: '-6 cm³' },
    quantity: { reference: '3', current: '2', delta: '-1' },
    rows: { reference: '1', current: '1', delta: '0' }
  });
  for (const card of h.roots.comparisonStats.children) {
    assert.equal(card.tag, 'article');
    assert.equal(card.className, 'comparison-metric');
    assert.equal(card.children[0].tag, 'h4');
    assert.deepEqual(descendants(card, node => node.tag === 'dt').map(node => node.textContent),
      ['Reference', 'Current', 'Difference (current − reference)']);
  }
});

test('renderer row and change values omit units because their field labels supply them', () => {
  const h = harness();
  h.render(C.compareItems([item('x', { weight_g: 12.5, volume_cm3: 7.25 })], [item('x', { weight_g: 10, volume_cm3: 5 })]));
  const row = rows(h)[0];
  assert.equal(field(side(row, 'current'), 'weight_g').textContent, '12.5');
  assert.equal(field(side(row, 'current'), 'volume_cm3').textContent, '7.25');
  assert.deepEqual(changes(row).map(node => node.textContent),
    ['Unit weight (g): 10 → 12.5', 'Unit volume (cm³): 5 → 7.25']);
  assert.ok(descendants(side(row, 'current'), node => node.tag === 'dt').some(node => node.textContent === 'Unit weight (g)'));
  assert.ok(descendants(side(row, 'current'), node => node.tag === 'dt').some(node => node.textContent === 'Unit volume (cm³)'));
});

test('renderer never rounds small floating-point differences away', () => {
  const h = harness();
  h.render(C.compareItems([item('x', { checked: true, weight_g: 0.1 + 0.2 })],
    [item('x', { checked: true, weight_g: 0.3 })]));
  assert.deepEqual(metrics(h).weight, { reference: '0.3 g', current: '0.30000000000000004 g', delta: '+5.551115123125783e-17 g' });
  assert.equal(field(side(rows(h)[0], 'current'), 'weight_g').textContent, '0.30000000000000004');
  assert.deepEqual(changes(rows(h)[0]).map(node => node.textContent), ['Unit weight (g): 0.3 → 0.30000000000000004']);
});

test('renderer does not mutate deeply frozen results or render options across repeated calls', () => {
  const current = [item('x', { quantity: 0, checked: true, custom_meta: { values: [0, false] } })];
  const reference = [item('x', { quantity: 1, checked: false, custom_meta: { values: [2, true] } })];
  const result = freeze(C.compareItems(current, reference));
  const options = freeze({ currentName: 'Working', referenceName: 'Reference', onlyChanges: true, pageIndex: 999 });
  const before = JSON.stringify({ current, reference, result, options });
  const h = harness();
  for (const lang of ['en', 'ja', 'en']) {
    h.language(lang);
    assert.deepEqual(h.render(result, options), { pageIndex: 0, pageCount: 1, total: 1 });
  }
  assert.equal(JSON.stringify({ current, reference, result, options }), before);
});

test('renderer replacement removes old rows, names and metrics instead of appending stale content', () => {
  const h = harness();
  h.render(C.compareItems([item('old-row', { checked: true, weight_g: 91 })], []), { currentName: 'Old current', referenceName: 'Old reference' });
  h.render(C.compareItems([], []), { currentName: 'Empty current', referenceName: 'Empty reference' });
  assert.equal(rows(h).length, 0);
  assert.equal(h.roots.comparisonStats.children.length, 4);
  assert.equal(h.roots.comparisonNames.textContent, 'Reference: Empty reference → Current: Empty current');
  assert.equal(metrics(h).weight.current, '0 g');
  for (const root of Object.values(h.roots)) assert.doesNotMatch(root.textContent, /old-row|Old current|Old reference|91/);
});

test('renderer metadata-only differences remain unchanged and can yield an empty filtered result', () => {
  const result = C.compareItems([item('x', { description: 'New', hazard_flag: true, custom_meta: { version: 2 } })],
    [item('x', { description: 'Old', hazard_flag: false, custom_meta: { version: 1 } })]);
  const h = harness();
  assert.deepEqual(h.render(result, { onlyChanges: true }), { pageIndex: 0, pageCount: 1, total: 0 });
  assert.equal(h.roots.comparisonSummary.textContent, 'Added 0 / Removed 0 / Changed 0 / Compared fields unchanged 1');
  assert.equal(rows(h).length, 0);
  assert.equal(h.roots.comparisonRows.textContent, 'No items to display for this comparison and filter.');
});

test('renderer treats prototype-like IDs as ordinary text and never touches forbidden application APIs', () => {
  const h = harness();
  const current = ['__proto__', 'constructor', 'toString'].map(id => item(id));
  h.render(C.compareItems(current, []));
  assert.deepEqual(rows(h).map(row => row.dataset.id), ['__proto__', 'constructor', 'toString']);
  assert.deepEqual(rows(h).map(row => row.children[0].textContent),
    ['Added in current — __proto__', 'Added in current — constructor', 'Added in current — toString']);
  assert.deepEqual(h.forbidden, []);
});
