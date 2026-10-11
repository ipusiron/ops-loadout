# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpsLoadout is a browser-based packing checklist tool for planning examples across SERE, embassy, organizational, disaster-preparedness, everyday-carry, travel, and event scenarios. It includes 9 categories and 28 presets with 398 item entries. It supports defensive education and lawful preparation, but does not determine whether equipment is safe, sufficient, or legal.

Expanded Packing Features:
- Quantity Management: Track current and recommended quantities as integers from 0 to 999; preserve zero
- Repack Frequency: Record daily, weekly, monthly, or never; no reminder scheduler
- Category Tags: Flexible tagging system for multi-dimensional categorization
- Inline Editing: Quick quantity adjustments directly in the table view
- Smart Totals: Automatic weight/volume calculation based on checked items × quantity

Preset source titles refer to materials such as the following. A source title alone does not establish that an item, weight, rating, or legal note was independently verified:
- US Air Force SERE Handbook (AFH 10-644)
- US State Department embassy evacuation guidance
- CIA Museum Escape & Evasion kit documentation
- MARSOC SERE gear lists
- Ready.gov emergency preparedness resources
- Japanese disaster preparedness guidelines (内閣府防災情報)

Design Principles:
- Source transparency: all 398 bundled entries include source titles; 391 have no URL-bearing source. Do not invent URLs or label all data as verified.
- Educational use: support checklist preparation and equipment review, not certification or operational instructions.
- Legal caution: `dual_use` and `hazard_flag` provide prompts for review. Absence of a flag does not imply unrestricted use.
- Numeric limits: weights and volumes are estimates. Radar values are unvalidated sample ratings, not survival, readiness, or legality measurements.
- Illustrative data: the six commuting/work/travel/event presets contain 64 entries with explicitly illustrative weights and volumes. They are not measurements or packing standards. Keep their warnings, adjustable quantities, absent scores, and title-only example sources; do not invent verification or source URLs.
- Data validation: fill documented missing-field defaults and reject invalid shapes, ranges, and duplicate IDs.

Critical Security Policy: keep the tool focused on defensive and lawful uses. Do not add instructions for misuse or imply that historical references authorize possession, transport, or use. Preserve the safety and legal limitations in both languages and in exported output.

## Architecture

This is a vanilla JavaScript single-page application. The application requires no bundler; a dependency-free script generates the preset bundle for direct file opening:

- index.html: Main UI structure, local styles, CSP meta policy, and pinned PDF scripts
- app.js: Core application logic with lazy-loaded presets (vanilla JS, no frameworks)
- loadout-core.js: DOM-independent validation, JSON restoration, review conditions, ID-based comparison, localization-aware edits, totals, URLs, colors, and CSV
- loadout-catalog.js: Catalog validation and bilingual name/purpose search
- comparison-view.js: Read-only, text-based comparison rendering with 50-row pagination
- loadout-store.js: Validated checklist reads and writes with conflict checks
- i18n.js: Internationalization module (Japanese/English)
- css/: Modular CSS files (main.css as entry point)
- presets/: JSON preset files with lazy loading (index.json for metadata)
- presets-bundle.js: Generated JSON-equivalent data for `file://`; do not edit directly
- scripts/build-presets.cjs: Regenerates the bundle or verifies it with `--check`

### State Management
The application uses a single in-memory state object:
```javascript
{
  checklistName: string,
  items: Array<Item>,
  selectedItemId: string|null,
  isDirty: boolean
}
```

State persists to `localStorage` with keys:
- `ekc_checklists`: Saved checklists, also available in the preset selector
- `ops_lang`: Language preference (`ja` or `en`)
- `ops_target_weight`: Target weight in grams

The selected saved ID, loaded snapshot, preset key, pending-load sequence, and item-form dirty flag are tracked separately. They are not an audit log. Failed saves must preserve edits and must not display a success confirmation. Snapshot and raw-value comparisons detect some concurrent updates, but are not an atomic multi-tab transaction.

