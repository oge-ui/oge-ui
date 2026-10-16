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
  gantt: ['/components/gantt', 'oge-gantt', 2],
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

/** CSS size of a 2×-DPR screenshot (PNG IHDR width/height / 2). */
const cssSize = (png) => ({
  width: png.readUInt32BE(16) / 2,
  height: png.readUInt32BE(20) / 2,
});

/**
 * README hero (CSS px; rendered at 2× DPR, shown at `width="960"` in the
 * README). Two columns of framed live components at a readable scale; the
 * canvas height follows the taller column, so no frame shows empty space.
 */
const HERO_PAD = 48;
const HERO_GAP = 24;
const HERO_BAR = 38;
const HERO_COLUMNS = [
  {
    width: 700,
    windows: [
      { shot: 'data-grid', title: 'Data Grid', pkg: '@oge-ui/grid' },
      { shot: 'gantt', title: 'Gantt', pkg: '@oge-ui/gantt', crop: 300 },
    ],
  },
  {
    width: 476,
    windows: [
      { shot: 'charts', title: 'Charts', pkg: '@oge-ui/charts' },
      // `zoom` keeps a busy component legible: shown at that scale and
      // cropped on the right instead of shrunk to the column width.
      { shot: 'kanban', title: 'Kanban', pkg: '@oge-ui/kanban', zoom: 0.9 },
    ],
  },
];
const HERO_WIDTH =
  HERO_PAD * 2 +
  HERO_COLUMNS.reduce((sum, c) => sum + c.width, 0) +
  HERO_GAP * (HERO_COLUMNS.length - 1);

/**
 * Lays one scheme's hero out; `crop` caps the visible component height
 * (component CSS px) where a demo ends in blank space.
 */
function heroLayout(scheme) {
  const s = shots[scheme];
  const columns = HERO_COLUMNS.map((c) => {
    const windows = c.windows.map((w) => {
      const size = cssSize(s[w.shot]);
      const scale = w.zoom ?? c.width / size.width;
      const visible = Math.min(size.height, w.crop ?? Infinity);
      return {
        ...w,
        imgWidth: Math.round(size.width * scale),
        bodyHeight: Math.round(visible * scale),
      };
    });
    const height =
      windows.reduce((sum, w) => sum + HERO_BAR + w.bodyHeight, 0) +
      HERO_GAP * (windows.length - 1);
    return { ...c, windows, height };
  });
  return {
    columns,
    height: HERO_PAD * 2 + Math.max(...columns.map((c) => c.height)),
  };
}

/** README hero: real components in window frames on a brand backdrop. */
function heroHtml(scheme, layout) {
  const s = shots[scheme];
  const dark = scheme === 'dark';
  const win = (w) => `<section class="win">
      <header><i></i><i></i><i></i><b>${w.title}</b><span>${w.pkg}</span></header>
      <div class="body" style="height:${w.bodyHeight}px"><img src="${dataUri(s[w.shot])}" style="width:${w.imgWidth}px" alt="" /></div>
    </section>`;
  const columns = layout.columns
    .map(
      (c) =>
        `<div class="col" style="width:${c.width}px">${c.windows.map(win).join('')}</div>`,
    )
    .join('');
  return `<!doctype html><html><head><style>${BASE_CSS}
    body { width: ${HERO_WIDTH}px; height: ${layout.height}px; overflow: hidden; padding: ${HERO_PAD}px;
      display: flex; gap: ${HERO_GAP}px; align-items: flex-start;
      background:
        radial-gradient(900px 520px at 100% 100%, ${dark ? 'rgba(99,102,241,.45)' : 'rgba(99,102,241,.22)'}, transparent 70%),
        radial-gradient(760px 480px at 0% 0%, ${dark ? 'rgba(34,211,238,.22)' : 'rgba(34,211,238,.18)'}, transparent 70%),
        radial-gradient(${dark ? 'rgba(148,163,184,.10)' : 'rgba(15,23,42,.07)'} 1px, transparent 1px) 0 0 / 22px 22px,
        ${dark ? '#0b1020' : '#f8fafc'};
      border-radius: 24px; }
    .col { display: flex; flex-direction: column; gap: ${HERO_GAP}px; }
    .win { overflow: hidden; border-radius: 14px; background: ${dark ? '#0f172a' : '#ffffff'};
      box-shadow: ${dark ? '0 24px 60px rgba(0,0,0,.55), 0 0 0 1px rgba(148,163,184,.16)' : '0 24px 60px rgba(15,23,42,.16), 0 0 0 1px rgba(15,23,42,.08)'}; }
    header { display: flex; align-items: center; gap: 7px; height: ${HERO_BAR}px; padding: 0 14px;
      background: ${dark ? '#111827' : '#f1f5f9'}; border-bottom: 1px solid ${dark ? 'rgba(148,163,184,.14)' : 'rgba(15,23,42,.07)'}; }
    header i { width: 11px; height: 11px; border-radius: 50%; background: #ff5f57; }
    header i:nth-child(2) { background: #febc2e; }
    header i:nth-child(3) { background: #28c840; margin-right: 10px; }
    header b { font-size: 13.5px; font-weight: 650; color: ${dark ? '#e2e8f0' : '#0f172a'}; }
    header span { font: 12px ui-monospace, "Cascadia Code", Consolas, monospace; color: ${dark ? '#94a3b8' : '#64748b'}; margin-left: auto; }
    .body { overflow: hidden; }
    .body img { display: block; max-width: none; }
  </style></head><body>${columns}</body></html>`;
}

async function render(html, width, height, file, type, scale = 1) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: scale,
  });
  await page.setContent(html, { waitUntil: 'load' });
  const buffer = await page.screenshot(
    // PNGs keep transparent page corners so the hero's rounded edge shows.
    type === 'jpeg' ? { type, quality: 82 } : { type, omitBackground: true },
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
  const layout = heroLayout(scheme);
  await render(
    heroHtml(scheme, layout),
    HERO_WIDTH,
    layout.height,
    join(ASSET_DIR, `readme-hero-${scheme}.png`),
    'png',
    2,
  );
}

await browser.close();
