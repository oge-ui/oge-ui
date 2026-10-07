/**
 * Serves the prerendered docs site (`dist/apps/dev-app/browser`) the way the
 * production host does, for the SSR / hydration / CSP end-to-end specs
 * (`apps/dev-app-e2e/ssr`).
 *
 * - Routing mirrors `vercel.json`: its `redirects` are answered first, then a
 *   path is served from `<path>/index.html`, then as a file, and anything
 *   else falls back to `index.csr.html` (the `rewrites` rule).
 * - Every response carries the `vercel.json` headers, so the hydration crawl
 *   runs under the **production** CSP. `upgrade-insecure-requests` and HSTS
 *   are dropped: this server speaks plain HTTP on localhost.
 * - A request with `x-oge-csp: strict` instead gets a **strict** policy with a
 *   fresh nonce: nonce-only `script-src` with `'strict-dynamic'`, nonce-only
 *   `<style>` elements, `require-trusted-types-for 'script'` and a
 *   `trusted-types` allowlist of Angular's policy plus every `oge-ui#…`
 *   policy documented in SECURITY.md. The HTML is rewritten the way a
 *   nonce-injecting SSR server or edge function would: `nonce` on every
 *   `<script>`, `<style>`, stylesheet and module-preload link, and
 *   `ngCspNonce` on `<app-root>` so the styles Angular adds at runtime carry
 *   it too.
 *
 *   node tools/docs-tools/serve-prerendered.mjs [--port 4323] [--dist <dir>]
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const PORT = Number(option('--port', '4323'));
const DIST = resolve(option('--dist', 'dist/apps/dev-app/browser'));
const VERCEL = JSON.parse(readFileSync('vercel.json', 'utf8'));

if (!existsSync(join(DIST, 'index.csr.html'))) {
  console.error(
    `✗ ${DIST} holds no prerendered build — run \`npx nx run dev-app:build\` first.`,
  );
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
};

/** `vercel.json` `source` patterns are path-to-regexp; ours are plain or `(.*)`. */
const sourceRegex = (source) =>
  new RegExp(`^${source.replace(/\(\.\*\)/g, '.*')}$`);

const REDIRECTS = (VERCEL.redirects ?? []).map((entry) => ({
  ...entry,
  regex: sourceRegex(entry.source),
}));
const HEADER_RULES = (VERCEL.headers ?? []).map((entry) => ({
  ...entry,
  regex: sourceRegex(entry.source),
}));

/** Directives a plain-HTTP localhost server must not send. */
const LOCAL_ONLY_DROP = new Set(['upgrade-insecure-requests']);
const DROPPED_HEADERS = new Set(['strict-transport-security']);

function productionHeaders(path) {
  const headers = {};
  for (const rule of HEADER_RULES) {
    if (!rule.regex.test(path)) continue;
    for (const { key, value } of rule.headers) {
      const name = key.toLowerCase();
      if (DROPPED_HEADERS.has(name)) continue;
      headers[name] =
        name === 'content-security-policy'
          ? value
              .split(';')
              .map((part) => part.trim())
              .filter((part) => !LOCAL_ONLY_DROP.has(part))
              .join('; ')
          : value;
    }
  }
  return headers;
}

/** Every `oge-ui#…` Trusted Types policy SECURITY.md documents. */
const OGE_POLICIES = [
  ...new Set(readFileSync('SECURITY.md', 'utf8').match(/oge-ui#[a-z-]+/g)),
];

/**
 * Angular's sanitizing `[innerHTML]` uses `angular`, lazy chunks
 * `angular#bundler`; `oge-docs#json-ld` is the docs app's own (its breadcrumb
 * JSON-LD, `seo.service.ts`). Deliberately absent: `angular#unsafe-bypass` —
 * nothing in the suite or the docs may call a `bypassSecurityTrust*` API.
 */
const TRUSTED_TYPES = [
  'angular',
  'angular#bundler',
  'oge-docs#json-ld',
  ...OGE_POLICIES,
];

function strictPolicy(nonce) {
  return [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    // style *attributes* (`style="height: 380px"` in a template, SVG
    // presentation) cannot run script and carry no nonce; the strict part is
    // that no <style> element without the nonce applies
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    // "Open in StackBlitz" POSTs the demo project to stackblitz.com/run
    "form-action 'self' https://stackblitz.com",
    "require-trusted-types-for 'script'",
    `trusted-types ${TRUSTED_TYPES.join(' ')}`,
  ].join('; ');
}

const NONCE_TAGS =
  /<(script|style)(?=[\s>])|<link(?=[^>]*\brel="(?:stylesheet|modulepreload|preload)")/gi;

function addNonces(html, nonce) {
  return html
    .replace(NONCE_TAGS, (tag) => `${tag} nonce="${nonce}"`)
    .replace(/<app-root(?=[\s>])/, `<app-root ngCspNonce="${nonce}"`);
}

/** The file a request path resolves to, or `null` (→ the CSR shell). */
function resolveFile(path) {
  const decoded = decodeURIComponent(path);
  const target = normalize(join(DIST, decoded));
  if (target !== DIST && !target.startsWith(DIST + sep)) return null;
  for (const candidate of [join(target, 'index.html'), target]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://localhost:${PORT}`);
  const path = url.pathname;

  const redirect = REDIRECTS.find((entry) => entry.regex.test(path));
  if (redirect) {
    response.writeHead(redirect.permanent ? 308 : 307, {
      location: redirect.destination + url.search,
    });
    response.end();
    return;
  }

  const file = resolveFile(path) ?? join(DIST, 'index.csr.html');
  const type = TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
  const headers = { ...productionHeaders(path), 'content-type': type };
  let body = readFileSync(file);

  if (request.headers['x-oge-csp'] === 'strict') {
    const nonce = randomBytes(16).toString('base64');
    headers['content-security-policy'] = strictPolicy(nonce);
    if (type.startsWith('text/html')) {
      body = Buffer.from(addNonces(body.toString('utf8'), nonce), 'utf8');
    }
  }

  response.writeHead(200, { ...headers, 'cache-control': 'no-store' });
  response.end(body);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`serving ${DIST} on http://localhost:${PORT}`);
});
