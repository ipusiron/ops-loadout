# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Escape Kit Checklist** is a fact-based checklist manager for emergency escape kits (SERE / Embassy / Law-Enforcement). This is a defensive security educational tool designed for training and legitimate organizational use. Items are sourced from public documents including:
- US Air Force SERE Handbook (AFH 10-644)
- US State Department embassy evacuation guidance
- CIA Museum Escape & Evasion kit documentation
- MARSOC SERE gear lists
- Ready.gov emergency preparedness resources

**Design Principles:**
- **Fact-based**: All items reference public sources and documentation
- **Educational/operational use only**: For training, preparation, and equipment audits
- **Legal compliance**: Items flagged with `dual_use` or `hazard_flag` include explicit legal warnings
- **Transparency**: Every item includes source attribution

**Critical Security Policy**: This tool is for DEFENSIVE SECURITY ONLY. Items with `dual_use=true` or `hazard_flag=true` (e.g., lock picks, diamond wire, ceramic blades) are documented for historical accuracy but include mandatory legal warnings. These items should NEVER be promoted for misuse.

## Architecture

This is a **vanilla JavaScript single-page application** with no build system:

- **index.html**: Main UI structure using Tailwind CSS (CDN)
- **app.js**: Core application logic (vanilla JS, no frameworks)
- **data/presets.json**: Comprehensive item database with fact-based sourcing

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
Each item in the checklist follows this schema (see data/presets.json:8-23):
```javascript
{
  id: string,
  name: string,
  category: string,  // Survival/Signalling/Tools/Evasion/Medical/etc
  weight_g: number,
  volume_cm3: number,
  purpose_short: string,
  hazard_flag: boolean,     // Regulatory restrictions (batteries, alcohol, etc)
  dual_use: boolean,        // Civilian/military dual-use items (requires legal warnings)
  legality_notes: {[country]: string},
  concealability: string,   // high/medium/low
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
Edit `data/presets.json` following the schema above. **REQUIRED fields**:
- `sources`: MUST include at least one source with title/URL
- `legality_notes`: MUST document legal status in relevant jurisdictions
- `dual_use`: Set to `true` if item has military/civilian dual-use concerns
- `hazard_flag`: Set to `true` if item has transport/regulatory restrictions

**Example of a properly documented dual-use item** (data/presets.json:419-434):
```json
{
  "id": "item-025",
  "name": "Lock-Opening Tools (documented in historical kits) — LEGAL NOTE",
  "category": "Tools",
  "dual_use": true,
  "hazard_flag": true,
  "legality_notes": {
    "US": "Possession/use may be illegal; for authorized personnel only",
    "JP": "Likely restricted"
  },
  "sources": [
    {"title": "CIA Museum — Escape & Evasion Survival Kit (lock picks listed)",
     "url": "https://www.cia.gov/legacy/museum/artifact/escape-evasion-survival-kit/"}
  ]
}
```

### UI/UX Patterns
- Tailwind utility classes used throughout (via CDN)
- Modal backdrop uses `fixed inset-0` with flex centering
- Items with `dual_use=true` show yellow badge
- Items with `hazard_flag=true` show red badge
- Export PDF prompts confirmation if dual_use items present

## Important Files

- **index.html** (`index.html:1-167`): UI structure, Tailwind CDN, jsPDF import
- **app.js** (`app.js:1-456`): Core logic with PRESETS embedded (lines 7-36)
- **data/presets.json** (`data/presets.json:1-525`): Comprehensive 30-item embassy-escape preset with full documentation
- **README.md**: Project documentation with design principles and features

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
