(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./loadout-core.js'));
  else root.LoadoutStore = factory(root.LoadoutCore);
})(typeof globalThis === 'object' ? globalThis : this, function(core) {
  'use strict';
  const key = 'ekc_checklists';
  function read(storage) {
    try {
      const raw = storage.getItem(key);
      return { ok: true, raw, lists: core.normalizeChecklists(raw === null ? [] : JSON.parse(raw)) };
    } catch { return { ok: false, error: 'readFailed' }; }
  }
  function write(storage, lists, expectedRaw) {
    try {
      const encoded = JSON.stringify(core.normalizeChecklists(lists));
      if (storage.getItem(key) !== expectedRaw) return { ok: false, error: 'conflict' };
      storage.setItem(key, encoded);
      return { ok: true };
    } catch { return { ok: false, error: 'writeFailed' }; }
  }
  return { read, write, key };
});
