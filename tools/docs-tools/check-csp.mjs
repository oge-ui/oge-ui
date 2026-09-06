/**
 * Verifies the deployed Content-Security-Policy against what the build
 * actually emits.
 *
 * The docs site is served from a static host, so its CSP lives in
 * `vercel.json` as a fixed string — it cannot mint a per-request nonce. The
 * only inline script the build produces is Angular's deferred-stylesheet
 * handler (`<link media="print" onload="this.media='all'">`), and the policy
 * admits exactly that one by hash rather than opening the door with
 * `'unsafe-inline'`.
 *
 * That is a good trade only while it stays true. If an Angular upgrade
 * changes the snippet by a single character the hash stops matching, the
 * stylesheet never flips from `media="print"`, and the site ships unstyled —
 * a failure that no test would otherwise catch, because everything still
 * builds and renders locally where no CSP is enforced.
 *
 * So: build, then run this. It fails when the built HTML contains an inline
 * script or event handler the policy does not cover.
 *
 *   node tools/docs-tools/check-csp.mjs [--dist <dir>]
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const args = process.argv.slice(2);
const distIndex = args.indexOf('--dist');
const DIST = distIndex >= 0 ? args[distIndex + 1] : 'dist/apps/dev-app/browser';
const VERCEL = 'vercel.json';

/** Every `.html` under `dir`, recursively. */
async function htmlFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(path)));
    else if (entry.name.endsWith('.html')) out.push(path);
  }
  return out;
}

const sha256 = (text) =>
  `sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}`;

/** The `script-src` directive of the site-wide policy in vercel.json. */
function scriptSrc() {
  const config = JSON.parse(readFileSync(VERCEL, 'utf8'));
  const header = (config.headers ?? [])
    .flatMap((entry) => entry.headers ?? [])
    .find((h) => h.key.toLowerCase() === 'content-security-policy');
  if (!header) {
    console.error(`✗ ${VERCEL} declares no Content-Security-Policy header.`);
    process.exit(1);
  }
  const directive = header.value
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('script-src'));
  if (!directive) {
    console.error(`✗ the CSP in ${VERCEL} has no script-src directive.`);
    process.exit(1);
  }
  return new Set(directive.split(/\s+/).slice(1));
}

/**
 * The HTML event-handler content attributes — the ones CSP actually gates.
 * An explicit list, because `on[a-z]+` also matches component inputs that
 * merely start with "on": the toggle demo renders `ontext="AÇIK"` from an
 * `onText` input, which is a string, not code.
 */
const HANDLER_ATTRS = new Set(
  (
    'abort auxclick beforeinput beforematch beforetoggle blur cancel canplay ' +
    'canplaythrough change click close contextlost contextmenu contextrestored ' +
    'copy cuechange cut dblclick drag dragend dragenter dragleave dragover ' +
    'dragstart drop durationchange emptied ended error focus formdata input ' +
    'invalid keydown keypress keyup load loadeddata loadedmetadata loadstart ' +
    'mousedown mouseenter mouseleave mousemove mouseout mouseover mouseup ' +
    'paste pause play playing progress ratechange reset resize scroll ' +
    'scrollend securitypolicyviolation seeked seeking select slotchange ' +
    'stalled submit suspend timeupdate toggle transitionend volumechange ' +
    'waiting wheel'
  ).split(' '),
);

const INLINE_HANDLER = /\son([a-z]+)\s*=\s*"([^"]*)"/gi;
// `type` is captured so data blocks (application/ld+json) can be skipped —
// the browser never executes those, and CSP does not gate them.
const INLINE_SCRIPT = /<script([^>]*)>([\s\S]*?)<\/script>/gi;

const sources = scriptSrc();
const allowsAllInline = sources.has("'unsafe-inline'");
const allowsHashedHandlers = sources.has("'unsafe-hashes'");
const problems = [];
/** Hash → the files it was seen in, for the "policy is stale" report. */
const seen = new Map();

for (const file of await htmlFiles(DIST)) {
  const html = readFileSync(file, 'utf8');
  const where = relative(process.cwd(), file);

  for (const [, event, code] of html.matchAll(INLINE_HANDLER)) {
    if (!HANDLER_ATTRS.has(event.toLowerCase())) continue;
    const hash = sha256(code);
    seen.set(hash, [...(seen.get(hash) ?? []), where]);
    if (allowsAllInline) continue;
    if (!sources.has(`'${hash}'`)) {
      problems.push(
        `${where}: inline handler "${code}" is not allowed by script-src.\n` +
          `    add '${hash}' (and 'unsafe-hashes') to the policy, or stop emitting it`,
      );
    } else if (!allowsHashedHandlers) {
      problems.push(
        `${where}: inline handler "${code}" is hashed in the policy, but a hash ` +
          `only covers an event-handler attribute when 'unsafe-hashes' is also present`,
      );
    }
  }

  for (const [, attrs, code] of html.matchAll(INLINE_SCRIPT)) {
    if (/\ssrc\s*=/.test(attrs)) continue;
    const type = /\stype\s*=\s*"([^"]*)"/i.exec(attrs)?.[1]?.toLowerCase();
    // non-executable data blocks are not script for CSP purposes
    if (type && type !== 'text/javascript' && type !== 'module') continue;
    if (!code.trim()) continue;
    const hash = sha256(code);
    seen.set(hash, [...(seen.get(hash) ?? []), where]);
    if (allowsAllInline || sources.has(`'${hash}'`)) continue;
    problems.push(
      `${where}: inline <script> is not allowed by script-src.\n` +
        `    add '${hash}' to the policy, or move the code into a bundled file`,
    );
  }
}

// A hash nobody emits any more is not a failure, but it is rot: it says the
// build changed and the policy was not revisited.
const stale = [...sources].filter(
  (source) => source.startsWith("'sha256-") && !seen.has(source.slice(1, -1)),
);

if (problems.length) {
  console.error(
    `✗ the CSP in ${VERCEL} does not cover what ${DIST} emits:\n\n  ` +
      problems.join('\n  ') +
      '\n',
  );
  process.exit(1);
}

if (allowsAllInline) {
  console.warn(
    `! script-src allows 'unsafe-inline', so nothing here is enforced. ` +
      `Hash the ${seen.size} inline block(s) instead.`,
  );
}
for (const source of stale) {
  console.warn(`! ${source} in the policy matches nothing the build emits.`);
}
console.log(
  `✓ CSP covers every inline script in ${DIST} (${seen.size} hashed block(s))`,
);
