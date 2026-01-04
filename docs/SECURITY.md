# Security Policy

## Supported Versions

This is a client-side application with no backend. All data is stored locally in the browser's localStorage.

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |

## Security Features

### 1. XSS (Cross-Site Scripting) Protection
- All user inputs are sanitized using `escapeHtml()` function
- innerHTML usage is carefully controlled and escaped
- No `eval()` or `Function()` constructor usage
- URL sanitization blocks `javascript:`, `data:`, and `vbscript:` schemes via `sanitizeUrl()` function

### 2. Data Safety
- All data stored in localStorage (client-side only)
- No sensitive data transmission to external servers
- JSON parsing with error handling
- localStorage quota exceeded handling

### 3. External Resources
- CDN scripts include Subresource Integrity (SRI) hashes
- CORS and referrer policies configured
- Integrity checks for jsPDF and html2canvas libraries

### 4. Content Security Policy (CSP)
- CSP meta tag configured with restrictive policy:
  - `default-src 'self'` - Only same-origin resources by default
  - `script-src` - Limited to self, Tailwind CDN, and cdnjs.cloudflare.com
  - `frame-ancestors 'none'` - Prevents clickjacking
  - `base-uri 'self'` - Prevents base tag hijacking
- External link targets use `rel="noopener noreferrer"` to prevent tabnabbing
- Referrer-Policy set to `strict-origin-when-cross-origin`
- **Note**: Some security headers (X-Frame-Options, X-Content-Type-Options) require HTTP server configuration. GitHub Pages does not support custom HTTP headers.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it by:

1. **DO NOT** create a public GitHub issue
2. Contact the repository owner directly through GitHub
3. Provide detailed information about the vulnerability
4. Allow reasonable time for a fix before public disclosure

We take security seriously and will respond promptly to legitimate security concerns.

## Best Practices for Users

1. **Local Storage Only**: All data is stored in your browser. Clear browser data will delete all checklists.
2. **No Account Required**: This tool runs entirely in your browser with no user authentication.
3. **Backup Important Data**: Export your checklists as JSON files for backup purposes.
4. **Browser Security**: Keep your browser updated for the latest security patches.
5. **Public Computer Warning**: Do not use this tool on public/shared computers for sensitive equipment lists.

## Dependencies

This application uses:
- Tailwind CSS (CDN) - Styling framework
- jsPDF (CDN with SRI) - PDF generation
- html2canvas (CDN with SRI) - HTML to canvas conversion

All dependencies are loaded from trusted CDNs with integrity checks where possible.

## Privacy

- **No Analytics**: This application does not use Google Analytics or any tracking.
- **No Cookies**: No cookies are set by this application.
- **No External Data Transmission**: All data remains in your browser's localStorage.
- **GitHub Pages Hosting**: Standard GitHub Pages privacy policy applies.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
