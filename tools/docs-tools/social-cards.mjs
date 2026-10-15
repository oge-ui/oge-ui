/**
 * Renders the site's share images and the README hero from the live demos.
 *
 *   npx nx run dev-app:build
 *   node tools/docs-tools/serve-prerendered.mjs &      # port 4323
 *   node tools/docs-tools/social-cards.mjs [--origin http://localhost:4323]
 *
 * Writes (all committed — re-run after a visual change to a flagship demo):
 * - `apps/dev-app/public/og/<family>.jpg`  1200×630 Open Graph / Twitter cards,
 *   one per flagship family plus `default.jpg` (read by `SeoService`)
 * - `docs/assets/social-preview.png`       1280×640 GitHub repository preview
 *   (upload by hand: repo Settings → General → Social preview)
 * - `docs/assets/readme-hero-{light,dark}.png` the README's `<picture>` hero
 *
 * Every image is a real screenshot of the prerendered docs, composed onto a
 * card in a headless page — no design tool, so the cards never drift from
 * what the components actually look like.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const at = args.indexOf('--origin');
const ORIGIN = at >= 0 ? args[at + 1] : 'http://localhost:4323';
const ROOT = resolve('.');
const OG_DIR = join(ROOT, 'apps/dev-app/public/og');
const ASSET_DIR = join(ROOT, 'docs/assets');
mkdirSync(OG_DIR, { recursive: true });
mkdirSync(ASSET_DIR, { recursive: true });

/** The component each card shows: page, host selector, which instance. */
const SHOTS = {
  'data-grid': ['/components/data-grid/grouping', 'oge-grid', 0],
  'pivot-grid': ['/components/pivot-grid', 'oge-pivot-grid', 0],
  gantt: ['/components/gantt', 'oge-gantt', 1],
  scheduler: ['/components/scheduler', 'oge-scheduler', 0],
  charts: ['/components/charts', 'oge-chart', 1],
  kanban: ['/components/kanban', 'oge-kanban', 0],
};

/** Card copy per family; `default` is the home page and every other route. */
const CARDS = {
  default: {
    title: 'Angular &amp; React UI components for data-heavy apps',
    sub: 'Data Grid · Pivot · Charts · Scheduler · Gantt · Kanban · 60+ components',
    shot: 'data-grid',
  },
  'data-grid': {
    title: 'Angular &amp; React Data Grid',
    sub: 'Virtualized to millions of rows · grouping · editing · Excel/PDF export · MIT',
    shot: 'data-grid',
  },
  'pivot-grid': {
    title: 'Angular &amp; React Pivot Grid',
    sub: 'Drag-and-drop fields · totals · calculated fields · Top-N filters · export',
    shot: 'pivot-grid',
  },
  gantt: {
    title: 'Angular &amp; React Gantt Chart',
    sub: 'Dependencies · critical path · baselines · drag editing · undo/redo',
    shot: 'gantt',
  },
  scheduler: {
    title: 'Angular &amp; React Scheduler',
    sub: 'Day · week · month · timeline views · recurrence · drag &amp; resize',
    shot: 'scheduler',
  },
  charts: {
    title: 'Angular &amp; React Charts',
    sub: 'Dependency-free SVG · 16 series types · zoom &amp; pan · accessible',
    shot: 'charts',
  },
  kanban: {
    title: 'Angular &amp; React Kanban Board',
    sub: 'Swimlanes · WIP limits · virtualization · keyboard card moving',
    shot: 'kanban',
  },
};

const dataUri = (buffer, type = 'image/png') =>
  `data:${type};base64,${buffer.toString('base64')}`;
const LOGO = dataUri(
  readFileSync(join(ROOT, 'apps/dev-app/public/web-app-manifest-512x512.png')),
);

const browser = await chromium.launch();

/** Screenshots one live component in the given color scheme. */
async function capture(name, scheme) {
  const [path, selector, index] = SHOTS[name];
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    locale: 'en-US',
    colorScheme: scheme,
  });
  await page.addInitScript((mode) => {
    try {
      localStorage.setItem('oge-docs-mode', mode);
    } catch {
      /* the default mode is fine */
    }
  }, scheme);
  await page.goto(ORIGIN + path, { waitUntil: 'networkidle' });
  const element = page.locator(selector).nth(index);
  await element.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const png = await element.screenshot({ animations: 'disabled' });
  await page.close();
  return png;
}

const shots = { light: {}, dark: {} };
for (const scheme of ['light', 'dark']) {
  for (const name of Object.keys(SHOTS)) {
    shots[scheme][name] = await capture(name, scheme);
  }
}

