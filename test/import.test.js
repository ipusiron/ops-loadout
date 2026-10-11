const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../loadout-core');

const exportText = (items = [], extra = {}) => JSON.stringify({ checklistName: 'Checklist', items, ...extra });
const fails = (text, code) => assert.throws(() => C.parseChecklistJSON(text), { name: 'TypeError', message: code });

test('import limits are explicit and immutable', () => {
  assert.deepEqual(C.IMPORT_LIMITS, { maxBytes: 5242880, maxDepth: 32, maxNodes: 250000 });
  assert.equal(Object.isFrozen(C.IMPORT_LIMITS), true);
});

test('single-list exports accept an empty name, no items, whitespace and a leading BOM', () => {
  const text = ' \r\n' + exportText([], { checklistName: '', createdAt: '' }) + '\t';
  assert.deepEqual(C.parseChecklistJSON(text), { name: '', items: [] });
  assert.deepEqual(C.parseChecklistJSON('\ufeff' + text), { name: '', items: [] });
  fails('\ufeff\ufeff' + text, 'importSyntax');
});

test('import returns only the list name and normalized items, not saved identity or timestamps', () => {
  const restored = C.parseChecklistJSON(exportText([{ id: 'item' }], {
    id: 'saved-id', name: 'Saved name', createdAt: 'export time', updatedAt: 'saved time',
    targetWeight: 3000, language: 'en', extra: { values: [true, null, 0] }
  }));
  assert.deepEqual(restored, { name: 'Checklist', items: [C.normalizeItem({ id: 'item' })] });
  assert.deepEqual(Object.keys(restored), ['name', 'items']);
});

test('import preserves translated text, nested metadata, explicit zeros and false flags', () => {
  const item = C.normalizeItem({
    id: 'zero', name: '', name_ja: '装備', name_en: 'Equipment',
    category_ja: '工具', category_en: 'Tools', purpose_short_ja: '用途', purpose_short_en: 'Purpose',
    description_ja: '説明', description_en: 'Description', recommended_location_on_body: 'Bag',
    quantity: 0, recommended_quantity: 0, weight_g: 0, volume_cm3: 0,
    checked: false, packed_by_default: true, dual_use: false, hazard_flag: false,
    category_tags: ['tag', ''], repack_frequency: 'weekly', concealability: 0,
    legality_notes: { JP: 'Caution' }, legality_notes_ja: { JP: '注意' }, legality_notes_en: { JP: 'Caution' },
    sources: [{ title: 'Source', url: 'https://example.com/', extra: { reviewed: false } }],
    scores: { survivability: 0, signalability: 5 },
    custom: { nested: [null, false, 0, '', { retained: true }] }
  });
  const before = JSON.stringify(item);
  const restored = C.parseChecklistJSON(exportText([item]));
  assert.deepEqual(restored.items, [item]);
  assert.equal(JSON.stringify(item), before);
  assert.equal(restored.items[0].quantity, 0);
  assert.equal(restored.items[0].checked, false);
  assert.equal(restored.items[0].packed_by_default, true);
});

test('import uses the existing missing and null numeric defaults', () => {
  const restored = C.parseChecklistJSON(exportText([
    { id: 'missing', packed_by_default: true },
    { id: 'null', quantity: null, recommended_quantity: null, weight_g: null, volume_cm3: null }
  ]));
  assert.equal(restored.items[0].checked, true);
  assert.equal(restored.items[0].quantity, 1);
  assert.equal(restored.items[1].checked, false);
  assert.equal(restored.items[1].quantity, 1);
  assert.equal(restored.items[1].recommended_quantity, 1);
  assert.equal(restored.items[1].weight_g, 0);
  assert.equal(restored.items[1].volume_cm3, 0);
});

test('checklist name length accepts 20000 UTF-16 units and rejects 20001', () => {
  assert.equal(C.parseChecklistJSON(exportText([], { checklistName: 'a'.repeat(20000) })).name.length, 20000);
  fails(exportText([], { checklistName: 'a'.repeat(20001) }), 'importFormat');
});

test('import rejects non-string inputs and non-export root shapes', () => {
  for (const value of [null, undefined, false, 0, {}, [], Buffer.from('{}')]) fails(value, 'importFormat');
  for (const value of [null, true, 0, 'text', [], {},
    { items: [] }, { checklistName: null, items: [] }, { checklistName: 2, items: [] },
    { checklistName: 'x' }, { checklistName: 'x', items: {} },
    { checklistName: 'x', items: [], createdAt: null },
    { checklistName: 'x', items: [], createdAt: 123 },
    { name_ja: 'プリセット', name_en: 'Preset', items: [] },
    [{ id: 'saved', name: 'Saved', items: [] }]
  ]) fails(JSON.stringify(value), 'importFormat');
});

