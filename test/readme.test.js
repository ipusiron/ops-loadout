const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../loadout-core');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const docs = ['README.md', 'README.en.md'];
const texts = docs.map(read);
const index = JSON.parse(read('presets/index.json'));
const presets = Object.fromEntries(Object.entries(index.presets).map(([key, meta]) =>
  [key, JSON.parse(read('presets/' + meta.file))]));

test('README metadata is shared and preserves series identifiers', () => {
  const metadata = texts.map(text => text.match(/^<!--\n([\s\S]+?)\n-->/)?.[1]);
  assert.ok(metadata[0]);
  assert.equal(metadata[0], metadata[1]);
  for (const expected of ['id: day098', 'slug: ops-loadout', 'hub: true',
    'repo_url: "https://github.com/ipusiron/ops-loadout"',
    'demo_url: "https://ipusiron.github.io/ops-loadout/"']) {
    assert.ok(metadata[0].includes(expected), expected);
  }
  for (const text of texts) assert.ok(text.includes('https://akademeia.info/?page_id=42163'));
  assert.ok(texts[0].includes('[English](README.en.md)'));
  assert.ok(texts[1].includes('[日本語](README.md)'));
});

test('README preset totals and source coverage match every bundled item', () => {
  const allItems = Object.values(presets).flatMap(preset => preset.items);
  const urlCount = allItems.filter(item => item.sources.some(source => C.safeUrl(source.url))).length;
  assert.equal(Object.keys(presets).length, 22);
  assert.equal(allItems.length, 334);
  assert.ok(allItems.every(item => item.sources.length > 0));
  assert.equal(urlCount, 7);
  assert.equal(allItems.length - urlCount, 327);
  assert.match(texts[0], /22プリセット・334アイテム/);
  assert.match(texts[0], /URL付きは7件、URLなしは327件/);
  // Numbers alone are not enough: require them in the source-coverage paragraph.
  const coverage = texts[1].split('\n').find(line => /334/.test(line) && /327/.test(line));
  assert.ok(coverage, 'English source coverage paragraph');
  for (const value of [22, 334, 7, 327]) assert.match(coverage, new RegExp('\\b' + value + '\\b'));
});

test('both README tables use actual core weight, volume and quantity totals', () => {
  for (const text of texts) {
    for (const id of ['bushcraft_minimal', 'bushcraft_standard', 'bushcraft_extended']) {
      const totals = C.totals(C.normalizeItems(presets[id].items).map(item => ({...item, checked: true})));
      const line = text.split('\n').find(row => row.startsWith('| `' + id + '` |'));
      assert.ok(line, id);
      assert.deepEqual(line.split('|').slice(2, 5).map(cell => Number(cell.trim())),
        [totals.weight, totals.volume, totals.quantity], id);
    }
  }
});

test('README arithmetic examples use checked quantities, including zero', () => {
  assert.deepEqual(C.totals(C.normalizeItems([
    {id: 'lesson', weight_g: 50, volume_cm3: 20, quantity: 3, checked: true},
    {id: 'pending', weight_g: 100, quantity: 2, checked: false}
  ])), {weight: 150, volume: 60, quantity: 3, rows: 1});
  assert.equal(C.totals([{weight_g: 50, quantity: 0, checked: true}]).weight, 0);
  for (const text of texts) {
    assert.match(text, /150\s*g/);
    assert.match(text, /60\s*cm³/);
    assert.match(text, /2\s*L\s*[×x]\s*42/);
    assert.match(text, /84\s*L/);
    assert.match(text, /8\.2\s*kg/);
  }
});

