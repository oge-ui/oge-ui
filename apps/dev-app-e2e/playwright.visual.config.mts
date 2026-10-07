import { defineConfig, devices } from '@playwright/test';
import * as path from 'node:path';

const workspaceRoot = path.resolve(import.meta.dirname, '../..');
const baseURL = process.env['BASE_URL'] || 'http://localhost:4200';
/**
 * The browser of a visual run always lives in the official Playwright Docker
 * image (`tools/e2e/visual.mjs` starts it and sets this endpoint): fonts,
 * the rasteriser and the browser build are then the same on a laptop and on
 * the CI runner, so one set of baselines serves both. `exposeNetwork`
 * tunnels the container's `localhost` back to this machine's dev server.
 */
const wsEndpoint = process.env['OGE_VISUAL_WS'];

/**
 * Visual regression (`visual/`): `toHaveScreenshot` baselines of a curated
 * set of components × light / dark / high-contrast × Angular / React.
 * Run through `npm run e2e:visual` / `npm run e2e:visual:update` (or the
 * `dev-app-e2e:e2e-visual` / `e2e-visual-update` Nx targets), never with a
 * locally installed browser — a baseline written by Windows or macOS
 * rasterises text differently and would fail on CI.
 */
export default defineConfig({
  testDir: './visual',
  outputDir: path.join(import.meta.dirname, 'test-output-visual'),
  // one baseline set for every host OS: the browser runs in the same image
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  failOnFlakyTests: !!process.env['CI'],
  workers: 2,
  reporter: process.env['CI']
    ? [
        ['dot'],
        [
          'junit',
          {
            outputFile: path.join(
              import.meta.dirname,
              'test-results-visual.xml',
            ),
          },
        ],
        [
          'html',
          {
            open: 'never',
            outputFolder: path.join(
              import.meta.dirname,
              'playwright-report-visual',
            ),
          },
        ],
      ]
    : 'list',
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      // anti-aliasing noise only; a lost state colour is far above this
      maxDiffPixelRatio: 0.002,
    },
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    locale: 'en-US',
    timezoneId: 'UTC',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    ...(wsEndpoint
      ? { connectOptions: { wsEndpoint, exposeNetwork: '<loopback>' } }
      : {}),
  },
  webServer: {
    command:
      'npx nx run dev-app:serve || node -e "setInterval(() => {}, 2147483647)"',
    url: baseURL,
    reuseExistingServer: true,
    cwd: workspaceRoot,
    timeout: 180_000,
  },
  projects: [
    {
      name: 'visual',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 900 },
        deviceScaleFactor: 1,
      },
    },
  ],
});
