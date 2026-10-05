import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * The scheduler depth pages (G3): views & grouping, resources &
 * availability, recurrence editor and import / export — run in both
 * framework views, since one engine drives both layers. jsdom cannot lay out
 * the grids, move focus into the "+N more" popup or place a keyboard drop on
 * a real cell; this suite does it on real DOM.
 */
const FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

/** The demo card whose h3 is exactly `heading` (`hasText` is a substring match). */
function section(page: Page, heading: string): Locator {
  return page
    .locator('app-demo-card')
    .filter({
      has: page.getByRole('heading', { level: 3, name: heading, exact: true }),
    })
    .first();
}

async function open(
  page: Page,
  path: string,
  query: string,
  heading: string,
): Promise<Locator> {
  await page.goto(`/components/scheduler/${path}${query}`);
  const card = section(page, heading);
  const host = card.locator('.oge-scheduler').first();
  await host.scrollIntoViewIfNeeded();
  await expect(host).toBeVisible();
  return card;
}

for (const fw of FRAMEWORKS) {
  test.describe(`scheduler depth (${fw.name})`, () => {
    test('month timeline runs at day scale with week numbers', async ({
      page,
    }) => {
      const card = await open(
        page,
        'views-grouping',
        fw.query,
        'Timelines & custom intervals',
      );
      const host = card.locator('.oge-scheduler').first();
      await expect(
        host.locator('.oge-scheduler-timeline-dayhead').first(),
      ).toBeVisible();
      // August 2026 has 31 days — one column each at day scale
      await expect(host.locator('.oge-scheduler-timeline-dayhead')).toHaveCount(
        31,
      );
      await host
        .locator('.oge-scheduler-view-btn', { hasText: '3 days' })
        .click();
      await expect(
        host.locator('.oge-scheduler-view-btn', { hasText: '3 days' }),
      ).toHaveAttribute('aria-pressed', 'true');
      await expect(host.locator('.oge-scheduler-week-number')).toBeVisible();
    });

    test('multi-level groups render one header row per level', async ({
      page,
    }) => {
      const card = await open(
        page,
        'views-grouping',
        fw.query,
        'Multi-level groups',
      );
      const host = card.locator('.oge-scheduler').first();
      await expect(
        host.locator('.oge-scheduler-resource-head', { hasText: 'North room' }),
      ).toBeVisible();
      // two rooms × three people = six leaf headers
      await expect(
        host.locator('.oge-scheduler-resource-head', { hasText: 'Linus' }),
      ).toHaveCount(2);
    });

    test('"+N more" opens a keyboard list and Escape returns focus', async ({
      page,
    }) => {
      const card = await open(
        page,
        'views-grouping',
        fw.query,
        '"+N more" popup',
      );
      const more = card.locator('.oge-scheduler-month-more').first();
      await more.focus();
      await page.keyboard.press('Enter');
      const popup = page.locator('.oge-scheduler-more-popup');
      await expect(popup).toBeVisible();
      await expect(popup.locator('.oge-scheduler-more-item')).toHaveCount(5);
      await expect(
        popup.locator('.oge-scheduler-more-item').first(),
      ).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(
        popup.locator('.oge-scheduler-more-item').nth(1),
      ).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(popup).toHaveCount(0);
      await expect(more).toBeFocused();
    });

    test('disabled slots are hatched and marked aria-disabled', async ({
      page,
    }) => {
      const card = await open(
        page,
        'resources-availability',
        fw.query,
        'Disabled slots & work hours',
      );
      const blocked = card.locator('.oge-scheduler-cell-disabled');
      expect(await blocked.count()).toBeGreaterThan(0);
      await expect(blocked.first()).toHaveAttribute('aria-disabled', 'true');
    });

    test('keyboard twin drops a backlog task onto a cell', async ({ page }) => {
      const card = await open(
        page,
        'resources-availability',
        fw.query,
        'Drag in from outside',
      );
      const task = card.locator('.oge-scheduler-draggable', {
        hasText: 'Write release notes',
      });
      await task.focus();
      await page.keyboard.press('Enter');
      await expect(task).toHaveAttribute('aria-pressed', 'true');
      const host = card.locator('.oge-scheduler').first();
      await host
        .locator('.oge-scheduler-cell:not(.oge-scheduler-cell-disabled)')
        .nth(20)
        .click();
      await expect(
        host.locator('.oge-scheduler-chip-box', {
          hasText: 'Write release notes',
        }),
      ).toBeVisible();
      await expect(
        card.locator('.oge-scheduler-draggable', {
          hasText: 'Write release notes',
        }),
      ).toHaveCount(0);
      await expect(
        card.getByText('Scheduled Write release notes'),
      ).toBeVisible();
    });

    test('the series editor shows skipped dates and the live summary', async ({
      page,
    }) => {
      const card = await open(
        page,
        'recurrence-editor',
        fw.query,
        'Exceptions',
      );
      const host = card.locator('.oge-scheduler').first();
      await host
        .locator('.oge-scheduler-chip-box', { hasText: 'Standup' })
        .first()
        .click();
      const popup = page.locator('.oge-scheduler-popup');
      await popup.getByRole('button', { name: 'Edit' }).click();
      await page.getByRole('button', { name: 'The entire series' }).click();
      const form = page.locator('.oge-scheduler-editor-form');
      await expect(form).toBeVisible();
      await expect(
        page.locator('.oge-scheduler-recurrence-summary'),
      ).toContainText('until');
      await expect(form.getByText('Skipped occurrences')).toBeVisible();
      await page.keyboard.press('Escape');
    });

    test('iCalendar export text and sample import', async ({ page }) => {
      const card = await open(page, 'import-export', fw.query, 'iCalendar');
      await card.getByRole('button', { name: 'Show .ics text' }).click();
      const pre = card.locator('pre', { hasText: 'BEGIN:VCALENDAR' });
      await expect(pre).toBeVisible();
      await expect(pre).toContainText('RRULE:FREQ=MONTHLY;BYDAY=TU;BYSETPOS=2');
      await card.getByRole('button', { name: 'Import sample .ics' }).click();
      await expect(card.getByText(/Imported \d+ appointments\./)).toBeVisible();
    });

    test('axe: the four depth pages have no violations', async ({ page }) => {
      test.slow();
      for (const path of [
        'views-grouping',
        'resources-availability',
        'recurrence-editor',
        'import-export',
      ]) {
        await page.goto(`/components/scheduler/${path}${fw.query}`);
        await expect(page.locator('.oge-scheduler').first()).toBeVisible();
        const results = await new AxeBuilder({ page })
          .include('.oge-scheduler')
          .disableRules(['color-contrast'])
          .analyze();
        expect(
          results.violations.map((v) => v.id),
          path,
        ).toEqual([]);
      }
    });
  });
}
