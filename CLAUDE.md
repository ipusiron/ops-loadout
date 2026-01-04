# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**OpsLoadout** is a generic operations packing checklist tool designed for managing equipment configurations across various use cases (SERE / Embassy / Law-Enforcement / Disaster Preparedness / General EDC). This is a defensive security educational tool designed for training and legitimate organizational use.

**Expanded Packing Features:**
- **Quantity Management**: Track current quantity and recommended quantity for each item
- **Repack Frequency**: Set maintenance schedules (daily, weekly, monthly, never)
- **Category Tags**: Flexible tagging system for multi-dimensional categorization
- **Inline Editing**: Quick quantity adjustments directly in the table view
- **Smart Totals**: Automatic weight/volume calculation based on checked items × quantity

Items are sourced from public documents including:
- US Air Force SERE Handbook (AFH 10-644)
- US State Department embassy evacuation guidance
- CIA Museum Escape & Evasion kit documentation
- MARSOC SERE gear lists
- Ready.gov emergency preparedness resources
- Japanese disaster preparedness guidelines (内閣府防災情報)

**Design Principles:**
- **Fact-based**: All items reference public sources and documentation
- **Educational/operational use only**: For training, preparation, and equipment audits
- **Legal compliance**: Items flagged with `dual_use` or `hazard_flag` include explicit legal warnings
- **Transparency**: Every item includes source attribution
- **Backward compatibility**: Auto-normalization ensures old presets work seamlessly

**Critical Security Policy**: This tool is for DEFENSIVE SECURITY ONLY. Items with `dual_use=true` or `hazard_flag=true` (e.g., lock picks, diamond wire, ceramic blades) are documented for historical accuracy but include mandatory legal warnings. These items should NEVER be promoted for misuse.

## Architecture

This is a **vanilla JavaScript single-page application** with no build system:

