#!/usr/bin/env node
/**
 * Size budgets per published entry point (gzip), size-limit style.
 *
 * The entry list is generated from the dist folders, not maintained by
 * hand: every subpath in each publishable package's `exports` map (and
 * every file a `./x/*` pattern covers), resolved to the file a bundler
 * loads — the ESM build (`module` / `import` / `default` condition) for
 * JavaScript, the file itself for stylesheets. A JavaScript entry is
 * measured with the package-internal chunks it statically imports
 * (relative `import` / `export … from`), concatenated and gzipped at level 9;
 * other packages and peers are not included, so each number is what that
 * entry point itself adds to an app. Line endings are normalised to `\n`
 * first, so a Windows build and the Linux CI build measure the same bytes.
 *
 * The committed baseline is `tools/size-budgets.json`. The check fails when
 * an entry grows more than `tolerance` (10 %) over its baseline, when an
 * entry has no baseline yet, and reports entries that shrank by more than
 * the tolerance or disappeared (re-baseline so the budget tightens).
 *
 *   node tools/size-check.mjs            # check against the baseline
 *   node tools/size-check.mjs --update   # rewrite the baseline from dist
 *   node tools/size-check.mjs --report   # print every entry
 *
 * Run after the builds: `npx nx run @oge/source:size-check`.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { ROOT, publishablePackages } from './release/publishable.mjs';

const BUDGETS = join(ROOT, 'tools', 'size-budgets.json');
const args = new Set(process.argv.slice(2));

/** The file a bundler picks for an export target (ESM first). */
function pickTarget(target) {
  if (typeof target === 'string') return target;
  if (!target || typeof target !== 'object') return null;
  for (const condition of ['module', 'import', 'default']) {
    if (condition in target) {
      const picked = pickTarget(target[condition]);
      if (picked) return picked;
    }
  }
  return null;
}

/** `[subpath, file]` pairs for every measurable entry point of a package. */
function entryPoints(pkg) {
  const { manifest, distDir } = pkg;
  const exportsField = manifest.exports ?? {
    '.': manifest.module ?? manifest.main,
  };
  const out = [];
  for (const [subpath, target] of Object.entries(exportsField)) {
    if (subpath === './package.json') continue;
    const file = pickTarget(target);
    if (!file || !/\.(m?js|cjs|css)$/.test(file.replace('*', 'x.css')))
      continue;
    if (subpath.includes('*')) {
      // `./themes/*` → one entry per file the pattern covers
      const [prefix, suffix] = file.split('*');
      const dir = join(distDir, dirname(`${prefix}x`));
      if (!existsSync(dir)) continue;
      for (const name of readdirSync(dir).sort()) {
        const rel = `./${relative(distDir, join(dir, name)).replace(/\\/g, '/')}`;
        if (
          !rel.startsWith(prefix) ||
          !rel.endsWith(suffix) ||
          !/\.(m?js|css)$/.test(rel)
        )
          continue;
        const middle = rel.slice(prefix.length, rel.length - suffix.length);
        out.push([subpath.replace('*', middle), rel]);
      }
    } else {
      out.push([subpath, file]);
    }
  }
  return out;
}

const RELATIVE_IMPORT =
  /(?:\bimport\s*(?:[\w$*{}\s,]+?\s*from\s*)?|\bexport\s*(?:[\w$*{}\s,]+?\s*)from\s*)(['"])(\.{1,2}\/[^'"]+)\1/g;

/** entry file + every package-internal chunk it statically imports */
function closure(entry) {
  const seen = new Set();
  const visit = (file) => {
    if (seen.has(file) || !existsSync(file)) return;
    seen.add(file);
    if (file.endsWith('.css')) return;
    const code = readFileSync(file, 'utf8');
    for (const match of code.matchAll(RELATIVE_IMPORT)) {
      visit(resolve(dirname(file), match[2]));
    }
  };
  visit(entry);
  return [...seen];
}

function measure(pkg) {
  const sizes = {};
  for (const [subpath, file] of entryPoints(pkg)) {
    const files = closure(resolve(pkg.distDir, file));
    const source = files
      .map((f) => readFileSync(f, 'utf8').replace(/\r\n/g, '\n'))
      .join('\n');
    const key = subpath === '.' ? pkg.name : `${pkg.name}${subpath.slice(1)}`;
    sizes[key] = gzipSync(source, { level: 9 }).length;
  }
  return sizes;
}

const kb = (bytes) => `${(bytes / 1024).toFixed(2)} kB`;

const packages = publishablePackages({ requireDist: true });
const current = {};
for (const pkg of packages) Object.assign(current, measure(pkg));
const sorted = Object.fromEntries(
  Object.entries(current).sort(([a], [b]) => a.localeCompare(b)),
);

const baseline = existsSync(BUDGETS)
  ? JSON.parse(readFileSync(BUDGETS, 'utf8'))
  : { tolerance: 0.1, entries: {} };

if (args.has('--update')) {
  writeFileSync(
    BUDGETS,
    JSON.stringify(
      {
        $comment:
          'Gzip size baseline (bytes) per published entry point, generated by `node tools/size-check.mjs --update` from the dist folders. CI fails when an entry grows more than `tolerance` over its number. Re-baseline only for intended growth, and say why in the PR.',
        tolerance: baseline.tolerance ?? 0.1,
        entries: sorted,
      },
      null,
      2,
    ) + '\n',
  );
  const total = Object.values(sorted).reduce((a, b) => a + b, 0);
  console.log(
    `size-check: baseline written — ${Object.keys(sorted).length} entry points, ${kb(total)} gzip in total.`,
  );
  process.exit(0);
}

const tolerance = baseline.tolerance ?? 0.1;
const failures = [];
const notes = [];
for (const [key, size] of Object.entries(sorted)) {
  const base = baseline.entries[key];
  if (args.has('--report')) console.log(`${kb(size).padStart(11)}  ${key}`);
  if (base === undefined) {
    failures.push(`${key}: ${kb(size)} — new entry point with no budget yet`);
    continue;
  }
  const change = (size - base) / base;
  if (change > tolerance) {
    failures.push(
      `${key}: ${kb(base)} → ${kb(size)} (+${(change * 100).toFixed(1)} %), over the ${tolerance * 100} % budget`,
    );
  } else if (change < -tolerance) {
    notes.push(
      `${key}: ${kb(base)} → ${kb(size)} (${(change * 100).toFixed(1)} %) — re-baseline to tighten the budget`,
    );
  }
}
for (const key of Object.keys(baseline.entries)) {
  if (!(key in sorted))
    notes.push(`${key}: in the baseline but no longer published — re-baseline`);
}

for (const note of notes) console.warn(`note: ${note}`);
if (failures.length) {
  console.error(`size-check: ${failures.length} entry point(s) over budget:`);
  for (const f of failures) console.error(`  ${f}`);
  console.error(
    '\nIf the growth is intended, run `node tools/size-check.mjs --update` after the builds and commit ' +
      'tools/size-budgets.json with a sentence in the PR on why the entry got bigger.',
  );
  process.exit(1);
}
console.log(
  `size-check: ${Object.keys(sorted).length} entry points within ${tolerance * 100} % of their budget.`,
);
