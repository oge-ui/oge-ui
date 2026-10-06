import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Locator, type Page } from '@playwright/test';

/**
 * The non-modal window (`oge-window` / `<OgeWindow>`) in both render layers:
 * it never blocks the page, drags by the title bar with the mouse and the
 * keyboard, resizes from its handles, minimizes / maximizes, orders several
 * windows by the last press and closes on Escape only from inside.
 */
const LAYERS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

function card(page: Page, heading: string): Locator {
  return page.locator('app-demo-card').filter({
    has: page.getByRole('heading', { name: heading, exact: true }),
  });
}

async function box(locator: Locator) {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error('no bounding box');
  return rect;
}

for (const layer of LAYERS) {
  test.describe(`window (${layer.name})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/components/overlay/window${layer.query}`);
      await expect(page.locator('app-demo-card').first()).toBeVisible();
    });

    test('is a non-modal dialog: the page stays usable and focus moves in', async ({
      page,
    }) => {
      const opener = card(page, 'Basics').getByRole('button', {
        name: 'Open window',
      });
      await opener.click();
      const win = page.getByRole('dialog', { name: 'Quick notes' });
      await expect(win).toBeVisible();
      await expect(win).not.toHaveAttribute('aria-modal', /.*/);
      await expect(page.locator('.oge-modal-layer')).toHaveCount(0);
      await expect(win.getByRole('textbox')).toBeFocused();
      // the page behind is not inert: its controls still take focus
      await opener.focus();
      await expect(opener).toBeFocused();
      // Escape outside the window does nothing; inside it closes
      await page.keyboard.press('Escape');
      await expect(win).toBeVisible();
      await win.getByRole('textbox').focus();
      await page.keyboard.press('Escape');
      await expect(win).toHaveCount(0);
    });

    test('several windows: a press brings one to the front', async ({
      page,
    }) => {
      await card(page, 'Multiple windows & stacking')
        .getByRole('button', { name: 'Open three windows' })
        .click();
      const inspector = page.getByRole('dialog', { name: 'Inspector' });
      const layers = page.getByRole('dialog', { name: 'Layers' });
      await expect(inspector).toBeVisible();
      await expect(layers).toBeVisible();
      const z = (l: Locator) =>
        l.evaluate((el) => Number(getComputedStyle(el).zIndex));
      await layers.locator('.oge-window-title').click();
      await expect(layers).toHaveClass(/oge-window-active/);
      expect(await z(layers)).toBeGreaterThan(await z(inspector));
      await inspector.locator('.oge-window-title').click();
      await expect(inspector).toHaveClass(/oge-window-active/);
      await expect(layers).not.toHaveClass(/oge-window-active/);
      expect(await z(inspector)).toBeGreaterThan(await z(layers));
      await expect(page.getByTestId('active-window')).toHaveText(
        'active: Inspector',
      );
      // a select opened inside a window shows above it
      await inspector.locator('.oge-input-dropdown').click();
      const popup = page.locator('.oge-popup').filter({
        has: page.locator('.oge-select-option'),
      });
      await expect(popup).toBeVisible();
      expect(await z(popup)).toBeGreaterThan(await z(inspector));
      // Escape closes the popup first, the window stays
      await page.keyboard.press('Escape');
      await expect(popup).toHaveCount(0);
      await expect(inspector).toBeVisible();
    });

    test('drags with the mouse and with the keyboard', async ({ page }) => {
      await card(page, 'Drag & resize (keyboard too)')
        .getByRole('button', { name: 'Open draggable window' })
        .click();
      const win = page.getByRole('dialog', { name: 'Drag me' });
      await expect(win).toBeVisible();
      const start = await box(win);
      const title = await box(win.locator('.oge-window-title'));
      await page.mouse.move(title.x + 20, title.y + title.height / 2);
      await page.mouse.down();
      await page.mouse.move(title.x - 60, title.y + title.height / 2 + 40, {
        steps: 6,
      });
      await page.mouse.up();
      const dragged = await box(win);
      expect(Math.round(dragged.x - start.x)).toBe(-80);
      expect(Math.round(dragged.y - start.y)).toBe(40);
      await expect(page.getByTestId('drag-status')).toContainText('(pointer)');
      // the press focused the frame: arrows move it by 10px
      await expect(win).toBeFocused();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      // the move lands on the next render — poll instead of reading once
      await expect
        .poll(async () => Math.round((await box(win)).x - dragged.x))
        .toBe(20);
      await expect(page.getByTestId('drag-status')).toContainText('(keyboard)');
      await expect(
        page.locator('[data-oge-live-announcer="polite"]'),
      ).toContainText('Window moved to');
    });

    test('resizes from a handle and with Ctrl+arrows', async ({ page }) => {
      await card(page, 'Drag & resize (keyboard too)')
        .getByRole('button', { name: 'Open draggable window' })
        .click();
      const win = page.getByRole('dialog', { name: 'Drag me' });
      await expect(win).toBeVisible();
      const start = await box(win);
      const handle = await box(win.locator('.oge-window-resize-se'));
      await page.mouse.move(
        handle.x + handle.width / 2,
        handle.y + handle.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(handle.x + 60, handle.y + 50, { steps: 5 });
      await page.mouse.up();
      const resized = await box(win);
      expect(resized.width).toBeGreaterThan(start.width + 40);
      expect(resized.height).toBeGreaterThan(start.height + 30);
      expect(Math.round(resized.x)).toBe(Math.round(start.x));
      await expect(page.getByTestId('drag-status')).toContainText('resized');
      await win.focus();
      await page.keyboard.press('Control+ArrowLeft');
      await expect
        .poll(async () => Math.round(resized.width - (await box(win)).width))
        .toBe(10);
      // the minimum holds
      for (let i = 0; i < 40; i++)
        await page.keyboard.press('Control+ArrowLeft');
      await expect
        .poll(async () => Math.round((await box(win)).width))
        .toBe(260);
    });

    test('minimize, maximize and restore', async ({ page }) => {
      const demo = card(page, 'Minimize / maximize');
      await demo.getByRole('button', { name: 'Open report' }).click();
      const win = page.getByRole('dialog', { name: 'Report' });
      await expect(win).toBeVisible();
      await win.getByRole('button', { name: 'Maximize' }).click();
      await expect(page.getByTestId('window-state')).toHaveText(
        'state: maximized',
      );
      const viewport = page.viewportSize()!;
      const max = await box(win);
      expect(Math.round(max.width)).toBe(viewport.width);
      await win.getByRole('button', { name: 'Restore' }).click();
      await expect(page.getByTestId('window-state')).toHaveText(
        'state: normal',
      );
      await win.getByRole('button', { name: 'Minimize' }).click();
      await expect(win.locator('.oge-window-body')).toBeHidden();
      await expect(page.getByTestId('window-state')).toHaveText(
        'state: minimized',
      );
      // Alt+↑ restores a minimized window
      await win.focus();
      await page.keyboard.press('Alt+ArrowUp');
      await expect(win.locator('.oge-window-body')).toBeVisible();
      // the veto keeps the state
      await demo.getByLabel('Veto maximize').check();
      await win.getByRole('button', { name: 'Maximize' }).click();
      await expect(page.getByTestId('window-state')).toHaveText(
        'state: normal',
      );
    });

    test('placements resolve and re-place an open window', async ({ page }) => {
      const demo = card(page, 'Placement & constraints');
      await demo
        .getByRole('button', { name: 'bottom-end', exact: true })
        .click();
      const win = page.getByRole('dialog', { name: 'Placed window' });
      await expect(win).toBeVisible();
      const viewport = page.viewportSize()!;
      const corner = await box(win);
      expect(
        Math.round(viewport.width - (corner.x + corner.width)),
      ).toBeLessThanOrEqual(20);
      await demo
        .getByRole('button', { name: 'top-start', exact: true })
        .click();
      await expect
        .poll(async () => Math.round((await box(win)).x))
        .toBeLessThanOrEqual(20);
    });

    test('events log the pipeline', async ({ page }) => {
      await card(page, 'Events')
        .getByRole('button', { name: 'Open event log window' })
        .click();
      const win = page.getByRole('dialog', { name: 'Event log' });
      await expect(win).toBeVisible();
      await win.getByRole('button', { name: 'Close' }).click();
      const log = page.getByTestId('window-events');
      await expect(log).toContainText('opening');
      await expect(log).toContainText('closing (closeButton)');
      await expect(log).toContainText('closed (closeButton)');
    });

    test('has no axe violations with windows open', async ({ page }) => {
      await card(page, 'Multiple windows & stacking')
        .getByRole('button', { name: 'Open three windows' })
        .click();
      await expect(page.getByRole('dialog', { name: 'Console' })).toBeVisible();
      const results = await new AxeBuilder({ page })
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

test('RTL: start placements mirror to the right edge', async ({ page }) => {
  await page.goto('/components/overlay/window');
  await page.evaluate(() =>
    document.documentElement.setAttribute('dir', 'rtl'),
  );
  await card(page, 'Placement & constraints')
    .getByRole('button', { name: 'top-start', exact: true })
    .click();
  const win = page.getByRole('dialog', { name: 'Placed window' });
  await expect(win).toBeVisible();
  const viewport = page.viewportSize()!;
  const rect = await box(win);
  expect(
    Math.round(viewport.width - (rect.x + rect.width)),
  ).toBeLessThanOrEqual(20);
});
