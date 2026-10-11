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
13. [ユーティリティ関数](#ユーティリティ関数)
14. [デバッグとトラブルシューティング](#デバッグとトラブルシューティング)
15. [今後の拡張ポイント](#今後の拡張ポイント)
16. [ライセンス](#ライセンス)

---

## アーキテクチャ概要

本ツールはVanilla JavaScriptで実装した静的サイトです。画面の編集と集計はブラウザー内で行い、保存先はlocalStorageです。PDFの生成にはhtml2canvas 1.4.1とjsPDF 4.2.1を使用します。

- アプリケーション用フレームワークと実行時CSSコンパイラーは不使用
- Node.js標準機能によるテストとプリセット生成。npmパッケージの導入は不要
- HTTP(S)では個別JSONを遅延読み込み、`file://`では生成済みスクリプトを読み込み

集計の例として、単位重量50gの品を3個チェックすると150g、数量0なら0gになります。合計値は装備の安全性や防災の十分さを判定する値ではありません。重量と体積は実物で確認し、法的注意や参考スコアを専門的な判断の代わりに使用しないでください。

### 主要コンポーネント

```
ops-loadout/
├── index.html          # UI構造、CSPメタタグ、PDF用CDNスクリプト
├── app.js              # コアロジック（プリセット遅延読み込み、レンダリング、グラフ）
├── loadout-core.js      # 入力検証、編集、集計、URL、CSV
├── loadout-store.js     # 保存データの検証と競合確認
├── i18n.js             # 多言語対応（日本語/英語リソース、切り替えロジック）
├── css/                # モジュール化されたスタイルシート
│   ├── main.css        # エントリポイント（@import）
│   ├── utilities.css   # ローカルのユーティリティークラス
│   ├── accessibility.css # モバイルと操作性の調整
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
├── presets-bundle.js   # file://用の生成済みデータ
├── scripts/
│   └── build-presets.cjs # バンドルの生成と内容検査
├── test/               # Node.js標準テスト
├── package.json        # npm testの定義（依存パッケージなし）
├── .github/workflows/test.yml # pushとpull_requestのCI
└── presets/            # 22プリセット、334アイテムのJSON
    ├── index.json      # メタデータ一覧
    ├── evasion/        # 脱出・回避系
    ├── edc/            # 日常携行系
    ├── rescue/         # 救助・消防系
    ├── security/       # 警備・防犯系
    ├── disaster/       # 災害対応系（ブッシュクラフト、マタギ含む）
    ├── cyber_ninja/    # サイバー忍者系
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

localStorageのキー：

| キー | 内容 |
|---|---|
| `ekc_checklists` | 保存済みチェックリスト一覧 |
| `ops_lang` | 言語設定（`ja`または`en`） |
| `ops_target_weight` | 重量目標（g） |

特徴：

- `state`はapp.jsのIIFE内に保持し、画面操作で更新する。
- 選択中の保存ID、保存時点のコピー、プリセットキー、読み込み番号、フォームの未保存状態は別の変数で管理する。
- 更新内容に応じて一覧、詳細、合計、選択肢を再描画する。言語やカテゴリの変更だけでは保存データを読み直さない。

`currentSavedSnapshot`は読み込み時の保存データを比較するための文字列です。履歴や監査証跡ではありません。`markDirty()`は未保存状態を立てると同時に読み込み番号を進めるため、遅れて届いたプリセットが利用者の編集を置き換えることを防ぎます。

### アイテム正規化

```javascript
function normalizeItem(it) {
  return LoadoutCore.normalizeItem(it);
}
```

`loadout-core.js`はDOMを使わないUMDモジュールです。ブラウザーでは`LoadoutCore`、Node.jsでは`require('./loadout-core.js')`として利用します。入力の形式が不正なら例外を返し、呼び出し側が画面の通知へ変換します。

| 項目 | 検証または補完 |
|---|---|
| `id` | 空でない文字列、最大256文字 |
| `quantity` / `recommended_quantity` | 0〜999の整数。欠落・nullは1 |
| `weight_g` / `volume_cm3` | 0〜1,000,000,000の有限な数値。欠落・nullは0 |
| `checked` | 明示値、`packed_by_default`、falseの順に採用 |
| `packed_by_default` | 欠落時false |
| `category_tags` | 文字列の配列。欠落・nullは空配列 |
| `repack_frequency` | daily / weekly / monthly / never。欠落・nullはnever |
| `scores` | 存在する値は0〜5の有限な数値 |

通常の文字列フィールドと日英の派生フィールド、フラグ、法的注意のオブジェクト、出典配列も型を確認します。アイテム配列は最大10,000行、保存リストは最大1,000件とし、それぞれ重複IDを拒否します。これらは入力制約であり、その件数で快適に動作することを保証するものではありません。

編集時の`LoadoutCore.editItem()`はフォームにないスコア、タグ、チェック状態などを保持します。表示中の翻訳値と同じ文字列を保存した場合は各言語の値を残し、文字列を変更した場合はそのフィールドを日英共通の値にします。自動翻訳は行いません。

---

## プリセット遅延読み込み

### 概要

プリセットデータは`presets/`フォルダーに分割されています。HTTP(S)では起動時にメタデータを読み、選択されたプリセットのJSONを取得します。初期選択の大使館脱出型もこの処理を使用します。

```
presets/
├── index.json              # メタデータ（名前、カテゴリ、ファイルパス）
├── evasion/embassy.json    # 個別プリセットデータ
├── evasion/sere.json
├── disaster/bushcraft_minimal.json
└── ...
```

### データ構造

index.jsonのメタデータ抜粋：

```json
{
  "version": "1.0",
  "categories": {
    "evasion": { "ja": "脱出・回避", "en": "Evasion" }
  },
  "presets": {
    "embassy": {
      "name_ja": "大使館脱出型",
      "name_en": "Embassy Evacuation",
      "category": "evasion",
      "item_count": 20,
      "file": "evasion/embassy.json"
    }
  }
}
```

個別プリセットJSONの構造例（説明用の1アイテム）：

```json
{
  "name_ja": "作業用サンプル",
  "name_en": "Work sample",
  "category": "edc",
  "items": [
    {
      "id": "sample_tool",
      "name": "工具",
      "category": "工具",
      "weight_g": 50,
      "volume_cm3": 20,
      "quantity": 3,
      "checked": true
    }
  ]
}
```

### 読み込みフロー

```javascript
// loadFromPreset()のHTTP取得部分
const response = await fetch(`presets/${meta.file}`);
if (!response.ok) {
  throw new Error(`HTTP error! status: ${response.status}`);
}
const presetData = await response.json();
presetData.items = LoadoutCore.normalizeItems(presetData.items);
PRESETS[key] = presetData;
if (request !== loadRequest) return;
applyPreset(key, presetData);
```

`loadFromPreset()`は読み込み開始時の番号を保持します。ほかの選択や編集が行われた場合、取得済みデータはキャッシュに残しても画面へ適用しません。現在の読み込みが失敗した場合は通知し、選択欄を現在のリストへ戻します。

`file://`ではJSONのfetchを使わず、`loadPresets()`が`presets-bundle.js`をスクリプトとして読み込みます。このファイルは全プリセットを含むため、HTTPの遅延読み込みとは転送量と読み込み単位が異なります。

```bash
# JSONを編集したあとに、同じ変更としてバンドルを更新する
node scripts/build-presets.cjs

# ファイルを書き換えず、JSONとバンドルが一致するか検査する
node scripts/build-presets.cjs --check
```

生成処理は`presets/index.json`の一覧を使い、`<`をUnicodeエスケープにしてスクリプトを作ります。生成ファイルは直接編集しません。PDFライブラリーはCDN配信なので、fileモードを完全オフラインのPDF機能と説明しないでください。

---

## 多言語対応（i18n）

### 概要

`i18n.js`が日本語/英語の切り替えを管理します。

### 言語リソース構造

```javascript
// 辞書の抜粋
const I18N = {
  en: {
    "button.save": "Save",
    "th.name": "Name",
    "graph.pie": "Pie Chart"
  },
  ja: {
    "button.save": "保存",
    "th.name": "名称",
    "graph.pie": "円グラフ"
  }
};
```

### 使用方法

静的テキスト（HTML属性）：

```html
<button data-i18n="button.save">保存</button>
<input data-i18n-placeholder="placeholder.search">
```

動的テキスト（JavaScript）：

```javascript
modalTitle.textContent = t('modal.addItem');
```

### 言語切り替え

```javascript
let currentLang = readPreference('ops_lang') === 'en' ? 'en' : 'ja';

function setLang(lang) {
  if (lang !== 'en' && lang !== 'ja') return;
  currentLang = lang;
  const saved = writePreference('ops_lang', lang);
  updateStaticTexts();
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  if (!saved) alert(t('msg.preference'));
}
```

`readPreference()`と`writePreference()`はlocalStorageへのアクセスをtry/catchで保護します。保存できなくても現在のページでは切り替え、次回起動時まで保持できないことを通知します。

`updateStaticTexts()`はテキスト、placeholder、title、主要操作のaria-label、`html.lang`を更新します。app.jsは`langchange`を受け、現在の一覧、詳細、合計、選択肢、開いているグラフを再描画します。保存済みリストを読み直さないため、未保存の編集は保持されます。

---

## グラフ表示機能

### 概要

3種類のビジュアライゼーションをタブで切り替え表示します。

### ビュー種類

1. 円グラフ（Pie）：カテゴリ別重量分布
2. レーダーチャート（Radar）：生存性、信号性、脱出支援、隠匿性、法規制の注意度の参考スコア
3. 主要アイテム（Items）：重量順トップアイテム一覧

### 実装

```javascript
let currentGraphView = 'pie';  // pie | radar | items

// ビュー選択部分の概要。実装は注意文と代替テキストも描画する
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
const W = 1200, H = 675;
canvas.width = W;
canvas.height = H;
```

集計対象は数量が1以上のチェック済み行です。レーダーの各軸は、その値がある行の単純平均であり、数量で重み付けしません。値がない行は平均から除外し、すべての行に値がない場合は0を表示します。`legality_penalty`は反転せず、高い値を「良い結果」と扱いません。

グラフの値はプリセットに登録された未検証の例です。生存性や合法性の測定結果ではないことを、ダイアログとPNG画像に記載します。カテゴリ色は同じ文字列から同じ色を生成し、円グラフと凡例で一致させます。重量が0なら割合を計算せず、重量データがない旨を表示します。

画面には集計値のテキストも表示し、画像コピーとPNG保存に対応します。画像コピーはClipboard APIとブラウザーの許可に依存します。Web Share APIによる共有機能はありません。

---

## カスタムプリセット管理

### データ構造

画面の「保存済みチェックリスト」をプリセットと同じ選択欄から再利用します。独立したカスタムプリセット用の保存領域や「プリセット化」チェックボックスはありません。

localStorageのキー：`ekc_checklists`

```json
[
  {
    "id": "checklist-abc1234",
    "name": "作業用リスト",
    "items": [],
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
]
```

### 主要関数

#### 1. readChecklists() / getAllChecklists()

```javascript
function getAllChecklists() {
  const result = readChecklists();
  return result.ok ? result.lists : [];
}
```

`LoadoutStore.read()`の戻り値は成功時に`{ok:true, raw, lists}`、失敗時に`{ok:false, error:'readFailed'}`です。`readChecklists()`は失敗を利用者へ通知します。表示用の`getAllChecklists()`が空配列を返しても、書き込み側は成功した読み込み結果を要求するため、壊れた保存内容を空配列で上書きしません。

#### 2. saveCurrentChecklist(saveAsNew)

```javascript
// saveCurrentChecklist()の保存成功後の処理
if (!saveAllChecklists(checklists, read.raw)) return false;
currentChecklistId = payload.id;
currentPresetKey = 'saved-' + payload.id;
currentSavedSnapshot = JSON.stringify({
  ...payload, items: LoadoutCore.normalizeItems(payload.items)
});
state.isDirty = false;
updateDirtyIndicator();
renderPresetOptions(currentCategory);
return true;
```

別名保存では新しいIDを作ります。保存に失敗した場合は選択中のIDや未保存表示を変えず、編集中の内容を残します。保存日時はISO 8601形式の端末時刻であり、第三者による時刻証明ではありません。

#### 3. 名前変更と削除

```javascript
function deleteChecklist(id) {
  const read = readChecklists();
  if (!read.ok) return false;
  const existing = read.lists.find(c => c.id === id);
  if (currentChecklistId === id && JSON.stringify(existing) !== currentSavedSnapshot) {
    alert(t('msg.storageConflict')); return false;
  }
  const filtered = read.lists.filter(c => c.id !== id);
  if (!saveAllChecklists(filtered, read.raw)) return false;
  if (currentChecklistId === id) {
    createNewChecklist();
  }
  renderPresetOptions(currentCategory);
  return true;
}
```

保存済み選択欄の名前変更は`showNameEditModal('renameSaved')`で編集し、保存処理へ進みます。画面中央の名前変更は編集中の名前を変更して未保存状態にします。名前を変えても変更履歴は作られません。

削除ボタンでは対象と未保存変更を確認し、保存時点のコピーと現在の保存値が異なる場合は削除を止めます。ストレージへの書き込みが成功した場合だけ、現在のリストを空の新規リストへ変更します。保存済みデータと現在の画面を別々に更新してはいけません。

---

## チェックリスト保存ロジック

### 上書き vs 別名保存の判定

保存の成否は`saveCurrentChecklist()`の戻り値で確認します。名前が同じでも新規リストのIDは別になり、名前だけでは上書き先を決めません。

#### フローチャート

```
保存ボタンクリック
  ↓
名前編集ダイアログで名前を確認
  ↓
currentChecklistId が存在？
  ├─ Yes → 上書き保存ダイアログ表示
  │         ├─ 上書き → 既存チェックリストを更新
  │         └─ 別名 → 新規IDで保存
  └─ No → 新規IDで保存
  ↓
検証・競合確認・書き込みが成功？
  ├─ Yes → 保存IDと選択肢を更新、未保存表示を解除、完了表示
  └─ No → 通知し、編集中の内容と未保存表示を保持
```

#### 実装

```javascript
function performSave(saveAsNew) {
  if (saveCurrentChecklist(saveAsNew)) showSaveConfirmation();
}

saveBtn.addEventListener('click', () => {
  showNameEditModal('save');
});
```

上書き前に、選択中の保存済みリストと`currentSavedSnapshot`を比較します。ほかのタブで更新や削除があれば上書きを止め、JSON出力や別名保存を案内します。さらにストアは、読み込み時の生文字列と書き込み直前の値を比較します。

localStorageには原子的な比較と書き込みがないため、比較直後の同時書き込みまでは防げません。同じ保存領域を複数タブで並行編集しない運用が必要です。端末間同期や編集内容の自動統合はありません。

### QuotaExceededError対策

```javascript
// loadout-store.jsのwrite()
function write(storage, lists, expectedRaw) {
  try {
    const encoded = JSON.stringify(core.normalizeChecklists(lists));
    if (storage.getItem(key) !== expectedRaw) {
      return { ok: false, error: 'conflict' };
    }
    storage.setItem(key, encoded);
    return { ok: true };
  } catch {
    return { ok: false, error: 'writeFailed' };
  }
}
```

容量超過とアクセス拒否などの書き込み失敗は`writeFailed`として扱い、画面側で保存できなかった旨を通知します。生の例外文やスタックを利用者向けメッセージへ埋め込みません。`localStorage`オブジェクトの取得自体が拒否される場合も呼び出し側で捕捉します。

読み取りが成功しない状態で、保存領域を初期化して続行しないでください。編集中のJSON出力を先に確保し、別のタブの状態やブラウザーの設定を確認します。失敗した書き込みを保存完了として扱うと、利用者がページを閉じた時点で編集内容を失います。

---

## PDFエクスポート実装

### html2canvas + jsPDF

#### ステップバイステップ

```javascript
// exportPDF()の画像化部分
const canvas = await html2canvas(pdfContainer, {
  scale: 2,
  useCORS: true,
  logging: false,
  backgroundColor: '#ffffff'
});
document.body.removeChild(pdfContainer);

const { jsPDF } = window.jspdf;
const imgData = canvas.toDataURL('image/png');
const imgWidth = 210;
const imgHeight = (canvas.height * imgWidth) / canvas.width;
const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
```

処理は次の順で実行します。

1. jsPDFとhtml2canvasの読み込みを確認する。
2. 出力ボタンを無効化し、出力時点のリスト名を保持する。
3. 一覧の全アイテムから専用HTMLを作り、文字列をエスケープする。
4. チェック状態、単位重量、数量、フラグ、共有集計による合計、限界の注意文をHTMLへ含める。
5. 幅800pxの一時要素を画面外へ置き、Canvasへ描画する。
6. CanvasをPNGへ変換してA4縦のPDFへ配置する。
7. 高さが297mmを超える場合は画像の配置位置をずらして複数ページへ分割する。
8. 保存後、または例外発生後に一時要素を除去し、ボタンを有効へ戻す。

HTMLの構築は最初の`await`より前に終えます。画面の検索やフィルターで非表示になっている行もPDFへ含めます。合計にはチェック済み行だけが入り、数量0の行は重量と体積を増やしません。

#### 技巧的ポイント

1. 非同期処理：`async/await`でhtml2canvasの完了を待つ。
2. 専用DOM：元の一覧は変更せず、PDF用の表を別に作る。
3. 画面外描画：`left: -9999px`で通常表示への影響を避ける。
4. 描画倍率：`scale: 2`でCanvasを生成する。
5. 後片付け：`finally`でも一時要素を除去し、操作不能なボタンを残さない。
6. 比率維持：Canvasの縦横比からPDFへの配置高さを計算する。

画像によるページ分割なので、表の行境界に合わせた改ページや文字検索、選択可能な文字は提供しません。行数や長い名称によってページ境界をまたぐ場合があり、配布前に実際のPDFを確認してください。大きいリストではCanvasのメモリ制限やブラウザーの描画制限も影響します。

### 日本語対応

```html
<!-- jsPDF for PDF export -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/4.2.1/jspdf.umd.min.js"
        integrity="sha512-plOdviVmws4Y3JAvbnpfKb2hVxKM1lCwsi3vmElYRj+tiDLffZ4FVUj5a8vyKJ9pIgl8JCAHEJ4D1iUKBecswg=="
        crossorigin="anonymous"
        referrerpolicy="no-referrer"></script>
<!-- html2canvas for HTML to PDF conversion -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
        integrity="sha512-BNaRQnYJYiPSqHHDb58B0yaPfCu+Wgds8Gp/gU33kqBtgNS4tSPHuGibyoeqMV/TJlSKda6FXzoEyYGjTe+vXA=="
        crossorigin="anonymous"
        referrerpolicy="no-referrer"></script>
```

SRIは受信したスクリプトのバイト列が指定のハッシュに一致するかを確認します。ライブラリーの脆弱性や出力内容の正しさを保証する機能ではありません。更新時はURLと対応するハッシュを同時に変更し、実際のPDF生成を確かめます。

日本語はブラウザーで描画した文字を画像としてPDFへ入れます。文字の表示は端末で利用できるフォントに依存し、フォントの埋め込みやPDFの読み上げ用テキストは提供しません。PDFだけを唯一の保存形式にせず、必要に応じてJSONやCSVも保管してください。

### CSVとJSONの出力

CSVは`LoadoutCore.csv()`を使用し、次の12列を全行に出力します。

```text
id,name,category,weight_g,volume_cm3,purpose_short,dual_use,hazard_flag,legality_notes,quantity,recommended_quantity,checked
```

UTF-8 BOMを付け、改行はCRLF、全セルを二重引用符で囲み、セル内の二重引用符を2つにします。`legality_notes`はJSON文字列です。`weight_g`と`volume_cm3`は単位量であり、合計量ではありません。フラグとチェック状態は0または1で出力します。

数式として解釈される可能性がある先頭文字や制御文字を持つセルにはアポストロフィーを付けます。表計算ソフトの動作は製品や読込設定に依存し、編集や再保存で保護が失われる場合があります。CSVを開く操作まで無条件に安全と説明しないでください。

JSONにはチェックリスト名、出力時刻、全アイテムのオブジェクトを含めます。保存コレクションのID一覧や編集履歴は含みません。JSON/CSVのインポートUIはないため、外部保存したファイルを自動で復元する機能はありません。

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

使用箇所：

- アイテム名表示
- チェックリスト名表示
- 属性値に入れるアイテムID
- タグ、出典名、説明、法的注意などのHTML出力

エスケープする文字：

- `&` → `&amp;`
- `<` → `&lt;`
- `>` → `&gt;`
- `"` → `&quot;`
- `'` → `&#39;`

### localStorage検証

```javascript
// loadout-store.jsのread()
function read(storage) {
  try {
    const raw = storage.getItem(key);
    return {
      ok: true,
      raw,
      lists: core.normalizeChecklists(raw === null ? [] : JSON.parse(raw))
    };
  } catch {
    return { ok: false, error: 'readFailed' };
  }
}
```

JSONとして解釈できても、アプリケーションが受け付ける形式とは限りません。文字列の数値、負数、配列でないitems、重複IDなどを正規化処理で拒否し、表示や集計へ渡しません。読み込み失敗は値が存在しない場合と区別します。

出典URLは`LoadoutCore.safeUrl()`でHTTP(S)に限定し、資格情報、空白、制御文字を含むものをリンクにしません。HTTP(S)であることだけで、参照先の安全性や内容の正確さを保証することはできません。

CSPはindex.htmlのmetaタグで設定します。スクリプトは自サイトとcdnjsだけを許可し、インラインスクリプトやevalは許可しません。インラインスタイルは進捗表示とPDF用のHTMLに使用します。`frame-ancestors`などHTTPヘッダー専用の制限をmetaで設定したと説明しないでください。詳細は[SECURITY.md](SECURITY.md)を参照してください。

---

## カテゴリフィルタリング

### presetsByCategoryマッピング

```javascript
const presetsByCategory = {
  evasion: [], edc: [], rescue: [], security: [],
  disaster: [], hacker: [], cyber_ninja: []
};
Object.keys(PRESETS_META).forEach(key => {
  const meta = PRESETS_META[key];
  if (presetsByCategory[meta.category]) {
    presetsByCategory[meta.category].push(key);
  }
});
```

カテゴリからプリセットへの対応はメタデータを使用します。カテゴリは7種類です。マタギ型は災害対応、ミジンコ流はサイバー忍者系に含まれます。アイテムのカテゴリとプリセットのカテゴリは別の情報です。

### 動的フィルタリング

```javascript
// カテゴリボタンは選択肢だけを変更する
document.querySelectorAll('.category-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const category = btn.dataset.category;
    currentCategory = category;
    document.querySelectorAll('.category-filter-btn').forEach(b => {
      b.classList.toggle('active', b === btn);
    });
    renderPresetOptions(category);
  });
});
```

`renderPresetOptions()`は保存済みチェックリストとビルトインプリセットを並べます。現在のプリセットが絞り込み対象から外れても、その選択を表す項目は保持します。カテゴリボタンだけではリスト本体や未保存内容を切り替えません。

選択欄で別のリストを選んだ場合は、未保存変更があれば確認を求めます。取り消したときは選択欄を現在のリストへ戻します。検索と軍民両用／危険物フィルターは表示だけを変え、集計対象やエクスポートする行の集合は変えません。

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
function openDialog(dialog) {
  dialogOpeners.set(dialog, document.activeElement);
  dialog.classList.add('active');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  const heading = dialog.querySelector('h3');
  if (heading) {
    if (!heading.id) heading.id = dialog.id + '-heading';
    dialog.setAttribute('aria-labelledby', heading.id);
  }
  dialog.tabIndex = -1;
  updateDialogBackground();
  (dialog.querySelector('input:not([type=checkbox]), button') || dialog).focus();
}
```

アイテム編集、名前編集、保存方法、保存完了、グラフ、ヘルプの6つのダイアログが共通の開閉処理を使用します。開いた要素にdialogの役割と見出しを設定し、背景のbody直下要素をinertにします。

TabとShift+Tabでは表示中の操作要素の先頭と末尾を循環します。Escapeで閉じ、アイテムフォームに未保存変更がある場合は破棄を確認します。閉じたあとは起動元へフォーカスを戻し、その要素がなくなっていれば保存ボタンへ移します。

`openItemModal()`は追加時にフォームを初期化し、編集時は選択言語の値を入れます。リストに存在するカテゴリがフォームの選択肢になければ、その選択肢を追加します。チェック状態やスコアなど、フォームに表示されない情報は保存時に保持します。

詳細パネルのアコーディオンはEnter/Spaceでも開閉し、`aria-expanded`を更新します。入力欄は16px以上、主要な操作は44px以上の押しやすい寸法を設定し、小さい画面では表の行を縦に配置します。これらの設定だけで支援技術全体への対応を保証せず、実際の操作を確認してください。

---

## パフォーマンス最適化

### 1. 選択的レンダリング

```javascript
globalSearch.addEventListener('input', () => renderList());
filterDual.addEventListener('change', () => renderList());
filterHazard.addEventListener('change', () => renderList());
```

検索とフィルター変更では一覧だけを更新します。数量変更では合計と開いている詳細を更新し、アイテムの編集や削除では`renderAll()`を呼びます。表示対象が変わらない箇所まで毎回置き換える必要はありませんが、派生表示の更新漏れを避けることを優先します。

ブラウザーの印刷には画面の一覧と`css/print.css`を使います。`beforeprint`で見出しと共有集計の要約を更新し、行のチェック記号と数量は印刷用の属性から表示します。検索中は一覧が絞られている一方、要約は全リストから計算されるため、全体を印刷する場合は検索とフィルターを解除してください。

### 2. Deep Copyの最小化

```javascript
// applyPreset()の読み込み部分
state.items = JSON.parse(JSON.stringify(presetData.items)).map(normalizeItem);

// loadChecklist()の読み込み部分
state.items = JSON.parse(JSON.stringify(checklist.items)).map(normalizeItem);
```

読み込む時点でコピーすることで、現在の編集がキャッシュ内のプリセットや読み込み直後の保存データを変更しないようにします。毎回の描画ではコピーしません。扱う値はJSON互換のデータであり、Dateや関数などを保持する一般的な複製処理ではありません。

### 3. 行イベントの設定

```javascript
itemTable.querySelectorAll('.editBtn').forEach(btn => {
  btn.addEventListener('click', e => {
    const id = e.currentTarget.dataset.id;
    openItemModal('edit', state.items.find(x => x.id === id));
  });
});
```

一覧を描画したあと、各行の編集、詳細、削除、チェック、数量の操作にリスナーを設定します。親要素へのイベント委譲は使用していません。再描画後の新しい要素にも操作が登録されることを、絞り込みと編集を組み合わせて確認します。

---

## ユーティリティ関数

### UID生成

```javascript
function uid(prefix='id') {
  return prefix + '-' + Math.random().toString(36).slice(2,9);
}
```

Base36の文字列から7文字を取り出してIDに使います。暗号学的な乱数ではなく、一意性の数学的保証もありません。重複IDは入力検証で拒否しますが、IDを認証トークンや機密値の代わりに使ってはいけません。大量生成時の衝突率は、1回の候補数だけでは判断できません。

### タイムスタンプ生成

```javascript
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}
```

形式は`YYYYMMDD_HHmmss`です。ファイル名に使う時刻は端末のローカル時刻、JSONや保存データのISO文字列はUTCです。いずれも端末時計に依存し、改変できない証拠ではありません。同じ秒に出力したファイルの扱いはブラウザーのダウンロード動作にも依存します。

---

## デバッグとトラブルシューティング

### ブラウザーコンソールでのデバッグ

```javascript
// ブラウザーコンソールで、保存状態の成否と件数だけを確認する
(() => {
  try {
    const result = LoadoutStore.read(localStorage);
    return { ok: result.ok, count: result.ok ? result.lists.length : null };
  } catch {
    return { ok: false, count: null };
  }
})();
```

app.jsの`state`や内部関数はIIFE内にあり、コンソールのグローバル変数として直接参照できません。編集内容を確認する場合は、開発者ツールで該当イベント処理へブレークポイントを置くか、画面のJSON出力を使います。装備内容や個人情報をコンソールログや公開Issueにコピーしないでください。

自動テストはNode.js 22で、依存パッケージを導入せずに実行できます。

```bash
npm test
node scripts/build-presets.cjs --check
git diff --check
```

`test/`は正規化、数量0、編集時の情報保持、保存失敗と競合、全プリセット、日英CSVの列数、i18n、UIの静的条件を検査します。`.github/workflows/test.yml`はpushとpull_requestで同じ`npm test`を実行します。テスト件数は追加時に変わるので、実行結果でpass/failを確認してください。

開発時は`python -m http.server 8000`などで配信し、HTTPとfileモードを別々に確認します。ローカル検証のあと、作業ブランチをPRとして提出し、pushとPRのTestが成功してから通常マージします。mainのTestとPagesデプロイ、公開ファイルとマージ内容の一致、公開画面を確認するまで完了と扱いません。作業ブランチの整理前にはバックアップを残します。

### よくある問題

#### 1. PDFエクスポートが失敗する

PDFライブラリーの未読み込み、CSPやSRIによる拒否、描画用メモリ不足などが考えられます。ブラウザーのNetworkとConsoleで、必要なスクリプトが読み込めたかを確認します。SRIを無効にして回避するのではなく、配信バージョンとハッシュの対応を調べてください。

読み込み状態の確認：

```javascript
// 読み込み状態の確認（保存データは表示しない）
({
  jsPDF: !!window.jspdf?.jsPDF,
  html2canvas: typeof window.html2canvas === 'function'
});
```

PDFは実際にダウンロードし、日本語、数量0、合計、長い名称、複数ページ、注意文を確認します。関数の終了だけではPDFの表示品質を確認したことにはなりません。利用者の実機、物理的な印刷、スクリーンリーダーは別の検証項目です。

#### 2. localStorage容量超過

容量はブラウザー、保存領域、設定によって異なります。容量超過以外にもプライベートモードやポリシーによるアクセス拒否で保存できない場合があります。読み込み失敗と保存競合も、単に空き容量の問題とは限りません。

1. ページを閉じず、編集中の内容をJSONへ出力する。
2. 出力ファイルの保存を確認し、ほかのタブの編集状態を確認する。
3. 不要な保存済みリストが明確な場合だけ、画面の削除操作を使う。
4. 保存に成功した通知を確認してからページを閉じる。

localStorage全体を消すコマンドは復旧手順として掲載しません。JSON出力はデータを外へ残す手段ですが、アプリにはインポート／自動復元機能がありません。保存データの破損を調べる場合も、元データを保持した状態で調査します。

---

## 今後の拡張ポイント

### 1. IndexedDB移行

候補となる利点は、構造化データの検索とトランザクションを使った更新です。使用できる容量はブラウザーや端末の空き容量、永続化設定などに依存します。固定の「何MBまで」とは説明しません。

導入時には、次の処理を設計する必要があります。

- データベースとオブジェクトストアの初期化
- 既存保存データを保持した移行と、失敗した場合の復旧
- スキーマ検証とバージョン管理
- 複数タブの編集競合の扱い
- 読み書き拒否、容量超過、途中終了のテスト

本アプリにはIndexedDBを使う処理はありません。ストレージの変更だけで同期や履歴機能が付くわけではありません。

### 2. Web Worker for Export

DOMを必要としないデータ整形や画像処理は、Workerへ分離する候補になります。ただしhtml2canvasはDOMを参照するため、現在のPDF生成全体をそのままWorkerへ移せるとは限りません。

分離する場合は、メインスレッドで行うDOM描画と、Workerへ渡せるデータ処理を決めます。メッセージで渡すデータは入力検証済みのコピーに限定し、キャンセル、エラー、転送コスト、メモリ消費を検証します。Workerを使った出力処理は未実装です。

### 3. Service Worker for Offline Support

Service WorkerによるHTTP(S)配信ファイルのキャッシュは、fileモードとは別の機能です。本アプリにはService Workerの登録やキャッシュ更新処理はありません。

導入する場合は、GitHub Pagesの`/ops-loadout/`という配信位置、CSSのimport先、プリセットJSON、PDFライブラリーを含めて対象を決めます。サイトルートの`/index.html`や存在しない`style.css`を固定指定すると、このリポジトリの構成に一致しません。

キャッシュ更新時の版の混在、オフライン時の未取得プリセット、保存データの保持、CDN依存を検討します。オフラインで利用できる範囲を明示し、接続を切ったブラウザーで確かめてから公開します。これらの拡張は、別途合意した範囲で実装します。

---

## ライセンス

MIT License。詳細は[LICENSE](../LICENSE)を参照してください。jsPDFとhtml2canvasの利用には、それぞれのライセンスと配布物の表示も適用されます。
