import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeSelectBox } from './select-box';
import type {
  OgeSelectBoxCustomItemEvent,
  OgeSelectBoxItemsFn,
} from './select-box-types';

interface Fruit {
  name: string;
  kind: string;
}

const FRUITS: Fruit[] = [
  { name: 'Apple', kind: 'Pome' },
  { name: 'Cherry', kind: 'Stone' },
  { name: 'Pear', kind: 'Pome' },
  { name: 'Peach', kind: 'Stone' },
];

@Component({
  imports: [OgeSelectBox],
  template: `
    <oge-select-box
      label="Fruit"
      [items]="items()"
      displayExpr="name"
      [groupBy]="groupBy()"
      [searchEnabled]="searchEnabled()"
      [searchTimeout]="searchTimeout()"
      [minSearchLength]="minSearchLength()"
      [showDataBeforeSearch]="showDataBeforeSearch()"
      [acceptCustomValue]="acceptCustomValue()"
      [(value)]="value"
      (customItemCreating)="onCustomItem($event)"
    />
  `,
})
class Host {
  readonly items = signal<readonly Fruit[] | OgeSelectBoxItemsFn<Fruit>>(
    FRUITS,
  );
  readonly value = signal<unknown>(null);
  readonly groupBy = signal<string | undefined>(undefined);
  readonly searchEnabled = signal(false);
  readonly searchTimeout = signal(0);
  readonly minSearchLength = signal(0);
  readonly showDataBeforeSearch = signal(false);
  readonly acceptCustomValue = signal(false);
  customHandler: ((event: OgeSelectBoxCustomItemEvent<Fruit>) => void) | null =
    null;

  onCustomItem(event: OgeSelectBoxCustomItemEvent<Fruit>): void {
    this.customHandler?.(event);
  }
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function selectBox(fixture: ComponentFixture<Host>): OgeSelectBox<Fruit> {
  return fixture.debugElement.children[0].componentInstance;
}

function inputEl(fixture: ComponentFixture<unknown>): HTMLInputElement {
  return fixture.nativeElement.querySelector('.oge-input-native');
}

function optionTexts(fixture: ComponentFixture<unknown>): string[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll<HTMLElement>('.oge-select-option'),
  ).map((option) => option.textContent?.trim() ?? '');
}

function type(fixture: ComponentFixture<unknown>, text: string): void {
  const input = inputEl(fixture);
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('OgeSelectBox data features', () => {
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

  it('groupBy renders headers and reorders items by first-seen group', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.groupBy.set('kind');
    await settle(fixture);
    selectBox(fixture).open();
    await settle(fixture);
    const headers = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLElement>('.oge-select-group'),
    ).map((header) => header.textContent?.trim());
    expect(headers).toEqual(['Pome', 'Stone']);
    expect(optionTexts(fixture)).toEqual(['Apple', 'Pear', 'Cherry', 'Peach']);
  });

  it('lazy items function loads on first open (loading row first)', async () => {
    const fixture = TestBed.createComponent(Host);
    let resolve!: (items: readonly Fruit[]) => void;
    fixture.componentInstance.items.set(
      () => new Promise<readonly Fruit[]>((res) => (resolve = res)),
    );
    await settle(fixture);
    selectBox(fixture).open();
    await settle(fixture);
    expect(
      fixture.nativeElement.querySelector('.oge-select-status')?.textContent,
    ).toContain('Loading');
    resolve(FRUITS.slice(0, 2));
    await settle(fixture);
    expect(optionTexts(fixture)).toEqual(['Apple', 'Cherry']);
  });

  it('lazy items rejection shows the load-error row', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.items.set(() =>
      Promise.reject(new Error('boom')),
    );
    await settle(fixture);
    selectBox(fixture).open();
    await settle(fixture);
    expect(
      fixture.nativeElement.querySelector('.oge-select-status')?.textContent,
    ).toContain('Failed to load');
  });

  it('minSearchLength hides the list until reached unless showDataBeforeSearch', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.searchEnabled.set(true);
    fixture.componentInstance.minSearchLength.set(3);
    await settle(fixture);
    type(fixture, 'pe');
    await settle(fixture);
    expect(optionTexts(fixture).length).toBe(0); // below min, hidden
    fixture.componentInstance.showDataBeforeSearch.set(true);
    await settle(fixture);
    expect(optionTexts(fixture).length).toBe(4); // below min, full list
    type(fixture, 'pea');
    await settle(fixture);
    expect(optionTexts(fixture)).toEqual(['Pear', 'Peach']);
  });

  it('searchTimeout debounces the filter, not the displayed text', async () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(Host);
      fixture.componentInstance.searchEnabled.set(true);
      fixture.componentInstance.searchTimeout.set(200);
      fixture.detectChanges();
      type(fixture, 'pe');
      fixture.detectChanges();
      expect(inputEl(fixture).value).toBe('pe'); // text immediate
      expect(optionTexts(fixture).length).toBe(4); // filter still pending
      vi.advanceTimersByTime(250);
      fixture.detectChanges();
      expect(optionTexts(fixture)).toEqual(['Pear', 'Peach']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('acceptCustomValue: Enter on unmatched text commits via customItemCreating', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.searchEnabled.set(true);
    fixture.componentInstance.acceptCustomValue.set(true);
    fixture.componentInstance.customHandler = (event) => {
      event.customItem = { name: event.text, kind: 'Custom' };
    };
    await settle(fixture);
    type(fixture, 'Quince');
    await settle(fixture);
    inputEl(fixture).dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Enter',
      }),
    );
    await settle(fixture);
    const committed = fixture.componentInstance.value() as Fruit;
    expect(committed.name).toBe('Quince');
    expect(committed.kind).toBe('Custom');
    // custom item is not in `items` — selectedItem falls back to the cache
    expect(selectBox(fixture).displayText()).toBe('Quince');
    expect(inputEl(fixture).value).toBe('Quince');
  });

  it('acceptCustomValue: a null customItem rejects the text', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.searchEnabled.set(true);
    fixture.componentInstance.acceptCustomValue.set(true);
    fixture.componentInstance.customHandler = (event) => {
      event.customItem = null;
    };
    await settle(fixture);
    type(fixture, 'Quince');
    await settle(fixture);
    inputEl(fixture).dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Enter',
      }),
    );
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBeNull();
  });

  it('acceptCustomValue: exact display match selects the existing item', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.searchEnabled.set(true);
    fixture.componentInstance.acceptCustomValue.set(true);
    await settle(fixture);
    type(fixture, 'cherry');
    await settle(fixture);
    inputEl(fixture).dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Enter',
      }),
    );
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(FRUITS[1]); // whole item (no valueExpr)
  });
});
