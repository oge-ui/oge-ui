import AxeBuilder from './axe';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * The spreadsheet family in both render layers (ADR 0005 + ADR 0002): the
 * overview opens the sample workbooks in the Angular `<oge-spreadsheet>` and,
 * with `?framework=react`, in the React `<OgeSpreadsheet>` — the same engine,
 * markup and stylesheet — and both pass the same suite: the saved view
 * (frozen panes, tabs, the active cell), Excel's keyboard and status bar,
 * find, pictures, charts, the API page and axe in both themes.
 */
const LAYERS = [
  { name: 'Angular', query: '', host: '' },
  { name: 'React', query: '?framework=react', host: 'app-react-host ' },
] as const;

const BASIC = 'app-demo-card:has(#getting-started)';

for (const layer of LAYERS) {
  const viewer = (page: Page): Locator =>
    page.locator(`${BASIC} ${layer.host}.oge-spreadsheet`);
  const nameBox = (host: Locator) => host.locator('.oge-spreadsheet-name-box');

  async function open(page: Page): Promise<Locator> {
    await page.goto(`/components/spreadsheet${layer.query}`);
    const host = viewer(page);
    await host.scrollIntoViewIfNeeded();
    await expect(
      host.locator('.oge-spreadsheet-text', { hasText: 'Grace' }).first(),
    ).toBeVisible({ timeout: 30_000 });
    return host;
  }

  test.describe(`spreadsheet docs (${layer.name})`, () => {
    test('opens the sample with its saved view: frozen panes, visible tabs, the active cell', async ({
      page,
    }) => {
      const host = await open(page);
      // hidden and very hidden sheets get no tab
      await expect(host.locator('.oge-spreadsheet-tab')).toHaveText([
        'Main',
        'Data',
        'RTL',
        'CF',
      ]);
      await expect(host.locator('.oge-spreadsheet-tab-active')).toHaveText(
        'Main',
      );
      await expect(nameBox(host)).toHaveValue('C4');
      await expect(host.locator('[data-pane]')).toHaveCount(4);
      await expect(host.locator('.oge-spreadsheet-zoom-value')).toHaveText(
        '90%',
      );
      const grid = host.getByRole('grid');
      await expect(grid).toHaveAttribute('aria-activedescendant', /active$/);
    });

    test('moves with the keyboard, extends with Shift and sums the selection', async ({
      page,
    }) => {
      const host = await open(page);
      const grid = host.getByRole('grid');
      await grid.focus();
      await page.keyboard.press('ArrowDown');
      await expect(nameBox(host)).toHaveValue('C5');
      await page.keyboard.press('Shift+ArrowUp');
      await expect(nameBox(host)).toHaveValue('C5');
      const items = host.locator('.oge-spreadsheet-status-item');
      await expect(items).toHaveCount(3);
      await expect(items.nth(1)).toHaveText('Count: 2');
      await page.keyboard.press('Control+End');
      await expect(nameBox(host)).not.toHaveValue('C5');
    });

    test('finds with Ctrl+F and goes to a reference from the name box', async ({
      page,
    }) => {
      const host = await open(page);
      await host.getByRole('grid').focus();
      await page.keyboard.press('Control+f');
      const input = host.locator('.oge-spreadsheet-find-input');
      await expect(input).toBeFocused();
      await input.fill('Linus');
      await input.press('Enter');
      await expect(nameBox(host)).toHaveValue('A5');
      await expect(host.locator('.oge-spreadsheet-find-count')).toHaveText(
        '1 of 1',
      );
      await input.press('Escape');
      await expect(host.locator('.oge-spreadsheet-find')).toHaveCount(0);
      await nameBox(host).fill('B8');
      await nameBox(host).press('Enter');
      await expect(nameBox(host)).toHaveValue('B8');
      await expect(host.getByRole('grid')).toBeFocused();
    });

    test('switches sheets from the tabs and shows pictures', async ({
      page,
    }) => {
      const host = await open(page);
      await host.locator('.oge-spreadsheet-tab', { hasText: 'RTL' }).click();
      await expect(host.getByRole('grid')).toHaveAttribute('dir', 'rtl');
      await page
        .locator(BASIC)
        .getByRole('button', { name: 'Pictures' })
        .click();
      await expect(
        host.locator('.oge-spreadsheet-picture img').first(),
      ).toBeVisible({ timeout: 30_000 });
      await expect(host.locator('.oge-spreadsheet-tab')).toHaveText([
        'Pictures',
      ]);
    });

    test('draws the charts as Excel does, and lists them for assistive tech', async ({
      page,
    }) => {
      const host = await open(page);
      await page.locator(BASIC).getByRole('button', { name: 'Charts' }).click();
      const charts = host.locator('svg.oge-spreadsheet-chart');
      // the first row of charts is in view: columns and stacked bars
      await expect(charts).toHaveCount(2, { timeout: 30_000 });
      await expect(
        charts.first().locator('text', { hasText: 'Sales by quarter' }),
      ).toBeVisible();
      await expect(charts.nth(1).locator('text').first()).toHaveText(
        'Stacked sales',
      );
      // the panes are hidden from assistive tech, which hears the list
      const list = host.getByRole('list', { name: 'Charts on this sheet' });
      await expect(list.getByRole('listitem')).toHaveCount(8);
      await expect(list.getByRole('listitem').first()).toHaveText(
        'Sales by quarter, clustered columns',
      );
      // a chart passes the pointer to the cells under it, as a picture does
      const box = await charts.first().boundingBox();
      if (!box) throw new Error('no chart box');
      await page.mouse.click(box.x + 4, box.y + 4);
      await expect(nameBox(host)).toHaveValue('A10');
      const results = await new AxeBuilder({ page })
        .include('.oge-spreadsheet')
        .disableRules(['color-contrast'])
        .analyze();
      expect(results.violations.map((v) => v.id)).toEqual([]);
    });

    test('lists every sheet beside the tabs and the defined names in the name box', async ({
      page,
    }) => {
      const host = await open(page);
      await host.getByRole('button', { name: 'All sheets' }).click();
      const sheets = host.getByRole('menu', { name: 'All sheets' });
      await expect(sheets.getByRole('menuitemradio')).toHaveText([
        'Main',
        'Data',
        'RTL',
        'CF',
      ]);
      const main = sheets.getByRole('menuitemradio', { name: 'Main' });
      await expect(main).toBeFocused();
      await expect(main).toHaveAttribute('aria-checked', 'true');
      const results = await new AxeBuilder({ page })
        .include('.oge-spreadsheet')
        .disableRules(['color-contrast'])
        .analyze();
      expect(results.violations.map((v) => v.id)).toEqual([]);
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await expect(host.locator('.oge-spreadsheet-tab-active')).toHaveText(
        'Data',
      );
      await expect(sheets).toHaveCount(0);
      await expect(host.getByRole('grid')).toBeFocused();
      await host.getByRole('button', { name: 'Defined names' }).click();
      const names = host.getByRole('menu', { name: 'Defined names' });
      await names.getByRole('menuitem', { name: 'Target' }).click();
      await expect(nameBox(host)).toHaveValue('Target');
      // the formula bar shows the whole text on several lines, and one again
      const expand = host.getByRole('button', { name: 'Expand formula bar' });
      await expand.click();
      await expect(expand).toHaveAttribute('aria-expanded', 'true');
      await host.getByRole('grid').focus();
      await page.keyboard.press('Control+Shift+U');
      await expect(expand).toHaveAttribute('aria-expanded', 'false');
    });

    test('collapses groups from the outline gutter and the keyboard', async ({
      page,
    }) => {
      const host = await open(page);
      // exact labels: hasText alone matches "13" inside "113"
      const row = (label: string) =>
        host.locator('.oge-spreadsheet-row-header', {
          hasText: new RegExp(`^${label}$`),
        });
      const live = host.locator('.oge-spreadsheet-live');
      await expect(row('13')).toHaveCount(1);
      await host
        .locator('.oge-spreadsheet-row-outline .oge-spreadsheet-outline-button')
        .first()
        .click();
      await expect(row('13')).toHaveCount(0);
      await expect(live).toHaveText('Rows 13 to 18 hidden');
      await host
        .locator(
          '.oge-spreadsheet-outline-level[data-axis="rows"][data-level="3"]',
        )
        .click();
      await expect(row('15')).toHaveCount(1);
      await expect(live).toHaveText('Level 3 shown');
      // the keyboard: Alt+Shift+Up in the inner group hides it, Down on its summary shows it
      await nameBox(host).fill('A15');
      await nameBox(host).press('Enter');
      await page.keyboard.press('Alt+Shift+ArrowUp');
      await expect(row('15')).toHaveCount(0);
      await nameBox(host).fill('A17');
      await nameBox(host).press('Enter');
      await page.keyboard.press('Alt+Shift+ArrowDown');
      await expect(row('15')).toHaveCount(1);
      await expect(live).toHaveText('Rows 15 to 16 shown');
    });

    test('the api page renders the reference', async ({ page }) => {
      await page.goto(`/components/spreadsheet/api${layer.query}`);
      await expect(page.locator('.api-table').first()).toBeVisible();
      await expect(
        page.getByRole('heading', {
          name: layer.query ? '<OgeSpreadsheet>' : 'OgeSpreadsheet',
          exact: true,
        }),
      ).toBeVisible();
    });

    test('axe: no violations in either theme', async ({ page }) => {
      test.slow();
      await open(page);
      for (const dark of [false, true]) {
        if (dark) {
          await page.getByLabel('Switch to dark mode').click();
          await expect(page.locator('html')).toHaveClass(/oge-theme-dark/);
        }
        const results = await new AxeBuilder({ page })
          .include('.oge-spreadsheet')
          .disableRules(['color-contrast'])
          .analyze();
        expect(results.violations.map((v) => v.id)).toEqual([]);
      }
    });
  });
}
