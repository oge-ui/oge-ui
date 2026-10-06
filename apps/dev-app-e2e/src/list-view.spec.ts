import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * List view — the APG contracts in a real DOM, in both render layers: the
 * plain list's roving tab stop, the listbox's active descendant (skipping
 * disabled options, Space toggling), labelled group segments, a virtualized
 * 10 000-row listbox that follows End, the search field and infinite scroll,
 * action shortcuts, and a clean axe run over the page.
 */
const FRAMEWORKS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const card = (page: Page, id: string): Locator =>
  page.locator(`app-demo-card:has(#${id})`);

const activeText = (listbox: Locator) =>
  listbox.evaluate((el) => {
    const id = el.getAttribute('aria-activedescendant');
    return id ? (document.getElementById(id)?.textContent?.trim() ?? '') : '';
  });

for (const fw of FRAMEWORKS) {
  test.describe(`list view (${fw.name})`, () => {
    test('plain list: one roving tab stop, arrows move, Enter activates', async ({
      page,
    }) => {
      await page.goto(`/components/list-view${fw.query}`);
      const demo = card(page, 'basics-templates');
      const list = demo.getByRole('list', { name: 'Team', exact: true });
      await list.scrollIntoViewIfNeeded();
      const items = list.getByRole('listitem');
      await expect(items).toHaveCount(5);
      await expect(items.nth(0)).toHaveAttribute('tabindex', '0');
      await expect(items.nth(1)).toHaveAttribute('tabindex', '-1');
      await items.nth(0).focus();
      await page.keyboard.press('ArrowDown');
      await expect(items.nth(1)).toBeFocused();
      await page.keyboard.press('End');
      await expect(items.nth(4)).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(demo.getByTestId('list-view-opened')).toContainText(
        'Katherine Johnson',
      );
    });

    test('listbox: active descendant skips disabled, Space toggles', async ({
      page,
    }) => {
      await page.goto(`/components/list-view${fw.query}`);
      const demo = card(page, 'selection');
      const listbox = demo.getByRole('listbox', {
        name: 'Reviewers',
        exact: true,
      });
      await listbox.scrollIntoViewIfNeeded();
      await expect(listbox).toHaveAttribute('aria-multiselectable', 'true');
      await expect(listbox.getByRole('option')).toHaveCount(6);
      await expect(
        listbox.getByRole('option', { name: 'Alan Turing' }),
      ).toHaveAttribute('aria-disabled', 'true');
      await listbox.focus();
      // the selected option holds the active descendant on first paint
      await expect.poll(() => activeText(listbox)).toBe('Grace Hopper');
      await page.keyboard.press('ArrowDown');
      await expect.poll(() => activeText(listbox)).toBe('Margaret Hamilton');
      await page.keyboard.press('Space');
      await expect(
        listbox.getByRole('option', { name: 'Margaret Hamilton' }),
      ).toHaveAttribute('aria-selected', 'true');
      await expect(demo.getByTestId('list-view-picked')).toContainText(
        'Selected: 2, 4',
      );
    });

    test('groups are labelled segments with hidden sticky headers', async ({
      page,
    }) => {
      await page.goto(`/components/list-view${fw.query}`);
      const demo = card(page, 'grouping-sticky-headers');
      const listbox = demo.getByRole('listbox', {
        name: 'People by team',
        exact: true,
      });
      await listbox.scrollIntoViewIfNeeded();
      const groups = listbox.getByRole('group');
      await expect(groups).toHaveCount(3);
      await expect(groups.nth(0)).toHaveAttribute('aria-label', 'Research');
      await expect(
        groups.nth(0).locator('.oge-list-view-group-header'),
      ).toHaveAttribute('aria-hidden', 'true');
      await expect(
        groups.nth(0).locator('.oge-list-view-group-header'),
      ).toHaveCSS('position', 'sticky');
    });

    test('virtualized listbox renders a window and follows End', async ({
      page,
    }) => {
      await page.goto(`/components/list-view${fw.query}`);
      const demo = card(page, 'virtual-scrolling');
      const listbox = demo.getByRole('listbox', {
        name: 'Tickets',
        exact: true,
      });
      await listbox.scrollIntoViewIfNeeded();
      await expect(listbox.getByRole('option').first()).toBeVisible();
      expect(await listbox.getByRole('option').count()).toBeLessThan(40);
      await listbox.focus();
      await page.keyboard.press('End');
      await expect.poll(() => activeText(listbox)).toBe('Ticket #10000');
      await page.keyboard.press('Enter');
      await expect(demo.getByTestId('list-view-ticket')).toContainText(
        'Selected: 10000',
      );
    });

    test('search filters accent-insensitively; scrolling loads the next page', async ({
      page,
    }) => {
      await page.goto(`/components/list-view${fw.query}`);
      const demo = card(page, 'search-infinite-scroll');
      const list = demo.getByRole('list', { name: 'Cities', exact: true });
      await list.scrollIntoViewIfNeeded();
      await expect(demo.getByTestId('list-view-cities')).toContainText(
        'Loaded: 16',
      );
      await list.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await expect(demo.getByTestId('list-view-cities')).toContainText(
        'Loaded: 32',
      );
      const search = demo.getByRole('searchbox', {
        name: 'Search',
        exact: true,
      });
      await search.fill('istanbul');
      await expect(list.getByRole('listitem').first()).toHaveText('İstanbul');
      // infinite scroll may keep filling the short filtered list — every
      // match still has to be an İstanbul row
      await expect
        .poll(async () =>
          (await list.getByRole('listitem').allTextContents()).every((t) =>
            t.trim().startsWith('İstanbul'),
          ),
        )
        .toBe(true);
      await demo
        .getByRole('button', { name: 'Clear search', exact: true })
        .click();
      await expect(search).toHaveValue('');
    });

    test('action shortcuts run the actions', async ({ page }) => {
      await page.goto(`/components/list-view${fw.query}`);
      const demo = card(page, 'swipe-actions');
      const listbox = demo.getByRole('listbox', { name: 'Inbox', exact: true });
      await listbox.scrollIntoViewIfNeeded();
      const first = listbox.getByRole('option').first();
      await expect(first).toHaveAttribute(
        'aria-keyshortcuts',
        'Shift+A Delete',
      );
      await listbox.focus();
      await page.keyboard.press('Delete');
      await expect(demo.getByTestId('list-view-action')).toContainText(
        'Delete: Nightly build passed',
      );
      await expect(listbox.getByRole('option')).toHaveCount(4);
      await page.keyboard.press('Shift+A');
      await expect(demo.getByTestId('list-view-action')).toContainText(
        'Archive: Design review moved to Friday',
      );
      await expect(listbox.getByRole('option')).toHaveCount(3);
    });

    test('list view page has no axe violations', async ({ page }) => {
      test.slow();
      await page.goto(`/components/list-view${fw.query}`);
      await expect(
        page.getByRole('listbox', { name: 'Reviewers', exact: true }),
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
