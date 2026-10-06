import { sanitizeResourceUrl } from '@oge-ui/behavior';

/**
 * An item image's `src`, or `undefined` when there is none or the URL is
 * unsafe. `sanitizeResourceUrl` answers an unsafe URL (a markup-bearing
 * `data:` URL such as an SVG, a `javascript:` URL) with `about:blank`, which
 * is right for an `href` but makes an `<img>` *load* `about:blank` — a
 * request every strict `img-src` policy reports as a CSP violation. No `src`
 * is the same blank image without the request (the signature pad already
 * treats `about:blank` this way).
 */
export function itemImageSrc(
  url: string | null | undefined,
): string | undefined {
  const src = sanitizeResourceUrl(url);
  return src && src !== 'about:blank' ? src : undefined;
}
