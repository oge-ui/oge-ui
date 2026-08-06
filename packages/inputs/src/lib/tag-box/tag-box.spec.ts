import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeTagBox } from './tag-box';

interface Skill {
  id: number;
  name: string;
}

const SKILLS: Skill[] = [
  { id: 1, name: 'Angular' },
  { id: 2, name: 'Signals' },
  { id: 3, name: 'Nx' },
  { id: 4, name: 'Vitest' },
];

@Component({
  imports: [OgeTagBox],
  template: `
    <oge-tag-box
      label="Skills"
      [items]="items()"
      displayExpr="name"
      valueExpr="id"
      [searchEnabled]="searchEnabled()"
      [maxDisplayedTags]="maxDisplayedTags()"
      [(value)]="value"
    />
  `,
})
class Host {
  readonly items = signal<Skill[]>(SKILLS);
  readonly value = signal<readonly unknown[]>([]);
  readonly searchEnabled = signal(false);
  readonly maxDisplayedTags = signal<number | undefined>(undefined);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function tagBox(fixture: ComponentFixture<Host>): OgeTagBox<Skill> {
  return fixture.debugElement.children[0].componentInstance;
}

function inputEl(fixture: ComponentFixture<unknown>): HTMLInputElement {
  return fixture.nativeElement.querySelector('.oge-input-native');
}

function chips(fixture: ComponentFixture<unknown>): string[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll<HTMLElement>('.oge-tag-text'),
  ).map((chip) => chip.textContent?.trim() ?? '');
}

function options(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll('.oge-select-option'),
  );
}

describe('OgeTagBox', () => {
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

  it('renders chips for the bound value array', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set([1, 3]);
    await settle(fixture);
    expect(chips(fixture)).toEqual(['Angular', 'Nx']);
  });

  it('toggling options keeps the popup open and commits deltas', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const events: unknown[] = [];
    tagBox(fixture).selectionChanged.subscribe((event) => events.push(event));
    tagBox(fixture).open();
    await settle(fixture);
    const listbox = fixture.nativeElement.querySelector('.oge-select-list');
    expect(listbox.getAttribute('aria-multiselectable')).toBe('true');
    options(fixture)[0].click();
    await settle(fixture);
    options(fixture)[2].click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual([1, 3]);
    // still open after picking
    expect(
      fixture.nativeElement.querySelector('.oge-select-list'),
    ).toBeTruthy();
    expect(events).toEqual([
      { addedItems: [SKILLS[0]], removedItems: [] },
      { addedItems: [SKILLS[2]], removedItems: [] },
    ]);
    // clicking a selected option deselects it
    options(fixture)[0].click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual([3]);
  });

  it('chip remove button and Backspace remove tags', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set([1, 2, 3]);
    await settle(fixture);
    fixture.nativeElement.querySelectorAll('.oge-tag-remove')[1].click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual([1, 3]);
    inputEl(fixture).dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Backspace',
      }),
    );
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual([1]);
  });

  it('search filters the option list', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.searchEnabled.set(true);
    await settle(fixture);
    const input = inputEl(fixture);
    input.value = 'si';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    expect(
      options(fixture).map((option) => option.textContent?.trim()),
    ).toEqual(['Signals']);
  });

  it('maxDisplayedTags collapses extra chips into a counter', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.maxDisplayedTags.set(2);
    fixture.componentInstance.value.set([1, 2, 3, 4]);
    await settle(fixture);
    expect(chips(fixture)).toEqual(['Angular', 'Signals']);
    expect(
      fixture.nativeElement.querySelector('.oge-tag-more')?.textContent,
    ).toContain('+2');
  });

  it('keyboard: ArrowDown + Enter toggles without closing', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const input = inputEl(fixture);
    const press = (key: string) =>
      input.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }),
      );
    press('ArrowDown');
    await settle(fixture);
    press('ArrowDown');
    press('Enter');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual([2]);
    expect(
      fixture.nativeElement.querySelector('.oge-select-list'),
    ).toBeTruthy();
    press('Escape');
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('.oge-select-list')).toBeNull();
  });
});
