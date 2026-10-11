/**
 * i18n.js - OpsLoadout Internationalization Module
 *
 * Supports: English (en), Japanese (ja)
 * Default: Japanese (ja)
 */

const I18N = {
  en: {
    "comparison.button": "Compare lists",
    "comparison.title": "Loadout comparison (read-only)",
    "comparison.close": "Close",
    "comparison.reference": "Reference",
    "comparison.current": "Current",
    "comparison.delta": "Difference (current − reference)",
    "comparison.reload": "Reload reference",
    "comparison.choose": "Choose a reference list",
    "comparison.loading": "Reading the reference list…",
    "comparison.failed": "The reference could not be read. It may have changed or been deleted. Your working list and saved data have not been changed.",
    "comparison.unavailable": "(unavailable)",
    "comparison.notice": "This compares a snapshot of the working list taken when this dialog opened with the reference read when selected. It does not save, merge, or replace either list. Use Reload reference to read changes made in another tab; close and reopen this dialog to refresh the current snapshot.",
    "comparison.totalsNote": "Totals cover all checked items × quantity in each list, regardless of filters. Checked rows with quantity 0 count as checked rows. Weights and volumes are estimates or illustrative values, not verified measurements; the differences do not assess safety or sufficiency.",
    "comparison.fieldsNote": "Items match by ID, not by name. Compared fields: quantity, recommended quantity, checked state, unit weight/volume, and names/categories/purposes in both languages. Descriptions, sources, flags, scores, and other metadata are not compared. Unchanged means only these compared fields are unchanged.",
    "comparison.summary": "Added {added} / Removed {removed} / Changed {changed} / Compared fields unchanged {unchanged}",
    "comparison.names": "Reference: {reference} → Current: {current}",
    "comparison.onlyChanges": "Only items with differences",
    "comparison.page": "Showing {start}–{end} / {total} rows",
    "comparison.prev": "Previous",
    "comparison.next": "Next",
    "comparison.checked": "Checked",
    "comparison.unchecked": "Unchecked",
    "comparison.absent": "Not in this list",
    "comparison.noRows": "No items to display for this comparison and filter.",
    "comparison.metric.weight": "Checked weight",
    "comparison.metric.volume": "Checked volume",
    "comparison.metric.quantity": "Checked quantity",
    "comparison.metric.rows": "Checked rows",
    "comparison.status.added": "Added in current",
    "comparison.status.removed": "Removed from current",
    "comparison.status.changed": "Changed",
    "comparison.status.unchanged": "Compared fields unchanged",
    "comparison.field.name": "Name",
    "comparison.field.category": "Category",
    "comparison.field.purpose_short": "Purpose",
    "comparison.field.quantity": "Quantity",
    "comparison.field.recommended_quantity": "Recommended quantity",
    "comparison.field.checked": "Checked state",
    "comparison.field.weight_g": "Unit weight (g)",
    "comparison.field.volume_cm3": "Unit volume (cm³)",
    "catalog.search": "Find a preset",
    "catalog.placeholder": "Search names and purposes (Japanese / English)",
    "catalog.load": "Load selected list",
    "catalog.choose": "Choose a list to preview",
    "catalog.matches": "Matching presets: {presets}; saved lists: {saved}",
    "catalog.preview": "{count} items. {description}",
    "catalog.saved": "Saved checklist. Loading replaces the working list after any required confirmation.",
    "catalog.noSelection": "Selecting a candidate does not replace the working list. Use the load button after checking its description.",
    "catalog.illustrative": "Weights and volumes are calculation examples, not measurements. Replace them with measurements of your own items. Quantities are adjustable examples; this list does not establish safety or sufficiency.",
    // Header
    "app.subtitle": "Mission-ready checklist tool for planning, editing, and exporting equipment loadouts",

    // Controls - Category filter
    "label.category": "Category",
    "cat.all": "All",
    "cat.evasion": "Evasion",
    "cat.edc": "EDC",
    "cat.rescue": "Rescue",
    "cat.security": "Security",
    "cat.disaster": "Disaster",
    "cat.hacker": "IT",
    "cat.cyber_ninja": "Ninja",

    // Controls - Preset
    "label.preset": "Preset",
    "preset.rename.title": "Rename saved checklist",
    "preset.delete.title": "Delete saved checklist",

    // Controls - Search & Filter
    "label.search": "Search",
    "placeholder.search": "Search items...",
    "filter.dualUseOnly": "Dual-use only",
    "filter.hazardOnly": "Hazardous only",

    // Buttons
    "button.new": "New",
    "button.add": "+ Add Item",
    "button.save": "Save",
    "button.cancel": "Cancel",
    "button.edit": "Edit",
    "button.delete": "Delete",
    "button.load": "Load",
    "button.ok": "OK",
    "button.makePreset": "Make Preset",
    "button.overwrite": "Overwrite",
    "button.saveAsNew": "Save as New",
    "button.rename": "Rename",
    "button.checkAll": "Check All",
    "button.uncheckAll": "Uncheck All",

    // Checklist display
    "checklist.title": "Checklist",

    // Footer bar
    "total.weight": "Total Weight:",
    "total.volume": "Volume:",
    "weight.ultralight": "Ultralight (3kg)",
    "weight.standard": "Standard (5kg)",
    "weight.heavy": "Heavy (10kg)",

    // Graph
    "button.graph": "Graph",
    "graph.title": "Graph",
    "graph.pie": "Pie Chart",
    "graph.radar": "Radar",
    "graph.items": "Top Items",
    "graph.download": "Download",
    "graph.copy": "Copy",

    // Saved checklists
    "saved.title": "Saved Checklists",
    "saved.empty": "No saved checklists",

    // Item categories (dropdown)
    "item.cat.survival": "Survival",
    "item.cat.signaling": "Signaling",
    "item.cat.tools": "Tools",
    "item.cat.navigation": "Navigation",
    "item.cat.urban": "Urban Evasion",
    "item.cat.medical": "Medical",
    "item.cat.comm": "Communications",
    "item.cat.docs": "Documents",
    "item.cat.digital": "Digital Devices",
    "item.cat.other": "Other",

    // Table headers
    "th.name": "Name",
    "th.category": "Category",
    "th.weight": "Weight(g)",
    "th.quantity": "Qty",
    "th.tags": "Tags",
    "th.actions": "Actions",

    // Modal titles
    "modal.addItem": "Add Item",
    "modal.editItem": "Edit Item",
    "modal.editName": "Edit Checklist Name",
    "modal.saveOptions": "Select Save Method",
    "modal.saveComplete": "Save Complete",
    "modal.savedChecklists": "Saved Checklists",

    // Form labels
    "form.name": "Name",
    "form.category": "Category",
    "form.weight": "Weight (g)",
    "form.volume": "Volume (cm³)",
    "form.quantity": "Quantity",
    "form.recommendedQty": "Recommended Qty",
    "form.repackFreq": "Repack Frequency",
    "form.purpose": "Purpose (brief)",
    "form.description": "Detailed Notes (plain text)",
    "form.dualUse": "Dual-use",
    "form.hazard": "Hazardous",
    "form.legality": "Legal Notes (JSON)",
    "form.sources": "Sources (one per line, title URL format)",
    "placeholder.description": "Detailed description, usage, notes, etc.",
    "placeholder.sources": "US State Dept Guide https://example.gov\nAF SERE Handbook",
    "placeholder.legality": '{"US":"Verify current rules","JP":"Verify current rules"}',

    // Repack frequency
    "freq.never": "Never",
    "freq.daily": "Daily",
    "freq.weekly": "Weekly",
    "freq.monthly": "Monthly",

    // Badges
    "badge.dualUse": "Dual",
    "badge.hazard": "Hazard",

    // Detail view
    "detail.category": "Category",
    "detail.weight": "Weight",
    "detail.volume": "Volume",
    "detail.quantity": "Quantity",
    "detail.recommendedQty": "Recommended Qty",
    "detail.repackFreq": "Repack Frequency",
    "detail.categoryTags": "Category Tags",
    "detail.concealDualHazard": "Concealability / Dual-use / Hazardous",
    "detail.concealability": "Concealability",
    "detail.dualUse": "Dual-use",
    "detail.hazard": "Hazardous",
    "detail.legality": "Legal Notes",
    "detail.description": "Detailed Notes",
    "detail.sources": "Sources",
    "detail.none": "None",
    "detail.unknown": "Unknown",
    "detail.section.basic": "Basic Info",
    "detail.section.packing": "Packing Info",
    "detail.section.legal": "Legal & Safety",
    "detail.section.sources": "Sources & Notes",

    // Messages
    "msg.noItems": "No items. Use 'Add Item' or load a preset.",
    "msg.noMatchingItems": "No items match the filter.",
    "msg.itemCount": "{count} items",
    "msg.itemCountFiltered": "Showing {shown} of {total} items",
    "msg.confirmDelete": "Delete this item?",
    "msg.confirmDeleteChecklist": "Delete this checklist?",
    "msg.confirmDeletePreset": "Delete custom preset \"{name}\"?",
    "msg.invalidJson": "Legal notes must be valid JSON format",
    "msg.checklistName": "Checklist name:",
    "msg.savedAt": "Saved at:",
    "msg.savedToLocal": "Saved to local storage",
    "msg.enterPresetName": "Enter new preset name:",
    "msg.storageQuotaExceeded": "Storage quota exceeded. Please delete old checklists.",
    "msg.saveFailed": "Failed to save checklist.",
    "msg.presetStorageQuotaExceeded": "Storage quota exceeded. Please delete custom presets.",
    "msg.presetSaveFailed": "Failed to save custom preset.",
    "msg.presetLoadFailed": "Failed to load preset.",
    "msg.pdfLibNotLoaded": "PDF library not loaded. Please reload the page.",
    "msg.html2canvasNotLoaded": "html2canvas library not loaded. Please reload the page.",
    "msg.pdfError": "Error generating PDF: ",
    "msg.saveOptionsExisting": " is already saved. Overwrite or save as new?",
    "msg.newChecklist": "New Checklist",
    "msg.unnamed": "Unnamed",

    // Yes/No
    "yes": "Yes",
    "no": "No",

    // Preset optgroup labels
    "optgroup.saved": "Saved",
    "optgroup.evasion": "Evasion/Escape",
    "optgroup.edc": "EDC/Personal",
    "optgroup.rescue": "Rescue/Fire",
    "optgroup.security": "Security",
    "optgroup.disaster": "Disaster",
    "optgroup.hacker": "Hacker/IT",
    "optgroup.cyber_ninja": "Cyber Ninja",

    // PDF
    "pdf.generatedAt": "Generated at:",
    "pdf.totalWeight": "Total Weight (checked items):",
    "pdf.totalVolume": "Total Volume (checked items):",

    // Footer
    "footer.github": "GitHub repository here",

    // Help
    "button.help": "Help",
    "help.title": "How to Use",
    "help.gettingStarted": "Getting Started",
    "help.gettingStartedDesc": "Select a preset or create an empty checklist with the 'New' button.",
    "help.addingItems": "Adding Items",
    "help.addingItemsDesc": "Click '+ Add Item' to add items. Enter category, weight, quantity, etc.",
    "help.customPresets": "Saved Checklists",
    "help.customPresetsDesc": "Save a named checklist, then select it from the Saved group. You can rename, delete, overwrite, or save it as a new checklist. Changing the category only filters the available presets.",
    "help.weightTarget": "Weight Target",
    "help.weightTargetDesc": "Set a target weight to track progress with the progress bar. Use the Graph button for detailed visualization.",
    "help.graphView": "Graph View",
    "help.graphViewDesc": "The Graph button shows pie chart, radar chart, and top items views. Download or copy images.",
    "help.savingExporting": "Save & Export",
    "help.savingExportingDesc": "'Save' stores to local storage. JSON/CSV/PDF exports and Check All/Uncheck All cover the whole list, including hidden rows. Totals and graphs use checked quantities across the whole list. Browser printing includes only displayed rows and states the filter conditions.",
    "help.importJSON": "Restore a JSON backup",
    "help.importJSONDesc": "Choose JSON exported by this tool, check the preview, then open it as a separate unsaved checklist. Save it explicitly to keep it in this browser. Existing saved lists are not overwritten. Cancel or invalid input leaves your list unchanged. CSV, preset files, and JSON from other tools are not supported.",
    "help.review": "Review unchecked and below-recommended items",
    "help.reviewDesc": "Choose Unchecked, Below recommended, or Either condition. Search and the dual-use/hazard filters also apply. Rows show the reason and quantity difference; summary categories overlap. Unchecked does not mean zero quantity. Recommended quantities are reference values, not a judgment of safety or sufficient supplies. Clear item search and filters to see the whole list.",
    "help.language": "Language Switch",
    "help.languageDesc": "Use the language button (JA/EN) at top-right to switch between Japanese and English. Settings are saved.",
    "help.badges": "About Badges",
    "help.badgeDualDesc": "— Dual-use item (may have legal restrictions)",
    "help.badgeHazardDesc": "— Subject to transport regulations",
    "help.keyboard": "Keyboard Shortcuts",
    "help.keyEsc": "— Close modal"
  },

  ja: {
    "comparison.button": "構成を比較",
    "comparison.title": "構成の比較（読み取り専用）",
    "comparison.close": "閉じる",
    "comparison.reference": "比較先",
    "comparison.current": "現在",
    "comparison.delta": "差（現在−比較先）",
    "comparison.reload": "比較先を読み直す",
    "comparison.choose": "比較先のリストを選択",
    "comparison.loading": "比較先を読み込んでいます…",
    "comparison.failed": "比較先を読み込めません。内容の変更や削除の可能性があります。作業中のリストと保存データは変更していません。",
    "comparison.unavailable": "（利用不可）",
    "comparison.notice": "画面を開いた時点の作業中のリストと、選択時に読み取った比較先を比べます。保存・統合・置き換えは行いません。他のタブでの変更は「比較先を読み直す」で確認してください。現在側を更新するには、この画面を閉じて開き直します。",
    "comparison.totalsNote": "合計は各リスト全体のチェック済み項目×数量で、絞り込みには影響されません。数量0のチェック済み行もチェック行数には数えます。重量・体積は目安や例示値で、検証された実測値ではありません。差から安全性や物資の充足を判定するものではありません。",
    "comparison.fieldsNote": "同じ品かどうかは名前ではなくIDで対応づけます。比較対象は数量・推奨数・チェック・単位重量と体積・日英の名前とカテゴリーと用途です。説明・出典・フラグ・スコア・その他のメタデータは比較しません。「変更なし」は、この比較対象の項目だけを指します。",
    "comparison.summary": "追加 {added}／削除 {removed}／変更 {changed}／比較項目の変更なし {unchanged}",
    "comparison.names": "比較先: {reference} → 現在: {current}",
    "comparison.onlyChanges": "差がある項目だけ",
    "comparison.page": "表示 {start}–{end} / {total}行",
    "comparison.prev": "前へ",
    "comparison.next": "次へ",
    "comparison.checked": "チェック済み",
    "comparison.unchecked": "未チェック",
    "comparison.absent": "このリストにはありません",
    "comparison.noRows": "この比較・絞り込みで表示する項目はありません。",
    "comparison.metric.weight": "チェック済みの重量",
    "comparison.metric.volume": "チェック済みの体積",
    "comparison.metric.quantity": "チェック済みの数量",
    "comparison.metric.rows": "チェック済みの行数",
    "comparison.status.added": "現在側に追加",
    "comparison.status.removed": "現在側で削除",
    "comparison.status.changed": "変更あり",
    "comparison.status.unchanged": "比較項目の変更なし",
    "comparison.field.name": "名前",
    "comparison.field.category": "カテゴリー",
    "comparison.field.purpose_short": "用途",
    "comparison.field.quantity": "数量",
    "comparison.field.recommended_quantity": "推奨数",
    "comparison.field.checked": "チェック状態",
    "comparison.field.weight_g": "単位重量（g）",
    "comparison.field.volume_cm3": "単位体積（cm³）",
    "catalog.search": "プリセットを探す",
    "catalog.placeholder": "名前・用途を検索（日英どちらでも）",
    "catalog.load": "選択した構成を読み込む",
    "catalog.choose": "確認する構成を選択",
    "catalog.matches": "候補: プリセット {presets}件・保存リスト {saved}件",
    "catalog.preview": "{count}アイテム。{description}",
    "catalog.saved": "保存済みチェックリストです。読み込み時は必要な確認を経て、作業中のリストを置き換えます。",
    "catalog.noSelection": "候補を選ぶだけでは作業中のリストは変わりません。説明を確認してから読み込みボタンを押してください。",
    "catalog.illustrative": "重量・体積は計算用の例示値で、実測値ではありません。実用品の測定値に置き換えてください。数量も調整するための例で、安全性や物資の充足を示すリストではありません。",
    // Header
    "app.subtitle": "装備構成を計画・編集・エクスポートする任務対応型チェックリストツール",

    // Controls - Category filter
    "label.category": "カテゴリー",
    "cat.all": "All",
    "cat.evasion": "脱出",
    "cat.edc": "日常",
    "cat.rescue": "救助",
    "cat.security": "警備",
    "cat.disaster": "災害",
    "cat.hacker": "IT",
    "cat.cyber_ninja": "忍者",

    // Controls - Preset
    "label.preset": "プリセット",
    "preset.rename.title": "選択中のカスタムプリセットの名前を変更",
    "preset.delete.title": "選択中のカスタムプリセットを削除",

    // Controls - Search & Filter
    "label.search": "検索",
    "placeholder.search": "アイテムを検索...",
    "filter.dualUseOnly": "軍民両用のみ",
    "filter.hazardOnly": "危険物のみ",

    // Buttons
    "button.new": "新規",
    "button.add": "＋ アイテム追加",
    "button.save": "保存",
    "button.cancel": "キャンセル",
    "button.edit": "編集",
    "button.delete": "削除",
    "button.load": "読込",
    "button.ok": "OK",
    "button.makePreset": "プリセット化",
    "button.overwrite": "上書き保存",
    "button.saveAsNew": "別名で保存（新規作成）",
    "button.rename": "名前を変更",
    "button.checkAll": "全選択",
    "button.uncheckAll": "全解除",

    // Graph
    "button.graph": "グラフ",
    "graph.title": "グラフ",
    "graph.pie": "円グラフ",
    "graph.radar": "レーダー",
    "graph.items": "主要アイテム",
    "graph.download": "ダウンロード",
    "graph.copy": "コピー",

    // Checklist display
    "checklist.title": "チェックリスト",

    // Footer bar
    "total.weight": "合計重量:",
    "total.volume": "体積:",
    "weight.ultralight": "ウルトラライト (3kg)",
    "weight.standard": "スタンダード (5kg)",
    "weight.heavy": "ヘビー (10kg)",

    // Saved checklists
    "saved.title": "保存済みチェックリスト",
    "saved.empty": "保存済みチェックリストはありません",

    // Item categories (dropdown)
    "item.cat.survival": "サバイバル",
    "item.cat.signaling": "信号発信",
    "item.cat.tools": "工具",
    "item.cat.navigation": "ナビゲーション",
    "item.cat.urban": "都市型回避",
    "item.cat.medical": "医療",
    "item.cat.comm": "通信",
    "item.cat.docs": "書類",
    "item.cat.digital": "デジタル機器",
    "item.cat.other": "その他",

    // Table headers
    "th.name": "名前",
    "th.category": "カテゴリー",
    "th.weight": "重量(g)",
    "th.quantity": "数量",
    "th.tags": "タグ",
    "th.actions": "操作",

    // Modal titles
    "modal.addItem": "アイテム追加",
    "modal.editItem": "アイテム編集",
    "modal.editName": "チェックリスト名を編集",
    "modal.saveOptions": "保存方法を選択",
    "modal.saveComplete": "保存完了",
    "modal.savedChecklists": "保存済みチェックリスト",

    // Form labels
    "form.name": "名称",
    "form.category": "カテゴリー",
    "form.weight": "重量 (g)",
    "form.volume": "体積 (cm³)",
    "form.quantity": "数量",
    "form.recommendedQty": "推奨数",
    "form.repackFreq": "入替頻度",
    "form.purpose": "用途（簡潔に）",
    "form.description": "詳細メモ（Markdown可）",
    "form.dualUse": "軍民両用",
    "form.hazard": "危険物",
    "form.legality": "法的注意事項（JSON形式）",
    "form.sources": "出典（1行1件、タイトル URL形式）",
    "placeholder.description": "詳細な説明、使用方法、注意事項など",
    "placeholder.sources": "米国務省ガイダンス https://example.gov\nAF SERE ハンドブック",
    "placeholder.legality": '{"US":"許可","JP":"許可"}',

    // Repack frequency
    "freq.never": "なし",
    "freq.daily": "毎日",
    "freq.weekly": "毎週",
    "freq.monthly": "毎月",

    // Badges
    "badge.dualUse": "両用",
    "badge.hazard": "危険",

    // Detail view
    "detail.category": "カテゴリー",
    "detail.weight": "重量",
    "detail.volume": "体積",
    "detail.quantity": "数量",
    "detail.recommendedQty": "推奨数",
    "detail.repackFreq": "入替頻度",
    "detail.categoryTags": "カテゴリータグ",
    "detail.concealDualHazard": "隠蔽性 / 軍民両用 / 危険物",
    "detail.concealability": "隠蔽性",
    "detail.dualUse": "軍民両用",
    "detail.hazard": "危険物",
    "detail.legality": "法的注意事項",
    "detail.description": "詳細メモ",
    "detail.sources": "出典",
    "detail.none": "なし",
    "detail.unknown": "不明",
    "detail.section.basic": "基本情報",
    "detail.section.packing": "パッキング情報",
    "detail.section.legal": "法的・安全情報",
    "detail.section.sources": "出典・メモ",

    // Messages
    "msg.noItems": "アイテムがありません。「アイテム追加」を使うか、プリセットを読み込んでください。",
    "msg.noMatchingItems": "フィルター条件に一致するアイテムがありません。",
    "msg.itemCount": "{count}件のアイテム",
    "msg.itemCountFiltered": "{total}件中 {shown}件を表示",
    "msg.confirmDelete": "このアイテムを削除しますか？",
    "msg.confirmDeleteChecklist": "このチェックリストを削除しますか？",
    "msg.confirmDeletePreset": "カスタムプリセット「{name}」を削除しますか？",
    "msg.invalidJson": "法的注意事項は有効なJSON形式である必要があります",
    "msg.checklistName": "チェックリスト名:",
    "msg.savedAt": "保存日時:",
    "msg.savedToLocal": "ローカルストレージに保存されました",
    "msg.enterPresetName": "新しいプリセット名を入力してください:",
    "msg.storageQuotaExceeded": "保存容量が不足しています。古いチェックリストを削除してください。",
    "msg.saveFailed": "チェックリストの保存に失敗しました。",
    "msg.presetStorageQuotaExceeded": "保存容量が不足しています。カスタムプリセットを削除してください。",
    "msg.presetSaveFailed": "カスタムプリセットの保存に失敗しました。",
    "msg.presetLoadFailed": "プリセットの読み込みに失敗しました。",
    "msg.pdfLibNotLoaded": "PDFライブラリが読み込まれていません。ページを再読み込みしてください。",
    "msg.html2canvasNotLoaded": "html2canvasライブラリが読み込まれていません。ページを再読み込みしてください。",
    "msg.pdfError": "PDF生成中にエラーが発生しました: ",
    "msg.saveOptionsExisting": "はすでに保存されています。上書き保存しますか？それとも別名で保存しますか？",
    "msg.newChecklist": "新規チェックリスト",
    "msg.unnamed": "名称未設定",

    // Yes/No
    "yes": "はい",
    "no": "いいえ",

    // Preset optgroup labels
    "optgroup.saved": "保存済み",
    "optgroup.evasion": "脱出・回避系 (Evasion/Escape)",
    "optgroup.edc": "日常携行系 (EDC/Personal)",
    "optgroup.rescue": "救助・消防系 (Rescue/Fire)",
    "optgroup.security": "警備・防犯系 (Security)",
    "optgroup.disaster": "災害対応系 (Disaster)",
    "optgroup.hacker": "ハッカー・IT系 (Hacker/IT)",
    "optgroup.cyber_ninja": "サイバー忍者系 (Cyber Ninja)",

    // PDF
    "pdf.generatedAt": "生成日時:",
    "pdf.totalWeight": "合計重量（チェック済みアイテム）:",
    "pdf.totalVolume": "合計体積（チェック済みアイテム）:",

    // Footer
    "footer.github": "GitHubリポジトリはこちら",

    // Help
    "button.help": "ヘルプ",
    "help.title": "使い方",
    "help.gettingStarted": "はじめに",
    "help.gettingStartedDesc": "プリセットを選択するか、「新規」ボタンで空のチェックリストを作成します。",
    "help.addingItems": "アイテムの追加",
    "help.addingItemsDesc": "「＋ アイテム追加」ボタンでアイテムを追加できます。カテゴリー、重量、数量などを入力してください。",
    "help.customPresets": "保存済みチェックリスト",
    "help.customPresetsDesc": "名前を付けて保存し、「保存済み」から選んで読み込みます。名前変更、削除、上書き、別名保存ができます。カテゴリーを変えるだけでは候補を絞り込むだけで、リストは入れ替わりません。",
    "help.weightTarget": "重量目標",
    "help.weightTargetDesc": "目標重量を設定すると、プログレスバーで達成度を確認できます。グラフボタンで詳細な可視化も可能です。",
    "help.graphView": "グラフ表示",
    "help.graphViewDesc": "グラフボタンで円グラフ・レーダーチャート・主要アイテム一覧を切り替え表示。画像のダウンロードやコピーも可能です。",
    "help.savingExporting": "保存とエクスポート",
    "help.savingExportingDesc": "「保存」でローカルストレージに保存します。JSON/CSV/PDF出力と全チェック・全解除は、非表示行を含むリスト全体が対象です。合計とグラフはリスト全体のチェック済み数量を使います。ブラウザー印刷は表示行だけが対象で、絞り込み条件も記載します。",
    "help.importJSON": "JSONバックアップの読み戻し",
    "help.importJSONDesc": "本ツールで出力したJSONを選び、プレビューを確認してから未保存の別リストとして開きます。このブラウザーに残すには「保存」を押してください。保存済みリストは上書きしません。取消や不正な入力では現在のリストは変わりません。CSV、プリセット本体、他ツールのJSONは対象外です。",
    "help.review": "未チェックと推奨数未満の見直し",
    "help.reviewDesc": "「未チェック」「推奨数未満」「いずれか」を選びます。検索と軍民両用・危険物の条件も組み合わせて適用します。各行には理由と数量差を示し、件数の分類は重複します。未チェックは数量0を意味しません。推奨数は参考値であり、安全性や実際の物資の充足を判定するものではありません。全体を見るには「一覧の検索・絞り込みを解除」を押してください。",
    "help.language": "言語切り替え",
    "help.languageDesc": "右上の言語ボタン（JA/EN）で日本語と英語を切り替えられます。設定は保存されます。",
    "help.badges": "バッジについて",
    "help.badgeDualDesc": "— 軍民両用品目（法的制限の可能性あり）",
    "help.badgeHazardDesc": "— 輸送規制対象品目",
    "help.keyboard": "キーボードショートカット",
    "help.keyEsc": "— モーダルを閉じる"
  }
};

