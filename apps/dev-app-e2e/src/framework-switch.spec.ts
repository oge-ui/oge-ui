import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

/**
 * The site-wide framework switch (ADR 0002): one control in the header, a
 * sticky global choice stamped on `<html data-framework>`, React demos
 * mounting inside the single Buttons route, and the shell notice on pages
 * the chosen layer does not cover.
 */
test.describe('framework switch', () => {
  test('defaults to Angular and stamps the document', async ({ page }) => {
    await page.goto('/components/buttons');
    await expect(page.locator('html')).toHaveAttribute(
      'data-framework',
      'angular',
    );
    await expect(page.locator('oge-button').first()).toBeVisible();
  });

  test('switching to React mounts real React demos on the same URL', async ({
    page,
  }) => {
    await page.goto('/components/buttons');
    await page
      .getByRole('group', { name: 'Framework' })
      .getByRole('button', { name: 'React' })
      .click();

    await expect(page.locator('html')).toHaveAttribute(
      'data-framework',
      'react',
    );
    // same route — the docs are one site, not two
    await expect(page).toHaveURL(/\/components\/buttons(\?framework=react)?$/);
    // a real React tree is mounted (host + house class markup, no oge-button element)
    await expect(
      page.locator('app-react-host .oge-button').first(),
    ).toBeVisible();
    // and the React button actually works — the press machine is alive
    const first = page.locator('app-react-host .oge-button-native').first();
    await first.click();
  });

  test('the choice is sticky across navigation and reloads', async ({
    page,
  }) => {
    await page.goto('/components/buttons');
    // Picking via the switch persists (localStorage); a pasted ?framework=
    // link deliberately does not overwrite the reader's stored preference.
    await page
      .getByRole('group', { name: 'Framework' })
      .getByRole('button', { name: 'React' })
      .click();
    await expect(page.locator('html')).toHaveAttribute(
      'data-framework',
      'react',
    );
    // switching must not navigate — the reader stays on the page
    await expect(page).toHaveURL(/\/components\/buttons\?framework=react$/);

    await page.goto('/getting-started');
    await expect(page.locator('html')).toHaveAttribute(
      'data-framework',
      'react',
    );
  });

  test('sidebar brand row carries the active framework mark and its glow', async ({
    page,
  }) => {
    await page.goto('/components/buttons?framework=react');
    const mark = page.locator('.app-fw-brandmark');
    await expect(mark).toBeVisible();
    await expect(mark).toHaveAttribute('title', 'React');
    // the glow reads from --app-fw-color, which follows the stamp; the
    // stylesheet loads async (media="print" swap), so poll until it applies
    await expect
      .poll(
        async () =>
          (
            await page.evaluate(() =>
              getComputedStyle(document.documentElement).getPropertyValue(
                '--app-fw-color',
              ),
            )
          ).trim(),
        { timeout: 10_000 },
      )
      .toBe('#087ea4'); // the React blue, not the Angular red
  });

  test('an uncovered page shows the notice instead of silent Angular content', async ({
    page,
  }) => {
    // buttons, inputs, tabs, layout and navigation are all covered now, so
    // the uncovered case has to be a family with no React package at all.
    // Use the real route (`data-grid`, not `grid`): a URL that 404s never
    // reaches the coverage check, so a typo here would make this pass for
    // the wrong reason.
    await page.goto('/components/data-grid?framework=react');
    const notice = page.getByRole('status');
    await expect(notice).toContainText('not in the React packages yet');
    // the covered pages never show it
    await page.goto('/components/buttons?framework=react');
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('a recorded parity exception shows the notice, not silent Angular content', async ({
    page,
  }) => {
    // the routed tabs page drives its selection from the Angular router, so
    // it stays Angular-only (docs/REACT-PARITY.md) — page-granular coverage
    // must catch it even though the rest of the family is covered
    await page.goto('/components/tabs/routed?framework=react');
    await expect(page.getByRole('status')).toContainText(
      'not in the React packages yet',
    );
    // …while its sibling pages in the same family render React
    await page.goto('/components/tabs?framework=react');
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('switching back from the notice returns to Angular content', async ({
    page,
  }) => {
    await page.goto('/components/data-grid?framework=react');
    await page
      .getByRole('status')
      .getByRole('button', { name: 'Switch to Angular' })
      .click();
    await expect(page.locator('html')).toHaveAttribute(
      'data-framework',
      'angular',
    );
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('the React drop-down button opens a real ARIA menu', async ({
    page,
  }) => {
    await page.goto('/components/buttons/drop-down-button?framework=react');
    // covered page: no notice, React demos mounted
    await expect(page.getByRole('status')).toHaveCount(0);
    const trigger = page
      .locator('app-react-host')
      .first()
      .getByRole('button', { name: /Export/ });
    await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    await trigger.click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'CSV' })).toBeVisible();
    // Escape closes and restores focus — the shared Escape stack at work
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('React view of the buttons page has no axe violations', async ({
    page,
  }) => {
    test.slow();
    await page.goto('/components/buttons?framework=react');
    await expect(
      page.locator('app-react-host .oge-button').first(),
    ).toBeVisible();
    // heading-order (h1 → demo-card h3) is the site-wide demo-card pattern,
    // identical in the Angular views — a best-practice flag, not a WCAG
    // failure, and not something the React layer introduced.
    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast', 'heading-order'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
