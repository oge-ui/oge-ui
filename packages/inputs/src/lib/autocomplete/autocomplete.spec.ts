import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeAutocomplete } from './autocomplete';
import type { OgeAutocompleteSelectionChangedEvent } from './autocomplete-types';

interface City {
  id: number;
  name: string;
  region: string;
}

const CITIES: City[] = [
  { id: 1, name: 'Ankara', region: 'Anatolia' },
  { id: 2, name: 'Antalya', region: 'Mediterranean' },
  { id: 3, name: 'Berlin', region: 'Europe' },
  { id: 4, name: 'Bursa', region: 'Anatolia' },
];

@Component({
  imports: [OgeAutocomplete],
  template: `
    <oge-autocomplete
      label="City"
      [items]="items()"
      displayExpr="name"
      [searchTimeout]="0"
      [minSearchLength]="minSearchLength()"
      [maxItemCount]="maxItemCount()"
      [forceSelection]="forceSelection()"
      [showDropDownButton]="showDropDownButton()"
      [(value)]="value"
      (selectionChanged)="selections.push($event)"
    />
  `,
})
class Host {
  readonly items = signal<City[]>(CITIES);
  readonly value = signal('');
  readonly minSearchLength = signal(1);
  readonly maxItemCount = signal(10);
  readonly forceSelection = signal(false);
  readonly showDropDownButton = signal(false);
  readonly selections: OgeAutocompleteSelectionChangedEvent<City>[] = [];
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

function options(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll('.oge-select-option'),
  );
}

function listOpen(fixture: ComponentFixture<unknown>): boolean {
  return fixture.nativeElement.querySelector('.oge-select-list') !== null;
}

describe('OgeAutocomplete', () => {
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

  it('opens on typing, filters suggestions and keeps the value untouched until commit', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    expect(listOpen(fixture)).toBe(false);
    type(fixture, 'an');
    await settle(fixture);
    expect(listOpen(fixture)).toBe(true);
    expect(options(fixture).map((el) => el.textContent?.trim())).toEqual([
      'Ankara',
      'Antalya',
    ]);
    // typed text is visible but not committed yet
    expect(inputEl(fixture).value).toBe('an');
    expect(fixture.componentInstance.value()).toBe('');
  });

  it('stays closed below minSearchLength and closes when deleting under it', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.minSearchLength.set(3);
    await settle(fixture);
    type(fixture, 'an');
    await settle(fixture);
    expect(listOpen(fixture)).toBe(false);
    type(fixture, 'ank');
    await settle(fixture);
    expect(listOpen(fixture)).toBe(true);
    type(fixture, 'an');
    await settle(fixture);
    expect(listOpen(fixture)).toBe(false);
  });

  it('caps the suggestion list at maxItemCount', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.maxItemCount.set(2);
    await settle(fixture);
    type(fixture, 'a'); // matches all four via "contains"
    await settle(fixture);
    expect(options(fixture).length).toBe(2);
  });

  it('click-selecting writes the display text, commits and emits selectionChanged', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    type(fixture, 'ant');
    await settle(fixture);
    options(fixture)[0].dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('Antalya');
    expect(inputEl(fixture).value).toBe('Antalya');
    expect(listOpen(fixture)).toBe(false);
    expect(fixture.componentInstance.selections.at(-1)?.item?.name).toBe(
      'Antalya',
    );
  });

  it('commits free text on blur and cancels a stale selection', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    type(fixture, 'ant');
    await settle(fixture);
    options(fixture)[0].dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    await settle(fixture);
    type(fixture, 'somewhere else');
    inputEl(fixture).dispatchEvent(new FocusEvent('blur'));
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('somewhere else');
    expect(fixture.componentInstance.selections.at(-1)?.item).toBeNull();
  });

  it('blur resolves an exact display match to its canonical casing', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    type(fixture, 'bursa');
    inputEl(fixture).dispatchEvent(new FocusEvent('blur'));
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('Bursa');
    expect(fixture.componentInstance.selections.at(-1)?.item?.name).toBe(
      'Bursa',
    );
  });

  it('forceSelection reverts non-matching text to the last committed value on blur', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.forceSelection.set(true);
    await settle(fixture);
    type(fixture, 'berlin');
    inputEl(fixture).dispatchEvent(new FocusEvent('blur'));
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('Berlin'); // exact match resolves
    type(fixture, 'nowhere');
    inputEl(fixture).dispatchEvent(new FocusEvent('blur'));
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('Berlin'); // reverted
    expect(inputEl(fixture).value).toBe('Berlin');
  });

  it('hides the chevron by default and shows it on demand', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    expect(
      fixture.nativeElement.querySelector('.oge-input-dropdown'),
    ).toBeNull();
    fixture.componentInstance.showDropDownButton.set(true);
    await settle(fixture);
    expect(
      fixture.nativeElement.querySelector('.oge-input-dropdown'),
    ).toBeTruthy();
  });
});

describe('OgeAutocomplete search highlight', () => {
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

  it('marks the matched substring of each suggestion', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    type(fixture, 'tal');
    await settle(fixture);
    const mark = fixture.nativeElement.querySelector('.oge-select-mark');
    expect(mark?.textContent).toBe('tal'); // An(tal)ya
    expect(
      fixture.nativeElement
        .querySelector('.oge-select-option-text')
        ?.textContent?.trim(),
    ).toBe('Antalya');
  });
});
