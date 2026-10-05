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
      expect(await css(pressed, 'color')).toBe(
        await token(pressed, 'color', 'var(--oge-accent)'),
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
      expect(await css(container, 'border-top-color')).toBe(
        await token(box, 'border-color', 'var(--oge-accent)'),
      );

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
      expect(await css(selected, 'color')).toBe(
        await token(strip, 'color', 'var(--oge-accent)'),
      );
      expect(await css(selected, 'border-bottom-color')).toBe(
        await token(strip, 'border-color', 'var(--oge-accent)'),
      );
      const idle = strip
        .locator('.oge-tab:not(.oge-tab-selected):not(.oge-tab-disabled)')
        .first();
      expect(await css(idle, 'color')).toBe(
        await token(strip, 'color', 'var(--oge-input-muted)'),
      );
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
  });
}

test.describe('phone width', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the docs header fits and no page scrolls sideways', async ({
    page,
  }) => {
    for (const path of [
      '/components/inputs/date-box',
      '/components/charts',
      '/components/tabs',
    ]) {
      await page.goto(path);
      await expect(page.locator('app-demo-card').first()).toBeVisible();
      // the theme select is desktop-only; it used to overlap the header icons
      await expect(page.locator('.app-theme-select')).toBeHidden();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});
