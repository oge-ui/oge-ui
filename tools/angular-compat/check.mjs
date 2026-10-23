#!/usr/bin/env node
/**
 * Oldest-Angular gate: the Angular packages, packed the way npm installs
 * them, in a fresh application on the oldest Angular their peer ranges
 * allow — at exactly the ranges' lower bound (`floor`) and at that minor's
 * newest patches (`latest`), with that Angular's TypeScript
 * (tools/angular-compat/versions.json).
 *
 * 1. `npm pack` every built Angular and engine package (dist/packages/**).
 * 2. Per version set, a throwaway app in the OS temp folder: `app/` here,
 *    apps/ssr-smoke's family hosts, and a generated component importing
 *    every component, directive and pipe of every entry point — so the
 *    build links and compiles all of them with that Angular, strict
 *    templates on and `skipLibCheck` off, so TypeScript reads every
 *    declaration file the packages ship.
 * 3. `npm install` WITHOUT --legacy-peer-deps (the peer ranges must admit
 *    the version), `ng build`, then the built app in Chromium: no console
 *    errors, and every family's markup present.
 *
 *   node tools/angular-compat/check.mjs [floor|latest] [--keep] [--work <dir>]
 *     [--with angular=21.1.6,cli=21.1.5,cdk=21.1.6]   (try other patches)
 *
 * Run after the builds: `npx nx run @oge/source:angular-compat-check`.
 */
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { ROOT, publishablePackages } from '../release/publishable.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const keep = args.includes('--keep');
const WORK = flag('--work') ?? join(tmpdir(), 'oge-angular-compat');
const HERE = join(ROOT, 'tools', 'angular-compat');
const config = JSON.parse(readFileSync(join(HERE, 'versions.json'), 'utf8'));
const only = args.find((a) => a === 'floor' || a === 'latest');
const sets = (only ? [only] : ['floor', 'latest']).map((name) => {
  const set = { name, ...config[name] };
  for (const pair of flag('--with')?.split(',') ?? []) {
    const [key, value] = pair.split('=');
    set[key] = value;
  }
  return set;
});

const fail = (message) => {
  console.error(`angular-compat: ${message}`);
  process.exit(1);
};

/** Runs npm or npx in a folder; they need the shell on Windows. */
function run(command, argv, cwd, encoding) {
  // fixed tools and paths built here — no external input reaches the shell
  return execFileSync(command, argv, {
    cwd,
    stdio: encoding ? 'pipe' : 'inherit',
    shell: process.platform === 'win32',
    encoding,
  });
}

// ── the packages ────────────────────────────────────────────────────────────
// the ones the Nx target builds first (its dependsOn: the Angular and
// framework-free projects) — the React packages' dist need not exist
const platformOf = (pkg) =>
  JSON.parse(readFileSync(join(ROOT, pkg.root, 'project.json'), 'utf8')).tags ??
  [];
const packages = publishablePackages()
  .filter((pkg) =>
    platformOf(pkg).some(
      (tag) => tag === 'platform:angular' || tag === 'platform:agnostic',
    ),
  )
  .map((pkg) => {
    if (!pkg.manifest)
      fail(
        `${pkg.name}: ${pkg.dist} is missing — build it first (npx nx run ${pkg.project}:build)`,
      );
    return pkg;
  })
  .filter((pkg) => pkg.layout === 'apf' || pkg.layout === 'rollup');
const angularPackages = packages.filter((pkg) => pkg.layout === 'apf');

// every Angular peer range must start at the version `floor` builds with
const lowerBounds = new Set();
for (const pkg of angularPackages)
  for (const [name, range] of Object.entries(
    pkg.manifest.peerDependencies ?? {},
  ))
    if (name.startsWith('@angular/'))
      lowerBounds.add(/^>=(\d+\.\d+\.\d+)/.exec(range)?.[1] ?? range);
if (lowerBounds.size !== 1)
  fail(
    `the Angular peer ranges start at different versions: ${[...lowerBounds].join(', ')}`,
  );
const [floor] = lowerBounds;
if (config.floor.angular !== floor)
  fail(
    `versions.json's floor is Angular ${config.floor.angular}, but the peer ranges start at ${floor} — update tools/angular-compat/versions.json`,
  );

rmSync(WORK, { recursive: true, force: true });
const PACKS = join(WORK, 'packs');
mkdirSync(PACKS, { recursive: true });
const tarballs = new Map();
for (const pkg of packages) {
  const out = run(
    'npm',
    ['pack', pkg.distDir, '--pack-destination', PACKS, '--json'],
    WORK,
    'utf8',
  );
  tarballs.set(pkg.name, JSON.parse(out)[0].filename);
}

/** Exported classes of an entry point's declarations that templates import. */
function importables(typesFile) {
  const dts = readFileSync(typesFile, 'utf8');
  // each class's text runs to the next declaration; Angular's static field marks it
  const starts = [
    ...dts.matchAll(/^(export )?declare (abstract )?class (\w+)/gm),
  ];
  const declared = new Set();
  const names = [];
  starts.forEach((m, i) => {
    const body = dts.slice(m.index, starts[i + 1]?.index ?? dts.length);
    if (!/static ɵ(?:cmp|dir|pipe|mod): /.test(body)) return;
    // abstract bases (no selector) are not importable
    if (
      m[2] ||
      /static ɵdir: i0\.ɵɵDirectiveDeclaration<[^,]+, never,/.test(body)
    )
      return;
    declared.add(m[3]);
    if (m[1]) names.push(m[3]);
  });
  for (const block of dts.matchAll(/export \{([^}]*)\}/g))
    for (const part of block[1].split(',')) {
      const [local, exported = local] = part
        .trim()
        .replace(/^type /, '')
        .split(/\s+as\s+/);
      if (local && declared.has(local)) names.push(exported);
    }
  return names;
}