test('README JSON examples parse and preserve the same schema in both languages', () => {
  const examples = texts.map(text => [...text.matchAll(/```json\n([\s\S]*?)\n```/g)]
    .map(match => JSON.parse(match[1])));
  assert.equal(examples[0].length, 3);
  assert.deepEqual(examples[0], examples[1]);
  const [backup, preset, itemExample] = examples[0];
  const restored = C.parseChecklistJSON(JSON.stringify(backup));
  assert.deepEqual(Object.keys(restored).sort(), ['items', 'name']);
  assert.equal(restored.name, backup.checklistName);
  for (const [key, value] of Object.entries(backup.items[0])) {
    assert.deepEqual(restored.items[0][key], value, key);
  }
  assert.equal(restored.items[0].quantity, 0);
  assert.equal(restored.items[0].checked, false);
  assert.equal(restored.items[0].packed_by_default, true);
  assert.deepEqual(restored.items[0].custom_meta, {note: 'keep'});
  const roundTrip = C.parseChecklistJSON(JSON.stringify({
    checklistName: restored.name, createdAt: '2026-10-13T00:00:00.000Z', items: restored.items
  }));
  assert.deepEqual(roundTrip, restored);
  assert.deepEqual(C.normalizeItems(preset.items), []);
  assert.throws(() => C.parseChecklistJSON(JSON.stringify(preset)), /importFormat/);
  const item = C.normalizeItem(itemExample);
  assert.equal(item.quantity, 1);
  assert.equal(item.checked, false);
});

test('README import limits describe the implemented boundaries, including unused metadata', () => {
  const labels = [
    ['UTF-8ファイルのバイト数', 'JSONの深さ（ルートを0とする）', 'JSON内のノード数（ルートと各オブジェクト・配列・値）', 'アイテム数'],
    ['UTF-8 file size in bytes', 'JSON depth (root at 0)', 'JSON nodes (root and each object, array, or value)', 'Item count']
  ];
  for (let lang = 0; lang < texts.length; lang++) {
    const values = labels[lang].map(label => {
      const line = texts[lang].split('\n').find(row => row.startsWith('| ' + label + ' |'));
      assert.ok(line, label);
      return [...line.split('|')[2].replace(/,/g, '').matchAll(/\d+/g)].map(match => Number(match[0]));
    });
    assert.deepEqual(values, [[5, C.IMPORT_LIMITS.maxBytes], [C.IMPORT_LIMITS.maxDepth], [C.IMPORT_LIMITS.maxNodes], [10000]]);
  }
  const minimal = '{"checklistName":"","items":[]}';
  assert.deepEqual(C.parseChecklistJSON('\ufeff' + minimal), {name: '', items: []});
  assert.throws(() => C.parseChecklistJSON('\ufeff\ufeff' + minimal), /importSyntax/);
  assert.deepEqual(C.parseChecklistJSON(minimal + ' '.repeat(C.IMPORT_LIMITS.maxBytes - minimal.length)), {name: '', items: []});
  assert.throws(() => C.parseChecklistJSON(minimal + ' '.repeat(C.IMPORT_LIMITS.maxBytes - minimal.length + 1)), /importTooLarge/);
  for (const key of ['__proto__', 'constructor', 'prototype']) {
    assert.throws(() => C.parseChecklistJSON('{"checklistName":"","items":[],"unused":{"' + key + '":0}}'), /importUnsafeKey/);
    for (const text of texts) assert.ok(text.includes('`' + key + '`'));
  }
  assert.throws(() => C.parseChecklistJSON('{"checklistName":"","items":[],"unused":1e999}'), /importNonFinite/);
});

test('README review truth tables match the core and count overlapping conditions once', () => {
  const tables = texts.map(text => text.split('\n').filter(line => /^\| [A-E] \|/.test(line))
    .map(line => line.split('|').slice(1, -1).map(cell => cell.trim())));
  assert.equal(tables[0].length, 5);
  assert.deepEqual(tables[0], tables[1]);
  const counts = {unchecked: 0, below: 0, either: 0};
  for (const [id, checked, quantity, recommended, unchecked, below, difference, either] of tables[0]) {
    const item = C.normalizeItem({id, checked: JSON.parse(checked), quantity: Number(quantity), recommended_quantity: Number(recommended)});
    const expected = {unchecked: JSON.parse(unchecked), belowRecommended: JSON.parse(below), shortfall: Number(difference), needsReview: JSON.parse(either)};
    assert.deepEqual(C.itemReview(item), expected, id);
    assert.deepEqual(['all', 'unchecked', 'below', 'either'].map(mode => C.matchesReview(item, mode)),
      [true, expected.unchecked, expected.belowRecommended, expected.needsReview], id);
    counts.unchecked += Number(expected.unchecked);
    counts.below += Number(expected.belowRecommended);
    counts.either += Number(expected.needsReview);
  }
  assert.deepEqual(counts, {unchecked: 3, below: 2, either: 4});
  assert.match(texts[0], /5行では未チェック3件、推奨数未満2件、いずれか4件/);
  assert.match(texts[1], /5 rows contain 3 unchecked items, 2 below their recommended quantity, and 4 matching either condition/);
});

