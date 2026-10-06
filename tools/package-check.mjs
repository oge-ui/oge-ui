#!/usr/bin/env node
/**
 * Package-correctness gate: lints every publishable package's npm payload
 * (`dist/packages/**`, what `nx-release-publish` packs) with
 *
 * - `publint` — exports map, file formats, `types` condition order, missing
 *   files (errors and warnings fail; suggestions are ignored);
 * - `@arethetypeswrong/cli` (`attw --pack`) — whether TypeScript resolves
 *   the right declarations for every entry point under node10, node16
 *   (CJS and ESM) and bundler resolution.
 *
 * The attw profile follows the package layout (tools/release/publishable.mjs):
 * Angular Package Format packages are ESM-only by design, so `node10` and
 * `node16` CommonJS resolution are not checked for them (the APF spec ships
 * no CommonJS); React and rollup packages ship CJS + ESM and are checked
 * under every resolution mode. Stylesheet exports (`./styles.css`) have no
 * types and are not attw entry points, nor is `./llms.txt`.
 *
 * A finding that is correct by design goes into
 * `tools/package-check-allowlist.json` with a reason — never silenced in
 * code. Unused allowlist entries are reported so the list cannot rot.
 *
 *   node tools/package-check.mjs [--only <npm name>[,<npm name>…]]
 *
 * Run after the builds: `npx nx run @oge/source:package-check`.
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, publishablePackages } from './release/publishable.mjs';

const PUBLINT = 'publint@0.3.25';
const ATTW = '@arethetypeswrong/cli@0.18.5';
const CONCURRENCY = 4;

const args = process.argv.slice(2);
const onlyIndex = args.indexOf('--only');
const only = onlyIndex >= 0 ? new Set(args[onlyIndex + 1].split(',')) : null;

const allowlist = JSON.parse(
  readFileSync(join(ROOT, 'tools', 'package-check-allowlist.json'), 'utf8'),
).entries;
const allowUsed = new Set();

/** resolution kinds a profile does not check */
const PROFILE_IGNORES = {
  strict: new Set(),
  'esm-only': new Set(['node10', 'node16-cjs']),
};

const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

function run(argv, cwd) {
  return new Promise((resolve) => {
    // fixed tool specs and dist paths from nx.json — no external input — so
    // the shell (needed on Windows to find npx.cmd) is safe here
    const child = spawn(['npx', '--yes', ...argv].join(' '), {
      cwd,
      shell: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

function allowed(tool, pkg, message) {
  const index = allowlist.findIndex(
    (e) =>
      e.tool === tool &&
      (e.package === '*' ||
        e.package === pkg.name ||
        e.layout === pkg.layout) &&
      message.includes(e.match),
  );
  if (index >= 0) allowUsed.add(index);
  return index >= 0;
}

async function publint(pkg) {
  const { code, stdout, stderr } = await run(
    [PUBLINT, 'run', JSON.stringify(pkg.dist), '--level', 'warning'],
    ROOT,
  );
  const text = stripAnsi(stdout + stderr);
  const findings = [];
  let section = null;
  for (const line of text.split(/\r?\n/)) {
    if (/^Errors:/.test(line)) section = 'error';
    else if (/^Warnings:/.test(line)) section = 'warning';
    else if (/^Suggestions:/.test(line)) section = null;
    else if (section && /^\s*\d+\.\s/.test(line)) {
      findings.push(`${section}: ${line.replace(/^\s*\d+\.\s*/, '')}`);
    }
  }
  if (code !== 0 && findings.length === 0) {
    findings.push(`error: publint exited ${code}: ${text.trim().slice(-500)}`);
  }
  return findings.filter((f) => !allowed('publint', pkg, f));
}

function attwEntrypoints(pkg) {
  const exportsField = pkg.manifest.exports;
  if (!exportsField || typeof exportsField !== 'object') return [];
  return Object.keys(exportsField).filter((key) => /\.(css|txt)$/.test(key));
}

async function attw(pkg) {
  const profile = pkg.layout === 'apf' ? 'esm-only' : 'strict';
  const exclude = attwEntrypoints(pkg);
  const argv = [ATTW, '--pack', JSON.stringify(pkg.dist), '--format', 'json'];
  if (exclude.length) argv.push('--exclude-entrypoints', ...exclude);
  const { stdout, stderr } = await run(argv, ROOT);
  let report;
  try {
    report = JSON.parse(stdout.slice(stdout.indexOf('{')));
  } catch {
    return [
      `error: attw produced no report: ${stripAnsi(stderr).trim().slice(-500)}`,
    ];
  }
  const ignores = PROFILE_IGNORES[profile];
  const findings = [];
  for (const problem of report.analysis?.problems ?? []) {
    const resolution = problem.resolutionKind ?? problem.resolutionOption;
    if (resolution && ignores.has(resolution)) continue;
    const where = [
      problem.entrypoint && `entry "${problem.entrypoint}"`,
      resolution && `(${resolution})`,
      problem.fileName &&
        `in ${problem.fileName.replace(/^\/node_modules\//, '')}`,
      problem.moduleSpecifier && `importing "${problem.moduleSpecifier}"`,
    ]
      .filter(Boolean)
      .join(' ');
    findings.push(`${problem.kind} ${where}`);
  }
  return [...new Set(findings)].filter((f) => !allowed('attw', pkg, f));
}

async function check(pkg) {
  const [lint, types] = await Promise.all([publint(pkg), attw(pkg)]);
  return {
    pkg,
    findings: [
      ...lint.map((f) => `publint ${f}`),
      ...types.map((f) => `attw ${f}`),
    ],
  };
}

const packages = publishablePackages({ requireDist: true }).filter(
  (p) => !only || only.has(p.name),
);
const results = [];
const queue = [...packages];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const pkg = queue.shift();
      const result = await check(pkg);
      console.log(
        `${result.findings.length ? '✖' : '✓'} ${pkg.name} (${pkg.layout})`,
      );
      results.push(result);
    }
  }),
);

if (!only) {
  allowlist.forEach((entry, index) => {
    if (!allowUsed.has(index)) {
      console.warn(
        `warning: allowlist entry ${JSON.stringify(entry.match)} (${entry.tool}, ${entry.package ?? entry.layout}) matched nothing — delete it`,
      );
    }
  });
}

const failing = results.filter((r) => r.findings.length);
if (failing.length) {
  console.error(`\npackage-check: ${failing.length} package(s) with findings:`);
  for (const { pkg, findings } of failing.sort((a, b) =>
    a.pkg.name.localeCompare(b.pkg.name),
  )) {
    console.error(`\n  ${pkg.name} (${pkg.dist}, ${pkg.layout})`);
    for (const f of findings) console.error(`    ${f}`);
  }
  console.error(
    '\nFix the package (exports map, package.json fields, build config), or — only if the finding is ' +
      'correct by design — add it to tools/package-check-allowlist.json with a reason.',
  );
  process.exit(1);
}
console.log(
  `\npackage-check: ${results.length} packages clean (publint + attw).`,
);
