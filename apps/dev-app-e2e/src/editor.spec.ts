import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * The rich-text editor (W8e), in both render layers. jsdom has no layout, no
 * real `beforeinput` from typing and no clipboard — this suite proves the
 * model-driven editing on the real pages: typing, shortcuts, markdown,
 * toolbar roving focus, the link dialog, paste sanitizing, Trusted Types
 * and axe. The React view is the same route with `?framework=react`; both
 * layers render the same `.oge-editor-*` markup.
 */

const LAYERS = [
  { name: 'Angular', query: '' },
  { name: 'React', query: '?framework=react' },
] as const;

const card = (page: Page, id: string) =>
  page.locator(`app-demo-card:has(#${id})`);
const surface = (scope: Locator) =>
  scope.locator('.oge-editor-content').first();
const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
/**
 * The paste specs dispatch a synthetic `ClipboardEvent` carrying a
 * script-built `DataTransfer`; Firefox hands an untrusted paste event an
 * empty `clipboardData`, and Playwright cannot put HTML on its clipboard.
 */
const SYNTHETIC_PASTE =
  'Firefox empties clipboardData on a synthetic ClipboardEvent';

/** Puts the caret at the end of the editor's text. */
async function caretToEnd(editor: Locator): Promise<void> {
  await editor.click();
  await editor.press(`${mod}+End`);
}

