import { test, expect, type Locator, type Page } from '@playwright/test';

/**
 * Visual-state regression guard for the most fragile controls: the colours
 * that tell "on" from "off", "selected" from "idle" and "idle" from
 * "disabled", in the light and the dark theme.
 *
 * Deliberately computed-style assertions, not `toHaveScreenshot` baselines:
 * font rasterisation differs between the Windows machines the suite is built
 * on and the Linux CI runners, so pixel baselines would need one set per
 * platform and still flake on sub-pixel text. What regressed in practice was
 * never anti-aliasing — it was a state losing its colour (an unchecked box
 * drawn in the hairline border colour, an unpressed segment in the disabled
 * grey, a calendar glyph flipped upside down by the chevron rule). Each check
 * compares a painted property with the token it must resolve to, read through
 * a probe inside the component, so a theme or token change moves both sides.
 */

const THEMES = ['light', 'dark'] as const;
type Theme = (typeof THEMES)[number];

async function open(page: Page, path: string, theme: Theme): Promise<void> {
  await page.goto(path);
  if (theme === 'dark') {
    await page.getByLabel('Switch to dark mode').click();
    await expect(page.locator('html')).toHaveClass(/oge-theme-dark/);
    // the dark theme stylesheet is lazy-loaded; wait until it applies
    await page.waitForFunction(() =>
      [...document.styleSheets].some((sheet) => {
        try {
          return !!sheet.href?.includes('themes/dark.css') && !!sheet.cssRules;
        } catch {
          return false;
        }
      }),
    );
  }
}

/**
 * Resolves `value` (e.g. `var(--oge-accent)`) for `property` as the browser
 * paints it inside `scope`, so scope-local tokens resolve exactly as the
 * component's own rules see them.
 */
async function token(
  scope: Locator,
  property: 'color' | 'background-color' | 'border-color',
  value: string,
): Promise<string> {
  return scope.evaluate(
    (el, [prop, val]) => {
      const probe = document.createElement('span');
      probe.style.setProperty(prop, val);
      if (prop === 'border-color') probe.style.borderStyle = 'solid';
      el.appendChild(probe);
      const resolved = getComputedStyle(probe).getPropertyValue(prop);
      probe.remove();
      return resolved;
    },
    [property, value] as const,
  );
}

function css(target: Locator, property: string): Promise<string> {
  return target.evaluate(
    (el, prop) => getComputedStyle(el).getPropertyValue(prop),
    property,
  );
}