- **index.html**: Main UI structure using Tailwind CSS (CDN), CSP headers
- **app.js**: Core application logic with lazy-loaded presets (vanilla JS, no frameworks)
- **i18n.js**: Internationalization module (Japanese/English)
- **css/**: Modular CSS files (main.css as entry point)
- **presets/**: JSON preset files with lazy loading (index.json for metadata)

### State Management
The application uses a single in-memory state object:
```javascript
{
  checklistName: string,
  scenario: string,  // urban/wilderness/maritime/embassy
  items: Array<Item>,
  viewMode: string,  // table or card
  selectedItemId: string|null
}
```

State persists to `localStorage` with keys:
- `ekc_saved_checklists`: Saved checklist list
- `ekc_custom_presets`: User-created custom presets
- `ops_lang`: Language preference (`ja` or `en`)

### Data Model
Each item in the checklist follows this schema:
```javascript
{
  id: string,
  name: string,
  category: string,  // Survival/Signalling/Tools/Evasion/Medical/etc
  weight_g: number,
  volume_cm3: number,

  // NEW: Packing fields (auto-normalized with defaults)
  quantity: number,                    // Current quantity (default: 1)
  recommended_quantity: number,        // Recommended quantity (default: 1)
  packed_by_default: boolean,          // Auto-pack this item (default: false)
  category_tags: string[],             // Flexible tags (default: [category.toLowerCase()])
  repack_frequency: string,            // 'daily'|'weekly'|'monthly'|'never' (default: 'never')

  purpose_short: string,
  hazard_flag: boolean,                // Regulatory restrictions (batteries, alcohol, etc)
  dual_use: boolean,                   // Civilian/military dual-use items (requires legal warnings)
  legality_notes: {[country]: string},
  concealability: string,              // high/medium/low
  recommended_location_on_body: string,
  sources: [{title: string, url: string}],
  scores: {
    survivability: number,
    signalability: number,
    exfiltration_support: number,
    concealability: number,
    legality_penalty: number
  }
}
```

**Backward Compatibility**: The `normalizeItem()` function automatically adds default values for new fields when loading legacy presets, ensuring seamless migration.

### Key Functions

The app.js file is organized into these main sections:
- **PRESETS loading**: Lazy-loaded from `presets/` folder (index.json for metadata, individual JSON files for data)
- **DOM element references**: Cached for performance
- **Utility functions**: Item normalization, escapeHtml, localStorage helpers
- **Rendering functions**: Table, detail panel, totals, graph views
- **Modal management**: Add/edit items, save options, graph display
- **Export functions**: PDF/CSV/JSON generation
- **Event listeners**: User interactions, i18n updates

**Rendering Pipeline**:
- `renderAll()`: Master render function that updates all UI sections
- `renderList()`: Renders filtered item table with search/filter application
- `renderDetail(id)`: Shows detailed item view in accordion panel
- `renderTotals()`: Calculates weight/volume for checked items × quantity

**Preset Loading**:
- `loadPresetsMeta()`: Loads presets/index.json at startup
- `loadPresetData(key)`: Lazy-loads individual preset JSON on demand
- `PRESETS_META`: Metadata cache (name, category, file path)
- `PRESETS`: Full preset data cache (loaded on demand)

**Data Management**:
- `saveCurrentChecklist()`: Persists state to localStorage
- `loadFromPreset(key)`: Loads predefined preset (lazy-load if needed)
- `filteredItems()`: Applies search query and dual_use/hazard filters
- `getAllCustomPresets()` / `saveAllCustomPresets()`: Custom preset CRUD

**Modal System**:
- `openItemModal(mode, item)`: Opens add/edit modal
- `showSaveOptionsModal()`: Overwrite vs save-as-new dialog
- Form submission creates/updates items with validation

**Graph Visualization**:
- `drawGraphImage()`: Main dispatcher for graph views
- `drawPieView()`: Category breakdown pie chart
- `drawRadarView()`: 5-axis radar chart (weight, volume, items, dual_use, hazard)
- `drawItemsView()`: Top items table by weight

**Export Functions**:
- `exportJSON()`: Full checklist export
- `exportCSV()`: Spreadsheet-compatible export
- `exportPDF()`: PDF generation using html2canvas + jsPDF (Japanese-friendly)

## Development Workflow

### Running Locally
This is a **static site** with no build step:
```bash
# Serve with any static server
python -m http.server 8000
# Or use Live Server in VS Code
# Or open index.html directly in browser
```

### Testing
No automated test suite currently exists. Manual testing checklist:
1. Load each preset (embassy/sere/urban)
2. Add/edit/delete items via modal
3. Test search and filters (dual_use, hazard_flag)
4. Verify localStorage persistence
5. Test all export formats (JSON/CSV/PDF)
6. Verify legal warnings appear for dual_use items

### Deployment
GitHub Pages is configured to serve from the root:
```bash
git add .
git commit -m "Update checklist data"
git push origin main
# Site updates at: https://ipusiron.github.io/ops-loadout/
```

## Code Conventions

### Adding New Items to Presets
Edit the JSON file in `presets/{category}/{preset}.json`. **REQUIRED fields**:
- `sources`: MUST include at least one source with title/URL
- `legality_notes`: MUST document legal status in relevant jurisdictions
- `dual_use`: Set to `true` if item has military/civilian dual-use concerns
- `hazard_flag`: Set to `true` if item has transport/regulatory restrictions

**Example of a properly documented item**:
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
- Tailwind utility classes used throughout (via CDN)
- Modal backdrop uses `fixed inset-0` with flex centering
- Items with `dual_use=true` show yellow badge
- Items with `hazard_flag=true` show red badge
- Category filter buttons at the top for preset filtering (evasion/edc/rescue/security/disaster/hacker)
- Inline quantity editing in the table view
- Save flow: prompts for overwrite vs new-save if checklist already exists

## Important Files

- **index.html**: UI structure, Tailwind CDN, jsPDF/html2canvas import (with SRI), CSP headers
- **app.js**: Core logic with lazy-loaded presets, state management, rendering, graph visualization
- **i18n.js**: Internationalization (Japanese/English), language resources, UI translation
- **css/main.css**: Entry point for modular CSS (@import for base, layout, controls, etc.)
- **presets/index.json**: Preset metadata (name, category, file path for lazy loading)
- **presets/{category}/{preset}.json**: Individual preset data with items
- **docs/DEVELOPMENT.md**: Detailed technical documentation for developers
- **docs/SECURITY.md**: Security policy, CSP configuration, XSS protection details
- **README.md**: Project documentation with design principles, use cases, and data model
- **CLAUDE.md**: This file - development guidance for Claude Code

## Security Considerations

### Defensive Security Alignment
This tool serves DEFENSIVE purposes:
- Training personnel on emergency equipment
- Organizational equipment audits
- Emergency preparedness planning
- Historical/educational documentation

### Legal Warnings
Items flagged as `dual_use=true` include mandatory warnings in:
1. Item detail view (accordion panel)
2. PDF export confirmation dialog
3. Visual badges in item list (yellow for dual_use, red for hazard_flag)

### Restricted Items Documentation
The preset includes historically documented items (lock picks, diamond wire, ceramic blades) from CIA Museum collections. These are:
- Marked with `legality_penalty: 5` (highest penalty)
- Include "NOT recommended for civilians" in location field
- Documented with authoritative sources
- Intended for historical/educational reference only

## Future Enhancement Ideas

From README.md feature list:
- Workflow states (draft → pending → approved) mentioned but not implemented
- Audit log / change history tracking
- Import functionality (currently export-only)
- ~~Multi-language support~~ ✅ Implemented (i18n.js with JA/EN toggle)
- ~~Scenario-based scoring visualization~~ ✅ Implemented (Graph modal with 3 views)
