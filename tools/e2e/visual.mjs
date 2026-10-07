#!/usr/bin/env node
/**
 * Runs the visual-regression project (`apps/dev-app-e2e/visual`) with its
 * browser inside the official Playwright Docker image that matches the
 * installed `@playwright/test` — the same image locally and on CI, so the
 * committed baselines are rasterised by the same fonts, Skia build and
 * browser revision everywhere.
 *
 *   node tools/e2e/visual.mjs            compare against the baselines
 *   node tools/e2e/visual.mjs --update   rewrite the baselines
 *
 * Any other argument is passed to `playwright test`. The test runner and the
 * dev server stay on the host; only the browser runs in the container
 * (`playwright run-server`), reached over a WebSocket, and it reaches the
 * host's `localhost` through `exposeNetwork` (see playwright.visual.config.mts).
 * Needs Docker. `BASE_URL` picks another dev-server URL (default :4200).
 */
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const version = JSON.parse(
  readFileSync(
    path.join(root, 'node_modules/@playwright/test/package.json'),
    'utf8',
  ),
).version;
const image = `mcr.microsoft.com/playwright:v${version}-noble`;
const port = Number(process.env['OGE_VISUAL_PORT'] || 3939);
const name = `oge-visual-${process.pid}`;

const args = process.argv.slice(2);
const update = args.includes('--update');
const passThrough = args.filter((arg) => arg !== '--update');

function docker(dockerArgs, options = {}) {
  const result = spawnSync('docker', dockerArgs, {
    stdio: 'inherit',
    ...options,
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

/**
 * Docker publishes the port before anything inside listens on it, so
 * readiness is the server's own "Listening on" line in the container log.
 */
async function waitForServer(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const logs = spawnSync('docker', ['logs', name], { encoding: 'utf8' });
    if (`${logs.stdout}${logs.stderr}`.includes('Listening on')) return;
    if (logs.status !== 0) throw new Error('the browser container exited');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`playwright run-server did not listen on :${port}`);
}

function stopContainer() {
  spawnSync('docker', ['rm', '-f', name], { stdio: 'ignore' });
}

let status = 1;
try {
  console.log(`visual: browser container ${image}`);
  const started = docker([
    'run',
    '-d',
    '--rm',
    '--name',
    name,
    '--init',
    '--ipc=host',
    '-p',
    `127.0.0.1:${port}:${port}`,
    '-e',
    'TZ=UTC',
    '-e',
    'LANG=en_US.UTF-8',
    image,
    '/bin/sh',
    '-c',
    `npx -y playwright@${version} run-server --port ${port} --host 0.0.0.0`,
  ]);
  if (started !== 0) throw new Error('docker run failed — is Docker running?');
  // the first start downloads the `playwright` package into the container
  await waitForServer(180_000);

  const runner = spawn(
    'npx',
    [
      'playwright',
      'test',
      '-c',
      'apps/dev-app-e2e/playwright.visual.config.mts',
      ...(update ? ['--update-snapshots=all'] : []),
      ...passThrough,
    ],
    {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        OGE_VISUAL_WS: `ws://127.0.0.1:${port}/`,
      },
    },
  );
  status = await new Promise((resolve) => {
    runner.on('exit', (code) => resolve(code ?? 1));
    runner.on('error', () => resolve(1));
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  status = 1;
} finally {
  stopContainer();
}
process.exit(status);
