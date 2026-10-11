const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../loadout-core');
const vm=require('node:vm');
// Independent parser tests actual CSV syntax, including embedded newlines and quotes.
function parse(csv) {
  const rows=[]; let row=[],cell='',quoted=false;
  for(let i=1;i<csv.length;i++) {
    const c=csv[i];
    if(c==='"') { if(quoted && csv[i+1]==='"') {cell+='"';i++;} else quoted=!quoted; }
    else if(c===','&&!quoted) {row.push(cell);cell='';}
    else if(c==='\r'&&!quoted&&csv[i+1]==='\n') {row.push(cell);rows.push(row);row=[];cell='';i++;}
    else cell+=c;
  }
  assert.equal(quoted,false);
  return rows;
}
test('CSV round trips commas, quotes, multiline text and quantities',()=>{
  const row=parse(C.csv([{id:'a',name:'a,"b"\nc',quantity:0,checked:true}],'en'))[1];
  assert.equal(row.length,12);
  assert.equal(row[1],'a,"b"\nc');
  assert.deepEqual(row.slice(9),['0','1','1']);
});
test('every preset exports exactly 12 CSV columns in both languages',()=>{
  const root=path.join(__dirname,'../presets');
  const meta=JSON.parse(fs.readFileSync(path.join(root,'index.json'),'utf8')).presets;
  for(const entry of Object.values(meta)) {
    const data=JSON.parse(fs.readFileSync(path.join(root,entry.file),'utf8'));
    for(const lang of ['ja','en']) {
      const rows=parse(C.csv(data.items,lang));
      assert.equal(rows.length,data.items.length+1);
      assert.ok(rows.every(row=>row.length===12));
    }
  }
});
test('weights are shared by screen, graph, PDF and print; no quantity zero fallback',()=>{
  const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
  assert.doesNotMatch(app, /(?:it|item)\.quantity\s*\|\|\s*1/);
  assert.ok((app.match(/LoadoutCore\.totals\(state.items\)/g)||[]).length>=5);
  assert.doesNotMatch(app,/return categoryColors\[cat\].*Math\.random/);
});

test('graph date footer stays above the limitation band in both languages',()=>{
  const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
  const source=app.match(/function drawGraphHeader\(ctx, W, H, stats\) \{[\s\S]*?\n  \}/)[0];
  for(const lang of ['ja','en']) {
    const calls=[];
    const ctx={
      createLinearGradient:()=>({addColorStop(){}}), fillRect(){}, beginPath(){}, arc(){}, fill(){},
      measureText:text=>({width:text.length*8}),
      fillText(text,x,y){calls.push({text,x,y,color:this.fillStyle});}
    };
    const label=lang==='ja'?'生成日時:':'Generated at:';
    const env={ctx,state:{checklistName:'Sample'},currentLang:lang,t:key=>{
      assert.equal(key,'pdf.generatedAt'); return label;
    }};
    vm.runInNewContext(source+'; drawGraphHeader(ctx,1200,675,{totalQty:5,totalWeight:1280,totalVolume:1730});',env);
    const footer=calls.find(call=>call.text.includes('github.com/ipusiron/ops-loadout'));
    assert.ok(footer.text.startsWith(label));
    assert.equal(footer.y,629);
    assert.ok(footer.y+12 < 645, 'footer leaves space above the bottom 30px band');
    assert.equal(footer.color,'#94a3b8');
  }
});
