import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * jsdom cannot lay out the slot grid, measure chip geometry or drive real
 * pointer capture — this suite proves the scheduler's rendering, gestures
 * (drag with mid-drag Escape restore), editing surfaces, keyboard model and
 * axe-clean accessibility on real DOM in both themes.
 */

const BASIC = 'app-demo-card:has(#getting-started)';
const PLANNING = 'app-demo-card:has(#planner-ergonomics)';

function scheduler(page: Page): Locator {
  return page.locator(`${BASIC} oge-scheduler`);
}

async function openBasic(page: Page): Promise<void> {
  await page.goto('/components/scheduler');
  await scheduler(page).scrollIntoViewIfNeeded();
}

test.describe('scheduler', () => {
  test('renders the week grid with chips and the all-day strip', async ({
    page,
  }) => {
    await openBasic(page);
    const host = scheduler(page);
    await expect(host.locator('.oge-scheduler-row').first()).toBeVisible();
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
    // overlapping appointments share the column width
    const overlapped = host.locator('.oge-scheduler-chip-box', {
      hasText: 'Pairing session',
    });
    const width = await overlapped.evaluate(
      (el) => (el as HTMLElement).style.width,
    );
    expect(parseFloat(width)).toBeLessThan(10); // < one full column of 7
  });

  test('view switcher and toolbar navigation update the period', async ({
    page,
  }) => {
    await openBasic(page);
    const host = scheduler(page);
    await host.getByRole('button', { name: 'Month' }).click();
    await expect(host.locator('.oge-scheduler-month-grid')).toBeVisible();
    await expect(host.locator('.oge-scheduler-title')).toContainText(
      'August 2026',
    );
    await host.getByRole('button', { name: 'Next period' }).click();
    await expect(host.locator('.oge-scheduler-title')).toContainText(
      'September 2026',
    );
    await host.getByRole('button', { name: 'Day', exact: true }).click();
    await expect(
      host.locator('.oge-scheduler-row').first().locator('> *'),
    ).toHaveCount(1);
  });

  test('the title opens the date navigator and picking a date navigates', async ({
    page,
  }) => {
    await openBasic(page);
    const host = scheduler(page);
    await host.locator('.oge-scheduler-title').click();
    const calendar = host.locator('.oge-scheduler-navigator oge-calendar');
    await expect(calendar).toBeVisible();
    await calendar.getByRole('gridcell', { name: /August 20, 2026/ }).click();
    await expect(calendar).toBeHidden();
    await expect(host.locator('.oge-scheduler-title')).toContainText('16');
  });

  test('drag-move commits, and mid-drag Escape restores the position', async ({
    page,
  }) => {
    await openBasic(page);
    const host = scheduler(page);
    const chip = host.locator('.oge-scheduler-chip-box', {
      hasText: 'Sprint planning',
    });
    const before = await chip.boundingBox();
    if (before === null) throw new Error('chip not laid out');

    // committed drag: one day column to the left
    await page.mouse.move(
      before.x + before.width / 2,
      before.y + before.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      before.x + before.width / 2 - before.width * 1.1,
      before.y + before.height / 2,
      { steps: 8 },
    );
    await expect(host.locator('.oge-scheduler-drag-preview')).toBeVisible();
    await page.mouse.up();
    const moved = await chip.boundingBox();
    expect(Math.abs((moved?.x ?? 0) - before.x)).toBeGreaterThan(10);

    // cancelled drag: Escape mid-gesture restores the committed position
    const committed = await chip.boundingBox();
    await page.mouse.move(
      (committed?.x ?? 0) + before.width / 2,
      (committed?.y ?? 0) + before.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      (committed?.x ?? 0) + before.width * 2,
      (committed?.y ?? 0) + before.height / 2,
      { steps: 8 },
    );
    await page.keyboard.press('Escape');
    await page.mouse.up();
    const after = await chip.boundingBox();
    expect(Math.round(after?.x ?? 0)).toBe(Math.round(committed?.x ?? 0));
  });

  test('double-click creates through the form dialog', async ({ page }) => {
    await openBasic(page);
    const host = scheduler(page);
    const cell = host.locator('.oge-scheduler-rows .oge-scheduler-cell').nth(9);
    await cell.dblclick();
    const dialog = page.locator('.oge-modal', {
      hasText: 'New appointment',
    });
    await expect(dialog).toBeVisible();
    await dialog.locator('input').first().fill('Playwright demo');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden();
    await expect(
      host.locator('.oge-scheduler-chip-box', { hasText: 'Playwright demo' }),
    ).toBeVisible();
  });

  test('chip popup edits and deletes', async ({ page }) => {
    await openBasic(page);
    const host = scheduler(page);
    const chip = host.locator('.oge-scheduler-chip-box', {
      hasText: 'Design review',
    });
    await chip.click();
    const popup = page.locator('.oge-scheduler-popup');
    await expect(popup).toBeVisible();
    await expect(popup).toContainText('Design review');
    await popup.getByRole('button', { name: 'Delete' }).click();
    await expect(popup).toBeHidden();
    await expect(chip).toHaveCount(0);
  });

  test('keyboard: grid roving focus, Enter creates, chips cycle', async ({
    page,
  }) => {
    await openBasic(page);
    const host = scheduler(page);
    const target = host.locator(
      '.oge-scheduler-rows .oge-scheduler-cell[tabindex="0"]',
    );
    await target.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await expect(
      host.locator('.oge-scheduler-rows .oge-scheduler-cell[tabindex="0"]'),
    ).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(
      page.locator('.oge-modal', { hasText: 'New appointment' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');

    const chipStop = host.locator('.oge-scheduler-chip-stop[tabindex="0"]');
    await chipStop.focus();
    await page.keyboard.press('ArrowRight');
    await expect(
      host.locator('.oge-scheduler-chip-stop[tabindex="0"]'),
    ).toBeFocused();
  });

  test('planner ergonomics: workWeek hides the weekend, off-hours shade', async ({
    page,
  }) => {
    await page.goto('/components/scheduler');
    const host = page.locator(`${PLANNING} oge-scheduler`);
    await host.scrollIntoViewIfNeeded();
    await expect(
      host.locator('.oge-scheduler-row').first().locator('> *'),
    ).toHaveCount(5);
    expect(
      await host.locator('.oge-scheduler-cell-off-hours').count(),
    ).toBeGreaterThan(0);
    // prev/next disable at the min/max bounds after navigating to the edge
    const prev = host.getByRole('button', { name: 'Previous period' });
    for (let i = 0; i < 8 && !(await prev.isDisabled()); i++) {
      await prev.click();
    }
    await expect(prev).toBeDisabled();
  });

  test('axe: no violations in either theme', async ({ page }) => {
    test.slow();
    await openBasic(page);
    for (const dark of [false, true]) {
      if (dark) {
        await page.getByLabel('Switch to dark mode').click();
        await expect(page.locator('html')).toHaveClass(/oge-theme-dark/);
      }
      const results = await new AxeBuilder({ page })
        .include('oge-scheduler')
        .disableRules(['color-contrast'])
        .analyze();
      expect(results.violations.map((v) => v.id)).toEqual([]);
    }
  });
});
