/**
 * The publishable packages, as the release gates see them.
 *
 * The list comes from `nx.json` → `release.projects` (the same list
 * `nx release` versions and publishes), each project's root from its
 * `project.json`, and its npm payload from `dist/<root>` — the folder
 * `nx-release-publish` packs. Shared by `package-check.mjs`,
 * `size-check.mjs`, `license-boundary-check.mjs` and the release workflow's
 * publish order.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

/** project name → project root (posix, workspace-relative) */
function projectRoots() {
  const roots = new Map();
  const visit = (dir, depth) => {
    if (depth > 3) return;
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'node_modules') continue;
      const rel = `${dir}/${entry.name}`;
      const projectJson = join(ROOT, rel, 'project.json');
      if (existsSync(projectJson)) roots.set(readJson(projectJson).name, rel);
      visit(rel, depth + 1);
    }
  };
  visit('packages', 1);
  return roots;
}

/**
 * Package layout, which decides what "correct" means for it:
 * - `apf`: Angular Package Format (ng-packagr) — ESM only by design;
 * - `react`: Vite library mode — `"type": "module"`, ESM + CJS;
 * - `rollup`: `@nx/rollup` (core, behavior, locales, engines) — CJS + ESM
 *   in a typeless package.
 */
function layoutOf(distDir, manifest) {
  if (existsSync(join(distDir, 'fesm2022'))) return 'apf';
  if (manifest.type === 'module') return 'react';
  return 'rollup';
}

/**
 * @returns {{ project: string, root: string, dist: string, distDir: string,
 *   name: string, version: string, license: string, layout: string,
 *   source: object, manifest: object | null }[]}
 */
export function publishablePackages({ requireDist = false } = {}) {
  const projects = readJson(join(ROOT, 'nx.json')).release.projects;
  const roots = projectRoots();
  return projects.map((project) => {
    const root = roots.get(project);
    if (!root)
      throw new Error(
        `release project "${project}" has no project.json under packages/`,
      );
    const source = readJson(join(ROOT, root, 'package.json'));
    const dist = `dist/${root}`;
    const distDir = join(ROOT, dist);
    const manifestFile = join(distDir, 'package.json');
    const manifest = existsSync(manifestFile) ? readJson(manifestFile) : null;
    if (requireDist && !manifest) {
      throw new Error(
        `${source.name}: ${dist} is missing — build it first (npx nx run ${project}:build)`,
      );
    }
    return {
      project,
      root,
      dist,
      distDir,
      name: source.name,
      version: source.version,
      license: source.license,
      layout: manifest ? layoutOf(distDir, manifest) : null,
      source,
      manifest,
    };
  });
}

/** MIT, or the commercial "SEE LICENSE IN LICENSE" (ARCHITECTURE → Licensing). */
export const isMit = (pkg) => pkg.license === 'MIT';

/** Every `@oge-ui/*` / `oge-ui` package a manifest depends on at runtime. */
export function internalDependencies(manifest, names) {
  const out = new Set();
  for (const field of [
    'dependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    for (const dep of Object.keys(manifest[field] ?? {})) {
      if (names.has(dep)) out.add(dep);
    }
  }
  return out;
}

/**
 * Dependency order (dependencies before dependents) over the internal
 * `dependencies` + `peerDependencies` graph — the order the release
 * workflow publishes in, so a package never lands on npm before what it
 * pins.
 */
export function publishOrder(packages) {
  const byName = new Map(packages.map((p) => [p.name, p]));
  const names = new Set(byName.keys());
  const order = [];
  const state = new Map();
  const visit = (pkg, trail) => {
    if (state.get(pkg.name) === 'done') return;
    if (state.get(pkg.name) === 'active') {
      throw new Error(`dependency cycle: ${[...trail, pkg.name].join(' → ')}`);
    }
    state.set(pkg.name, 'active');
    for (const dep of [...internalDependencies(pkg.source, names)].sort()) {
      visit(byName.get(dep), [...trail, pkg.name]);
    }
    state.set(pkg.name, 'done');
    order.push(pkg);
  };
  for (const pkg of [...packages].sort((a, b) => a.name.localeCompare(b.name)))
    visit(pkg, []);
  return order;
}
