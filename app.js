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
  // PRESETS定義 (18種類のビルトインプリセット)
  // ============================================================
  // 各プリセットは以下の構造を持つ:
  // - name: プリセット名
  // - category: カテゴリ (evasion, edc, rescue, security, disaster, hacker)
  // - items: アイテム配列
  //   - id: 一意識別子
  //   - name: アイテム名
  //   - category: アイテムカテゴリ
  //   - weight_g: 重量（グラム）
  //   - volume_cm3: 体積（立方センチメートル）
  //   - purpose_short: 用途説明
  //   - dual_use: 軍民両用フラグ
  //   - hazard_flag: 危険物フラグ
  //   - legality_notes: 法的注意事項（国別）
  //   - sources: 出典情報
  //   - scores: 各種スコア
  let PRESETS = {};

  // PRESETSは presets.json から動的に読み込まれます
  // fetch()でロード後、initApp()を呼び出してアプリケーションを初期化

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
    selectedItemId: null
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
    renderPresetOptions(currentCategory);
  }

  function loadChecklist(id) {
    const checklists = getAllChecklists();
    const checklist = checklists.find(c => c.id === id);
    if (checklist) {
      currentChecklistId = checklist.id;
      state.checklistName = checklist.name;
      state.items = JSON.parse(JSON.stringify(checklist.items)).map(normalizeItem);
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
    renderAll();
  }

  function loadFromPreset(key) {
    const p = PRESETS[key];
    if (!p) return;
    state.checklistName = getL(p, 'name');
    state.items = JSON.parse(JSON.stringify(p.items)).map(normalizeItem);
    currentChecklistId = null; // Treat as new checklist
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
  function renderAll() {
    currentChecklistName.textContent = state.checklistName;
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
        <div class="col-weight">${it.weight_g ?? 0}</div>
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
        if (it) { it.checked = e.target.checked; renderTotals(); }
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
    itemDetail.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <h4 class="font-semibold text-base">${escapeHtml(getL(it, 'name'))}</h4>
        <button id="closeDetail" class="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>
      <p class="text-sm text-gray-600 mb-3">${escapeHtml(getL(it, 'purpose_short'))}</p>
      <dl class="text-sm text-gray-700 space-y-2">
        <div><dt class="font-medium text-xs text-gray-500">${t('detail.category')}</dt><dd class="mt-0.5">${escapeHtml(getL(it, 'category'))}</dd></div>
        <div><dt class="font-medium text-xs text-gray-500">${t('detail.weight')}</dt><dd class="mt-0.5">${it.weight_g ?? 0} g</dd></div>
        <div><dt class="font-medium text-xs text-gray-500">${t('detail.volume')}</dt><dd class="mt-0.5">${it.volume_cm3 ?? 0} cm³</dd></div>
        <div><dt class="font-medium text-xs text-gray-500">${t('detail.quantity')}</dt><dd class="mt-0.5">${it.quantity ?? 1}</dd></div>
        <div><dt class="font-medium text-xs text-gray-500">${t('detail.recommendedQty')}</dt><dd class="mt-0.5">${it.recommended_quantity ?? 1}</dd></div>
        <div><dt class="font-medium text-xs text-gray-500">${t('detail.repackFreq')}</dt><dd class="mt-0.5">${repackLabels[it.repack_frequency] || it.repack_frequency || t('freq.never')}</dd></div>
        <div><dt class="font-medium text-xs text-gray-500">${t('detail.categoryTags')}</dt><dd class="mt-0.5">${(it.category_tags||[]).join(', ') || t('detail.none')}</dd></div>
        <div>
          <dt class="font-medium text-xs text-gray-500">${t('detail.concealDualHazard')}</dt>
          <dd class="mt-0.5">
            ${t('detail.concealability')}: ${it.concealability ?? t('detail.unknown')} <br/>
            ${t('detail.dualUse')}: ${it.dual_use ? t('yes') : t('no')} <br/>
            ${t('detail.hazard')}: ${it.hazard_flag ? t('yes') : t('no')}
          </dd>
        </div>
        <div><dt class="font-medium text-xs text-gray-500">${t('detail.legality')}</dt><dd class="mt-0.5"><pre class="text-xs bg-gray-50 p-2 rounded overflow-x-auto">${escapeHtml(legalityHtml)}</pre></dd></div>
        ${getL(it, 'description') ? `<div><dt class="font-medium text-xs text-gray-500">${t('detail.description')}</dt><dd class="mt-0.5 whitespace-pre-wrap text-sm">${escapeHtml(getL(it, 'description'))}</dd></div>` : ''}
        <div><dt class="font-medium text-xs text-gray-500">${t('detail.sources')}</dt><dd class="mt-0.5">${(it.sources||[]).map(s => {
          const safeUrl = sanitizeUrl(s.url);
          if (safeUrl) {
            return `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${escapeHtml(s.title)}</a>`;
          }
          return escapeHtml(s.title);
        }).join('<br/>')}</dd></div>
      </dl>
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
    closeModal();
    renderAll();
  });

  addItemBtn.addEventListener('click', ()=> openItemModal('add'));

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
    const presetsByCategory = {
      evasion: ['embassy', 'sere'],
      edc: ['urban'],
      rescue: ['firefighter', 'sar'],
      security: ['security_guard', 'locksmith'],
      disaster: ['disaster', 'prepper'],
      hacker: ['hacker', 'pentest', 'neteng', 'forensic', 'hwdev', 'sysadmin', 'datarecovery', 'rftech']
    };

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
        hacker: '💻 ' + t('optgroup.hacker')
      };

      Object.keys(presetsByCategory).forEach(cat => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = categoryLabels[cat];

        presetsByCategory[cat].forEach(presetKey => {
          const option = document.createElement('option');
          option.value = presetKey;
          option.textContent = getL(PRESETS[presetKey], 'name');
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
        option.textContent = getL(PRESETS[presetKey], 'name');
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
  // presets.jsonからPRESETSを読み込み、アプリケーションを初期化

  async function loadPresets() {
    try {
      const response = await fetch('presets.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      PRESETS = await response.json();
      initApp();
    } catch (error) {
      console.error('Failed to load presets:', error);
      // Fallback: empty preset for initialization
      PRESETS = {
        empty: {
          name: t('msg.newChecklist'),
          category: "edc",
          items: []
        }
      };
      initApp();
    }
  }

  function initApp() {
    const defaultPreset = PRESETS.embassy || Object.values(PRESETS)[0];
    state.checklistName = getL(defaultPreset, 'name');
    state.items = JSON.parse(JSON.stringify(defaultPreset.items)).map(normalizeItem);
    renderPresetOptions('all');
    presetSelectEl.value = Object.keys(PRESETS).find(k => PRESETS[k] === defaultPreset) || Object.keys(PRESETS)[0];
    renderAll();
  }

  // ============================================================
  // 言語切り替えイベントリスナー (Language Change Event Listener)
  // ============================================================
  // i18n.jsからのlangchangeイベントを受け取り、動的コンテンツを再描画
  document.addEventListener('langchange', () => {
    renderAll();
    renderPresetOptions(currentCategory);
  });

  // アプリケーション起動
  loadPresets();

})();
