/**
 * Captures the docs landing page's showcase and bento images from the four
 * example apps under `examples/` (build each one first: `npm run build` in its
 * folder). Serves every `dist` on a local port, drives it with Playwright and
 * encodes WebP with Chromium's own canvas encoder, so no image library is
 * needed.
 *
 *   node tools/docs-tools/capture-showcase.mjs [families,…|shots]
 *
 * Writes `apps/dev-app/public/showcase/<app>-<view>-<theme>.webp` (1440×900)
 * and `bento-<family>-<theme>.webp`. The optional argument limits the run to
 * some bento families (`kanban,bpmn`), plus the page shots with `shots`.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const ROOT = path.join(REPO, 'examples');
const OUT = path.join(REPO, 'apps/dev-app/public/showcase');
fs.mkdirSync(OUT, { recursive: true });

const APPS = {
  vantage: { dir: `${ROOT}/erp-suite/dist`, port: 4321 },
  astra: {
    dir: `${ROOT}/sales-dashboard/dist/sales-dashboard/browser`,
    port: 4322,
  },
  pulse: { dir: `${ROOT}/customer-manager/dist`, port: 4323 },
  atlas: {
    dir: `${ROOT}/knowledge-base/dist/knowledge-base/browser`,
    port: 4324,
  },
};

const ONLY = process.argv[2] ? process.argv[2].split(',') : null;
const SHOTS =
  ONLY && !ONLY.includes('shots')
    ? []
    : [
        ['vantage', 'Dashboard'],
        ['vantage', 'Procurement'],
        ['vantage', 'Production'],
        ['astra', 'Overview'],
        ['astra', 'Projects'],
        ['astra', 'Workflows'],
        ['pulse', 'Accounts'],
        ['pulse', 'Revenue'],
        ['pulse', 'Calendar'],
        ['atlas', 'Articles'],
        ['atlas', 'Guides'],
        ['atlas', 'Telemetry'],
      ];

// family → [app, view, selector]
const BENTO = {
  kanban: ['astra', 'Projects', 'oge-kanban'],
  gantt: ['astra', 'Roadmap', 'oge-gantt'],
  scheduler: ['astra', 'Calendar', 'oge-scheduler'],
  pivot: ['astra', 'Revenue cube', 'oge-pivot-grid'],
  spreadsheet: ['astra', 'Workbook', 'oge-spreadsheet'],
  bpmn: ['astra', 'Workflows', 'oge-bpmn-editor'],
  charts: ['vantage', 'Dashboard', '.grid-2-1 > :first-child'],
  grid: ['astra', 'Orders', 'oge-grid'],
};

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.xlsx': 'application/octet-stream',
  '.webmanifest': 'application/manifest+json',
};

const servers = [];
for (const { dir, port } of Object.values(APPS)) {
  servers.push(
    await new Promise((resolve) => {
      const s = http.createServer((req, res) => {
        const url = decodeURIComponent(req.url.split('?')[0]);
        let file = path.join(dir, url);
        if (!fs.existsSync(file) || fs.statSync(file).isDirectory())
          file = path.join(dir, 'index.html');
        res.writeHead(200, {
          'content-type':
            MIME[path.extname(file)] || 'application/octet-stream',
        });
        fs.createReadStream(file).pipe(res);
      });
      s.listen(port, () => resolve(s));
    }),
  );
}

const browser = await chromium.launch();
const encoder = await browser.newPage();
await encoder.setContent('<html><body></body></html>');

async function toWebp(png, file, quality = 0.82) {
  const b64 = png.toString('base64');
  const dataUrl = await encoder.evaluate(
    async ({ b64, quality }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      return c.toDataURL('image/webp', quality);
    },
    { b64, quality },
  );
  fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
}

const sizes = [];
for (const theme of ['light', 'dark']) {
  for (const [name, { port }] of Object.entries(APPS)) {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      locale: 'en-US',
    });
    await ctx.addInitScript(() => {
      for (const k of [
        'astra-crm-intro-seen',
        'pulse-crm-intro-seen',
        'atlas-docs-intro-seen',
        'vantage-erp-intro-seen',
      ])
        localStorage.setItem(k, '1');
    });
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    if (theme === 'dark') {
      await page.locator('.app-actions .app-icon-btn').last().click();
      await page.waitForTimeout(400);
    }
    const go = async (view) => {
      await page.locator('.app-nav-item', { hasText: view }).first().click();
      await page.mouse.move(1430, 890);
      await page.waitForTimeout(
        /Workbook|Workflows|Roadmap|Production|Calendar/.test(view)
          ? 2600
          : 1400,
      );
    };
    for (const [app, view] of SHOTS.filter(([a]) => a === name)) {
      await go(view);
      const png = await page.screenshot({ animations: 'disabled' });
      const file = path.join(
        OUT,
        `${app}-${view.toLowerCase().replace(/\s+/g, '-')}-${theme}.webp`,
      );
      await toWebp(png, file);
      sizes.push([path.basename(file), fs.statSync(file).size]);
    }
    for (const [family, [app, view, selector]] of Object.entries(BENTO)) {
      if (app !== name || (ONLY && !ONLY.includes(family))) continue;
      await go(view);
      if (family === 'bpmn') {
        await page.getByRole('button', { name: 'Zoom to fit' }).first().click();
        await page.waitForTimeout(800);
      }
      const el = page.locator(selector).first();
      await el.evaluate((e) => {
        e.scrollIntoView({ block: 'start' });
        window.scrollBy(0, -72);
      });
      await page.waitForTimeout(400);
      const box = await el.boundingBox();
      if (!box) {
        console.log('no box for', family);
        continue;
      }
      const clip = {
        x: Math.max(0, box.x),
        y: Math.max(0, box.y),
        width: Math.min(box.width, 1440 - box.x),
        height: Math.min(box.height, 520, 900 - box.y),
      };
      const png = await page.screenshot({ clip, animations: 'disabled' });
      const file = path.join(OUT, `bento-${family}-${theme}.webp`);
      await toWebp(png, file, 0.85);
      sizes.push([path.basename(file), fs.statSync(file).size]);
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    const wm = await page.evaluate(
      () => !!document.querySelector('.oge-license-watermark'),
    );
    if (wm) console.log('WATERMARK on', name);
    await ctx.close();
  }
}
await browser.close();
for (const s of servers) s.close();
let total = 0;
for (const [f, n] of sizes) {
  total += n;
  console.log(f.padEnd(40), Math.round(n / 1024) + ' KB');
}
console.log('TOTAL', Math.round(total / 1024) + ' KB');
