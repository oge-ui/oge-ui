import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * W7: the scheduler "Time zones" and "Remote data" pages in both framework
 * views — one engine drives both layers. Real DOM proves what jsdom cannot:
 * the display zone moves rendered chips, the DST day keeps wall-clock slots
 * and the range source loads, prefetches and reloads per visible period.
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
  test.describe(`scheduler time zones (${fw.name})`, () => {
    test('the display zone moves every chip to its wall time', async ({
      page,
    }) => {
      const card = await open(page, 'time-zones', fw.query, 'Display zone');
      const standup = card
        .locator('.oge-scheduler-chip-box[aria-label^="New York standup"]')
        .first();
      // Istanbul (the demo default): 09:00 EST is 17:00
      await expect(standup).toHaveAttribute('aria-label', /5:00\s?PM|17:00/);
      await card.locator('select').first().selectOption('America/New_York');
      await expect(standup).toHaveAttribute('aria-label', /9:00\s?AM|09:00/);
      // Kathmandu: the +5:45 offset lands on a quarter hour
      await card.locator('select').first().selectOption('Asia/Kathmandu');
      await expect(standup).toHaveAttribute('aria-label', /7:45\s?PM|19:45/);
    });

    test('the DST day keeps wall-clock slots around the skipped hour', async ({
      page,
    }) => {
      const card = await open(page, 'time-zones', fw.query, 'DST day');
      const shift = card
        .locator('.oge-scheduler-chip-box[aria-label^="Night shift"]')
        .first();
      // 01:00 EST → 03:30 EDT: 2½ wall hours for 1½ real hours
      await expect(shift).toHaveAttribute('aria-label', /1:00\s?AM|01:00/);
      await expect(shift).toHaveAttribute('aria-label', /3:30\s?AM|03:30/);
      const checkIn = card
        .locator('.oge-scheduler-chip-box[aria-label^="Daily check-in"]')
        .first();
      await expect(checkIn).toHaveAttribute('aria-label', /9:00\s?AM|09:00/);
    });

    test('loads, prefetches and reloads per visible range', async ({
      page,
    }) => {
      const card = await open(page, 'remote-data', fw.query, 'Range loading');
      const requests = card.getByRole('list', { name: 'Requests' });
      // the visible week and both neighbours (prefetched) load
      await expect(requests.getByText(/loaded$/)).toHaveCount(3, {
        timeout: 10_000,
      });
      await expect(
        card.locator('.oge-scheduler-chip-box').first(),
      ).toBeVisible();
      // the next week answers from the cache: only its far neighbour loads
      await card.getByRole('button', { name: 'Next period' }).click();
      await expect(requests.getByText(/loaded$/)).toHaveCount(4, {
        timeout: 10_000,
      });
      await expect(card.locator('[role="status"]').first()).toBeAttached();
      // reload() drops the cache: the week loads again (then its neighbours)
      await card.getByRole('button', { name: 'Reload', exact: true }).click();
      await expect
        .poll(() => requests.getByText(/loaded$/).count(), { timeout: 10_000 })
        .toBeGreaterThanOrEqual(5);
    });

    test('the new pages pass axe', async ({ page }) => {
      for (const [path, heading] of [
        ['time-zones', 'Display zone'],
        ['remote-data', 'Range loading'],
      ] as const) {
        await open(page, path, fw.query, heading);
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
