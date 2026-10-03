/**
 * URL sanitization for data-driven `href`/`src` bindings.
 *
 * Angular's `[href]` binding runs every value through `DomSanitizer`, so an
 * `OgeMenuItem.url` of `javascript:alert(1)` renders as `unsafe:javascript:…`
 * and does nothing. React has no such step: `href={item.url}` reaches the DOM
 * verbatim and a `javascript:` URL executes on click. The React render layer
 * therefore has to do by hand what Angular does for free — otherwise a menu,
 * breadcrumb or tree built from server data is an XSS sink in one layer and
 * not the other, which is both a security bug and a parity bug.
 *
 * The check mirrors Angular's `_sanitizeUrl`: an **allowlist** of schemes.
 * Relative URLs, fragments and query-only URLs carry no scheme and always
 * pass; `http`, `https`, `mailto`, `tel`, `ftp` and `sms` pass; every other
 * scheme — including ones nobody has invented an exploit for yet — becomes
 * `about:blank`. A denylist has to be right about every scheme a browser
 * will ever support; an allowlist only about the ones it names.
 */

/** Schemes a data-driven link may use without opting in. */
const DEFAULT_SCHEMES: ReadonlySet<string> = new Set([
  'http',
  'https',
  'mailto',
  'tel',
  'ftp',
  'sms',
]);

/**
 * Schemes that run code when navigated to. `allowedSchemes` cannot re-enable
 * them — there is no legitimate data-driven `javascript:` link.
 */
const SCRIPT_SCHEMES: ReadonlySet<string> = new Set([
  'javascript',
  'vbscript',
  'livescript',
  'mocha',
]);

/**
 * Control characters, whitespace and zero-width marks are stripped before the
 * scheme is read: `java\tscript:` and `java&#x09;script:` are the classic ways
 * past a naive `startsWith('javascript:')` check, because the browser strips
 * them too before it resolves the URL.
 */
// The control characters are the point: the browser strips them before it
// resolves a URL, so a check that does not strip them too is the bypass.
// eslint-disable-next-line no-control-regex
const STRIPPED = /[\u0000-\u0020\u007f-\u00a0\u200b-\u200d\ufeff]/g;

/** The lowercase scheme of `url`, or `null` when it carries none. */
function schemeOf(url: string): string | null {
  const cleaned = url.replace(STRIPPED, '');
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(cleaned);
  return match ? match[1].toLowerCase() : null;
}

/** `data:` URLs that would parse as markup — the ones that can run script. */
function isMarkupDataUrl(url: string): boolean {
  const head = url.replace(STRIPPED, '').slice(0, 64).toLowerCase();
  return (
    head.startsWith('data:text/html') ||
    head.startsWith('data:image/svg') ||
    head.startsWith('data:application/xhtml')
  );
}

/** Options of {@link sanitizeUrl}. */
export interface OgeSanitizeUrlOptions {
  /**
   * Also accept `blob:` and non-markup `data:` URLs — for URLs the component
   * made itself with `URL.createObjectURL` (a preview or a download), and for
   * image sources. Default `false`.
   */
  allowObjectUrls?: boolean;
  /**
   * Extra schemes to accept on top of the default allowlist (`http`, `https`,
   * `mailto`, `tel`, `ftp`, `sms`) — e.g. `['web+app', 'ms-teams']` for
   * custom protocol handlers. Case-insensitive; a trailing `:` is ignored.
   * Script schemes (`javascript`, `vbscript`, …) are never accepted, and
   * `data`/`blob` stay governed by `allowObjectUrls`.
   */
  allowedSchemes?: readonly string[];
}

function extraSchemeAllowed(
  scheme: string,
  allowedSchemes: readonly string[] | undefined,
): boolean {
  if (allowedSchemes === undefined || allowedSchemes.length === 0) {
    return false;
  }
  return allowedSchemes.some(
    (entry) => entry.trim().toLowerCase().replace(/:$/, '') === scheme,
  );
}

/**
 * Returns `url` when it is safe to place in an `href`, and `about:blank` when
 * it is not — never the original, so a caller that ignores the result still
 * cannot navigate to a `javascript:` URL.
 *
 * Only relative URLs and allowlisted schemes pass (see the module comment).
 * `data:` and `blob:` are rejected for links because both can carry
 * `text/html` and run script in the page's origin on some browsers. Pass
 * `{ allowObjectUrls: true }` where the URL is one the component itself made
 * with `URL.createObjectURL` (a file preview or a download), which is not
 * attacker-controlled, and `allowedSchemes` to accept a custom protocol.
 */
export function sanitizeUrl(
  url: string | null | undefined,
  options: OgeSanitizeUrlOptions = {},
): string {
  if (url == null || url === '') return '';
  const scheme = schemeOf(url);
  if (scheme === null) return url;
  if (DEFAULT_SCHEMES.has(scheme)) return url;
  if (scheme === 'blob' || scheme === 'data') {
    return options.allowObjectUrls &&
      (scheme === 'blob' || !isMarkupDataUrl(url))
      ? url
      : 'about:blank';
  }
  if (SCRIPT_SCHEMES.has(scheme)) return 'about:blank';
  return extraSchemeAllowed(scheme, options.allowedSchemes)
    ? url
    : 'about:blank';
}

/**
 * The `src` variant: images never navigate, so `blob:` and non-markup `data:`
 * URLs (thumbnails, inline icons) are legitimate and allowed, while
 * `javascript:` and markup-bearing `data:` URLs are not.
 */
export function sanitizeResourceUrl(url: string | null | undefined): string {
  return sanitizeUrl(url, { allowObjectUrls: true });
}
