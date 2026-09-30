import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeAutocomplete } from './autocomplete';

@Component({
  imports: [OgeAutocomplete],
  template: `
    <oge-autocomplete
      label="Fruit"
      [items]="items()"
      [searchTimeout]="0"
      [(value)]="value"
    />
  `,
})
class Host {
  readonly items = signal<string[]>(['Apple', 'Apricot', 'Banana', 'Cherry']);
  readonly value = signal('');
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function inputEl(fixture: ComponentFixture<unknown>): HTMLInputElement {
  return fixture.nativeElement.querySelector('.oge-input-native');
}

function type(fixture: ComponentFixture<unknown>, text: string): void {
  const el = inputEl(fixture);
  el.value = text;
  el.dispatchEvent(new Event('input', { bubbles: true }));
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

function listOpen(fixture: ComponentFixture<unknown>): boolean {
  return fixture.nativeElement.querySelector('.oge-select-list') !== null;
}

describe('OgeAutocomplete keyboard', () => {
  beforeEach(() => {
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

  it('ArrowDown opens without auto-activating; the next ArrowDown activates', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    press(fixture, 'ArrowDown');
    await settle(fixture);
    expect(listOpen(fixture)).toBe(true);
    expect(activeText(fixture)).toBeUndefined();
    expect(inputEl(fixture).getAttribute('aria-activedescendant')).toBeNull();
    press(fixture, 'ArrowDown');
    await settle(fixture);
    expect(activeText(fixture)).toBe('Apple');
    expect(inputEl(fixture).getAttribute('aria-activedescendant')).toBe(
      fixture.nativeElement.querySelector('.oge-select-option-active').id,
    );
  });

  it('Enter commits the active suggestion after arrowing', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    type(fixture, 'ap');
    await settle(fixture);
    press(fixture, 'ArrowDown');
    press(fixture, 'ArrowDown');
    await settle(fixture);
    press(fixture, 'Enter');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('Apricot');
    expect(listOpen(fixture)).toBe(false);
  });

  it('Enter without arrowing commits the raw typed text', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    type(fixture, 'pineapple');
    await settle(fixture);
    press(fixture, 'Enter');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('pineapple');
    expect(listOpen(fixture)).toBe(false);
  });

  it('Escape closes the popup first, then reverts the typed text', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set('Apple');
    await settle(fixture);
    type(fixture, 'ban');
    await settle(fixture);
    expect(listOpen(fixture)).toBe(true);
    press(fixture, 'Escape');
    await settle(fixture);
    expect(listOpen(fixture)).toBe(false);
    expect(inputEl(fixture).value).toBe('ban'); // text survives the close
    press(fixture, 'Escape');
    await settle(fixture);
    expect(inputEl(fixture).value).toBe('Apple'); // second stage reverts
    expect(fixture.componentInstance.value()).toBe('Apple');
  });
});
