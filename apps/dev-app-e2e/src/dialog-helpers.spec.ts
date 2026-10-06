import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Locator, type Page } from '@playwright/test';

/**
 * `confirm()` / `alert()` / `prompt()` (`OgeModalService` and
 * `useOgeModals()`) and the modal placements, in both render layers: promise
 * results, the Enter / Escape defaults, initial focus, prompt validation.
 */
const LAYERS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

function helpers(page: Page): Locator {
  return page.locator('app-demo-card').filter({
    has: page.getByRole('heading', { name: 'Dialog helpers', exact: true }),
  });
}

for (const layer of LAYERS) {
  test.describe(`dialog helpers (${layer.name})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/components/overlay/modal${layer.query}`);
      await expect(helpers(page)).toBeVisible();
    });

    const result = (page: Page) => page.getByTestId('dialog-result');

    test('danger confirm: Cancel has focus, Escape resolves false, Delete true', async ({
      page,
    }) => {
      await helpers(page).getByRole('button', { name: 'Delete file…' }).click();
      const dialog = page.getByRole('alertdialog', { name: 'Delete file?' });
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute('aria-modal', 'true');
      await expect(dialog).toHaveAccessibleDescription(
        'report.xlsx will be removed permanently.',
      );
      await expect(
        dialog.getByRole('button', { name: 'Cancel' }),
      ).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(result(page)).toHaveText('result: confirm → false');

      await helpers(page).getByRole('button', { name: 'Delete file…' }).click();
      await page
        .getByRole('alertdialog', { name: 'Delete file?' })
        .getByRole('button', { name: 'Delete' })
        .click();
      await expect(result(page)).toHaveText('result: confirm → true');
    });

    test('plain confirm: the primary button has focus and Enter confirms', async ({
      page,
    }) => {
      await helpers(page).getByRole('button', { name: 'Archive rows' }).click();
      const dialog = page.getByRole('alertdialog', { name: 'Confirm' });
      await expect(dialog.getByRole('button', { name: 'OK' })).toBeFocused();
      await expect(dialog.locator('.oge-dialog-icon-info')).toBeVisible();
      await page.keyboard.press('Enter');
      await expect(dialog).toHaveCount(0);
      await expect(result(page)).toHaveText('result: confirm → true');
    });

    test('alert: Escape acknowledges', async ({ page }) => {
      await helpers(page).getByRole('button', { name: 'Show notice' }).click();
      const dialog = page.getByRole('alertdialog', { name: 'Notice' });
      await expect(dialog.getByRole('button', { name: 'Cancel' })).toHaveCount(
        0,
      );
      await page.keyboard.press('Escape');
      await expect(result(page)).toHaveText('result: alert → acknowledged');
    });

    test('prompt: validation blocks Enter, then Enter submits', async ({
      page,
    }) => {
      await helpers(page).getByRole('button', { name: 'Rename…' }).click();
      const dialog = page.getByRole('dialog', { name: 'Rename file' });
      const field = dialog.getByLabel('File name');
      await expect(field).toBeFocused();
      await expect(field).toHaveValue('report.xlsx');
      await field.fill('report.csv');
      await page.keyboard.press('Enter');
      await expect(dialog).toBeVisible();
      await expect(field).toHaveAttribute('aria-invalid', 'true');
      await expect(field).toHaveAccessibleDescription(
        'Keep the .xlsx extension.',
      );
      await field.fill('');
      await expect(dialog.getByText('This field is required.')).toBeVisible();
      await field.fill('summary.xlsx');
      await expect(field).not.toHaveAttribute('aria-invalid', /.*/);
      await page.keyboard.press('Enter');
      await expect(dialog).toHaveCount(0);
      await expect(result(page)).toHaveText('result: prompt → summary.xlsx');

      await helpers(page).getByRole('button', { name: 'Rename…' }).click();
      // wait for the reopened prompt to take focus before dismissing it
      await expect(dialog.getByLabel('File name')).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(result(page)).toHaveText('result: prompt → null');
    });

    test('an open helper dialog has no axe violations', async ({ page }) => {
      await helpers(page).getByRole('button', { name: 'Rename…' }).click();
      await expect(
        page.getByRole('dialog', { name: 'Rename file' }),
      ).toBeVisible();
      const results = await new AxeBuilder({ page })
        .include('.oge-modal-layer')
        .disableRules(['color-contrast', 'heading-order'])
        .analyze();
      expect(results.violations.map((v) => v.id)).toEqual([]);
    });

    test('placements pin the modal to an edge or corner', async ({ page }) => {
      const demo = page.locator('app-demo-card').filter({
        has: page.getByRole('heading', { name: 'Placements', exact: true }),
      });
      await demo
        .getByRole('button', { name: 'bottom-end', exact: true })
        .click();
      const dialog = page.getByRole('dialog', { name: 'Placed dialog' });
      await expect(dialog).toBeVisible();
      const viewport = page.viewportSize()!;
      await expect
        .poll(async () => {
          const rect = (await dialog.boundingBox())!;
          return [
            Math.round(viewport.width - (rect.x + rect.width)) <= 40,
            Math.round(viewport.height - (rect.y + rect.height)) <= 40,
          ];
        })
        .toEqual([true, true]);
      await page.keyboard.press('Escape');
    });
  });
}
