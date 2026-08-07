import { defineConfig, devices } from '@playwright/test';
import * as path from 'node:path';

const workspaceRoot = path.resolve(import.meta.dirname, '../..');
const baseURL = process.env['BASE_URL'] || 'http://localhost:4200';

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
  reporter: process.env['CI'] ? 'dot' : 'list',
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
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // firefox/webkit can be enabled once `npx playwright install` has fetched them
  ],
});