### Data Model
Each item in the checklist follows this schema:
```javascript
{
  id: string,
  name: string,
  category: string,  // Survival/Signalling/Tools/Evasion/Medical/etc
  weight_g: number,
  volume_cm3: number,

  // Packing fields, normalized when absent
  quantity: number,                    // Integer 0..999 (default: 1)
  recommended_quantity: number,        // Integer 0..999 (default: 1)
  checked: boolean,                    // Explicit value, then packed_by_default, then false
  packed_by_default: boolean,          // Auto-pack this item (default: false)
  category_tags: string[],             // Flexible tags (default: [])
  repack_frequency: string,            // 'daily'|'weekly'|'monthly'|'never' (default: 'never')

  purpose_short: string,
  hazard_flag: boolean,                // Regulatory restrictions (batteries, alcohol, etc)
  dual_use: boolean,                   // Civilian/military dual-use items (requires legal warnings)
  legality_notes: {[country]: string},
  concealability: string | number,     // Text or a finite numeric value
  recommended_location_on_body: string,
  sources: [{title: string, url?: string}],
  scores: {
    survivability: number,
    signalability: number,
    exfiltration_support: number,
    concealability: number,
    legality_penalty: number
  }
}
```

`LoadoutCore.normalizeItem()` supplies defaults for missing values while preserving explicit zero and false values. Weights and volumes must be finite numbers in 0..1,000,000,000; score values, when present, must be finite numbers in 0..5. Both generic and `_ja`/`_en` text fields are supported. When a user changes a visible translated field, that field becomes a shared value in both languages; untouched translations and metadata remain intact.

### Key Functions

The app.js file is organized into these main sections:
- PRESETS loading: Lazy-loaded from `presets/` folder (index.json for metadata, individual JSON files for data)
- DOM element references: Cached for performance
- Utility functions: Item normalization, escapeHtml, localStorage helpers
- Rendering functions: Table, detail panel, totals, graph views
- Modal management: Add/edit items, save options, graph display
- Export functions: PDF/CSV/JSON generation
- Event listeners: User interactions, i18n updates

Rendering Pipeline:
- `renderAll(updateSource)`: Updates derived UI; row changes can preserve existing controls and defer layout until a native pointer gesture completes
- `renderList(updateSource)`: Renders filtered rows, reasons, and whole-list review counts, preserving natural focus where possible
- `renderDetail(id)`: Shows detailed item view in accordion panel
- `renderTotals()`: Calculates weight/volume for checked items × quantity

Preset Loading:
- `loadPresets()`: Loads metadata over HTTP(S), or the generated preset script under `file://`
- `readPresetData(key)`: Reads validated preset data into the cache only; never applies it to working or saved data
- `loadFromPreset(key)`: Loads on an explicit load action, then applies only if the request is still current; initial embassy loading uses the same path
- `PRESETS_META`: Metadata cache (bilingual name/purpose, category, count, file path)
- `PRESET_CATEGORIES`: Category labels from `presets/index.json`, the single source for category buttons and option groups
- `PRESETS`: Full preset data cache (loaded on demand)

Candidate selection is not loading. Search and category changes update options and previews without replacing the working list. Out-of-filter candidates are deselected; saved lists are searched by name but not filtered by preset category. Rename/delete must target the loaded saved ID and its matching selected candidate. Catalog validation requires safe IDs, a known category string, bilingual labels/descriptions, integer counts, and the exact `category/id.json` relative path.

Data Management:
- `saveCurrentChecklist()`: Persists state to localStorage
- `loadFromPreset(key)`: Loads predefined preset (lazy-load if needed)
- `filteredItems()`: AND-combines localized name/purpose search, dual_use/hazard filters, and the review mode
- `readChecklists()` / `saveAllChecklists()`: Checked access through LoadoutStore
- `loadChecklist(id)` / `deleteChecklist(id)`: Saved-checklist operations
- `LoadoutCore.editItem()`: Applies form fields without discarding hidden metadata
- `LoadoutCore.parseChecklistJSON(text)`: Validates a single exported checklist and returns `{ name, items }`
- `LoadoutCore.itemReview(item)` / `matchesReview(item, mode)`: Pure unchecked and below-recommended conditions
- `LoadoutCore.compareItems(currentItems, referenceItems)`: Validated, non-mutating ID-based differences and whole-list totals

