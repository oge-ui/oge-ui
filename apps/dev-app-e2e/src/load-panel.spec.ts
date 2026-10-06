import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * The load panel's contract in a real DOM, in both render layers: the
 * covered container is aria-busy exactly while the panel is up (and gets its
 * previous value back), the message is shown and announced through the
 * shared live region, the shade swallows clicks meant for the container, and
 * showDelay keeps a fast load from flashing a panel at all.
 */
const LAYERS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

for (const layer of LAYERS) {
  test.describe(`load panel (${layer.name})`, () => {
    test('marks the container busy while shown and blocks its pointer input', async ({
      page,
    }) => {
      await page.goto(`/components/progress/load-panel${layer.query}`);
      const card = page.locator('app-demo-card:has(#covering-a-container)');
      const target = card.locator('[data-testid="load-panel-target"]');
      const panel = target.locator('.oge-load-panel');
      await target.scrollIntoViewIfNeeded();

      await expect(target).not.toHaveAttribute('aria-busy', /.*/);
      await expect(panel).toBeHidden();

      await card.locator('[data-testid="load-panel-toggle"]').click();
      await expect(panel).toBeVisible();
      await expect(target).toHaveAttribute('aria-busy', 'true');
      await expect(panel.locator('.oge-load-panel-message')).toHaveText(
        'Loading…',
      );
      await expect(panel.getByRole('progressbar')).toHaveAttribute(
        'aria-label',
        'Loading…',
      );
      // announced through the document's shared polite region
      await expect(
        page.locator('[data-oge-live-announcer="polite"]'),
      ).toHaveText('Loading…');

      // the shade sits over the button: a click there never reaches it
      const inside = target.locator('[data-testid="load-panel-inside"]');
      await inside.click({ force: true });
      await expect(target).toContainText('Clicks while loading: 0');

      await card.locator('[data-testid="load-panel-toggle"]').click();
      await expect(panel).toBeHidden();
      await expect(target).not.toHaveAttribute('aria-busy', /.*/);
      await inside.click();
      await expect(target).toContainText('Clicks while loading: 1');
    });

    test('showDelay swallows a fast load; a slow one reports shown and hidden', async ({
      page,
    }) => {
      await page.goto(`/components/progress/load-panel${layer.query}`);
      const card = page.locator('app-demo-card:has(#delay-minimum-time)');
      const log = card.locator('[data-testid="load-panel-timing-log"]');
      await card.scrollIntoViewIfNeeded();

      await card.getByRole('button', { name: 'Fast load (100 ms)' }).click();
      await page.waitForTimeout(600);
      await expect(log).toContainText('none');

      await card.getByRole('button', { name: 'Slow load (1.5 s)' }).click();
      await expect(card.locator('.oge-load-panel')).toBeVisible();
      await expect(log).toContainText('shown');
      await expect(log).toContainText('hidden', { timeout: 5000 });
      await expect(card.locator('.oge-load-panel')).toBeHidden();
    });

    test('full screen covers the viewport and marks nothing busy', async ({
      page,
    }) => {
      await page.goto(`/components/progress/load-panel${layer.query}`);
      await page.locator('[data-testid="load-panel-full-screen"]').click();
      const panel = page.locator('.oge-load-panel-full-screen');
      await expect(panel).toBeVisible();
      await expect(panel).toHaveCSS('position', 'fixed');
      await expect(page.locator('body')).not.toHaveAttribute('aria-busy', /.*/);
      await expect(panel).toBeHidden({ timeout: 5000 });
    });

    test('the load panel page has no axe violations', async ({ page }) => {
      test.slow();
      await page.goto(`/components/progress/load-panel${layer.query}`);
      await expect(page.locator('.oge-load-panel-shown').first()).toBeVisible();
      const results = await new AxeBuilder({ page })
        .include('app-demo-card')
        // heading-order (h1 → demo-card h3) is the site-wide demo-card
        // pattern, not something the load panel introduces
        .disableRules(['color-contrast', 'heading-order'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  });
}
