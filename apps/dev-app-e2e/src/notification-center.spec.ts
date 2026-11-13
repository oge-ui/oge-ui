import AxeBuilder from './axe';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Notification center — in both render layers: the bell's unread count, the
 * day sections, read / unread and dismiss, the unread filter, infinite scroll
 * (by scrolling and by the feed keys), the polite announcement of a new
 * notification and a clean axe run with the panel open.
 */
const FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const card = (page: Page): Locator =>
  page.locator('app-demo-card:has(#notification-center)');
const panel = (page: Page): Locator =>
  page.getByRole('dialog', { name: 'Notifications' });

for (const fw of FRAMEWORKS) {
  test.describe(`notification center (${fw.name})`, () => {
    test('counts unread, sections by day, marks and dismisses, filters to unread', async ({
      page,
    }) => {
      await page.goto(`/components/overlay/notification-center${fw.query}`);
      const bell = card(page).getByRole('button', { name: /^Notifications/ });
      await bell.scrollIntoViewIfNeeded();
      await expect(bell).toHaveAccessibleName('Notifications, 3 unread');
      await bell.click();
      const feed = panel(page).getByRole('feed');
      await expect(feed).toBeVisible();
      await expect(panel(page).locator('.oge-notification-section')).toHaveText(
        ['Today', 'Yesterday'],
      );
      const first = feed.getByRole('article').first();
      await expect(first).toContainText('Build passed');
      await expect(first.locator('time')).toHaveText('2 minutes ago');
      await first.getByRole('button', { name: 'Mark as read' }).click();
      await expect(bell).toHaveAccessibleName('Notifications, 2 unread');
      await expect(card(page).getByTestId('last-action')).toHaveText(
        'Build passed: read',
      );
      await panel(page)
        .getByRole('button', { name: 'Unread', exact: true })
        .click();
      await expect(feed.getByRole('article')).toHaveCount(2);
      await feed
        .getByRole('button', { name: /^Dismiss: Storage at 90%/ })
        .click();
      await expect(feed.getByRole('article')).toHaveCount(1);
      await panel(page)
        .getByRole('button', { name: 'Mark all as read' })
        .click();
      await expect(panel(page).locator('.oge-notification-empty')).toHaveText(
        'You are all caught up',
      );
      await expect(bell).toHaveAccessibleName('Notifications');
      await page.keyboard.press('Escape');
      await expect(panel(page)).toHaveCount(0);
      await expect(bell).toBeFocused();
    });

    test('loads older notifications by scrolling and with the feed keys', async ({
      page,
    }) => {
      await page.goto(`/components/overlay/notification-center${fw.query}`);
      await card(page)
        .getByRole('button', { name: /^Notifications/ })
        .click();
      const feed = panel(page).getByRole('feed');
      await expect(feed.getByRole('article')).toHaveCount(5);
      await expect(feed.getByRole('article').first()).toHaveAttribute(
        'aria-setsize',
        '-1',
      );
      await panel(page)
        .locator('.oge-notification-scroll')
        .evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
      await expect(feed.getByRole('article')).toHaveCount(10);
      await expect(
        panel(page).locator('.oge-notification-section').last(),
      ).toHaveText('Earlier');
      // Page Down onto the last article asks for the next page (focusing may
      // itself scroll near the end and load one first, as in WebKit)
      const articles = feed.getByRole('article');
      await articles.nth(8).focus();
      await expect(feed).toHaveAttribute('aria-busy', 'false');
      await page.waitForTimeout(500);
      await expect(feed).toHaveAttribute('aria-busy', 'false');
      const before = await articles.count();
      await articles.nth(before - 2).focus();
      await page.keyboard.press('PageDown');
      await expect(articles.nth(before - 1)).toBeFocused();
      await expect.poll(() => articles.count()).toBeGreaterThan(before);
      await page.keyboard.press('PageUp');
      await expect(articles.nth(before - 2)).toBeFocused();
    });

    test('announces a new notification and counts it on the bell', async ({
      page,
    }) => {
      await page.goto(`/components/overlay/notification-center${fw.query}`);
      const demo = card(page);
      await demo.getByTestId('simulate').click();
      await expect(
        demo.locator('.oge-notification-center > [role="status"]'),
      ).toHaveText('1 new notification');
      await expect(
        demo.getByRole('button', { name: /^Notifications/ }),
      ).toHaveAccessibleName('Notifications, 4 unread');
    });

    test('notification center has no axe violations with the panel open', async ({
      page,
    }) => {
      test.slow();
      await page.goto(`/components/overlay/notification-center${fw.query}`);
      await card(page)
        .getByRole('button', { name: /^Notifications/ })
        .click();
      await expect(panel(page).getByRole('feed')).toBeVisible();
      const results = await new AxeBuilder({ page })
        .include('.oge-notification-panel')
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
