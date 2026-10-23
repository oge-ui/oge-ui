import AxeBuilder from './axe';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * The spreadsheet family in both render layers (ADR 0005 + ADR 0002): the
 * overview opens the sample workbooks in the Angular `<oge-spreadsheet>` and,
 * with `?framework=react`, in the React `<OgeSpreadsheet>` — the same engine,
 * markup and stylesheet — and both pass the same suite: the saved view
 * (frozen panes, tabs, the active cell), Excel's keyboard and status bar,
 * find, pictures, charts, tables, sparklines, the API page and axe in both
 * themes.
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

    test('draws Excel tables in their styles, with filter buttons and the resize handle', async ({
      page,
    }) => {
      const host = await open(page);
      await page.locator(BASIC).getByRole('button', { name: 'Tables' }).click();
      await expect(host.locator('.oge-spreadsheet-tab')).toHaveText(
        ['Sales', 'Inventory', 'Teams', 'Styles'],
        { timeout: 30_000 },
      );
      // TableStyleMedium2: the header row in accent 1, a button on each of its six cells
      await expect(
        host.locator('.oge-spreadsheet-fill[style*="68, 114, 196"]'),
      ).toHaveCount(6);
      await expect(host.locator('.oge-spreadsheet-filter-button')).toHaveCount(
        6,
      );
      await expect(host.locator('.oge-spreadsheet-table-handle')).toHaveCount(
        1,
      );
      await expect(
        host.locator('.oge-spreadsheet-text', { hasText: 'Total' }),
      ).toBeVisible();
      const results = await new AxeBuilder({ page })
        .include('.oge-spreadsheet')
        .disableRules(['color-contrast'])
        .analyze();
      expect(results.violations.map((v) => v.id)).toEqual([]);
    });

    test('draws sparklines in their cells: lines with their marked points, columns, win/loss', async ({
      page,
    }) => {
      const host = await open(page);
      await page
        .locator(BASIC)
        .getByRole('button', { name: 'Sparklines' })
        .click();
      await expect(host.locator('.oge-spreadsheet-tab')).toHaveText(
        ['Sales', 'Growth'],
        { timeout: 30_000 },
      );
      // five regions and the total: a trend line and the months as columns each
      const sparklines = host.locator('svg.oge-spreadsheet-sparkline');
      await expect(sparklines).toHaveCount(12);
      // the trends: a line each; North's best and weakest months marked over it
      const lines = host.locator(
        'svg.oge-spreadsheet-sparkline:has(path[stroke])',
      );
      await expect(lines).toHaveCount(6);
      await expect(lines.first().locator('path:not([stroke])')).toHaveCount(2);
      // the months: crisp columns, the best one in its own colour
      const columns = host.locator(
        'svg.oge-spreadsheet-sparkline:not(:has(path[stroke]))',
      );
      await expect(columns).toHaveCount(6);
      await expect(
        columns.first().locator('path[shape-rendering="crispEdges"]'),
      ).toHaveCount(2);
      // in the frozen columns beside the names
      await expect(lines.first()).toBeVisible();
      await host.locator('.oge-spreadsheet-tab', { hasText: 'Growth' }).click();
      // win/loss and columns around an axis, for each region
      await expect(sparklines).toHaveCount(10);
      const results = await new AxeBuilder({ page })
        .include('.oge-spreadsheet')
        .disableRules(['color-contrast'])
        .analyze();
      expect(results.violations.map((v) => v.id)).toEqual([]);
    });

    test('resizes a column by dragging its header’s edge, with Excel’s tooltip, and AutoFits it on a double-click', async ({
      page,
    }) => {
      const host = await open(page);
      await page.locator(BASIC).getByRole('button', { name: 'Tables' }).click();
      await expect(host.locator('.oge-spreadsheet-tab').first()).toHaveText(
        'Sales',
        { timeout: 30_000 },
      );
      const header = host
        .locator('.oge-spreadsheet-column-header')
        .filter({ hasText: /^C$/ });
      const box = await header.boundingBox();
      if (!box) throw new Error('no header box');
      const edge = { x: box.x + box.width - 1, y: box.y + box.height / 2 };
      await page.mouse.move(edge.x, edge.y);
      await expect(host).toHaveClass(/oge-spreadsheet-resize-columns/);
      await page.mouse.down();
      await page.mouse.move(edge.x + 40, edge.y, { steps: 4 });
      const tip = host.locator('.oge-spreadsheet-resize-tip');
      await expect(tip).toHaveText(/^Width: \d+[.,]\d\d \(\d+ pixels\)$/);
      await page.mouse.up();
      await expect(tip).toHaveCount(0);
      await expect
        .poll(async () => (await header.boundingBox())?.width ?? 0)
        .toBeCloseTo(box.width + 40, 0);
      const live = host.locator('.oge-spreadsheet-live');
      await expect(live).toHaveText(/Column C: Width: /);
      // a double-click on the edge fits the column to its contents
      const wide = await header.boundingBox();
      if (!wide) throw new Error('no header box');
      await page.mouse.dblclick(wide.x + wide.width - 1, edge.y);
      await expect(live).toHaveText('Column C fitted to its contents');
      await expect
        .poll(async () => (await header.boundingBox())?.width ?? 0)
        .toBeLessThan(wide.width);
    });

    test('sizes columns and rows from the keyboard: Ctrl+Space or Shift+Space, Shift+F10, the size dialog', async ({
      page,
    }) => {
      const host = await open(page);
      await page.locator(BASIC).getByRole('button', { name: 'Tables' }).click();
      await expect(host.locator('.oge-spreadsheet-tab').first()).toHaveText(
        'Sales',
        { timeout: 30_000 },
      );
      const axe = async () =>
        (
          await new AxeBuilder({ page })
            .include('.oge-spreadsheet')
            .disableRules(['color-contrast'])
            .analyze()
        ).violations.map((v) => v.id);
      const header = host
        .locator('.oge-spreadsheet-column-header')
        .filter({ hasText: /^C$/ });
      const live = host.locator('.oge-spreadsheet-live');
      await nameBox(host).fill('C3');
      await nameBox(host).press('Enter');
      await page.keyboard.press('Control+Space');
      await page.keyboard.press('Shift+F10');
      const menu = host.getByRole('menu', { name: 'Column' });
      await expect(menu.getByRole('menuitem')).toHaveText([
        'Column width…',
        'AutoFit column width',
        'Hide',
        'Unhide',
      ]);
      await expect(menu.getByRole('menuitem').first()).toBeFocused();
      expect(await axe()).toEqual([]);
      await page.keyboard.press('Enter');
      const dialog = host.getByRole('dialog', { name: 'Column width' });
      const field = dialog.getByRole('textbox', { name: 'Column width:' });
      await expect(field).toBeFocused();
      expect(await axe()).toEqual([]);
      // a width Excel refuses keeps the dialog, saying why
      await field.fill('256');
      await field.press('Enter');
      await expect(dialog.getByRole('alert')).toHaveText(
        'Enter a width from 0 to 255.',
      );
      await field.fill('20');
      await field.press('Enter');
      await expect(dialog).toHaveCount(0);
      await expect(host.getByRole('grid')).toBeFocused();
      // 20 characters of Calibri 11 are 145 px; the sample is at 100%
      await expect(live).toHaveText('Column C: Width: 20.00 (145 pixels)');
      await expect
        .poll(async () => (await header.boundingBox())?.width ?? 0)
        .toBeCloseTo(145, 0);
      // rows the same way, in points (from a cell: Shift+Space on a whole
      // column would select the whole sheet, as in Excel)
      await nameBox(host).fill('C3');
      await nameBox(host).press('Enter');
      await page.keyboard.press('Shift+Space');
      await page.keyboard.press('Shift+F10');
      await expect(
        host.getByRole('menu', { name: 'Row' }).getByRole('menuitem').first(),
      ).toHaveText('Row height…');
      await page.keyboard.press('Enter');
      const rows = host.getByRole('dialog', { name: 'Row height' });
      await rows.getByRole('textbox', { name: 'Row height:' }).fill('30');
      await page.keyboard.press('Enter');
      await expect(rows).toHaveCount(0);
      await expect(live).toHaveText('Row 3: Height: 30.00 (40 pixels)');
    });

    test('opens the reader’s own workbook from the uploader, without uploading it', async ({
      page,
    }) => {
      // the picked file is read in the page: nothing may be sent anywhere
      const sent: string[] = [];
      page.on('request', (request) => {
        if (request.method() !== 'GET')
          sent.push(`${request.method()} ${request.url()}`);
      });
      await page.goto(`/components/spreadsheet${layer.query}`);
      const card = page.locator('app-demo-card:has(#open-your-own-file)');
      await card.scrollIntoViewIfNeeded();
      // the uploader is a real control, not the browser's bare file input
      await expect(
        card.getByRole('button', { name: 'Choose a workbook' }),
      ).toBeVisible();
      const bytes = await (
        await page.request.get('/demo/spreadsheet/tables.xlsx')
      ).body();
      await card.locator('.oge-upload-input').setInputFiles({
        name: 'tables.xlsx',
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: bytes,
      });
      await expect(card.locator('.oge-spreadsheet-tab')).toHaveText(
        ['Sales', 'Inventory', 'Teams', 'Styles'],
        { timeout: 30_000 },
      );
      await expect(
        card.getByRole('listitem', { name: 'tables.xlsx' }),
      ).toBeVisible();
      expect(sent).toEqual([]);
      const results = await new AxeBuilder({ page })
        .include('app-demo-card:has(#open-your-own-file)')
        .disableRules(['color-contrast'])
        .analyze();
      expect(results.violations.map((v) => v.id)).toEqual([]);
      // taking the file away closes it in the viewer too
      await card.getByRole('button', { name: 'Remove: tables.xlsx' }).click();
      await expect(card.locator('.oge-spreadsheet-tab')).toHaveCount(0);
      await expect(card.locator('.oge-spreadsheet-placeholder')).toHaveText(
        'No workbook',
      );
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
