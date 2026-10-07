#!/usr/bin/env node
/**
 * MIT ↔ commercial boundary gate (docs/ARCHITECTURE.md → "Licensing",
 * ADR 0003).
 *
 * The commercial tier is six families — pivot, bpmn, scheduler, gantt,
 * kanban, charts — each in three packages: the Angular package, its
 * framework-free `@oge-ui/<family>-engine` and its `@oge-ui/react-<family>`
 * render layer. Everything else is MIT and carries a public "will remain
 * MIT" commitment, so an MIT package must never pull a commercial one in.
 * This fails when
 *
 * 1. a package's `license` field disagrees with that list (a commercial
 *    package published as MIT, or an MIT package relicensed by accident),
 *    or its `LICENSE` file is missing / of the other kind;
 * 2. an MIT package lists a commercial package in `dependencies`,
 *    `optionalDependencies` or a non-optional `peerDependencies` entry;
 * 3. an MIT package's built JavaScript (`dist/…`) imports or requires a
 *    commercial package — a value import the manifest might not show.
 *
 * The one sanctioned edge is type-level: `@oge-ui/locales` types its
 * commercial slices with `import type` from the engines, which the build
 * erases; the engines are *optional* peers there. Optional peers of an MIT
 * package are therefore allowed only when listed in `TYPE_ONLY_PEERS`
 * below, and rule 3 still proves no value import survived the build.
 *
 *   node tools/license-boundary-check.mjs [--manifests-only]
 *
 * `--manifests-only` skips rule 3 (no build needed); the Nx target
 * `@oge/source:license-boundary-check` runs it after the builds.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isMit, publishablePackages } from './release/publishable.mjs';

/**
 * ADR 0003 — the authoritative commercial list, kept in
 * `tools/commercial-families.json` so the docs site's bundle-size page marks
 * the same packages this gate enforces.
 */
const COMMERCIAL_FAMILIES = JSON.parse(
  readFileSync(new URL('./commercial-families.json', import.meta.url), 'utf8'),
).families;
const COMMERCIAL = new Set(
  COMMERCIAL_FAMILIES.flatMap((f) => [
    `@oge-ui/${f}`,
    `@oge-ui/${f}-engine`,
    `@oge-ui/react-${f}`,
  ]),
);

/** MIT package → commercial packages it may name as optional, type-only peers. */
const TYPE_ONLY_PEERS = {
  '@oge-ui/locales': COMMERCIAL_FAMILIES.map((f) => `@oge-ui/${f}-engine`),
};

const manifestsOnly = process.argv.includes('--manifests-only');
const packages = publishablePackages({ requireDist: !manifestsOnly });
const failures = [];

for (const name of COMMERCIAL) {
  if (!packages.some((p) => p.name === name)) {
    failures.push(
      `${name} is on the ADR 0003 commercial list but is not a release project — update the list or nx.json`,
    );
  }
}

function licenseKind(file) {
  if (!existsSync(file)) return null;
  const text = readFileSync(file, 'utf8');
  return /^\s*MIT License/i.test(text) ? 'MIT' : 'commercial';
}

/** every .js / .mjs / .cjs file under a dist folder */
function scripts(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...scripts(path));
    else if (/\.(c|m)?js$/.test(entry.name)) out.push(path);
  }
  return out;
}

const commercialSpecifier = new RegExp(
  String.raw`(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s+)(['"])(${[
    ...COMMERCIAL,
  ]
    .map((n) => n.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'))
    .join('|')})(?:/[^'"]*)?\1`,
  'g',
);

for (const pkg of packages) {
  const commercial = COMMERCIAL.has(pkg.name);
  const expected = commercial ? 'SEE LICENSE IN LICENSE' : 'MIT';
  if (pkg.license !== expected) {
    failures.push(
      `${pkg.name}: "license" is ${JSON.stringify(pkg.license)}, expected ${JSON.stringify(expected)} (ADR 0003)`,
    );
  }
  const kind = licenseKind(join(pkg.root, 'LICENSE'));
  if (kind === null)
    failures.push(`${pkg.name}: ${pkg.root}/LICENSE is missing`);
  else if ((kind === 'MIT') === commercial) {
    failures.push(
      `${pkg.name}: ${pkg.root}/LICENSE is a${kind === 'MIT' ? 'n MIT' : ' commercial'} licence, expected the other kind`,
    );
  }
  if (!manifestsOnly && licenseKind(join(pkg.distDir, 'LICENSE')) === null) {
    failures.push(
      `${pkg.name}: ${pkg.dist}/LICENSE is missing — the tarball would ship without its licence`,
    );
  }
  if (!isMit(pkg)) continue;

  const optionalPeers = new Set(
    Object.entries(pkg.source.peerDependenciesMeta ?? {})
      .filter(([, meta]) => meta?.optional)
      .map(([dep]) => dep),
  );
  for (const field of [
    'dependencies',
    'optionalDependencies',
    'peerDependencies',
  ]) {
    for (const dep of Object.keys(pkg.source[field] ?? {})) {
      if (!COMMERCIAL.has(dep)) continue;
      const sanctioned =
        field === 'peerDependencies' &&
        optionalPeers.has(dep) &&
        (TYPE_ONLY_PEERS[pkg.name] ?? []).includes(dep);
      if (!sanctioned) {
        failures.push(`${pkg.name} (MIT) lists commercial ${dep} in ${field}`);
      }
    }
  }

  if (manifestsOnly) continue;
  for (const file of scripts(pkg.distDir)) {
    const code = readFileSync(file, 'utf8');
    for (const match of code.matchAll(commercialSpecifier)) {
      failures.push(
        `${pkg.name} (MIT): ${file.slice(pkg.distDir.length + 1)} imports commercial ${match[2]}`,
      );
    }
  }
}

if (failures.length) {
  console.error(`license-boundary-check: ${failures.length} problem(s):`);
  for (const f of failures) console.error(`  ${f}`);
  console.error(
    '\nAn MIT package may never depend on a commercial one (docs/ARCHITECTURE.md → "Licensing").',
  );
  process.exit(1);
}
const mit = packages.filter(isMit).length;
console.log(
  `license-boundary-check: ${mit} MIT and ${packages.length - mit} commercial packages; no MIT → commercial edge` +
    (manifestsOnly ? ' (manifests only)' : ''),
);