const imports = [];
const used = [];
for (const pkg of angularPackages) {
  for (const [entry, target] of Object.entries(pkg.manifest.exports ?? {})) {
    if (
      entry === './package.json' ||
      entry.includes('*') ||
      entry.endsWith('/testing') ||
      typeof target !== 'object' ||
      !target.types
    )
      continue;
    const names = importables(join(pkg.distDir, target.types));
    if (!names.length) continue;
    const specifier =
      entry === '.' ? pkg.name : `${pkg.name}/${entry.slice(2)}`;
    const prefix = specifier.replace(/[^a-zA-Z0-9]+/g, '_');
    imports.push(
      `import { ${names.map((n) => `${n} as ${prefix}__${n}`).join(', ')} } from '${specifier}';`,
    );
    used.push(...names.map((n) => `${prefix}__${n}`));
  }
}
const everything = `// generated by tools/angular-compat/check.mjs
import { Component } from '@angular/core';
${imports.join('\n')}

@Component({
  selector: 'compat-everything',
  imports: [
    ${used.join(',\n    ')},
  ],
  template: '',
})
export class Everything {}
`;

// ── one version set: app, install, build, browser ──────────────────────────
async function check(set) {
  const dir = join(WORK, set.name);
  cpSync(join(HERE, 'app'), dir, { recursive: true });
  mkdirSync(join(dir, 'src', 'hosts'), { recursive: true });
  const hostsDir = join(ROOT, 'apps', 'ssr-smoke', 'src', 'hosts');
  for (const file of readdirSync(hostsDir))
    writeFileSync(
      join(dir, 'src', 'hosts', file),
      readFileSync(join(hostsDir, file), 'utf8').replace(
        /from '\.\.\/render'/g,
        "from '../family'",
      ),
    );
  writeFileSync(join(dir, 'src', 'everything.ts'), everything);
  console.log(
    `angular-compat [${set.name}]: Angular ${set.angular}, TypeScript ${config.typescript}; ${packages.length} packages, ${used.length} importables`,
  );

  const local = Object.fromEntries(
    [...tarballs].map(([name, file]) => [name, `file:../packs/${file}`]),
  );
  const framework = Object.fromEntries(
    [
      '@angular/common',
      '@angular/compiler',
      '@angular/core',
      '@angular/forms',
      '@angular/platform-browser',
    ].map((name) => [name, set.angular]),
  );
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        name: `oge-angular-compat-${set.name}`,
        private: true,
        dependencies: {
          ...framework,
          '@angular/cdk': set.cdk,
          rxjs: config.rxjs,
          tslib: config.tslib,
          ...local,
        },
        devDependencies: {
          '@angular/build': set.cli,
          '@angular/cli': set.cli,
          '@angular/compiler-cli': set.angular,
          typescript: config.typescript,
        },
        // the packages pin each other at the release version: take the local builds
        overrides: local,
      },
      null,
      2,
    ),
  );

  run('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], dir);
  run('npx', ['ng', 'build'], dir);

  const browserDir = join(dir, 'dist', 'browser');
  if (!existsSync(join(browserDir, 'index.html')))
    return [`the build wrote no dist/browser/index.html`];

  const TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
  };
  const server = createServer((request, response) => {
    const path = decodeURIComponent(new URL(request.url, 'http://x').pathname);
    const file = join(browserDir, path === '/' ? 'index.html' : path);
    if (!file.startsWith(browserDir) || !existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    });
    response.end(readFileSync(file));
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const { port } = server.address();

  const { chromium } = createRequire(join(ROOT, 'package.json'))('playwright');
  const browser = await chromium.launch();
  const problems = [];
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    page.on('console', (message) => {
      if (message.type() === 'error')
        problems.push(`console: ${message.text()}`);
    });
    page.on('pageerror', (error) => problems.push(`page: ${error.message}`));
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const families = await page.evaluate(() => globalThis.compatFamilies ?? []);
    if (!families.length) problems.push('the app did not start');
    for (const { name, expect } of families) {
      const html = await page
        .locator(`section[data-family="${name}"]`)
        .evaluate((section) => section.innerHTML)
        .catch(() => '');
      for (const text of expect)
        if (!html.includes(text))
          problems.push(`${name}: no "${text}" in its markup`);
    }
    console.log(
      `angular-compat [${set.name}]: ${families.length} families rendered on Angular ${set.angular}`,
    );
  } finally {
    await browser.close();
    server.close();
  }
  return problems.map((problem) => `[${set.name}] ${problem}`);
}

const problems = [];
try {
  for (const set of sets) problems.push(...(await check(set)));
} finally {
  if (!keep) rmSync(WORK, { recursive: true, force: true });
}
if (problems.length) fail(`\n  ${problems.join('\n  ')}`);
console.log('angular-compat: ok');
