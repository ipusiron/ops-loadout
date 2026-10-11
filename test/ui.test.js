const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const path = require('node:path');
const root = path.join(__dirname, '..');
test('file protocol bundle exactly matches canonical JSON', () => {
  execFileSync(process.execPath, [path.join(root, 'scripts/build-presets.cjs'), '--check']);
});
test('all preset metadata item counts match data', () => {
  const index = JSON.parse(fs.readFileSync(path.join(root, 'presets/index.json'), 'utf8'));
  let total = 0;
  for (const meta of Object.values(index.presets)) {
    const data = JSON.parse(fs.readFileSync(path.join(root, 'presets', meta.file), 'utf8'));
    assert.equal(meta.item_count, data.items.length, meta.file);
    total += data.items.length;
  }
  assert.equal(Object.keys(index.presets).length, 22);
  assert.equal(total, 334);
});
test('external scripts have SRI and runtime CSS is local', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /cdn\.tailwindcss/);
  for (const script of html.matchAll(/<script\b[^>]*src="https:[^>]*>/g)) {
    assert.match(script[0], /integrity="sha(?:384|512)-[A-Za-z0-9+/=]+"/);
    assert.match(script[0], /crossorigin="anonymous"/);
  }
  assert.doesNotMatch(html, /\son\w+=/);
  assert.match(html, /script-src 'self' https:\/\/cdnjs\.cloudflare\.com;/);
  assert.doesNotMatch(html, /unsafe-eval/);
});
