/* Preset category metadata and search, shared by HTTP and file-opening modes. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LoadoutCatalog = api;
})(typeof globalThis === 'object' ? globalThis : this, function() {
  'use strict';
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const label = value => typeof value === 'string' && value.length > 0 && value.length <= 20000;
  const key = value => /^[a-z][a-z0-9_]*$/.test(value) && !['constructor', 'prototype', '__proto__', 'all'].includes(value);
  function validate(index) {
    if (!object(index) || !object(index.categories) || !object(index.presets)) throw new TypeError('invalidCatalog');
    for (const [id, category] of Object.entries(index.categories)) {
      if (!key(id) || !object(category) || !label(category.ja) || !label(category.en)) throw new TypeError('invalidCategory');
    }
    for (const [id, preset] of Object.entries(index.presets)) {
      if (!key(id) || !object(preset) || typeof preset.category !== 'string' || !Object.hasOwn(index.categories, preset.category) ||
          !label(preset.name_ja) || !label(preset.name_en) ||
          !label(preset.description_ja) || !label(preset.description_en) ||
          !Number.isInteger(preset.item_count) || preset.item_count < 0 || preset.item_count > 10000 ||
          preset.file !== `${preset.category}/${id}.json`) throw new TypeError('invalidPresetMetadata');
    }
    return index;
  }
  function matches(meta, query) {
    const q = String(query).trim().toLowerCase();
    return !q || ['name', 'name_ja', 'name_en', 'description_ja', 'description_en']
      .some(field => typeof meta[field] === 'string' && meta[field].toLowerCase().includes(q));
  }
  function find(index, category, query) {
    return Object.entries(index.presets).filter(([, meta]) =>
      (category === 'all' || meta.category === category) && matches(meta, query));
  }
  return { validate, matches, find };
});
