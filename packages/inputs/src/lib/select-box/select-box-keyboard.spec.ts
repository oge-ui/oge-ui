import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeSelectBox } from './select-box';

@Component({
  imports: [OgeSelectBox],
  template: `
    <oge-select-box
      label="Fruit"
      [items]="items()"
      [searchEnabled]="searchEnabled()"
      [(value)]="value"
    />
  `,
})
class Host {
  readonly items = signal<string[]>(['Apple', 'Apricot', 'Banana', 'Cherry']);
  readonly value = signal<unknown>(null);
  readonly searchEnabled = signal(false);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function inputEl(fixture: ComponentFixture<unknown>): HTMLInputElement {
  return fixture.nativeElement.querySelector('.oge-input-native');
}

function press(
  fixture: ComponentFixture<unknown>,
  key: string,
  init: KeyboardEventInit = {},
): void {
  inputEl(fixture).dispatchEvent(
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key,
      ...init,
    }),
  );
}

function activeText(fixture: ComponentFixture<unknown>): string | undefined {
  return fixture.nativeElement
    .querySelector('.oge-select-option-active')
    ?.textContent?.trim();
}

describe('OgeSelectBox keyboard', () => {
  beforeEach(() => {
    // async stub — a synchronous rAF re-enters Angular's render scheduler
    // mid-tick and produces bogus NG0100 errors
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('ArrowDown opens the popup and activates the first option', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    press(fixture, 'ArrowDown');
    await settle(fixture);
    expect(
      fixture.nativeElement.querySelector('.oge-select-list'),
    ).toBeTruthy();
    expect(activeText(fixture)).toBe('Apple');
    const input = inputEl(fixture);
    expect(input.getAttribute('aria-activedescendant')).toBe(
      fixture.nativeElement.querySelector('.oge-select-option-active').id,
    );
  });

  it('arrows move the active option without wrapping; Enter commits', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    press(fixture, 'ArrowDown');
    await settle(fixture);
    press(fixture, 'ArrowDown');
    await settle(fixture);
    expect(activeText(fixture)).toBe('Apricot');
    press(fixture, 'ArrowUp');
    press(fixture, 'ArrowUp');
    press(fixture, 'ArrowUp');
    await settle(fixture);
    expect(activeText(fixture)).toBe('Apple'); // clamped at the first option
    press(fixture, 'ArrowDown');
    await settle(fixture);
    press(fixture, 'Enter');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('Apricot');
    expect(fixture.nativeElement.querySelector('.oge-select-list')).toBeNull();
  });

  it('Escape closes without committing', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    press(fixture, 'ArrowDown');
    await settle(fixture);
    press(fixture, 'Escape');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBeNull();
    expect(fixture.nativeElement.querySelector('.oge-select-list')).toBeNull();
  });

  it('reopening activates the selected option', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set('Banana');
    await settle(fixture);
    press(fixture, 'ArrowDown', { altKey: true }); // Alt+ArrowDown: open only
    await settle(fixture);
    expect(activeText(fixture)).toBe('Banana');
  });

  it('select-only type-ahead jumps by prefix and cycles on a repeated char', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    press(fixture, 'b');
    await settle(fixture);
    expect(activeText(fixture)).toBe('Banana');
    press(fixture, 'a');
    await settle(fixture);
    expect(activeText(fixture)).toBe('Banana'); // "ba" still matches Banana
    vi.useFakeTimers();
    press(fixture, 'a');
    vi.advanceTimersByTime(600); // type-ahead buffer reset
    vi.useRealTimers();
    press(fixture, 'a');
    await settle(fixture);
    expect(activeText(fixture)).toBe('Apple');
    press(fixture, 'a');
    await settle(fixture);
    expect(activeText(fixture)).toBe('Apricot'); // repeated char cycles matches
  });

  it('Home and End jump to the first and last option in select-only mode', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    press(fixture, 'End');
    await settle(fixture);
    expect(activeText(fixture)).toBe('Cherry');
    press(fixture, 'Home');
    await settle(fixture);
    expect(activeText(fixture)).toBe('Apple');
  });
});
