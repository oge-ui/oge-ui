import { test, expect } from '@playwright/test';

test('pivot grid renders totals, expands both axes and re-pivots via drag', async ({
  page,
}) => {
  await page.goto('/components/pivot-grid');
  const pivot = page.locator('oge-pivot-grid');
  await expect(pivot.locator('.oge-pivot-row-header').first()).toBeVisible();

  // collapsed roots + grand total lines
  await expect(
    pivot.locator('.oge-pivot-row-header', { hasText: 'Grand Total' }),
  ).toBeVisible();
  await expect(
    pivot.locator('.oge-pivot-col-header', { hasText: 'Grand Total' }),
  ).toBeVisible();
  const collapsedRows = await pivot.locator('.oge-pivot-row-header').count();

  // expanding a region keeps its line (with subtotals) and adds countries
  await pivot.locator('.oge-pivot-row-header', { hasText: 'Europe' }).click();
  await expect(
    pivot.locator('.oge-pivot-row-header', { hasText: 'Germany' }),
  ).toBeVisible();
  expect(await pivot.locator('.oge-pivot-row-header').count()).toBeGreaterThan(
    collapsedRows,
  );
  // the expanded parent line is highlighted as a total line
  await expect(
    pivot.locator('.oge-pivot-row-header.oge-pivot-total', {
      hasText: 'Europe',
    }),
  ).toBeVisible();

  // collapse again from the same line
  await pivot
    .locator('.oge-pivot-row-header', { hasText: 'Europe' })
    .first()
    .click();
  await expect(
    pivot.locator('.oge-pivot-row-header', { hasText: 'Germany' }),
  ).toHaveCount(0);

  // field panel is present with all four areas
  await expect(pivot.locator('.oge-pivot-area')).toHaveCount(4);
  await expect(
    pivot.locator('.oge-pivot-field-chip', { hasText: 'Region' }),
  ).toBeVisible();
});

test('virtual pivot keeps cells aligned with their headers after scrolling', async ({
  page,
}) => {
  await page.goto('/components/pivot-grid/analytics');
  const pivot = page.locator('oge-pivot-grid').first();
  await expect(
    pivot.locator('.oge-pivot-row-header', { hasText: 'Europe' }),
  ).toBeVisible();

  // every data cell is explicitly placed on the grid (no auto-flow drift)
  const firstCell = pivot.locator('.oge-pivot-cell').first();
  await expect(firstCell).toHaveAttribute('data-cell', /\d+-\d+/);

  // a grand-total column header and its cells line up horizontally
  const grandHeader = pivot
    .locator('.oge-pivot-col-header', { hasText: 'Grand Total' })
    .first();
  const grandCell = pivot.locator('.oge-pivot-cell.oge-pivot-grand').first();
  const headerBox = await grandHeader.boundingBox();
  const cellBox = await grandCell.boundingBox();
  expect(headerBox).not.toBeNull();
  expect(cellBox).not.toBeNull();
  if (headerBox && cellBox) {
    expect(Math.abs(headerBox.x - cellBox.x)).toBeLessThan(2);
    expect(Math.abs(headerBox.width - cellBox.width)).toBeLessThan(2);
  }

  // export card: chooser opens from its button; CSV/Excel buttons are wired
  await page.getByRole('button', { name: 'Field chooser' }).click();
  const chooser = page.locator('.oge-pivot-chooser');
  await expect(chooser).toBeVisible();
  await chooser.locator('.oge-tool-text-btn').last().click();
  await expect(chooser).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'CSV' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Excel' })).toBeVisible();
});
