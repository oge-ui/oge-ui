import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * The React view of the Kanban family (ADR 0002 + `docs/REACT-PARITY.md`):
 * the overview and API pages render the real React board on the same routes
 * the Angular view uses, and it passes the same interaction suite as the
 * Angular board (`kanban.spec.ts`) — cross-column drag with mid-drag Escape
 * restore, the WIP badge, the context menu, keyboard moving with
 * announcements, the edit dialog — plus axe on both pages.
 */
const REACT = '?framework=react';
const BASIC = 'app-demo-card:has(#getting-started)';
const WIP = 'app-demo-card:has(#wip-limits)';
const KEYBOARD = 'app-demo-card:has(#keyboard-moving-a11y)';

function board(page: Page, scope = BASIC): Locator {
  return page.locator(`${scope} app-react-host .oge-kanban`);
}

async function openBasic(page: Page): Promise<void> {
  await page.goto(`/components/kanban${REACT}`);
  await board(page).scrollIntoViewIfNeeded();
  await expect(board(page).locator('.oge-kanban-card').first()).toBeVisible();
}

function cardsIn(host: Locator, column: string): Locator {
  return host.locator(
    `.oge-kanban-cards[data-col="${column}"] .oge-kanban-card`,
  );
}

test.describe('React kanban docs', () => {
  test('the overview mounts the React board without the coverage notice', async ({
    page,
  }) => {
    await openBasic(page);
    await expect(page.locator('html')).toHaveAttribute(
      'data-framework',
      'react',
    );
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.locator('app-react-host .oge-kanban')).toHaveCount(8);
  });

  test('the api page renders the React table', async ({ page }) => {
    await page.goto(`/components/kanban/api${REACT}`);
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.locator('.api-table').first()).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '<OgeKanban>' }),
    ).toBeVisible();
  });

  test('renders columns, cards and card anatomy', async ({ page }) => {
    await openBasic(page);
    const host = board(page);
    await expect(host.locator('.oge-kanban-column-header')).toHaveCount(4);
    await expect(host.locator('.oge-kanban-column-title').first()).toHaveText(
      'To do',
    );
    await expect(host.locator('.oge-kanban-tag').first()).toBeVisible();
    await expect(host.locator('.oge-kanban-avatar').first()).toBeVisible();
    await expect(host.locator('.oge-kanban-due').first()).toBeVisible();
    await expect(host.locator('.oge-kanban-priority').first()).toBeVisible();
    const listbox = host.locator('.oge-kanban-cards[data-col="todo"]');
    await expect(listbox).toHaveAttribute('role', 'listbox');
    await expect(listbox).toHaveAttribute('aria-label', /To do/);
  });

  test('drag moves a card across columns; mid-drag Escape restores', async ({
    page,
  }) => {
    await openBasic(page);
    const host = board(page);
    const source = cardsIn(host, 'todo').first();
    const sourceTitle = await source
      .locator('.oge-kanban-card-title')
      .textContent();
    const from = (await source.boundingBox())!;
    const target = host.locator('.oge-kanban-cards[data-col="doing"]');
    const to = (await target.boundingBox())!;

    await page.mouse.move(from.x + 40, from.y + 10);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + 60, { steps: 12 });
    await expect(host.locator('.oge-kanban-placeholder')).toBeVisible();
    await expect(page.locator('.oge-kanban-drag-preview')).toBeVisible();
    await page.mouse.up();
    await expect(
      target.locator('.oge-kanban-card-title', { hasText: sourceTitle! }),
    ).toBeVisible();

    const back = cardsIn(host, 'doing').first();
    const backBox = (await back.boundingBox())!;
    const todo = (await host
      .locator('.oge-kanban-cards[data-col="todo"]')
      .boundingBox())!;
    const doingCountBefore = await cardsIn(host, 'doing').count();
    await page.mouse.move(backBox.x + 40, backBox.y + 10);
    await page.mouse.down();
    await page.mouse.move(todo.x + todo.width / 2, todo.y + 60, {
      steps: 10,
    });
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expect(cardsIn(host, 'doing')).toHaveCount(doingCountBefore);
    await expect(page.locator('.oge-kanban-drag-preview')).toHaveCount(0);
  });

  test('WIP overflow renders the danger badge with count/limit', async ({
    page,
  }) => {
    await page.goto(`/components/kanban${REACT}`);
    const host = board(page, WIP);
    await host.scrollIntoViewIfNeeded();
    const badge = host.locator('.oge-kanban-count-danger');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText(/3\s*\/2/);
  });

  test('right-click menu: move-to entry moves the card', async ({ page }) => {
    await openBasic(page);
    const host = board(page);
    const card = cardsIn(host, 'todo').first();
    const title = await card.locator('.oge-kanban-card-title').textContent();
    await card.click({ button: 'right' });
    const menu = host.locator('.oge-kanban-menu');
    await expect(menu).toBeVisible();
    await expect(
      menu.locator('.oge-kanban-menu-item', { hasText: 'Edit' }),
    ).toBeVisible();
    await menu
      .locator('.oge-kanban-menu-item-move', { hasText: 'Done' })
      .click();
    await expect(menu).toHaveCount(0);
    await expect(
      cardsIn(host, 'done').locator('.oge-kanban-card-title', {
        hasText: title!,
      }),
    ).toBeVisible();
  });

  test('Ctrl+Arrow moves the focused card and announces it', async ({
    page,
  }) => {
    await page.goto(`/components/kanban${REACT}`);
    const host = board(page, KEYBOARD);
    await host.scrollIntoViewIfNeeded();
    const card = cardsIn(host, 'todo').first();
    await card.click();
    await page.keyboard.press('Control+ArrowRight');
    await expect(cardsIn(host, 'doing')).toHaveCount(2);
    await expect(host.locator('.oge-kanban-live')).toHaveText(
      /moved to doing, position \d of \d/,
    );
  });

  test('double-click opens the edit dialog; saving renames the card', async ({
    page,
  }) => {
    await openBasic(page);
    const host = board(page);
    const card = cardsIn(host, 'todo').first();
    await card.dblclick();
    const modal = page.locator('.oge-modal');
    await expect(modal).toBeVisible();
    const title = modal.locator('input').first();
    await title.fill('Renamed by e2e');
    await modal
      .locator('.oge-kanban-editor-footer .oge-kanban-btn-primary')
      .click();
    await expect(modal).toHaveCount(0);
    await expect(
      cardsIn(host, 'todo').locator('.oge-kanban-card-title', {
        hasText: 'Renamed by e2e',
      }),
    ).toBeVisible();
  });

  test('toolbar search filters the board and clears', async ({ page }) => {
    await openBasic(page);
    const host = board(page);
    const input = host.locator('.oge-kanban-search-input');
    await input.fill('checkout');
    await expect(host.locator('.oge-kanban-card')).toHaveCount(1);
    await host.locator('.oge-kanban-search-clear').click();
    await expect(host.locator('.oge-kanban-card').first()).toBeVisible();
  });

  test('axe: the React board has no violations in either theme', async ({
    page,
  }) => {
    test.slow();
    await openBasic(page);
    for (const dark of [false, true]) {
      if (dark) {
        await page.getByLabel('Switch to dark mode').click();
        await expect(page.locator('html')).toHaveClass(/oge-theme-dark/);
      }
      const results = await new AxeBuilder({ page })
        .include('app-react-host .oge-kanban')
        .disableRules(['color-contrast'])
        .analyze();
      expect(results.violations.map((v) => v.id)).toEqual([]);
    }
  });

  for (const path of ['/components/kanban', '/components/kanban/api']) {
    test(`${path} in React has no axe violations`, async ({ page }) => {
      await page.goto(`${path}${REACT}`);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.getByRole('status')).toHaveCount(0);
      // heading-order (h1 → demo-card h3) is the site-wide demo-card pattern,
      // identical in the Angular views — not something the React layer adds.
      const results = await new AxeBuilder({ page })
        .disableRules(['color-contrast', 'heading-order'])
        .analyze();
      expect(results.violations, `axe violations on ${path}`).toEqual([]);
    });
  }
});