for (const layer of LAYERS) {
  test.describe(`${layer.name}: rich-text editor`, () => {
    const route = `/components/editor${layer.query}`;

    test(
      'typing goes through the model into the sanitized value',
      { tag: '@smoke' },
      async ({ page }) => {
        await page.goto(route);
        const demo = card(page, 'getting-started');
        const editor = surface(demo);
        await expect(editor).toHaveAttribute('role', 'textbox');
        await expect(editor).toHaveAttribute('aria-multiline', 'true');
        await caretToEnd(editor);
        await page.keyboard.type(' again');
        const value = demo.getByTestId('editor-value');
        await expect(value).toHaveText(
          '<p>Hello <strong>world again</strong></p>',
        );
        await page.keyboard.press('Enter');
        await page.keyboard.type('Second line');
        await expect(value).toHaveText(
          '<p>Hello <strong>world again</strong></p><p><strong>Second line</strong></p>',
        );
      },
    );

    test('shortcuts format the selection; undo and Shift+Enter', async ({
      page,
    }) => {
      await page.goto(route);
      const demo = card(page, 'getting-started');
      const editor = surface(demo);
      const value = demo.getByTestId('editor-value');
      await editor.click();
      await page.keyboard.press(`${mod}+A`);
      await page.keyboard.press(`${mod}+I`);
      await expect(value).toHaveText(
        '<p><em>Hello </em><strong><em>world</em></strong></p>',
      );
      await expect(
        demo.locator('[data-oge-editor-tool="italic"]'),
      ).toHaveAttribute('aria-pressed', 'true');
      await page.keyboard.press(`${mod}+Z`);
      await expect(value).toHaveText('<p>Hello <strong>world</strong></p>');
      await caretToEnd(editor);
      await page.keyboard.press('Shift+Enter');
      await page.keyboard.type('x');
      await expect(value).toHaveText(
        '<p>Hello <strong>world<br>x</strong></p>',
      );
    });

    test('markdown shortcuts and list nesting', async ({ page }) => {
      await page.goto(route);
      const editor = surface(card(page, 'keyboard-and-markdown'));
      await editor.click();
      await page.keyboard.type('# Title');
      await expect(editor.locator('h1')).toHaveText('Title');
      await page.keyboard.press('Enter');
      await page.keyboard.type('- one');
      await page.keyboard.press('Enter');
      await page.keyboard.type('two');
      await page.keyboard.press('Tab');
      await expect(editor.locator('ul > li > ul > li')).toHaveText('two');
      // Tab outside a list leaves the editor — no keyboard trap
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      await expect(editor.locator('p').last()).toBeVisible();
      await page.keyboard.press('Tab');
      await expect(editor).not.toBeFocused();
    });

    test('the toolbar is one Tab stop with arrow-key roving', async ({
      page,
    }) => {
      await page.goto(route);
      const demo = card(page, 'getting-started');
      const toolbar = demo.getByRole('toolbar', { name: 'Text formatting' });
      await expect(toolbar).toBeVisible();
      const first = toolbar.locator('[data-oge-editor-tool="undo"]');
      // undo is disabled until there is history, so the roving stop is the
      // first enabled tool
      const redo = toolbar.locator('[data-oge-editor-tool="redo"]');
      await expect(first).toBeDisabled();
      await toolbar.locator('[data-oge-editor-tool="bold"]').focus();
      await page.keyboard.press('ArrowRight');
      await expect(
        toolbar.locator('[data-oge-editor-tool="italic"]'),
      ).toBeFocused();
      await page.keyboard.press('ArrowLeft');
      await expect(
        toolbar.locator('[data-oge-editor-tool="bold"]'),
      ).toBeFocused();
      const tabStops = await toolbar
        .locator('button[tabindex="0"]')
        .evaluateAll(
          (buttons) =>
            buttons.filter((b) => !(b as HTMLButtonElement).disabled).length,
        );
      expect(tabStops).toBe(1);
      await expect(redo).toHaveAttribute(
        'aria-keyshortcuts',
        /(Control|Meta)\+Y/,
      );
      await expect(
        toolbar.locator('[data-oge-editor-tool="bold"]'),
      ).toHaveAttribute('title', /Bold \((Ctrl\+B|⌘B)\)/);
    });

    test('Ctrl+K opens the link dialog; a bare domain becomes https', async ({
      page,
    }) => {
      await page.goto(route);
      const demo = card(page, 'getting-started');
      const editor = surface(demo);
      await editor.click();
      await page.keyboard.press(`${mod}+A`);
      await page.keyboard.press(`${mod}+K`);
      const dialog = page.getByRole('dialog', { name: 'Insert link' });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('textbox').fill('javascript:alert(1)');
      await page.keyboard.press('Enter');
      await expect(dialog).toBeVisible(); // refused, the dialog stays
      await dialog.getByRole('textbox').fill('ogeui.com');
      await page.keyboard.press('Enter');
      await expect(dialog).toBeHidden();
      await expect(editor.locator('a')).toHaveAttribute(
        'href',
        'https://ogeui.com',
      );
      await expect(demo.getByTestId('editor-value')).toContainText(
        'href="https://ogeui.com"',
      );
    });

    test('paste: hostile HTML is sanitized, Word lists become lists', async ({
      page,
      browserName,
    }) => {
      test.skip(browserName === 'firefox', SYNTHETIC_PASTE);
      await page.goto(route);
      const demo = card(page, 'paste-and-sanitizing');
      const editor = surface(demo);
      await editor.click();
      const paste = (html: string) =>
        editor.evaluate((el, markup) => {
          const data = new DataTransfer();
          data.setData('text/html', markup);
          data.setData('text/plain', 'fallback');
          el.dispatchEvent(
            new ClipboardEvent('paste', {
              clipboardData: data,
              bubbles: true,
              cancelable: true,
            }),
          );
        }, html);
      await paste(
        '<p onclick="alert(1)">Safe <b>bold</b><img src=x onerror="window.__pwned=1"><script>window.__pwned=1</script></p>' +
          '<a href="javascript:window.__pwned=1">bad link</a>',
      );
      await expect(editor.locator('strong')).toHaveText('bold');
      expect(await editor.locator('[onclick], [onerror], script').count()).toBe(
        0,
      );
      expect(await editor.locator('a').count()).toBe(0);
      expect(
        await page.evaluate(() => (window as { __pwned?: number }).__pwned),
      ).toBeUndefined();
      // a single pasted block merges into a non-empty line; into an empty
      // one (here: the whole selection replaced) it keeps its own format
      await editor.press(`${mod}+A`);
      await paste(
        "<p class=MsoListParagraph style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>1.<span>&nbsp;</span></span>Word item<o:p></o:p></p>",
      );
      await expect(editor.locator('ol > li')).toHaveText('Word item');
    });

    test('the page is axe clean', async ({ page }) => {
      await page.goto(route);
      await expect(surface(card(page, 'getting-started'))).toBeVisible();
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

test('the API page renders both layers', async ({ page }) => {
  await page.goto('/components/editor/api');
  await expect(
    page.getByRole('heading', { name: 'OgeEditor', exact: true }),
  ).toBeVisible();
  await page.goto('/components/editor/api?framework=react');
  await expect(
    page.getByRole('heading', { name: '<OgeEditor>', exact: true }),
  ).toBeVisible();
});

test('under require-trusted-types-for the editor parses through oge-ui#editor', async ({
  page,
  browserName,
}) => {
  test.skip(browserName === 'firefox', SYNTHETIC_PASTE);
  // A strict Trusted Types policy on the editor page: only the named
  // policies may create TrustedHTML, so an HTML sink fed a plain string is
  // a violation. The docs app's own chunk loader assigns `script.src`, which
  // a `default` policy for script URLs covers — it deliberately has no
  // `createHTML`, so it cannot launder the editor's parser input.
  await page.route('**/components/editor', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        'content-security-policy':
          "require-trusted-types-for 'script'; trusted-types default angular angular#bundler angular#unsafe-bypass oge-ui#editor oge-docs#json-ld 'allow-duplicates'",
      },
    });
  });
  await page.addInitScript(() => {
    const factory = (
      window as unknown as {
        trustedTypes?: { createPolicy(name: string, rules: object): unknown };
      }
    ).trustedTypes;
    factory?.createPolicy('default', {
      createScriptURL: (url: string) => url,
      createScript: (code: string) => code,
    });
  });
  const violations: string[] = [];
  await page.exposeFunction('reportViolation', (text: string) =>
    violations.push(text),
  );
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      (
        window as unknown as { reportViolation(t: string): void }
      ).reportViolation(`${event.violatedDirective} ${event.sample}`);
    });
  });
  await page.goto('/components/editor');
  const editor = surface(card(page, 'paste-and-sanitizing'));
  await editor.click();
  await editor.evaluate((el) => {
    const data = new DataTransfer();
    data.setData('text/html', '<h2>Pasted <em>under</em> Trusted Types</h2>');
    el.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await expect(editor.locator('h2')).toHaveText('Pasted under Trusted Types');
  expect(
    violations.filter((v) => /trusted-types|require-trusted-types/.test(v)),
  ).toEqual([]);
});
