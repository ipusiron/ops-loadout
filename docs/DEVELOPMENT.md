# DEVELOPMENT.md

OpsLoadout - 開発者向け技術詳細

---

## 📋 目次

1. [アーキテクチャ概要](#アーキテクチャ概要)
2. [状態管理システム](#状態管理システム)
3. [プリセット遅延読み込み](#プリセット遅延読み込み)
4. [多言語対応（i18n）](#多言語対応i18n)
5. [グラフ表示機能](#グラフ表示機能)
6. [カスタムプリセット管理](#カスタムプリセット管理)
7. [チェックリスト保存ロジック](#チェックリスト保存ロジック)
8. [PDFエクスポート実装](#pdfエクスポート実装)
9. [セキュリティ対策](#セキュリティ対策)
10. [カテゴリフィルタリング](#カテゴリフィルタリング)
11. [モーダルシステム](#モーダルシステム)
12. [パフォーマンス最適化](#パフォーマンス最適化)

---

## アーキテクチャ概要

本ツールは**Vanilla JavaScript**で実装されており、フレームワークを使用していません。これにより、以下の利点があります：

- **軽量**: バンドルサイズが小さく、読み込み速度が速い
- **依存性なし**: セキュリティリスクが低く、長期的なメンテナンスが容易
- **学習コスト低**: 標準のWeb APIのみを使用

### 主要コンポーネント

```
ops-loadout/
├── index.html          # UI構造、CSPヘッダー、CDNスクリプト読み込み
├── app.js              # コアロジック（プリセット遅延読み込み、レンダリング、グラフ）
├── i18n.js             # 多言語対応（日本語/英語リソース、切り替えロジック）
├── css/                # モジュール化されたスタイルシート
│   ├── main.css        # エントリポイント（@import）
│   ├── base.css        # 基本スタイル・変数
│   ├── layout.css      # レイアウト構造
│   ├── controls.css    # コントロール部品
│   ├── buttons.css     # ボタンスタイル
│   ├── forms.css       # フォーム要素
│   ├── badges.css      # dual_use/hazardバッジ
│   ├── modals.css      # モーダル・グラフタブ
│   ├── table.css       # テーブル表示
│   ├── filters.css     # フィルターボタン
│   ├── saved.css       # 保存チェックリスト
│   └── print.css       # 印刷用スタイル
└── presets/            # プリセットデータ（JSON、遅延読み込み）
    ├── index.json      # メタデータ一覧
    ├── evasion/        # 脱出・回避系
    ├── edc/            # 日常携行系
    ├── rescue/         # 救助・消防系
    ├── security/       # 警備・防犯系
    ├── disaster/       # 災害対応系（ブッシュクラフト含む）
    └── hacker/         # ハッカー・IT系
```

### app.jsの構成

```
app.js
├── PRESETS_META / PRESETS  # プリセットメタデータ・キャッシュ
├── State Management        # シングルステートオブジェクト
├── DOM Element References  # 頻繁アクセス要素のキャッシュ
├── Utility Functions       # escapeHtml, normalizeItem, uid等
├── localStorage Helpers    # 保存・読み込み・エラーハンドリング
├── Preset Loading          # 遅延読み込みロジック
├── Rendering Pipeline      # renderAll, renderList, renderDetail, renderTotals
├── Graph Visualization     # drawPieView, drawRadarView, drawItemsView
├── Modal System            # アイテム編集、保存オプション、グラフ表示
├── Export Functions        # PDF/CSV/JSON生成
└── Event Listeners         # ユーザーインタラクション、i18n更新
```

---

## 状態管理システム

### シングルステートオブジェクト

```javascript
let state = {
  checklistName: '',      // 現在のチェックリスト名
  items: [],              // アイテム配列
  selectedItemId: null,   // 選択中のアイテムID（詳細表示用）
  isDirty: false          // 未保存変更フラグ
};
```

**localStorage Keys**:
- `ekc_saved_checklists`: 保存済みチェックリスト一覧
- `ekc_custom_presets`: カスタムプリセット一覧
- `ops_lang`: 言語設定（`ja` または `en`）

**特徴**:
- **単一責任**: 1つのグローバルステートで全体を管理
- **Immutability無し**: パフォーマンス優先のため、直接変更
- **renderAll()による強制再描画**: ステート変更後に必ず`renderAll()`を呼び出し

### アイテム正規化

```javascript
function normalizeItem(it) {
  return {
    ...it,
    quantity: it.quantity ?? 1,
    recommended_quantity: it.recommended_quantity ?? 1,
    packed_by_default: it.packed_by_default ?? (!!it.checked) ?? false,
    category_tags: it.category_tags ?? [it.category],
    repack_frequency: it.repack_frequency ?? 'never'
  };
}
```

**目的**:
- 古いプリセットとの後方互換性
- デフォルト値の統一
- `undefined`/`null`によるエラー防止

---

## プリセット遅延読み込み

### 概要

プリセットデータは`presets/`フォルダに分割されており、選択時に初めて読み込まれます。

```
presets/
├── index.json              # メタデータ（名前、カテゴリ、ファイルパス）
├── evasion/embassy.json    # 個別プリセットデータ
├── evasion/sere.json
├── disaster/bushcraft_minimal.json
└── ...
```

### データ構造

**index.json（メタデータ）**:
```json
{
  "embassy": {
    "name": "Embassy-Escape（大使館脱出型）",
    "category": "evasion",
    "file": "evasion/embassy.json"
  },
  "bushcraft_minimal": {
    "name": "Bushcraft-Minimal（ブッシュクラフト・ミニマル）",
    "category": "disaster",
    "file": "disaster/bushcraft_minimal.json",
    "weight_class": "UL"
  }
}
```

**個別プリセットJSON**:
```json
{
  "name": "Bushcraft-Minimal",
  "items": [
    {
      "id": "bc_knife",
      "name": "モーラナイフ",
      "category": "工具",
      "weight_g": 120,
      ...
    }
  ]
}
```

### 読み込みフロー

```javascript
// 1. 起動時にメタデータを読み込み
async function loadPresetsMeta() {
  const response = await fetch('presets/index.json');
  PRESETS_META = await response.json();
}

// 2. プリセット選択時に実データを遅延読み込み
async function loadPresetData(key) {
  if (PRESETS[key]) return PRESETS[key];  // キャッシュヒット

  const meta = PRESETS_META[key];
  const response = await fetch(`presets/${meta.file}`);
  const data = await response.json();
  PRESETS[key] = data;  // キャッシュに保存
  return data;
}
```

**利点**:
- 初期読み込み高速化（index.jsonのみ）
- 必要なプリセットのみダウンロード
- メモリ効率向上

---

## 多言語対応（i18n）

### 概要

`i18n.js`が日本語/英語の切り替えを管理します。

### 言語リソース構造

```javascript
const I18N = {
  en: {
    "app.subtitle": "Mission-ready checklist tool...",
    "button.save": "Save",
    "th.name": "Name",
    "graph.pie": "Pie Chart",
    ...
  },
  ja: {
    "app.subtitle": "装備構成を計画・編集・エクスポートする...",
    "button.save": "保存",
    "th.name": "名称",
    "graph.pie": "円グラフ",
    ...
  }
};
```

### 使用方法

**静的テキスト（HTML属性）**:
```html
<button data-i18n="button.save">保存</button>
<input data-i18n-placeholder="placeholder.search">
```

**動的テキスト（JavaScript）**:
```javascript
modalTitle.textContent = t('modal.addItem');
```

### 言語切り替え

```javascript
let currentLang = localStorage.getItem('ops_lang') || 'ja';

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('ops_lang', lang);
  updateUI();
}

function updateUI() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
}
```

---

## グラフ表示機能

### 概要

3種類のビジュアライゼーションをタブで切り替え表示します。

### ビュー種類

1. **円グラフ（Pie）**: カテゴリ別重量分布
2. **レーダーチャート（Radar）**: 5軸評価（重量、体積、アイテム数、dual_use、hazard）
3. **主要アイテム（Items）**: 重量順トップアイテム一覧

### 実装

```javascript
let currentGraphView = 'pie';  // pie | radar | items

function drawGraphImage() {
  switch (currentGraphView) {
    case 'pie': drawPieView(); break;
    case 'radar': drawRadarView(); break;
    case 'items': drawItemsView(); break;
  }
}

// 共通ヘッダー（全ビューで表示）
function drawGraphHeader(ctx, W, H, stats) {
  // チェックリスト名、アイテム数、合計重量、体積を描画
}
```

### タブ切り替え

```javascript
graphTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    currentGraphView = tab.dataset.view;
    graphTabs.forEach(t => t.classList.toggle('active', t === tab));
    drawGraphImage();
  });
});
```

### Canvas設定

```javascript
const canvas = document.getElementById('graphCanvas');
const W = 1200, H = 630;  // OGP推奨サイズ
canvas.width = W;
canvas.height = H;
```

---

## カスタムプリセット管理

### データ構造

**localStorage Key**: `ekc_custom_presets`

```json
[
  {
    "id": "preset-abc123",
    "name": "カスタムプリセット名",
    "items": [...],
    "createdAt": "2025-10-10T10:00:00.000Z"
  }
]
```

### 主要関数

#### 1. getAllCustomPresets()

```javascript
function getAllCustomPresets() {
  try {
    const data = localStorage.getItem('ekc_custom_presets');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to parse custom presets from localStorage:', error);
    return [];
  }
}
```

**エラーハンドリング**:
- JSON.parse失敗時に空配列を返す（クラッシュ防止）
- コンソールエラーログで開発者に通知

#### 2. saveAsCustomPreset()

```javascript
function saveAsCustomPreset() {
  const presets = getAllCustomPresets();
  const preset = {
    id: uid('preset'),
    name: state.checklistName,
    items: JSON.parse(JSON.stringify(state.items)), // deep copy
    createdAt: new Date().toISOString()
  };
  presets.push(preset);
  saveAllCustomPresets(presets);
  renderPresetOptions(currentCategory);
}
```

**技巧**:
- **Deep Copy**: `JSON.parse(JSON.stringify())`で参照を完全に切断
- **UID生成**: `uid('preset')`で一意IDを生成（衝突回避）
- **ISO 8601タイムスタンプ**: 国際標準形式で保存

#### 3. renameCustomPreset()

```javascript
function renameCustomPreset(id) {
  const presets = getAllCustomPresets();
  const preset = presets.find(p => p.id === id);
  if (!preset) return;

  const newName = prompt('新しいプリセット名を入力してください:', preset.name);
  if (!newName || newName.trim() === '') return;
  if (newName === preset.name) return; // No change

  preset.name = newName.trim();
  saveAllCustomPresets(presets);

  // Update current state if this preset is currently loaded
  if (state.checklistName === preset.name) {
    state.checklistName = newName.trim();
  }

  renderPresetOptions(currentCategory);
  renderAll();
}
```

**特徴**:
- **トリプルガード**: 存在確認、空文字確認、変更無し確認
- **ステート同期**: 現在読み込み中のプリセット名も更新
- **trim()による空白除去**: ユーザー入力の正規化

---

## チェックリスト保存ロジック

### 上書き vs 別名保存の判定

**app.js:525-600**

#### フローチャート

```
保存ボタンクリック
  ↓
currentChecklistId が存在？
  ├─ Yes → 上書き保存ダイアログ表示
  │         ├─ 上書き → 既存チェックリストを更新
  │         └─ 別名 → 新規IDで保存
  └─ No → チェックリスト名が既存と重複？
            ├─ Yes → 上書き保存ダイアログ表示
            └─ No → 新規IDで保存
```

#### 実装

```javascript
saveBtn.addEventListener('click', ()=>{
  const checklists = getAllChecklists();
  const existingChecklist = checklists.find(c => c.name === state.checklistName);

  if (currentChecklistId) {
    // Already loaded from a saved checklist → show overwrite dialog
    showSaveOptionsModal();
  } else if (existingChecklist) {
    // New checklist but name conflicts → show overwrite dialog
    showSaveOptionsModal();
  } else {
    // Truly new checklist → save directly
    saveCurrentChecklist();
    showSaveConfirmModal();
  }

  // If "saveAsPreset" is checked, save as custom preset
  if (saveAsPreset.checked) {
    saveAsCustomPreset();
    saveAsPreset.checked = false;
  }
});
```

**工夫点**:
- **2段階判定**: currentChecklistIdと名前重複を両方チェック
- **プリセット化の統合**: 保存と同時にカスタムプリセット化可能
- **チェックボックスのリセット**: 保存後に自動的にチェックを外す

### QuotaExceededError対策

```javascript
function saveAllChecklists(checklists) {
  try {
    localStorage.setItem('ekc_saved_checklists', JSON.stringify(checklists));
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      alert('保存容量が不足しています。古いチェックリストを削除してください。');
    } else {
      console.error('Failed to save checklists to localStorage:', error);
      alert('チェックリストの保存に失敗しました。');
    }
  }
}
```

**特徴**:
- **エラー種別判定**: QuotaExceededErrorを特定してユーザーに明確な指示
- **フォールバック**: その他のエラーも捕捉してクラッシュ防止

---

## PDFエクスポート実装

### html2canvas + jsPDF

#### ステップバイステップ

```javascript
async function exportPDF() {
  // 1. ライブラリ存在確認
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert('PDFライブラリが読み込まれていません。ページを再読み込みしてください。');
    return;
  }

  // 2. エクスポート用のクローン作成
  const tableEl = document.getElementById('itemTable');
  if (!tableEl) { alert('テーブルが見つかりません。'); return; }
  const cloneEl = tableEl.cloneNode(true);

  // 3. スタイル調整（PDF用に最適化）
  cloneEl.style.width = '800px';
  cloneEl.style.backgroundColor = '#fff';
  cloneEl.style.padding = '20px';

  // 4. 一時的にDOMに追加（レンダリングのため）
  document.body.appendChild(cloneEl);
  cloneEl.style.position = 'absolute';
  cloneEl.style.left = '-9999px';

  // 5. html2canvasでCanvas化
  const canvas = await html2canvas(cloneEl, {
    scale: 2,
    logging: false,
    useCORS: true,
    allowTaint: false
  });

  // 6. 一時DOM要素を削除
  document.body.removeChild(cloneEl);

  // 7. CanvasをjsPDFに追加
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgData = canvas.toDataURL('image/png');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

  // 8. ダウンロード
  pdf.save(`checklist-${state.checklistName}-${getTimestamp()}.pdf`);
}
```

#### 技巧的ポイント

1. **非同期処理**: `async/await`でhtml2canvasの完了を待機
2. **DOM操作の最小化**: cloneNodeで元のDOMに影響を与えない
3. **オフスクリーンレンダリング**: `left: -9999px`で画面外に配置
4. **高解像度**: `scale: 2`で2倍解像度のCanvasを生成
5. **CORS対策**: `useCORS: true`で外部画像を許可
6. **アスペクト比維持**: Canvas高さからPDF高さを計算

### 日本語対応

```html
<!-- jsPDF for PDF export -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
        integrity="sha512-qZvrmS2ekKPF2mSznTQsxqPgnpkI4DNTlrdUmTzrDgektczlKNRRhy5X5AAOnx5S09ydFYWWNSfcEqDTTHgtNA=="
        crossorigin="anonymous"
        referrerpolicy="no-referrer"></script>
<!-- html2canvas for HTML to PDF conversion -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
        integrity="sha512-BNaRQnYJYiPSqHHDb58B0yaPfCu+Wgds8Gp/gU33kqBtgNS4tSPHuGibyoeqMV/TJlSKda6FXzoEyYGjTe+vXA=="
        crossorigin="anonymous"
        referrerpolicy="no-referrer"></script>
```

**特徴**:
- **SRI（Subresource Integrity）**: CDNスクリプトの改ざん検出
- **html2canvasアプローチ**: フォント埋め込み不要で日本語を完全サポート

---

## セキュリティ対策

### XSS対策

```javascript
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function(m){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
  });
}
```

**使用箇所**:
- アイテム名表示
- チェックリスト名表示
- ユーザー入力のすべて

**防御範囲**:
- `&` → `&amp;`
- `<` → `&lt;`
- `>` → `&gt;`
- `"` → `&quot;`
- `'` → `&#39;`

### localStorage検証

```javascript
try {
  const data = localStorage.getItem('ekc_custom_presets');
  return data ? JSON.parse(data) : [];
} catch (error) {
  console.error('Failed to parse custom presets from localStorage:', error);
  return [];
}
```

**防御**:
- **JSON.parse失敗時のフォールバック**: 空配列を返してクラッシュ防止
- **QuotaExceededError検出**: 容量超過時にユーザーに明示
- **try-catch網羅**: すべてのlocalStorage操作を保護

---

## カテゴリフィルタリング

### presetsByCategoryマッピング

```javascript
const presetsByCategory = {
  evasion: ['embassy', 'sere'],
  edc: ['urban'],
  rescue: ['firefighter', 'sar'],
  security: ['security_guard', 'locksmith'],
  disaster: ['disaster', 'prepper', 'bushcraft_minimal', 'bushcraft_standard', 'bushcraft_extended'],
  hacker: ['hacker', 'pentest', 'neteng', 'forensic', 'hwdev', 'sysadmin', 'datarecovery', 'rftech']
};
```

### 動的フィルタリング

```javascript
if (category === 'all') {
  // Show all with optgroups
  const categoryLabels = {
    evasion: '🏃 脱出・回避系 (Evasion/Escape)',
    edc: '🎒 日常携行系 (EDC/Personal)',
    rescue: '🚒 救助・消防系 (Rescue/Fire)',
    security: '🛡️ 警備・防犯系 (Security)',
    disaster: '⚠️ 災害対応系 (Disaster)',
    hacker: '💻 ハッカー・IT系 (Hacker/IT)'
  };

  Object.keys(presetsByCategory).forEach(cat => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = categoryLabels[cat];

    presetsByCategory[cat].forEach(presetKey => {
      const option = document.createElement('option');
      option.value = presetKey;
      option.textContent = PRESETS[presetKey].name;
      optgroup.appendChild(option);
    });

    presetSelectEl.appendChild(optgroup);
  });
}
```

**工夫**:
- **optgroup活用**: カテゴリごとにグループ化して視認性向上
- **絵文字アイコン**: 各カテゴリに視覚的識別子
- **動的生成**: ハードコードを避けて保守性向上

---

## モーダルシステム

### 汎用モーダル構造

```html
<div id="modalBackdrop" class="modal-backdrop">
  <div class="modal-content">
    <h3 id="modalTitle">アイテム編集</h3>
    <form id="itemForm">
      <!-- フォーム内容 -->
    </form>
  </div>
</div>
```

### モーダル制御

```javascript
function openItemModal(mode, item = null) {
  modalBackdrop.style.display = 'flex';
  modalTitle.textContent = mode === 'edit' ? 'アイテム編集' : 'アイテム追加';

  if (mode === 'edit' && item) {
    // Populate form with existing item
    document.getElementById('f_name').value = item.name;
    document.getElementById('f_category').value = item.category;
    // ... (other fields)
  } else {
    // Reset form for new item
    itemForm.reset();
  }

  editingItemId = item ? item.id : null;
}
```

**特徴**:
- **モード管理**: 'edit' / 'add'で同じモーダルを再利用
- **フォーム初期化**: reset()とvalue設定を使い分け
- **Backdrop処理**: Flexboxでモーダルを中央配置

---

## パフォーマンス最適化

### 1. 選択的レンダリング

```javascript
function renderList() {
  // Filter items based on search and filters
  const items = filteredItems();

  // Only re-render the table, not the entire page
  const tableEl = document.getElementById('itemTable');
  tableEl.innerHTML = generateTableHTML(items);
}
```

**利点**: 検索・フィルター時に全体を再描画せず、テーブルのみ更新

### 2. Deep Copyの最小化

```javascript
// Bad (毎回Deep Copy)
state.items = JSON.parse(JSON.stringify(PRESETS[key].items));

// Good (必要な時のみ)
function saveAsCustomPreset() {
  items: JSON.parse(JSON.stringify(state.items)) // Only when saving
}
```

### 3. イベント委譲

```javascript
// Event delegation for dynamic table rows
itemTable.addEventListener('click', (e) => {
  if (e.target.classList.contains('edit-btn')) {
    const itemId = e.target.dataset.itemId;
    const item = state.items.find(it => it.id === itemId);
    openItemModal('edit', item);
  }
});
```

**利点**: 個別のイベントリスナーを大量に作成せず、親要素で一括処理

---

## ユーティリティ関数

### UID生成

```javascript
function uid(prefix='id') {
  return prefix + '-' + Math.random().toString(36).slice(2,9);
}
```

**特徴**:
- **Base36変換**: 0-9, a-zの36進数で短いID生成
- **衝突確率**: 約1/78億（36^7）で実用上問題なし

### タイムスタンプ生成

```javascript
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${date}-${hours}${minutes}${seconds}`;
}
```

**フォーマット**: `20251010-103045`（ファイル名に安全）

---

## デバッグとトラブルシューティング

### ブラウザーコンソールでのデバッグ

```javascript
// ステート確認
console.log(state);

// カスタムプリセット確認
console.log(getAllCustomPresets());

// localStorage直接確認
console.log(localStorage.getItem('ekc_custom_presets'));

// ステート強制リセット
state.items = [];
renderAll();
```

### よくある問題

#### 1. PDFエクスポートが失敗する

**原因**: jsPDF/html2canvasがCDNから読み込まれていない

**解決策**:
```javascript
if (!window.jspdf || !window.jspdf.jsPDF) {
  alert('PDFライブラリが読み込まれていません。ページを再読み込みしてください。');
  return;
}
```

#### 2. localStorage容量超過

**原因**: 大量のチェックリスト/プリセットを保存

**解決策**:
- 古いチェックリストを削除
- JSONエクスポートでバックアップ後、localStorageをクリア

```javascript
// localStorage完全クリア（注意: 全データ消失）
localStorage.removeItem('ekc_custom_presets');
localStorage.removeItem('ekc_saved_checklists');
```

---

## 今後の拡張ポイント

### 1. IndexedDB移行

**メリット**:
- 容量制限の緩和（5MB → 50MB+）
- 構造化データの効率的な検索

**実装例**:
```javascript
const dbRequest = indexedDB.open('OpsLoadoutDB', 1);
dbRequest.onsuccess = (event) => {
  const db = event.target.result;
  const transaction = db.transaction(['checklists'], 'readwrite');
  const store = transaction.objectStore('checklists');
  store.add({ name: 'My Checklist', items: [...] });
};
```

### 2. Web Worker for Export

**メリット**: PDF生成をバックグラウンドで実行（UI凍結防止）

```javascript
const worker = new Worker('export-worker.js');
worker.postMessage({ type: 'pdf', data: state.items });
worker.onmessage = (e) => {
  const blob = e.data;
  downloadBlob(blob, 'checklist.pdf');
};
```

### 3. Service Worker for Offline Support

**メリット**: オフラインでも動作（PWA化）

```javascript
// service-worker.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('ops-loadout-v1').then((cache) => {
      return cache.addAll(['/index.html', '/app.js', '/style.css']);
    })
  );
});
```

---

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照してください。
