import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * The Gantt depth pages (G3b) in both render layers: scheduling with lag and
 * conflicts, task-list editing (inline edit, sort, filter, multi-select),
 * resources (histogram, resource view) and MS Project XML import — the same
 * `OgeGanttCore` behind `<oge-gantt>` and `<OgeGantt>`.
 */
const LAYERS = [
  { name: 'Angular', query: '', host: 'oge-gantt.oge-gantt' },
  {
    name: 'React',
    query: '?framework=react',
    host: 'app-react-host .oge-gantt',
  },
] as const;

function section(page: Page, heading: string): Locator {
  return page
    .locator('app-demo-card')
    .filter({
      has: page.getByRole('heading', { level: 3, name: heading, exact: true }),
    })
    .first();
}

for (const layer of LAYERS) {
  const gantt = (page: Page, heading: string): Locator =>
    section(page, heading).locator(layer.host).first();

  test.describe(`gantt depth pages (${layer.name})`, () => {
    test('scheduling: lag badges, slack columns and reported conflicts', async ({
      page,
    }) => {
      await page.goto(`/components/gantt/scheduling${layer.query}`);
      const lag = gantt(page, 'Lag, lead & slack');
      await expect(lag.locator('.oge-gantt-arrow-label').first()).toHaveText(
        '+2d',
      );
      await expect(
        lag.locator('.oge-gantt-pane-headcell', { hasText: 'Total slack' }),
      ).toHaveCount(1);
      const constraints = section(page, 'Constraints, deadlines & conflicts');
      await expect(constraints.locator('li')).toHaveCount(4);
      await expect(
        constraints.locator('.oge-gantt-bar-box-conflict').first(),
      ).toBeVisible();
      await expect(
        constraints.locator('.oge-gantt-deadline-missed'),
      ).toHaveCount(1);
      const results = await new AxeBuilder({ page })
        .include(`${layer.host}`)
        .disableRules(['color-contrast'])
        .analyze();
      expect(results.violations).toEqual([]);
    });

    test('task list: F2 inline edit, header sort, filter row, multi-select', async ({
      page,
    }) => {
      await page.goto(`/components/gantt/task-list${layer.query}`);
      const edit = gantt(page, 'Inline editing');
      await edit.scrollIntoViewIfNeeded();
      const row = edit.locator('.oge-gantt-row').nth(1);
      await row.click();
      await row.press('F2');
      const editor = edit.locator('.oge-gantt-cell-editor');
      await expect(editor).toBeFocused();
      await editor.fill('Renamed task');
      await editor.press('Enter');
      await expect(edit.locator('.oge-gantt-row').nth(1)).toContainText(
        'Renamed task',
      );

      const sort = gantt(page, 'Sort, filter & columns');
      await sort.scrollIntoViewIfNeeded();
      const owner = sort.locator('.oge-gantt-pane-headcell', {
        hasText: 'Owner',
      });
      await owner.click();
      await expect(owner).toHaveAttribute('aria-sort', 'ascending');
      await sort.getByRole('textbox', { name: 'Filter Owner' }).fill('deniz');
      await expect(sort.locator('.oge-gantt-row')).not.toHaveCount(0);
      await expect(
        sort.locator('.oge-gantt-row', { hasText: 'Deniz' }),
      ).not.toHaveCount(0);
      await expect(
        sort.locator('.oge-gantt-row', { hasText: 'Ana' }),
      ).toHaveCount(0);
      // the pane head keeps rows and chart lanes on one line
      const rowBox = await sort.locator('.oge-gantt-row').first().boundingBox();
      const laneBox = await sort
        .locator('.oge-gantt-lane')
        .first()
        .boundingBox();
      expect(Math.abs((rowBox?.y ?? 0) - (laneBox?.y ?? 0))).toBeLessThan(1.5);

      const multi = gantt(page, 'Multi-select & bulk edits');
      await multi.scrollIntoViewIfNeeded();
      const rows = multi.locator('.oge-gantt-row');
      await rows.nth(1).click();
      await rows.nth(3).click({ modifiers: ['Shift'] });
      await expect(
        multi.locator('.oge-gantt-row[aria-selected="true"]'),
      ).toHaveCount(3);
      await expect(section(page, 'Multi-select & bulk edits')).toContainText(
        '3 selected',
      );
    });

    test('resources: histogram rows and the resource view toggle', async ({
      page,
    }) => {
      await page.goto(`/components/gantt/resources${layer.query}`);
      const util = gantt(page, 'Units, work & utilization');
      await util.scrollIntoViewIfNeeded();
      await expect(util.locator('.oge-gantt-histogram-row')).toHaveCount(3);
      await expect(
        util.locator('.oge-gantt-histogram-over').first(),
      ).toBeVisible();
      const view = gantt(page, 'Resource view');
      await view.scrollIntoViewIfNeeded();
      const toggle = view.getByRole('button', { name: 'Resource view' });
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await expect(view.locator('.oge-gantt-row-group').first()).toContainText(
        'Ana',
      );
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await expect(view.locator('.oge-gantt-row-group')).toHaveCount(0);
    });

    test('import / export: the sample MS Project file binds to the Gantt', async ({
      page,
    }) => {
      await page.goto(`/components/gantt/import-export${layer.query}`);
      const card = section(page, 'MS Project XML');
      await card.getByRole('button', { name: 'Import sample .xml' }).click();
      await expect(card).toContainText(
        'Imported "Office move": 3 tasks, 2 links',
      );
      await expect(card.locator('.oge-gantt-row')).toHaveCount(3);
      await card.getByRole('button', { name: 'Show .xml text' }).click();
      await expect(
        card.locator('pre').filter({ hasText: '<?xml' }),
      ).toContainText('<PredecessorLink>');
    });
  });
}
