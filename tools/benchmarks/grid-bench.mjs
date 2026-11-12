#!/usr/bin/env node
/**
 * Reproducible data grid benchmarks (P-4): first render of 100 000 rows,
 * filtering, sorting and scroll frame rate, for the Angular and the React
 * grid, in a production build.
 *
 *   npx nx run dev-app:build          # once: the production docs build
 *   node tools/benchmarks/grid-bench.mjs [--runs 5] [--rows 100000]
 *                                       [--url http://localhost:4200]
 *                                       [--out tools/benchmarks/grid-results.json]
 *
 * Without `--url` it serves `dist/apps/dev-app/browser` itself. Each run opens
 * a fresh browser context on `/benchmarks/run`, which generates the rows
 * before the clock starts; the reported value is the median of the runs. The
 * page `/benchmarks` renders the committed results file.
 */
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : fallback;
};
const runs = Number(flag('runs', '5'));
const rows = Number(flag('rows', '100000'));
const out = path.resolve(
  root,
  flag('out', 'tools/benchmarks/grid-results.json'),
);
let baseUrl = flag('url', '');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
};

/** A static server over the production build with an SPA fallback. */
function serve(dir) {
  const fallback = ['index.csr.html', 'index.html']
    .map((f) => path.join(dir, f))
    .find((f) => existsSync(f));
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let file = path.join(dir, decodeURIComponent(url.pathname));
    if (!file.startsWith(dir)) file = fallback;
    else if (existsSync(file) && statSync(file).isDirectory()) {
      file = path.join(file, 'index.html');
    }
    if (!existsSync(file)) file = fallback;
    res.writeHead(200, {
      'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
    });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) =>
    server.listen(0, () => resolve({ server, port: server.address().port })),
  );
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const round = (n, digits = 1) => Math.round(n * 10 ** digits) / 10 ** digits;

const STEPS = [
  {
    key: 'filterEquals',
    label: 'Filter: department equals',
    run: (b) =>
      b.filter({
        type: 'binary',
        field: 'department',
        op: 'eq',
        value: 'Sales',
      }),
  },
  {
    key: 'filterContains',
    label: 'Filter: name contains (folded)',
    run: (b) =>
      b.filter({
        type: 'binary',
        field: 'name',
        op: 'contains',
        value: 'kaya',
      }),
  },
  { key: 'clearFilter', label: 'Clear the filter', run: (b) => b.filter(null) },
  {
    key: 'sortNumber',
    label: 'Sort: number column',
    run: (b) => b.sort('Salary'),
  },
  { key: 'sortText', label: 'Sort: text column', run: (b) => b.sort('Name') },
];

async function measure(browser, fw) {
  const samples = {
    firstRender: [],
    scrollFps: [],
    p95FrameMs: [],
    longFrames: [],
  };
  for (const step of STEPS) samples[step.key] = [];
  for (let i = 0; i < runs; i++) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/benchmarks/run?fw=${fw}&rows=${rows}`);
    await page.waitForFunction(() => '__ogeBench' in window, null, {
      timeout: 120_000,
    });
    samples.firstRender.push(
      await page.evaluate(() => window.__ogeBench.ready),
    );
    for (const step of STEPS) {
      const result = await page.evaluate(
        `(${step.run.toString()})(window.__ogeBench)`,
      );
      samples[step.key].push(result.ms);
    }
    const scroll = await page.evaluate(() => window.__ogeBench.scroll());
    samples.scrollFps.push(scroll.fps);
    samples.p95FrameMs.push(scroll.p95FrameMs);
    samples.longFrames.push(scroll.longFrames);
    await context.close();
    process.stdout.write(`  ${fw} run ${i + 1}/${runs} done\n`);
  }
  return Object.fromEntries(
    Object.entries(samples).map(([key, values]) => [
      key,
      round(median(values)),
    ]),
  );
}

let server;
if (!baseUrl) {
  const dist = path.join(root, 'dist/apps/dev-app/browser');
  if (!existsSync(dist)) {
    console.error(
      'No production build: run `npx nx run dev-app:build` first, or pass --url.',
    );
    process.exit(1);
  }
  const started = await serve(dist);
  server = started.server;
  baseUrl = `http://localhost:${started.port}`;
}

const browser = await chromium.launch();
try {
  const results = {};
  for (const fw of ['angular', 'react']) {
    process.stdout.write(`${fw}:\n`);
    results[fw] = await measure(browser, fw);
  }
  const cpus = os.cpus();
  let commit = '';
  try {
    commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
  } catch {
    // outside a checkout
  }
  const report = {
    $comment:
      'Generated by tools/benchmarks/grid-bench.mjs — medians of fresh-context runs on a production build. Rendered by /benchmarks.',
    date: new Date().toISOString().slice(0, 10),
    commit,
    rows,
    runs,
    machine: {
      cpu: cpus[0]?.model.trim() ?? 'unknown',
      cores: cpus.length,
      memoryGb: Math.round(os.totalmem() / 1024 ** 3),
      os: `${os.type()} ${os.release()}`,
      node: process.version,
      browser: `Chromium ${browser.version()}`,
    },
    steps: STEPS.map(({ key, label }) => ({ key, label })),
    results,
  };
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(results, null, 2));
  console.log(`written ${path.relative(root, out)}`);
} finally {
  await browser.close();
  server?.close();
}
