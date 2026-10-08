import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * WCAG 1.4.13 (content on hover or focus) for the tooltip, in both render
 * layers: the bubble is **hoverable** (the pointer can travel from the
 * trigger onto it and it stays) and **dismissible** (Escape hides it without
 * moving the pointer or focus). The bubble stays a non-interactive
 * `role="tooltip"` — nothing in it takes focus.
 */
test.use({ locale: 'en-US', timezoneId: 'UTC' });

const LAYERS = [
  { name: 'Angular', query: '', scope: 'app-demo-card' },
  { name: 'React', query: '?framework=react', scope: 'app-react-host' },
] as const;

/** Moves the pointer in small steps from the trigger's center to the bubble's. */
async function travel(page: Page, from: Locator, to: Locator): Promise<void> {
  const a = await from.boundingBox();
  const b = await to.boundingBox();
  if (!a || !b) throw new Error('no box to travel between');
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
}

for (const layer of LAYERS) {
  test.describe(`tooltip WCAG 1.4.13 — ${layer.name}`, () => {
    test('stays open while the pointer moves onto it; Escape dismisses it in place', async ({
      page,
    }) => {
      await page.goto(`/components/overlay/tooltip-context-menu${layer.query}`);
      const trigger = page
        .locator(layer.scope)
        .first()
        .getByRole('button', { name: 'Save', exact: true });
      await trigger.scrollIntoViewIfNeeded();
      await trigger.hover();
      const tooltip = page.locator('.oge-tooltip', {
        hasText: 'Saves your changes',
      });
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toHaveAttribute('role', 'tooltip');
      // non-interactive: nothing inside it can take focus
      await expect(
        tooltip.locator('a[href], button, input, select, textarea, [tabindex]'),
      ).toHaveCount(0);

      await travel(page, trigger, tooltip);
      // well past the hide grace period (100 ms): still there, pointer on it
      await page.waitForTimeout(600);
      await expect(tooltip).toBeVisible();
      const hovered = await tooltip.evaluate((el) => el.matches(':hover'));
      expect(hovered).toBe(true);

      // dismissible without moving the pointer or focus: focus is not on the
      // trigger (hover never focuses it), so this is the page-level Escape
      await expect(trigger).not.toBeFocused();
      await page.keyboard.press('Escape');
      await expect(tooltip).toBeHidden();
    });

    test('leaving the bubble hides it after the grace period', async ({
      page,
    }) => {
      await page.goto(`/components/overlay/tooltip-context-menu${layer.query}`);
      const trigger = page
        .locator(layer.scope)
        .first()
        .getByRole('button', { name: 'Save', exact: true });
      await trigger.scrollIntoViewIfNeeded();
      await trigger.hover();
      const tooltip = page.locator('.oge-tooltip', {
        hasText: 'Saves your changes',
      });
      await expect(tooltip).toBeVisible();
      await travel(page, trigger, tooltip);
      await page.locator('h1').hover();
      await expect(tooltip).toBeHidden();
    });
  });
}
