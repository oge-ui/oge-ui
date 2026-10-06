import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Carousel — the APG carousel contract in a real DOM, in both render layers:
 * region + slide roles, the tab-list picker keyboard, the buttons, a mouse
 * swipe that lands on a whole slide, the rotation control that keyboard
 * focus stops, the button picker with several slides per view, inert
 * off-screen slides and a clean axe run.
 */
const FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const card = (page: Page, id: string): Locator =>
  page.locator(`app-demo-card:has(#${id})`);

/** Horizontal distance between a slide's start and its viewport's start. */
const slideOffset = (carousel: Locator, index: number) =>
  carousel.evaluate((root, i) => {
    const viewport = root.querySelector('.oge-carousel-viewport')!;
    const slide = root.querySelectorAll('.oge-carousel-slide')[i];
    return Math.round(
      slide.getBoundingClientRect().left -
        viewport.getBoundingClientRect().left,
    );
  }, index);

for (const fw of FRAMEWORKS) {
  test.describe(`carousel (${fw.name})`, () => {
    test('region, slides and the tab-list picker keyboard', async ({
      page,
    }) => {
      await page.goto(`/components/carousel${fw.query}`);
      const demo = card(page, 'basics');
      const carousel = demo.getByRole('region', {
        name: 'Featured destinations',
        exact: true,
      });
      await carousel.scrollIntoViewIfNeeded();
      await expect(carousel).toHaveAttribute(
        'aria-roledescription',
        'carousel',
      );
      const slides = carousel.locator('.oge-carousel-slide');
      await expect(slides).toHaveCount(5);
      await expect(slides.nth(0)).toHaveAttribute(
        'aria-label',
        'Turquoise Coast, 1 of 5',
      );
      await expect(slides.nth(1)).toHaveAttribute('inert', '');

      const tabs = carousel
        .getByRole('tablist', { name: 'Choose a slide', exact: true })
        .getByRole('tab');
      await expect(tabs).toHaveCount(5);
      await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
      await expect(tabs.nth(0)).toHaveAttribute('tabindex', '0');
      await expect(tabs.nth(1)).toHaveAttribute('tabindex', '-1');

      await tabs.nth(0).focus();
      await page.keyboard.press('ArrowRight');
      await expect(tabs.nth(1)).toBeFocused();
      await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
      await expect(slides.nth(1)).not.toHaveAttribute('inert', '');
      await expect(slides.nth(0)).toHaveAttribute('inert', '');
      await expect(demo.getByTestId('carousel-index')).toHaveText(
        'Showing slide 2',
      );
      // the track scrolled the second slide to the viewport's start edge
      await expect.poll(() => slideOffset(carousel, 1)).toBe(0);

      await page.keyboard.press('End');
      await expect(tabs.nth(4)).toBeFocused();
      await expect(
        carousel.getByRole('button', { name: 'Next slide', exact: true }),
      ).toHaveAttribute('aria-disabled', 'true');
      await page.keyboard.press('Home');
      await expect(tabs.nth(0)).toBeFocused();
    });

    test('previous / next buttons step and block at the ends', async ({
      page,
    }) => {
      await page.goto(`/components/carousel${fw.query}`);
      const demo = card(page, 'basics');
      const prev = demo.getByRole('button', {
        name: 'Previous slide',
        exact: true,
      });
      const next = demo.getByRole('button', {
        name: 'Next slide',
        exact: true,
      });
      await next.scrollIntoViewIfNeeded();
      await expect(prev).toHaveAttribute('aria-disabled', 'true');
      await next.click();
      await next.click();
      await expect(demo.getByTestId('carousel-index')).toHaveText(
        'Showing slide 3',
      );
      await prev.click();
      await expect(demo.getByTestId('carousel-index')).toHaveText(
        'Showing slide 2',
      );
      // focus stays on the control, which is never `disabled`
      await expect(prev).toBeFocused();
    });

    test('a mouse swipe lands on the next slide; loop wraps backwards', async ({
      page,
    }) => {
      await page.goto(`/components/carousel${fw.query}`);
      const demo = card(page, 'thumbnails-loop');
      const carousel = demo.getByRole('region', {
        name: 'Destinations with thumbnails',
        exact: true,
      });
      await carousel.scrollIntoViewIfNeeded();
      const tabs = carousel.getByRole('tab');
      await expect(tabs).toHaveCount(5);
      const box = (await carousel
        .locator('.oge-carousel-track')
        .boundingBox())!;
      const y = box.y + box.height / 2;
      await page.mouse.move(box.x + box.width * 0.7, y);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.5, y, { steps: 5 });
      await page.mouse.move(box.x + box.width * 0.3, y, { steps: 5 });
      await page.mouse.up();
      await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
      await expect.poll(() => slideOffset(carousel, 1)).toBe(0);

      await carousel
        .getByRole('button', { name: 'Previous slide', exact: true })
        .click();
      await carousel
        .getByRole('button', { name: 'Previous slide', exact: true })
        .click();
      await expect(tabs.nth(4)).toHaveAttribute('aria-selected', 'true');
    });

    test('keyboard focus entering stops the rotation (WCAG 2.2.2)', async ({
      page,
    }) => {
      await page.goto(`/components/carousel${fw.query}`);
      const demo = card(page, 'autoplay-rotation-control');
      const carousel = demo.getByRole('region', {
        name: 'Rotating highlights',
        exact: true,
      });
      await carousel.scrollIntoViewIfNeeded();
      const rotation = carousel.locator('.oge-carousel-rotation');
      await expect(rotation).toHaveAccessibleName(
        /Stop automatic slide show|Start automatic slide show/,
      );
      // the rotation control comes first in the Tab order
      const first = await carousel.evaluate(
        (root) =>
          root.querySelector('button') ===
          root.querySelector('.oge-carousel-rotation'),
      );
      expect(first).toBe(true);
      await rotation.focus();
      await expect(rotation).toHaveAccessibleName('Start automatic slide show');
      await expect(carousel.locator('.oge-carousel-track')).toHaveAttribute(
        'aria-live',
        'polite',
      );
      await page.keyboard.press('Enter');
      await expect(rotation).toHaveAccessibleName('Stop automatic slide show');
      await expect(demo.getByTestId('carousel-log')).toHaveText(
        'playing by user',
      );
    });

    test('several slides per view use a button picker', async ({ page }) => {
      await page.goto(`/components/carousel${fw.query}`);
      const demo = card(page, 'several-slides-per-view');
      const carousel = demo.getByRole('region', {
        name: 'Recommended products',
        exact: true,
      });
      await carousel.scrollIntoViewIfNeeded();
      await expect(carousel.getByRole('tab')).toHaveCount(0);
      const picker = carousel.getByRole('group', {
        name: 'Choose a slide',
        exact: true,
      });
      const buttons = picker.getByRole('button');
      await expect(buttons).toHaveCount(5);
      await expect(buttons.nth(0)).toHaveAttribute('aria-current', 'true');
      await buttons.nth(2).click();
      await expect(buttons.nth(2)).toHaveAttribute('aria-current', 'true');
      const slides = carousel.locator('.oge-carousel-slide');
      await expect(slides.nth(2)).not.toHaveAttribute('inert', '');
      await expect(slides.nth(4)).not.toHaveAttribute('inert', '');
      await expect(slides.nth(5)).toHaveAttribute('inert', '');
    });

    test('off-screen declarative slides keep their links out of the Tab order', async ({
      page,
    }) => {
      await page.goto(`/components/carousel${fw.query}`);
      const demo = card(page, 'declarative-slides');
      const carousel = demo.getByRole('region', {
        name: 'Release notes',
        exact: true,
      });
      await carousel.scrollIntoViewIfNeeded();
      const slides = carousel.locator('.oge-carousel-slide');
      await expect(slides.nth(0)).toHaveAttribute(
        'aria-label',
        'Version 1.3, 1 of 3',
      );
      await expect(
        carousel.getByRole('link', { name: 'Read the notes', exact: true }),
      ).toBeVisible();
      await carousel
        .getByRole('button', { name: 'Next slide', exact: true })
        .click();
      await expect(slides.nth(0)).toHaveAttribute('inert', '');
    });

    test('carousel page has no axe violations', async ({ page }) => {
      test.slow();
      await page.goto(`/components/carousel${fw.query}`);
      await expect(
        page.getByRole('region', {
          name: 'Featured destinations',
          exact: true,
        }),
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
