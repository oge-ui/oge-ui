/**
 * Verifies that every built React package keeps its `'use client'` banner.
 *
 * The React sources carry `'use client'`, but Rollup strips module-level
 * directives when it bundles, so each package's Vite config re-adds it with
 * `output.banner` (ARCHITECTURE → "React package template"). If that banner
 * goes missing — a config refactor, a new entry built by a different
 * pipeline, a minifier that drops the prologue — every package still builds
 * and every spec still passes, and importing the component from a React
 * Server Component (Next.js App Router) crashes at runtime. So this reads the
 * dist, not the sources: every JavaScript file a React package ships (the
 * entries its `package.json` exports and the chunks beside them) must start
 * with the directive.
 *
 *   node tools/check-use-client.mjs [--dist dist/packages/react]
 *
 * Run after the React builds: `npx nx run @oge/source:use-client-check`.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const args = process.argv.slice(2);
const distIndex = args.indexOf('--dist');
const DIST = distIndex >= 0 ? args[distIndex + 1] : 'dist/packages/react';
const SOURCES = 'packages/react';

/** A directive prologue starting with `'use client'` (either quote style). */
const BANNER = /^(?:#![^\n]*\n)?\s*(['"])use client\1\s*;?/;

/** Every file a package.json `exports` map points at. */
function exportTargets(exportsField) {
  const out = [];
  const walk = (value) => {
    if (typeof value === 'string') out.push(value);
    else if (value && typeof value === 'object')
      Object.values(value).forEach(walk);
  };
  walk(exportsField);
  return out;
}

const packages = readdirSync(SOURCES).filter((name) =>
  existsSync(join(SOURCES, name, 'package.json')),
);
const problems = [];
let checked = 0;

for (const name of packages) {
  const dist = join(DIST, name);
  const manifestPath = join(dist, 'package.json');
  if (!existsSync(manifestPath)) {
    problems.push(`${dist}: not built — run the React builds first`);
    continue;
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const files = new Set(
    [manifest.main, manifest.module, ...exportTargets(manifest.exports)]
      .filter((file) => typeof file === 'string')
      .map((file) => file.replace(/^\.\//, ''))
      .filter((file) => /\.(c|m)?js$/.test(file)),
  );
  // chunks shared between the entries ship beside them and run first
  for (const entry of readdirSync(dist)) {
    if (/\.(c|m)?js$/.test(entry) && statSync(join(dist, entry)).isFile()) {
      files.add(entry);
    }
  }
  if (files.size === 0) {
    problems.push(`${dist}: no JavaScript entry found`);
    continue;
  }
  for (const file of files) {
    const path = join(dist, file);
    if (!existsSync(path)) {
      problems.push(`${relative('.', path)}: exported but missing`);
      continue;
    }
    checked += 1;
    const head = readFileSync(path, 'utf8').slice(0, 200);
    if (!BANNER.test(head)) {
      problems.push(
        `${relative('.', path)}: does not start with 'use client' ` +
          `(found ${JSON.stringify(head.slice(0, 40))}…)`,
      );
    }
  }
}

if (problems.length) {
  console.error(
    `✗ React dist files without the 'use client' banner:\n\n  ${problems.join('\n  ')}\n\n` +
      `  The Vite config's output.banner re-adds the directive Rollup strips; ` +
      `see docs/ARCHITECTURE.md → "React package template".`,
  );
  process.exit(1);
}
console.log(
  `✓ 'use client' leads all ${checked} JavaScript files of ${packages.length} React packages`,
);
