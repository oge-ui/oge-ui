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

    test('smart paste proposes Now → New values and Apply fills the form, Undo restores it', async ({
      page,
    }) => {
      await page.goto(route);
      const demo = card(page, 'smart-paste');
      const paste = demo.getByRole('group', { name: 'Smart paste' });
      const name = demo.getByRole('textbox', { name: 'Full name' });
      await expect(name).toHaveValue('');

      await demo.getByRole('button', { name: 'Try the sample text' }).click();
      const proposal = paste.getByRole('group', { name: 'Proposed values' });
      await expect(proposal).toBeVisible();
      const rows = proposal.locator('tbody tr');
      await expect(rows).toHaveCount(7);
      await expect(rows.first()).toContainText('Full name');
      await expect(rows.first()).toContainText('Ada Lovelace');
      // nothing reaches the form before Apply
      await expect(name).toHaveValue('');

      await proposal.getByRole('button', { name: 'Apply' }).click();
      await expect(name).toHaveValue('Ada Lovelace');
      await expect(demo.getByRole('textbox', { name: 'Email' })).toHaveValue(
        'ada@engines.example',
      );
      await expect(paste.getByRole('status')).toHaveText('7 fields filled.');

      await paste.getByRole('button', { name: 'Undo' }).click();
      await expect(name).toHaveValue('');
      await expect(paste.getByRole('status')).toHaveText('Values restored.');
    });

    test('smart paste falls back to a text box when the clipboard is unreadable', async ({
      page,
    }) => {
      await page.goto(route);
      const paste = card(page, 'smart-paste').getByRole('group', {
        name: 'Smart paste',
      });
      // no clipboard permission is granted, so the read is refused
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: { readText: () => Promise.reject(new Error('denied')) },
        });
      });
      await paste.getByRole('button', { name: 'Smart paste' }).click();
      await expect(paste.getByRole('status')).toContainText(
        'clipboard could not be read',
      );
      const box = paste.getByRole('textbox', {
        name: 'Text to fill the form from',
      });
      await box.fill('Company: Kaya Mimarlık');
      await paste.getByRole('button', { name: 'Fill the form' }).click();
      await expect(
        paste.getByRole('group', { name: 'Proposed values' }),
      ).toContainText('Kaya Mimarlık');
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