test('malformed JSON reports a stable syntax error without echoing its content', () => {
  for (const text of ['', ' ', '{', 'undefined', 'NaN', 'Infinity', 'name,quantity\nitem,1',
    '{"checklistName":"secret-marker","items":[],}', '{"checklistName":"x","items":[]} trailing',
    '{/* comment */ "items":[]}']) fails(text, 'importSyntax');
});

test('UTF-8 byte limits include the BOM and accept exactly 5 MiB', () => {
  const base = exportText([], { padding: '' });
  const paddingLength = C.IMPORT_LIMITS.maxBytes - Buffer.byteLength(base, 'utf8');
  const text = exportText([], { padding: 'a'.repeat(paddingLength) });
  assert.equal(Buffer.byteLength(text, 'utf8'), 5242880);
  assert.deepEqual(C.parseChecklistJSON(text), { name: 'Checklist', items: [] });
  fails(text + ' ', 'importTooLarge');
  fails('\ufeff' + text, 'importTooLarge');
  const withBom = '\ufeff' + exportText([], { padding: 'a'.repeat(paddingLength - 3) });
  assert.equal(Buffer.byteLength(withBom, 'utf8'), 5242880);
  assert.equal(C.parseChecklistJSON(withBom).name, 'Checklist');
});

test('UTF-8 byte limits count multibyte characters rather than string length', () => {
  const baseBytes = Buffer.byteLength(exportText([], { padding: '' }), 'utf8');
  const remaining = C.IMPORT_LIMITS.maxBytes - baseBytes;
  const padding = '😀'.repeat(Math.floor(remaining / 4)) + 'a'.repeat(remaining % 4);
  const text = exportText([], { padding });
  assert.ok(text.length < C.IMPORT_LIMITS.maxBytes);
  assert.equal(Buffer.byteLength(text, 'utf8'), C.IMPORT_LIMITS.maxBytes);
  assert.equal(C.parseChecklistJSON(text).name, 'Checklist');
  fails(exportText([], { padding: padding + 'あ' }), 'importTooLarge');
});

test('depth counts the root as zero and all child values, including primitive leaves', () => {
  let nested = null;
  for (let depth = 1; depth < 32; depth++) nested = [nested];
  assert.equal(C.parseChecklistJSON(exportText([], { nested })).name, 'Checklist');
  fails(exportText([], { nested: [nested] }), 'importTooDeep');
  let objectLeaf = {};
  for (let depth = 1; depth < 32; depth++) objectLeaf = { child: objectLeaf };
  assert.equal(C.parseChecklistJSON(exportText([], { nested: objectLeaf })).name, 'Checklist');
  fails(exportText([], { nested: { child: objectLeaf } }), 'importTooDeep');
});

test('deep JSON is rejected without recursive traversal or a call-stack error', () => {
  const text = '{"checklistName":"x","items":[],"nested":' + '['.repeat(2000) + '0' + ']'.repeat(2000) + '}';
  fails(text, 'importTooDeep');
});

test('the node limit counts the root, containers and primitive values, but not keys', () => {
  // Root, checklistName, items and extra are four nodes before the array contents.
  const extra = Array(C.IMPORT_LIMITS.maxNodes - 4).fill(null);
  assert.equal(C.parseChecklistJSON(exportText([], { extra })).name, 'Checklist');
  fails(exportText([], { extra: [...extra, false] }), 'importTooComplex');
  // Replacing one null with [null] adds one container node.
  extra[0] = [null];
  fails(exportText([], { extra }), 'importTooComplex');
  extra.pop();
  assert.equal(C.parseChecklistJSON(exportText([], { extra })).name, 'Checklist');
  extra[0] = { child: null };
  assert.equal(C.parseChecklistJSON(exportText([], { extra })).name, 'Checklist');
});

test('nonfinite numbers are rejected at every level, including ignored metadata', () => {
  for (const token of ['1e999', '-1e999']) {
    fails(token, 'importNonFinite');
    fails('{"checklistName":"x","items":[],"extra":' + token + '}', 'importNonFinite');
    fails('{"checklistName":"x","items":[{"id":"x","quantity":' + token + '}]}', 'importNonFinite');
    fails('{"checklistName":"x","items":[{"id":"x","extra":[{"value":' + token + '}]}]}', 'importNonFinite');
  }
  const restored = C.parseChecklistJSON(exportText([{ id: 'x', extra: [1e308, 'Infinity', 'NaN'] }]));
  assert.deepEqual(restored.items[0].extra, [1e308, 'Infinity', 'NaN']);
});

