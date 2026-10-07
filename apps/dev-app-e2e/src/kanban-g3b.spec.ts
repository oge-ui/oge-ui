import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Kanban depth (G3b) in both render layers: the filter chip bar, the column
 * sort menu, multi-select with a multi-card drag (ghost count), cross-board
 * drag between two boards of one `dragGroup`, the quick-add composer and
 * undo — the geometry jsdom cannot provide.
 */
const LAYERS = [
  { name: 'Angular', query: '', host: 'oge-kanban' },
  {
    name: 'React',
    query: '?framework=react',
    host: 'app-react-host .oge-kanban',
  },
] as const;

function boards(page: Page, card: string, host: string): Locator {
  return page.locator(`app-demo-card:has(#${card}) ${host}`);
}

function cardsIn(host: Locator, column: string): Locator {
  return host.locator(
    `.oge-kanban-cards[data-col="${column}"] .oge-kanban-card`,
  );
}

for (const layer of LAYERS) {
  test.describe(`kanban G3b (${layer.name})`, () => {
    test('chips filter the board; the column menu sorts', async ({ page }) => {
      await page.goto(`/components/kanban/filtering${layer.query}`);
      const host = boards(page, 'filter-chips-search', layer.host).first();
      await host.scrollIntoViewIfNeeded();
      // preset: priority "high" only
      await expect(cardsIn(host, 'todo')).toHaveCount(1);
      const high = host.locator('.oge-kanban-chip[data-kind="priorities"]', {
        hasText: 'high',
      });
      await expect(high).toHaveAttribute('aria-pressed', 'true');
      await high.click();
      await expect(cardsIn(host, 'todo')).toHaveCount(2);
      await host
        .locator('.oge-kanban-chip[data-kind="tags"]', { hasText: 'bug' })
        .click();
      await expect(cardsIn(host, 'doing')).toHaveCount(1);
      await expect(cardsIn(host, 'todo')).toHaveCount(0);

      const sorted = boards(page, 'column-sort', layer.host).first();
      await sorted.scrollIntoViewIfNeeded();
      const todoTitles = sorted.locator(
        '.oge-kanban-cards[data-col="todo"] .oge-kanban-card-title',
      );
      // priorityOrder: blocker first
      await expect(todoTitles.first()).toHaveText('Payment outage');
      await sorted.locator('.oge-kanban-column-menu-btn').first().click();
      const menu = sorted.locator('.oge-kanban-menu');
      await expect(menu).toBeVisible();
      await menu
        .locator('.oge-kanban-menu-item-sort[data-field="title"]')
        .click();
      await expect(todoTitles.first()).toHaveText('Audit log export');
      await expect(sorted.locator('.oge-kanban-column-sorted')).toHaveCount(2);
    });

    test('multi-card drag carries the selection and undoes as one step', async ({
      page,
    }) => {
      await page.goto(`/components/kanban/multi-select${layer.query}`);
      const host = boards(page, 'multi-select-undo', layer.host).first();
      await host.scrollIntoViewIfNeeded();
      const todo = cardsIn(host, 'todo');
      await todo.nth(0).click();
      await todo.nth(1).click({ modifiers: ['Control'] });
      await expect(host.locator('.oge-kanban-card-multi')).toHaveCount(2);
      // clicking the second card scrolls the column list to it; how far
      // differs per engine (Firefox leaves the first under the sticky header)
      await todo.nth(0).scrollIntoViewIfNeeded();
      const from = (await todo.nth(0).boundingBox())!;
      const target = host.locator('.oge-kanban-cards[data-col="doing"]');
      const to = (await target.boundingBox())!;
      await page.mouse.move(from.x + 40, from.y + from.height / 2);
      await page.mouse.down();
      await page.mouse.move(to.x + to.width / 2, to.y + 60, { steps: 12 });
      await expect(page.locator('.oge-kanban-drag-count')).toHaveText(
        '2 cards',
      );
      await page.mouse.up();
      await expect(cardsIn(host, 'doing')).toHaveCount(3);
      await expect(cardsIn(host, 'todo')).toHaveCount(1);
      await host.locator('.oge-kanban-btn-undo').click();
      await expect(cardsIn(host, 'doing')).toHaveCount(1);
      await expect(cardsIn(host, 'todo')).toHaveCount(3);
    });

    test('a card drags from one board to another of its dragGroup', async ({
      page,
    }) => {
      await page.goto(`/components/kanban/multi-select${layer.query}`);
      const pair = boards(page, 'cross-board-drag', layer.host);
      await pair.first().scrollIntoViewIfNeeded();
      const backlog = pair.nth(0);
      const sprint = pair.nth(1);
      await expect(cardsIn(backlog, 'todo')).toHaveCount(3);
      const card = cardsIn(backlog, 'todo').first();
      const from = (await card.boundingBox())!;
      // the narrow sprint board scrolls horizontally: drop on its visible column
      const target = sprint.locator('.oge-kanban-cards[data-col="todo"]');
      const to = (await target.boundingBox())!;
      await page.mouse.move(from.x + 40, from.y + from.height / 2);
      await page.mouse.down();
      await page.mouse.move(to.x + to.width / 2, to.y + 40, { steps: 16 });
      await page.mouse.up();
      await expect(cardsIn(backlog, 'todo')).toHaveCount(2);
      await expect(
        cardsIn(sprint, 'todo').locator('.oge-kanban-card-title', {
          hasText: 'Dark mode',
        }),
      ).toBeVisible();

      // the keyboard / single-pointer twin: the card menu's "Move to"
      await cardsIn(backlog, 'todo').first().click({ button: 'right' });
      await backlog
        .locator('.oge-kanban-menu-item-board', { hasText: 'Move to Sprint' })
        .click();
      await expect(cardsIn(backlog, 'todo')).toHaveCount(1);
      await expect(cardsIn(sprint, 'todo')).toHaveCount(3);
    });

    test('quick add, F2 rename, swimlane WIP and axe', async ({ page }) => {
      await page.goto(`/components/kanban/multi-select${layer.query}`);
      const lanes = boards(page, 'swimlane-wip-limits', layer.host).first();
      await lanes.scrollIntoViewIfNeeded();
      await expect(
        lanes.locator('.oge-kanban-cell-wip.oge-kanban-count-danger'),
      ).toHaveCount(1);
      await expect(lanes.locator('.oge-kanban-lane-wip-exceeded')).toHaveCount(
        1,
      );

      const host = boards(
        page,
        'quick-add-inline-titles-checklists',
        layer.host,
      ).first();
      await host.scrollIntoViewIfNeeded();
      await host
        .locator('.oge-kanban-cards[data-col="todo"] ~ .oge-kanban-add-card')
        .click();
      const input = host.locator('.oge-kanban-quick-add-input');
      await input.fill('From the composer');
      await input.press('Enter');
      await expect(
        host.locator('.oge-kanban-card-title', {
          hasText: 'From the composer',
        }),
      ).toBeVisible();
      await input.press('Escape');

      const renamed = cardsIn(host, 'todo').first();
      await renamed.focus();
      await page.keyboard.press('F2');
      const title = host.locator('.oge-kanban-card-title-input');
      await title.fill('Renamed inline');
      // let the controlled input settle (value applied, focus kept) before
      // committing — Enter on a stale render commits the old title
      await expect(title).toHaveValue('Renamed inline');
      await expect(title).toBeFocused();
      // React re-renders the editor on input: press Enter on the focused
      // element, not on a locator the re-render may have replaced
      await page.keyboard.press('Enter');
      await expect(
        host.locator('.oge-kanban-card-title', { hasText: 'Renamed inline' }),
      ).toBeVisible();
      await expect(host.locator('.oge-kanban-checklist').first()).toContainText(
        '1/3',
      );

      const results = await new AxeBuilder({ page })
        .include(`app-demo-card ${layer.host}`)
        .disableRules(['color-contrast'])
        .analyze();
      expect(
        results.violations.map(
          (v) =>
            `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
        ),
      ).toEqual([]);
    });
  });
}
