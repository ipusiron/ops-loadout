# Security Policy

## Supported Versions

This is a client-side application with no application backend. The supported release is the code published from the repository's main branch. Editing takes place in memory; explicitly saved checklists and preferences use the browser's localStorage.

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |

## Security Features

### 1. XSS (Cross-Site Scripting) Protection
- Text inserted into HTML templates is escaped with `escapeHtml()`; plain text is assigned with `textContent` where applicable. Stored strings are not treated as trusted HTML.
- Item IDs, category tags, checklist names, source titles, and legal notes are escaped at their HTML output locations.
- Application code does not use `eval()` or the `Function()` constructor.
- `sanitizeUrl()` delegates to `LoadoutCore.safeUrl()`. It allows only absolute HTTP(S) URLs without embedded credentials, whitespace, or control characters. Invalid source URLs are not made into links. An allowed URL is not a guarantee that its destination is safe or accurate.

### 2. Data Safety
- `LoadoutCore` validates item and checklist shapes, numeric ranges, flags, and duplicate IDs. Quantity and recommended quantity are integers from 0 to 999; weight and volume are finite numbers from 0 to 1,000,000,000.
- `LoadoutStore` catches parsing, access, validation, and write failures. An unreadable saved collection is not replaced with an empty one. Failed saves do not clear the unsaved state or display a success confirmation.
- Before overwriting a saved checklist, the app compares it with the loaded snapshot. The store also compares the raw collection immediately before writing. This detects some concurrent changes, but localStorage has no atomic compare-and-swap transaction; simultaneous writes can still race. Avoid editing one collection in multiple tabs.
- CSV export quotes every cell, doubles embedded quotes, and prefixes potentially formula-like values with an apostrophe. It includes a UTF-8 BOM and uses CRLF row endings. Spreadsheet behavior varies, and editing or re-saving CSV can remove protections; review imported cells before using them.
- Saved data is not encrypted. This tool does not authenticate users, maintain a tamper-evident audit log, or certify safety, preparedness, ownership, or legality.

JSON import is an untrusted-input boundary. The file is read locally, with a size check before `arrayBuffer()` and strict UTF-8 decoding. `LoadoutCore.parseChecklistJSON()` accepts a single object containing `checklistName` and `items`, with an optional string `createdAt`. It returns the name and validated items, not a saved ID or the export timestamp. Raw presets, saved-list arrays, CSV, and other tools' JSON formats are not converted automatically.

The limits are 5 MiB (5,242,880 bytes, including any BOM), depth 32 with the root at 0, 250,000 JSON nodes including the root and each object, array, or value, and 10,000 items. One leading UTF-8 BOM is allowed. The whole JSON is inspected, including unused root fields and additional item metadata; primitive leaf values count toward depth. Non-finite numbers and `__proto__`, `constructor`, or `prototype` keys are rejected at every depth. These limits bound accepted inputs; they do not guarantee responsive performance or enough browser storage.

Validated zero/false values, translations, and additional item metadata are retained, but remain untrusted at display and export boundaries. A preview does not change the working list or saved data. Applying it creates a separate unsaved list after any required discard confirmation; a later save uses a new ID and does not automatically overwrite a same-name saved list. Superseded asynchronous reads are not applied. Invalid input, cancellation, or a failed save must preserve the relevant working and saved data. Import status messages do not echo the file contents.

Review filters compare `checked === false` and `quantity < recommended_quantity`; they do not measure equipment sufficiency. Unchecked does not mean quantity zero, and overlapping conditions are counted once in their union. JSON/CSV/PDF exports, totals, graphs, and bulk check operations cover the whole list, including hidden rows. Browser printing uses displayed rows and labels its counts, filters, and whole-list totals.

### 3. External Resources
- jsPDF and html2canvas are fetched from cdnjs with fixed versions, SRI hashes, `crossorigin="anonymous"`, and `referrerpolicy="no-referrer"`.
- SRI checks the received script bytes against the expected hash. It does not establish that a library has no vulnerabilities.
- Styles and preset data are local files. Opening the page can still contact GitHub Pages and cdnjs; a browser or CDN may cache those resources. PDF export requires the PDF libraries to be available.

