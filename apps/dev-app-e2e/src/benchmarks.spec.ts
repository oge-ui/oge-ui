import AxeBuilder from './axe';
import { test, expect } from '@playwright/test';

test.describe('Benchmarks', () => {
  test('renders the committed results with the machine', async ({ page }) => {
    await page.goto('/benchmarks');
    const table = page.locator('table').first();
    await expect(table.locator('tbody tr').first()).toContainText(
      'First render',
    );
    await expect(table.locator('tbody tr')).toHaveCount(9);
    await expect(page.locator('p', { hasText: 'Machine:' })).toBeVisible();
    expect(
      (await new AxeBuilder({ page }).include('main').analyze()).violations,
    ).toEqual([]);
  });

  for (const fw of ['angular', 'react']) {
    test(`the ${fw} runner page exposes the benchmark API`, async ({
      page,
    }) => {
      await page.goto(`/benchmarks/run?fw=${fw}&rows=2000`);
      const first = await page.waitForFunction(
        () =>
          (window as unknown as { __ogeBench?: { ready: Promise<number> } })
            .__ogeBench?.ready,
      );
      expect(Number(await first.jsonValue())).toBeGreaterThan(0);
      // virtual scrolling: a viewport's worth of rows, not all 2000
      expect(await page.locator('.oge-row').count()).toBeLessThan(100);
      const timing = await page.evaluate(() =>
        (
          window as unknown as {
            __ogeBench: { filter(e: unknown): Promise<{ rows: number }> };
          }
        ).__ogeBench.filter({
          type: 'binary',
          field: 'department',
          op: 'eq',
          value: 'Sales',
        }),
      );
      expect(timing.rows).toBeGreaterThan(0);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        'content',
        /noindex/,
      );
    });
  }
});