JSON Restoration:
- Accept UTF-8 files up to 5 MiB (5,242,880 bytes, including BOM), allowing one leading BOM; reject invalid UTF-8
- Inspect the whole parsed JSON, including unused metadata: maximum depth 32 (root 0, including primitive leaves) and 250,000 nodes (root and each object, array, or value)
- Reject non-finite values and `__proto__`, `constructor`, or `prototype` keys at every depth; validate at most 10,000 items with normal field and duplicate-ID checks
- Require a single object with `checklistName` and `items`; optional `createdAt` is a string and is not used as the new save timestamp
- Preserve explicit zero/false, translations, and additional item metadata; do not import a saved ID or unused root fields
- Preview without changing working data or storage, then apply as a separate unsaved list after any required discard confirmation
- A later save creates a new ID; do not automatically overwrite an existing list, including one with the same name
- Ignore stale reads after edits or another load, and keep working data on validation/cancellation/save failures

Review Semantics:
- Modes are `all`, `unchecked`, `below`, and `either`
- Unchecked is `checked === false`; below recommended is `quantity < recommended_quantity`; difference is `max(0, recommended_quantity - quantity)`
- Do not reinterpret unchecked as zero quantity; quantity 0 and recommendation 0 are not below recommended
- Count an item matching both conditions once in `either`; summary counts describe the whole list and separately show filtered rows
- Reasons and counts update after every relevant mutation and language change; filters do not certify sufficiency, safety, or legality
- Bulk check/uncheck acts on all items, including hidden ones; clearing item filters does not change the preset category

Comparison Semantics:
- Match by ID only; same names with different IDs are separate items, not automatically merged
- Compare quantity, recommended quantity, checked state, unit weight/volume, and effective names/categories/purposes in both languages
- Exclude descriptions, sources, flags, scores, and other metadata; unchanged means only the compared fields are unchanged
- Report added/removed/changed/unchanged in current order followed by reference-only rows; never claim an audit history or proof of identity
- Totals use checked quantities across each whole list; checked quantity-zero rows count as checked rows; deltas are current minus reference
- Snapshot current data when opening the dialog and reference data when selected. Reload the reference for another tab's saved changes; reopen for a new current snapshot
- Use a separate sequence to ignore stale reference reads after selection changes or closing; clear old results on failure or no selection
- Keep comparison read-only: no writes to storage, auto-merging, or replacement of current data. Language changes re-render the same snapshots
- Render text safely and at most 50 item rows per page; difference-only filtering never changes whole-list counts or totals
- Do not score safety, sufficiency, or the relative quality of configurations

Modal System:
- `openItemModal(mode, item)`: Opens add/edit modal
- `showSaveOptionsModal()`: Overwrite vs save-as-new dialog
- `openDialog()` / `closeDialog()`: Dialog semantics, background inertness, focus entry/return
- Form submission creates/updates items with validation

Graph Visualization:
- `drawGraphImage()`: Main dispatcher for graph views
- `drawPieView()`: Category breakdown pie chart
- `drawRadarView()`: Five sample-rating axes: survivability, signalability, exfiltration_support, concealability, legality_penalty
- `drawItemsView()`: Top items table by weight

Graphs include checked rows with a positive quantity. Each radar axis averages the available values by row, not by quantity; missing values are excluded, with 0 displayed if none exist. Regulatory caution is not inverted, and higher is not better. Keep the limitations visible on the dialog and PNG.

Export Functions:
- `exportJSON()`: Checklist name, export timestamp, and full item objects; its format can be previewed and imported as a new unsaved list
- `exportCSV()`: All item rows in 12 columns, UTF-8 BOM, CRLF, quoted cells, and formula-prefix protection
- `exportPDF()`: Dedicated HTML rendered by html2canvas 1.4.1 and jsPDF 4.2.1; image-based PDF, not selectable text