const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; }
  body { font-family: "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif; }
  .shot { display: block; border-radius: 14px; box-shadow: 0 30px 80px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.08); }
`;

/** A 1200×630 (or 1280×640) dark card: copy on top, the component below. */
function cardHtml(card, width, height) {
  const shot = dataUri(shots.dark[card.shot]);
  return `<!doctype html><html><head><style>${BASE_CSS}
    body { width: ${width}px; height: ${height}px; overflow: hidden; color: #f8fafc;
      background: radial-gradient(1200px 600px at 85% 110%, rgba(99,102,241,.55), transparent 60%),
                  radial-gradient(800px 500px at -10% -20%, rgba(34,211,238,.25), transparent 60%), #0b1120; }
    .top { position: absolute; left: 64px; top: 52px; right: 64px; }
    .brand { display: flex; align-items: center; gap: 14px; font-size: 26px; font-weight: 700; letter-spacing: .02em; }
    .brand img { width: 46px; height: 46px; }
    .brand span { color: #94a3b8; font-weight: 500; font-size: 20px; margin-left: 6px; }
    h1 { margin-top: 26px; font-size: 54px; line-height: 1.08; font-weight: 800; letter-spacing: -.02em; max-width: 1000px;
      background: linear-gradient(90deg, #fff 0%, #c7d2fe 60%, #a5b4fc 100%); -webkit-background-clip: text; color: transparent; }
    p { margin-top: 16px; font-size: 23px; color: #cbd5e1; }
    .frame { position: absolute; left: 64px; right: 64px; top: ${height - 268}px; height: 420px; overflow: hidden; border-radius: 14px; }
    .frame .shot { width: 100%; }
  </style></head><body>
    <div class="top">
      <div class="brand"><img src="${LOGO}" alt="" />OGE UI <span>ogeui.com</span></div>
      <h1>${card.title}</h1>
      <p>${card.sub}</p>
    </div>
    <div class="frame"><img class="shot" src="${shot}" alt="" /></div>
  </body></html>`;
}

/** README hero: the grid large, four families stacked beside it. */
function heroHtml(scheme) {
  const s = shots[scheme];
  const dark = scheme === 'dark';
  const tile = (name) =>
    `<div class="tile"><img class="shot" src="${dataUri(s[name])}" alt="" /></div>`;
  return `<!doctype html><html><head><style>${BASE_CSS}
    body { width: 1600px; height: 820px; overflow: hidden; padding: 40px;
      background: ${dark ? '#0d1117' : '#ffffff'}; }
    .grid { display: grid; grid-template-columns: 1.25fr 1fr; gap: 28px; height: 100%; }
    .main { overflow: hidden; border-radius: 14px; }
    .main .shot { width: 100%; }
    .side { display: grid; grid-template-rows: repeat(2, 1fr); grid-template-columns: 1fr 1fr; gap: 24px; min-height: 0; }
    .tile { overflow: hidden; border-radius: 14px; min-height: 0; }
    .tile .shot { width: 100%; }
    ${dark ? '' : '.shot { box-shadow: 0 18px 50px rgba(15,23,42,.14), 0 0 0 1px rgba(15,23,42,.08); }'}
  </style></head><body><div class="grid">
    <div class="main"><img class="shot" src="${dataUri(s['data-grid'])}" alt="" /></div>
    <div class="side">${['pivot-grid', 'charts', 'gantt', 'kanban'].map(tile).join('')}</div>
  </div></body></html>`;
}

async function render(html, width, height, file, type) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.setContent(html, { waitUntil: 'load' });
  const buffer = await page.screenshot(
    type === 'jpeg' ? { type, quality: 82 } : { type },
  );
  writeFileSync(file, buffer);
  await page.close();
  console.log(
    `✓ ${file.slice(ROOT.length + 1)} (${Math.round(buffer.length / 1024)} KB)`,
  );
}

for (const [name, card] of Object.entries(CARDS)) {
  await render(
    cardHtml(card, 1200, 630),
    1200,
    630,
    join(OG_DIR, `${name}.jpg`),
    'jpeg',
  );
}
await render(
  cardHtml(CARDS.default, 1280, 640),
  1280,
  640,
  join(ASSET_DIR, 'social-preview.png'),
  'png',
);
for (const scheme of ['light', 'dark']) {
  await render(
    heroHtml(scheme),
    1600,
    820,
    join(ASSET_DIR, `readme-hero-${scheme}.png`),
    'png',
  );
}

await browser.close();
