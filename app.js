/**
 * app.js — OpsLoadout - 緊急脱出キットのチェックリストツール
 *
 * アーキテクチャ: Vanilla JavaScript (フレームワーク不使用)
 * スタイリング: Tailwind CSS (CDN)
 * データ保存: localStorage (ブラウザーローカル)
 *
 * 主要機能:
 * - 18種類のビルトインプリセット管理
 * - カスタムプリセット作成・編集・削除
 * - チェックリスト保存・読み込み（上書き/別名保存対応）
 * - アイテム追加・編集・削除
 * - PDF/CSV/JSONエクスポート
 * - カテゴリフィルタリング
 * - XSS対策・localStorage検証
 *
 * ファイル構成:
 * - Lines 7-360: PRESETS定義（18種類）
 * - Lines 361-419: DOM要素参照
 * - Lines 420-699: ユーティリティ関数
 * - Lines 700-906: レンダリング関数
 * - Lines 907-992: モーダル管理
 * - Lines 993-1086: エクスポート関数
 * - Lines 1087-1400: イベントリスナー
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
    return {
      ...it,
      quantity: it.quantity ?? 1,
      recommended_quantity: it.recommended_quantity ?? 1,
      packed_by_default: it.packed_by_default ?? (!!it.checked) ?? false,
      category_tags: it.category_tags ?? (it.category ? [it.category.toLowerCase().replace(/\s+/g, '-')] : []),
      repack_frequency: it.repack_frequency ?? 'never', // values: daily, weekly, monthly, never
      description: it.description ?? '' // 詳細メモ（Markdown可）
    };
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

  function getAllChecklists() {
    try {
      const data = localStorage.getItem('ekc_checklists');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to parse checklists from localStorage:', error);
      return [];
    }
  }

  function saveAllChecklists(checklists) {
    try {
      localStorage.setItem('ekc_checklists', JSON.stringify(checklists));
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        alert(t('msg.storageQuotaExceeded'));
      } else {
        console.error('Failed to save checklists to localStorage:', error);
        alert(t('msg.saveFailed'));
      }
    }
  }

  function saveCurrentChecklist() {
    const checklists = getAllChecklists();
    const payload = {
      id: currentChecklistId || uid('checklist'),
      name: state.checklistName,
      items: state.items,
      createdAt: currentChecklistId ? (checklists.find(c => c.id === currentChecklistId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!currentChecklistId) {
      currentChecklistId = payload.id;
      checklists.push(payload);
    } else {
      const index = checklists.findIndex(c => c.id === currentChecklistId);
      if (index !== -1) {
        checklists[index] = payload;
      } else {
        checklists.push(payload);
      }
    }

    saveAllChecklists(checklists);
    state.isDirty = false;
    updateDirtyIndicator();
    renderPresetOptions(currentCategory);
  }

  function loadChecklist(id) {
    const checklists = getAllChecklists();
    const checklist = checklists.find(c => c.id === id);
    if (checklist) {
      currentChecklistId = checklist.id;
      state.checklistName = checklist.name;
      state.items = JSON.parse(JSON.stringify(checklist.items)).map(normalizeItem);
      state.isDirty = false;
      renderAll();
    }
  }

  function deleteChecklist(id) {
    const checklists = getAllChecklists();
    const filtered = checklists.filter(c => c.id !== id);
    saveAllChecklists(filtered);
    if (currentChecklistId === id) {
      createNewChecklist();
    }
    renderPresetOptions(currentCategory);
  }

  function createNewChecklist() {
    currentChecklistId = null;
    state.checklistName = t('msg.newChecklist');
    state.items = [];
    state.isDirty = false;
    renderAll();
  }

  /**
   * プリセットを読み込む（遅延ロード対応）
   * @param {string} key - プリセットキー
   */
  async function loadFromPreset(key) {
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
      PRESETS[key] = presetData;  // Cache it
      applyPreset(key, presetData);
    } catch (error) {
      console.error('Failed to load preset:', key, error);
      alert(t('msg.presetLoadFailed') || 'Failed to load preset');
    }
  }

  /**
   * プリセットデータを適用
   */
  function applyPreset(key, presetData) {
    state.checklistName = getL(presetData, 'name');
    state.items = JSON.parse(JSON.stringify(presetData.items)).map(normalizeItem);
    currentChecklistId = null; // Treat as new checklist
    state.isDirty = false;
    renderAll();
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
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim().toLowerCase();
    if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('vbscript:')) {
      console.warn('Blocked potentially dangerous URL:', url);
      return '';
    }
    return url;
  }

  // Render functions
  /**
   * 未保存変更をマーク
   */
  function markDirty() {
    if (!state.isDirty) {
      state.isDirty = true;
      updateDirtyIndicator();
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

  function renderAll() {
    currentChecklistName.textContent = state.checklistName;
    updateDirtyIndicator();
    renderList();
    renderDetail(state.selectedItemId);
    renderTotals();
  }

  function filteredItems() {
    const q = globalSearch.value.trim().toLowerCase();
    return state.items.filter(it=>{
      if (filterDual.checked && !it.dual_use) return false;
      if (filterHazard.checked && !it.hazard_flag) return false;
      if (!q) return true;
      const name = getL(it, 'name').toLowerCase();
      const purpose = getL(it, 'purpose_short').toLowerCase();
      return name.includes(q) || purpose.includes(q);
    });
  }

  function renderList() {
    const list = filteredItems();
    const totalItems = state.items.length;
    const itemCountDisplay = document.getElementById('itemCountDisplay');

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

    itemTable.className = 'item-table';
    itemTable.innerHTML = '';

    if (list.length === 0) {
      itemTable.innerHTML = `<div class="text-center py-8">
        <svg class="mx-auto h-12 w-12 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p class="text-sm text-gray-500">${totalItems === 0 ? t('msg.noItems') : t('msg.noMatchingItems')}</p>
      </div>`;
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
      <div class="text-right">${t('th.actions')}</div>
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
          <input type="checkbox" data-id="${it.id}" ${it.checked ? 'checked' : ''} class="item-check cursor-pointer focus:ring-2 focus:ring-blue-500"/>
        </div>
        <div class="col-name">${escapeHtml(getL(it, 'name'))}</div>
        <div class="col-category">${escapeHtml(getL(it, 'category'))}</div>
        <div class="col-weight"><span class="weight-badge weight-${getWeightClass(it.weight_g || 0)}">${it.weight_g ?? 0}</span></div>
        <div class="col-qty">
          <input type="number" min="0" max="999" value="${it.quantity ?? 1}" data-id="${it.id}"
            class="qty-input w-full px-1 py-0.5 text-xs border rounded focus:ring-1 focus:ring-blue-500" />
        </div>
        <div class="col-badge">${badges.join('')}</div>
        <div class="col-actions">
          <button data-id="${it.id}" class="detailBtn action-btn-icon" title="詳細">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button data-id="${it.id}" class="editBtn action-btn-icon" title="編集">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button data-id="${it.id}" class="delBtn action-btn-icon danger" title="削除">
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
        if (it) { it.checked = e.target.checked; markDirty(); renderTotals(); }
      });
    });
    itemTable.querySelectorAll('.qty-input').forEach(input=>{
      input.addEventListener('change', e=>{
        const id = e.target.dataset.id;
        const it = state.items.find(x=>x.id===id);
        if (it) {
          const newQty = Math.max(0, parseInt(e.target.value) || 1);
          it.quantity = newQty;
          e.target.value = newQty;
          markDirty();
          renderTotals();
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
        <button id="closeDetail" class="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">×</button>
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
            <div class="flex"><dt class="w-24 flex-shrink-0 text-xs text-gray-500">${t('detail.repackFreq')}</dt><dd>${repackLabels[it.repack_frequency] || it.repack_frequency || t('freq.never')}</dd></div>
            <div class="flex"><dt class="w-24 flex-shrink-0 text-xs text-gray-500">${t('detail.categoryTags')}</dt><dd>${(it.category_tags||[]).join(', ') || t('detail.none')}</dd></div>
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
            <div class="flex"><dt class="w-24 flex-shrink-0 text-xs text-gray-500">${t('detail.concealability')}</dt><dd>${it.concealability ?? t('detail.unknown')}</dd></div>
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
      header.addEventListener('click', () => {
        const section = header.closest('.detail-section');
        const content = section.querySelector('.detail-section-content');
        const toggle = section.querySelector('.detail-section-toggle');
        content.classList.toggle('collapsed');
        toggle.classList.toggle('collapsed');
      });
    });
  }

  function renderTotals() {
    const totals = state.items.reduce((acc, it) => {
      if (it.checked) {
        const qty = Number(it.quantity) || 1;
        acc.weight += Number(it.weight_g || 0) * qty;
        acc.volume += Number(it.volume_cm3 || 0) * qty;
      }
      return acc;
    }, {weight:0, volume:0});
    totalWeightEl.textContent = totals.weight;
    totalVolumeEl.textContent = totals.volume;

    // Update weight progress bar
    const targetWeight = parseInt(targetWeightInput.value) || 5000;
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
    modalBackdrop.classList.add('active');
    if (mode === 'edit' && item) {
      modalTitle.textContent = t('modal.editItem');
      editingId = item.id;
      f_name.value = getL(item, 'name') || '';
      f_category.value = getL(item, 'category') || 'サバイバル';
      f_weight.value = item.weight_g || 0;
      f_volume.value = item.volume_cm3 || 0;
      f_quantity.value = item.quantity || 1;
      f_recommended_quantity.value = item.recommended_quantity || 1;
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
      f_legality.value = '{"US":"許可"}';
      f_description.value = '';
      f_sources.value = '';
    }
  }

  function closeModal() {
    modalBackdrop.classList.remove('active');
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

    const payload = normalizeItem({
      id: editingId || uid('item'),
      name: f_name.value.trim() || t('msg.unnamed'),
      category: f_category.value,
      weight_g: Number(f_weight.value || 0),
      volume_cm3: Number(f_volume.value || 0),
      quantity: Number(f_quantity.value || 1),
      recommended_quantity: Number(f_recommended_quantity.value || 1),
      repack_frequency: f_repack_frequency.value || 'never',
      purpose_short: f_purpose.value || '',
      description: f_description.value || '',
      dual_use: !!f_dual.checked,
      hazard_flag: !!f_hazard.checked,
      legality_notes: legalityObj,
      sources: sourcesArr,
      scores: {survivability:1,signalability:0,exfiltration_support:0,concealability:2,legality_penalty: (f_dual.checked?1:0)}
    });
    if (editingId) {
      state.items = state.items.map(x => x.id === editingId ? Object.assign({}, x, payload) : x);
    } else {
      state.items.push(payload);
    }
    markDirty();
    closeModal();
    renderAll();
  });

  addItemBtn.addEventListener('click', ()=> openItemModal('add'));

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
  targetWeightInput.addEventListener('input', () => {
    renderTotals();
    // Save target weight to localStorage
    localStorage.setItem('ops_target_weight', targetWeightInput.value);
    // Update active button
    updateWeightPresetButtons();
  });

  // Weight preset buttons
  function updateWeightPresetButtons() {
    const currentWeight = parseInt(targetWeightInput.value) || 5000;
    document.querySelectorAll('.weight-preset-btn').forEach(btn => {
      const btnWeight = parseInt(btn.dataset.weight);
      btn.classList.toggle('active', btnWeight === currentWeight);
    });
  }

  document.querySelectorAll('.weight-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const weight = btn.dataset.weight;
      targetWeightInput.value = weight;
      localStorage.setItem('ops_target_weight', weight);
      updateWeightPresetButtons();
      renderTotals();
    });
  });

  // Load saved target weight
  const savedTargetWeight = localStorage.getItem('ops_target_weight');
  if (savedTargetWeight) {
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
    const header = ['id','name','category','weight_g','volume_cm3','purpose_short','dual_use','hazard_flag','legality_notes'];
    const rows = items.map(it => {
      const legalityObj = getL(it, 'legality_notes') || it.legality_notes || {};
      const leg = JSON.stringify(legalityObj);
      return [it.id, getL(it, 'name'), getL(it, 'category'), it.weight_g||0, it.volume_cm3||0, getL(it, 'purpose_short'), it.dual_use?1:0, it.hazard_flag?1:0, `"${leg.replace(/"/g,'""')}"`];
    });
    return [header, ...rows].map(r => r.join(',')).join('\n');
  }

  function exportCSV() {
    const csv = itemsToCsv(state.items);
    const blob = new Blob([csv], {type: 'text/csv'});
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
    return categoryColors[cat] || '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
  }

  // Get checked items stats
  function getGraphStats() {
    const checkedItems = state.items.filter(it => it.checked);
    const totalWeight = checkedItems.reduce((acc, it) => acc + (Number(it.weight_g || 0) * (Number(it.quantity) || 1)), 0);
    const totalVolume = checkedItems.reduce((acc, it) => acc + (Number(it.volume_cm3 || 0) * (Number(it.quantity) || 1)), 0);
    const totalQty = checkedItems.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);

    const catBreakdown = {};
    checkedItems.forEach(it => {
      const cat = getL(it, 'category') || 'Other';
      const weight = (Number(it.weight_g || 0) * (Number(it.quantity) || 1));
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
    ctx.fillStyle = '#475569';
    ctx.font = '12px system-ui, sans-serif';
    const dateStr = new Date().toLocaleDateString(currentLang === 'ja' ? 'ja-JP' : 'en-US');
    ctx.fillText(`Generated: ${dateStr}  |  github.com/ipusiron/ops-loadout`, 50, H - 25);
  }

  // View 1: Pie Chart
  function drawPieView() {
    const ctx = graphCanvas.getContext('2d');
    const W = 1200, H = 675;
    const stats = getGraphStats();

    drawGraphHeader(ctx, W, H, stats);

    const catEntries = Object.entries(stats.catBreakdown).sort((a, b) => b[1] - a[1]);
    if (catEntries.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '24px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(currentLang === 'ja' ? 'チェックされたアイテムがありません' : 'No checked items', W / 2, H / 2);
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
      ? ['生存性', '信号性', '脱出支援', '隠匿性', '合法性']
      : ['Survivability', 'Signalability', 'Exfiltration', 'Concealability', 'Legality'];

    // Calculate average scores from checked items
    const scoreKeys = ['survivability', 'signalability', 'exfiltration_support', 'concealability', 'legality_penalty'];
    const avgScores = scoreKeys.map(key => {
      const items = stats.checkedItems.filter(it => it.scores && it.scores[key] !== undefined);
      if (items.length === 0) return 0;
      const sum = items.reduce((acc, it) => acc + Number(it.scores[key] || 0), 0);
      // For legality_penalty, invert (lower is better)
      if (key === 'legality_penalty') {
        return 5 - (sum / items.length);
      }
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
        totalWeight: (Number(it.weight_g || 0) * (Number(it.quantity) || 1))
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
      const pct = ((it.totalWeight / stats.totalWeight) * 100).toFixed(1);

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
  }

  function openGraphModal() {
    graphModal.classList.add('active');
    currentGraphView = 'pie';
    graphTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.view === 'pie'));
    drawGraphImage();
  }

  function closeGraphModal() {
    graphModal.classList.remove('active');
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

    try {
      // Create a temporary container for PDF content
      const pdfContainer = document.createElement('div');
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
            <td style="padding: 6px; text-align: right; border: 1px solid #e5e7eb;">${it.quantity || 1}</td>
            <td style="padding: 6px; text-align: center; border: 1px solid #e5e7eb;">${badges.join(' ')}</td>
          </tr>
        `;
      });

      html += `
          </tbody>
        </table>
        <div style="margin-top: 20px; padding: 10px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px;">
          <p style="font-size: 12px; margin: 0;"><strong>${t('pdf.totalWeight')}</strong> ${state.items.reduce((acc, it) => acc + (it.checked ? (Number(it.weight_g || 0) * Number(it.quantity || 1)) : 0), 0)} g</p>
          <p style="font-size: 12px; margin: 5px 0 0 0;"><strong>${t('pdf.totalVolume')}</strong> ${state.items.reduce((acc, it) => acc + (it.checked ? (Number(it.volume_cm3 || 0) * Number(it.quantity || 1)) : 0), 0)} cm³</p>
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

      const filename = `${state.checklistName.replace(/\s+/g, '_')}_${getTimestamp()}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert(t('msg.pdfError') + error.message);
    }
  }

  // Exports with UI binding
  exportJsonBtn.addEventListener('click', exportJSON);
  exportCsvBtn.addEventListener('click', exportCSV);
  exportPdfBtn.addEventListener('click', exportPDF);

  // Save options modal functions
  function showSaveOptionsModal() {
    saveOptionsChecklistName.textContent = state.checklistName;
    saveOptionsModal.classList.add('active');
  }

  function closeSaveOptionsModal() {
    saveOptionsModal.classList.remove('active');
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
    nameEditModal.classList.add('active');
    nameEditInput.focus();
    nameEditInput.select();
  }

  function closeNameEditModal() {
    nameEditModal.classList.remove('active');
  }

  nameEditSaveBtn.addEventListener('click', () => {
    const newName = nameEditInput.value.trim();
    if (newName) {
      state.checklistName = newName;
      renderAll();
    }
    closeNameEditModal();

    if (nameEditMode === 'save') {
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
    saveConfirmModal.classList.add('active');
  }

  function closeSaveConfirmation() {
    saveConfirmModal.classList.remove('active');
  }

  saveConfirmOk.addEventListener('click', closeSaveConfirmation);
  saveConfirmModal.addEventListener('click', (e) => {
    if (e.target === saveConfirmModal) closeSaveConfirmation();
  });

  // Help modal functions
  function openHelpModal() {
    helpModal.classList.add('active');
  }

  function closeHelpModal() {
    helpModal.classList.remove('active');
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
    if (saveAsNew) {
      // Save as new: clear currentChecklistId so it creates a new one
      currentChecklistId = null;
    }

    saveCurrentChecklist();
    showSaveConfirmation();
  }

  // Save button
  saveBtn.addEventListener('click', ()=> {
    // First, show name edit modal to allow changing the name before saving
    showNameEditModal('save');
  });

  // New checklist button
  newChecklistBtn.addEventListener('click', ()=> {
    createNewChecklist();
  });

  // Preset loading
  presetSelectEl.addEventListener('change', (e)=>{
    const value = e.target.value;
    // Check if it's a saved checklist
    if (value.startsWith('saved-')) {
      const selectedOption = presetSelectEl.options[presetSelectEl.selectedIndex];
      const checklistId = selectedOption.dataset.checklistId;
      loadChecklist(checklistId);
      // Show rename and delete buttons for saved checklists
      renamePresetBtn.classList.remove('hidden');
      deletePresetBtn.classList.remove('hidden');
    } else {
      loadFromPreset(value);
      // Hide rename and delete buttons for built-in presets
      renamePresetBtn.classList.add('hidden');
      deletePresetBtn.classList.add('hidden');
    }
  });

  // Delete saved checklist button
  deletePresetBtn.addEventListener('click', ()=> {
    const value = presetSelectEl.value;
    if (value.startsWith('saved-')) {
      const selectedOption = presetSelectEl.options[presetSelectEl.selectedIndex];
      const checklistId = selectedOption.dataset.checklistId;
      const checklist = getAllChecklists().find(c => c.id === checklistId);

      if (checklist && confirm(t('msg.confirmDeleteChecklist'))) {
        deleteChecklist(checklistId);
        deletePresetBtn.classList.add('hidden');
        renamePresetBtn.classList.add('hidden');
        renderPresetOptions(currentCategory);
      }
    }
  });

  // Rename saved checklist button
  renamePresetBtn.addEventListener('click', ()=> {
    const value = presetSelectEl.value;
    if (value.startsWith('saved-')) {
      showNameEditModal('rename');
    }
  });

  globalSearch.addEventListener('input', ()=> renderList());
  filterDual.addEventListener('change', ()=> renderList());
  filterHazard.addEventListener('change', ()=> renderList());

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
      hacker: []
    };

    // Group presets by category from metadata
    Object.keys(PRESETS_META).forEach(key => {
      const cat = PRESETS_META[key].category;
      if (presetsByCategory[cat]) {
        presetsByCategory[cat].push(key);
      }
    });

    presetSelectEl.innerHTML = '';

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
        cyber_ninja: '🥷 ' + t('optgroup.cyber_ninja')
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

    // Auto-load the first preset in the filtered list
    if (presetSelectEl.options.length > 0) {
      const firstPresetKey = presetSelectEl.options[0].value;
      presetSelectEl.value = firstPresetKey;
      // Check if it's a saved checklist
      if (firstPresetKey.startsWith('saved-')) {
        const checklistId = presetSelectEl.options[0].dataset.checklistId;
        loadChecklist(checklistId);
        renamePresetBtn.classList.remove('hidden');
        deletePresetBtn.classList.remove('hidden');
      } else {
        loadFromPreset(firstPresetKey);
        renamePresetBtn.classList.add('hidden');
        deletePresetBtn.classList.add('hidden');
      }
    }
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
    try {
      const response = await fetch('presets/index.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const indexData = await response.json();
      PRESETS_META = indexData.presets;
      initApp();
    } catch (error) {
      console.error('Failed to load preset index:', error);
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
      initApp();
    }
  }

  async function initApp() {
    // Render preset options first (using metadata)
    renderPresetOptions('all');

    // Load default preset (embassy or first available)
    const defaultKey = PRESETS_META['embassy'] ? 'embassy' : Object.keys(PRESETS_META)[0];
    await loadFromPreset(defaultKey);
    presetSelectEl.value = defaultKey;
  }

  // ============================================================
  // 言語切り替えイベントリスナー (Language Change Event Listener)
  // ============================================================
  // i18n.jsからのlangchangeイベントを受け取り、動的コンテンツを再描画
  document.addEventListener('langchange', () => {
    renderAll();
    renderPresetOptions(currentCategory);
  });

  // ============================================================
  // 印刷イベントリスナー (Print Event Listener)
  // ============================================================
  // 印刷前にヘッダーとサマリーを更新
  window.addEventListener('beforeprint', () => {
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
      const totalWeight = checkedItems.reduce((acc, it) => acc + (Number(it.weight_g || 0) * (Number(it.quantity) || 1)), 0);
      const totalVolume = checkedItems.reduce((acc, it) => acc + (Number(it.volume_cm3 || 0) * (Number(it.quantity) || 1)), 0);
      const summaryText = currentLang === 'ja'
        ? `合計: ${state.items.length}アイテム | チェック済み: ${checkedItems.length}アイテム | 重量: ${totalWeight}g | 体積: ${totalVolume}cm³`
        : `Total: ${state.items.length} items | Checked: ${checkedItems.length} items | Weight: ${totalWeight}g | Volume: ${totalVolume}cm³`;
      printSummary.textContent = summaryText;
    }
  });

  // アプリケーション起動
  loadPresets();

})();
