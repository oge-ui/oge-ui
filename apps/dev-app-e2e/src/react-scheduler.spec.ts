import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Locator, type Page } from '@playwright/test';

/**
 * The React view of the scheduler family (ADR 0002 + `docs/REACT-PARITY.md`):
 * the overview and API pages render the real React scheduler on the same
 * routes the Angular view uses, the gestures, editing surfaces and keyboard
 * model work on real DOM, and the pages are axe-clean.
 */
const REACT = '?framework=react';

/** The h3 is matched exactly — `hasText` is a substring match. */
function section(page: Page, heading: string): Locator {
  return page
    .locator('app-demo-card')
    .filter({
      has: page.getByRole('heading', { level: 3, name: heading, exact: true }),
    })
    .first();
}

async function openBasic(page: Page): Promise<Locator> {
  await page.goto(`/components/scheduler${REACT}`);
  const host = section(page, 'Getting started').locator(
    'app-react-host .oge-scheduler',
  );
  await host.scrollIntoViewIfNeeded();
  return host;
}

test.describe('React scheduler docs', () => {
  test('the overview mounts the React scheduler without the coverage notice', async ({
    page,
  }) => {
    await page.goto(`/components/scheduler${REACT}`);
    await expect(page.locator('html')).toHaveAttribute(
      'data-framework',
      'react',
    );
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(
      page.locator('app-react-host .oge-scheduler').first(),
    ).toBeVisible();
    // all eight sections mirror the Angular page
    await expect(page.locator('app-demo-card')).toHaveCount(8);
  });

  test('the api page renders the React tables', async ({ page }) => {
    await page.goto(`/components/scheduler/api${REACT}`);
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.locator('.api-table').first()).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '<OgeScheduler>' }),
    ).toBeVisible();
  });

  test('renders the week grid with chips and the all-day strip', async ({
    page,
  }) => {
    const host = await openBasic(page);
    expect(
      await host.locator('.oge-scheduler-row').first().locator('> *').count(),
    ).toBe(7);
    await expect(
      host.locator('.oge-scheduler-chip-box', { hasText: 'Sprint planning' }),
    ).toBeVisible();
    await expect(
      host.locator('.oge-scheduler-allday-bar', {
        hasText: 'Customer workshop',
      }),
    ).toBeVisible();
    const overlapped = host.locator('.oge-scheduler-chip-box', {
      hasText: 'Pairing session',
    });
    const width = await overlapped.evaluate(
      (el) => (el as HTMLElement).style.width,
    );
    expect(parseFloat(width)).toBeLessThan(10);
  });

  test('a mid-drag Escape restores the chip', async ({ page }) => {
    const host = await openBasic(page);
    const chip = host.locator('.oge-scheduler-chip-box', {
      hasText: 'Design review',
    });
    const before = await chip.boundingBox();
    if (before === null) throw new Error('chip not laid out');
    await page.mouse.move(before.x + 10, before.y + 10);
    await page.mouse.down();
    await page.mouse.move(before.x + 140, before.y + 80, { steps: 5 });
    await expect(host.locator('.oge-scheduler-drag-preview')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expect(host.locator('.oge-scheduler-drag-preview')).toHaveCount(0);
    const after = await chip.boundingBox();
    expect(after?.x).toBeCloseTo(before.x, 0);
    await expect(host.locator('.oge-scheduler-live')).toHaveText('Cancelled');
  });

  test('chip click opens the popup; Edit opens the form dialog', async ({
    page,
  }) => {
    const host = await openBasic(page);
    await host
      .locator('.oge-scheduler-chip-box', { hasText: 'Sprint planning' })
      .click();
    const popup = page.locator('.oge-scheduler-popup');
    await expect(popup).toBeVisible();
    await expect(popup.locator('.oge-scheduler-popup-title')).toHaveText(
      'Sprint planning',
    );
    await popup.getByRole('button', { name: 'Edit' }).click();
    await expect(page.locator('.oge-scheduler-editor-form')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.oge-scheduler-editor-form')).toHaveCount(0);
  });

  test('switches views and drills from "+N more" into the day view', async ({
    page,
  }) => {
    await page.goto(`/components/scheduler${REACT}`);
    const host = section(page, 'Views').locator(
      'app-react-host .oge-scheduler',
    );
    await host.scrollIntoViewIfNeeded();
    await expect(host.locator('.oge-scheduler-month-week')).toHaveCount(6);
    await host.locator('.oge-scheduler-month-more').first().click();
    await expect(
      host.locator('.oge-scheduler-view-btn', { hasText: 'Office hours' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('the timeline groups rows by resource', async ({ page }) => {
    await page.goto(`/components/scheduler${REACT}`);
    const host = section(page, 'Teams, recurrence & timeline').locator(
      'app-react-host .oge-scheduler',
    );
    await host.scrollIntoViewIfNeeded();
    await expect(host.locator('.oge-scheduler-timeline-rowhead')).toHaveText([
      /Ada/,
      /Grace/,
      /Unassigned/,
    ]);
  });

  test('keyboard: arrows move the roving cell, Ctrl+Arrow moves a chip', async ({
    page,
  }) => {
    const host = await openBasic(page);
    const cell = host.locator('.oge-scheduler-cell[tabindex="0"]');
    await cell.focus();
    await page.keyboard.press('ArrowRight');
    await expect(host.locator('.oge-scheduler-cell[tabindex="0"]')).toHaveCount(
      1,
    );
    const chip = host.locator('.oge-scheduler-chip-box', {
      hasText: 'Sprint planning',
    });
    await chip.focus();
    await page.keyboard.press('Control+ArrowDown');
    await expect(host.locator('.oge-scheduler-live')).toContainText(
      'Sprint planning moved to',
    );
  });

  for (const route of ['/components/scheduler', '/components/scheduler/api']) {
    test(`${route} is axe-clean in the React view`, async ({ page }) => {
      await page.goto(`${route}${REACT}`);
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page })
        .disableRules(['color-contrast'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