test('README review and JSON preview screenshot captions use the actual preset arithmetic', () => {
  const items = C.normalizeItems(presets.bushcraft_minimal.items).map(item => ({...item,
    checked: item.id !== 'bc_metal_bottle',
    quantity: ['bc_ferro_rod', 'bc_paracord'].includes(item.id) ? 0 : item.quantity
  }));
  assert.deepEqual(C.totals(items), {weight: 850, volume: 1000, quantity: 2, rows: 4});
  assert.deepEqual(['unchecked', 'below', 'either'].map(mode => items.filter(item => C.matchesReview(item, mode)).length), [1, 2, 3]);
  assert.equal(items.length, 5);
  for (const text of texts) {
    const captions = text.split('\n').filter(line => line.startsWith('>*'));
    assert.equal(captions.length, 3);
    for (const caption of captions.slice(1)) {
      assert.match(caption, /850\s*g/);
      assert.match(caption, /1000\s*cm³/);
    }
    assert.match(captions[2], /5/);
    assert.match(captions[2], /4/);
    assert.match(captions[2], /2/);
  }
});

test('README restoration instructions use the actual language labels and keep scope cautions', () => {
  const context = vm.createContext({localStorage: {getItem: () => null}, document: {addEventListener(){}}});
  vm.runInContext(read('i18n.js'), context);
  const dictionaries = JSON.parse(vm.runInContext('JSON.stringify(I18N)', context));
  for (const [i, lang] of ['ja', 'en'].entries()) {
    for (const key of ['import.button', 'import.apply', 'review.all', 'review.unchecked', 'review.below', 'review.either', 'review.reset']) {
      assert.ok(texts[i].includes(dictionaries[lang][key]), lang + ': ' + key);
    }
  }
  assert.match(texts[0], /同名の保存済みリストも自動では上書きしない/);
  assert.match(texts[1], /existing saved list with the same name is not automatically overwritten/);
  assert.match(texts[0], /ブラウザーの印刷だけは表示中の行/);
  assert.match(texts[1], /Only browser printing prints the displayed rows/);
  assert.match(texts[0], /安全性・合法性や必要物資の充足の判定ではありません/);
  assert.match(texts[1], /do not determine safety, legality, or whether required supplies are sufficient/);
  for (const file of [...docs, 'docs/DEVELOPMENT.md', 'docs/SECURITY.md', 'CLAUDE.md']) {
    assert.doesNotMatch(read(file), /no (?:JSON\/CSV )?import (?:or automatic.restore )?interface|no restore interface|読み戻す画面はありません|読み戻し画面がない|JSON\/CSVのインポートUIはない/i, file);
  }
});

test('README CSV schema is exactly the implemented 12-column schema', () => {
  const columns = ['id', 'name', 'category', 'weight_g', 'volume_cm3', 'purpose_short',
    'dual_use', 'hazard_flag', 'legality_notes', 'quantity', 'recommended_quantity', 'checked'];
  assert.equal(C.csv([], 'en').slice(1).split('\r\n')[0], columns.map(x => '"' + x + '"').join(','));
  for (const text of texts) assert.ok(text.includes('`' + columns.join(',') + '`'));
});

test('documented UL, STD and HVY targets match the actual buttons', () => {
  const html = read('index.html');
  for (const [label, weight] of [['UL', 3000], ['STD', 5000], ['HVY', 10000]]) {
    assert.match(html, new RegExp('data-weight="' + weight + '"[^>]*>' + label + '</button>'));
    for (const text of texts) {
      const line = text.split('\n').find(row => row.startsWith('- ' + label));
      assert.ok(line, label);
      assert.ok(line.replace(/,/g, '').includes(weight + 'g') ||
        line.replace(/,/g, '').includes(weight + ' g'), label + ': ' + line);
    }
  }
});

