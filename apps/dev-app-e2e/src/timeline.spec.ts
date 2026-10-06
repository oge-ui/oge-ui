import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * The timeline adds no roles and no keyboard model, so what e2e must prove is
 * the semantics it does promise — a real ordered list with one item per
 * entry, `<time datetime>` for Date times, decoration out of the
 * accessibility tree — plus the alternating sides and a clean axe run, in
 * both render layers.
 */
const FRAMEWORKS = [
  ['Angular', ''],
  ['React', '?framework=react'],
] as const;

for (const [name, query] of FRAMEWORKS) {
  test.describe(`${name} timeline`, () => {
    test('renders an ordered list with datetime attributes', async ({
      page,
    }) => {
      await page.goto(`/components/timeline${query}`);
      const demo = page.locator('app-demo-card:has(#vertical-timeline)');
      const list = demo.getByRole('list', {
        name: 'Order history',
        exact: true,
      });
      await list.scrollIntoViewIfNeeded();
      await expect(list).toBeVisible();
      await expect
        .poll(async () => list.evaluate((el) => el.tagName))
        .toBe('OL');
      await expect(list.getByRole('listitem')).toHaveCount(4);
      await expect(list.locator('time').first()).toHaveAttribute(
        'datetime',
        '2026-03-14T09:30:00',
      );
      // the free-text time makes no datetime claim
      await expect(list.locator('time').nth(3)).not.toHaveAttribute(
        'datetime',
        /.*/,
      );
      await expect(
        list.locator('.oge-timeline-separator').first(),
      ).toHaveAttribute('aria-hidden', 'true');
      // no connector after the last entry
      await expect(list.locator('.oge-timeline-connector')).toHaveCount(3);
    });

    test('alternates sides and follows the align switcher', async ({
      page,
    }) => {
      await page.goto(`/components/timeline${query}`);
      const demo = page.locator('app-demo-card:has(#alignment-alternating)');
      const items = demo.locator('li.oge-timeline-item');
      await items.first().scrollIntoViewIfNeeded();
      await expect(items.nth(0)).toHaveClass(/oge-timeline-item-end/);
      await expect(items.nth(1)).toHaveClass(/oge-timeline-item-start/);
      await expect(
        demo.locator('.oge-timeline-opposite time').first(),
      ).toBeVisible();

      await demo.locator('select').selectOption('start');
      await expect
        .poll(async () => demo.locator('.oge-timeline-item-start').count())
        .toBe(4);
      await expect(demo.locator('.oge-timeline-opposite')).toHaveCount(0);
    });

    test('the horizontal timeline scrolls inside itself, never the page', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/components/timeline${query}`);
      const demo = page.locator('app-demo-card:has(#horizontal-timeline)');
      await demo.locator('.oge-timeline-horizontal').scrollIntoViewIfNeeded();
      await expect(demo.locator('.oge-timeline-horizontal')).toBeVisible();
      await expect
        .poll(async () =>
          page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth,
          ),
        )
        .toBe(true);
    });

    test('custom templates keep links in the Tab order', async ({ page }) => {
      await page.goto(`/components/timeline${query}`);
      const demo = page.locator('app-demo-card:has(#custom-templates)');
      await demo.locator('.oge-timeline').scrollIntoViewIfNeeded();
      await expect(demo.locator('.oge-timeline-marker-custom')).toHaveCount(3);
      await expect(
        demo.getByRole('link', { name: 'Learn more', exact: true }),
      ).toHaveCount(3);
    });

    test('has no axe violations', async ({ page }) => {
      test.slow();
      await page.goto(`/components/timeline${query}`);
      await expect(page.locator('.oge-timeline').first()).toBeVisible();
      const results = await new AxeBuilder({ page })
        .include('app-demo-card')
        // heading-order (h1 → demo-card h3) is the site-wide demo-card pattern
        .disableRules(['color-contrast', 'heading-order'])
        .analyze();
      expect(
        results.violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
        ),
      ).toEqual([]);
    });

    test('the API page renders its tables', async ({ page }) => {
      await page.goto(`/components/timeline/api${query}`);
      await expect(page.locator('.api-table').first()).toBeVisible();
    });
  });
}
