import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeSelectBox } from './select-box';

interface City {
  id: number;
  name: string;
  frozen?: boolean;
}

const CITIES: City[] = [
  { id: 1, name: 'Ankara' },
  { id: 2, name: 'Berlin' },
  { id: 3, name: 'Bologna', frozen: true },
  { id: 4, name: 'Boston' },
];

@Component({
  imports: [OgeSelectBox],
  template: `
    <oge-select-box
      label="City"
      [items]="items()"
      displayExpr="name"
      valueExpr="id"
      [disabledExpr]="disabledExpr()"
      [searchEnabled]="searchEnabled()"
      [searchTimeout]="0"
      [showClearButton]="true"
      [(value)]="value"
    />
  `,
})
class Host {
  readonly items = signal<City[]>(CITIES);
  readonly value = signal<unknown>(null);
  readonly searchEnabled = signal(false);
  readonly disabledExpr = signal<string | undefined>(undefined);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function selectBox(fixture: ComponentFixture<unknown>): OgeSelectBox<City> {
  return fixture.debugElement.children[0].componentInstance;
}

function inputEl(fixture: ComponentFixture<unknown>): HTMLInputElement {
  return fixture.nativeElement.querySelector('.oge-input-native');
}

function options(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll('.oge-select-option'),
  );
}

describe('OgeSelectBox', () => {
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

  it('renders a combobox input with the field chrome', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const input = inputEl(fixture);
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.readOnly).toBe(true); // select-only mode
    expect(
      fixture.nativeElement.querySelector('.oge-input-dropdown'),
    ).toBeTruthy();
  });

  it('opens on chevron click and renders listbox options', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    fixture.nativeElement.querySelector('.oge-input-dropdown').click();
    await settle(fixture);
    expect(
      fixture.nativeElement.querySelector('.oge-select-list'),
    ).toBeTruthy();
    const rendered = options(fixture);
    expect(rendered.length).toBe(4);
    expect(rendered[0].getAttribute('role')).toBe('option');
    expect(rendered[0].textContent).toContain('Ankara');
    expect(inputEl(fixture).getAttribute('aria-expanded')).toBe('true');
  });

  it('selects an item on click: commits valueExpr, shows displayExpr, closes', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    selectBox(fixture).open();
    await settle(fixture);
    options(fixture)[1].click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(2);
    expect(inputEl(fixture).value).toBe('Berlin');
    expect(fixture.nativeElement.querySelector('.oge-select-list')).toBeNull();
  });

  it('resolves selectedItem from a programmatic value write', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    fixture.componentInstance.value.set(4);
    await settle(fixture);
    expect(selectBox(fixture).selectedItem()?.name).toBe('Boston');
    expect(inputEl(fixture).value).toBe('Boston');
  });

  it('emits selectionChanged with the previous item', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const events: unknown[] = [];
    selectBox(fixture).selectionChanged.subscribe((event) =>
      events.push(event),
    );
    fixture.componentInstance.value.set(1);
    await settle(fixture);
    fixture.componentInstance.value.set(2);
    await settle(fixture);
    expect(events.length).toBe(2);
    expect(events[1]).toEqual({
      item: CITIES[1],
      previousItem: CITIES[0],
    });
  });

  it('clear button empties the value', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    fixture.componentInstance.value.set(1);
    await settle(fixture);
    const clear = fixture.nativeElement.querySelector('.oge-input-clear');
    expect(clear).toBeTruthy();
    clear.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBeNull();
    expect(inputEl(fixture).value).toBe('');
  });

  it('skips disabled items on selection', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.disabledExpr.set('frozen');
    await settle(fixture);
    selectBox(fixture).open();
    await settle(fixture);
    const bologna = options(fixture)[2];
    expect(bologna.getAttribute('aria-disabled')).toBe('true');
    bologna.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBeNull();
  });

  it('filters with searchEnabled and shows the no-data row when empty', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.searchEnabled.set(true);
    await settle(fixture);
    const input = inputEl(fixture);
    expect(input.readOnly).toBe(false);
    input.value = 'bo';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    expect(
      options(fixture).map((option) => option.textContent?.trim()),
    ).toEqual(['Bologna', 'Boston']);
    input.value = 'zzz';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    expect(options(fixture).length).toBe(0);
    expect(
      fixture.nativeElement.querySelector('.oge-select-status')?.textContent,
    ).toContain('No data');
  });

  it('reverts uncommitted search text to the selected display on blur', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.searchEnabled.set(true);
    fixture.componentInstance.value.set(2);
    await settle(fixture);
    const input = inputEl(fixture);
    input.dispatchEvent(new FocusEvent('focus'));
    input.value = 'Bos';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    input.dispatchEvent(new FocusEvent('blur'));
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(2);
    expect(input.value).toBe('Berlin');
  });
});
