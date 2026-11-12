import AxeBuilder from './axe';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Tour — in both render layers: the spotlight follows each target, the card
 * is a labelled modal dialog beside it, keys and buttons move between steps,
 * Escape skips, focus returns, a controlled tour resumes, reduced motion
 * turns the glide off, and axe is clean with the card open.
 */
const FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const card = (page: Page, id: string): Locator =>
  page.locator(`app-demo-card:has(#${id})`);
const dialog = (page: Page): Locator => page.locator('.oge-tour-card');

/** Whether the spotlight surrounds the element (within the padding). */
async function spotlightAround(page: Page, target: Locator): Promise<boolean> {
  const spot = await page.locator('.oge-tour-spotlight').boundingBox();
  const box = await target.boundingBox();
  if (!spot || !box) return false;
  return (
    spot.x <= box.x &&
    spot.y <= box.y &&
    spot.x + spot.width >= box.x + box.width &&
    spot.y + spot.height >= box.y + box.height
  );
}

for (const fw of FRAMEWORKS) {
  test.describe(`tour (${fw.name})`, () => {
    test('walks the targets with buttons and keys, then restores focus', async ({
      page,
    }) => {
      await page.goto(`/components/overlay/tour${fw.query}`);
      const demo = card(page, 'guided-tour');
      const start = demo.getByTestId('start-tour');
      await start.scrollIntoViewIfNeeded();
      await start.focus();
      await page.keyboard.press('Enter');
      const tour = page.getByRole('dialog', { name: 'Search everything' });
      await expect(tour).toBeVisible();
      await expect(tour).toHaveAttribute('aria-modal', 'true');
      await expect(tour).toHaveAttribute('aria-roledescription', 'Tour');
      await expect(tour).toContainText('Step 1 of 4');
      await expect(tour.getByRole('button', { name: 'Next' })).toBeFocused();
      await expect
        .poll(() => spotlightAround(page, demo.locator('#tour-demo-search')))
        .toBe(true);
      // the card sits beside the search box (below, or above when it flips) and never covers it
      await expect
        .poll(async () => {
          const target = (await demo
            .locator('#tour-demo-search')
            .boundingBox())!;
          const box = (await tour.boundingBox())!;
          return (
            box.y >= target.y + target.height || box.y + box.height <= target.y
          );
        })
        .toBe(true);

      await page.keyboard.press('Enter');
      await expect(
        page.getByRole('dialog', { name: 'Narrow it down' }),
      ).toBeVisible();
      await expect
        .poll(() => spotlightAround(page, demo.locator('#tour-demo-filters')))
        .toBe(true);
      await page.keyboard.press('ArrowRight');
      await expect(dialog(page)).toContainText('Step 3 of 4');
      await page.keyboard.press('ArrowLeft');
      await expect(dialog(page)).toContainText('Step 2 of 4');
      await dialog(page).getByRole('button', { name: 'Back' }).click();
      await expect(dialog(page)).toContainText('Step 1 of 4');
      for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
      // the last step: centered, no spotlight, Done instead of Next
      await expect(
        page.getByRole('dialog', { name: 'You are all set' }),
      ).toBeVisible();
      await expect(page.locator('.oge-tour-spotlight')).toHaveCount(0);
      await expect(
        dialog(page).getByRole('button', { name: 'Skip tour' }),
      ).toHaveCount(0);
      await page.keyboard.press('ArrowRight'); // never finishes
      await expect(dialog(page)).toBeVisible();
      await dialog(page).getByRole('button', { name: 'Done' }).click();
      await expect(dialog(page)).toHaveCount(0);
      await expect(demo.getByTestId('tour-last')).toHaveText(
        'Closed by done on step 4',
      );
      await expect(start).toBeFocused();
    });

    test('skips with Escape or the Skip button', async ({ page }) => {
      await page.goto(`/components/overlay/tour${fw.query}`);
      const demo = card(page, 'guided-tour');
      await demo.getByTestId('start-tour').click();
      await expect(dialog(page)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog(page)).toHaveCount(0);
      await expect(demo.getByTestId('tour-last')).toHaveText(
        'Closed by escape on step 1',
      );
      await demo.getByTestId('start-tour').click();
      // a press on the dimmed page does not close this tour
      await page.mouse.click(4, 400);
      await expect(dialog(page)).toBeVisible();
      await dialog(page).getByRole('button', { name: 'Skip tour' }).click();
      await expect(demo.getByTestId('tour-last')).toHaveText(
        'Closed by skip on step 1',
      );
    });

    test('resumes a controlled tour and closes on the backdrop', async ({
      page,
    }) => {
      await page.goto(`/components/overlay/tour${fw.query}`);
      const demo = card(page, 'resuming-centered-steps');
      await demo.getByTestId('resume-tour').click();
      await expect(
        page.getByRole('dialog', { name: 'Welcome to OGE' }),
      ).toBeVisible();
      await expect(page.locator('.oge-tour-no-target')).toHaveCount(1);
      await page.keyboard.press('ArrowRight');
      await expect(demo.getByTestId('tour-step')).toHaveText('Step 2 of 3');
      await page.mouse.click(4, 400);
      await expect(dialog(page)).toHaveCount(0);
      await demo.getByTestId('resume-tour').click();
      await expect(
        page.getByRole('dialog', { name: 'Faster grids' }),
      ).toBeVisible();
    });

    test('jumps instead of gliding under reduced motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`/components/overlay/tour${fw.query}`);
      await card(page, 'guided-tour').getByTestId('start-tour').click();
      await expect(page.locator('.oge-tour-ready')).toHaveCount(1);
      const transition = await page
        .locator('.oge-tour-spotlight')
        .evaluate((el) => getComputedStyle(el).transitionProperty);
      expect(['none', 'all']).toContain(transition);
    });

    test('tour page has no axe violations with the card open', async ({
      page,
    }) => {
      test.slow();
      await page.goto(`/components/overlay/tour${fw.query}`);
      await card(page, 'guided-tour').getByTestId('start-tour').click();
      await expect(page.locator('.oge-tour-ready')).toHaveCount(1);
      const results = await new AxeBuilder({ page })
        .include('.oge-tour-layer')
        .disableRules(['color-contrast'])
        .analyze();
      expect(
        results.violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
        ),
      ).toEqual([]);
      await page.keyboard.press('Escape');
      const pageResults = await new AxeBuilder({ page })
        .include('app-demo-card')
        .disableRules(['color-contrast', 'heading-order'])
        .analyze();
      expect(pageResults.violations.map((v) => v.id)).toEqual([]);
    });
  });
}