for (const theme of THEMES) {
  test.describe(`visual states (${theme})`, () => {
    test('toggle controls: off, on and unpressed states stay distinguishable', async ({
      page,
    }) => {
      await open(page, '/components/inputs/toggle-controls', theme);

      // check box: the unchecked glyph is its border alone — muted, never
      // the hairline border token that all but vanishes on the surface
      const unchecked = page
        .locator(
          '.oge-check-box:not(.oge-check-box-checked):not(.oge-check-box-indeterminate):not(.oge-disabled)',
        )
        .first();
      const uncheckedIcon = unchecked.locator('.oge-check-box-icon');
      await expect(uncheckedIcon).toBeVisible();
      expect(await css(uncheckedIcon, 'border-top-color')).toBe(
        await token(unchecked, 'border-color', 'var(--oge-muted-color)'),
      );
      expect(await css(uncheckedIcon, 'border-top-color')).not.toBe(
        await token(unchecked, 'border-color', 'var(--oge-border-color)'),
      );
      const on = page
        .locator('.oge-check-box-checked, .oge-check-box-indeterminate')
        .first();
      expect(
        await css(on.locator('.oge-check-box-icon'), 'background-color'),
      ).toBe(await token(on, 'background-color', 'var(--oge-accent)'));

      // switch: on fills the track with the accent, off keeps a muted outline
      const switchOn = page
        .locator('.oge-switch.oge-switch-on:not(.oge-disabled)')
        .first();
      expect(
        await css(switchOn.locator('.oge-switch-track'), 'background-color'),
      ).toBe(await token(switchOn, 'background-color', 'var(--oge-accent)'));
      const switchOff = page
        .locator('.oge-switch:not(.oge-switch-on):not(.oge-disabled)')
        .first();
      expect(
        await css(switchOff.locator('.oge-switch-track'), 'border-top-color'),
      ).toBe(await token(switchOff, 'border-color', 'var(--oge-muted-color)'));

      // radio: checked ring is the accent, unchecked ring muted
      const radioOn = page.locator('.oge-radio.oge-radio-checked').first();
      expect(
        await css(radioOn.locator('.oge-radio-dot'), 'border-top-color'),
      ).toBe(await token(radioOn, 'border-color', 'var(--oge-accent)'));
      const radioOff = page
        .locator('.oge-radio:not(.oge-radio-checked):not(:disabled)')
        .first();
      expect(
        await css(radioOff.locator('.oge-radio-dot'), 'border-top-color'),
      ).toBe(await token(radioOff, 'border-color', 'var(--oge-muted-color)'));

      // toggle group: the pressed segment is accent-framed; an unpressed one
      // is readable secondary text, not the disabled grey
      const pressed = page.locator('.oge-toggle-group-item-selected').first();
      expect(await css(pressed, 'border-top-color')).toBe(
        await token(pressed, 'border-color', 'var(--oge-accent)'),
      );
      // its label: the accent deepened a fifth toward the text colour (AA on
      // the accent-soft fill)
      expect(await css(pressed, 'color')).toBe(
        await token(
          pressed,
          'color',
          'color-mix(in srgb, var(--oge-accent) 80%, var(--oge-text-color))',
        ),
      );
      const idle = page
        .locator(
          '.oge-toggle-group-item:not(.oge-toggle-group-item-selected):not(:disabled)',
        )
        .first();
      expect(await css(idle, 'color')).toBe(
        await token(idle, 'color', 'var(--oge-input-muted)'),
      );
      expect(await css(idle, 'color')).not.toBe(
        await token(idle, 'color', 'var(--oge-muted-color)'),
      );
    });

    test('date box: closed field, open calendar and an upright calendar glyph', async ({
      page,
    }) => {
      await open(page, '/components/inputs/date-box', theme);
      const box = page.locator('oge-date-box').first();
      const container = box.locator('.oge-input-container');
      await container.scrollIntoViewIfNeeded();
      expect(await css(container, 'border-top-color')).toBe(
        await token(box, 'border-color', 'var(--oge-border-color)'),
      );

      const toggle = box.locator('.oge-input-dropdown');
      await toggle.click();
      await expect(box).toHaveClass(/oge-select-box-open/);
      // the chevron rule flips only chevrons — the calendar stays upright
      expect(await css(toggle.locator('svg'), 'transform')).toBe('none');
      // the border transitions into the accent: poll until it settles
      const accentBorder = await token(
        box,
        'border-color',
        'var(--oge-accent)',
      );
      await expect
        .poll(() => css(container, 'border-top-color'))
        .toBe(accentBorder);

      const popup = page
        .locator('.oge-popup')
        .filter({ has: page.locator('.oge-calendar') })
        .first();
      await expect(popup).toBeVisible();
      // desktop width: anchored panel, never the adaptive sheet
      await expect(popup).not.toHaveClass(/oge-popup-adaptive/);
      expect(await css(popup, 'background-color')).toBe(
        await token(popup, 'background-color', 'var(--oge-popup-bg)'),
      );
      await page.keyboard.press('Escape');
      await expect(box).not.toHaveClass(/oge-select-box-open/);

      // a datetime range fits its field (no clipped "10:" halves)
      const range = page
        .locator('oge-date-range-box')
        .filter({ hasText: 'Maintenance window' });
      for (const input of await range.locator('.oge-date-range-input').all()) {
        const fits = await input.evaluate(
          (el) => el.scrollWidth <= el.clientWidth + 1,
        );
        expect(fits).toBe(true);
      }
    });

    test('buttons: contained fill, disabled dimming and the keyboard ring', async ({
      page,
    }) => {
      await open(page, '/components/buttons', theme);
      const accent = page
        .locator(
          '.oge-button.oge-button-severity-accent:not(.oge-button-outlined):not(.oge-button-text-mode):not(.oge-disabled)',
        )
        .first();
      expect(
        await css(accent.locator('.oge-button-native'), 'background-color'),
      ).toBe(await token(accent, 'background-color', 'var(--oge-accent)'));

      const disabled = page.locator('.oge-button.oge-disabled').first();
      expect(
        Number(await css(disabled.locator('.oge-button-native'), 'opacity')),
      ).toBeLessThan(1);

      // keyboard focus: transparent outline (painted only in forced colors)
      // and a visible box-shadow ring
      const plain = page
        .locator(
          '.oge-button:not(.oge-button-colored):not(.oge-disabled) .oge-button-native',
        )
        .first();
      await plain.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(plain).toBeFocused();
      expect(await css(plain, 'outline-color')).toMatch(
        /rgba\(0, 0, 0, 0\)|transparent/,
      );
      expect(await css(plain, 'box-shadow')).not.toBe('none');
    });

    test('tabs: selected, idle and disabled tabs read differently', async ({
      page,
    }) => {
      await open(page, '/components/tabs', theme);
      const strip = page.locator('.oge-tab-strip').first();
      const selected = strip.locator('.oge-tab.oge-tab-selected');
      // colours transition after the theme switch — poll until they settle
      const accent = await token(strip, 'color', 'var(--oge-accent)');
      await expect.poll(() => css(selected, 'color')).toBe(accent);
      await expect
        .poll(() => css(selected, 'border-bottom-color'))
        .toBe(await token(strip, 'border-color', 'var(--oge-accent)'));
      const idle = strip
        .locator('.oge-tab:not(.oge-tab-selected):not(.oge-tab-disabled)')
        .first();
      await expect
        .poll(() => css(idle, 'color'))
        .toBe(await token(strip, 'color', 'var(--oge-input-muted)'));
      const disabled = strip.locator('.oge-tab.oge-tab-disabled').first();
      expect(Number(await css(disabled, 'opacity'))).toBeLessThan(1);
    });

    test('select box: the open list on the popup surface, chevron flipped', async ({
      page,
    }) => {
      await open(page, '/components/inputs/select-box', theme);
      const box = page.locator('oge-select-box').first();
      const toggle = box.locator('.oge-input-dropdown');
      await toggle.scrollIntoViewIfNeeded();
      await toggle.click();
      await expect(box).toHaveClass(/oge-select-box-open/);
      expect(await css(toggle.locator('svg'), 'transform')).not.toBe('none');
      const popup = page
        .locator('.oge-popup')
        .filter({ has: page.locator('.oge-select-option') })
        .first();
      await expect(popup).toBeVisible();
      await expect(popup).not.toHaveClass(/oge-popup-adaptive/);
      expect(await css(popup, 'background-color')).toBe(
        await token(popup, 'background-color', 'var(--oge-popup-bg)'),
      );
      // the active option carries the accent; an idle one is plain text
      const active = popup.locator('.oge-select-option-active').first();
      expect(await css(active, 'color')).toBe(
        await token(popup, 'color', 'var(--oge-accent)'),
      );
      const idle = popup
        .locator(
          '.oge-select-option:not(.oge-select-option-active):not(.oge-select-option-selected):not(.oge-disabled)',
        )
        .first();
      expect(await css(idle, 'color')).toBe(
        await token(popup, 'color', 'var(--oge-text-color)'),
      );
    });

    test('toggle button: pressed, unpressed and disabled read differently', async ({
      page,
    }) => {
      await open(page, '/components/buttons', theme);
      const demo = page.locator('[data-testid="toggle-demo"]');
      await demo.scrollIntoViewIfNeeded();

      // pressed: accent edge, accent text on the soft accent tint, plus the
      // underline indicator
      const pressed = demo
        .locator('.oge-button-toggle.oge-button-selected:not(.oge-disabled)')
        .first();
      const pressedNative = pressed.locator('.oge-button-native');
      await expect(pressedNative).toHaveAttribute('aria-pressed', 'true');
      const accentBorder = await token(
        pressed,
        'border-color',
        'var(--oge-accent)',
      );
      await expect
        .poll(() => css(pressedNative, 'border-top-color'))
        .toBe(accentBorder);
      expect(await css(pressedNative, 'color')).toBe(
        await token(pressed, 'color', 'var(--oge-accent)'),
      );
      expect(await css(pressedNative, 'background-color')).toBe(
        await token(pressed, 'background-color', 'var(--oge-accent-soft)'),
      );
      expect(
        await pressedNative.evaluate(
          (el) => getComputedStyle(el, '::after').content,
        ),
      ).not.toBe('none');

      // unpressed: readable secondary text at full opacity — not the
      // disabled grey
      const idle = demo
        .locator(
          '.oge-button-toggle:not(.oge-button-selected):not(.oge-disabled)',
        )
        .first();
      const idleNative = idle.locator('.oge-button-native');
      await expect(idleNative).toHaveAttribute('aria-pressed', 'false');
      expect(await css(idleNative, 'color')).toBe(
        await token(idle, 'color', 'var(--oge-input-muted)'),
      );
      expect(await css(idleNative, 'color')).not.toBe(
        await token(idle, 'color', 'var(--oge-muted-color)'),
      );
      expect(Number(await css(idleNative, 'opacity'))).toBe(1);

      // disabled: dimmed, whatever its pressed state
      const disabled = demo.locator('.oge-button-toggle.oge-disabled').first();
      expect(
        Number(await css(disabled.locator('.oge-button-native'), 'opacity')),
      ).toBeLessThan(1);
    });

    test('menu items: checked radio and checkbox glyphs carry the accent', async ({
      page,
    }) => {
      await open(page, '/components/menubar', theme);
      const demo = page.locator('app-demo-card:has(#radio-checkbox-items)');
      await demo.scrollIntoViewIfNeeded();
      await demo.locator('[role="menuitem"]', { hasText: 'View' }).click();
      const menu = page.locator('.oge-menu-list').first();
      await expect(menu).toBeVisible();

      const radio = menu.locator('[role="menuitemradio"][aria-checked="true"]');
      expect(await css(radio.locator('.oge-menu-item-check'), 'color')).toBe(
        await token(menu, 'color', 'var(--oge-accent)'),
      );
      await expect(radio.locator('.oge-menu-item-radio svg')).toBeVisible();
      const check = menu
        .locator('[role="menuitemcheckbox"][aria-checked="true"]')
        .first();
      expect(await css(check.locator('.oge-menu-item-check'), 'color')).toBe(
        await token(menu, 'color', 'var(--oge-accent)'),
      );
      // unchecked rows draw no glyph and keep the plain text colour
      const off = menu
        .locator('[role="menuitemradio"][aria-checked="false"]')
        .first();
      await expect(off.locator('svg')).toHaveCount(0);
      expect(await css(off, 'color')).toBe(
        await token(menu, 'color', 'var(--oge-text-color)'),
      );
      // the section caption is readable secondary text
      expect(await css(menu.locator('.oge-menu-header').first(), 'color')).toBe(
        await token(menu, 'color', 'var(--oge-input-muted)'),
      );
      await page.keyboard.press('Escape');
    });

    test('window: the active title bar carries the text colour + accent bar, the inactive one is muted', async ({
      page,
    }) => {
      await open(page, '/components/overlay/window', theme);
      const card = page
        .locator('app-demo-card')
        .filter({ hasText: 'Multiple windows & stacking' });
      await card.getByRole('button', { name: 'Open three windows' }).click();
      const inspector = page.getByRole('dialog', { name: 'Inspector' });
      const layers = page.getByRole('dialog', { name: 'Layers' });
      await expect(inspector).toBeVisible();
      await inspector.locator('.oge-window-title').click();
      await expect(inspector).toHaveClass(/oge-window-active/);
      // the header colours ease over 120ms after activation: poll
      const activeHeader = inspector.locator('.oge-window-header');
      const text = await token(inspector, 'color', 'var(--oge-text-color)');
      await expect.poll(() => css(activeHeader, 'color')).toBe(text);
      const accent = await token(inspector, 'color', 'var(--oge-accent)');
      await expect
        .poll(() => css(activeHeader, 'box-shadow'))
        .toContain(accent);
      const idleHeader = layers.locator('.oge-window-header');
      await expect(layers).not.toHaveClass(/oge-window-active/);
      const muted = await token(layers, 'color', 'var(--oge-input-muted)');
      await expect.poll(() => css(idleHeader, 'color')).toBe(muted);
      await expect.poll(() => css(idleHeader, 'box-shadow')).toBe('none');
    });

    test('dialog helpers: the danger confirm paints a destructive primary button', async ({
      page,
    }) => {
      await open(page, '/components/overlay/modal', theme);
      const card = page
        .locator('app-demo-card')
        .filter({ hasText: 'Dialog helpers' });
      await card.getByRole('button', { name: 'Delete file…' }).click();
      const dialog = page.getByRole('alertdialog', { name: 'Delete file?' });
      await expect(dialog).toBeVisible();
      const ok = dialog.getByRole('button', { name: 'Delete' });
      expect(await css(ok, 'background-color')).toBe(
        await token(dialog, 'background-color', 'var(--oge-danger)'),
      );
      expect(await css(ok, 'color')).toBe(
        await token(dialog, 'color', 'var(--oge-severity-contrast)'),
      );
      // the safe button stays a plain, readable outline button
      const cancel = dialog.getByRole('button', { name: 'Cancel' });
      expect(await css(cancel, 'color')).toBe(
        await token(dialog, 'color', 'var(--oge-text-color)'),
      );
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
    });

    test('drawer items: active, idle and disabled entries read differently', async ({
      page,
    }) => {
      await open(page, '/components/drawer', theme);
      const list = page
        .locator('app-demo-card')
        .filter({ hasText: 'Navigation items' })
        .locator('.oge-drawer-items');
      await list.scrollIntoViewIfNeeded();
      const active = list.locator('.oge-drawer-item-active');
      expect(await css(active, 'color')).toBe(
        await token(list, 'color', 'var(--oge-accent)'),
      );
      expect(await css(active, 'background-color')).toBe(
        await token(list, 'background-color', 'var(--oge-accent-soft)'),
      );
      // idle entries are readable muted text, not the disabled grey
      const idle = list
        .locator('.oge-drawer-item:not(.oge-drawer-item-active):not(:disabled)')
        .first();
      expect(await css(idle, 'color')).toBe(
        await token(list, 'color', 'var(--oge-input-muted)'),
      );
      const disabled = list.locator('.oge-drawer-item:disabled').first();
      expect(Number(await css(disabled, 'opacity'))).toBeLessThan(1);
      expect(await css(disabled, 'color')).toBe(
        await token(list, 'color', 'var(--oge-muted-color)'),
      );
    });

    test('tree view: the "Load more" row reads as an accent action', async ({
      page,
    }) => {
      await open(page, '/components/tree-view', theme);
      const tree = page
        .locator('app-demo-card')
        .filter({ hasText: 'Load more paging' })
        .locator('.oge-tree-view');
      const more = tree.locator('.oge-tree-view-item-more').first();
      await more.scrollIntoViewIfNeeded();
      expect(await css(more, 'color')).toBe(
        await token(tree, 'color', 'var(--oge-accent)'),
      );
      const row = tree
        .locator('.oge-tree-view-item:not(.oge-tree-view-item-more)')
        .first();
      expect(await css(row, 'color')).toBe(
        await token(tree, 'color', 'var(--oge-text-color)'),
      );
    });

    test('expansion panel: expanded, idle and disabled headers read differently', async ({
      page,
    }) => {
      await open(page, '/components/accordion', theme);
      const card = page.locator('app-demo-card:has(#expansion-panel)');
      await card.scrollIntoViewIfNeeded();
      const expanded = card
        .locator('.oge-expansion-panel-expanded .oge-expansion-panel-toggle')
        .first();
      expect(await css(expanded, 'background-color')).toBe(
        await token(card, 'background-color', 'var(--oge-accent-soft)'),
      );
      expect(
        await css(
          card.locator(
            '.oge-expansion-panel-expanded .oge-expansion-panel-chevron',
          ),
          'color',
        ),
      ).toBe(await token(card, 'color', 'var(--oge-accent)'));
      const idle = card
        .locator(
          '.oge-expansion-panel:not(.oge-expansion-panel-expanded):not(.oge-expansion-panel-disabled) .oge-expansion-panel-toggle',
        )
        .first();
      expect(await css(idle, 'background-color')).toBe('rgba(0, 0, 0, 0)');
      // the idle subtitle stays readable, not the disabled grey
      expect(
        await css(
          card
            .locator(
              '.oge-expansion-panel:not(.oge-expansion-panel-disabled) .oge-expansion-panel-subtitle',
            )
            .first(),
          'color',
        ),
      ).toBe(await token(card, 'color', 'var(--oge-input-muted)'));
      const disabled = card.locator(
        '.oge-expansion-panel-disabled .oge-expansion-panel-toggle',
      );
      expect(Number(await css(disabled, 'opacity'))).toBeLessThan(1);
    });

    test('circular progress: the value arc and the track differ', async ({
      page,
    }) => {
      await open(page, '/components/progress', theme);
      const card = page.locator('app-demo-card:has(#circular-progress)');
      await card.scrollIntoViewIfNeeded();
      const ring = card.locator('.oge-progress-bar-circular').first();
      const track = ring.locator('.oge-progress-ring-track');
      const value = ring.locator('.oge-progress-ring-value');
      expect(await css(track, 'stroke')).toBe(
        await token(ring, 'color', 'var(--oge-border-color)'),
      );
      expect(await css(value, 'stroke')).toBe(
        await token(ring, 'color', 'var(--oge-accent)'),
      );
      expect(await css(value, 'stroke')).not.toBe(await css(track, 'stroke'));
    });

    test('popover: surface, arrow and close button idle vs hover', async ({
      page,
    }) => {
      await open(page, '/components/overlay/popover', theme);
      const trigger = page
        .getByTestId('popover-basics')
        .getByRole('button', { name: 'Share' });
      await trigger.scrollIntoViewIfNeeded();
      await trigger.click();
      const panel = page.getByRole('dialog', { name: 'Share report' });
      await expect(panel).toBeVisible();
      expect(await css(panel, 'background-color')).toBe(
        await token(panel, 'background-color', 'var(--oge-popup-bg)'),
      );
      expect(await css(panel, 'border-top-color')).toBe(
        await token(panel, 'border-color', 'var(--oge-border-color)'),
      );
      // the arrow is part of the surface: same fill, the frame's edge
      const arrow = panel.locator('.oge-popover-arrow');
      await expect(arrow).toBeVisible();
      expect(await css(arrow, 'background-color')).toBe(
        await token(panel, 'background-color', 'var(--oge-popup-bg)'),
      );
      // idle is not disabled: the ✕ reads in the muted input tone, and the
      // hover state is a soft layer with full-strength text
      const close = panel.locator('.oge-popover-close');
      await page.mouse.move(0, 0);
      await expect
        .poll(() => css(close, 'color'))
        .toBe(await token(panel, 'color', 'var(--oge-input-muted)'));
      await close.hover();
      await expect
        .poll(() => css(close, 'background-color'))
        .toBe(
          await token(panel, 'background-color', 'var(--oge-row-hover-bg)'),
        );
      await expect
        .poll(() => css(close, 'color'))
        .toBe(await token(panel, 'color', 'var(--oge-text-color)'));
    });

    test('rating: filled and empty glyphs read differently', async ({
      page,
    }) => {
      await open(page, '/components/inputs/rating', theme);
      const card = page.locator('app-demo-card:has(#getting-started)');
      await card.scrollIntoViewIfNeeded();
      const rating = card.locator('.oge-rating').first();
      const filled = rating
        .locator('.oge-rating-item')
        .first()
        .locator('.oge-rating-filled .oge-rating-svg');
      const empty = rating
        .locator('.oge-rating-item')
        .last()
        .locator('.oge-rating-empty .oge-rating-svg');
      const ratingColor = await token(
        rating,
        'color',
        'var(--oge-rating-color)',
      );
      const emptyColor = await token(
        rating,
        'color',
        'var(--oge-rating-empty-color)',
      );
      expect(await css(filled, 'fill')).toBe(ratingColor);
      // the empty glyph is outlined in its token so 0 still reads as a control
      expect(await css(empty, 'stroke')).toBe(emptyColor);
      expect(ratingColor).not.toBe(emptyColor);
    });

    test('list box: selected and idle options read differently', async ({
      page,
    }) => {
      await open(page, '/components/inputs/list-box', theme);
      const card = page.locator('app-demo-card:has(#getting-started)');
      await card.scrollIntoViewIfNeeded();
      const list = card.locator('.oge-list-box').first();
      const options = list.locator('.oge-list-box-option');
      await options.nth(1).click();
      const selected = list.locator('.oge-list-box-option-selected').first();
      await expect(selected).toBeVisible();
      await page.mouse.move(0, 0);
      await expect
        .poll(() => css(selected, 'background-color'))
        .toBe(await token(list, 'background-color', 'var(--oge-selected-bg)'));
      const idle = list
        .locator('.oge-list-box-option:not(.oge-list-box-option-selected)')
        .last();
      expect(await css(idle, 'background-color')).not.toBe(
        await css(selected, 'background-color'),
      );
    });

    test('otp input: filled and empty cells read differently', async ({
      page,
    }) => {
      await open(page, '/components/inputs/otp-input', theme);
      const card = page.locator('app-demo-card:has(#getting-started)');
      await card.scrollIntoViewIfNeeded();
      const cells = card.locator('.oge-otp-input-cell');
      await cells.first().focus();
      await page.keyboard.type('1');
      await cells.nth(1).blur();
      const group = card.locator('.oge-otp-input');
      await expect
        .poll(() => css(cells.first(), 'border-top-color'))
        .toBe(await token(group, 'border-color', 'var(--oge-input-muted)'));
      expect(await css(cells.last(), 'border-top-color')).toBe(
        await token(group, 'border-color', 'var(--oge-border-color)'),
      );
      expect(await css(cells.first(), 'background-color')).toBe(
        await token(group, 'background-color', 'var(--oge-accent-soft)'),
      );
    });

    test('tooltip: the callout arrow carries the bubble fill', async ({
      page,
    }) => {
      await open(page, '/components/overlay/tooltip-context-menu', theme);
      const trigger = page
        .getByTestId('tooltip-templates')
        .getByRole('button', { name: 'Ada Lovelace' });
      await trigger.scrollIntoViewIfNeeded();
      await trigger.focus();
      const bubble = page.locator('.oge-tooltip', { hasText: 'Engineer' });
      await expect(bubble).toBeVisible();
      const arrow = bubble.locator('.oge-tooltip-arrow');
      await expect(arrow).toBeVisible();
      expect(await css(arrow, 'background-color')).toBe(
        await css(bubble, 'background-color'),
      );
      expect(await css(bubble, 'background-color')).toBe(
        await token(bubble, 'background-color', 'var(--oge-tooltip-bg)'),
      );
    });
  });
}

