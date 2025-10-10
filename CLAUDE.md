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

- **index.html**: Main UI structure using Tailwind CSS (CDN)
- **app.js**: Core application logic with embedded PRESETS data (vanilla JS, no frameworks)
- **style.css**: Custom styling and component styles

### State Management
The application uses a single in-memory state object (`app.js:38-45`):
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
- `ekc_current`: Current checklist state
- `ekc_recent`: Recent checklist history (max 10)

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

**Backward Compatibility**: The `normalizeItem()` function (app.js:141-150) automatically adds default values for new fields when loading legacy presets, ensuring seamless migration.

### Key Functions

**Rendering Pipeline** (`app.js:137-268`):
- `renderAll()`: Master render function that updates all UI sections
- `renderList()`: Renders filtered item table with search/filter application
- `renderDetail(id)`: Shows detailed item view in right panel
- `renderTotals()`: Calculates weight/volume for checked items

**Data Management** (`app.js:84-131`):
- `saveToLocal()`: Persists state to localStorage and updates recent history
- `loadFromPreset(key)`: Loads predefined preset from PRESETS object
- `filteredItems()`: Applies search query and dual_use/hazard filters

**Modal System** (`app.js:270-330`):
- `openItemModal(mode, item)`: Opens add/edit modal
- Form submission creates/updates items with validation
- Legality notes must be valid JSON

**Export Functions** (`app.js:335-400`):
- `exportJSON()`: Full checklist export
- `exportCSV()`: Spreadsheet-compatible export
- `exportPDF()`: PDF generation using jsPDF (includes dual-use confirmation dialog)

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
# Site updates at: https://ipusiron.github.io/escape-kit-checklist/
```

## Code Conventions

### Adding New Items to Presets
Edit the `PRESETS` object in `app.js` (lines 7-140). **REQUIRED fields**:
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
- Export PDF prompts confirmation if dual_use items present

## Important Files

- **index.html**: UI structure, Tailwind CDN, jsPDF and html2canvas import
- **app.js**: Core logic with PRESETS embedded (lines 7-140), all state management and rendering
- **style.css**: Custom styling for components, saved checklist UI, badges, etc.
- **README.md**: Project documentation with design principles and features
- **CLAUDE.md**: This file - development guidance and architecture documentation

## Security Considerations

### Defensive Security Alignment
This tool serves DEFENSIVE purposes:
- Training personnel on emergency equipment
- Organizational equipment audits
- Emergency preparedness planning
- Historical/educational documentation

### Legal Warnings
Items flagged as `dual_use=true` include mandatory warnings in:
1. Item detail view (app.js:223-246)
2. PDF export confirmation dialog (app.js:371-375)
3. Visual badges in item list (app.js:171)

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
- Scenario-based scoring visualization
- Multi-language support (UI currently mixed Japanese/English)
- Import functionality (currently export-only)
