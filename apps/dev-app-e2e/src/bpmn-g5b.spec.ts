import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * G5b on real DOM, in both render layers: live validation (badges, the
 * problems toggle and panel, row → selection), on-demand `validate()`, the
 * extension points (custom palette entry + hotkey, custom context-pad action,
 * renderer override), the Camunda / Zeebe fields round-tripping into the
 * exported XML, drag re-parenting into an expanded sub-process and its
 * keyboard twin ("Move to…"), and axe on the three new pages.
 */
const LAYERS = [
  { name: 'Angular', query: '', editor: 'oge-bpmn-editor' },
  {
    name: 'React',
    query: '?framework=react',
    editor: 'app-react-host .oge-bpmn-editor',
  },
] as const;

/** The h3 is matched exactly — `hasText` is a substring match. */
function section(page: Page, heading: string): Locator {
  return page
    .locator('app-demo-card')
    .filter({
      has: page.getByRole('heading', { level: 3, name: heading, exact: true }),
    })
    .first();
}

function shape(editor: Locator, id: string): Locator {
  return editor.locator(`g[id$="-el-${id}"]`);
}

for (const layer of LAYERS) {
  test.describe(`BPMN G5b — ${layer.name}`, () => {
    const editorIn = (page: Page, heading: string) =>
      section(page, heading).locator(layer.editor);

    test('live validation: badges, problems panel and row selection', async ({
      page,
    }) => {
      await page.goto(`/components/bpmn/validation${layer.query}`);
      const editor = editorIn(page, 'Live validation');
      await editor.scrollIntoViewIfNeeded();
      await expect(
        editor.locator('.oge-bpmn-lint-badge').first(),
      ).toBeVisible();
      // the problem text is part of the shape's accessible name
      await expect(shape(editor, 'Task_orphan')).toHaveAttribute(
        'aria-label',
        /problem\(s\)/,
      );
      await expect(
        section(page, 'Live validation').locator(
          '[data-testid="bpmn-lint-summary"]',
        ),
      ).toContainText('error(s)');
      const toggle = editor.locator('.oge-bpmn-header-problems');
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      const panel = editor.locator('.oge-bpmn-problems');
      await expect(panel).toBeVisible();
      const row = panel.locator('[data-element="Task_orphan"]').first();
      await row.focus();
      await page.keyboard.press('Enter');
      await expect(editor.locator('.oge-bpmn-canvas-wrap')).toHaveAttribute(
        'aria-activedescendant',
        /-el-Task_orphan$/,
      );
    });

    test('validate() lists the issues on demand', async ({ page }) => {
      await page.goto(`/components/bpmn/validation${layer.query}`);
      const card = section(page, 'validate() & headless checks');
      await card.scrollIntoViewIfNeeded();
      await expect(
        card.locator(layer.editor).locator('.oge-bpmn-shape').first(),
      ).toBeVisible();
      await card.locator('[data-testid="bpmn-validate"]').click();
      await expect(
        card.locator('[data-testid="bpmn-validate-list"] li').first(),
      ).toBeVisible();
    });

    test('custom palette entry, hotkey and context-pad action', async ({
      page,
    }) => {
      await page.goto(`/components/bpmn/extending${layer.query}`);
      const editor = editorIn(page, 'Palette & context pad');
      await editor.scrollIntoViewIfNeeded();
      const entry = editor.locator('.oge-bpmn-palette-custom');
      await expect(entry).toHaveAttribute('aria-label', 'Mail task');
      await expect(entry).toHaveAttribute('aria-keyshortcuts', 'M');
      const before = await editor.locator('.oge-bpmn-shape').count();
      // the hotkey arms the templated place tool on the focused canvas
      await editor.locator('.oge-bpmn-canvas-wrap').focus();
      await page.keyboard.press('m');
      await editor
        .locator('.oge-bpmn-canvas')
        .click({ position: { x: 120, y: 360 } });
      await expect(editor.locator('.oge-bpmn-shape')).toHaveCount(before + 1);
      // the new element is selected: its custom pad action recolors it
      await editor
        .locator('.oge-bpmn-pad-custom[data-entry="mark-reviewed"]')
        .click();
      await expect(
        editor
          .locator('.oge-bpmn-shape.oge-bpmn-selected .oge-bpmn-node')
          .first(),
      ).toHaveCSS('fill', 'rgb(220, 252, 231)');
    });

    test('a renderer override replaces the built-in glyph', async ({
      page,
    }) => {
      await page.goto(`/components/bpmn/extending${layer.query}`);
      const editor = editorIn(page, 'Renderers');
      await editor.scrollIntoViewIfNeeded();
      const service = shape(editor, 'Task_charge');
      await expect(
        service.locator('.oge-bpmn-custom-glyph rect'),
      ).toHaveAttribute('rx', '18');
      await expect(service.locator('rect.oge-bpmn-task')).toHaveCount(0);
    });

    test('Zeebe job type edits round-trip into the exported XML', async ({
      page,
    }) => {
      await page.goto(`/components/bpmn/camunda${layer.query}`);
      const card = section(page, 'Camunda / Zeebe properties');
      const editor = card.locator(layer.editor);
      await editor.scrollIntoViewIfNeeded();
      await shape(editor, 'Task_charge').locator('.oge-bpmn-node').click();
      const jobType = editor.locator('[data-entry="zeebe-job-type"] textarea');
      await expect(jobType).toHaveValue('payment');
      await jobType.fill('refund');
      await jobType.press('Tab');
      // add an input mapping row and fill its target
      const inputs = editor.locator('[data-entry="zeebe-inputs"]');
      await inputs.locator('.oge-bpmn-props-list-add').click();
      const cells = inputs.locator('.oge-bpmn-props-list-cell');
      await expect(cells).toHaveCount(4);
      await cells.nth(3).fill('orderId');
      await cells.nth(3).press('Enter');
      await card.locator('[data-testid="bpmn-camunda-export"]').click();
      const xml = card.locator('[data-testid="bpmn-camunda-xml"]');
      await expect(xml).toContainText('type="refund"');
      await expect(xml).toContainText('target="orderId"');
      await expect(xml).toContainText('xmlns:zeebe=');
    });

    test('drag re-parents into a sub-process; Move to is the keyboard twin', async ({
      page,
    }) => {
      await page.goto(`/components/bpmn/camunda${layer.query}`);
      const editor = editorIn(
        page,
        'Event payloads, documentation & re-parenting',
      );
      await editor.scrollIntoViewIfNeeded();
      const approve = shape(editor, 'Task_approve').locator('.oge-bpmn-node');
      const sub = shape(editor, 'Sub_fulfil').locator('.oge-bpmn-node');
      const from = await approve.boundingBox();
      const to = await sub.boundingBox();
      expect(from && to).toBeTruthy();
      if (!from || !to) return;
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
      await page.mouse.down();
      await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
        steps: 10,
      });
      await expect(shape(editor, 'Sub_fulfil')).toHaveClass(/oge-bpmn-drop-ok/);
      await page.mouse.up();
      const moveTo = editor.locator('[data-entry="move-to"] select');
      await expect(moveTo).toHaveValue('Sub_fulfil');
      // keyboard twin: move the charge task the same way. The panel is the
      // same <select> element for both tasks, so wait until it shows the
      // charge task (still in the process) before choosing — choosing while
      // it still renders the approve task (already in Sub_fulfil) is a no-op,
      // which is what made this step flaky on slow CI runners.
      await shape(editor, 'Task_charge').locator('.oge-bpmn-node').click();
      await expect(shape(editor, 'Task_charge')).toHaveClass(
        /oge-bpmn-selected/,
      );
      await expect(moveTo).toHaveValue('Process_payment');
      await moveTo.selectOption('Sub_fulfil');
      await expect(moveTo).toHaveValue('Sub_fulfil');
    });

    for (const path of ['validation', 'extending', 'camunda'] as const) {
      test(`${path} page has no axe violations (light and dark)`, async ({
        page,
      }) => {
        test.slow();
        await page.goto(`/components/bpmn/${path}${layer.query}`);
        await expect(page.locator(layer.editor).first()).toBeVisible();
        if (path === 'validation') {
          await page
            .locator(`${layer.editor} .oge-bpmn-header-problems`)
            .first()
            .click();
        }
        for (const theme of ['light', 'dark'] as const) {
          await page.evaluate((mode) => {
            document.documentElement.classList.toggle(
              'oge-theme-dark',
              mode === 'dark',
            );
          }, theme);
          const results = await new AxeBuilder({ page })
            .include(layer.editor)
            .disableRules(['color-contrast'])
            .analyze();
          expect(results.violations, `${theme} violations`).toEqual([]);
        }
      });
    }
  });
}