Object.assign(I18N.en, {
  'item.check': 'Pack {name}',
  'item.quantity': 'Quantity: {name}',
  'button.detail': 'Details',
  'button.close': 'Close',
  'weight.target': 'Target weight in grams (user-selected guideline)',
  'msg.unsaved': 'Unsaved changes',
  'graph.radar': 'Sample ratings',
  'msg.invalidTarget': 'Target weight must be a whole number from 100 to 1,000,000,000 g.',
  'graph.ratingDetail': 'These are unvalidated values supplied with the examples. Each axis averages available values for checked rows with a positive quantity, without weighting by quantity; missing scores are excluded (0 if none are available). Regulatory caution is not inverted. The tool does not measure survival, preparedness, or legality.',
  'graph.noWeight': 'No positive weight among checked equipment',
  'app.limit': 'Planning examples, not a safety or legal assessment. Weights and volumes are estimates; verify actual equipment and current rules. No flag does not mean unrestricted use.',
  'graph.limitShort': 'Sample ratings are not measurements of safety or legality. Higher regulatory caution is not better.',
  'graph.summary': 'Checked equipment: {quantity} units, {weight} g, {volume} cm³. The list contains the underlying values.',
  'msg.discard': 'Discard unsaved changes and load another checklist?',
  'msg.storageRead': 'Saved data could not be read. It will not be overwritten. You can keep editing and export JSON.',
  'msg.storageWrite': 'The checklist was not saved. Your edits are still here. Export JSON to keep a copy.',
  'msg.storageConflict': 'This saved checklist changed in another tab. Export your edits or save as a new checklist.',
  'msg.invalidInput': 'Check the input: quantities must be whole numbers from 0 to 999; weight and volume must be finite numbers from 0 to 1,000,000,000.',
  'preset.current': 'Current checklist (no preset selected)',
  'msg.preference': 'This preference could not be saved; it applies only to this page.',
});
Object.assign(I18N.ja, {
  'item.check': '{name}を準備済みにする',
  'item.quantity': '{name}の数量',
  'button.detail': '詳細',
  'button.close': '閉じる',
  'weight.target': '目標重量（g、利用者が決める目安）',
  'msg.unsaved': '未保存の変更があります',
  'graph.radar': '登録された参考値',
  'msg.invalidTarget': '目標重量は100〜1,000,000,000gの整数で入力してください。',
  'graph.ratingDetail': '例に登録された未検証の値です。各軸は、数量が1以上のチェック済み行のうち、値がある行の単純平均です。数量による重み付けはせず、値のない行は除きます（全行に値がなければ0）。法規制の注意度は反転しません。生存性、防災の十分さ、合法性を測定するものではありません。',
  'preset.rename.title': '保存済みチェックリストの名前を変更',
  'preset.delete.title': '保存済みチェックリストを削除',
  'form.description': '詳細メモ（プレーンテキスト）',
  'placeholder.legality': '{"JP":"最新の規則を確認"}',
  'graph.noWeight': 'チェック済み装備の重量合計が0です',
  'app.limit': '準備を考えるための例です。安全性や合法性は判定しません。重量と体積は目安のため、実物と最新の規則を確認してください。フラグがなくても制限がないとは限りません。',
  'graph.limitShort': '参考値は安全性や合法性の測定結果ではありません。法規制の注意度は高いほど良いという意味ではありません。',
  'graph.summary': 'チェック済み：{quantity}点、{weight} g、{volume} cm³。元の値は一覧で確認できます。',
  'msg.discard': '未保存の変更を破棄して、別のチェックリストを読み込みますか？',
  'msg.storageRead': '保存データを読み込めません。上書きせず保護しています。編集を続け、JSONを書き出すことはできます。',
  'msg.storageWrite': '保存できませんでした。編集中の内容は残っています。JSONを書き出して控えを残してください。',
  'msg.storageConflict': 'この保存済みリストは別のタブで変更されています。編集中の内容をJSONで書き出すか、別名保存してください。',
  'msg.invalidInput': '入力を確認してください。数量は0〜999の整数、重量と体積は0〜1,000,000,000の有限な数値です。',
  'preset.current': '現在のチェックリスト（プリセット未選択）',
  'msg.preference': '設定を保存できませんでした。このページ内だけに反映します。',
});