test('prototype-related keys are explicitly rejected at the root and in nested metadata', () => {
  for (const key of ['__proto__', 'constructor', 'prototype', '\\u005f_proto__', 'constr\\u0075ctor', 'proto\\u0074ype']) {
    fails('{"checklistName":"x","items":[],"' + key + '":{}}', 'importUnsafeKey');
    fails('{"checklistName":"x","items":[{"id":"x","' + key + '":false}]}', 'importUnsafeKey');
    fails('{"checklistName":"x","items":[{"id":"x","extra":[{"' + key + '":{"polluted":true}}]}]}', 'importUnsafeKey');
  }
  assert.equal(Object.hasOwn(Object.prototype, 'polluted'), false);
  const restored = C.parseChecklistJSON(exportText([{ id: 'x', name: '__proto__ constructor prototype' }]));
  assert.equal(restored.items[0].name, '__proto__ constructor prototype');
});

test('HTML and URL strings remain data; import does not execute, decode or silently rewrite them', () => {
  const item = {
    id: '<img src=x onerror=alert(1)>', name: '</script><script>alert(1)</script>',
    description: '&lt;img&gt;', sources: [{ title: '<b>Source</b>', url: 'javascript:alert(1)' }],
    category_tags: ['<svg/onload=alert(1)>']
  };
  const restored = C.parseChecklistJSON(exportText([item])).items[0];
  for (const key of Object.keys(item)) assert.deepEqual(restored[key], item[key]);
  assert.equal(C.safeUrl(restored.sources[0].url), '');
});

test('item validation retains its existing error codes rather than masking them as syntax errors', () => {
  const cases = [
    [null, 'invalidItem'], [{ id: '' }, 'invalidItem'], [{ id: 'x', name: null }, 'invalidText'],
    [{ id: 'x', checked: 1 }, 'invalidFlag'], [{ id: 'x', quantity: '1' }, 'invalidNumber'],
    [{ id: 'x', quantity: -1 }, 'invalidNumber'], [{ id: 'x', quantity: 0.5 }, 'invalidNumber'],
    [{ id: 'x', quantity: 1000 }, 'invalidNumber'], [{ id: 'x', recommended_quantity: 1000 }, 'invalidNumber'],
    [{ id: 'x', weight_g: 1000000001 }, 'invalidNumber'], [{ id: 'x', volume_cm3: -1 }, 'invalidNumber'],
    [{ id: 'x', category_tags: [1] }, 'invalidTags'], [{ id: 'x', repack_frequency: 'hourly' }, 'invalidFrequency'],
    [{ id: 'x', legality_notes: [] }, 'invalidNotes'], [{ id: 'x', sources: [{ title: 1 }] }, 'invalidSources'],
    [{ id: 'x', scores: { a: 6 } }, 'invalidScores']
  ];
  for (const [item, code] of cases) fails(exportText([item]), code);
  fails(exportText([{ id: 'same' }, { id: 'same' }]), 'duplicateItem');
});

test('item count accepts 10000 unique entries and rejects 10001', () => {
  const items = Array.from({ length: 10000 }, (_, i) => ({ id: String(i) }));
  assert.equal(C.parseChecklistJSON(exportText(items)).items.length, 10000);
  fails(exportText([...items, { id: 'extra' }]), 'invalidItems');
});

const presetRoot = path.join(__dirname, '../presets');
const presets = JSON.parse(fs.readFileSync(path.join(presetRoot, 'index.json'), 'utf8')).presets;
test('round-trip coverage includes all 28 presets and 398 item entries', () => {
  assert.equal(Object.keys(presets).length, 28);
  assert.equal(Object.values(presets).reduce((count, entry) => {
    return count + JSON.parse(fs.readFileSync(path.join(presetRoot, entry.file), 'utf8')).items.length;
  }, 0), 398);
});
for (const [key, entry] of Object.entries(presets)) test('export/import/export preserves preset data: ' + key, () => {
  const data = JSON.parse(fs.readFileSync(path.join(presetRoot, entry.file), 'utf8'));
  const items = C.normalizeItems(data.items);
  for (const checklistName of [entry.name_ja, entry.name_en]) {
    const restored = C.parseChecklistJSON(JSON.stringify({ checklistName, createdAt: '2026-10-12T00:00:00.000Z', items }, null, 2));
    assert.deepEqual(restored, { name: checklistName, items });
    const again = C.parseChecklistJSON(JSON.stringify({ checklistName: restored.name, createdAt: '2026-10-13T00:00:00.000Z', items: restored.items }));
    assert.deepEqual(again, restored);
  }
});
