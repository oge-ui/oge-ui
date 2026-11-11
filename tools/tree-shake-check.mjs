#!/usr/bin/env node
/**
 * Tree-shaking gate: an app that imports one component from a family entry
 * point must not bundle the rest of the family.
 *
 * Every probe is a one-line module (`export { OgeModal } from
 * '@oge-ui/overlay'`) bundled from the built packages in dist/ the way an
 * application build would: esbuild with Angular's own JavaScript transformer
 * (the linker plus the advanced optimizations `ng build` applies to library
 * code) for Angular entry points, and both esbuild and Rolldown for the
 * framework-free and React ones. Peers (`@angular/*`, `react`, `rxjs`…) stay
 * external. The bundle must contain the probe's `keep` markers (proof the
 * import survived) and none of its `drop` markers — class, function and
 * selector names of things the probe did not import.
 *
 *   node tools/tree-shake-check.mjs            # check every probe
 *   node tools/tree-shake-check.mjs --report   # also print each bundle size
 *   node tools/tree-shake-check.mjs --dump <dir>  # write every bundle there
 *
 * Run after the builds: `npx nx run @oge/source:tree-shake-check`.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';
import { rolldown } from 'rolldown';

const ROOT = join(import.meta.dirname, '..');
const DIST = join(ROOT, 'dist', 'packages');
const require = createRequire(import.meta.url);
const report = process.argv.includes('--report');
const dumpAt = process.argv.indexOf('--dump');
const dumpDir = dumpAt > 0 ? process.argv[dumpAt + 1] : null;

/**
 * The probes. `layer` picks the pipeline: `angular` runs Angular's
 * transformer, `js` (core, behavior, React) bundles the files as published.
 */
const PROBES = [
  {
    name: 'oge-ui: one family locale slice leaves the other catalogs',
    layer: 'angular',
    code: "export { provideOgeGridLocale } from 'oge-ui';",
    keep: ['OGE_GRID_CONFIG'],
    drop: ['Rich text editor', 'Table pages', 'Has errors'],
    maxGzip: 9000,
  },
  {
    name: 'behavior: one helper leaves the rest of the substrate',
    layer: 'js',
    code: "export { ogeSimpleTablePage } from '@oge-ui/behavior';",
    keep: ['pageCount'],
    drop: [
      'OGE_DEFAULT_OVERLAY_MESSAGES',
      'TABBABLE_SELECTOR',
      'OgeGridColumnLayoutCore',
    ],
    maxGzip: 1800,
  },
  {
    name: 'core: a filter helper leaves the contract prose and the warning registry',
    layer: 'js',
    code: "export { ogeFilterOperatorTakesValue } from '@oge-ui/core';",
    keep: ['isnotblank'],
    drop: ['TRIM(f)', 'A close guard threw', 'buildCsv', 'PivotEngine'],
    maxGzip: 1024,
  },
  {
    name: 'core: the license API alone stays small',
    layer: 'js',
    code: "export { ogeSetLicenseKey, ogeCheckLicense } from '@oge-ui/core';",
    keep: ['oge-license-watermark'],
    drop: ['createFilterPredicate', 'PivotEngine', 'buildCsv', 'computeWindow'],
    maxGzip: 6000,
  },
  {
    name: 'overlay: a modal leaves the popover, toast and tooltip',
    layer: 'angular',
    code: "export { OgeModal } from '@oge-ui/overlay';",
    keep: ['oge-modal'],
    drop: ['class OgePopover ', 'class OgeToast', 'class OgeTooltip'],
    maxGzip: 28000,
  },
  {
    name: 'buttons: a button leaves the drop-down button and the speed dial',
    layer: 'angular',
    code: "export { OgeButton } from '@oge-ui/buttons';",
    keep: ['oge-button'],
    drop: [
      'class OgeDropDownButton',
      'class OgeSpeedDial',
      'class OgeSplitButton',
    ],
    maxGzip: 23000,
  },
  {
    name: 'navigation: a menubar leaves the tree view and the stepper',
    layer: 'angular',
    code: "export { OgeMenubar } from '@oge-ui/navigation';",
    keep: ['oge-menubar'],
    drop: ['class OgeTreeView ', 'class OgeStepper ', 'class OgeDrawer '],
    maxGzip: 56000,
  },
  {
    name: 'layout: the simple table leaves the data view',
    layer: 'angular',
    code: "export { OgeSimpleTable } from '@oge-ui/layout';",
    keep: ['oge-simple-table'],
    drop: ['class OgeDataView ', 'class OgeCarousel ', 'class OgeTileLayout '],
    maxGzip: 22000,
  },
  {
    name: 'react-layout: the simple table leaves the data view',
    layer: 'js',
    code: "export { OgeSimpleTable } from '@oge-ui/react-layout';",
    keep: ['oge-simple-table'],
    drop: ['oge-data-view-items', 'oge-carousel-', 'oge-tile-layout-'],
    maxGzip: 30000,
  },
  {
    name: 'react-overlay: a modal leaves the toast and the tooltip',
    layer: 'js',
    code: "export { OgeModal } from '@oge-ui/react-overlay';",
    keep: ['oge-modal'],
    drop: ['oge-toast-body', 'oge-tooltip-arrow', 'oge-window-controls'],
    maxGzip: 37000,
  },
  {
    name: 'react-buttons: a button leaves the drop-down button and the speed dial',
    layer: 'js',
    code: "export { OgeButton } from '@oge-ui/react-buttons';",
    keep: ['oge-button'],
    drop: ['oge-drop-down-chevron', 'oge-speed-dial-'],
    maxGzip: 17000,
  },
  {
    name: 'react-navigation: a breadcrumb leaves the tree view and the menubar',
    layer: 'js',
    code: "export { OgeBreadcrumb } from '@oge-ui/react-navigation';",
    keep: ['oge-breadcrumb'],
    drop: ['oge-tree-view-check', 'oge-menubar-hamburger'],
    maxGzip: 36000,
  },
];

