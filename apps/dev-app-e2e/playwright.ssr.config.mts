import { defineConfig, devices } from '@playwright/test';
import * as path from 'node:path';

const workspaceRoot = path.resolve(import.meta.dirname, '../..');
const PORT = 4323;

/**
 * The SSR / hydration / CSP specs (`ssr/`) run against the **prerendered
 * build** — the artifact the docs host serves — not the dev server the main
 * config uses. `tools/docs-tools/serve-prerendered.mjs` serves it with the
 * `vercel.json` routing and headers (and, per request, a strict nonce CSP).
 * Build first: `npx nx run dev-app-e2e:e2e-ssr` depends on `dev-app:build`.
 */
export default defineConfig({
  testDir: './ssr',
  outputDir: path.join(import.meta.dirname, 'test-output-ssr'),
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
            outputFile: path.join(import.meta.dirname, 'test-results-ssr.xml'),
          },
        ],
      ]
    : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
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
