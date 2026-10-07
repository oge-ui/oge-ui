import { defineConfig, devices, type Project } from '@playwright/test';
import * as path from 'node:path';

const workspaceRoot = path.resolve(import.meta.dirname, '../..');
const baseURL = process.env['BASE_URL'] || 'http://localhost:4200';

/**
 * The browser matrix. `chromium` is the default run (local and the PR
 * shards); the others join when `OGE_E2E_BROWSERS` names them —
 * `OGE_E2E_BROWSERS=firefox,webkit` or `OGE_E2E_BROWSERS=all` — so a plain
 * `npx nx run dev-app-e2e:e2e` keeps running chromium only.
 *
 * - PRs run the `@smoke` subset on every non-default project (ci.yml →
 *   `e2e-smoke`); the nightly workflow runs the full suite on all of them.
 * - The phone projects run only `@smoke` and `@mobile` tests: the rest of the
 *   suite drives the desktop docs layout (sidebar, wide grids), which is not
 *   what a phone renders.
 * - A test that is inherently chromium-only (CDP, an emulation the engine
 *   lacks) says so with `test.skip(browserName !== 'chromium', reason)`.
 */
const MATRIX = {
  chromium: { use: { ...devices['Desktop Chrome'] } },
  // axe over a full API page and the big grids run about twice as long in
  // Gecko and WebKit as in Chromium; the default 30 s budget was tuned there
  firefox: { use: { ...devices['Desktop Firefox'] }, timeout: 60_000 },
  webkit: { use: { ...devices['Desktop Safari'] }, timeout: 60_000 },
  'mobile-chrome': { use: { ...devices['Pixel 7'] }, grep: /@smoke|@mobile/ },
  'mobile-safari': {
    use: { ...devices['iPhone 14'] },
    grep: /@smoke|@mobile/,
  },
} satisfies Record<string, Omit<Project, 'name'>>;

type BrowserProject = keyof typeof MATRIX;
const ALL = Object.keys(MATRIX) as BrowserProject[];
const requested = (process.env['OGE_E2E_BROWSERS'] || 'chromium')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean);
const enabled = requested.includes('all')
  ? ALL
  : ALL.filter((name) => requested.includes(name));

/**
 * Plain Playwright config (no `nxE2EPreset`): importing Nx's native module
 * from the Playwright ESM config loader crashes on Windows.
 */
export default defineConfig({
  testDir: './src',
  outputDir: path.join(import.meta.dirname, 'test-output'),
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  // A test that only passes on retry is a bug, not a pass: CI fails on it
  // (the retries stay so the report shows *which* attempt failed and why).
  failOnFlakyTests: !!process.env['CI'],
  // CI keeps the HTML report + JUnit as job artifacts (ci.yml → e2e).
  reporter: process.env['CI']
    ? [
        ['dot'],
        [
          'junit',
          { outputFile: path.join(import.meta.dirname, 'test-results.xml') },
        ],
        [
          'html',
          {
            open: 'never',
            outputFolder: path.join(import.meta.dirname, 'playwright-report'),
          },
        ],
      ]
    : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  /**
   * The Nx playwright plugin parses this command and starts `dev-app:serve`
   * itself as a continuous dependency of the e2e target. When Playwright then
   * probes the URL before that server is ready, it spawns this command, which
   * dies instantly on Nx's recursive-task detection — the `||` fallback keeps
   * an idle process alive so Playwright simply keeps polling the URL. In
   * standalone `playwright test` runs (no Nx involved) the first part starts
   * the server normally.
   */
  webServer: {
    command:
      'npx nx run dev-app:serve || node -e "setInterval(() => {}, 2147483647)"',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    cwd: workspaceRoot,
    timeout: 120_000,
  },
  projects: enabled.map((name) => ({ name, ...MATRIX[name] })),
});