const EXTERNAL = [
  /^@angular\//,
  /^react($|\/)/,
  /^react-dom($|\/)/,
  /^rxjs($|\/)/,
  /^tslib$/,
];

/** The file a bundler loads for an export target (ESM first). */
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

/** Package name → dist folder, from every built package.json. */
function distPackages() {
  const map = new Map();
  const visit = (dir) => {
    const manifest = join(dir, 'package.json');
    if (!existsSync(manifest)) return;
    const { name } = JSON.parse(readFileSync(manifest, 'utf8'));
    if (name) map.set(name, dir);
  };
  // dist/packages/<name> and the React packages under dist/packages/react/<name>
  for (const entry of readdirSafe(DIST)) visit(join(DIST, entry));
  const react = join(DIST, 'react');
  for (const entry of readdirSafe(react)) visit(join(react, entry));
  return map;
}

function readdirSafe(dir) {
  try {
    return require('node:fs').readdirSync(dir);
  } catch {
    return [];
  }
}

const PACKAGES = distPackages();

/**
 * `@oge-ui/layout/simple-table` → the built ESM file, plus whether its
 * package declares the JavaScript side-effect free. A plugin-resolved path
 * loses the package.json lookup, so the flag is handed to the bundler
 * explicitly — exactly what it would read from the installed package.
 */
function resolveOge(specifier) {
  const parts = specifier.split('/');
  // scoped `@oge-ui/x[/sub]`, or the unscoped umbrella `oge-ui[/sub]`
  const scoped = specifier.startsWith('@');
  const name = parts.slice(0, scoped ? 2 : 1).join('/');
  const rest = parts.slice(scoped ? 2 : 1);
  const subpath = rest.length ? `./${rest.join('/')}` : '.';
  const dir = PACKAGES.get(name);
  if (!dir) return null;
  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const target = manifest.exports
    ? pickTarget(manifest.exports[subpath])
    : subpath === '.'
      ? (manifest.module ?? manifest.main)
      : null;
  if (!target) return null;
  const flag = manifest.sideEffects;
  const sideEffects = !(
    flag === false ||
    (Array.isArray(flag) && flag.every((glob) => /.css$/.test(glob)))
  );
  return { path: join(dir, target), sideEffects };
}

const isExternal = (id) => EXTERNAL.some((re) => re.test(id));