CSV columns are `id,name,category,weight_g,volume_cm3,purpose_short,dual_use,hazard_flag,legality_notes,quantity,recommended_quantity,checked`. Weight and volume are per unit. JSON/CSV/PDF include every item regardless of filters. Totals in the UI, graphs, PDF, and print use checked quantities from the whole list. Browser print alone prints displayed rows and labels its displayed count, filters, and whole-list total scope. Flush pending pointer-driven rendering before printing. CSV protections can be removed by spreadsheet editing/re-saving, so do not promise safe execution in every spreadsheet.

## Development Workflow

### Running Locally
Serve the repository with a local static server, or open its `index.html` directly:
```bash
# Serve with any static server
python -m http.server 8000
# Or use Live Server in VS Code
# Or open index.html directly in browser
```

When modifying preset JSON or metadata, run `node scripts/build-presets.cjs` and include the generated bundle in the same change. HTTP(S) uses lazy JSON fetches; file-opening mode loads the bundled data. PDF libraries still require CDN availability or browser cache, and storage/clipboard behavior may differ under `file://`.

### Testing
Run the dependency-free Node.js tests; do not install packages just to run them:

```bash
npm test
node scripts/build-presets.cjs --check
git diff --check
```

The Test workflow runs `npm test` on Node.js 22 for pushes and pull requests. Tests cover core validation, bundled data, storage failures/conflicts, CSV, language resources, and UI invariants. Browser checks remain necessary:

1. Load all preset categories and test switching during pending requests.
2. Add/edit/delete items, including quantity 0, and preserve untouched translations and metadata.
3. Change language and category while unsaved; neither operation should replace current data.
4. Test denied/corrupt/full storage and concurrent edits; preserve the unsaved state on failure.
5. Inspect CSV, JSON, actual PDF downloads, graph images, and print output.
6. Verify mobile layouts, dialog keyboard/focus behavior, source URL handling, and limitations in both languages.
7. Test JSON preview/apply/cancel, invalid UTF-8 and structural boundaries, metadata/zero/false preservation, stale reads, and saving as a distinct list.
8. Test all review modes with AND filters, overlapping counts, every mutation/language update, whole-list exports/bulk operations, and displayed-row printing.
9. Commit inline quantity edits using actual Tab, Shift+Tab, Enter, mouse/touch clicks, long holds, and cancelled pointers. Immediate state updates must not move the click target mid-gesture or steal focus from dialogs.
10. Test catalog search in both languages, category intersections, empty matches, previews, explicit loading, and cancellation of pending requests after candidate/search/category/edit/dialog changes.
11. Test read-only comparison with exact positive/negative/zero deltas, translation-only changes, same-name different-ID items, excluded metadata, 50-row boundaries, stale responses, failed reads, snapshots, language changes, and unchanged working/saved data. Renderer DOM-stub tests do not replace real-browser layout/focus checks.

### Deployment
GitHub Pages serves the repository root at https://ipusiron.github.io/ops-loadout/. Use a reviewed branch and pull request rather than a direct push to main:

1. Inspect the worktree and preserve unrelated changes.
2. Complete local tests and browser checks, then commit only the intended files.
3. Push the working branch and create a pull request; confirm both push and pull-request Test checks.
4. Use an ordinary merge after checks pass. Do not force push, bypass failed checks, or use an administrative merge.
5. Confirm main-branch Test and Pages deployment success, compare published files with the merged files, and check the public UI.
6. Back up the repository before removing the merged working branch, then confirm main is synchronized and clean.

Stop for authorization failures, conflicts, or failed verification. A local-only or no-commit instruction overrides publication steps.

## Code Conventions

### Adding New Items to Presets
Edit the JSON file in `presets/{category}/{preset}.json`. Keep Japanese and English descriptions aligned and do not invent evidence:
- `sources`: Include a useful source title and a verified URL when available. A title-only reference must not be called independently verified.
- `legality_notes`: Record general cautions and the need to check current rules; do not certify legal status.
- `dual_use`: Set to `true` if item has military/civilian dual-use concerns
- `hazard_flag`: Set to `true` if item has transport/regulatory restrictions

