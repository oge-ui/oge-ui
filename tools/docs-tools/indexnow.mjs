#!/usr/bin/env node
/**
 * Tells IndexNow (Bing, Yandex, Seznam, Naver…) that every URL in the sitemap
 * may have changed, so a new release is re-crawled within hours instead of
 * weeks. Bing's index also feeds ChatGPT search and Copilot, so this is the
 * cheapest lever we have on AI-assistant visibility.
 *
 * Runs at the end of the Vercel build, production deploys only
 * (`VERCEL_ENV=production`); pass `--force` to run it anywhere, `--dry-run`
 * to print the payload without sending it.
 *
 * Ownership is proven by the key file `apps/dev-app/public/<KEY>.txt`, served
 * at https://www.ogeui.com/<KEY>.txt. The key is not a secret — IndexNow keys
 * are public by design; rotating it means renaming that file and changing KEY.
 *
 * Never fails the build: any network or API error is logged and ignored.
 *
 *   node tools/docs-tools/indexnow.mjs [--force] [--dry-run]
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const HOST = 'www.ogeui.com';
const KEY = '3b04bcadbf8bebe46009e01024a81351';
const SITEMAP = join(root, 'apps/dev-app/public/sitemap.xml');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');

if (
  !args.has('--force') &&
  !dryRun &&
  process.env.VERCEL_ENV !== 'production'
) {
  console.log(
    `indexnow: skipped (VERCEL_ENV=${process.env.VERCEL_ENV ?? 'unset'})`,
  );
  process.exit(0);
}

const urlList = [
  ...readFileSync(SITEMAP, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g),
]
  .map((m) => m[1].trim())
  .filter((url) => new URL(url).host === HOST);

const payload = {
  host: HOST,
  key: KEY,
  keyLocation: `https://${HOST}/${KEY}.txt`,
  urlList,
};

if (dryRun) {
  console.log(`indexnow: would submit ${urlList.length} URLs`, {
    ...payload,
    urlList: urlList.slice(0, 3),
  });
  process.exit(0);
}

try {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
  // 200 = accepted, 202 = accepted while the key is being verified.
  console.log(`indexnow: ${res.status} for ${urlList.length} URLs`);
  if (!res.ok) console.log(await res.text());
} catch (error) {
  console.log(`indexnow: not sent (${error?.message ?? error})`);
}