let angularTransformer;
async function angularTransform(path) {
  if (!angularTransformer) {
    const { JavaScriptTransformer } = await import('@angular/build/private');
    // the transformer's cache keys need the hash utility `ng build` sets up
    // first; it is not exported, so load the file the package itself uses
    const hash = require(
      join(
        require.resolve('@angular/build/package.json'),
        '..',
        'src',
        'utils',
        'hash.js',
      ),
    );
    await hash.initializeHash();
    angularTransformer = new JavaScriptTransformer(
      {
        sourcemap: false,
        thirdPartySourcemaps: false,
        advancedOptimizations: true,
        jit: false,
      },
      1,
    );
  }
  const bytes = await angularTransformer.transformFile(path, false, false);
  return Buffer.from(bytes).toString('utf8');
}

async function bundleEsbuild(probe) {
  const result = await build({
    stdin: { contents: probe.code, resolveDir: ROOT, loader: 'js' },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    treeShaking: true,
    minify: false,
    logLevel: 'silent',
    // what an optimized `ng build` defines: drops the dev-only class metadata
    define:
      probe.layer === 'angular'
        ? { ngDevMode: 'false', ngJitMode: 'false', ngI18nClosureMode: 'false' }
        : { 'process.env.NODE_ENV': '"production"' },
    plugins: [
      {
        name: 'oge-dist',
        setup(b) {
          b.onResolve({ filter: /^(@oge-ui\/|oge-ui(\/|$))/ }, (args) => {
            const hit = resolveOge(args.path);
            return hit
              ? { path: hit.path, sideEffects: hit.sideEffects }
              : { errors: [{ text: `unbuilt ${args.path}` }] };
          });
          b.onResolve({ filter: /.*/ }, (args) =>
            isExternal(args.path)
              ? { path: args.path, external: true }
              : undefined,
          );
          if (probe.layer === 'angular') {
            b.onLoad({ filter: /\.m?js$/ }, async (args) => ({
              contents: await angularTransform(args.path),
              loader: 'js',
            }));
          }
        },
      },
    ],
  });
  return result.outputFiles[0].text;
}

async function bundleRolldown(probe) {
  const bundle = await rolldown({
    input: 'probe',
    treeshake: true,
    logLevel: 'silent',
    plugins: [
      {
        name: 'oge-dist',
        resolveId(id) {
          if (id === 'probe') return id;
          if (id.startsWith('@oge-ui/') || id === 'oge-ui') {
            const hit = resolveOge(id);
            return hit
              ? { id: hit.path, moduleSideEffects: hit.sideEffects }
              : null;
          }
          if (isExternal(id)) return { id, external: true };
          return null;
        },
        load(id) {
          return id === 'probe' ? probe.code : null;
        },
      },
    ],
  });
  const { output } = await bundle.generate({ format: 'esm' });
  await bundle.close();
  return output.map((chunk) => chunk.code ?? '').join('\n');
}

function verify(probe, bundler, code) {
  if (dumpDir) {
    const family = probe.name.split(':')[0].replace(/[^a-z-]+/g, '_');
    const file = `${PROBES.indexOf(probe)}-${family}-${bundler}.js`;
    writeFileSync(join(dumpDir, file), code);
  }
  const problems = [];
  for (const marker of probe.keep) {
    if (!code.includes(marker)) problems.push(`missing "${marker}"`);
  }
  for (const marker of probe.drop) {
    if (code.includes(marker)) problems.push(`still bundles "${marker}"`);
  }
  const gzip = gzipSync(code, { level: 9 }).length;
  if (probe.maxGzip && gzip > probe.maxGzip) {
    problems.push(`${gzip} B gzip > ${probe.maxGzip} B`);
  }
  return { bundler, gzip, problems };
}

let failed = 0;
for (const probe of PROBES) {
  const runs = [verify(probe, 'esbuild', await bundleEsbuild(probe))];
  if (probe.layer === 'js') {
    runs.push(verify(probe, 'rolldown', await bundleRolldown(probe)));
  }
  for (const run of runs) {
    const ok = run.problems.length === 0;
    if (!ok) failed++;
    if (!ok || report) {
      console.log(
        `${ok ? '✓' : '✗'} ${probe.name} [${run.bundler}] ${(run.gzip / 1024).toFixed(1)} kB gzip${ok ? '' : ` — ${run.problems.join('; ')}`}`,
      );
    }
  }
}
await angularTransformer?.close?.();
if (failed) {
  console.error(`\ntree-shake-check: ${failed} probe run(s) failed.`);
  process.exit(1);
}
console.log(
  `tree-shake-check: ${PROBES.length} probes clean (esbuild + Rolldown).`,
);
