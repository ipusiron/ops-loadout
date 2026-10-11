const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../i18n.js'),'utf8');
function run(storage) {
  const context=vm.createContext({localStorage:storage,document:{addEventListener(){}}});
  vm.runInContext(source,context);
  return context;
}
test('dictionary keys match between Japanese and English',()=>{
  const context=run({getItem:()=>null});
  const keys=vm.runInContext('JSON.stringify([Object.keys(I18N.ja).sort(),Object.keys(I18N.en).sort()])',context);
  const [ja,en]=JSON.parse(keys);
  assert.deepEqual(ja,en);
});
test('language initialization works when storage access throws',()=>{
  const context=run({getItem(){throw Error('denied');}});
  assert.equal(vm.runInContext('getLang()',context),'ja');
});
test('unsupported stored language does not become active',()=>{
  const context=run({getItem:()=>'<invalid>'});
  assert.equal(vm.runInContext('getLang()',context),'ja');
});
test('all literal translation references in scripts and HTML exist',()=>{
  const context=run({getItem:()=>null});
  const keys=new Set(JSON.parse(vm.runInContext('JSON.stringify(Object.keys(I18N.en))',context)));
  const path=require('node:path');
  for (const filename of ['app.js','i18n.js','index.html']) {
    const text=fs.readFileSync(path.join(__dirname,'..',filename),'utf8');
    for (const match of text.matchAll(/\bt\(['"]([^'"]+)['"]|data-i18n(?:-placeholder|-title)?="([^"]+)"/g)) {
      assert.ok(keys.has(match[1] || match[2]), `${filename}: ${match[1] || match[2]}`);
    }
  }
});

test('translations preserve interpolation tokens in both languages',()=>{
  const context=run({getItem:()=>null});
  const dictionaries=JSON.parse(vm.runInContext('JSON.stringify(I18N)',context));
  const parameters=value => [...new Set(value.match(/\{[A-Za-z]+\}/g) || [])].sort();
  for (const key of Object.keys(dictionaries.en)) {
    assert.deepEqual(parameters(dictionaries.ja[key]),parameters(dictionaries.en[key]),key);
  }
});

test('interpolation keeps dollar replacement patterns in imported names and filters literal',()=>{
  const context=run({getItem:()=>null});
  context.marker = '$& $$ $` $\' <script>';
  for (const lang of ['ja','en']) {
    vm.runInContext(`currentLang='${lang}'`,context);
    const actual=vm.runInContext("t('review.printScope',{shown:1,total:3,filters:marker})",context);
    assert.ok(actual.includes(context.marker),actual);
    assert.doesNotMatch(actual,/\{(?:shown|total|filters)\}/);
    assert.ok(vm.runInContext("t('item.check',{name:marker})",context).includes(context.marker));
  }
});

test('JSON import and review labels and limits are available in both dictionaries',()=>{
  const context=run({getItem:()=>null});
  const dictionaries=JSON.parse(vm.runInContext('JSON.stringify(I18N)',context));
  for (const dictionary of Object.values(dictionaries)) {
    for (const key of ['import.button','import.notice','import.applied','import.reading','import.ready',
      'import.stale','import.cancelled','import.tooLarge','import.encoding','import.syntax','import.format',
      'import.complex','import.unsafe','import.invalid','review.all','review.unchecked','review.below',
      'review.either','review.summary','review.difference','review.scope','review.printScope']) {
      assert.ok(dictionary[key]?.length > 0,key);
    }
    for (const value of ['5 MiB','10,000','32','250,000']) assert.ok(dictionary['import.limits'].includes(value),value);
  }
});