Object.assign(I18N.en, {
  'import.button': 'Import JSON',
  'button.checkAll': 'Check the whole list (including hidden rows)',
  'button.uncheckAll': 'Uncheck the whole list (including hidden rows)',
  'review.label': 'Review',
  'review.all': 'All',
  'review.unchecked': 'Unchecked',
  'review.below': 'Below recommended',
  'review.either': 'Either condition',
  'review.none': 'None',
  'review.reset': 'Clear item search and filters',
  'review.notice': 'Recommended quantities are reference values in the data. These filters do not assess safety or whether actual supplies are sufficient. Unchecked does not mean a quantity of zero.',
  'review.summary': 'Whole list: {unchecked} unchecked / {below} below recommended / {either} either (categories overlap). Showing {shown} / {total} rows.',
  'review.difference': 'Quantity {quantity} / recommended {recommended}; difference {shortfall}',
  'review.scope': 'Totals, graphs and JSON/CSV/PDF use the whole list, regardless of filters. Totals include only checked quantities. Bulk check/uncheck affects hidden rows too. Browser printing uses the visible rows and states the scope of the whole-list totals.',
  'review.printScope': 'Visible rows: {shown} / Total: {total}. Filters: {filters}. Totals above apply to the whole list.',
  'import.title': 'Preview JSON import',
  'import.name': 'Checklist name',
  'import.apply': 'Open as a new unsaved list',
  'import.notice': 'This opens a separate unsaved checklist. Existing saved lists are not overwritten. Search and filters will be cleared. Use Save afterwards to keep it in this browser.',
  'import.limits': 'OpsLoadout single-list JSON only. UTF-8 (BOM allowed), up to 5 MiB, 10,000 items, depth 32 and 250,000 JSON values. CSV, presets and other tools’ formats are not supported.',
  'import.stats': '{count} rows; {checked} checked. Checked totals: {weight} g / {volume} cm³.',
  'import.reading': 'Reading and validating JSON…',
  'import.ready': 'Validation complete. Review the preview before applying.',
  'import.applied': 'Opened as a new unsaved list. No saved lists were changed. Use Save to keep this list.',
  'import.cancelled': 'Import cancelled. Your checklist has not changed.',
  'import.stale': 'Import stopped because another operation occurred. Select the file again if needed.',
  'import.tooLarge': 'The file exceeds 5 MiB (5,242,880 bytes). Your checklist has not changed.',
  'import.encoding': 'The file is not valid UTF-8. Your checklist has not changed.',
  'import.syntax': 'The file is not valid JSON. Your checklist has not changed.',
  'import.format': 'Select single-list JSON exported by OpsLoadout, with checklistName and items. Your checklist has not changed.',
  'import.complex': 'The file exceeds depth 32 or 250,000 JSON values. Your checklist has not changed.',
  'import.unsafe': 'The file contains a reserved key (__proto__, constructor or prototype). Your checklist has not changed.',
  'import.invalid': 'The file could not be read or contains invalid item data (types, ranges or duplicate IDs). Your checklist has not changed.',
});
Object.assign(I18N.ja, {
  'import.button': 'JSONを読み込む',
  'button.checkAll': 'リスト全体をチェック（非表示の行を含む）',
  'button.uncheckAll': 'リスト全体のチェックを解除（非表示の行を含む）',
  'review.label': '見直し',
  'review.all': 'すべて',
  'review.unchecked': '未チェック',
  'review.below': '推奨数未満',
  'review.either': 'いずれか',
  'review.none': 'なし',
  'review.reset': '一覧の検索・絞り込みを解除',
  'review.notice': '推奨数はデータに登録された参考値です。安全性や実際の物資の充足は判定しません。未チェックを数量0として扱うこともありません。',
  'review.summary': 'リスト全体：未チェック{unchecked}行／推奨数未満{below}行／いずれか{either}行（分類は重複します）。表示{shown}／全体{total}行。',
  'review.difference': '数量{quantity}／推奨{recommended}・差{shortfall}',
  'review.scope': '絞り込みにかかわらず、合計・グラフ・JSON/CSV/PDFはリスト全体が対象です。合計にはチェック済みの数量だけを含みます。一括チェック・解除は非表示の行にも適用します。ブラウザー印刷は表示行を印刷し、全体合計の対象も明記します。',
  'review.printScope': '表示行: {shown} / 全体: {total}。絞り込み: {filters}。上の合計はリスト全体が対象です。',
  'import.title': 'JSONの読み込みを確認',
  'import.name': 'リスト名',
  'import.apply': '未保存の別リストとして開く',
  'import.notice': '未保存の別リストとして開きます。保存済みリストは上書きしません。検索と絞り込みは解除します。このブラウザーに残すには、読み込み後に「保存」を押してください。',
  'import.limits': 'OpsLoadoutが出力した単一リストのJSONが対象です。UTF-8（BOM可）、5 MiB・10,000項目・深さ32・JSON値250,000個まで。CSV・プリセット・他ツールの形式は対象外です。',
  'import.stats': '{count}行、チェック済み{checked}行。チェック済みの合計：{weight} g / {volume} cm³。',
  'import.reading': 'JSONを読み取り、検査しています…',
  'import.ready': '検査が完了しました。プレビューを確認してから適用してください。',
  'import.applied': '未保存の別リストとして開きました。保存済みリストは変更していません。残すには「保存」を押してください。',
  'import.cancelled': '読み込みを取り消しました。現在のリストは変更していません。',
  'import.stale': '別の操作があったため、読み込みを中止しました。必要ならファイルを選び直してください。',
  'import.tooLarge': 'ファイルが5 MiB（5,242,880バイト）を超えています。現在のリストは変更していません。',
  'import.encoding': 'ファイルが正しいUTF-8ではありません。現在のリストは変更していません。',
  'import.syntax': 'ファイルが正しいJSONではありません。現在のリストは変更していません。',
  'import.format': 'OpsLoadoutが出力した、checklistNameとitemsを含む単一リストのJSONを選んでください。現在のリストは変更していません。',
  'import.complex': '深さ32またはJSON値250,000個の上限を超えています。現在のリストは変更していません。',
  'import.unsafe': '予約されたキー（__proto__・constructor・prototype）が含まれています。現在のリストは変更していません。',
  'import.invalid': 'ファイルを読み取れないか、項目の型・範囲・IDなどが不正です。現在のリストは変更していません。',
});

