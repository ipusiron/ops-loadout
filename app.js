/**
 * app.js — OpsLoadout - 緊急脱出キットのチェックリストツール
 *
 * アーキテクチャ: Vanilla JavaScript (フレームワーク不使用)
 * スタイリング: css/ 配下のローカルCSS
 * データ保存: localStorage (ブラウザーローカル)
 *
 * 主要機能:
 * - 22種類のビルトインプリセット管理
 * - 保存済みチェックリストの再利用・名前変更・削除
 * - チェックリスト保存・読み込み（上書き/別名保存対応）
 * - アイテム追加・編集・削除
 * - PDF/CSV/JSONエクスポート
 * - カテゴリフィルタリング
 * - XSS対策・localStorage検証
 *
 * 共通処理: loadout-core.js（検証・集計・CSV）、loadout-store.js（保存）
 * プリセット: HTTP(S)ではJSON、file://ではpresets-bundle.jsから読み込み
 */

(() => {
  // ============================================================
  // PRESETS定義 (プリセットの動的読み込み)
  // ============================================================
  // プリセットは presets/index.json のメタデータと
  // 個別の presets/{category}/{key}.json ファイルから読み込まれます
  //
  // PRESETS_META: メタデータ（名前、カテゴリ、ファイルパス）- 初期ロード
  // PRESETS: 実際のプリセットデータ（アイテム含む）- 遅延ロード
  let PRESETS_META = {};  // index.json から読み込むメタデータ
  let PRESETS = {};       // 遅延ロードされた完全なプリセットデータのキャッシュ

  // ============================================================
  // アプリケーションステート (In-Memory State Management)
  // ============================================================
  // シングルステートオブジェクトで全体を管理
  // - checklistName: 現在のチェックリスト名
  // - items: アイテム配列（Deep Copyで参照を切断）
  // - selectedItemId: 選択中のアイテムID（詳細表示用）
  let state = {
    checklistName: '',
    items: [],
    selectedItemId: null,
    isDirty: false  // 未保存変更フラグ
  };

  // ============================================================
  // DOM要素参照 (DOM Element References)
  // ============================================================
  // 頻繁にアクセスする要素を事前に取得してパフォーマンス向上
  const presetSelect = document.getElementById('presetSelect');
  const itemTable = document.getElementById('itemTable');
  const itemDetail = document.getElementById('itemDetail');
  const currentChecklistName = document.getElementById('currentChecklistName');
  const totalWeightEl = document.getElementById('totalWeight');
  const totalVolumeEl = document.getElementById('totalVolume');
  const targetWeightInput = document.getElementById('targetWeight');
  const weightProgressFill = document.getElementById('weightProgressFill');
  const weightProgressPercent = document.getElementById('weightProgressPercent');
  const addItemBtn = document.getElementById('addItemBtn');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalTitle = document.getElementById('modalTitle');
  const itemForm = document.getElementById('itemForm');
  const f_name = document.getElementById('f_name');
  const f_category = document.getElementById('f_category');
  const f_weight = document.getElementById('f_weight');
  const f_volume = document.getElementById('f_volume');
  const f_quantity = document.getElementById('f_quantity');
  const f_recommended_quantity = document.getElementById('f_recommended_quantity');
  const f_repack_frequency = document.getElementById('f_repack_frequency');
  const f_purpose = document.getElementById('f_purpose');
  const f_dual = document.getElementById('f_dual');
  const f_hazard = document.getElementById('f_hazard');
  const f_legality = document.getElementById('f_legality');
  const f_description = document.getElementById('f_description');
  const f_sources = document.getElementById('f_sources');
  const modalCancel = document.getElementById('modalCancel');
  const modalSave = document.getElementById('modalSave');
  const exportJsonBtn = document.getElementById('exportJson');
  const exportCsvBtn = document.getElementById('exportCsv');
  const exportPdfBtn = document.getElementById('exportPdf');
  const saveBtn = document.getElementById('saveBtn');
  const presetSelectEl = document.getElementById('presetSelect');
  const globalSearch = document.getElementById('globalSearch');
  const filterDual = document.getElementById('filterDual');
  const filterHazard = document.getElementById('filterHazard');
  const reviewFilter = document.getElementById('reviewFilter');
  const newChecklistBtn = document.getElementById('newChecklist');
  const saveConfirmModal = document.getElementById('saveConfirmModal');
  const saveConfirmOk = document.getElementById('saveConfirmOk');
  const savedChecklistName = document.getElementById('savedChecklistName');
  const savedDateTime = document.getElementById('savedDateTime');
  const deletePresetBtn = document.getElementById('deletePresetBtn');
  const renamePresetBtn = document.getElementById('renamePresetBtn');
  const saveOptionsModal = document.getElementById('saveOptionsModal');
  const saveOptionsChecklistName = document.getElementById('saveOptionsChecklistName');
  const saveOverwriteBtn = document.getElementById('saveOverwriteBtn');
  const saveAsNewBtn = document.getElementById('saveAsNewBtn');
  const saveCancelBtn = document.getElementById('saveCancelBtn');
  const nameEditModal = document.getElementById('nameEditModal');
  const nameEditInput = document.getElementById('nameEditInput');
  const nameEditSaveBtn = document.getElementById('nameEditSaveBtn');
  const nameEditCancelBtn = document.getElementById('nameEditCancelBtn');
  const renameChecklistBtn = document.getElementById('renameChecklistBtn');
  const helpBtn = document.getElementById('helpBtn');
  const helpModal = document.getElementById('helpModal');
  const helpCloseBtn = document.getElementById('helpCloseBtn');
  const helpOkBtn = document.getElementById('helpOkBtn');
  const importJsonBtn = document.getElementById('importJson');
  const importFile = document.getElementById('importFile');
  const importModal = document.getElementById('importModal');
  const importStatus = document.getElementById('importStatus');

  const dialogOpeners = new WeakMap();
  function updateDialogBackground() {
    const active = document.querySelector('.modal-backdrop.active');
    for (const child of document.body.children) child.inert = !!active && child !== active;
  }
  function openDialog(dialog) {
    loadRequest++; // Opening an editor/save dialog cancels pending preset replacement.
    if (dialog !== importModal) importCandidate = null;
    renderPresetOptions(currentCategory);
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
  function closeDialog(dialog) {
    if (dialog === importModal) {
      importCandidate = null;
      importSequence++;
      setImportStatus('import.cancelled');
    }
    dialog.classList.remove('active');
    updateDialogBackground();
    const opener = dialogOpeners.get(dialog);
    if (opener?.isConnected && !opener.closest('[inert]')) opener.focus();
    else saveBtn.focus();
  }
  document.addEventListener('keydown', event => {
    const dialog = document.querySelector('.modal-backdrop.active');
    if (!dialog) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (dialog === modalBackdrop) closeModal();
      else closeDialog(dialog);
    } else if (event.key === 'Tab') {
      const controls = [...dialog.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); dialog.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }, true);

  // ============================================================
  // ユーティリティ関数 (Utility Functions)
  // ============================================================

  /**
   * UID生成
   * @param {string} prefix - プレフィックス（デフォルト: 'id'）
   * @returns {string} 一意識別子（例: 'id-abc1234'）
   *
   * 仕組み: Math.random()をBase36に変換して7文字取得
   * 衝突確率: 約1/78億（36^7）で実用上問題なし
   */
  function uid(prefix='id') { return prefix + '-' + Math.random().toString(36).slice(2,9); }

  /**
   * タイムスタンプ生成（ファイル名用）
   * @returns {string} YYYYMMDDHHmmss形式（例: '20251010-103045'）
   */
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

  // Normalize item with backward-compatible defaults for new packing fields
  function normalizeItem(it) {
    return LoadoutCore.normalizeItem(it);
  }

  /**
   * 重量クラスを判定
   * @param {number} weight - 重量(g)
   * @returns {string} 'light' | 'normal' | 'heavy'
   */
  function getWeightClass(weight) {
    if (weight <= 50) return 'light';
    if (weight >= 200) return 'heavy';
    return 'normal';
  }

  /**
   * Get localized field value from an item or preset
   * @param {Object} obj - Item or preset object
   * @param {string} field - Field name (e.g., 'name', 'category', 'purpose_short')
   * @returns {string} Localized value or fallback
   */
  function getL(obj, field) {
    const lang = getLang(); // from i18n.js
    const localizedField = field + '_' + lang;
    return obj[localizedField] ?? obj[field] ?? '';
  }

  // Multiple checklist management
  let currentChecklistId = null;
  let currentPresetKey = '';
  let currentSavedSnapshot = null;
  let loadRequest = 0;
  let formDirty = false;
  let storageWarningShown = false;
  let importSequence = 0;
  let importCandidate = null;
  let importBaseline = 0;
  let importStatusKey = '';
  const quantityTabDirections = new WeakMap();
  let renderPointer = null;
  let pendingRenderSource = null;
  let pointerRenderTimer = null;

  // A quantity change can be committed by pointer-driven blur. Keep layout
  // stable until the native click (including its default action) has finished.
  // Data is committed immediately; only the derived UI waits for the gesture.
  function finishPointerRender() {
    renderPointer = null;
    clearTimeout(pointerRenderTimer);
    pointerRenderTimer = null;
    const source = pendingRenderSource;
    pendingRenderSource = null;
    if (source) renderAll(source);
  }

  function schedulePointerRender() {
    clearTimeout(pointerRenderTimer);
    pointerRenderTimer = setTimeout(finishPointerRender, 0);
  }

  document.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    finishPointerRender();
    renderPointer = event.pointerId;
  }, true);
  document.addEventListener('pointerup', event => {
    if (event.pointerId === renderPointer) schedulePointerRender();
  }, true);
  document.addEventListener('pointercancel', event => {
    if (event.pointerId === renderPointer) schedulePointerRender();
  }, true);
  document.addEventListener('click', schedulePointerRender, true);
  // Keyboard input may arrive before the zero-delay terminal task. It belongs
  // to a new interaction, not to the preceding pointer gesture.
  document.addEventListener('keydown', finishPointerRender, true);
  document.addEventListener('pointermove', event => {
    if (renderPointer !== null && event.buttons === 0) finishPointerRender();
  }, true);
  window.addEventListener('blur', schedulePointerRender);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) schedulePointerRender();
  });

  function setImportStatus(key) {
    importStatusKey = key;
    importStatus.textContent = key ? t(key) : '';
  }

  function renderImportPreview() {
    if (!importCandidate) return;
    document.getElementById('importPreviewName').textContent = importCandidate.name;
    const sum = LoadoutCore.totals(importCandidate.items);
    document.getElementById('importPreviewStats').textContent = t('import.stats', {
      count: importCandidate.items.length, checked: sum.rows, weight: sum.weight, volume: sum.volume
    });
  }

  async function readImportFile(file) {
    const sequence = ++importSequence;
    const request = ++loadRequest;
    importCandidate = null;
    if (!file) { setImportStatus('import.cancelled'); return; }
    setImportStatus('import.reading');
    const stale = () => {
      if (sequence !== importSequence) return true;
      if (request === loadRequest) return false;
      setImportStatus('import.stale');
      return true;
    };
    try {
      if (file.size > LoadoutCore.IMPORT_LIMITS.maxBytes) throw new TypeError('importTooLarge');
      const buffer = await file.arrayBuffer();
      if (stale()) return;
      let text;
      try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer); }
      catch { throw new TypeError('importEncoding'); }
      const parsed = LoadoutCore.parseChecklistJSON(text);
      if (stale()) return;
      importCandidate = parsed;
      renderImportPreview();
      setImportStatus('import.ready');
      openDialog(importModal);
      dialogOpeners.set(importModal, importJsonBtn);
      importBaseline = loadRequest;
    } catch (error) {
      if (stale()) return;
      const messages = {
        importTooLarge: 'import.tooLarge', importEncoding: 'import.encoding',
        importSyntax: 'import.syntax', importFormat: 'import.format',
        importTooDeep: 'import.complex', importTooComplex: 'import.complex',
        importUnsafeKey: 'import.unsafe', importNonFinite: 'import.invalid'
      };
      setImportStatus(Object.hasOwn(messages, error.message) ? messages[error.message] : 'import.invalid');
    }
  }

  importJsonBtn.addEventListener('click', () => {
    importSequence++;
    loadRequest++;
    importCandidate = null;
    renderPresetOptions(currentCategory);
    setImportStatus('');
    importFile.value = '';
    importFile.click();
  });
  importFile.addEventListener('change', () => {
    const file = importFile.files?.[0];
    importFile.value = ''; // Allow selecting the same file after an error or cancellation.
    readImportFile(file);
  });
  importFile.addEventListener('cancel', () => setImportStatus('import.cancelled'));
  document.getElementById('importCancel').addEventListener('click', () => closeDialog(importModal));
  importModal.addEventListener('click', event => { if (event.target === importModal) closeDialog(importModal); });
  document.getElementById('importApply').addEventListener('click', () => {
    if (!importCandidate || importBaseline !== loadRequest) {
      closeDialog(importModal);
      setImportStatus('import.stale');
      return;
    }
    if ((state.isDirty || formDirty) && !confirm(t('msg.discard'))) return;
    const restored = importCandidate;
    closeDialog(importModal);
    currentChecklistId = null;
    currentSavedSnapshot = null;
    currentPresetKey = '';
    state.checklistName = restored.name;
    state.items = restored.items;
    state.selectedItemId = null;
    globalSearch.value = '';
    filterDual.checked = false;
    filterHazard.checked = false;
    reviewFilter.value = 'all';
    markDirty();
    renderAll();
    renderPresetOptions(currentCategory);
    setImportStatus('import.applied');
  });
  // Typing a quantity invalidates a pending file read before the change event commits it.
  itemTable.addEventListener('input', event => { if (event.target.matches('.qty-input')) loadRequest++; });
  itemTable.addEventListener('keydown', event => {
    if (!event.target.matches('.qty-input')) return;
    if (event.key === 'Tab') quantityTabDirections.set(event.target, event.shiftKey ? -1 : 1);
    else quantityTabDirections.delete(event.target);
  });

  function readChecklists() {
    let result;
    try { result = LoadoutStore.read(localStorage); } catch { result = { ok: false }; }
    if (!result.ok && !storageWarningShown) {
      storageWarningShown = true;
      alert(t('msg.storageRead'));
    }
    if (result.ok) storageWarningShown = false;
    return result;
  }

  function getAllChecklists() {
    const result = readChecklists();
    return result.ok ? result.lists : [];
  }

  function saveAllChecklists(checklists, expectedRaw) {
    let result;
    try { result = LoadoutStore.write(localStorage, checklists, expectedRaw); } catch { result = { ok: false }; }
    if (!result.ok) alert(t(result.error === 'conflict' ? 'msg.storageConflict' : 'msg.storageWrite'));
    return result.ok;
  }

  function saveCurrentChecklist(saveAsNew = false) {
    const read = readChecklists();
    if (!read.ok) return false;
    const checklists = read.lists;
    const saveId = saveAsNew ? null : currentChecklistId;
    if (saveId && JSON.stringify(checklists.find(c => c.id === saveId)) !== currentSavedSnapshot) {
      alert(t('msg.storageConflict'));
      return false;
    }
    const payload = {
      id: saveId || uid('checklist'),
      name: state.checklistName,
      items: state.items,
      createdAt: saveId ? (checklists.find(c => c.id === saveId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!saveId) {
      checklists.push(payload);
    } else {
      const index = checklists.findIndex(c => c.id === saveId);
      if (index !== -1) {
        checklists[index] = payload;
      } else {
        checklists.push(payload);
      }
    }

    if (!saveAllChecklists(checklists, read.raw)) return false;
    currentChecklistId = payload.id;
    currentPresetKey = 'saved-' + payload.id;
    currentSavedSnapshot = JSON.stringify({ ...payload, items: LoadoutCore.normalizeItems(payload.items) });
    state.isDirty = false;
    updateDirtyIndicator();
    renderPresetOptions(currentCategory);
    return true;
  }

  function loadChecklist(id) {
    const checklists = getAllChecklists();
    const checklist = checklists.find(c => c.id === id);
    if (checklist) {
      loadRequest++;
      currentChecklistId = checklist.id;
      state.checklistName = checklist.name;
      state.items = JSON.parse(JSON.stringify(checklist.items)).map(normalizeItem);
      currentSavedSnapshot = JSON.stringify(checklist);
      currentPresetKey = 'saved-' + id;
      state.selectedItemId = null;
      state.isDirty = false;
      renderAll();
    }
  }

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

  function createNewChecklist() {
    loadRequest++;
    currentChecklistId = null;
    currentSavedSnapshot = null;
    currentPresetKey = '';
    state.checklistName = t('msg.newChecklist');
    state.items = [];
    state.selectedItemId = null;
    state.isDirty = false;
    renderAll();
    renderPresetOptions(currentCategory);
  }

  /**
   * プリセットを読み込む（遅延ロード対応）
   * @param {string} key - プリセットキー
   */
  async function loadFromPreset(key) {
    const request = ++loadRequest;
    // Check cache first
    if (PRESETS[key]) {
      applyPreset(key, PRESETS[key]);
      return;
    }

    // Get metadata
    const meta = PRESETS_META[key];
    if (!meta) {
      console.error('Preset not found:', key);
      return;
    }

    // Fetch individual preset file
    try {
      const response = await fetch(`presets/${meta.file}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const presetData = await response.json();
      presetData.items = LoadoutCore.normalizeItems(presetData.items);
      PRESETS[key] = presetData;  // Cache it
      if (request !== loadRequest) return;
      applyPreset(key, presetData);
    } catch (error) {
      if (request !== loadRequest) return;
      presetSelectEl.value = currentPresetKey;
      alert(t('msg.presetLoadFailed'));
    }
  }

  /**
   * プリセットデータを適用
   */
  function applyPreset(key, presetData) {
    state.checklistName = getL(presetData, 'name');
    state.items = JSON.parse(JSON.stringify(presetData.items)).map(normalizeItem);
    currentChecklistId = null; // Treat as new checklist
    currentSavedSnapshot = null;
    currentPresetKey = key;
    state.selectedItemId = null;
    state.isDirty = false;
    renderAll();
    renderPresetOptions(currentCategory);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]; });
  }

  /**
   * URL安全性検証 - javascript:, data:, vbscript: スキームをブロック
   * @param {string} url - 検証するURL
   * @returns {string} 安全なURLまたは空文字列
   */
  function sanitizeUrl(url) {
    return LoadoutCore.safeUrl(url);
  }

  // Render functions
  /**
   * 未保存変更をマーク
   */
  function markDirty() {
    loadRequest++;
    if (!state.isDirty) {
      state.isDirty = true;
      if (renderPointer === null) updateDirtyIndicator();
    }
  }

  /**
   * 未保存インジケータを更新
   */
  function updateDirtyIndicator() {
    const indicator = document.getElementById('dirtyIndicator');
    if (indicator) {
      indicator.classList.toggle('hidden', !state.isDirty);
    }
  }

  function renderAll(updateSource = null) {
    if (updateSource && renderPointer !== null) {
      pendingRenderSource = updateSource;
      return;
    }
    // A completed action (for example clearing filters) renders the latest
    // state itself and supersedes a queued quantity-only redraw.
    pendingRenderSource = null;
    currentChecklistName.textContent = state.checklistName;
    updateDirtyIndicator();
    renderList(updateSource);
    renderDetail(state.selectedItemId);
    renderTotals();
  }

  function filteredItems() {
    const q = globalSearch.value.trim().toLowerCase();
    return state.items.filter(it=>{
      if (filterDual.checked && !it.dual_use) return false;
      if (filterHazard.checked && !it.hazard_flag) return false;
      if (!LoadoutCore.matchesReview(it, reviewFilter.value)) return false;
      if (!q) return true;
      const name = getL(it, 'name').toLowerCase();
      const purpose = getL(it, 'purpose_short').toLowerCase();
      return name.includes(q) || purpose.includes(q);
    });
  }

  function reviewReasons(item) {
    const review = LoadoutCore.itemReview(item);
    const reasons = [];
    if (review.unchecked) reasons.push(t('review.unchecked'));
    if (review.belowRecommended) reasons.push(t('review.difference', {
      quantity: item.quantity, recommended: item.recommended_quantity, shortfall: review.shortfall
    }));
    return reasons.join(' / ');
  }

  function renderList(updateSource = null) {
    // Native change-on-blur can run while activeElement is body. Keep the source
    // as a fallback, but leave surviving controls in place for natural Tab/click.
    const focused = document.activeElement === document.body && updateSource ? updateSource : document.activeElement;
    const direction = quantityTabDirections.get(updateSource) || 1;
    if (updateSource) quantityTabDirections.delete(updateSource);
    const focusClass = ['item-check', 'qty-input', 'detailBtn', 'editBtn', 'delBtn'].find(cls => focused?.classList.contains(cls));
    const focusedId = itemTable.contains(focused) && focusClass ? focused.dataset.id : null;
    const previousIds = [...itemTable.querySelectorAll('.item-check')].map(el => el.dataset.id);
    const list = filteredItems();
    const totalItems = state.items.length;
    const itemCountDisplay = document.getElementById('itemCountDisplay');
    const reviewCounts = state.items.reduce((counts, item) => {
      const review = LoadoutCore.itemReview(item);
      counts.unchecked += Number(review.unchecked);
      counts.below += Number(review.belowRecommended);
      counts.either += Number(review.needsReview);
      return counts;
    }, { unchecked: 0, below: 0, either: 0 });
    document.getElementById('reviewSummary').textContent = t('review.summary', { ...reviewCounts, shown: list.length, total: totalItems });
    if (state.selectedItemId && !list.some(item => item.id === state.selectedItemId)) {
      state.selectedItemId = null;
      renderDetail(null);
    }
    function restoreRowFocus() {
      if (!focusedId) return;
      const controls = [...itemTable.querySelectorAll('.' + focusClass)];
      const same = controls.find(el => el.dataset.id === focusedId);
      const oldIndex = previousIds.indexOf(focusedId);
      const next = direction < 0
        ? controls.filter(el => previousIds.indexOf(el.dataset.id) < oldIndex).at(-1)
        : controls.find(el => previousIds.indexOf(el.dataset.id) > oldIndex);
      const target = same || next || reviewFilter;
      if (updateSource && !updateSource.isConnected) {
        // Let a native Tab or pointer-driven blur finish first. Focusing here
        // synchronously would steal a click intended for a surviving control.
        requestAnimationFrame(() => {
          if (document.activeElement === document.body && target.isConnected) target.focus();
        });
      } else target.focus();
    }

    // Update item count display
    if (itemCountDisplay) {
      if (list.length < totalItems) {
        itemCountDisplay.textContent = t('msg.itemCountFiltered', { total: totalItems, shown: list.length });
        itemCountDisplay.classList.remove('hidden');
      } else {
        itemCountDisplay.textContent = t('msg.itemCount', { count: totalItems });
        itemCountDisplay.classList.remove('hidden');
      }
    }

    const existingRows = new Map([...itemTable.querySelectorAll('.item-table-row')]
      .map(row => [row.querySelector('.item-check').dataset.id, row]));
    if (updateSource && list.length && list.every(item => existingRows.has(item.id))) {
      const visibleIds = new Set(list.map(item => item.id));
      for (const [id, row] of existingRows) if (!visibleIds.has(id)) row.remove();
      for (const item of list) {
        const row = existingRows.get(item.id);
        row.querySelector('.item-check').checked = item.checked;
        row.querySelector('.qty-input').value = item.quantity;
        row.querySelector('.col-qty').dataset.quantity = item.quantity;
        row.querySelector('.review-reason').textContent = reviewReasons(item);
      }
      if (focusedId && !focused.isConnected) restoreRowFocus();
      return;
    }

    itemTable.className = 'item-table';
    itemTable.innerHTML = '';

    if (list.length === 0) {
      itemTable.innerHTML = `<div class="text-center py-8">
        <svg class="mx-auto h-12 w-12 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p class="text-sm text-gray-500">${totalItems === 0 ? t('msg.noItems') : t('msg.noMatchingItems')}</p>
      </div>`;
      restoreRowFocus();
      return;
    }

    // Table header
    const header = document.createElement('div');
    header.className = 'item-table-header';
    header.innerHTML = `
      <div></div>
      <div>${t('th.name')}</div>
      <div>${t('th.category')}</div>
      <div>${t('th.weight')}</div>
      <div>${t('th.quantity')}</div>
      <div>${t('th.tags')}</div>
      <div class="col-actions text-right">${t('th.actions')}</div>
    `;
    itemTable.appendChild(header);

    // Table rows
    list.forEach(it => {
      const row = document.createElement('div');
      row.className = 'item-table-row';

      const badges = [];
      if (it.dual_use) {
        badges.push(`<span class="badge badge-warning"><svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>${t('badge.dualUse')}</span>`);
      }
      if (it.hazard_flag) {
        badges.push(`<span class="badge badge-danger"><svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>${t('badge.hazard')}</span>`);
      }

      row.innerHTML = `
        <div class="col-check">
          <input type="checkbox" data-id="${escapeHtml(it.id)}" aria-label="${escapeHtml(t('item.check', {name: getL(it, 'name')}))}" ${it.checked ? 'checked' : ''} class="item-check cursor-pointer focus:ring-2 focus:ring-blue-500"/>
        </div>
        <div class="col-name-cell"><div class="col-name">${escapeHtml(getL(it, 'name'))}</div><p class="review-reason">${escapeHtml(reviewReasons(it))}</p></div>
        <div class="col-category">${escapeHtml(getL(it, 'category'))}</div>
        <div class="col-weight" data-label="${escapeHtml(t('th.weight'))}"><span class="weight-badge weight-${getWeightClass(it.weight_g || 0)}">${it.weight_g ?? 0}</span></div>
        <div class="col-qty" data-quantity="${it.quantity ?? 1}">
          <label class="qty-label"><span>${t('th.quantity')}</span><input type="number" min="0" max="999" step="1" aria-label="${escapeHtml(t('item.quantity', {name: getL(it, 'name')}))}" value="${it.quantity ?? 1}" data-id="${escapeHtml(it.id)}"
            class="qty-input w-full px-1 py-0.5 text-xs border rounded focus:ring-1 focus:ring-blue-500" /></label>
        </div>
        <div class="col-badge">${badges.join('')}</div>
        <div class="col-actions">
          <button data-id="${escapeHtml(it.id)}" class="detailBtn action-btn-icon" title="${t('button.detail')}" aria-label="${escapeHtml(t('button.detail') + ': ' + getL(it, 'name'))}">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button data-id="${escapeHtml(it.id)}" class="editBtn action-btn-icon" title="${t('button.edit')}" aria-label="${escapeHtml(t('button.edit') + ': ' + getL(it, 'name'))}">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button data-id="${escapeHtml(it.id)}" class="delBtn action-btn-icon danger" title="${t('button.delete')}" aria-label="${escapeHtml(t('button.delete') + ': ' + getL(it, 'name'))}">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      `;
      itemTable.appendChild(row);
    });

    // attach events
    itemTable.querySelectorAll('.item-check').forEach(cb=>{
      cb.addEventListener('change', e=>{
        const id = e.target.dataset.id;
        const it = state.items.find(x=>x.id===id);
        if (it) { it.checked = e.target.checked; markDirty(); renderAll(e.target); }
      });
    });
    itemTable.querySelectorAll('.qty-input').forEach(input=>{
      input.addEventListener('change', e=>{
        const id = e.target.dataset.id;
        const it = state.items.find(x=>x.id===id);
        if (it) {
          const newQty = Number(e.target.value);
          if (e.target.value.trim() === '' || !Number.isInteger(newQty) || newQty < 0 || newQty > 999) {
            e.target.value = it.quantity;
            alert(t('msg.invalidInput'));
            return;
          }
          it.quantity = newQty;
          e.target.closest('.col-qty').dataset.quantity = newQty;
          e.target.value = newQty;
          markDirty();
          renderAll(e.target);
        }
      });
    });
    itemTable.querySelectorAll('.detailBtn').forEach(btn=>{
      btn.addEventListener('click', e=>{
        const id = e.currentTarget.dataset.id;
        state.selectedItemId = id;
        renderDetail(id);
      });
    });
    itemTable.querySelectorAll('.editBtn').forEach(btn=>{
      btn.addEventListener('click', e=>{
        const id = e.currentTarget.dataset.id;
        openItemModal('edit', state.items.find(x=>x.id===id));
      });
    });
    itemTable.querySelectorAll('.delBtn').forEach(btn=>{
      btn.addEventListener('click', e=>{
        const id = e.currentTarget.dataset.id;
        if (confirm(t('msg.confirmDelete'))) {
          state.items = state.items.filter(x=>x.id!==id);
          markDirty();
          renderAll();
        }
      });
    });
    restoreRowFocus();
  }

  function renderDetail(id) {
    if (!id) {
      itemDetail.classList.add('hidden');
      return;
    }
    const it = state.items.find(x=>x.id===id);
    if (!it) {
      itemDetail.classList.add('hidden');
      return;
    }

    // Show accordion and populate content
    itemDetail.classList.remove('hidden');
    const legalityObj = getL(it, 'legality_notes') || it.legality_notes || {};
    const legalityHtml = JSON.stringify(legalityObj, null, 2);
    const repackLabels = {never: t('freq.never'), daily: t('freq.daily'), weekly: t('freq.weekly'), monthly: t('freq.monthly')};

    // Source links HTML
    const sourcesHtml = (it.sources||[]).map(s => {
      const safeUrl = sanitizeUrl(s.url);
      if (safeUrl) {
        return `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${escapeHtml(s.title)}</a>`;
      }
      return escapeHtml(s.title);
    }).join('<br/>');

    itemDetail.innerHTML = `
      <div class="flex justify-between items-start mb-3">
        <h4 class="font-semibold text-base">${escapeHtml(getL(it, 'name'))}</h4>
        <button id="closeDetail" class="action-btn-icon text-xl" aria-label="${t('button.close')}">×</button>
      </div>
      <p class="text-sm text-gray-600 mb-4">${escapeHtml(getL(it, 'purpose_short'))}</p>

      <!-- Basic Info Section -->
      <div class="detail-section" data-section="basic">
        <div class="detail-section-header">
          <span class="detail-section-title">${t('detail.section.basic')}</span>
          <span class="detail-section-toggle">▼</span>
        </div>
        <div class="detail-section-content">
          <dl class="text-sm text-gray-700 space-y-1.5">
            <div class="flex"><dt class="w-24 flex-shrink-0 text-xs text-gray-500">${t('detail.category')}</dt><dd>${escapeHtml(getL(it, 'category'))}</dd></div>
            <div class="flex"><dt class="w-24 flex-shrink-0 text-xs text-gray-500">${t('detail.weight')}</dt><dd><span class="weight-badge weight-${getWeightClass(it.weight_g || 0)}">${it.weight_g ?? 0} g</span></dd></div>
            <div class="flex"><dt class="w-24 flex-shrink-0 text-xs text-gray-500">${t('detail.volume')}</dt><dd>${it.volume_cm3 ?? 0} cm³</dd></div>
          </dl>
        </div>
      </div>

      <!-- Packing Info Section -->
      <div class="detail-section" data-section="packing">
        <div class="detail-section-header">
          <span class="detail-section-title">${t('detail.section.packing')}</span>
          <span class="detail-section-toggle">▼</span>
        </div>
        <div class="detail-section-content">
          <dl class="text-sm text-gray-700 space-y-1.5">
            <div class="flex"><dt class="w-24 flex-shrink-0 text-xs text-gray-500">${t('detail.quantity')}</dt><dd>${it.quantity ?? 1}</dd></div>
            <div class="flex"><dt class="w-24 flex-shrink-0 text-xs text-gray-500">${t('detail.recommendedQty')}</dt><dd>${it.recommended_quantity ?? 1}</dd></div>
            <div class="flex"><dt class="w-24 flex-shrink-0 text-xs text-gray-500">${t('detail.repackFreq')}</dt><dd>${escapeHtml(repackLabels[it.repack_frequency] || t('freq.never'))}</dd></div>
            <div class="flex"><dt class="w-24 flex-shrink-0 text-xs text-gray-500">${t('detail.categoryTags')}</dt><dd>${escapeHtml((it.category_tags||[]).join(', ') || t('detail.none'))}</dd></div>
          </dl>
        </div>
      </div>

      <!-- Legal & Safety Section -->
      <div class="detail-section" data-section="legal">
        <div class="detail-section-header">
          <span class="detail-section-title">${t('detail.section.legal')}</span>
          <span class="detail-section-toggle">▼</span>
        </div>
        <div class="detail-section-content">
          <dl class="text-sm text-gray-700 space-y-1.5">
            <div class="flex"><dt class="w-24 flex-shrink-0 text-xs text-gray-500">${t('detail.concealability')}</dt><dd>${escapeHtml(it.concealability ?? t('detail.unknown'))}</dd></div>
            <div class="flex"><dt class="w-24 flex-shrink-0 text-xs text-gray-500">${t('detail.dualUse')}</dt><dd>${it.dual_use ? `<span class="badge badge-warning">${t('yes')}</span>` : t('no')}</dd></div>
            <div class="flex"><dt class="w-24 flex-shrink-0 text-xs text-gray-500">${t('detail.hazard')}</dt><dd>${it.hazard_flag ? `<span class="badge badge-danger">${t('yes')}</span>` : t('no')}</dd></div>
            <div><dt class="text-xs text-gray-500 mb-1">${t('detail.legality')}</dt><dd><pre class="text-xs bg-white p-2 rounded border overflow-x-auto">${escapeHtml(legalityHtml)}</pre></dd></div>
          </dl>
        </div>
      </div>

      <!-- Sources & Notes Section -->
      <div class="detail-section" data-section="sources">
        <div class="detail-section-header">
          <span class="detail-section-title">${t('detail.section.sources')}</span>
          <span class="detail-section-toggle">▼</span>
        </div>
        <div class="detail-section-content">
          <dl class="text-sm text-gray-700 space-y-1.5">
            ${getL(it, 'description') ? `<div><dt class="text-xs text-gray-500 mb-1">${t('detail.description')}</dt><dd class="whitespace-pre-wrap bg-white p-2 rounded border text-sm">${escapeHtml(getL(it, 'description'))}</dd></div>` : ''}
            <div><dt class="text-xs text-gray-500 mb-1">${t('detail.sources')}</dt><dd>${sourcesHtml || t('detail.none')}</dd></div>
          </dl>
        </div>
      </div>

      <div class="mt-4">
        <button id="detailEdit" class="btn btn-primary btn-sm">${t('button.edit')}</button>
      </div>
    `;

    // Attach event listeners
    document.getElementById('closeDetail').addEventListener('click', ()=>{
      state.selectedItemId = null;
      renderDetail(null);
    });
    document.getElementById('detailEdit').addEventListener('click', ()=> openItemModal('edit', it));

    // Collapsible section toggle
    itemDetail.querySelectorAll('.detail-section-header').forEach(header => {
      header.setAttribute('role', 'button');
      header.tabIndex = 0;
      header.setAttribute('aria-expanded', 'true');
      header.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); header.click(); }
      });
      header.addEventListener('click', () => {
        const section = header.closest('.detail-section');
        const content = section.querySelector('.detail-section-content');
        const toggle = section.querySelector('.detail-section-toggle');
        content.classList.toggle('collapsed');
        toggle.classList.toggle('collapsed');
        header.setAttribute('aria-expanded', String(!content.classList.contains('collapsed')));
      });
    });
  }

  function renderTotals() {
    const totals = LoadoutCore.totals(state.items);
    totalWeightEl.textContent = totals.weight;
    totalVolumeEl.textContent = totals.volume;

    // Update weight progress bar
    const targetWeight = validTargetWeight(targetWeightInput.value) ? Number(targetWeightInput.value) : 5000;
    const percentage = Math.min(100, Math.round((totals.weight / targetWeight) * 100));
    weightProgressFill.style.width = percentage + '%';
    weightProgressPercent.textContent = percentage + '%';

    // Update color based on percentage
    weightProgressFill.classList.remove('warning', 'danger');
    if (percentage >= 100) {
      weightProgressFill.classList.add('danger');
    } else if (percentage >= 80) {
      weightProgressFill.classList.add('warning');
    }
  }

  // Modal management for add/edit
  let editingId = null;
  function openItemModal(mode='add', item=null) {
    formDirty = false;
    openDialog(modalBackdrop);
    if (mode === 'edit' && item) {
      modalTitle.textContent = t('modal.editItem');
      editingId = item.id;
      f_name.value = getL(item, 'name') || '';
      const category = getL(item, 'category');
      if (![...f_category.options].some(o => o.value === category)) f_category.add(new Option(category, category));
      f_category.value = category;
      f_weight.value = item.weight_g || 0;
      f_volume.value = item.volume_cm3 || 0;
      f_quantity.value = item.quantity ?? 1;
      f_recommended_quantity.value = item.recommended_quantity ?? 1;
      f_repack_frequency.value = item.repack_frequency || 'never';
      f_purpose.value = getL(item, 'purpose_short') || '';
      f_dual.checked = !!item.dual_use;
      f_hazard.checked = !!item.hazard_flag;
      const legalityObj = getL(item, 'legality_notes') || item.legality_notes || {};
      f_legality.value = JSON.stringify(legalityObj);
      f_description.value = getL(item, 'description') || '';
      // sources配列を「タイトル URL」形式の複数行に変換
      f_sources.value = (item.sources || []).map(s => {
        return s.url ? `${s.title} ${s.url}` : s.title;
      }).join('\n');
    } else {
      modalTitle.textContent = t('modal.addItem');
      editingId = null;
      itemForm.reset();
      f_quantity.value = 1;
      f_recommended_quantity.value = 1;
      f_repack_frequency.value = 'never';
      f_legality.value = '{}';
      f_description.value = '';
      f_sources.value = '';
    }
  }

  function closeModal() {
    if (formDirty && !confirm(t('msg.discard'))) return;
    formDirty = false;
    closeDialog(modalBackdrop);
  }

  modalCancel.addEventListener('click', (e)=>{ e.preventDefault(); closeModal(); });
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeModal();
  });

  itemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // gather
    let legalityObj = {};
    try { legalityObj = JSON.parse(f_legality.value || '{}'); } catch(err){ alert(t('msg.invalidJson')); return; }

    // sources: 「タイトル URL」形式の複数行から配列に変換
    const sourcesArr = f_sources.value.trim().split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.trim().split(/\s+/);
        const urlMatch = parts.find(p => p.startsWith('http://') || p.startsWith('https://'));
        if (urlMatch) {
          const title = parts.filter(p => p !== urlMatch).join(' ');
          return { title: title || urlMatch, url: urlMatch };
        }
        return { title: line.trim() };
      });

    let payload;
    try { payload = normalizeItem({
      id: editingId || uid('item'),
      name: f_name.value.trim() || t('msg.unnamed'),
      category: f_category.value,
      weight_g: Number(f_weight.value || 0),
      volume_cm3: Number(f_volume.value || 0),
      quantity: f_quantity.value.trim() === '' ? NaN : Number(f_quantity.value),
      recommended_quantity: f_recommended_quantity.value.trim() === '' ? NaN : Number(f_recommended_quantity.value),
      repack_frequency: f_repack_frequency.value || 'never',
      purpose_short: f_purpose.value || '',
      description: f_description.value || '',
      dual_use: !!f_dual.checked,
      hazard_flag: !!f_hazard.checked,
      legality_notes: legalityObj,
      sources: sourcesArr,
    }); } catch { alert(t('msg.invalidInput')); return; }
    if (editingId) {
      const original = state.items.find(x => x.id === editingId);
      if (!original) { alert(t('msg.storageConflict')); return; }
      // Normalization defaults must not overwrite metadata absent from the form.
      for (const field of ['checked','packed_by_default','category_tags']) delete payload[field];
      state.items = state.items.map(x => x.id === editingId ? LoadoutCore.editItem(original, payload, getLang()) : x);
    } else {
      state.items.push(payload);
    }
    markDirty();
    formDirty = false;
    renderAll();
    closeModal();
    const savedButton = [...itemTable.querySelectorAll('.editBtn')].find(button => button.dataset.id === payload.id);
    if (editingId) (savedButton || reviewFilter).focus();
  });

  addItemBtn.addEventListener('click', ()=> openItemModal('add'));
  itemForm.addEventListener('input', () => { formDirty = true; });

  // Bulk check/uncheck buttons
  const checkAllBtn = document.getElementById('checkAllBtn');
  const uncheckAllBtn = document.getElementById('uncheckAllBtn');

  checkAllBtn.addEventListener('click', () => {
    const hasUnchecked = state.items.some(it => !it.checked);
    if (hasUnchecked) {
      state.items.forEach(it => it.checked = true);
      markDirty();
      renderAll();
    }
  });

  uncheckAllBtn.addEventListener('click', () => {
    const hasChecked = state.items.some(it => it.checked);
    if (hasChecked) {
      state.items.forEach(it => it.checked = false);
      markDirty();
      renderAll();
    }
  });

  // Target weight input - update progress bar on change
  function validTargetWeight(value) {
    const weight = Number(value);
    return Number.isInteger(weight) && weight >= 100 && weight <= 1e9;
  }
  targetWeightInput.addEventListener('input', () => {
    renderTotals();
    updateWeightPresetButtons();
  });
  targetWeightInput.addEventListener('change', () => {
    if (!validTargetWeight(targetWeightInput.value)) {
      alert(t('msg.invalidTarget'));
      const saved = readPreference('ops_target_weight');
      targetWeightInput.value = validTargetWeight(saved) ? saved : 5000;
    } else if (!writePreference('ops_target_weight', targetWeightInput.value)) alert(t('msg.preference'));
    renderTotals();
    updateWeightPresetButtons();
  });

  // Weight preset buttons
  function updateWeightPresetButtons() {
    const currentWeight = Number(targetWeightInput.value);
    document.querySelectorAll('.weight-preset-btn').forEach(btn => {
      const btnWeight = parseInt(btn.dataset.weight);
      btn.classList.toggle('active', btnWeight === currentWeight);
    });
  }

  document.querySelectorAll('.weight-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const weight = btn.dataset.weight;
      targetWeightInput.value = weight;
      if (!writePreference('ops_target_weight', weight)) alert(t('msg.preference'));
      updateWeightPresetButtons();
      renderTotals();
    });
  });

  // Load saved target weight
  const savedTargetWeight = readPreference('ops_target_weight');
  if (validTargetWeight(savedTargetWeight)) {
    targetWeightInput.value = savedTargetWeight;
    updateWeightPresetButtons();
  }

  // Export functions
  function exportJSON() {
    const data = {
      checklistName: state.checklistName,
      createdAt: new Date().toISOString(),
      items: state.items
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const filename = `${state.checklistName.replace(/\s+/g,'_')}_${getTimestamp()}.json`;
    a.href = url; a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function itemsToCsv(items) {
    return LoadoutCore.csv(items, getLang());
  }

  function exportCSV() {
    const csv = itemsToCsv(state.items);
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const filename = `${state.checklistName.replace(/\s+/g,'_')}_${getTimestamp()}.csv`;
    a.href = url; a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ============================================================
  // Graph Modal (グラフ表示・SNS共有用画像生成)
  // ============================================================
  const graphModal = document.getElementById('graphModal');
  const graphCanvas = document.getElementById('graphCanvas');
  const graphCloseBtn = document.getElementById('graphCloseBtn');
  const graphDownloadBtn = document.getElementById('graphDownloadBtn');
  const graphCopyBtn = document.getElementById('graphCopyBtn');
  const graphBtn = document.getElementById('graphBtn');
  const graphTabs = graphModal.querySelectorAll('.graph-tab');
  let currentGraphView = 'pie';

  // Category colors for charts
  const categoryColors = {
    'サバイバル': '#10b981', 'Survival': '#10b981',
    '信号・通信': '#3b82f6', 'Signaling': '#3b82f6', 'Communications': '#3b82f6',
    '工具': '#f59e0b', 'Tools': '#f59e0b',
    'ナビゲーション': '#8b5cf6', 'Navigation': '#8b5cf6',
    '医療': '#ef4444', 'Medical': '#ef4444',
    'シェルター': '#06b6d4', 'Shelter': '#06b6d4',
    '寝具': '#6366f1', 'Sleep System': '#6366f1',
    '水・衛生': '#0ea5e9', 'Water & Hygiene': '#0ea5e9', 'Water & Cooking': '#0ea5e9',
    '調理': '#f97316', 'Cooking': '#f97316',
    '書類': '#84cc16', 'Documents': '#84cc16',
    'デジタル': '#a855f7', 'Digital Devices': '#a855f7',
    '修理・メンテナンス': '#64748b', 'Repair & Maintenance': '#64748b',
    '衛生・快適': '#14b8a6', 'Hygiene/Comfort': '#14b8a6',
    'その他': '#9ca3af', 'Other': '#9ca3af'
  };

  function getColorForCategory(cat) {
    return Object.hasOwn(categoryColors, cat) ? categoryColors[cat] : LoadoutCore.categoryColor(cat);
  }

  // Get checked items stats
  function getGraphStats() {
    const checkedItems = state.items.filter(it => it.checked && it.quantity > 0);
    const totals = LoadoutCore.totals(state.items);
    const totalWeight = totals.weight;
    const totalVolume = totals.volume;
    const totalQty = totals.quantity;

    const catBreakdown = Object.create(null);
    checkedItems.forEach(it => {
      const cat = getL(it, 'category') || 'Other';
      const weight = it.weight_g * it.quantity;
      catBreakdown[cat] = (catBreakdown[cat] || 0) + weight;
    });

    return { checkedItems, totalWeight, totalVolume, totalQty, catBreakdown };
  }

  // Draw common header and stats bar
  function drawGraphHeader(ctx, W, H, stats) {
    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(0.5, '#16213e');
    grad.addColorStop(1, '#0f3460');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Decorative circles
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.beginPath();
    ctx.arc(W - 80, 80, 150, 0, Math.PI * 2);
    ctx.fill();

    // Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.fillText('📦 OpsLoadout', 50, 55);

    ctx.font = '20px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    const checklistName = state.checklistName || (currentLang === 'ja' ? '無題' : 'Untitled');
    ctx.fillText(checklistName, 50, 90);

    // Stats bar (top right) - compact layout
    const statItems = [
      { icon: '📋', value: stats.totalQty, unit: currentLang === 'ja' ? '個' : 'pcs' },
      { icon: '⚖️', value: (stats.totalWeight / 1000).toFixed(2), unit: 'kg' },
      { icon: '📦', value: (stats.totalVolume / 1000).toFixed(1), unit: 'L' }
    ];

    ctx.font = '18px system-ui, sans-serif';
    let statX = W - 50;
    for (let i = statItems.length - 1; i >= 0; i--) {
      const s = statItems[i];
      const text = `${s.value} ${s.unit}`;
      const textWidth = ctx.measureText(text).width;
      const iconWidth = ctx.measureText(s.icon).width;

      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'right';
      ctx.fillText(text, statX, 55);
      statX -= textWidth + 10;
      ctx.fillText(s.icon, statX, 55);
      statX -= iconWidth + 30;
    }
    ctx.textAlign = 'left';

    // Footer
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui, sans-serif';
    const dateStr = new Date().toLocaleDateString(currentLang === 'ja' ? 'ja-JP' : 'en-US');
    ctx.fillText(`${t('pdf.generatedAt')} ${dateStr}  |  github.com/ipusiron/ops-loadout`, 50, H - 46);
  }

  // View 1: Pie Chart
  function drawPieView() {
    const ctx = graphCanvas.getContext('2d');
    const W = 1200, H = 675;
    const stats = getGraphStats();

    drawGraphHeader(ctx, W, H, stats);

    const catEntries = Object.entries(stats.catBreakdown).sort((a, b) => b[1] - a[1]);
    if (catEntries.length === 0 || stats.totalWeight === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '24px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t('graph.noWeight'), W / 2, H / 2);
      ctx.textAlign = 'left';
      return;
    }

    // Pie chart (center)
    const pieX = W / 2, pieY = 360, pieR = 180;
    let startAngle = -Math.PI / 2;

    catEntries.forEach(([cat, weight]) => {
      const sliceAngle = (weight / stats.totalWeight) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(pieX, pieY);
      ctx.arc(pieX, pieY, pieR, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = getColorForCategory(cat);
      ctx.fill();
      startAngle += sliceAngle;
    });

    // Donut hole
    ctx.beginPath();
    ctx.arc(pieX, pieY, pieR * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();

    // Center text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${(stats.totalWeight / 1000).toFixed(1)}`, pieX, pieY + 5);
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('kg', pieX, pieY + 35);
    ctx.textAlign = 'left';

    // Legend (left side)
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(currentLang === 'ja' ? 'カテゴリー別重量' : 'Weight by Category', 50, 140);

    let legendY = 170;
    ctx.font = '14px system-ui, sans-serif';
    catEntries.slice(0, 10).forEach(([cat, weight]) => {
      const percent = ((weight / stats.totalWeight) * 100).toFixed(1);

      ctx.fillStyle = getColorForCategory(cat);
      ctx.beginPath();
      ctx.arc(60, legendY, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#e2e8f0';
      const catName = cat.length > 12 ? cat.slice(0, 11) + '…' : cat;
      ctx.fillText(catName, 75, legendY + 5);

      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'right';
      ctx.fillText(`${percent}%`, 220, legendY + 5);
      ctx.textAlign = 'left';

      legendY += 32;
    });

    // Right side - weight breakdown
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(currentLang === 'ja' ? '重量詳細' : 'Weight Details', W - 220, 140);

    legendY = 170;
    ctx.font = '14px system-ui, sans-serif';
    catEntries.slice(0, 10).forEach(([cat, weight]) => {
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'right';
      ctx.fillText(`${(weight / 1000).toFixed(2)} kg`, W - 50, legendY + 5);
      ctx.textAlign = 'left';
      legendY += 32;
    });
  }

  // View 2: Radar Chart
  function drawRadarView() {
    const ctx = graphCanvas.getContext('2d');
    const W = 1200, H = 675;
    const stats = getGraphStats();

    drawGraphHeader(ctx, W, H, stats);

    // Define score categories for radar
    const scoreLabels = currentLang === 'ja'
      ? ['生存性（参考）', '信号性（参考）', '脱出支援（参考）', '隠匿性（参考）', '法規制の注意度']
      : ['Survival (sample)', 'Signaling (sample)', 'Exit support (sample)', 'Concealment (sample)', 'Regulatory caution'];

    // Calculate average scores from checked items
    const scoreKeys = ['survivability', 'signalability', 'exfiltration_support', 'concealability', 'legality_penalty'];
    const avgScores = scoreKeys.map(key => {
      const items = stats.checkedItems.filter(it => it.scores && it.scores[key] !== undefined);
      if (items.length === 0) return 0;
      const sum = items.reduce((acc, it) => acc + Number(it.scores[key] || 0), 0);
      return sum / items.length;
    });

    if (stats.checkedItems.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '24px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(currentLang === 'ja' ? 'チェックされたアイテムがありません' : 'No checked items', W / 2, H / 2);
      ctx.textAlign = 'left';
      return;
    }

    // Radar chart
    const centerX = W / 2, centerY = 380;
    const maxR = 200;
    const numAxes = 5;
    const angleStep = (Math.PI * 2) / numAxes;

    // Draw grid circles
    for (let r = 1; r <= 5; r++) {
      const radius = (r / 5) * maxR;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw axes
    for (let i = 0; i < numAxes; i++) {
      const angle = -Math.PI / 2 + i * angleStep;
      const x = centerX + Math.cos(angle) * maxR;
      const y = centerY + Math.sin(angle) * maxR;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Labels
      const labelR = maxR + 30;
      const lx = centerX + Math.cos(angle) * labelR;
      const ly = centerY + Math.sin(angle) * labelR;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(scoreLabels[i], lx, ly + 5);
    }

    // Draw data polygon
    ctx.beginPath();
    for (let i = 0; i < numAxes; i++) {
      const angle = -Math.PI / 2 + i * angleStep;
      const value = Math.min(avgScores[i], 5) / 5;
      const x = centerX + Math.cos(angle) * maxR * value;
      const y = centerY + Math.sin(angle) * maxR * value;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.fill();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw data points
    for (let i = 0; i < numAxes; i++) {
      const angle = -Math.PI / 2 + i * angleStep;
      const value = Math.min(avgScores[i], 5) / 5;
      const x = centerX + Math.cos(angle) * maxR * value;
      const y = centerY + Math.sin(angle) * maxR * value;

      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Score values (right side)
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText(currentLang === 'ja' ? 'スコア詳細' : 'Score Details', W - 220, 140);

    ctx.font = '14px system-ui, sans-serif';
    let scoreY = 170;
    scoreLabels.forEach((label, i) => {
      const score = avgScores[i].toFixed(1);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(label, W - 220, scoreY);
      ctx.fillStyle = '#3b82f6';
      ctx.textAlign = 'right';
      ctx.fillText(`${score} / 5`, W - 50, scoreY);
      ctx.textAlign = 'left';
      scoreY += 32;
    });

    // Legend (left side) - category breakdown
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(currentLang === 'ja' ? 'アイテム構成' : 'Item Composition', 50, 140);

    const catEntries = Object.entries(stats.catBreakdown).sort((a, b) => b[1] - a[1]);
    let legendY = 170;
    ctx.font = '13px system-ui, sans-serif';
    catEntries.slice(0, 8).forEach(([cat, weight]) => {
      ctx.fillStyle = getColorForCategory(cat);
      ctx.beginPath();
      ctx.arc(60, legendY, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#e2e8f0';
      const catName = cat.length > 14 ? cat.slice(0, 13) + '…' : cat;
      ctx.fillText(catName, 75, legendY + 4);
      legendY += 28;
    });
  }

  // View 3: Top Items List
  function drawItemsView() {
    const ctx = graphCanvas.getContext('2d');
    const W = 1200, H = 675;
    const stats = getGraphStats();

    drawGraphHeader(ctx, W, H, stats);

    if (stats.checkedItems.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '24px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(currentLang === 'ja' ? 'チェックされたアイテムがありません' : 'No checked items', W / 2, H / 2);
      ctx.textAlign = 'left';
      return;
    }

    // Sort items by weight
    const topItems = [...stats.checkedItems]
      .map(it => ({
        ...it,
        totalWeight: it.weight_g * it.quantity
      }))
      .sort((a, b) => b.totalWeight - a.totalWeight);

    // Title
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(currentLang === 'ja' ? '🎒 主要アイテム（重量順）' : '🎒 Top Items (by weight)', 50, 140);

    // Table header
    const tableY = 175;
    const cols = { rank: 60, name: 80, cat: 680, weight: 900, pct: 1050 };

    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('#', cols.rank, tableY);
    ctx.fillText(currentLang === 'ja' ? 'アイテム名' : 'Item Name', cols.name, tableY);
    ctx.fillText(currentLang === 'ja' ? 'カテゴリー' : 'Category', cols.cat, tableY);
    ctx.textAlign = 'right';
    ctx.fillText(currentLang === 'ja' ? '重量' : 'Weight', cols.weight, tableY);
    ctx.fillText('%', cols.pct, tableY);
    ctx.textAlign = 'left';

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.moveTo(50, tableY + 10);
    ctx.lineTo(W - 50, tableY + 10);
    ctx.stroke();

    // Items (max 15)
    ctx.font = '14px system-ui, sans-serif';
    const maxItems = Math.min(topItems.length, 15);
    const rowHeight = 30;

    topItems.slice(0, maxItems).forEach((it, i) => {
      const y = tableY + 35 + i * rowHeight;
      const name = getL(it, 'name');
      const cat = getL(it, 'category');
      const displayName = name.length > 45 ? name.slice(0, 43) + '…' : name;
      const displayCat = cat.length > 12 ? cat.slice(0, 11) + '…' : cat;
      const pct = stats.totalWeight > 0 ? ((it.totalWeight / stats.totalWeight) * 100).toFixed(1) : '0.0';

      // Rank
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`${i + 1}`, cols.rank, y);

      // Name
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(displayName, cols.name, y);

      // Category with color
      ctx.fillStyle = getColorForCategory(cat);
      ctx.beginPath();
      ctx.arc(cols.cat - 12, y - 4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(displayCat, cols.cat, y);

      // Weight
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'right';
      ctx.fillText(`${it.totalWeight} g`, cols.weight, y);

      // Percentage with bar
      ctx.fillStyle = '#64748b';
      ctx.fillText(`${pct}%`, cols.pct, y);

      // Mini bar
      const barWidth = (it.totalWeight / topItems[0].totalWeight) * 80;
      ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
      ctx.fillRect(cols.pct + 15, y - 10, barWidth, 14);

      ctx.textAlign = 'left';
    });

    // Show more indicator if needed
    if (topItems.length > maxItems) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(`+ ${topItems.length - maxItems} ${currentLang === 'ja' ? 'アイテム' : 'more items'}...`, cols.name, tableY + 35 + maxItems * rowHeight);
    }
  }

  // Main draw function
  function drawGraphImage() {
    switch (currentGraphView) {
      case 'pie': drawPieView(); break;
      case 'radar': drawRadarView(); break;
      case 'items': drawItemsView(); break;
      default: drawPieView();
    }
    const totals = LoadoutCore.totals(state.items);
    graphCanvas.setAttribute('role', 'img');
    graphCanvas.setAttribute('aria-label', t('graph.summary', {weight: totals.weight, volume: totals.volume, quantity: totals.quantity}));
    document.getElementById('graphData').textContent = graphCanvas.getAttribute('aria-label');
    const ctx = graphCanvas.getContext('2d');
    ctx.save();
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, graphCanvas.height - 30, graphCanvas.width, 30);
    ctx.fillStyle = '#334155';
    ctx.textAlign = 'center';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(t('graph.limitShort'), graphCanvas.width / 2, graphCanvas.height - 10);
    ctx.restore();
  }

  function openGraphModal() {
    openDialog(graphModal);
    currentGraphView = 'pie';
    graphTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.view === 'pie'));
    drawGraphImage();
  }

  function closeGraphModal() {
    closeDialog(graphModal);
  }

  // Tab switching
  graphTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      currentGraphView = tab.dataset.view;
      graphTabs.forEach(t => t.classList.toggle('active', t === tab));
      drawGraphImage();
    });
  });

  graphBtn.addEventListener('click', openGraphModal);
  graphCloseBtn.addEventListener('click', closeGraphModal);
  graphModal.addEventListener('click', (e) => {
    if (e.target === graphModal) closeGraphModal();
  });

  graphDownloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `${state.checklistName.replace(/\s+/g, '_')}_${getTimestamp()}.png`;
    link.href = graphCanvas.toDataURL('image/png');
    link.click();
  });

  graphCopyBtn.addEventListener('click', async () => {
    try {
      const blob = await new Promise(resolve => graphCanvas.toBlob(resolve, 'image/png'));
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      graphCopyBtn.textContent = currentLang === 'ja' ? '✓ コピー済み' : '✓ Copied';
      setTimeout(() => {
        graphCopyBtn.innerHTML = `<svg class="inline w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg><span>${currentLang === 'ja' ? 'コピー' : 'Copy'}</span>`;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert(currentLang === 'ja' ? 'コピーに失敗しました' : 'Failed to copy');
    }
  });

  async function exportPDF() {
    // Check if libraries are loaded
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert(t('msg.pdfLibNotLoaded'));
      return;
    }
    if (!window.html2canvas) {
      alert(t('msg.html2canvasNotLoaded'));
      return;
    }

    let pdfContainer;
    const exportName = state.checklistName;
    exportPdfBtn.disabled = true;
    try {
      // Create a temporary container for PDF content
      pdfContainer = document.createElement('div');
      pdfContainer.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 800px; background: white; padding: 40px; font-family: system-ui, -apple-system, sans-serif;';

      // Build HTML content
      let html = `
        <div style="margin-bottom: 20px;">
          <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">${escapeHtml(state.checklistName)}</h1>
          <p style="font-size: 12px; color: #666; margin-bottom: 20px;">${t('pdf.generatedAt')} ${new Date().toLocaleString(getLocale())}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #f3f4f6; border-bottom: 2px solid #d1d5db;">
              <th style="padding: 8px; text-align: center; border: 1px solid #e5e7eb; width: 40px;">✓</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">${t('th.category')}</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">${t('th.name')}</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #e5e7eb;">${t('th.weight')}</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #e5e7eb;">${t('th.quantity')}</th>
              <th style="padding: 8px; text-align: center; border: 1px solid #e5e7eb;">${t('th.tags')}</th>
            </tr>
          </thead>
          <tbody>
      `;

      state.items.forEach(it => {
        const badges = [];
        if (it.dual_use) badges.push(`<span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 3px; font-size: 9px;">${t('badge.dualUse')}</span>`);
        if (it.hazard_flag) badges.push(`<span style="background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 3px; font-size: 9px;">${t('badge.hazard')}</span>`);

        // Checkbox representation
        const checkbox = it.checked
          ? '<span style="font-size: 16px; color: #059669;">☑</span>'
          : '<span style="font-size: 16px; color: #d1d5db;">☐</span>';

        html += `
          <tr style="border-bottom: 1px solid #e5e7eb; ${it.checked ? 'background: #f0fdf4;' : ''}">
            <td style="padding: 6px; text-align: center; border: 1px solid #e5e7eb;">${checkbox}</td>
            <td style="padding: 6px; border: 1px solid #e5e7eb;">${escapeHtml(getL(it, 'category'))}</td>
            <td style="padding: 6px; border: 1px solid #e5e7eb;">${escapeHtml(getL(it, 'name'))}</td>
            <td style="padding: 6px; text-align: right; border: 1px solid #e5e7eb;">${it.weight_g || 0}</td>
            <td style="padding: 6px; text-align: right; border: 1px solid #e5e7eb;">${it.quantity ?? 1}</td>
            <td style="padding: 6px; text-align: center; border: 1px solid #e5e7eb;">${badges.join(' ')}</td>
          </tr>
        `;
      });

      html += `
          </tbody>
        </table>
        <div style="margin-top: 20px; padding: 10px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px;">
          <p style="font-size: 12px; margin: 0;"><strong>${t('pdf.totalWeight')}</strong> ${LoadoutCore.totals(state.items).weight} g</p>
          <p style="font-size: 12px; margin: 5px 0 0 0;"><strong>${t('pdf.totalVolume')}</strong> ${LoadoutCore.totals(state.items).volume} cm³</p>
          <p style="font-size: 12px;">${t('app.limit')}</p>
        </div>
      `;

      pdfContainer.innerHTML = html;
      document.body.appendChild(pdfContainer);

      // Capture HTML as canvas
      const canvas = await html2canvas(pdfContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Remove temporary container
      document.body.removeChild(pdfContainer);

      // Convert canvas to PDF
      const { jsPDF } = window.jspdf;
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const doc = new jsPDF({
        orientation: imgHeight > 297 ? 'portrait' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let position = 0;
      const pageHeight = 297; // A4 height in mm

      // If content is taller than one page, split into multiple pages
      if (imgHeight > pageHeight) {
        let heightLeft = imgHeight;
        while (heightLeft > 0) {
          doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
          position -= pageHeight;
          if (heightLeft > 0) {
            doc.addPage();
          }
        }
      } else {
        doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      }

      const filename = `${exportName.replace(/\s+/g, '_')}_${getTimestamp()}.pdf`;
      doc.save(filename);
    } catch (error) {
      alert(t('msg.pdfError'));
    } finally {
      pdfContainer?.remove();
      exportPdfBtn.disabled = false;
    }
  }

  // Exports with UI binding
  exportJsonBtn.addEventListener('click', exportJSON);
  exportCsvBtn.addEventListener('click', exportCSV);
  exportPdfBtn.addEventListener('click', exportPDF);

  // Save options modal functions
  function showSaveOptionsModal() {
    saveOptionsChecklistName.textContent = state.checklistName;
    openDialog(saveOptionsModal);
  }

  function closeSaveOptionsModal() {
    closeDialog(saveOptionsModal);
  }

  saveOverwriteBtn.addEventListener('click', () => {
    closeSaveOptionsModal();
    performSave(false); // false = overwrite
  });

  saveAsNewBtn.addEventListener('click', () => {
    closeSaveOptionsModal();
    performSave(true); // true = save as new
  });

  saveCancelBtn.addEventListener('click', () => {
    closeSaveOptionsModal();
  });

  saveOptionsModal.addEventListener('click', (e) => {
    if (e.target === saveOptionsModal) closeSaveOptionsModal();
  });

  // ============================================================
  // チェックリスト名編集モーダル (Name Edit Modal)
  // ============================================================
  let nameEditMode = 'save'; // 'save' = save after edit, 'rename' = just rename

  function showNameEditModal(mode = 'save') {
    nameEditMode = mode;
    nameEditInput.value = state.checklistName;
    openDialog(nameEditModal);
    nameEditInput.focus();
    nameEditInput.select();
  }

  function closeNameEditModal() {
    closeDialog(nameEditModal);
  }

  nameEditSaveBtn.addEventListener('click', () => {
    const newName = nameEditInput.value.trim();
    if (newName && newName !== state.checklistName) {
      state.checklistName = newName;
      markDirty();
      renderAll();
    }
    closeNameEditModal();

    if (nameEditMode === 'renameSaved') {
      if (saveCurrentChecklist()) showSaveConfirmation();
    } else if (nameEditMode === 'save') {
      // Continue to save flow
      if (currentChecklistId) {
        showSaveOptionsModal();
      } else {
        performSave(false);
      }
    }
  });

  nameEditCancelBtn.addEventListener('click', () => {
    closeNameEditModal();
  });

  nameEditModal.addEventListener('click', (e) => {
    if (e.target === nameEditModal) closeNameEditModal();
  });

  // Enter key to confirm
  nameEditInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      nameEditSaveBtn.click();
    } else if (e.key === 'Escape') {
      closeNameEditModal();
    }
  });

  // Rename button next to checklist name
  renameChecklistBtn.addEventListener('click', () => {
    showNameEditModal('rename');
  });

  // Save confirmation modal functions
  function showSaveConfirmation() {
    savedChecklistName.textContent = state.checklistName;
    savedDateTime.textContent = new Date().toLocaleString(getLocale(), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    openDialog(saveConfirmModal);
  }

  function closeSaveConfirmation() {
    closeDialog(saveConfirmModal);
  }

  saveConfirmOk.addEventListener('click', closeSaveConfirmation);
  saveConfirmModal.addEventListener('click', (e) => {
    if (e.target === saveConfirmModal) closeSaveConfirmation();
  });

  // Help modal functions
  function openHelpModal() {
    openDialog(helpModal);
  }

  function closeHelpModal() {
    closeDialog(helpModal);
  }

  helpBtn.addEventListener('click', openHelpModal);
  helpCloseBtn.addEventListener('click', closeHelpModal);
  helpOkBtn.addEventListener('click', closeHelpModal);
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) closeHelpModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && helpModal.classList.contains('active')) {
      closeHelpModal();
    }
  });

  // Perform save (overwrite or save as new)
  function performSave(saveAsNew) {
    if (saveCurrentChecklist(saveAsNew)) showSaveConfirmation();
  }

  // Save button
  saveBtn.addEventListener('click', ()=> {
    // First, show name edit modal to allow changing the name before saving
    showNameEditModal('save');
  });

  // New checklist button
  newChecklistBtn.addEventListener('click', ()=> {
    if (state.isDirty && !confirm(t('msg.discard'))) return;
    createNewChecklist();
  });

  // Preset loading
  presetSelectEl.addEventListener('change', async (e)=>{
    const value = e.target.value;
    if (!value || (state.isDirty && !confirm(t('msg.discard')))) {
      presetSelectEl.value = currentPresetKey;
      return;
    }
    // Check if it's a saved checklist
    if (value.startsWith('saved-')) {
      const selectedOption = presetSelectEl.options[presetSelectEl.selectedIndex];
      const checklistId = selectedOption.dataset.checklistId;
      loadChecklist(checklistId);
      // Show rename and delete buttons for saved checklists
    } else {
      await loadFromPreset(value);
      // Hide rename and delete buttons for built-in presets
    }
    renderPresetOptions(currentCategory);
  });

  // Delete saved checklist button
  deletePresetBtn.addEventListener('click', ()=> {
    const value = presetSelectEl.value;
    if (value.startsWith('saved-')) {
      const selectedOption = presetSelectEl.options[presetSelectEl.selectedIndex];
      const checklistId = selectedOption.dataset.checklistId;
      const checklist = getAllChecklists().find(c => c.id === checklistId);

      if (checklist && confirm(t('msg.confirmDeleteChecklist'))) {
        if (state.isDirty && !confirm(t('msg.discard'))) return;
        deleteChecklist(checklistId);
      }
    }
  });

  // Rename saved checklist button
  renamePresetBtn.addEventListener('click', ()=> {
    const value = presetSelectEl.value;
    if (value.startsWith('saved-')) {
      showNameEditModal('renameSaved');
    }
  });

  globalSearch.addEventListener('input', ()=> renderList());
  filterDual.addEventListener('change', ()=> renderList());
  filterHazard.addEventListener('change', ()=> renderList());
  reviewFilter.addEventListener('change', () => renderList());
  document.getElementById('resetFilters').addEventListener('click', () => {
    globalSearch.value = '';
    filterDual.checked = false;
    filterHazard.checked = false;
    reviewFilter.value = 'all';
    renderList();
  });

  function filterDescription() {
    const filters = [];
    if (globalSearch.value.trim()) filters.push(t('label.search') + '=' + globalSearch.value.trim());
    if (filterDual.checked) filters.push(t('filter.dualUseOnly'));
    if (filterHazard.checked) filters.push(t('filter.hazardOnly'));
    if (reviewFilter.value !== 'all') filters.push(t('review.label') + '=' + reviewFilter.selectedOptions[0].textContent);
    return filters.join('; ') || t('review.none');
  }

  // Category filter functionality
  let currentCategory = 'all';

  function renderPresetOptions(category = 'all') {
    // Build presetsByCategory dynamically from PRESETS_META
    const presetsByCategory = {
      evasion: [],
      edc: [],
      rescue: [],
      security: [],
      disaster: [],
      hacker: [],
      cyber_ninja: []
    };

    // Group presets by category from metadata
    Object.keys(PRESETS_META).forEach(key => {
      const cat = PRESETS_META[key].category;
      if (presetsByCategory[cat]) {
        presetsByCategory[cat].push(key);
      }
    });

    presetSelectEl.innerHTML = '';
    presetSelectEl.add(new Option(t('preset.current'), ''));

    // Add saved checklists at the top (always shown)
    const savedChecklists = getAllChecklists();
    if (savedChecklists.length > 0) {
      const savedOptgroup = document.createElement('optgroup');
      savedOptgroup.label = '💾 ' + t('optgroup.saved');

      savedChecklists.forEach(checklist => {
        const option = document.createElement('option');
        option.value = 'saved-' + checklist.id;
        option.textContent = checklist.name;
        option.dataset.checklistId = checklist.id;
        savedOptgroup.appendChild(option);
      });

      presetSelectEl.appendChild(savedOptgroup);
    }

    if (category === 'all') {
      // Show all with optgroups
      const categoryLabels = {
        evasion: '🏃 ' + t('optgroup.evasion'),
        edc: '🎒 ' + t('optgroup.edc'),
        rescue: '🚒 ' + t('optgroup.rescue'),
        security: '🛡️ ' + t('optgroup.security'),
        disaster: '⚠️ ' + t('optgroup.disaster'),
        hacker: '💻 ' + t('optgroup.hacker'),
        cyber_ninja: '✴️ ' + t('optgroup.cyber_ninja')
      };

      Object.keys(presetsByCategory).forEach(cat => {
        if (presetsByCategory[cat].length === 0) return; // Skip empty categories
        const optgroup = document.createElement('optgroup');
        optgroup.label = categoryLabels[cat];

        presetsByCategory[cat].forEach(presetKey => {
          const option = document.createElement('option');
          option.value = presetKey;
          option.textContent = getL(PRESETS_META[presetKey], 'name');
          optgroup.appendChild(option);
        });

        presetSelectEl.appendChild(optgroup);
      });
    } else {
      // Show only selected category
      const presetsToShow = presetsByCategory[category] || [];
      presetsToShow.forEach(presetKey => {
        const option = document.createElement('option');
        option.value = presetKey;
        option.textContent = getL(PRESETS_META[presetKey], 'name');
        presetSelectEl.appendChild(option);
      });
    }

    // Updating candidate labels never loads data or discards edits.
    if (currentPresetKey && ![...presetSelectEl.options].some(o => o.value === currentPresetKey)) {
      const option = new Option(state.checklistName, currentPresetKey);
      if (currentChecklistId) option.dataset.checklistId = currentChecklistId;
      presetSelectEl.add(option);
    }
    presetSelectEl.value = currentPresetKey;
    renamePresetBtn.classList.toggle('hidden', !currentChecklistId);
    deletePresetBtn.classList.toggle('hidden', !currentChecklistId);
  }

  // Category filter button event listeners
  document.querySelectorAll('.category-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.category;
      currentCategory = category;

      // Update active state
      document.querySelectorAll('.category-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Render filtered presets
      renderPresetOptions(category);
    });
  });

  // ============================================================
  // アプリケーション初期化 (Application Initialization)
  // ============================================================
  // presets/index.jsonからメタデータを読み込み、アプリケーションを初期化

  async function loadPresets() {
    const startingRequest = loadRequest;
    try {
      if (location.protocol === 'file:') {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'presets-bundle.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        PRESETS_META = window.LoadoutPresets.index.presets;
        PRESETS = window.LoadoutPresets.presets;
      } else {
        const response = await fetch('presets/index.json');
        if (!response.ok) throw new Error('presetLoadFailed');
        const indexData = await response.json();
        PRESETS_META = indexData.presets;
      }
      initApp(startingRequest === loadRequest);
    } catch (error) {
      alert(t('msg.presetLoadFailed'));
      // Fallback: empty preset for initialization
      PRESETS_META = {
        empty: {
          category: "edc",
          name_ja: t('msg.newChecklist'),
          name_en: "New Checklist",
          item_count: 0,
          file: ""
        }
      };
      PRESETS['empty'] = { name_ja: t('msg.newChecklist'), name_en: "New Checklist", items: [] };
      initApp(startingRequest === loadRequest);
    }
  }

  async function initApp(autoLoad = true) {
    // Render preset options first (using metadata)
    renderPresetOptions('all');
    if (!autoLoad) return;

    // Load default preset (embassy or first available)
    const defaultKey = PRESETS_META['embassy'] ? 'embassy' : Object.keys(PRESETS_META)[0];
    await loadFromPreset(defaultKey);
  }

  // ============================================================
  // 言語切り替えイベントリスナー (Language Change Event Listener)
  // ============================================================
  // i18n.jsからのlangchangeイベントを受け取り、動的コンテンツを再描画
  document.addEventListener('langchange', () => {
    renderAll();
    renderPresetOptions(currentCategory);
    renderImportPreview();
    setImportStatus(importStatusKey);
    if (graphModal.classList.contains('active')) drawGraphImage();
  });
  window.addEventListener('beforeunload', event => {
    if (!state.isDirty && !formDirty) return;
    event.preventDefault();
    event.returnValue = '';
  });

  // ============================================================
  // 印刷イベントリスナー (Print Event Listener)
  // ============================================================
  // 印刷前にヘッダーとサマリーを更新
  window.addEventListener('beforeprint', () => {
    finishPointerRender();
    const printTitle = document.getElementById('printTitle');
    const printDate = document.getElementById('printDate');
    const printSummary = document.getElementById('printSummary');

    if (printTitle) {
      printTitle.textContent = `OpsLoadout: ${state.checklistName}`;
    }
    if (printDate) {
      const now = new Date();
      const dateStr = now.toLocaleDateString(currentLang === 'ja' ? 'ja-JP' : 'en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      printDate.textContent = dateStr;
    }
    if (printSummary) {
      const checkedItems = state.items.filter(it => it.checked);
      const totals = LoadoutCore.totals(state.items);
      const totalWeight = totals.weight;
      const totalVolume = totals.volume;
      const summaryText = currentLang === 'ja'
        ? `リスト全体: ${state.items.length}アイテム | チェック済み: ${checkedItems.length}アイテム | 重量: ${totalWeight}g | 体積: ${totalVolume}cm³`
        : `Whole list: ${state.items.length} items | Checked: ${checkedItems.length} items | Weight: ${totalWeight}g | Volume: ${totalVolume}cm³`;
      printSummary.textContent = summaryText;
    }
    document.getElementById('printScope').textContent = t('review.printScope', {
      shown: filteredItems().length, total: state.items.length, filters: filterDescription()
    });
  });

  // アプリケーション起動
  loadPresets();

})();
