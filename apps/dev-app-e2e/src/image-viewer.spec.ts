import AxeBuilder from './axe';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Image viewer — in both render layers: toolbar paging and zoom, thumbnails,
 * the keyboard map, a pointer drag that pans while zoomed, loop and the zoom
 * limit, the public resetView() and a clean axe run.
 */
const FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const card = (page: Page, id: string): Locator =>
  page.locator(`app-demo-card:has(#${id})`);

const viewerIn = (demo: Locator): Locator => demo.locator('.oge-image-viewer');

for (const fw of FRAMEWORKS) {
  test.describe(`image viewer (${fw.name})`, () => {
    test('pages, zooms and rotates from the toolbar and the keyboard', async ({
      page,
    }) => {
      await page.goto(`/components/image-viewer${fw.query}`);
      const demo = card(page, 'gallery');
      const viewer = viewerIn(demo);
      const status = demo.getByTestId('image-viewer-status');
      await viewer.scrollIntoViewIfNeeded();
      await expect(viewer).toHaveAttribute('role', 'group');
      await expect(viewer).toHaveAttribute('aria-label', 'Image viewer');
      const image = viewer.locator('.oge-image-viewer-image');
      await expect(image).toHaveAttribute('alt', /palm tree/);
      await expect(viewer.locator('.oge-image-viewer-caption')).toHaveText(
        'Turquoise Coast',
      );
      await expect(viewer.getByRole('status')).toHaveText(
        /palm tree.*image 1 of 5/,
      );

      await viewer.getByRole('button', { name: 'Next image' }).click();
      await expect(status).toHaveText('Image 2 at 100%');
      const thumbs = viewer.locator('.oge-image-viewer-thumbnail');
      await expect(thumbs).toHaveCount(5);
      await thumbs.nth(3).click();
      await expect(status).toHaveText('Image 4 at 100%');
      await expect(thumbs.nth(3)).toHaveAttribute('aria-current', 'true');

      await viewer.getByRole('button', { name: 'Zoom in' }).click();
      await expect(status).toHaveText('Image 4 at 150%');
      await expect(viewer.locator('.oge-image-viewer-zoom')).toHaveText('150%');
      await viewer.getByRole('button', { name: 'Rotate right' }).click();
      await expect(image).toHaveAttribute('style', /rotate\(90deg\)/);
      await viewer.getByRole('button', { name: 'Fit to view' }).click();
      await expect(status).toHaveText('Image 4 at 100%');

      await viewer.focus();
      await page.keyboard.press('Home');
      await expect(status).toHaveText('Image 1 at 100%');
      await page.keyboard.press('ArrowRight');
      await expect(status).toHaveText('Image 2 at 100%');
      await page.keyboard.press('+');
      await page.keyboard.press('+');
      await expect(status).toHaveText('Image 2 at 200%');
      await page.keyboard.press('0');
      await expect(status).toHaveText('Image 2 at 100%');
      await page.keyboard.press('r');
      await expect(image).toHaveAttribute('style', /rotate\(90deg\)/);
    });

    test('drags to pan while zoomed and a double click toggles fit', async ({
      page,
    }) => {
      await page.goto(`/components/image-viewer${fw.query}`);
      const demo = card(page, 'gallery');
      const viewer = viewerIn(demo);
      const status = demo.getByTestId('image-viewer-status');
      const stage = viewer.locator('.oge-image-viewer-stage');
      await stage.scrollIntoViewIfNeeded();
      const box = (await stage.boundingBox())!;
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await page.mouse.dblclick(cx, cy);
      await expect(status).toHaveText('Image 1 at 200%');
      await expect(stage).toHaveClass(/oge-image-viewer-zoomed/);
      const image = viewer.locator('.oge-image-viewer-image');
      // a double click zooms around the pointer, so read the pan back rather
      // than assume zero (the stage centre can fall on a half pixel)
      const pan = async () => {
        const style = (await image.getAttribute('style')) ?? '';
        const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(style);
        return m ? [Number(m[1]), Number(m[2])] : [NaN, NaN];
      };
      const [x0, y0] = await pan();
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx + 40, cy + 20, { steps: 4 });
      await page.mouse.up();
      await expect
        .poll(async () => {
          const [x1, y1] = await pan();
          return [Math.round(x1 - x0), Math.round(y1 - y0)];
        })
        .toEqual([40, 20]);
      await page.mouse.dblclick(cx, cy);
      await expect(status).toHaveText('Image 1 at 100%');
    });

    test('loops, caps the zoom and resets through the handle', async ({
      page,
    }) => {
      await page.goto(`/components/image-viewer${fw.query}`);
      const demo = card(page, 'loop-zoom-limit-handle');
      const viewer = viewerIn(demo);
      await viewer.scrollIntoViewIfNeeded();
      await expect(viewer.locator('.oge-image-viewer-thumbnails')).toHaveCount(
        0,
      );
      await viewer.getByRole('button', { name: 'Previous image' }).click();
      await expect(
        viewer.locator('.oge-image-viewer-readout').first(),
      ).toHaveText('5 of 5');
      const zoomIn = viewer.getByRole('button', { name: 'Zoom in' });
      for (let i = 0; i < 4; i++) await zoomIn.click();
      await expect(viewer.locator('.oge-image-viewer-zoom')).toHaveText('400%');
      await expect(zoomIn).toBeDisabled();
      await expect(
        viewer.getByRole('button', { name: 'Show whole image' }),
      ).toBeEnabled();
      await demo.getByRole('button', { name: 'resetView()' }).click();
      await expect(viewer.locator('.oge-image-viewer-zoom')).toHaveText('100%');
    });

    test('image viewer page has no axe violations', async ({ page }) => {
      test.slow();
      await page.goto(`/components/image-viewer${fw.query}`);
      await expect(viewerIn(card(page, 'gallery'))).toBeVisible();
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