function readPreference(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writePreference(key, value) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}
// Preferences are optional; storage denial must not prevent startup.
let currentLang = readPreference('ops_lang') === 'en' ? 'en' : 'ja';

/**
 * Get translated text for a key
 * @param {string} key - Translation key
 * @param {Object} params - Optional parameters for interpolation
 * @returns {string} Translated text
 */
function t(key, params = {}) {
  let text = I18N[currentLang]?.[key] || I18N['en']?.[key] || key;

  // Parameter interpolation: {name} -> value
  Object.keys(params).forEach(param => {
    text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), () => String(params[param]));
  });

  return text;
}

/**
 * Get current language code
 * @returns {string} 'en' or 'ja'
 */
function getLang() {
  return currentLang;
}

/**
 * Set language and update UI
 * @param {string} lang - 'en' or 'ja'
 */
function setLang(lang) {
  if (lang !== 'en' && lang !== 'ja') return;
  currentLang = lang;
  const saved = writePreference('ops_lang', lang);
  updateStaticTexts();

  // Dispatch custom event for dynamic content updates
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  if (!saved) alert(t('msg.preference'));
}

/**
 * Toggle between English and Japanese
 */
function toggleLang() {
  setLang(currentLang === 'ja' ? 'en' : 'ja');
}

/**
 * Update static text elements with data-i18n attributes
 */
