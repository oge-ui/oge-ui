import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * The charts "Axes & layout" page in both render layers: rotated bars,
 * constant lines and strips, panes with period buttons, axis breaks, tick
 * and label options, RTL, two-finger pinch zoom and the draw-in — on real
 * layout (jsdom cannot measure SVG or synthesize multi-touch).
 */
const LAYERS = [
  { name: 'Angular', query: '', host: 'oge-chart' },
  {
    name: 'React',
    query: '?framework=react',
    host: 'app-react-host .oge-chart',
  },
] as const;

for (const layer of LAYERS) {
  test.describe(`charts axes & layout (${layer.name})`, () => {
    const chart = (page: Page, id: string): Locator =>
      page.locator(`app-demo-card:has(#${id}) ${layer.host}`).first();

    async function open(page: Page, id: string): Promise<Locator> {
      await page.goto(`/components/charts/axes-layout${layer.query}`);
      if (layer.query) {
        await expect(page.locator('html')).toHaveAttribute(
          'data-framework',
          'react',
        );
      }
      const host = chart(page, id);
      await host.scrollIntoViewIfNeeded();
      await expect(host.locator('.oge-chart-svg')).toBeVisible();
      return host;
    }

    test('rotated bars run horizontally with the categories down the left', async ({
      page,
    }) => {
      const host = await open(page, 'rotated-bars');
      await expect(host.locator('.oge-chart-bar')).toHaveCount(10);
      const bar = await host.locator('.oge-chart-bar').first().boundingBox();
      if (bar === null) throw new Error('no bar box');
      expect(bar.width).toBeGreaterThan(bar.height);
      const labels = host.locator('.oge-chart-arg-label');
      await expect(labels.first()).toHaveText('North');
      const first = await labels.first().boundingBox();
      const last = await labels.last().boundingBox();
      if (first === null || last === null) throw new Error('no label box');
      expect(first.y).toBeLessThan(last.y);
      // hover a row: the tooltip names its category
      const svg = await host.locator('.oge-chart-svg').boundingBox();
      if (svg === null) throw new Error('no svg box');
      await page.mouse.move(
        svg.x + svg.width * 0.4,
        first.y + first.height / 2,
      );
      await expect(host.locator('.oge-chart-tooltip')).toContainText('North');
      // Up/Down walk the categories — from the hovered row (North), one
      // step down is the next category
      await host.locator('.oge-chart-plot-wrap').focus();
      await page.keyboard.press('ArrowDown');
      await expect(host.locator('.oge-chart-live')).toContainText('East');
    });

    test('constant lines and strips label inside the svg', async ({ page }) => {
      const host = await open(page, 'constant-lines-strips');
      await expect(host.locator('.oge-chart-constant-line')).toHaveCount(3);
      const svg = await host.locator('.oge-chart-svg').boundingBox();
      if (svg === null) throw new Error('no svg box');
      for (const text of [
        'SLO 250 ms',
        'Goal',
        'Release 2.0',
        'Comfort zone',
        'Freeze',
      ]) {
        const label = host.locator('.oge-chart-strip-label', { hasText: text });
        const box = await label.boundingBox();
        if (box === null) throw new Error(`no box for ${text}`);
        expect(box.x).toBeGreaterThanOrEqual(svg.x - 1);
        expect(box.x + box.width).toBeLessThanOrEqual(svg.x + svg.width + 1);
      }
    });

    test('panes share the crosshair; period buttons set the window', async ({
      page,
    }) => {
      const host = await open(page, 'panes-price-volume');
      await expect(host.locator('clipPath')).toHaveCount(2);
      const lines = host.locator('.oge-chart-axis-line');
      await expect(lines).toHaveCount(2);
      // hover the volume pane: the vertical line spans both panes
      const svg = await host.locator('.oge-chart-svg').boundingBox();
      if (svg === null) throw new Error('no svg box');
      await page.mouse.move(svg.x + svg.width * 0.4, svg.y + svg.height * 0.8);
      await expect(host.locator('.oge-chart-crosshair')).toHaveCount(2);
      const card = page.locator('app-demo-card:has(#panes-price-volume)');
      const window = card.locator('.oge-range-window').first();
      const before = await window.boundingBox();
      const oneMonth = card.getByRole('button', { name: '1M', exact: true });
      await oneMonth.click();
      await expect(oneMonth).toHaveAttribute('aria-pressed', 'true');
      const after = await window.boundingBox();
      if (before === null || after === null) throw new Error('no window box');
      expect(after.width).toBeLessThan(before.width / 3);
      await card.getByRole('button', { name: 'All', exact: true }).click();
      await expect(oneMonth).toHaveAttribute('aria-pressed', 'false');
    });

    test('a value-axis break draws its zig-zag marker', async ({ page }) => {
      const host = await open(page, 'axis-breaks');
      await expect(host.locator('.oge-chart-break-line')).toHaveCount(1);
      await expect(host.locator('.oge-chart-bar')).toHaveCount(5);
    });

    test('weekly ticks stagger and the value template renders', async ({
      page,
    }) => {
      const host = await open(page, 'ticks-labels');
      const args = host.locator('.oge-chart-arg-label');
      const ys = new Set(
        await args.evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute('y')),
        ),
      );
      expect(ys.size).toBeLessThanOrEqual(2);
      await expect(
        host.locator('.oge-chart-axis-label', { hasText: '°C' }).first(),
      ).toBeVisible();
      expect(
        await host.locator('.oge-chart-tick-mark').count(),
      ).toBeGreaterThan(0);
    });

    test('RTL mirrors the axis; two fingers pinch-zoom the plot', async ({
      page,
      browserName,
    }) => {
      test.skip(
        browserName !== 'chromium',
        'the two-finger pinch is CDP Input.dispatchTouchEvent',
      );
      const host = await open(page, 'rtl-touch');
      const labels = host.locator('.oge-chart-arg-label');
      const first = await labels.first().boundingBox();
      const last = await labels.last().boundingBox();
      if (first === null || last === null) throw new Error('no label box');
      expect(first.x).toBeGreaterThan(last.x);
      const texts = async () =>
        labels.evaluateAll((nodes) => nodes.map((node) => node.textContent));
      const before = await texts();
      // a two-finger spread through CDP (Playwright has no multi-touch API)
      const svg = await host.locator('.oge-chart-svg').boundingBox();
      if (svg === null) throw new Error('no svg box');
      const cdp = await page.context().newCDPSession(page);
      const y = svg.y + svg.height / 2;
      const cx = svg.x + svg.width / 2;
      const touch = (type: string, spread: number) =>
        cdp.send('Input.dispatchTouchEvent', {
          type,
          touchPoints:
            type === 'touchEnd'
              ? []
              : [
                  { x: cx - spread, y, id: 1 },
                  { x: cx + spread, y, id: 2 },
                ],
        });
      await touch('touchStart', 40);
      for (const spread of [60, 90, 120, 160, 200]) {
        await touch('touchMove', spread);
      }
      await touch('touchEnd', 0);
      await expect.poll(texts).not.toEqual(before);
    });

    test('the draw-in plays on replay and then clears', async ({ page }) => {
      const host = await open(page, 'draw-in-animation');
      const card = page.locator('app-demo-card:has(#draw-in-animation)');
      await card.getByRole('button', { name: 'Replay' }).click();
      const series = card.locator('.oge-chart-series').first();
      await expect(series).toHaveClass(/oge-chart-series-enter/);
      await expect(series).not.toHaveClass(/oge-chart-series-enter/, {
        timeout: 5000,
      });
      await expect(host.locator('.oge-chart-bar')).toHaveCount(4);
    });

    test('axe: no violations in either theme', async ({ page }) => {
      test.slow();
      await open(page, 'rotated-bars');
      for (const dark of [false, true]) {
        if (dark) {
          await page.getByLabel('Switch to dark mode').click();
          await expect(page.locator('html')).toHaveClass(/oge-theme-dark/);
        }
        const results = await new AxeBuilder({ page })
          .include('app-demo-card')
          // heading-order: the site-wide demo-card pattern (h1 → card h3),
          // disabled in every chart spec for the same reason
          .disableRules(['color-contrast', 'heading-order'])
          .analyze();
        expect(results.violations.map((v) => v.id)).toEqual([]);
      }
    });
  });
}