test.describe('phone width', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the docs header fits and no page scrolls sideways', async ({
    page,
  }) => {
    for (const path of [
      '/components/inputs/date-box',
      '/components/tabs',
      // the W8a–W8e pages
      '/components/avatar',
      '/components/chip',
      '/components/alert',
      '/components/timeline',
      '/components/app-bar',
      '/components/buttons/fab',
      '/components/inputs/rating',
      '/components/inputs/otp-input',
      '/components/inputs/signature-pad',
      '/components/inputs/list-box',
      '/components/inputs/transfer-list',
      '/components/inputs/mention',
      '/components/charts',
      '/components/charts/gauges',
      '/components/charts/specialized',
      '/components/carousel',
      '/components/overlay/action-sheet',
      '/components/list-view',
      '/components/data-view',
      '/components/tile-layout',
      '/components/editor',
    ]) {
      await page.goto(path);
      await expect(page.locator('app-demo-card').first()).toBeVisible();
      // the theme select is desktop-only; it used to overlap the header icons
      await expect(page.locator('.app-theme-select')).toBeHidden();
      // so are the placeholders the deferred header selects show first: they
      // once widened every page by 214px until the selects loaded (the
      // server-HTML twin of this check is ssr/phone-width.spec.ts)
      for (const placeholder of await page
        .locator('.app-theme-placeholder, .app-version-placeholder')
        .all()) {
        await expect(placeholder).toBeHidden();
      }
      // polled: the page settles (deferred blocks, fonts) after the first
      // card shows; a lasting overflow still fails, and the transient one the
      // header placeholders caused is caught deterministically by the
      // JavaScript-off server-HTML check (ssr/phone-width.spec.ts)
      await expect
        .poll(
          () =>
            page.evaluate(
              () => document.documentElement.scrollWidth - window.innerWidth,
            ),
          { message: path },
        )
        .toBeLessThanOrEqual(0);
    }
  });
});

