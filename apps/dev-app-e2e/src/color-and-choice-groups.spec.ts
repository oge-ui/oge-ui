import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * The standalone color gradient / color palette and the two choice groups
 * (check box group, toggle group), in both render layers. jsdom cannot lay
 * the gradient surface out or deliver a real drag, and cannot prove the
 * tiles' focus ring or axe cleanliness — this suite does, on the real pages.
 * Every test runs once per layer: the React view is the same route with
 * `?framework=react`, and both layers render the same `.oge-*` markup.
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
  test.describe(`${layer.name}: color gradient`, () => {
    const route = `/components/inputs/color-gradient${layer.query}`;

    test('hue keyboard step and a surface drag commit live', async ({
      page,
    }) => {
      await page.goto(route);
      const value = page.getByTestId('gradient-value');
      await expect(value).toHaveText('#3aa0ff');
      const basic = page.locator(card('getting-started'));
      const hue = basic.locator('.oge-color-slider-thumb').first();
      await hue.scrollIntoViewIfNeeded();
      await hue.focus();
      await page.keyboard.press('Home');
      await expect(hue).toHaveAttribute('aria-valuenow', '0');
      await expect(value).not.toHaveText('#3aa0ff');

      const before = await value.textContent();
      const surface = basic.locator('.oge-color-surface');
      const box = (await surface.boundingBox())!;
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.7, {
        steps: 4,
      });
      await page.mouse.up();
      await expect(value).not.toHaveText(before!);
    });

    test('Escape mid-drag restores the start color', async ({ page }) => {
      await page.goto(route);
      const value = page.getByTestId('gradient-value');
      const surface = page
        .locator(card('getting-started'))
        .locator('.oge-color-surface');
      await surface.scrollIntoViewIfNeeded();
      const start = await value.textContent();
      const box = (await surface.boundingBox())!;
      await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.9);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1, {
        steps: 3,
      });
      await page.keyboard.press('Escape');
      await page.mouse.up();
      await expect(value).toHaveText(start!);
    });

    test('the contrast readout shows the WCAG verdicts', async ({ page }) => {
      await page.goto(route);
      const readout = page
        .locator(card('contrast-checker'))
        .locator('.oge-color-gradient-contrast')
        .first();
      await readout.scrollIntoViewIfNeeded();
      await expect(
        readout.locator('.oge-color-gradient-contrast-ratio'),
      ).toHaveText('4.54:1');
      await expect(
        readout.locator('.oge-color-gradient-contrast-badge'),
      ).toHaveText(['AA pass', 'AAA fail']);
    });

    test('has no axe violations', async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('.oge-color-gradient').first()).toBeVisible();
      await axe(page);
    });
  });

  test.describe(`${layer.name}: color palette`, () => {
    const route = `/components/inputs/color-palette${layer.query}`;

    test('one roving tab stop; arrows walk the grid; Enter picks', async ({
      page,
    }) => {
      await page.goto(route);
      const value = page.getByTestId('palette-value');
      const grid = page
        .locator(card('getting-started'))
        .locator('.oge-color-palette');
      await expect(grid).toHaveAttribute('role', 'grid');
      const stops = grid.locator('.oge-color-palette-cell[tabindex="0"]');
      await expect(stops).toHaveCount(1);
      await stops.focus();
      await expect(stops).toHaveAttribute('aria-selected', 'true');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Home');
      await page.keyboard.press('Enter');
      // default preset, 10 columns: #4a86e8 is row 1, so row 2's first tile
      await expect(value).toHaveText('#e6b8af');
      const focused = grid.locator('.oge-color-palette-cell:focus');
      await expect(focused).toHaveAttribute('aria-label', '#e6b8af');
      await expect(focused).toHaveAttribute('aria-selected', 'true');
    });

    test('a click on a preset tile selects it', async ({ page }) => {
      await page.goto(route);
      const office = page
        .locator(card('presets'))
        .locator('.oge-color-palette')
        .first();
      await office.scrollIntoViewIfNeeded();
      const tile = office.locator('.oge-color-palette-cell').nth(5);
      await tile.click();
      await expect(tile).toHaveAttribute('aria-selected', 'true');
    });

    test('has no axe violations', async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('.oge-color-palette').first()).toBeVisible();
      await axe(page);
    });
  });

  test.describe(`${layer.name}: check box group`, () => {
    const route = `/components/inputs/check-box-group${layer.query}`;

    test('commits an array in items order; disabled items stay', async ({
      page,
    }) => {
      await page.goto(route);
      const value = page.getByTestId('group-value');
      await expect(value).toHaveText('["mail","push"]');
      const group = page
        .locator(card('getting-started'))
        .locator('.oge-check-box-group');
      await expect(group).toHaveAttribute('role', 'group');
      await group.getByRole('checkbox', { name: 'Phone call' }).check();
      await group.getByRole('checkbox', { name: 'SMS' }).check();
      await expect(value).toHaveText('["mail","sms","push","call"]');
      await expect(
        group
          .locator('.oge-check-box', { hasText: 'Push' })
          .locator('.oge-check-box-input'),
      ).toBeDisabled();
    });

    test('select all is tri-state (mixed → all → none)', async ({ page }) => {
      await page.goto(route);
      const group = page
        .locator(card('select-all'))
        .locator('.oge-check-box-group');
      await group.scrollIntoViewIfNeeded();
      const all = group.locator(
        '.oge-check-box-group-select-all .oge-check-box-input',
      );
      await expect(all).toHaveJSProperty('indeterminate', true);
      await all.click();
      await expect(all).toBeChecked();
      await expect(
        group.locator('.oge-check-box-group-item .oge-check-box-input:checked'),
      ).toHaveCount(5);
      await all.click();
      await expect(
        group.locator('.oge-check-box-group-item .oge-check-box-input:checked'),
      ).toHaveCount(0);
    });

    test('the form demo shows its error once touched', async ({ page }) => {
      await page.goto(route);
      const group = page
        .locator(card('inside-a-form'))
        .locator('.oge-check-box-group');
      await group.scrollIntoViewIfNeeded();
      const first = group.locator('.oge-check-box-input').first();
      await first.focus();
      await page.keyboard.press('Space');
      await page.keyboard.press('Space');
      await first.blur();
      await expect(group.locator('.oge-check-box-group-error')).toHaveText(
        'Pick at least one interest',
      );
      await expect(group).toHaveAttribute('aria-invalid', 'true');
    });

    test('has no axe violations', async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('.oge-check-box-group').first()).toBeVisible();
      await axe(page);
    });
  });

  test.describe(`${layer.name}: toggle group`, () => {
    const route = `/components/inputs/toggle-controls${layer.query}`;

    test('single: radiogroup arrows move selection; multiple: aria-pressed', async ({
      page,
    }) => {
      await page.goto(route);
      const demo = page.locator(card('toggle-group'));
      await demo.scrollIntoViewIfNeeded();
      const output = page.getByTestId('toggle-output');
      const single = demo.locator('.oge-toggle-group').first();
      const track = single.locator('.oge-toggle-group-track');
      await expect(track).toHaveAttribute('role', 'radiogroup');
      const left = single.locator('.oge-toggle-group-item', {
        hasText: 'Left',
      });
      await expect(left).toHaveAttribute('aria-checked', 'true');
      await left.focus();
      await page.keyboard.press('ArrowRight');
      await expect(output).toContainText('align: center');
      await expect(
        single.locator('.oge-toggle-group-item', { hasText: 'Center' }),
      ).toBeFocused();

      const multiple = demo.locator('.oge-toggle-group').nth(1);
      await expect(multiple.locator('.oge-toggle-group-track')).toHaveAttribute(
        'role',
        'group',
      );
      const tue = multiple.locator('.oge-toggle-group-item', {
        hasText: 'Tue',
      });
      await tue.click();
      await expect(tue).toHaveAttribute('aria-pressed', 'true');
      await expect(output).toContainText('["Mon","Tue","Thu"]');
    });

    test('has no axe violations', async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('.oge-toggle-group').first()).toBeVisible();
      await axe(page);
    });
  });
}