### 4. Content Security Policy (CSP)

CSP meta tag configured with restrictive policy:

| Directive | Value | Purpose |
|:---|:---|:---|
| `default-src` | `'self'` | Only same-origin resources by default |
| `script-src` | `'self' https://cdnjs.cloudflare.com` | No `unsafe-inline` or `unsafe-eval`; scripts are external files |
| `style-src` | `'self' 'unsafe-inline'` | Local stylesheets plus dynamic progress and PDF styles |
| `img-src` | `'self' data:` | Canvas export support, no external https: |
| `font-src` | `'self'` | No remote web-font source |
| `connect-src` | `'self' https://cdnjs.cloudflare.com` | Same-origin preset requests and cdnjs source-map requests |
| `base-uri` | `'self'` | Prevents base tag hijacking |
| `form-action` | `'self'` | Forms submit only to same-origin |

Additional measures:
- External link targets use `rel="noopener noreferrer"` to prevent tabnabbing
- Referrer-Policy set to `strict-origin-when-cross-origin`

Known limitations:

- Inline styles remain allowed for dynamic UI and PDF rendering. CSP is an additional restriction, not a replacement for output escaping and input validation.
- `frame-ancestors`, `X-Frame-Options`, and `X-Content-Type-Options` require HTTP response headers; a meta tag cannot enforce them. This repository cannot configure those custom response headers on GitHub Pages. Do not describe the meta policy as clickjacking protection.
- The file-opening mode uses a generated preset script. Browser storage, clipboard permissions, and CSP behavior can differ between `file://` and HTTP(S); use a local HTTP server for development comparisons.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it by:

1. DO NOT create a public GitHub issue
2. Contact the repository owner directly through GitHub
3. Provide detailed information about the vulnerability
4. Allow reasonable time for a fix before public disclosure

Include reproduction steps, the browser version, and a minimal non-sensitive example. Do not send personal equipment lists, credentials, or confidential organizational procedures. No response-time guarantee is provided.

## Best Practices for Users

1. Local storage: clearing site data removes saved checklists. Private browsing, storage policy, or quota limits can prevent persistence. Check for a successful save before closing the page.
2. No account: the app does not provide authentication, account recovery, cross-device synchronization, or access control between people sharing a browser profile.
3. External copies: export important checklists as JSON and retain the files securely. “Import JSON” previews a supported backup and opens it as a new unsaved list. Review and explicitly save it; importing does not repair browser storage or restore a whole saved collection. CSV import is not supported.
4. Browser security: keep the browser updated. Avoid simultaneous editing in multiple tabs and retain the in-memory version if a storage conflict is reported.
5. Shared computers: do not enter sensitive equipment lists or personal information on public/shared computers. Downloaded files and copied graph images remain outside the app's storage controls.
6. Equipment decisions: verify actual weights, volumes, suitability, and applicable rules independently. Missing warning flags do not imply unrestricted possession, transport, or use. Sample radar ratings are not measurements of safety or legality.

## Dependencies

This application uses:
- Local CSS files, including `css/utilities.css` and `css/accessibility.css`
- jsPDF 4.2.1 (cdnjs with SRI) for PDF generation
- html2canvas 1.4.1 (cdnjs with SRI) for HTML-to-canvas conversion

There are no npm runtime or test dependencies. Review library changes and update both the pinned URL and its matching SRI hash together. Run `npm test` and browser export checks before publishing; a passing test suite is not a security certification.

## Privacy

- No analytics: the application does not install an analytics or tracking service.
- No cookies: application code does not set cookies.
- Checklist processing: the application has no upload endpoint and does not intentionally send entered checklist contents or imported JSON to a server. Import files are processed on the device. Exporting, copying, or sharing a file is a separate user action.
- External requests: GitHub Pages serves the app and cdnjs serves the two PDF libraries. These services receive ordinary request metadata. Following source links opens the selected external site.
- Local retention: in-memory edits, saved browser data, downloads, and clipboard images have different lifetimes. Clearing browser storage does not erase downloaded files or clipboard contents.

## License

This project is licensed under the MIT License; see [LICENSE](../LICENSE). The PDF libraries retain their own license notices.
