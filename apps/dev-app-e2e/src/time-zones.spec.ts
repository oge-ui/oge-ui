import { expect, test } from '@playwright/test';

/** One instant on three clocks, in both render layers. */
for (const fw of [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const) {
  test(`date boxes show one instant on each zone's clock (${fw.name})`, async ({
    page,
  }) => {
    await page.goto(`/components/inputs/date-box${fw.query}`);
    const demo = page.locator('.demo-time-zones').first();
    await demo.scrollIntoViewIfNeeded();
    const fields = demo.locator('.oge-input-native');
    await expect(fields).toHaveCount(3);
    // 14:00 UTC on 5 March 2026
    await expect(fields.nth(0)).toHaveValue(/5\/26.*5:00\s?PM|17:00/);
    await expect(fields.nth(1)).toHaveValue(/9:00\s?AM|09:00/);
    await expect(fields.nth(2)).toHaveValue(/11:00\s?PM|23:00/);
    await expect(page.getByTestId('zone-instant').first()).toHaveText(
      '2026-03-05T14:00:00.000Z',
    );
  });
}
