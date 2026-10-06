import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Modality is the whole point of this component, and it is the part jsdom
 * cannot prove end to end: it needs real layout, real focus and a real
 * backdrop. The mode decision itself is unit-tested DOM-free in `@oge-ui/core`.
 */
test('a modal drawer is a dialog; a side drawer is a landmark', async ({
  page,
}) => {
  await page.goto('/components/drawer');

  const modal = page.locator('app-demo-card:has(#modal-drawer) oge-drawer');
  const panel = modal.locator('.oge-drawer-panel');
  await expect(panel).toHaveAttribute('role', 'dialog');
  await expect(panel).toHaveAttribute('aria-modal', 'true');

  const rail = page.locator('app-demo-card:has(#compact-rail) oge-drawer');
  const railPanel = rail.locator('.oge-drawer-panel');
  // a persistent drawer must be a landmark, and must NOT claim aria-modal
  await expect(railPanel).toHaveAttribute('role', 'navigation');
  await expect(railPanel).not.toHaveAttribute('aria-modal', /.*/);
});

test('opening a modal drawer takes focus and Escape gives it back', async ({
  page,
}) => {
  await page.goto('/components/drawer');
  const card = page.locator('app-demo-card:has(#modal-drawer)');
  const opener = card.getByRole('button', { name: 'Open menu' });

  await opener.scrollIntoViewIfNeeded();
  await opener.click();

  const panel = card.locator('.oge-drawer-panel');
  await expect(panel).not.toHaveAttribute('inert', /.*/);
  // autoFocus 'first-tabbable' lands on the close button, which this demo
  // renders ahead of the panel content
  await expect(panel.locator('.oge-drawer-close')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(panel).toHaveAttribute('inert', '');
  await expect(opener).toBeFocused();
});

test('the container width, not the window, drives the compact downgrade', async ({
  page,
}) => {
  await page.goto('/components/drawer');
  const card = page.locator('app-demo-card:has(#responsive-downgrade)');
  const slider = card.locator('input[type="range"]');
  const drawer = card.locator('oge-drawer');

  await slider.scrollIntoViewIfNeeded();
  await slider.fill('700');
  await expect(drawer).toHaveAttribute('data-mode', 'side');

  // the browser window never changes — only the box the drawer lives in
  await slider.fill('300');
  await expect(drawer).toHaveAttribute('data-mode', 'overlay');
  await expect(card.locator('p').last()).toContainText('overlay');

  await slider.fill('700');
  await expect(drawer).toHaveAttribute('data-mode', 'side');
});

test('the app shell renders toolbar, drawer, tree view and splitter together', async ({
  page,
}) => {
  await page.goto('/components/drawer');
  const shell = page.locator('app-demo-card:has(#app-shell)');
  await expect(shell.locator('oge-toolbar')).toHaveAttribute('role', 'toolbar');
  await expect(shell.locator('oge-drawer .oge-tree-view')).toBeVisible();
  await expect(shell.locator('oge-splitter')).toBeVisible();
});

test('drawer page has no axe violations (light and dark)', async ({ page }) => {
  await page.goto('/components/drawer');
  // the route is lazy: wait for a real drawer before handing axe an include
  await expect(page.locator('oge-drawer').first()).toBeVisible();
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((mode) => {
      document.documentElement.classList.toggle(
        'oge-theme-dark',
        mode === 'dark',
      );
    }, theme);
    const results = await new AxeBuilder({ page })
      .include('oge-drawer')
      .disableRules(['color-contrast'])
      .analyze();
    expect(results.violations, `${theme} violations`).toEqual([]);
  }
});

// --- G5a: built-in navigation items and touch swipe, in both render layers --

const DRAWER_FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

