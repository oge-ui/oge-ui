import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * What e2e must prove for the avatar family and the badge is the accessible
 * contract in a real DOM, in both render layers: avatars are named
 * `role="img"`s with their presence, the group's surplus avatar is named,
 * the overlay badge reaches the wrapped control as its accessible
 * description (the glyph stays decoration), and the page is axe-clean.
 */
const FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const demo = (page: Page, heading: string) =>
  page.locator('app-demo-card', {
    has: page.getByRole('heading', { name: heading, exact: true }),
  });

for (const fw of FRAMEWORKS) {
  test.describe(`${fw.name}: avatar & badge`, () => {
    test('avatars are named images; the fallback chain reaches initials', async ({
      page,
    }) => {
      await page.goto(`/components/avatar${fw.query}`);
      const card = demo(page, 'Image, initials & icon');
      await card.scrollIntoViewIfNeeded();
      const ada = card.getByRole('img', { name: 'Ada Lovelace', exact: true });
      await expect(ada).toBeVisible();
      // the broken URL fails and the avatar falls back to initials
      await expect(ada.locator('.oge-avatar-initials')).toHaveText('AL');
      await expect(card.getByTestId('avatar-failed')).toContainText(
        'missing-avatar.png',
      );
      await expect(
        card.getByRole('img', { name: 'Guest', exact: true }),
      ).toBeVisible();
    });

    test('presence joins the name; decorative avatars are hidden', async ({
      page,
    }) => {
      await page.goto(`/components/avatar${fw.query}`);
      const card = demo(page, 'Presence status');
      await card.scrollIntoViewIfNeeded();
      await expect(
        card.getByRole('img', { name: 'Ada Lovelace (Online)', exact: true }),
      ).toBeVisible();
      await expect(
        card.getByRole('img', { name: 'Alan Turing (Busy)', exact: true }),
      ).toBeVisible();
      await expect(card.locator('.oge-avatar[aria-hidden="true"]')).toHaveCount(
        1,
      );
    });

    test('the group collapses its surplus into a named +N avatar', async ({
      page,
    }) => {
      await page.goto(`/components/avatar${fw.query}`);
      const card = demo(page, 'Avatar group');
      await card.scrollIntoViewIfNeeded();
      const team = card.getByRole('group', {
        name: 'Project team',
        exact: true,
      });
      await expect(
        team.getByRole('img', { name: '3 more', exact: true }),
      ).toHaveText('+3');
      const reviewers = card.getByRole('group', {
        name: 'Reviewers',
        exact: true,
      });
      await expect(
        reviewers.getByRole('img', { name: '21 more', exact: true }),
      ).toBeVisible();
    });

    test('the overlay badge describes the wrapped button', async ({ page }) => {
      await page.goto(`/components/avatar${fw.query}`);
      const card = demo(page, 'Badge on an element');
      await card.scrollIntoViewIfNeeded();
      const inbox = card.getByRole('button', { name: 'Inbox', exact: true });
      await expect(inbox).toHaveAccessibleDescription('5 new items');
      await inbox.click();
      await expect(inbox).toHaveAccessibleDescription('6 new items');
      await expect(
        card.getByRole('button', { name: 'Notifications', exact: true }),
      ).toHaveAccessibleDescription('More than 99 new items');
      const glyph = card.locator('.oge-badge-indicator').first();
      await expect(glyph).toHaveAttribute('aria-hidden', 'true');
      await expect(glyph).toHaveText('6');
    });

    test('standalone badges carry visually hidden text', async ({ page }) => {
      await page.goto(`/components/avatar${fw.query}`);
      const card = demo(page, 'Standalone badge & dot');
      await card.scrollIntoViewIfNeeded();
      await expect(card.locator('.oge-badge-sr').first()).toHaveText(
        '3 new items',
      );
      await expect(card.locator('.oge-badge-sr').nth(2)).toHaveText(
        'New updates',
      );
    });

    test('announce speaks a change through the polite region', async ({
      page,
    }) => {
      await page.goto(`/components/avatar${fw.query}`);
      const card = demo(page, 'Live announcements');
      await card.scrollIntoViewIfNeeded();
      const live = card.locator('[aria-live="polite"]');
      await expect(live).toHaveText('');
      await card.getByRole('button', { name: 'Add item', exact: true }).click();
      await expect(live).toHaveText('2 items in cart');
    });

    test('the page has no axe violations', async ({ page }) => {
      test.slow();
      await page.goto(`/components/avatar${fw.query}`);
      await expect(page.locator('.oge-avatar').first()).toBeVisible();
      const results = await new AxeBuilder({ page })
        .include('app-demo-card')
        // heading-order (h1 → demo-card h3) is the site-wide demo-card pattern
        .disableRules(['color-contrast', 'heading-order'])
        .analyze();
      expect(
        results.violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
        ),
      ).toEqual([]);
    });

    test('the API page renders its tables', async ({ page }) => {
      await page.goto(`/components/avatar/api${fw.query}`);
      await expect(page.locator('.api-table').first()).toBeVisible();
    });
  });
}
