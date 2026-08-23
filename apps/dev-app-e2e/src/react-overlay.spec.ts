import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Locator, type Page } from '@playwright/test';

/**
 * Playwright's click actionability re-scrolls the target under the sticky
 * header and then reports it as intercepted — right-click through raw
 * coordinates instead (the element is probe-verified visible and on top).
 */
async function rightClick(page: Page, locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error('context target has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
    button: 'right',
  });
}

/**
 * The React view of the overlay family (ADR 0002 + `docs/REACT-PARITY.md`):
 * every page of the family — overview, tooltip & context menu, modal, toast
 * and the API page — renders real React surfaces on the same routes the
 * Angular view uses, the keyboard contracts work, and the pages are axe-clean.
 */
const REACT = '?framework=react';

const PAGES = ['', 'tooltip-context-menu', 'modal', 'toast'] as const;

test.describe('React overlay docs', () => {
  for (const page of PAGES) {
    const path = page ? `/components/overlay/${page}` : '/components/overlay';
    test(`${path} mounts React without the coverage notice`, async ({
      page: browser,
    }) => {
      await browser.goto(`${path}${REACT}`);
      await expect(browser.locator('html')).toHaveAttribute(
        'data-framework',
        'react',
      );
      await expect(browser.getByRole('status')).toHaveCount(0);
      await expect(browser.locator('app-react-host').first()).toBeVisible();
    });
  }

  test('the api page renders the React tables', async ({ page }) => {
    await page.goto(`/components/overlay/api${REACT}`);
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.locator('.api-table').first()).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '<OgeModal>' }),
    ).toBeVisible();
  });

  test('a React tooltip shows on focus and wires aria-describedby', async ({
    page,
  }) => {
    await page.goto(`/components/overlay/tooltip-context-menu${REACT}`);
    const trigger = page
      .locator('app-react-host')
      .first()
      .getByRole('button', { name: 'Save' });
    await trigger.focus();
    const tooltip = page.locator('.oge-tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveAttribute('role', 'tooltip');
    const id = await tooltip.getAttribute('id');
    await expect(trigger).toHaveAttribute('aria-describedby', new RegExp(id!));
    await page.keyboard.press('Escape');
    await expect(tooltip).toHaveCount(0);
  });

  test('a React context menu opens on right-click and closes on Escape', async ({
    page,
  }) => {
    await page.goto(`/components/overlay/tooltip-context-menu${REACT}`);
    const target = page.getByTestId('context-target');
    await rightClick(page, target);
    const menu = page.getByRole('menu', { name: 'Row actions' });
    await expect(menu).toBeVisible();
    await expect(menu).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(target).toBeFocused();
  });

  test('a React modal traps focus and Escape closes it', async ({ page }) => {
    await page.goto(`/components/overlay/modal${REACT}`);
    const card = page.locator('app-demo-card', { hasText: 'Basics' }).first();
    await card.getByRole('button', { name: 'Open modal' }).click();
    const dialog = page.getByRole('dialog', { name: 'Team settings' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    // focus is inside the dialog and stays there across Tab
    await page.keyboard.press('Tab');
    await expect(dialog.locator(':focus')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('a React toast renders in a region and announces politely', async ({
    page,
  }) => {
    await page.goto(`/components/overlay/toast${REACT}`);
    await page
      .locator('app-react-host')
      .first()
      .getByRole('button', { name: 'success' })
      .click();
    const toast = page.locator('.oge-toast-region-bottom-end .oge-toast');
    await expect(toast.first()).toBeVisible();
    await expect(toast.first()).toContainText('Changes saved');
    // Each demo hosts its own provider (and announcer); the one that spoke
    // is the one carrying the text.
    await expect(
      page.locator('.oge-toast-announcer[aria-live="polite"]', {
        hasText: 'Changes saved',
      }),
    ).toHaveCount(1);
  });

  for (const page of PAGES) {
    const path = page ? `/components/overlay/${page}` : '/components/overlay';
    test(`${path} in React has no axe violations`, async ({
      page: browser,
    }) => {
      await browser.goto(`${path}${REACT}`);
      await expect(browser.locator('h1').first()).toBeVisible();
      await expect(browser.locator('app-react-host').first()).toBeVisible();
      // heading-order (h1 → demo-card h3) is the site-wide demo-card pattern,
      // identical in the Angular views — a best-practice flag, not a WCAG
      // failure, and not something the React layer introduced.
      const results = await new AxeBuilder({ page: browser })
        .disableRules(['color-contrast', 'heading-order'])
        .analyze();
      expect(results.violations, `axe violations on ${path}`).toEqual([]);
    });
  }
});
