const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../loadout-core');
const S = require('../loadout-store');
const item = overrides => ({ id: 'a', name: 'A', ...overrides });

test('defaults and packed flag preserve explicit zero/false', () => {
  assert.equal(C.normalizeItem(item()).quantity, 1);
  assert.equal(C.normalizeItem(item({quantity:0})).quantity, 0);
  assert.equal(C.normalizeItem(item({packed_by_default:true})).checked, true);
  assert.equal(C.normalizeItem(item({checked:false,packed_by_default:true})).checked, false);
});
test('quantity rejects fractions, negative, nonfinite, coercion and excessive values', () => {
  for (const quantity of [-1, 0.5, Infinity, NaN, '1', false, 1000]) assert.throws(() => C.normalizeItem(item({quantity})));
});
test('weights and structured fields are validated', () => {
  for (const concealability of [Infinity, -Infinity, NaN, null, {}]) assert.throws(() => C.normalizeItem(item({concealability})));
  for (const bad of [{weight_g:-1}, {volume_cm3:'10'}, {name:{}}, {checked:1}, {category_tags:'x'}, {sources:[{title:3}]}, {legality_notes:[]}, {scores:{x:6}}]) assert.throws(() => C.normalizeItem(item(bad)));
});
test('duplicates and wrong roots are rejected', () => {
  assert.throws(() => C.normalizeItems([item(), item()]));
  for (const value of [null, {}, 'x', [{id:'a',name:'A',items:{}}]]) assert.throws(() => C.normalizeChecklists(value));
});
test('checked quantities determine weight and volume, including zero', () => {
  assert.deepEqual(C.totals([item({checked:true,quantity:0,weight_g:90,volume_cm3:30}),item({checked:true,quantity:3,weight_g:20,volume_cm3:10}),item({checked:false,quantity:9,weight_g:99})]), {weight:60,volume:30,quantity:3,rows:2});
});
test('editing a translated value replaces only changed fields without losing metadata', () => {
  const source = item({name_ja:'名前',name_en:'Name',purpose_short_ja:'用途',purpose_short_en:'Purpose',scores:{survivability:4},checked:true});
  const edited = C.editItem(source,{name:'Edited',purpose_short:'Purpose'},'en');
  for (const lang of ['ja','en']) assert.equal(C.localized(edited,'name',lang),'Edited');
  assert.equal(C.localized(edited,'purpose_short','ja'),'用途');
  assert.deepEqual(edited.scores,source.scores);
  assert.equal(edited.checked,true);
  assert.equal(source.name_en,'Name');
});
test('URLs allow only explicit web links without credentials or control characters', () => {
  assert.equal(C.safeUrl('https://example.com/a'), 'https://example.com/a');
  for (const url of ['javascript:alert(1)', 'java\tscript:alert(1)', 'data:text/html,x','//example.com','https://user:pass@example.com','https://example.com/\n']) assert.equal(C.safeUrl(url),'');
});
test('unknown category colors are deterministic', () => {
  assert.equal(C.categoryColor('通信'), C.categoryColor('通信'));
  assert.notEqual(C.categoryColor('通信'), C.categoryColor('衣類'));
});
test('CSV quotes text and neutralizes formula prefixes', () => {
  assert.equal(C.csvCell('a,"b"\nc'), '"a,""b""\nc"');
  for (const value of ['=1+1',' +1','-2','@x','\t=1','＝1']) assert.equal(C.csvCell(value), '"\'' + value + '"');
  const result = C.csv([item({quantity:0,checked:true,name:'a,b'})],'en');
  assert.ok(result.startsWith('\ufeff"id"'));
  assert.ok(result.endsWith(',"0","1","1"\r\n'));
});
test('storage preserves raw data on invalid input, conflict, denial and quota failure', () => {
  let raw = null;
  const storage = {getItem:()=>raw,setItem:(_,v)=>{raw=v;}};
  const lists = [{id:'one',name:'One',items:[item()]}];
  assert.equal(S.write(storage, lists, null).ok, true);
  assert.equal(S.read(storage).lists.length, 1);
  const snapshot = raw;
  assert.equal(S.write(storage, [], null).error, 'conflict');
  assert.equal(raw,snapshot);
  assert.equal(S.write(storage, {}, snapshot).ok,false);
  storage.setItem=()=>{throw Error('quota');};
  assert.equal(S.write(storage, [], snapshot).ok,false);
  assert.equal(raw,snapshot);
  raw='malformed';
  assert.equal(S.read(storage).ok,false);
  storage.getItem=()=>{throw Error('denied');};
  assert.equal(S.read(storage).ok,false);
});
const root = path.join(__dirname,'../presets');
const meta = JSON.parse(fs.readFileSync(path.join(root,'index.json'),'utf8')).presets;
for (const [key,entry] of Object.entries(meta)) test('preset schema: '+key, () => {
  const data=JSON.parse(fs.readFileSync(path.join(root,entry.file),'utf8'));
  assert.equal(C.normalizeItems(data.items).length,data.items.length);
});
