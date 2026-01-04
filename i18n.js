/**
 * i18n.js - OpsLoadout Internationalization Module
 *
 * Supports: English (en), Japanese (ja)
 * Default: Japanese (ja)
 */

const I18N = {
  en: {
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

    // Controls - Preset
    "label.preset": "Preset",
    "preset.rename.title": "Rename selected custom preset",
    "preset.delete.title": "Delete selected custom preset",

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
    "form.description": "Detailed Notes (Markdown)",
    "form.dualUse": "Dual-use",
    "form.hazard": "Hazardous",
    "form.legality": "Legal Notes (JSON)",
    "form.sources": "Sources (one per line, title URL format)",
    "placeholder.description": "Detailed description, usage, notes, etc.",
    "placeholder.sources": "US State Dept Guide https://example.gov\nAF SERE Handbook",
    "placeholder.legality": '{"US":"Allowed","JP":"Allowed"}',

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
    "help.savingExporting": "Save & Export",
    "help.savingExportingDesc": "'Save' stores to local storage. Export to JSON/CSV/PDF is also available.",
    "help.badges": "About Badges",
    "help.badgeDualDesc": "— Dual-use item (may have legal restrictions)",
    "help.badgeHazardDesc": "— Subject to transport regulations",
    "help.keyboard": "Keyboard Shortcuts",
    "help.keyEsc": "— Close modal"
  },

  ja: {
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
    "help.savingExporting": "保存とエクスポート",
    "help.savingExportingDesc": "「保存」でローカルストレージに保存されます。JSON/CSV/PDF形式でエクスポートも可能です。",
    "help.badges": "バッジについて",
    "help.badgeDualDesc": "— 軍民両用品目（法的制限の可能性あり）",
    "help.badgeHazardDesc": "— 輸送規制対象品目",
    "help.keyboard": "キーボードショートカット",
    "help.keyEsc": "— モーダルを閉じる"
  }
};

// Current language state
let currentLang = localStorage.getItem('ops_lang') || 'ja';

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
    text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
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
  localStorage.setItem('ops_lang', lang);
  updateStaticTexts();

  // Dispatch custom event for dynamic content updates
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
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
