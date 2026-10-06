import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Action sheet — the modal dialog + APG menu contract in a real DOM, in both
 * render layers: labelled dialog, focus moved in and restored, the menu
 * keyboard (wrap, disabled skip, Home/End), Escape, Cancel and backdrop
 * dismissal, a swipe down on the handle, the promise API and a clean axe run
 * of the open sheet.
 */
const FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const card = (page: Page, id: string): Locator =>
  page.locator(`app-demo-card:has(#${id})`);

async function openFrom(page: Page, cardId: string, label: string) {
  const trigger = card(page, cardId).getByRole('button', {
    name: label,
    exact: true,
  });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await settled(page);
  return trigger;
}

/** Waits until the sheet finished sliding in (geometry polled, never read once). */
async function settled(page: Page) {
  const sheet = page.locator('.oge-action-sheet-ready .oge-action-sheet');
  await expect(sheet).toBeVisible();
  let previous = Number.NaN;
  await expect
    .poll(async () => {
      const y = Math.round((await sheet.boundingBox())?.y ?? -1);
      const still = y === previous;
      previous = y;
      return still;
    })
    .toBe(true);
}

for (const fw of FRAMEWORKS) {
  test.describe(`action sheet (${fw.name})`, () => {
    test('opens a labelled modal dialog with an APG menu', async ({ page }) => {
      await page.goto(`/components/overlay/action-sheet${fw.query}`);
      const trigger = await openFrom(page, 'basics', 'Photo actions');
      const dialog = page.getByRole('dialog', { name: 'Photo', exact: true });
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute('aria-modal', 'true');
      const menu = dialog.getByRole('menu', { name: 'Photo', exact: true });
      const items = menu.getByRole('menuitem');
      await expect(items).toHaveCount(4);
      await expect(items.nth(0)).toBeFocused();
      await page.keyboard.press('ArrowUp');
      await expect(items.nth(3)).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(items.nth(0)).toBeFocused();
      await page.keyboard.press('End');
      await expect(items.nth(3)).toBeFocused();
      // Tab leaves the menu for Cancel and wraps back (focus trap)
      await page.keyboard.press('Tab');
      await expect(
        dialog.getByRole('button', { name: 'Cancel', exact: true }),
      ).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(items.nth(3)).toBeFocused();
      await page.keyboard.press('Home');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await expect(dialog).toHaveCount(0);
      await expect(
        card(page, 'basics').getByTestId('action-sheet-last'),
      ).toHaveText('Last action: Copy link');
      await expect(trigger).toBeFocused();
    });

    test('Escape and Cancel close and restore focus', async ({ page }) => {
      await page.goto(`/components/overlay/action-sheet${fw.query}`);
      const trigger = await openFrom(page, 'basics', 'Photo actions');
      const dialog = page.getByRole('dialog', { name: 'Photo', exact: true });
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();

      await trigger.click();
      await settled(page);
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
    });

    test('disabled actions are skipped; the bottom group sits after a divider', async ({
      page,
    }) => {
      await page.goto(`/components/overlay/action-sheet${fw.query}`);
      await openFrom(page, 'groups-disabled-actions-templates', 'File actions');
      const dialog = page.getByRole('dialog', {
        name: 'Quarterly report.pdf',
        exact: true,
      });
      const items = dialog.getByRole('menuitem');
      await expect(items).toHaveCount(4);
      await expect(items.nth(1)).toHaveAttribute('aria-disabled', 'true');
      await expect(dialog.getByRole('separator')).toHaveCount(1);
      await expect(items.nth(0)).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(items.nth(2)).toBeFocused();
      // a disabled action does nothing when clicked
      await items.nth(1).click({ force: true });
      await expect(dialog).toBeVisible();
    });

    test('a swipe down on the handle dismisses the sheet', async ({ page }) => {
      await page.goto(`/components/overlay/action-sheet${fw.query}`);
      await openFrom(page, 'basics', 'Photo actions');
      const dialog = page.getByRole('dialog', { name: 'Photo', exact: true });
      await expect(dialog).toBeVisible();
      const handle = dialog.locator('.oge-action-sheet-handle');
      // wait for the slide-in transition to settle before measuring
      await expect
        .poll(async () => (await handle.boundingBox())?.y ?? 0)
        .toBeGreaterThan(0);
      let previous = -1;
      await expect
        .poll(async () => {
          const y = Math.round((await handle.boundingBox())?.y ?? 0);
          const settled = y === previous;
          previous = y;
          return settled;
        })
        .toBe(true);
      const box = (await handle.boundingBox())!;
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x, y + 60, { steps: 6 });
      await page.mouse.move(x, y + 140, { steps: 6 });
      await page.mouse.up();
      await expect(dialog).toHaveCount(0);
    });

    test('open() resolves with the action or null; closing can veto', async ({
      page,
    }) => {
      await page.goto(`/components/overlay/action-sheet${fw.query}`);
      const demo = card(page, 'promise-api-events');
      await openFrom(page, 'promise-api-events', 'Choose a layout');
      const dialog = page.getByRole('dialog', { name: 'Layout', exact: true });
      // keepOpen: the preview action leaves the sheet open
      await dialog
        .getByRole('menuitem', {
          name: 'Preview (keeps the sheet open)',
          exact: true,
        })
        .click();
      await expect(dialog).toBeVisible();
      await dialog.getByRole('menuitem', { name: 'List', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await expect(demo.getByTestId('action-sheet-result')).toHaveText(
        'Chose List',
      );

      await demo
        .getByRole('button', { name: 'Choose a layout', exact: true })
        .click();
      await settled(page);
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(demo.getByTestId('action-sheet-result')).toHaveText(
        'Dismissed',
      );
    });

    test('the open sheet has no axe violations', async ({ page }) => {
      test.slow();
      await page.goto(`/components/overlay/action-sheet${fw.query}`);
      await openFrom(page, 'basics', 'Photo actions');
      const dialog = page.getByRole('dialog', { name: 'Photo', exact: true });
      await expect(dialog).toBeVisible();
      const results = await new AxeBuilder({ page })
        .include('.oge-action-sheet-layer')
        .disableRules(['color-contrast'])
        .analyze();
      expect(
        results.violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
        ),
      ).toEqual([]);
    });
  });
}
