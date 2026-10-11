/* Pure checklist operations, shared by the browser and dependency-free tests. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LoadoutCore = api;
})(typeof globalThis === 'object' ? globalThis : this, function() {
  'use strict';
  const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const textFields = ['name', 'category', 'purpose_short', 'description', 'recommended_location_on_body'];

  function number(value, fallback = 0, max = 1e9, integer = false) {
    if (value === undefined || value === null) return fallback;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max || (integer && !Number.isInteger(value))) {
      throw new TypeError('invalidNumber');
    }
    return value;
  }

  function normalizeItem(item) {
    if (!object(item) || typeof item.id !== 'string' || !item.id || item.id.length > 256) throw new TypeError('invalidItem');
    const result = { ...item };
    for (const field of textFields) {
      for (const suffix of ['', '_ja', '_en']) {
        const key = field + suffix;
        if (result[key] !== undefined && (typeof result[key] !== 'string' || result[key].length > 20000)) throw new TypeError('invalidText');
      }
    }
    for (const key of ['checked', 'packed_by_default', 'dual_use', 'hazard_flag']) {
      if (item[key] !== undefined && typeof item[key] !== 'boolean') throw new TypeError('invalidFlag');
    }
    result.quantity = number(item.quantity, 1, 999, true);
    result.recommended_quantity = number(item.recommended_quantity, 1, 999, true);
    result.weight_g = number(item.weight_g);
    result.volume_cm3 = number(item.volume_cm3);
    result.checked = item.checked ?? item.packed_by_default ?? false;
    result.packed_by_default = item.packed_by_default ?? false;
    result.category_tags = item.category_tags ?? [];
    if (!Array.isArray(result.category_tags) || result.category_tags.some(x => typeof x !== 'string')) throw new TypeError('invalidTags');
    result.repack_frequency = item.repack_frequency ?? 'never';
    if (!['never', 'daily', 'weekly', 'monthly'].includes(result.repack_frequency)) throw new TypeError('invalidFrequency');
    for (const key of ['legality_notes', 'legality_notes_ja', 'legality_notes_en']) {
      if (item[key] !== undefined && (!object(item[key]) || Object.values(item[key]).some(x => typeof x !== 'string'))) throw new TypeError('invalidNotes');
    }
    result.sources = item.sources ?? [];
    if (!Array.isArray(result.sources) || result.sources.some(s => !object(s) || typeof s.title !== 'string' || (s.url !== undefined && typeof s.url !== 'string'))) throw new TypeError('invalidSources');
    if (item.concealability !== undefined && typeof item.concealability !== 'string' && typeof item.concealability !== 'number') throw new TypeError('invalidText');
    if (item.scores !== undefined && (!object(item.scores) || Object.values(item.scores).some(x => typeof x !== 'number' || !Number.isFinite(x) || x < 0 || x > 5))) throw new TypeError('invalidScores');
    return result;
  }

  function normalizeItems(items) {
    if (!Array.isArray(items) || items.length > 10000) throw new TypeError('invalidItems');
    const result = items.map(normalizeItem);
    if (new Set(result.map(x => x.id)).size !== result.length) throw new TypeError('duplicateItem');
    return result;
  }

  function normalizeChecklists(value) {
    if (!Array.isArray(value) || value.length > 1000) throw new TypeError('invalidChecklists');
    const result = value.map(list => {
      if (!object(list) || typeof list.id !== 'string' || !list.id || typeof list.name !== 'string' || list.name.length > 20000) throw new TypeError('invalidChecklist');
      return { ...list, items: normalizeItems(list.items) };
    });
    if (new Set(result.map(x => x.id)).size !== result.length) throw new TypeError('duplicateChecklist');
    return result;
  }

  function localized(item, field, lang) { return item[field + '_' + lang] ?? item[field] ?? ''; }

  // User edits replace the field in both languages; untouched translated fields remain intact.
  function editItem(original, draft, lang) {
    const result = { ...original, ...draft };
    for (const field of [...textFields, 'legality_notes']) {
      if (!Object.hasOwn(draft, field)) continue;
      if (JSON.stringify(draft[field]) === JSON.stringify(localized(original, field, lang))) {
        if (Object.hasOwn(original, field)) result[field] = original[field];
        else delete result[field];
      } else {
        delete result[field + '_ja'];
        delete result[field + '_en'];
      }
    }
    return normalizeItem(result);
  }

  function totals(items) {
    return items.reduce((sum, item) => {
      if (item.checked) {
        const qty = number(item.quantity, 1, 999, true);
        sum.weight += number(item.weight_g) * qty;
        sum.volume += number(item.volume_cm3) * qty;
        sum.quantity += qty;
        sum.rows++;
      }
      return sum;
    }, { weight: 0, volume: 0, quantity: 0, rows: 0 });
  }

  function safeUrl(value) {
    if (typeof value !== 'string' || /[\u0000-\u0020\u007f]/.test(value)) return '';
    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
    } catch { return ''; }
  }

  function categoryColor(category) {
    let hash = 2166136261;
    for (const c of String(category)) hash = Math.imul(hash ^ c.codePointAt(0), 16777619) >>> 0;
    return `hsl(${hash % 360}, 60%, 40%)`;
  }

  function csvCell(value) {
    let str = String(value ?? '');
    if (/^[\s\u0000-\u001f]*[=+\-@＝＋－＠]/u.test(str) || /^[\t\r\n]/.test(str)) str = "'" + str;
    return '"' + str.replace(/"/g, '""') + '"';
  }

  function csv(items, lang) {
    const header = ['id', 'name', 'category', 'weight_g', 'volume_cm3', 'purpose_short', 'dual_use', 'hazard_flag', 'legality_notes', 'quantity', 'recommended_quantity', 'checked'];
    const rows = normalizeItems(items).map(it => [it.id, localized(it, 'name', lang), localized(it, 'category', lang), it.weight_g, it.volume_cm3, localized(it, 'purpose_short', lang), it.dual_use ? 1 : 0, it.hazard_flag ? 1 : 0, JSON.stringify(localized(it, 'legality_notes', lang) || {}), it.quantity, it.recommended_quantity, it.checked ? 1 : 0]);
    return '\ufeff' + [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
  }
  return { number, normalizeItem, normalizeItems, normalizeChecklists, localized, editItem, totals, safeUrl, categoryColor, csvCell, csv };
});
