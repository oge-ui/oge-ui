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
 * The check mirrors Angular's: read the scheme and reject the ones that
 * execute. Relative URLs, fragments and query-only URLs carry no scheme and
 * always pass.
 */

/** Schemes that run code (or can be coerced into it) when navigated to. */
const UNSAFE_SCHEMES = new Set([
  'javascript',
  'vbscript',
  'livescript',
  'mocha',
  'data',
  'blob',
  'file',
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

/**
 * Returns `url` when it is safe to place in an `href`, and `about:blank` when
 * it is not — never the original, so a caller that ignores the result still
 * cannot navigate to a `javascript:` URL.
 *
 * `data:` and `blob:` are rejected for links because both can carry
 * `text/html` and run script in the page's origin on some browsers. Pass
 * `{ allowObjectUrls: true }` where the URL is one the component itself made
 * with `URL.createObjectURL` (a file preview or a download), which is not
 * attacker-controlled.
 */
export function sanitizeUrl(
  url: string | null | undefined,
  options: { allowObjectUrls?: boolean } = {},
): string {
  if (url == null || url === '') return '';
  const scheme = schemeOf(url);
  if (scheme === null) return url;
  if (
    options.allowObjectUrls &&
    (scheme === 'blob' || (scheme === 'data' && !isMarkupDataUrl(url)))
  ) {
    return url;
  }
  return UNSAFE_SCHEMES.has(scheme) ? 'about:blank' : url;
}

/**
 * The `src` variant: images never navigate, so `blob:` and non-markup `data:`
 * URLs (thumbnails, inline icons) are legitimate and allowed, while
 * `javascript:` and markup-bearing `data:` URLs are not.
 */
export function sanitizeResourceUrl(url: string | null | undefined): string {
  return sanitizeUrl(url, { allowObjectUrls: true });
}
