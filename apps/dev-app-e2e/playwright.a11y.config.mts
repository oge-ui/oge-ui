import { defineConfig, devices } from '@playwright/test';
import * as path from 'node:path';

const workspaceRoot = path.resolve(import.meta.dirname, '../..');
const PORT = 4324;

/**
 * The per-route axe crawl (`a11y/`): every sitemap route of the prerendered
 * build, scanned with the WCAG 2.0 A – 2.2 AA rule tags. Served like the SSR
 * suite (`serve-prerendered.mjs`, production headers) on its own port so the
 * two can run side by side. Build first: `npx nx run dev-app-e2e:e2e-a11y`
 * depends on `dev-app:build`. Runs nightly (nightly.yml), sharded.
 */
export default defineConfig({
  testDir: './a11y',
  outputDir: path.join(import.meta.dirname, 'test-output-a11y'),
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  failOnFlakyTests: !!process.env['CI'],
  reporter: process.env['CI']
    ? [
        ['dot'],
        [
          'junit',
          {
            outputFile: path.join(import.meta.dirname, 'test-results-a11y.xml'),
          },
        ],
      ]
    : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
    locale: 'en-US',
    timezoneId: 'UTC',
  },
  webServer: {
    command: `node tools/docs-tools/serve-prerendered.mjs --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/robots.txt`,
    reuseExistingServer: !process.env['CI'],
    cwd: workspaceRoot,
    timeout: 30_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
