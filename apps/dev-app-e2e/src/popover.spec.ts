import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';

/**
 * The popover in both render layers (`?framework=react` switches the docs
 * page to the React demos): the APG disclosure contract of a click trigger,
 * hover intent and focus triggers, Escape and outside clicks, the modal
 * focus trap, the non-modal "as if inline" Tab order of the portaled panel,
 * the cancelable events, and an axe scan with the panel open.
 */
const LAYERS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

for (const layer of LAYERS) {
  const go = (page: Page) =>
    page.goto(`/components/overlay/popover${layer.query}`);

  test.describe(`popover (${layer.name})`, () => {
    test('a click trigger is a disclosure: aria-haspopup, -expanded, -controls; Escape restores focus', async ({
      page,
    }) => {
      await go(page);
      const trigger = page
        .getByTestId('popover-basics')
        .getByRole('button', { name: 'Share' });
      await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await trigger.click();
      const dialog = page.getByRole('dialog', { name: 'Share report' });
      await expect(dialog).toBeVisible();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      const id = await dialog.getAttribute('id');
      await expect(trigger).toHaveAttribute('aria-controls', id ?? '__none__');
      await expect(dialog).not.toHaveAttribute('aria-modal', 'true');
      await expect(dialog.locator('.oge-popover-arrow')).toBeVisible();
      // non-modal: focus stays on the trigger (APG disclosure)
      await expect(trigger).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    test('an outside click and the close button close it', async ({ page }) => {
      await go(page);
      const trigger = page
        .getByTestId('popover-basics')
        .getByRole('button', { name: 'Share' });
      await trigger.click();
      const dialog = page.getByRole('dialog', { name: 'Share report' });
      await expect(dialog).toBeVisible();
      await page.locator('h1').first().click();
      await expect(dialog).toHaveCount(0);

      await trigger.click();
      await dialog.getByRole('button', { name: 'Close' }).click();
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
    });

    test('hover: opens after the dwell, survives moving into the panel, closes after leaving', async ({
      page,
    }) => {
      await go(page);
      const trigger = page
        .getByTestId('popover-triggers')
        .getByRole('button', { name: 'Hover' });
      await expect(trigger).not.toHaveAttribute('aria-haspopup', 'dialog');
      await trigger.hover();
      const dialog = page.getByRole('dialog', { name: 'Hover help' });
      await expect(dialog).toBeVisible();
      await dialog.hover();
      await page.waitForTimeout(600); // past the grace period
      await expect(dialog).toBeVisible();
      await page.locator('h1').first().hover();
      await expect(dialog).toHaveCount(0);
    });

    test('focus: opens while the field has focus', async ({ page }) => {
      await go(page);
      const field = page
        .getByTestId('popover-triggers')
        .getByRole('textbox', { name: 'Coupon' });
      await field.focus();
      const dialog = page.getByRole('dialog', { name: 'Coupon help' });
      await expect(dialog).toBeVisible();
      await page.locator('h1').first().click();
      await expect(dialog).toHaveCount(0);
    });

    test('manual: the trigger opens it only through code', async ({ page }) => {
      await go(page);
      const trigger = page
        .getByTestId('popover-triggers')
        .getByRole('button', { name: 'Manual' });
      await trigger.click();
      const dialog = page.getByRole('dialog', { name: 'Manual' });
      await expect(dialog).toBeVisible();
      await trigger.click();
      await expect(dialog).toHaveCount(0);
    });

    test('modal: aria-modal, focus moves in and Tab stays trapped', async ({
      page,
    }) => {
      await go(page);
      const trigger = page
        .getByTestId('popover-modal')
        .getByRole('button', { name: 'Rename' });
      await trigger.click();
      const dialog = page.getByRole('dialog', { name: 'Rename file' });
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute('aria-modal', 'true');
      await expect(dialog.locator(':focus')).toHaveCount(1);
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab');
        await expect(dialog.locator(':focus')).toHaveCount(1);
      }
      await page.keyboard.press('Shift+Tab');
      await expect(dialog.locator(':focus')).toHaveCount(1);
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
    });

    test('non-modal: Tab enters the portaled panel and leaves to the control after the trigger', async ({
      page,
    }) => {
      await go(page);
      const trigger = page
        .getByTestId('popover-modal')
        .getByRole('button', { name: 'Filter' });
      await trigger.click();
      const dialog = page.getByRole('dialog', { name: 'Filter' });
      await expect(dialog).toBeVisible();
      await expect(trigger).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('filter-input')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('after-filter')).toBeFocused();
      await expect(dialog).toHaveCount(0);
      // Shift+Tab from the first stop goes back to the trigger
      await trigger.click();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await expect(trigger).toBeFocused();
    });

    test('events: code opens it, a cancelable closing keeps it pinned', async ({
      page,
    }) => {
      await go(page);
      const demo = page.getByTestId('popover-events');
      // pin first: a click on the checkbox while open is an outside click
      await demo.getByRole('checkbox', { name: 'Pin' }).check();
      await demo.getByRole('button', { name: 'Open from code' }).click();
      const dialog = page.getByRole('dialog', { name: 'Order #1042' });
      await expect(dialog).toBeVisible();
      const status = page.getByTestId('popover-last-event');
      await expect(status).toContainText('visible: true');
      await expect(status).toContainText('opened: api');
      // Escape and outside clicks are vetoed while pinned; the ✕ is not
      await page.keyboard.press('Escape');
      await expect(dialog).toBeVisible();
      await page.locator('h1').first().click();
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Close' }).click();
      await expect(dialog).toHaveCount(0);
      await expect(status).toContainText('closed: closeButton');
      await expect(status).toContainText('visible: false');
    });

    test('has no axe violations with a popover open', async ({ page }) => {
      test.slow();
      await go(page);
      await page
        .getByTestId('popover-basics')
        .getByRole('button', { name: 'Share' })
        .click();
      await expect(
        page.getByRole('dialog', { name: 'Share report' }),
      ).toBeVisible();
      // heading-order (h1 → demo-card h3) is the site-wide demo-card
      // pattern, not something the popover introduced
      const results = await new AxeBuilder({ page })
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