Example field structure (illustrative values, not validated legal advice or equipment recommendations):
```javascript
{
  id: "em_multitool",
  name: "小型マルチツール（ハサミ、缶切り、プライヤー）",
  category: "工具",
  weight_g: 80,
  volume_cm3: 30,
  purpose_short: "汎用工具作業（非破壊的）",
  dual_use: true,
  hazard_flag: false,
  legality_notes: {
    US: "航空機内で制限される場合あり",
    JP: "制限される場合あり"
  },
  sources: [{title: "CIA博物館 E&Eキット マルチツール事例"}],
  scores: {survivability:2, signalability:0, exfiltration_support:1, concealability:2, legality_penalty:1}
}
```

### UI/UX Patterns
- Local utility classes are defined in `css/utilities.css`; no runtime CSS compiler
- Modal backdrops use `.modal-backdrop.active`; the dialog helpers manage focus and inert backgrounds
- Items with `dual_use=true` show yellow badge
- Items with `hazard_flag=true` show red badge
- Category filter buttons and option groups generated from index.json (evasion/edc/rescue/security/disaster/hacker/cyber_ninja/travel/event)
- Preview the selected preset's purpose and item count before explicit loading; show the illustrative-measurement warning when applicable
- Inline quantity editing in the table view
- Save flow: prompts for overwrite vs new-save if checklist already exists
- Inputs use readable mobile font sizes; responsive rows retain labels and zero quantities
- `langchange` redraws current content, preview, and open graph/comparison without replacing the working list or comparison snapshots

## Important Files

- index.html: UI structure, local CSS, jsPDF/html2canvas imports with SRI, and CSP meta policy
- app.js: Core logic with lazy-loaded presets, state management, rendering, graph visualization
- i18n.js: Internationalization (Japanese/English), language resources, UI translation
- loadout-core.js / loadout-store.js: Testable data operations and storage access
- loadout-catalog.js / comparison-view.js: Catalog validation/search and safe paginated comparison display
- css/main.css: Entry point for modular CSS (@import for base, layout, controls, etc.)
- presets/index.json: Category labels and preset metadata (name, purpose, category, count, file path for lazy loading)
- presets/{category}/{preset}.json: Individual preset data with items
- presets-bundle.js / scripts/build-presets.cjs: Generated file-opening data and its generator
- test/ / package.json / .github/workflows/test.yml: Dependency-free tests and CI
- docs/DEVELOPMENT.md: Detailed technical documentation for developers
- docs/SECURITY.md: Security policy, CSP configuration, XSS protection details
- README.md: Project documentation with design principles, use cases, and data model
- README.en.md: Full English counterpart of the Japanese README
- CLAUDE.md: This file - development guidance for Claude Code

## Security Considerations

### Defensive Security Alignment
This tool serves DEFENSIVE purposes:
- Training personnel on emergency equipment
- Organizational equipment audits
- Emergency preparedness planning
- Historical/educational documentation

### Legal Warnings
Flags are displayed in the item list, detail panel, and PDF table. Legal notes are shown in the detail panel. The app-wide limitation is included on screen and in PDF output. There is no mandatory PDF confirmation dialog or automatic legal check. Do not treat the lack of a flag as permission.

### Restricted Items Documentation
Some entries name lock picks, diamond wire, or ceramic blades and refer to museum or other source titles. Their presence is an educational example, not an endorsement or authority to obtain/use them. Check each entry's actual fields rather than assuming a uniform score or warning sentence. Scores, source titles, and generic legal notes do not establish safety or lawful use.

## Future Enhancement Ideas

The following are not implemented and require a separate agreed scope:

- Workflow states and approvals
- Audit logs or version history
- CSV import or conversion between tools' JSON formats
- Cross-device synchronization or atomic concurrent editing
- IndexedDB storage or a service-worker offline cache

Japanese/English UI and three graph views are present. Do not add unsupported claims of safety, legal compliance, or scientific validity to describe them.
