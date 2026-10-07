#!/usr/bin/env node
/**
 * Public-API snapshot gate for the MIT core packages — `@oge-ui/core` and
 * `@oge-ui/behavior`, the framework-free substrate every render layer (and
 * every consumer of the two umbrellas) imports. A change to their exported
 * surface has to be visible in review, so each published entry point has a
 * committed API Extractor report in `tools/api-reports/` and this script
 * fails when the built declarations no longer produce it.
 *
 * It reads the **dist** declarations (`dist/packages/<pkg>/*.d.ts`, what npm
 * ships), so run it after the builds — the Nx target depends on them:
 *
 *   npx nx run @oge/source:api-check         # CI verify: fail on any drift
 *   node tools/api-report.mjs --update       # intended change: rewrite reports
 *
 * API Extractor runs through a pinned `npx` (no devDependency, like the
 * package-check gate's publint / attw). Its own messages (missing release
 * tags, forgotten exports, TSDoc syntax) are not what this gate is for and
 * are switched off; the report is the signatures alone. Reports are compared
 * with normalized line endings, so Windows and Linux agree.
 */
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const API_EXTRACTOR = '@microsoft/api-extractor@7.59.4';
const ROOT = resolve(import.meta.dirname, '..');
const REPORTS = join(ROOT, 'tools', 'api-reports');
/** The packages under the gate: dist folder → npm name. */
const PACKAGES = [
  { dir: 'dist/packages/core', name: '@oge-ui/core', slug: 'core' },
  { dir: 'dist/packages/behavior', name: '@oge-ui/behavior', slug: 'behavior' },
];

const update = process.argv.includes('--update');

/** Every entry point a package's `exports` map gives types for. */
function entriesOf(pkgDir) {
  const manifest = JSON.parse(
    readFileSync(join(pkgDir, 'package.json'), 'utf8'),
  );
  const entries = [];
  for (const [subpath, target] of Object.entries(manifest.exports ?? {})) {
    const types =
      typeof target === 'object' && target !== null ? target.types : null;
    if (typeof types !== 'string') continue;
    entries.push({ subpath, types: join(pkgDir, types) });
  }
  return entries;
}

const reportName = (slug, subpath) =>
  subpath === '.'
    ? slug
    : `${slug}-${subpath.replace(/^\.\//, '').replace(/\//g, '-')}`;

const normalize = (text) => text.replace(/\r\n/g, '\n');

function runExtractor(pkg, entry, name, work) {
  // API Extractor looks for the analysed package's package.json beside its
  // config file, so the (temporary) config sits in the dist folder
  const configPath = join(ROOT, pkg.dir, `.api-extractor.${name}.json`);
  const config = {
    $schema:
      'https://developer.microsoft.com/json-schemas/api-extractor/v7/api-extractor.schema.json',
    projectFolder: join(ROOT, pkg.dir),
    mainEntryPointFilePath: entry.types,
    bundledPackages: [],
    compiler: {
      overrideTsconfig: {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          lib: ['ES2022', 'DOM', 'DOM.Iterable'],
          types: [],
          strict: true,
          skipLibCheck: true,
          // a sibling package resolves to its own dist declarations
          baseUrl: ROOT,
          paths: {
            '@oge-ui/core': ['dist/packages/core/index.d.ts'],
            '@oge-ui/behavior': ['dist/packages/behavior/index.d.ts'],
          },
        },
        files: [entry.types],
      },
    },
    apiReport: {
      enabled: true,
      reportFolder: work,
      reportTempFolder: work,
      reportFileName: `${name}.api.md`,
    },
    docModel: { enabled: false },
    dtsRollup: { enabled: false },
    tsdocMetadata: { enabled: false },
    newlineKind: 'lf',
    messages: {
      compilerMessageReporting: { default: { logLevel: 'none' } },
      extractorMessageReporting: {
        default: { logLevel: 'none', addToApiReportFile: false },
      },
      tsdocMessageReporting: {
        default: { logLevel: 'none', addToApiReportFile: false },
      },
    },
  };
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  // --local writes the report even when none exists in the (temp) folder
  const result = spawnSync(
    'npx',
    ['-y', API_EXTRACTOR, 'run', '--local', '--config', configPath],
    { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' },
  );
  rmSync(configPath, { force: true });
  const out = join(work, `${name}.api.md`);
  if (!existsSync(out)) {
    process.stderr.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
    throw new Error(`API Extractor produced no report for ${name}`);
  }
  return out;
}

const work = join(tmpdir(), `oge-api-report-${process.pid}`);
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
mkdirSync(REPORTS, { recursive: true });

let drift = 0;
let written = 0;
try {
  for (const pkg of PACKAGES) {
    const pkgDir = join(ROOT, pkg.dir);
    if (!existsSync(join(pkgDir, 'package.json'))) {
      throw new Error(
        `${pkg.dir} is missing — build first (npx nx run-many -t build -p core behavior)`,
      );
    }
    for (const entry of entriesOf(pkgDir)) {
      const name = reportName(pkg.slug, entry.subpath);
      const generated = runExtractor(pkg, entry, name, work);
      const committed = join(REPORTS, `${name}.api.md`);
      const fresh = normalize(readFileSync(generated, 'utf8'));
      const current = existsSync(committed)
        ? normalize(readFileSync(committed, 'utf8'))
        : null;
      if (current === fresh) {
        console.log(`✓ ${pkg.name}${entry.subpath.slice(1)} — unchanged`);
        continue;
      }
      if (update) {
        copyFileSync(generated, committed);
        written++;
        console.log(`✎ ${pkg.name}${entry.subpath.slice(1)} — report updated`);
        continue;
      }
      drift++;
      console.error(
        current === null
          ? `✗ ${pkg.name}${entry.subpath.slice(1)} — no committed report (tools/api-reports/${name}.api.md)`
          : `✗ ${pkg.name}${entry.subpath.slice(1)} — public API changed (tools/api-reports/${name}.api.md)`,
      );
      if (current !== null) {
        const before = current.split('\n');
        const after = fresh.split('\n');
        const removed = before.filter((line) => !after.includes(line));
        const added = after.filter((line) => !before.includes(line));
        for (const line of removed.slice(0, 20)) console.error(`  - ${line}`);
        for (const line of added.slice(0, 20)) console.error(`  + ${line}`);
      }
    }
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (drift > 0) {
  console.error(
    `\n${drift} API report(s) out of date. If the change is intended, run ` +
      '`node tools/api-report.mjs --update` and commit tools/api-reports/ ' +
      '(say why in the PR).',
  );
  process.exit(1);
}
if (update) console.log(`\n${written} report(s) written.`);
