import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * The W8c chart components in both render layers: gauges, bullet chart and
 * sparklines; funnel, heatmap, treemap, sunburst, Sankey and the vector map.
 * Semantics, keyboard models, live announcements, drill-down, zoom and an
 * axe scan per page — on real layout (jsdom cannot measure SVG).
 */
const LAYERS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

for (const layer of LAYERS) {
  test.describe(`charts W8c (${layer.name})`, () => {
    async function open(page: Page, path: string): Promise<void> {
      await page.goto(`/components/charts/${path}${layer.query}`);
      if (layer.query) {
        await expect(page.locator('html')).toHaveAttribute(
          'data-framework',
          'react',
        );
      }
    }

    const card = (page: Page, id: string): Locator =>
      page.locator(`app-demo-card:has(#${id})`);

    async function chart(
      page: Page,
      id: string,
      cls: string,
    ): Promise<Locator> {
      const host = card(page, id).locator(cls).first();
      await host.scrollIntoViewIfNeeded();
      await expect(host.locator('svg').first()).toBeVisible();
      return host;
    }

    const live = (host: Locator): Locator =>
      host.locator('.oge-chart-live[aria-live]');

    test('gauges are labelled meters that follow a new reading', async ({
      page,
    }) => {
      await open(page, 'gauges');
      const speed = await chart(page, 'circular-gauge', '.oge-circular-gauge');
      const meter = speed.getByRole('meter', { name: 'Speed gauge' });
      await expect(meter).toHaveAttribute('aria-valuenow', '96');
      await expect(meter).toHaveAttribute('aria-valuetext', '96 km/h, Fast');
      // the needle has swept in from the minimum to 96 of 0..160
      await expect
        .poll(() =>
          speed
            .locator('.oge-gauge-needle')
            .evaluate((el) => (el as SVGElement).style.transform),
        )
        .toBe('rotate(24deg)');
      const before = await meter.getAttribute('aria-valuenow');
      const button = card(page, 'circular-gauge').getByRole('button', {
        name: 'New reading',
        exact: true,
      });
      // a random reading may repeat; a few presses always change it
      await expect
        .poll(async () => {
          await button.click();
          return meter.getAttribute('aria-valuenow');
        })
        .not.toBe(before);
      const level = await chart(page, 'linear-gauge', '.oge-linear-gauge');
      await expect(
        level.getByRole('meter', { name: 'Water tank gauge' }),
      ).toHaveAttribute('aria-valuetext', '62 L');
    });

    test('bullet charts speak value and target; sparklines summarize', async ({
      page,
    }) => {
      await open(page, 'gauges');
      const bullet = await chart(page, 'bullet-chart', '.oge-bullet-chart');
      await expect(
        bullet.getByRole('img', {
          name: 'Revenue (k$) bullet chart: value 270, target 250',
          exact: true,
        }),
      ).toBeVisible();
      await expect(bullet.locator('.oge-bullet-range')).toHaveCount(3);
      const sparks = card(page, 'sparklines').locator('.oge-sparkline');
      await sparks.first().scrollIntoViewIfNeeded();
      await expect(sparks).toHaveCount(12);
      await expect(sparks.first().locator('svg')).toHaveAttribute(
        'aria-label',
        'ACME sparkline, 7 points: first 171, last 182, low 171, high 182',
      );
      const box = await sparks.first().boundingBox();
      if (box === null) throw new Error('no sparkline box');
      await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2);
      await expect(sparks.first().locator('.oge-sparkline-tooltip')).toHaveText(
        '7: 182',
      );
    });

    test('the gauges page has no axe violations', async ({ page }) => {
      test.slow();
      await open(page, 'gauges');
      await expect(page.locator('.oge-circular-gauge').first()).toBeVisible();
      const results = await new AxeBuilder({ page })
        .include('app-demo-card')
        .disableRules(['color-contrast', 'heading-order'])
        .analyze();
      expect(
        results.violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
        ),
      ).toEqual([]);
    });

    test('funnel stages walk by keyboard with conversion rates', async ({
      page,
    }) => {
      await open(page, 'specialized');
      const funnel = await chart(page, 'funnel-pyramid', '.oge-funnel-chart');
      await expect(funnel.locator('.oge-funnel-item')).toHaveCount(5);
      await funnel.locator('.oge-chart-plot-wrap').focus();
      await page.keyboard.press('ArrowDown');
      await expect(live(funnel)).toHaveText('Visits: 12,400');
      await page.keyboard.press('ArrowDown');
      await expect(live(funnel)).toHaveText(
        'Sign-ups: 5,120, 41.3% of first stage',
      );
      await page.keyboard.press('Enter');
      await expect(funnel.locator('.oge-chart-point-selected')).toHaveCount(1);
      await expect(
        funnel.getByRole('button', { name: 'Sign-ups', exact: true }),
      ).toHaveAttribute('aria-pressed', 'true');
    });

    test('heatmap cells navigate like a grid', async ({ page }) => {
      await open(page, 'specialized');
      const heatmap = await chart(page, 'heatmap', '.oge-heatmap');
      await expect(heatmap.locator('.oge-heatmap-cell')).toHaveCount(56);
      await expect(heatmap.locator('.oge-chart-color-bar')).toBeVisible();
      await heatmap.locator('.oge-chart-plot-wrap').focus();
      await page.keyboard.press('ArrowRight');
      await expect(live(heatmap)).toHaveText('Mon, 08: 24');
      await page.keyboard.press('End');
      await expect(live(heatmap)).toHaveText(/^Mon, 22: \d+$/);
      await page.keyboard.press('PageDown');
      await expect(live(heatmap)).toHaveText(/^Sun, 22: \d+$/);
    });

    test('treemap drills down and back up', async ({ page }) => {
      await open(page, 'specialized');
      const treemap = await chart(page, 'treemap', '.oge-treemap');
      await expect
        .poll(() => treemap.locator('.oge-treemap-group').count())
        .toBeGreaterThanOrEqual(3);
      await treemap.locator('.oge-chart-plot-wrap').focus();
      await page.keyboard.press('ArrowRight');
      await expect(live(treemap)).toHaveText(/^Americas: 657 \(/);
      await page.keyboard.press('Enter');
      await expect(live(treemap)).toHaveText('Americas opened');
      await expect(
        treemap.locator('.oge-chart-breadcrumb [aria-current="page"]'),
      ).toHaveText('Americas');
      await expect(treemap.locator('.oge-treemap-tile')).toHaveCount(4);
      await expect(
        card(page, 'treemap')
          .locator('p', { hasText: 'Current root' })
          .locator('code'),
      ).toHaveText('0');
      await page.keyboard.press('Escape');
      await expect(live(treemap)).toHaveText('Back to All');
      await expect(treemap.locator('.oge-chart-breadcrumb')).toHaveCount(0);
    });

    test('sunburst re-roots on a branch and the centre goes up', async ({
      page,
    }) => {
      await open(page, 'specialized');
      const sunburst = await chart(page, 'sunburst', '.oge-sunburst-chart');
      await expect(sunburst.locator('.oge-sunburst-segment')).toHaveCount(12);
      await sunburst.locator('.oge-chart-plot-wrap').focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');
      await expect(live(sunburst)).toHaveText('Engineering opened');
      await expect(sunburst.locator('.oge-sunburst-segment')).toHaveCount(5);
      await sunburst.locator('.oge-sunburst-center').click();
      await expect(sunburst.locator('.oge-sunburst-segment')).toHaveCount(12);
    });

    test('sankey highlights a node’s links on hover and walks columns', async ({
      page,
    }) => {
      await open(page, 'specialized');
      const sankey = await chart(page, 'sankey-diagram', '.oge-sankey-chart');
      await expect(sankey.locator('.oge-sankey-link')).toHaveCount(12);
      await sankey.locator('.oge-sankey-node').first().hover();
      await expect
        .poll(() => sankey.locator('.oge-sankey-dim').count())
        .toBeGreaterThan(0);
      await sankey.locator('.oge-chart-plot-wrap').focus();
      await page.keyboard.press('ArrowDown');
      await expect(live(sankey)).toHaveText(/^\w+: out \d+$/);
      await page.keyboard.press('ArrowRight');
      await expect(live(sankey)).toHaveText(/: in \d+/);
    });

    test('vector map zooms, pans and walks regions', async ({ page }) => {
      await open(page, 'specialized');
      const map = await chart(page, 'vector-map', '.oge-vector-map');
      await expect(map.locator('.oge-map-region')).toHaveCount(12);
      const layerGroup = map.locator('.oge-map-svg > g').first();
      await map.getByRole('button', { name: 'Zoom in', exact: true }).click();
      await expect(layerGroup).toHaveAttribute('transform', /scale\(1\.5\)/);
      await map
        .getByRole('button', { name: 'Reset zoom', exact: true })
        .click();
      await expect(layerGroup).toHaveAttribute(
        'transform',
        'translate(0 0) scale(1)',
      );
      await map.locator('.oge-chart-plot-wrap').focus();
      await page.keyboard.press('ArrowRight');
      await expect(live(map)).toHaveText(/^Northmark: \d+$/);
      await page.keyboard.press('ArrowRight');
      await expect(live(map)).toHaveText(/^Fjordale: \d+$/);
      await page.keyboard.press('+');
      await expect(layerGroup).toHaveAttribute('transform', /scale\(1\.5\)/);
      await page.keyboard.press('Enter');
      await expect(map.locator('.oge-chart-point-selected')).toHaveCount(1);
    });

    test('the specialized page has no axe violations', async ({ page }) => {
      test.slow();
      await open(page, 'specialized');
      await expect(page.locator('.oge-vector-map').first()).toBeVisible();
      await expect(page.locator('.oge-map-region').first()).toBeVisible();
      const results = await new AxeBuilder({ page })
        .include('app-demo-card')
        .disableRules(['color-contrast', 'heading-order'])
        .analyze();
      expect(
        results.violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
        ),
      ).toEqual([]);
    });
  });
}
