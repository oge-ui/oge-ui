/** Code samples rendered on the testing guide. */

export const ANGULAR_SPEC = `// orders.spec.ts — vitest (or Jasmine) + TestBed, zoneless
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeSelectBox } from '@oge-ui/inputs/select-box';

@Component({
  imports: [OgeSelectBox],
  template: \`<oge-select-box label="City" [items]="cities" [(value)]="city" />\`,
})
class Host {
  readonly cities = ['Lisbon', 'Oslo', 'Rome'];
  readonly city = signal<unknown>(null);
}

/** Render, let signals and effects flush, render again. */
async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('city picker', () => {
  beforeEach(() => {
    // popups position in requestAnimationFrame — stub it *asynchronously*;
    // a synchronous stub re-enters change detection mid-tick (NG0100)
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), 0) as unknown as number);
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('is a combobox that starts closed', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('oge-select-box input');
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });
});`;

export const REACT_SPEC = `// Orders.test.tsx — vitest + jsdom + React Testing Library
import { fireEvent, render, screen } from '@testing-library/react';
import { OgeButton } from '@oge-ui/react-buttons';

it('fires onClick', () => {
  const onClick = vi.fn();
  render(<OgeButton text="Save" onClick={onClick} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(onClick).toHaveBeenCalledTimes(1);
});

it('opens a select box from the keyboard', () => {
  render(<Cities />); // your component rendering <OgeSelectBox label="City" …>
  const combo = screen.getByRole('combobox');
  fireEvent.keyDown(combo, { key: 'ArrowDown' });
  expect(combo).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('listbox')).toBeInTheDocument();
});`;

export const VITEST_SETUP = `// vitest.setup.ts — React Testing Library under vitest's globals
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

// RTL does not auto-clean under \`globals: true\` unless registered explicitly
afterEach(() => cleanup());`;

export const JSDOM_STUBS = `// only in the specs that need them — the gaps jsdom leaves
// <canvas>: signature pad, chart and Gantt image export
vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

// URL.createObjectURL / revokeObjectURL: upload thumbnails, file downloads
URL.createObjectURL = () => 'blob:test';
URL.revokeObjectURL = () => undefined;

// ResizeObserver: toolbars and breadcrumbs that collapse into overflow menus
class FakeResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
vi.stubGlobal('ResizeObserver', FakeResizeObserver);

// matchMedia: prefers-reduced-motion, adaptive popups
window.matchMedia = (query: string) =>
  ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList;

// PointerEvent: jsdom has no constructor — dispatch a MouseEvent with the pointer type
const down = new MouseEvent('pointerdown', { bubbles: true, button: 0 });
Object.defineProperty(down, 'pointerId', { value: 1 });
Object.defineProperty(down, 'pointerType', { value: 'mouse' });
element.dispatchEvent(down);`;

export const PLAYWRIGHT = `import { expect, test } from '@playwright/test';

// a fixed locale and time zone: number and date formatting follow the browser
test.use({ locale: 'en-US', timezoneId: 'UTC' });

test('select box: arrows and Enter pick a city', async ({ page }) => {
  await page.goto('/orders');
  const input = page.getByRole('combobox', { name: 'City' });
  await input.click();
  await input.press('ArrowDown');
  await input.press('Enter');
  // web-first assertions retry until the component has re-rendered
  await expect(input).toHaveValue('Lisbon');
  await expect(input).toBeFocused();
});

test('grid: sorting announces itself', async ({ page }) => {
  await page.goto('/orders');
  await page.getByRole('columnheader', { name: 'Total' }).click();
  // poll values that are not a locator state (a computed style, a count)
  await expect
    .poll(() => page.locator('.oge-row').count())
    .toBeGreaterThan(0);
  await expect(page.locator('[data-oge-live-announcer="polite"]')).toContainText(
    'Sorted by Total',
  );
});`;
