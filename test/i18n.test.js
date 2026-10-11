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