function updateStaticTexts() {
  document.documentElement.lang = currentLang;
  // Text content
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });

  // Placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });

  // Titles (tooltips)
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  const labels = {helpBtn:'button.help', nameEditInput:'modal.editName', targetWeight:'weight.target', graphCloseBtn:'button.close', helpCloseBtn:'button.close'};
  Object.entries(labels).forEach(([id,key]) => document.getElementById(id)?.setAttribute('aria-label',t(key)));
  document.getElementById('langToggle')?.setAttribute('aria-label', currentLang === 'ja' ? 'Switch to English' : '日本語に切り替え');
  document.getElementById('dirtyIndicator')?.setAttribute('title',t('msg.unsaved'));

  // Update language toggle button label (show target language, not current)
  const langLabel = document.getElementById('langLabel');
  if (langLabel) {
    langLabel.textContent = currentLang === 'ja' ? 'EN' : 'JA';
  }
}

/**
 * Get locale string for date formatting
 * @returns {string} Locale code
 */
function getLocale() {
  return currentLang === 'ja' ? 'ja-JP' : 'en-US';
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  updateStaticTexts();

  // Setup language toggle button
  const langToggle = document.getElementById('langToggle');
  if (langToggle) {
    langToggle.addEventListener('click', toggleLang);
  }
});
