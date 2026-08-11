import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

/** Every family shown in the gallery, with the element its preview mounts. */
const FAMILIES = [
  { name: 'Data Grid', preview: 'oge-grid' },
  { name: 'Tree List', preview: 'oge-tree-list' },
  { name: 'Buttons', preview: 'oge-button' },
  { name: 'Inputs', preview: 'oge-text-box' },
  { name: 'Tabs', preview: 'oge-tab-panel' },
  { name: 'Accordion', preview: 'oge-accordion' },
  { name: 'Progress & Loading', preview: 'oge-progress-bar' },
  { name: 'Splitter', preview: 'oge-splitter' },
  { name: 'Toolbar', preview: 'oge-toolbar' },
  { name: 'Tree View', preview: 'oge-tree-view' },
  { name: 'Drawer', preview: 'oge-drawer' },
  { name: 'Menubar', preview: 'oge-menubar' },
  { name: 'Breadcrumb', preview: 'oge-breadcrumb' },
  { name: 'Stepper', preview: 'oge-stepper' },
  { name: 'BPMN Editor', preview: '[data-preview="bpmn"]' },
  { name: 'Scheduler', preview: '[data-preview="scheduler"]' },
  { name: 'Gantt', preview: '[data-preview="gantt"]' },
  { name: 'Kanban', preview: '[data-preview="kanban"]' },
  { name: 'Charts', preview: '[data-preview="charts"]' },
  { name: 'Overlay', preview: 'oge-button' },
] as const;

test.describe('components gallery', () => {
  test('shows a card with a live preview for every family', async ({
    page,
  }) => {
    await page.goto('/components');

    for (const family of FAMILIES) {
      const card = page.locator('section', { hasText: family.name }).first();
      await expect(
        card.getByRole('link', { name: new RegExp(`Explore ${family.name}`) }),
      ).toBeVisible();
      // the preview is a real component instance, not a screenshot
      await expect(card.locator(family.preview).first()).toBeVisible();
    }

    // the Pivot Grid card renders a static cross-tab table, not an oge element
    await expect(
      page.getByRole('link', { name: /Explore Pivot Grid/ }),
    ).toBeVisible();
  });

  test('each card links to its family overview', async ({ page }) => {
    await page.goto('/components');
    await page.getByRole('link', { name: /Explore Tree View/ }).click();
    await expect(page).toHaveURL(/\/components\/tree-view$/);
    await expect(page.locator('oge-tree-view').first()).toBeVisible();
  });

  test('has no axe violations', async ({ page }) => {
    test.slow();
    await page.goto('/components');
    await expect(page.locator('oge-grid').first()).toBeVisible();
    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