test('README relative links resolve and each language uses three real screenshots', () => {
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = match[1];
      if (/^[a-z]+:|^#/i.test(target)) continue;
      const file = target.split('#')[0];
      assert.ok(fs.existsSync(path.resolve(root, file)), docs[i] + ': ' + target);
    }
    const images = [...text.matchAll(/!\[[^\]]*\]\((assets\/[^)]+)\)/g)].map(match => match[1]);
    const prefix = i === 0 ? 'assets/' : 'assets/en/';
    assert.deepEqual(images, ['screenshot.png', 'screenshot2.png', 'screenshot3.png'].map(name => prefix + name));
    for (const file of images) {
      const png = fs.readFileSync(path.join(root, file));
      assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      assert.equal(png.readUInt32BE(16), 1280);
      assert.ok(png.readUInt32BE(20) >= 800 && png.readUInt32BE(20) <= 1400);
      assert.ok(png.length <= 300 * 1024, file + ': screenshot exceeds 300 KiB');
    }
  }
  const relativeTargets = text => [...text.matchAll(/\]\(([^)\s]+)\)/g)].map(match => match[1])
    .filter(target => !/^[a-z]+:|^#/i.test(target))
    .map(target => target.replace(/^assets\/en\//, 'assets/').replace(/^README(?:\.en)?\.md$/, 'README.language.md')).sort();
  assert.deepEqual(relativeTargets(texts[0]), relativeTargets(texts[1]));
});

test('READMEs keep emphasis restrained and describe current behavior', () => {
  for (const text of texts) {
    const prose = text.replace(/^<!--[\s\S]*?-->/, '').replace(/```[\s\S]*?```/g, '');
    for (const section of prose.split(/^#{1,6} /m)) {
      assert.ok((section.match(/\*\*[^*]+\*\*/g) || []).length <= 2);
    }
    assert.doesNotMatch(prose, /\b(previously|used to|earlier version|formerly)\b|改修前|旧バージョン/i);
    assert.doesNotMatch(prose, /⭐|Web Share API|21種類|21 presets/);
    assert.ok(text.includes('docs/DEVELOPMENT.md'));
    assert.ok(text.includes('docs/SECURITY.md'));
  }
});

const headingPairs = [
  ["# OpsLoadout - 緊急脱出キットのチェックリストツール","# OpsLoadout - Emergency Kit Checklist Tool"],
  ["## 🌐 デモページ","## 🌐 Demo"],
  ["## 📸 スクリーンショット","## 📸 Screenshots"],
  ["## 🎯 主要な設計方針（Design principles）","## 🎯 Main Design Principles"],
  ["## 👥 対象ユーザー（Target Users）","## 👥 Target Users"],
  ["### 企業・組織向け","### Companies and Organizations"],
  ["### 個人・家族向け","### Individuals and Families"],
  ["### 専門職・技術者向け","### Professionals and Technicians"],
  ["## ✨ 主な機能","## ✨ Main Features"],
  ["### 1. プリセット管理","### 1. Preset Management"],
  ["### 2. チェックリスト管理","### 2. Checklist Management"],
  ["### 3. パッキング機能","### 3. Packing Features"],
  ["### 4. アイテム詳細","### 4. Item Details"],
  ["### 5. エクスポート機能","### 5. Export Features"],
  ["### 6. グラフ表示機能","### 6. Graph Views"],
  ["### 7. 多言語対応（i18n）","### 7. Language Support (i18n)"],
  ["### 8. 重量目標プリセット","### 8. Target-Weight Presets"],
  ["### 9. プリセット遅延読込み","### 9. Lazy Preset Loading"],
  ["### 10. JSONバックアップの読み戻し","### 10. Restoring a JSON Backup"],
  ["### 11. 未チェック・推奨数未満の見直し","### 11. Reviewing Unchecked Items and Quantities Below the Recommendation"],
  ["## 💡 活用シナリオ（Use Cases）","## 💡 Use Cases"],
  ["### このツールならではの使い方","### Uses Specific to This Tool"],
  ["### シナリオ1：海外駐在員の緊急脱出準備（企業・組織向け）","### Scenario 1: Emergency Evacuation Preparation for Overseas Employees (Companies and Organizations)"],
  ["### シナリオ2：警備会社の装備監査（組織向け）","### Scenario 2: Equipment Reviews at a Security Company (Organizations)"],
  ["### シナリオ3：在宅勤務者の複数拠点防災準備（個人・家族向け）","### Scenario 3: Disaster Preparation at Multiple Locations for a Remote Worker (Individuals and Families)"],
  ["## 📦 典型プリセット（Example presets）","## 📦 Example Presets"],
  ["### 脱出・回避系（Evasion/Escape）","### Evasion/Escape"],
  ["### 日常携行系（EDC/Personal）","### Everyday Carry (EDC/Personal)"],
  ["### 救助・消防系（Rescue/Fire）","### Rescue/Fire"],
  ["### 警備・防犯系（Security）","### Security"],
  ["### 災害対応系（Disaster）","### Disaster Preparedness"],
  ["### ハッカー・IT系（Hacker/IT）","### Hacker/IT"],
  ["### サイバー忍者系（Cyber Ninja）","### Cyber Ninja"],
  ["## 🗂️ データモデル（JSON スキーマ）","## 🗂️ Data Model (JSON Schema)"],
  ["### プリセットファイル構造","### Preset File Structure"],
  ["### アイテムスキーマ（多言語対応）","### Item Schema (Multilingual)"],
  ["### フィールド説明","### Field Descriptions"],
  ["#### 基本フィールド","#### Basic Fields"],
  ["#### 多言語フィールド（`_ja` / `_en` サフィックス）","#### Multilingual Fields (`_ja` / `_en` Suffixes)"],
  ["#### パッキングフィールド","#### Packing Fields"],
  ["## 🔗 関連ツールとの連携","## 🔗 Using Related Tools"],
  ["### 防災備蓄管理ツール（RollingStock Planner）との使い分け","### Choosing Between OpsLoadout and RollingStock Planner"],
  ["#### 📦 RollingStock Planner（備蓄管理）","#### 📦 RollingStock Planner (Stored Supplies)"],
  ["#### 🎒 OpsLoadout（緊急脱出キット）","#### 🎒 OpsLoadout (Emergency Kits)"],
  ["### 効果的な使い分け戦略","### Strategies for Using the Tools Together"],
  ["#### 1. 階層的な防災体制","#### 1. A Layered Preparedness Plan"],
  ["#### 2. 統合的な準備アプローチ","#### 2. Coordinated Preparation"],
  ["#### 3. データ連携の可能性","#### 3. Possibilities for Data Coordination"],
  ["#### 4. 推奨される運用フロー","#### 4. Suggested Workflow"],
  ["### 実用例：家族4人＋ペット1匹の災害対応準備","### Practical Example: Disaster Preparation for 4 Family Members and 1 Pet"],
  ["#### RollingStock Plannerで管理（在宅避難用・7日を想定）:","#### Managed in RollingStock Planner (Assuming 7 Days of Sheltering at Home):"],
  ["#### OpsLoadoutで管理（持ち出す品の入力例）:","#### Managed in OpsLoadout (Example Entries for Items to Carry):"],
  ["#### 配置戦略:","#### Placement Strategy:"],
  ["## 🔒 セキュリティ対策","## 🔒 Security Measures"],
  ["### クライアントサイドセキュリティ","### Client-Side Security"],
  ["### データプライバシー","### Data Privacy"],
  ["## 📁 ディレクトリー構成","## 📁 Directory Structure"],
  ["### 技術スタック","### Technology Stack"],
  ["### 開発者向け技術詳細","### Technical Details for Developers"],
  ["## 📄 ライセンス","## 📄 License"],
  ["## 🛠️ このツールについて","## 🛠️ About This Tool"]
];

test('Japanese and English README headings correspond exactly in order and level', () => {
  assert.equal(headingPairs.length, 61);
  for (let lang = 0; lang < texts.length; lang++) {
    const prose = texts[lang].replace(/```[\s\S]*?```/g, '');
    const headings = prose.match(/^#{1,6} .+$/gm);
    assert.deepEqual(headings, headingPairs.map(pair => pair[lang]));
  }
});
