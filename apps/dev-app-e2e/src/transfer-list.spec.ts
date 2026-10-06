import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * The transfer list in both render layers: the buttons, the Ctrl+arrow
 * shortcuts, a real mouse drag between the lists (jsdom cannot hit-test),
 * the cancelable `moving` veto, the live announcement and axe. The React
 * view is the same route with `?framework=react`.
 */

const LAYERS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const card = (id: string) => `app-demo-card:has(#${id})`;

async function axe(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .disableRules(['color-contrast', 'heading-order'])
    .analyze();
  expect(results.violations).toEqual([]);
}

for (const layer of LAYERS) {
  test.describe(`${layer.name}: transfer list`, () => {
    const route = `/components/inputs/transfer-list${layer.query}`;

    test('buttons move the selection and everything movable', async ({
      page,
    }) => {
      await page.goto(route);
      const demo = page.locator(card('getting-started'));
      const value = page.getByTestId('transfer-value');
      await expect(value).toHaveText('["orders.read"]');
      const source = demo.getByRole('listbox', {
        name: 'Available',
        exact: true,
      });
      const target = demo.getByRole('listbox', {
        name: 'Granted',
        exact: true,
      });
      const add = demo.getByRole('button', {
        name: 'Add selected',
        exact: true,
      });
      await expect(add).toBeDisabled();
      await source
        .getByRole('option', { name: 'Edit orders', exact: true })
        .click();
      await expect(add).toBeEnabled();
      await add.click();
      await expect(value).toHaveText('["orders.read","orders.write"]');
      await expect(
        target.getByRole('option', { name: 'Edit orders', exact: true }),
      ).toBeVisible();
      await expect(
        page.locator('[data-oge-live-announcer="polite"]'),
      ).toContainText('1 item moved to Granted');
      await demo.getByRole('button', { name: 'Add all', exact: true }).click();
      // "Manage roles" is locked — it stays on the source side
      await expect(source.getByRole('option')).toHaveText(['Manage roles']);
      await demo
        .getByRole('button', { name: 'Remove all', exact: true })
        .click();
      await expect(value).toHaveText('[]');
    });

    test('Ctrl+arrows on a focused list move toward the other list', async ({
      page,
    }) => {
      await page.goto(route);
      const demo = page.locator(card('getting-started'));
      const value = page.getByTestId('transfer-value');
      const source = demo.getByRole('listbox', {
        name: 'Available',
        exact: true,
      });
      await expect(source).toHaveAttribute(
        'aria-keyshortcuts',
        'Control+ArrowRight Control+Shift+ArrowRight',
      );
      await source.focus();
      await page.keyboard.press('Space');
      await page.keyboard.press('Control+ArrowRight');
      await expect(value).toHaveText('["orders.read","orders.write"]');
      const target = demo.getByRole('listbox', {
        name: 'Granted',
        exact: true,
      });
      await target.focus();
      await page.keyboard.press('Control+Shift+ArrowLeft');
      await expect(value).toHaveText('[]');
    });

    test('dragging an option onto the other list moves it; Escape cancels', async ({
      page,
    }) => {
      await page.goto(route);
      const demo = page.locator(card('getting-started'));
      const value = page.getByTestId('transfer-value');
      const source = demo.getByRole('listbox', {
        name: 'Available',
        exact: true,
      });
      const target = demo.getByRole('listbox', {
        name: 'Granted',
        exact: true,
      });
      await target.scrollIntoViewIfNeeded();
      const drag = async (name: string, cancel: boolean) => {
        const from = (await source
          .getByRole('option', { name, exact: true })
          .boundingBox())!;
        const to = (await target.boundingBox())!;
        await page.mouse.move(from.x + 20, from.y + from.height / 2);
        await page.mouse.down();
        await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
          steps: 6,
        });
        await expect(
          demo.locator('[data-oge-transfer-side="target"]'),
        ).toHaveClass(/oge-transfer-list-pane-drop/);
        if (cancel) await page.keyboard.press('Escape');
        await page.mouse.up();
      };
      await drag('View users', true);
      await expect(value).toHaveText('["orders.read"]');
      await drag('View users', false);
      await expect(value).toHaveText('["orders.read","users.read"]');
    });

    test('a vetoed move leaves the value and logs why', async ({ page }) => {
      await page.goto(route);
      const demo = page.locator(card('cancelable-moves'));
      await demo.getByRole('button', { name: 'Add all', exact: true }).click();
      await expect(page.getByTestId('transfer-log')).toHaveText(
        'Vetoed: at most 3 permissions',
      );
      await expect(
        demo.locator('[data-oge-transfer-side="target"] [role="option"]'),
      ).toHaveCount(0);
    });

    test('is axe clean', async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('.oge-transfer-list').first()).toBeVisible();
      await axe(page);
    });
  });
}
