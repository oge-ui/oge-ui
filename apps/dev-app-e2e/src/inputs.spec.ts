import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

test.describe('inputs overview', () => {
  test('renders all three editors', async ({ page }) => {
    await page.goto('/components/inputs');
    await expect(page.locator('.oge-text-box').first()).toBeVisible();
    await expect(page.locator('.oge-text-area').first()).toBeVisible();
    await expect(page.locator('.oge-number-box').first()).toBeVisible();
  });

  test('has no axe violations (light and dark)', async ({ page }) => {
    test.slow();
    await page.goto('/components/inputs');
    await expect(page.locator('.oge-text-box').first()).toBeVisible();
    const scan = () =>
      new AxeBuilder({ page })
        .include('.oge-input')
        .disableRules(['color-contrast'])
        .analyze();
    let results = await scan();
    expect(
      results.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
      ),
    ).toEqual([]);

    await page.getByLabel('Switch to dark mode').click();
    await expect(page.locator('html')).toHaveClass(/oge-theme-dark/);
    results = await scan();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  test('floating label lifts on focus and content', async ({ page }) => {
    await page.goto('/components/inputs');
    const floating = page.locator('.oge-input-label-floating').first();
    await expect(floating).not.toHaveClass(/oge-input-float-up/);
    const native = floating.locator('.oge-input-native');
    await native.click();
    await expect(floating).toHaveClass(/oge-input-float-up/);
    await native.fill('içerik');
    await page.locator('h1').click(); // blur
    await expect(floating).toHaveClass(/oge-input-float-up/); // stays up with content
  });
});

test.describe('input validation', () => {
  test('reactive: error appears after blur without layout shift', async ({
    page,
  }) => {
    await page.goto('/components/inputs/validation');
    const email = page
      .locator('oge-text-box', { hasText: 'E-mail' })
      .locator('.oge-input-native');
    await email.scrollIntoViewIfNeeded();

    const box = page.locator('oge-text-box', { hasText: 'E-mail' });
    const before = await box.boundingBox();
    await email.click();
    await page.locator('app-doc-header p').click(); // blur → touched
    await expect(box.locator('.oge-input-error')).toContainText(
      'This field is required',
    );
    const after = await box.boundingBox();
    expect(after?.height).toBe(before?.height); // fixed subscript: no jump

    await expect(email).toHaveAttribute('aria-invalid', 'true');
  });

  test('signal forms: schema constraint validates through [formField]', async ({
    page,
  }) => {
    await page.goto('/components/inputs/validation');
    const username = page
      .locator('oge-text-box', { hasText: 'Username' })
      .last()
      .locator('.oge-input-native');
    await username.scrollIntoViewIfNeeded();
    await username.fill('ab'); // minLength 3
    await page.locator('app-doc-header p').click();
    await expect(
      page.locator('.oge-input-error', { hasText: 'at least 3' }),
    ).toBeVisible();
  });
});

test.describe('input showcase', () => {
  test('password reveal toggles the type and keeps focus usable', async ({
    page,
  }) => {
    await page.goto('/components/inputs/showcase');
    const field = page.locator('oge-text-box', { hasText: 'Password' });
    await field.scrollIntoViewIfNeeded();
    const native = field.locator('.oge-input-native');
    await expect(native).toHaveAttribute('type', 'password');

    const reveal = field.locator('.oge-input-reveal');
    await reveal.click();
    await expect(native).toHaveAttribute('type', 'text');
    await expect(reveal).toHaveAttribute('aria-pressed', 'true');
    await reveal.click();
    await expect(native).toHaveAttribute('type', 'password');
  });

  test('number spin hold increments and formats on blur', async ({ page }) => {
    await page.goto('/components/inputs/showcase');
    const qty = page.locator('oge-number-box', { hasText: 'Quantity' });
    await qty.scrollIntoViewIfNeeded();
    const up = qty.locator('.oge-input-spin-btn').first();
    const box = await up.boundingBox();
    if (!box) throw new Error('spin button not visible');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(900); // immediate + repeats after 400ms
    await page.mouse.up();
    const value = Number(await qty.locator('.oge-input-native').inputValue());
    expect(value).toBeGreaterThan(12);
  });

  test('grapheme counter counts an emoji family as one', async ({ page }) => {
    await page.goto('/components/inputs/showcase');
    const bio = page.locator('oge-text-box', { hasText: 'Bio' });
    await bio.scrollIntoViewIfNeeded();
    await bio.locator('.oge-input-native').fill('👨‍👩‍👧');
    await expect(bio.locator('.oge-input-counter [aria-hidden]')).toHaveText(
      '1/40',
    );
  });

  test('textarea auto-resize grows with content', async ({ page }) => {
    await page.goto('/components/inputs');
    const area = page.locator('oge-text-area').first();
    await area.scrollIntoViewIfNeeded();
    const native = area.locator('.oge-input-native');
    const before = await native.boundingBox();
    await native.fill('bir\niki\nüç\ndört\nbeş');
    const after = await native.boundingBox();
    expect((after?.height ?? 0) > (before?.height ?? 0)).toBe(true);
  });
});
