// Rebuilds the golden corpus: builds the source workbooks, has Excel open,
// measure and re-save them (capture.ps1), reads the tables' lines off the
// screen (table-lines.ps1), then regenerates the font-metrics and built-in
// table-style tables the engine embeds. Windows with Microsoft Excel only.
//
//   node packages/spreadsheet-engine/testing/tools/run.mjs [--only metrics,corpus]
//
// --only re-captures some sections (environment, numfmt, fit, borders,
// metrics, corpus) and keeps the other captures as they are.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const onlyAt = process.argv.indexOf('--only');
const only = onlyAt > 0 ? (process.argv[onlyAt + 1] ?? '') : '';
const testing = resolve(here, '..');
const work = mkdtempSync(join(tmpdir(), 'oge-corpus-'));
const sources = join(work, 'sources');
const corpus = join(testing, 'corpus');
const captures = join(testing, 'captures');
mkdirSync(sources, { recursive: true });
mkdirSync(corpus, { recursive: true });
mkdirSync(captures, { recursive: true });

try {
  const bundle = join(work, 'corpus-sources.mjs');
  await build({
    entryPoints: [join(here, 'corpus-sources.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: bundle,
    logLevel: 'error',
  });
  execFileSync(process.execPath, [bundle, sources], { stdio: 'inherit' });
  execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      join(here, 'capture.ps1'),
      '-Sources',
      sources,
      '-Corpus',
      corpus,
      '-Captures',
      captures,
      ...(only ? ['-Only', only] : []),
    ],
    { stdio: 'inherit' },
  );
  execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      join(here, 'gdi-advances.ps1'),
      '-Captures',
      captures,
    ],
    { stdio: 'inherit' },
  );
  execFileSync(process.execPath, [join(here, 'font-metrics.mjs')], {
    stdio: 'inherit',
  });
  for (const [script, folder, target] of [
    ['table-lines.ps1', '-Corpus', corpus],
    ['table-styles.ps1', '-Captures', captures],
  ]) {
    execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        join(here, script),
        folder,
        target,
      ],
      { stdio: 'inherit' },
    );
  }
  execFileSync(process.execPath, [join(here, 'table-styles.mjs')], {
    stdio: 'inherit',
  });
} finally {
  rmSync(work, { recursive: true, force: true });
}
