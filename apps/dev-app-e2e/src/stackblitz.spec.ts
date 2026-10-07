import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';

/** The release version — `packages/ui/package.json`, the single source. */
const RELEASE = ((): string => {
  for (let dir = process.cwd(); ; dir = path.dirname(dir)) {
    const file = path.join(dir, 'packages', 'ui', 'package.json');
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')).version;
    if (path.dirname(dir) === dir) throw new Error('packages/ui not found');
  }
})();

/**
 * "Open in StackBlitz" (W6d): the code block of every demo posts a runnable
 * project to https://stackblitz.com/run in a new tab. StackBlitz itself is
 * never contacted — the POST is intercepted, recorded and answered with a
 * stub page.
 */

interface StackblitzPost {
  readonly url: string;
  readonly method: string;
  readonly form: URLSearchParams;
}

/** Intercepts every request to stackblitz.com for the whole context. */
async function interceptStackblitz(page: Page): Promise<StackblitzPost[]> {
  const posts: StackblitzPost[] = [];
  await page.context().route('https://stackblitz.com/**', async (route) => {
    const request = route.request();
    posts.push({
      url: request.url(),
      method: request.method(),
      form: new URLSearchParams(request.postData() ?? ''),
    });
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>StackBlitz stub</title>',
    });
  });
  return posts;
}

/** Opens a card's Code tab and returns its "Open in StackBlitz" button. */
async function stackblitzButton(card: Locator): Promise<Locator> {
  await card.scrollIntoViewIfNeeded();
  await card.getByRole('button', { name: 'Code', exact: true }).click();
  const button = card.getByRole('button', { name: 'Open in StackBlitz' });
  await expect(button).toBeVisible();
  return button;
}

async function openProject(
  page: Page,
  button: Locator,
  posts: StackblitzPost[],
): Promise<StackblitzPost> {
  const popup = page.waitForEvent('popup');
  await button.click();
  await (await popup).waitForLoadState();
  await expect.poll(() => posts.length).toBe(1);
  return posts[0];
}

function packageJson(post: StackblitzPost): {
  dependencies: Record<string, string>;
  scripts: Record<string, string>;
} {
  return JSON.parse(post.form.get('project[files][package.json]') ?? '{}');
}

test('Angular demo: posts a standalone Angular project to StackBlitz', async ({
  page,
}) => {
  const posts = await interceptStackblitz(page);
  await page.goto('/components/buttons');
  const card = page.locator('app-demo-card:has(#sizes)');
  const button = await stackblitzButton(card);
  // nothing is requested from StackBlitz before the click
  expect(posts).toHaveLength(0);

  const post = await openProject(page, button, posts);
  expect(post.method).toBe('POST');
  expect(post.url).toBe(
    'https://stackblitz.com/run?file=src%2Fapp%2Fapp.component.ts',
  );
  expect(post.form.get('project[template]')).toBe('node');
  expect(post.form.get('project[title]')).toBe('Sizes');
  for (const file of [
    'angular.json',
    'tsconfig.json',
    'src/index.html',
    'src/main.ts',
    'src/styles.css',
    'README.md',
  ]) {
    expect(post.form.get(`project[files][${file}]`), file).toBeTruthy();
  }
  const component = post.form.get('project[files][src/app/app.component.ts]');
  expect(component).toContain('@Component(');
  expect(component).toContain('<oge-button');
  expect(post.form.get('project[files][src/main.ts]')).toContain(
    'bootstrapApplication(',
  );
  const pkg = packageJson(post);
  expect(pkg.scripts['start']).toBe('ng serve');
  expect(pkg.dependencies['@oge-ui/buttons']).toBe(RELEASE);
});

test('React demo: posts a Vite + React project to StackBlitz', async ({
  page,
}) => {
  const posts = await interceptStackblitz(page);
  await page.goto('/components/buttons?framework=react');
  const card = page.locator('app-demo-card:has(#sizes)');
  const button = await stackblitzButton(card);
  expect(posts).toHaveLength(0);

  const post = await openProject(page, button, posts);
  expect(post.method).toBe('POST');
  expect(post.url).toBe('https://stackblitz.com/run?file=src%2FApp.tsx');
  expect(post.form.get('project[template]')).toBe('node');
  expect(post.form.get('project[files][src/App.tsx]')).toContain(
    "from '@oge-ui/react-buttons'",
  );
  const main = post.form.get('project[files][src/main.tsx]') ?? '';
  expect(main).toContain("import '@oge-ui/react-buttons/styles.css';");
  expect(main).toContain('createRoot(');
  expect(post.form.get('project[files][vite.config.ts]')).toContain(
    '@vitejs/plugin-react',
  );
  const pkg = packageJson(post);
  expect(pkg.scripts['start']).toBe('vite');
  expect(pkg.dependencies['@oge-ui/react-buttons']).toBe(RELEASE);
});

test('fragments get no StackBlitz button', async ({ page }) => {
  await page.goto('/getting-started/setup');
  // the install commands are a shell fragment, not a component
  const shell = page.locator('app-code-block', { hasText: 'npm install' });
  await expect(shell.first()).toBeVisible();
  await expect(
    shell.first().getByRole('button', { name: 'Open in StackBlitz' }),
  ).toHaveCount(0);
});

test('a demo card with the StackBlitz button has no axe violations', async ({
  page,
}) => {
  await page.goto('/components/buttons');
  const card = page.locator('app-demo-card:has(#sizes)');
  await stackblitzButton(card);
  const cardScan = await new AxeBuilder({ page })
    .include('app-demo-card:has(#sizes)')
    // heading-order (h1 → demo-card h3) is the site-wide demo-card pattern;
    // the editor gutter's contrast is the site-wide demo-card exemption too
    .disableRules(['color-contrast', 'heading-order'])
    .analyze();
  // the code block's toolbar — where the button lives — under every rule,
  // contrast included
  const toolbar = await new AxeBuilder({ page })
    .include('app-demo-card:has(#sizes) .code-bar')
    .analyze();
  expect(
    [...cardScan.violations, ...toolbar.violations].map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
    ),
  ).toEqual([]);
});
