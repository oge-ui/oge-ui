/**
 * Writes `404.html` next to the prerendered docs — the page the static host
 * serves, **with a 404 status**, for every URL no file matches.
 *
 *   node tools/docs-tools/not-found-page.mjs [--dist dist/apps/dev-app/browser]
 *
 * It is the client-only shell (`index.csr.html`): the router's `**` route
 * renders the not-found page in the browser, so there is no prerendered markup
 * to hydrate against a URL it was not rendered for. The shell's head is the
 * home page's, so it is rewritten here: `noindex`, no canonical and a
 * not-found title — before this, every unknown URL answered 200 with the
 * home page's canonical and Google reported them as soft 404s.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const at = args.indexOf('--dist');
const DIST = resolve(at >= 0 ? args[at + 1] : 'dist/apps/dev-app/browser');

const shell = readFileSync(join(DIST, 'index.csr.html'), 'utf8');
const html = shell
  .replace(/<link rel="canonical"[^>]*>\s*/, '')
  .replace(
    /<meta name="robots" content="[^"]*"\s*\/?>/,
    '<meta name="robots" content="noindex, follow">',
  )
  .replace(/<title>[^<]*<\/title>/, '<title>Page not found | OGE UI</title>');

for (const [label, ok] of [
  ['robots noindex', html.includes('content="noindex, follow"')],
  ['canonical removed', !/rel="canonical"/.test(html)],
  ['title', html.includes('<title>Page not found | OGE UI</title>')],
]) {
  if (!ok) {
    console.error(
      `✗ 404.html: could not rewrite the ${label} — did index.html change?`,
    );
    process.exit(1);
  }
}

writeFileSync(join(DIST, '404.html'), html);
console.log(`✓ ${join(DIST, '404.html')}`);
