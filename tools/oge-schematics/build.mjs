#!/usr/bin/env node
/**
 * Bundles the shared `ng add` schematic into every publishable package's dist.
 *
 * One implementation (`src/`) is compiled once per package with the package name
 * substituted through esbuild's `define`, so there is no per-package schematic
 * source to keep in sync and nothing extra inside `packages/` except the
 * `"schematics"` field in each `package.json`.
 *
 * Must run **after** the package builds: ng-packagr wipes `dist/packages/<pkg>`
 * before writing, which would take the schematic with it. The Nx target declares
 * that dependency; if you invoke this directly, build first.
 *
 * Usage: node tools/oge-schematics/build.mjs
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';

/** Packages that get `ng add`. `core` is transitive — nobody installs it directly. */
const PACKAGES = [
  { dir: 'grid', npm: '@oge-ui/grid' },
  { dir: 'tree-list', npm: '@oge-ui/tree-list' },
  { dir: 'pivot', npm: '@oge-ui/pivot' },
  { dir: 'bpmn', npm: '@oge-ui/bpmn' },
  { dir: 'scheduler', npm: '@oge-ui/scheduler' },
  { dir: 'gantt', npm: '@oge-ui/gantt' },
  { dir: 'inputs', npm: '@oge-ui/inputs' },
  { dir: 'buttons', npm: '@oge-ui/buttons' },
  { dir: 'overlay', npm: '@oge-ui/overlay' },
  { dir: 'tabs', npm: '@oge-ui/tabs' },
  { dir: 'layout', npm: '@oge-ui/layout' },
  { dir: 'navigation', npm: '@oge-ui/navigation' },
  { dir: 'forms', npm: '@oge-ui/forms' },
  { dir: 'ui', npm: 'oge-ui' },
];

const workspaceRoot = process.cwd();
const sourceDir = path.join(workspaceRoot, 'tools/oge-schematics/src');

const missing = [];
const built = [];

for (const pkg of PACKAGES) {
  const distDir = path.join(workspaceRoot, 'dist/packages', pkg.dir);
  if (!existsSync(distDir)) {
    missing.push(pkg.dir);
    continue;
  }

  const manifestPath = path.join(distDir, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.schematics !== './schematics/collection.json') {
    throw new Error(
      `${pkg.npm}: dist package.json is missing \`"schematics": "./schematics/collection.json"\` — add it to packages/${pkg.dir}/package.json`,
    );
  }

  const schematicsDir = path.join(distDir, 'schematics');
  const ngAddDir = path.join(schematicsDir, 'ng-add');
  mkdirSync(ngAddDir, { recursive: true });

  await esbuild.build({
    entryPoints: [path.join(sourceDir, 'entry.ts')],
    // `.cjs`, not `.js`: ng-packagr stamps `"type": "module"` on the dist
    // package.json, and the schematics engine loads factories with `require`.
    outfile: path.join(ngAddDir, 'index.cjs'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    // provided by the Angular CLI that runs the schematic
    external: ['@angular-devkit/*', '@schematics/angular/*', 'typescript'],
    define: { OGE_PACKAGE_NAME: JSON.stringify(pkg.npm) },
    logLevel: 'warning',
  });

  copyFileSync(
    path.join(sourceDir, 'collection.json'),
    path.join(schematicsDir, 'collection.json'),
  );
  copyFileSync(
    path.join(sourceDir, 'schema.json'),
    path.join(ngAddDir, 'schema.json'),
  );
  built.push(pkg.npm);
}

if (missing.length) {
  console.error(
    `✗ no dist output for: ${missing.join(', ')}\n  run \`npx nx run-many -t build\` first — schematics are written into the built packages.`,
  );
  process.exit(1);
}

console.log(
  `✓ bundled ng-add into ${built.length} packages: ${built.join(', ')}`,
);
