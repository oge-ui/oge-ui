import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';

/**
 * The Ctrl/⌘K docs search palette (shared/search): keyboard flow in both
 * render layers, framework-aware ranking, recent picks, and axe on the open
 * dialog. The palette and its index load on demand, so every assertion polls.
 */

const palette = (page: Page) =>
  page.getByRole('dialog', { name: 'Search the documentation' });
const combobox = (page: Page) =>
  palette(page).getByRole('combobox', { name: 'Search the documentation' });

async function openWithShortcut(page: Page): Promise<void> {
  // the shell installs the shortcut once it has booted
  await expect(
    page.getByRole('button', { name: 'Search the documentation' }),
  ).toBeVisible();
  await expect(async () => {
    if (!(await palette(page).isVisible())) {
      await page.keyboard.press('ControlOrMeta+k');
    }
    await expect(palette(page)).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await expect(combobox(page)).toBeFocused();
}

/** The option `aria-activedescendant` points at. */
async function activeOptionText(page: Page): Promise<string> {
  const id = await combobox(page).getAttribute('aria-activedescendant');
  if (!id) return '';
  return (await page.locator(`[id="${id}"]`).textContent()) ?? '';
}

test.describe('docs search palette', () => {
  test('Angular: Ctrl+K, type, arrow keys and Enter open the member anchor', async ({
    page,
  }) => {
    await page.goto('/components/buttons');
    await openWithShortcut(page);
    await combobox(page).fill('actionDone');

    const options = palette(page).getByRole('option');
    await expect(options.first()).toContainText('actionDone');
    await expect(combobox(page)).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(() => activeOptionText(page)).toContain('OgeButton');

    // ↓ moves the active option, ↑ comes back to the first
    await page.keyboard.press('ArrowDown');
    await expect
      .poll(() => combobox(page).getAttribute('aria-activedescendant'))
      .toBe('app-search-option-1');
    await page.keyboard.press('ArrowUp');
    await expect
      .poll(() => combobox(page).getAttribute('aria-activedescendant'))
      .toBe('app-search-option-0');

    await page.keyboard.press('Enter');
    await expect(palette(page)).toBeHidden();
    await expect(page).toHaveURL(
      /\/components\/buttons\/api#ogebutton-events$/,
    );
    await expect(page.locator('#ogebutton-events')).toBeInViewport();
  });

  test('React: "/" opens it, React members rank first, Angular ones are flagged', async ({
    page,
  }) => {
    await page.goto('/components/buttons?framework=react');
    await expect(
      page.getByRole('button', { name: 'Search the documentation' }),
    ).toBeVisible();
    await expect(async () => {
      if (!(await palette(page).isVisible())) {
        await page.locator('h1').click();
        await page.keyboard.press('/');
      }
      await expect(palette(page)).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
    await expect(combobox(page)).toBeFocused();

    await combobox(page).fill('actionDone');
    const options = palette(page).getByRole('option');
    await expect(options.first()).toContainText('onActionDone');
    await expect(
      options.filter({ hasText: 'Angular only' }).first(),
    ).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(palette(page)).toBeHidden();
    await expect(page).toHaveURL(
      /\/components\/buttons\/api\?framework=react#ogebutton-events$/,
    );
    await expect(page.locator('#ogebutton-events')).toBeInViewport();
  });

  test('groups pages and sections, Escape closes, and picks are remembered', async ({
    page,
  }) => {
    await page.goto('/getting-started');
    await page.evaluate(() =>
      localStorage.removeItem('oge-docs-recent-searches'),
    );
    await page
      .getByRole('button', { name: 'Search the documentation' })
      .click();
    await expect(palette(page)).toBeVisible();

    await combobox(page).fill('bundle size');
    await expect(
      palette(page).getByRole('group', { name: 'Pages' }),
    ).toBeVisible();
    await expect(palette(page).getByRole('option').first()).toContainText(
      'Bundle size',
    );
    await page.keyboard.press('Escape');
    await expect(palette(page)).toBeHidden();
    await expect(page).toHaveURL(/\/getting-started$/);

    await openWithShortcut(page);
    await combobox(page).fill('bundle size');
    await expect(palette(page).getByRole('option').first()).toContainText(
      'Bundle size',
    );
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/bundle-size$/);
    await expect(page.locator('h1')).toHaveText('Bundle size');

    // reopened with an empty query, the pick is listed under Recent
    await openWithShortcut(page);
    await expect(
      palette(page).getByRole('group', { name: 'Recent' }),
    ).toContainText('Bundle size');
    // Ctrl/⌘K toggles it closed again
    await page.keyboard.press('ControlOrMeta+k');
    await expect(palette(page)).toBeHidden();
  });

  test('the open palette has no axe violations', async ({ page }) => {
    test.slow();
    await page.goto('/components/data-grid');
    await openWithShortcut(page);
    await combobox(page).fill('sort');
    await expect(palette(page).getByRole('option').first()).toBeVisible();
    const results = await new AxeBuilder({ page })
      .include('.app-search-dialog')
      .analyze();
    expect(
      results.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
      ),
    ).toEqual([]);
  });
});
