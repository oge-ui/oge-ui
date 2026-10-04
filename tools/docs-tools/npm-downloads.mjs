#!/usr/bin/env node
/**
 * Writes `apps/dev-app/public/npm-downloads.json`: all-time npm download
 * counts of every published package, collected at BUILD time.
 *
 * Why not in the browser: the home page used to call api.npmjs.org once per
 * package per year window (~40 requests per visit). npm rate-limits that, and
 * its 429 answers carry no CORS header, so browsers reported every call as
 * "blocked by CORS" — and the site's CSP does not allow api.npmjs.org anyway.
 * One same-origin JSON, refreshed on every deploy, has neither problem.
 *
 * Never fails the build: a package whose count cannot be fetched keeps the
 * value already in the file (committed as the offline fallback).
 *
 *   node tools/docs-tools/npm-downloads.mjs
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(root, 'apps/dev-app/public/npm-downloads.json');
/** First day any OGE package existed on npm — counts start here. */
const SINCE = '2026-01-01';
const CONCURRENCY = 2;

/** Published package names: every non-private package.json under packages/. */
function publishedPackages() {
  const names = [];
  const visit = (dir, depth) => {
    const manifest = join(dir, 'package.json');
    if (existsSync(manifest)) {
      const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
      if (pkg.name && !pkg.private) names.push(pkg.name);
      return;
    }
    if (depth === 0) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        visit(join(dir, entry.name), depth - 1);
      }
    }
  };
  visit(join(root, 'packages'), 2);
  return [...new Set(names)].sort();
}

/** npm caps a range at ~18 months: split the lifetime into yearly windows. */
function windows() {
  const iso = (date) => date.toISOString().slice(0, 10);
  const today = new Date();
  const out = [];
  let from = new Date(`${SINCE}T00:00:00Z`);
  while (from <= today) {
    const to = new Date(from);
    to.setUTCFullYear(to.getUTCFullYear() + 1);
    to.setUTCDate(to.getUTCDate() - 1);
    const end = to < today ? to : today;
    out.push(`${iso(from)}:${iso(end)}`);
    from = new Date(end);
    from.setUTCDate(from.getUTCDate() + 1);
  }
  return out;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** One window's count; retries rate limiting, throws when it cannot tell. */
async function windowCount(pkg, range) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(
      `https://api.npmjs.org/downloads/point/${range}/${pkg}`,
    );
    if (res.status === 429 || res.status >= 500) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${range}`);
    const body = await res.json();
    if (typeof body.downloads !== 'number') {
      throw new Error(`no count for ${range}`);
    }
    return body.downloads;
  }
  throw new Error(`still rate-limited for ${range}`);
}

async function count(pkg, ranges) {
  let total = 0;
  for (const range of ranges) {
    total += await windowCount(pkg, range);
    await sleep(250); // stay well under npm's rate limit
  }
  return total;
}

const previous = existsSync(OUT)
  ? (JSON.parse(readFileSync(OUT, 'utf8')).packages ?? {})
  : {};
const packages = publishedPackages();
const ranges = windows();
const result = {};
let fresh = 0;

const queue = [...packages];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const pkg = queue.shift();
      try {
        result[pkg] = await count(pkg, ranges);
        fresh++;
      } catch (error) {
        if (typeof previous[pkg] === 'number') result[pkg] = previous[pkg];
        console.warn(
          `npm-downloads: kept previous count for ${pkg} (${error.message})`,
        );
      }
    }
  }),
);

const sorted = Object.fromEntries(
  Object.keys(result)
    .sort()
    .map((name) => [name, result[name]]),
);
writeFileSync(
  OUT,
  `${JSON.stringify({ since: SINCE, generatedAt: new Date().toISOString(), packages: sorted }, null, 2)}\n`,
);
console.log(
  `✓ npm-downloads: ${fresh}/${packages.length} packages fetched → apps/dev-app/public/npm-downloads.json`,
);