test.describe('narrowest phone width (320px)', () => {
  test.use({ viewport: { width: 320, height: 640 }, locale: 'en-US' });

  test('the docs header fits after hydration, with every control reachable', async ({
    page,
  }) => {
    // a component page (framework switch shown) in both render layers, and
    // the landing page, whose header carries the brand and no switch
    for (const path of [
      '/components/tabs',
      '/components/tabs?framework=react',
      '/components/inputs/list-box',
      '/',
    ]) {
      await page.goto(path);
      const header = page.locator('header').first();
      await expect(header).toBeVisible();
      // polled: the deferred header blocks and fonts settle after load
      await expect
        .poll(
          () =>
            header.evaluate((el) => {
              const row = el.firstElementChild as HTMLElement;
              const right = Math.max(
                ...Array.from(row.querySelectorAll<HTMLElement>('*'))
                  .filter((child) => child.getClientRects().length > 0)
                  .map((child) => child.getBoundingClientRect().right),
              );
              return Math.max(
                row.scrollWidth - row.clientWidth,
                right - window.innerWidth,
              );
            }),
          { message: `${path}: header overflow (px)` },
        )
        .toBeLessThanOrEqual(0);
      // the narrow switch shows only the marks, but keeps its names
      if (path !== '/') {
        const group = header.getByRole('group', { name: 'Framework' });
        await expect(
          group.getByRole('button', { name: 'Angular' }),
        ).toBeVisible();
        await expect(
          group.getByRole('button', { name: 'React' }),
        ).toBeVisible();
      }
      await expect(
        header.getByRole('link', { name: 'GitHub repository' }),
      ).toBeVisible();
    }
  });
});
