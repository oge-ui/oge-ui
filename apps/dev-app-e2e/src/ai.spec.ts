import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * The AI grid assistant (G6a), in both render layers, against the docs' offline
 * demo model — so no network and no key. jsdom proves the machine; this suite
 * proves the assistant drives a real grid: proposal → Apply → the header's
 * `aria-sort`, apply mode + Undo, Escape, what the request carries, and axe.
 * The React view is the same route with `?framework=react`; both layers render
 * the same `.oge-grid-assistant-*` markup.
 */

const LAYERS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const card = (page: Page, id: string) =>
  page.locator(`app-demo-card:has(#${id})`);

for (const layer of LAYERS) {
  test.describe(`${layer.name}: AI grid assistant`, () => {
    const route = `/components/ai${layer.query}`;

    test(
      'a suggestion becomes a proposal, and Apply sorts the grid',
      { tag: '@smoke' },
      async ({ page }) => {
        await page.goto(route);
        const demo = card(page, 'getting-started');
        const assistant = demo.getByRole('group', { name: 'Ask the grid' });
        await expect(assistant).toBeVisible();
        const ordered = demo.locator('.oge-header-cell', {
          hasText: 'Ordered',
        });
        await expect(ordered).not.toHaveAttribute('aria-sort', 'descending');

        await assistant.getByRole('button', { name: 'Newest first' }).click();
        const proposal = assistant.getByRole('group', {
          name: 'Proposed change',
        });
        await expect(proposal).toBeVisible();
        await expect(proposal).toContainText('Sorted by Ordered');
        await expect(proposal.locator('.oge-grid-assistant-slice')).toHaveText([
          'Sort',
        ]);
        // nothing reaches the grid before Apply
        await expect(ordered).not.toHaveAttribute('aria-sort', 'descending');

        await proposal.getByRole('button', { name: 'Apply' }).click();
        await expect(ordered).toHaveAttribute('aria-sort', 'descending');
        await expect(assistant.getByRole('status')).toContainText('Applied:');
        await expect(
          assistant.getByRole('textbox', { name: 'Ask the grid' }),
        ).toBeFocused();
      },
    );

    test('apply mode changes the grid at once and Undo reverts it', async ({
      page,
    }) => {
      await page.goto(route);
      const demo = card(page, 'apply-at-once-and-undo');
      const assistant = demo.getByRole('group', { name: 'Ask the grid' });
      const amount = demo.locator('.oge-header-cell', { hasText: 'Amount' });
      const field = assistant.getByRole('textbox', { name: 'Ask the grid' });
      await field.fill('sort by amount, highest first');
      await field.press('Enter');
      await expect(amount).toHaveAttribute('aria-sort', 'descending');
      await assistant.getByRole('button', { name: 'Undo' }).click();
      await expect(amount).not.toHaveAttribute('aria-sort', 'descending');
      await expect(assistant.getByRole('status')).toHaveText('Change undone.');
    });

    test('Escape discards a proposal', async ({ page }) => {
      await page.goto(route);
      const assistant = card(page, 'getting-started').getByRole('group', {
        name: 'Ask the grid',
      });
      await assistant.getByRole('button', { name: 'Group by status' }).click();
      await expect(assistant.getByRole('group')).toBeVisible();
      await assistant.getByRole('textbox').press('Escape');
      await expect(assistant.getByRole('group')).toHaveCount(0);
      await expect(assistant.getByRole('status')).toHaveText(
        'Proposal discarded.',
      );
    });

    test('the request carries column descriptions, never rows or omitted columns', async ({
      page,
    }) => {
      await page.goto(route);
      const demo = card(page, 'what-the-model-sees');
      await demo.getByRole('button', { name: 'Open orders over 1000' }).click();
      const request = demo.getByTestId('ai-request');
      await expect(request).toContainText('Net order value in EUR');
      await expect(request).toContainText(
        'You may change: sort, filter, group, search.',
      );
      await expect(request).not.toContainText('Customer');
      // a row value from the grid never appears in the prompt
      await expect(request).not.toContainText('Acme Corp');
    });
  });
}

test('AI page has no axe violations with a proposal open', async ({ page }) => {
  await page.goto('/components/ai');
  const assistant = page
    .locator('app-demo-card:has(#getting-started)')
    .getByRole('group', { name: 'Ask the grid' });
  await assistant.getByRole('button', { name: 'Newest first' }).click();
  await expect(assistant.getByRole('group')).toBeVisible();
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
