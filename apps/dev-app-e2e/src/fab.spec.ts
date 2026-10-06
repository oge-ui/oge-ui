import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * The FAB and the speed dial in a real browser, in both render layers: the
 * FAB's accessible name, the speed dial's WAI-ARIA APG menu-button keyboard
 * contract (open on the nearest action, wrap, Escape returns focus, Tab
 * closes) and a clean axe run with the dial open.
 */

const FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

for (const fw of FRAMEWORKS) {
  test.describe(`FAB & speed dial (${fw.name})`, () => {
    const open = async (page: Page) => {
      await page.goto(`/components/buttons/fab${fw.query}`);
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: 'FAB & Speed Dial',
          exact: true,
        }),
      ).toBeVisible();
    };

    test('the FAB is a named button that reports presses', async ({ page }) => {
      await open(page);
      const demo = page.locator('app-demo-card:has(#floating-action-button)');
      const fab = demo.getByRole('button', { name: 'Compose', exact: true });
      await fab.scrollIntoViewIfNeeded();
      await expect(fab).toBeVisible();
      await fab.click();
      await expect(demo.getByTestId('fab-clicks')).toHaveText(
        'Pressed 1 times',
      );
      // pinned inside its box, not over the docs page
      await expect(demo.locator('.oge-fab').first()).toHaveCSS(
        'position',
        'absolute',
      );
    });

    test('speed dial follows the APG menu-button keyboard pattern', async ({
      page,
    }) => {
      await open(page);
      const demo = page.locator('app-demo-card:has(#speed-dial)');
      const toggle = demo.getByRole('button', {
        name: 'Share options',
        exact: true,
      });
      const items = demo.getByRole('menuitem');
      await toggle.scrollIntoViewIfNeeded();
      await expect(toggle).toHaveAttribute('aria-haspopup', 'menu');
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(items).toHaveCount(0);

      // a bottom dial unfolds up: ArrowUp opens on the nearest action
      await toggle.focus();
      await page.keyboard.press('ArrowUp');
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(items).toHaveCount(4);
      await expect(
        demo.getByRole('menuitem', { name: 'Email', exact: true }),
      ).toBeFocused();
      const menuId = await demo.getByRole('menu').getAttribute('id');
      await expect(toggle).toHaveAttribute('aria-controls', menuId ?? '');

      await page.keyboard.press('ArrowUp');
      await expect(
        demo.getByRole('menuitem', { name: 'Print', exact: true }),
      ).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown'); // wraps past the first action
      await expect(
        demo.getByRole('menuitem', { name: 'Delete', exact: true }),
      ).toBeFocused();
      await page.keyboard.press('Home');
      await expect(
        demo.getByRole('menuitem', { name: 'Email', exact: true }),
      ).toBeFocused();

      await page.keyboard.press('Escape');
      await expect(items).toHaveCount(0);
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(toggle).toBeFocused();

      // Enter opens on the first action; Tab closes and moves on
      await page.keyboard.press('Enter');
      await expect(
        demo.getByRole('menuitem', { name: 'Email', exact: true }),
      ).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(items).toHaveCount(0);
      await expect(toggle).not.toBeFocused();
    });

    test('activating an action reports it and closes the dial', async ({
      page,
    }) => {
      await open(page);
      const demo = page.locator('app-demo-card:has(#speed-dial)');
      const toggle = demo.getByRole('button', {
        name: 'Share options',
        exact: true,
      });
      await toggle.scrollIntoViewIfNeeded();
      await toggle.click();
      await demo
        .getByRole('menuitem', { name: 'Copy link', exact: true })
        .click();
      await expect(demo.getByRole('menuitem')).toHaveCount(0);
      await expect(demo.getByTestId('speed-dial-last')).toContainText(
        'Last action: Copy link',
      );
      await expect(toggle).toBeFocused();

      // a press outside closes an open dial
      await toggle.click();
      await expect(demo.getByRole('menuitem')).toHaveCount(4);
      await page
        .getByRole('heading', {
          level: 1,
          name: 'FAB & Speed Dial',
          exact: true,
        })
        .click();
      await expect(demo.getByRole('menuitem')).toHaveCount(0);
    });

    test('has no axe violations with the dials open', async ({ page }) => {
      test.slow();
      await open(page);
      const dial = page
        .locator('app-demo-card:has(#speed-dial)')
        .getByRole('button', { name: 'Share options', exact: true });
      await dial.scrollIntoViewIfNeeded();
      await dial.click();
      await expect(
        page.locator('app-demo-card:has(#speed-dial)').getByRole('menu'),
      ).toBeVisible();
      const insert = page
        .locator('app-demo-card:has(#directions-label-modes)')
        .getByRole('button', { name: 'Insert', exact: true });
      await insert.click();
      await expect(
        page
          .locator('app-demo-card:has(#directions-label-modes)')
          .getByRole('menu'),
      ).toBeVisible();
      const results = await new AxeBuilder({ page })
        .include('app-demo-card')
        .disableRules(['color-contrast', 'heading-order'])
        .analyze();
      expect(
        results.violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
        ),
      ).toEqual([]);
    });
  });
}