/** A touch swipe as script sees it: `pointerType: 'touch'` pointer events. */
async function touchSwipe(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
): Promise<void> {
  const fire = (type: string, point: { x: number; y: number }) =>
    page.evaluate(
      ({ type, point }) => {
        const target =
          document.elementFromPoint(point.x, point.y) ?? document.body;
        target.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            composed: true,
            pointerId: 51,
            pointerType: 'touch',
            isPrimary: true,
            button: type === 'pointermove' ? -1 : 0,
            buttons: type === 'pointerup' ? 0 : 1,
            clientX: point.x,
            clientY: point.y,
          }),
        );
      },
      { type, point },
    );
  await fire('pointerdown', from);
  for (let i = 1; i <= 8; i++) {
    await fire('pointermove', {
      x: from.x + ((to.x - from.x) * i) / 8,
      y: from.y + ((to.y - from.y) * i) / 8,
    });
  }
  await fire('pointerup', to);
}

for (const fw of DRAWER_FRAMEWORKS) {
  test.describe(`${fw.name} drawer items and swipe`, () => {
    test('items: active entry, selection, arrow keys and the icon rail', async ({
      page,
    }) => {
      await page.goto(`/components/drawer${fw.query}`);
      const demo = page
        .locator('app-demo-card')
        .filter({ hasText: 'Navigation items' });
      const drawer = demo.locator('.oge-drawer');
      const inbox = drawer.getByRole('button', { name: /^Inbox/ });
      const sent = drawer.getByRole('button', { name: /^Sent/ });
      await expect(inbox).toHaveAttribute('aria-current', 'page');
      await expect(
        drawer.getByRole('button', { name: /^Trash/ }),
      ).toBeDisabled();

      await sent.click();
      await expect(sent).toHaveAttribute('aria-current', 'page');
      await expect(inbox).not.toHaveAttribute('aria-current', 'page');
      await expect(demo.getByTestId('drawer-items-page')).toHaveText(
        'Showing: sent',
      );

      // every entry is in the Tab order; the arrows are a convenience on top
      await sent.focus();
      await page.keyboard.press('ArrowDown');
      await expect(
        drawer.getByRole('button', { name: /^Starred/ }),
      ).toBeFocused();
      await page.keyboard.press('ArrowDown');
      // the disabled Trash entry and the separator are skipped
      await expect(
        drawer.getByRole('button', { name: /^Settings/ }),
      ).toBeFocused();
      await page.keyboard.press('Home');
      await expect(inbox).toBeFocused();

      // collapsed to the mini rail: icons only, the label stays the name
      await demo.getByRole('button', { name: 'Collapse to rail' }).click();
      await expect(drawer).toHaveClass(/oge-drawer-rail/);
      await expect(sent).toBeVisible();
      await sent.focus();
      await expect(page.getByRole('tooltip')).toContainText('Sent');

      const results = await new AxeBuilder({ page })
        .include(
          '.oge-drawer:has(> .oge-drawer-panel[aria-label="Mail folders"])',
        )
        .disableRules(['color-contrast'])
        .analyze();
      expect(results.violations).toEqual([]);
    });

    test('swipe: a touch edge swipe opens, a swipe toward the edge closes', async ({
      page,
    }) => {
      await page.goto(`/components/drawer${fw.query}`);
      const demo = page
        .locator('app-demo-card')
        .filter({ hasText: 'Swipe gestures' });
      const drawer = demo.locator('.oge-drawer');
      await drawer.scrollIntoViewIfNeeded();
      await expect(drawer).not.toHaveClass(/oge-drawer-opened/);
      const box = (await drawer.boundingBox())!;
      const y = box.y + box.height / 2;

      // a mouse swipe does nothing: touch pointers only
      await page.mouse.move(box.x + 4, y);
      await page.mouse.down();
      await page.mouse.move(box.x + 160, y, { steps: 8 });
      await page.mouse.up();
      await expect(drawer).not.toHaveClass(/oge-drawer-opened/);

      await touchSwipe(page, { x: box.x + 6, y }, { x: box.x + 170, y });
      await expect(drawer).toHaveClass(/oge-drawer-opened/);

      await touchSwipe(page, { x: box.x + 150, y }, { x: box.x + 10, y });
      await expect(drawer).not.toHaveClass(/oge-drawer-opened/);
      await expect(demo.getByTestId('drawer-swipe-content')).toContainText(
        'Last close: swipe.',
      );
    });
  });
}
