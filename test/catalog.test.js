const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../loadout-core');
const catalog = require('../loadout-catalog');
const index = require('../presets/index.json');
const additions = {commute:10,mobile_work:11,business_overnight:12,travel_short:12,presentation:10,exhibition:9};
test('catalog has nine categories, 28 presets and 398 entries with bilingual descriptions', () => {
  assert.equal(catalog.validate(index), index);
  assert.equal(Object.keys(index.categories).length, 9);
  assert.equal(Object.keys(index.presets).length, 28);
  assert.equal(Object.values(index.presets).reduce((sum, p) => sum + p.item_count, 0), 398);
});
test('catalog search matches either language and purpose independently of UI language', () => {
  assert.deepEqual(catalog.find(index,'all','').map(([id])=>id),Object.keys(index.presets));
  assert.deepEqual(catalog.find(index,'travel','').map(([id])=>id),['business_overnight','travel_short']);
  assert.deepEqual(catalog.find(index,'event','').map(([id])=>id),['presentation','exhibition']);
  assert.ok(catalog.find(index,'all',' COMMUTING ').some(([id])=>id==='commute'));
  assert.ok(catalog.find(index,'all','通勤').some(([id])=>id==='commute'));
  assert.ok(catalog.find(index,'all','classes').some(([id])=>id==='commute'));
  assert.deepEqual(catalog.find(index,'travel','commuting'),[]);
  assert.deepEqual(catalog.find(index,'all','not-a-preset-12345'),[]);
  assert.equal(catalog.matches({name:'Saved <img>'},'<IMG>'),true);
});
test('catalog validation rejects unsafe IDs, unknown categories, paths and malformed metadata', () => {
  for (const change of [
    i=>{i.categories.constructor={ja:'x',en:'x'};},
    i=>{i.presets.embassy.category='unknown';},
    i=>{i.presets.embassy.category=['evasion'];},
    i=>{i.presets.embassy.file='../outside.json';},
    i=>{i.presets.embassy.file='https://example.com/data.json';},
    i=>{i.presets.embassy.description_ja='';},
    i=>{i.presets.embassy.item_count=1.5;},
    i=>{i.categories.edc.en=null;}
  ]) {
    const copy=structuredClone(index); change(copy); assert.throws(()=>catalog.validate(copy));
  }
});
test('six new examples use positive illustrative measurements, no scores and no invented source URLs', () => {
  const ids=new Map(); let count=0;
  for (const [key, expected] of Object.entries(additions)) {
    const meta=index.presets[key];
    const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../presets',meta.file),'utf8'));
    assert.equal(meta.item_count,expected); assert.equal(data.items.length,expected);
    assert.equal(meta.measurement_basis,'illustrative'); assert.equal(data.measurement_basis,'illustrative');
    const items=C.normalizeItems(data.items); count+=items.length;
    assert.deepEqual(C.totals(items),{weight:0,volume:0,quantity:0,rows:0});
    for (const item of items) {
      assert.equal(item.checked,false); assert.equal(item.packed_by_default,false);
      assert.ok(item.weight_g>0 && item.volume_cm3>0); assert.equal(item.scores,undefined);
      assert.match(item.description_ja,/実測値ではありません/);
      assert.match(item.description_en,/not measured values/);
      assert.deepEqual(item.sources,[{title:'OpsLoadout illustrative packing example (not measured)'}]);
      for(const field of ['name','category','purpose_short','description']) for(const lang of ['ja','en']) assert.ok(item[field+'_'+lang]);
      const {quantity,recommended_quantity,...shared}=item;
      if(ids.has(item.id)) assert.deepEqual(shared,ids.get(item.id),item.id);
      else ids.set(item.id,shared);
    }
  }
  assert.equal(count,64); assert.equal(ids.size,39);
});
