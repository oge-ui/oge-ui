import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeListBox } from './list-box';
import type {
  OgeListBoxReorderedEvent,
  OgeListBoxReorderingEvent,
} from './list-box-types';

interface City {
  id: number;
  name: string;
  closed?: boolean;
}

const CITIES: City[] = [
  { id: 1, name: 'Ankara' },
  { id: 2, name: 'Berlin' },
  { id: 3, name: 'Bonn', closed: true },
  { id: 4, name: 'İzmir' },
];

@Component({
  imports: [OgeListBox],
  template: `
    <oge-list-box
      label="Cities"
      [items]="items()"
      displayExpr="name"
      valueExpr="id"
      disabledExpr="closed"
      [allowReordering]="allow()"
      [readonly]="readonly()"
      [(value)]="value"
      (reordering)="onReordering($event)"
      (reordered)="moves.push($event)"
    />
  `,
})
class Host {
  readonly items = signal<readonly City[]>(CITIES);
  readonly allow = signal(true);
  readonly readonly = signal(false);
  readonly veto = signal(false);
  readonly value = signal<unknown>(null);
  readonly moves: OgeListBoxReorderedEvent<City>[] = [];
  onReordering(event: OgeListBoxReorderingEvent<City>): void {
    if (this.veto()) event.cancel = true;
  }
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const list = (f: ComponentFixture<Host>) =>
  f.nativeElement.querySelector('[role="listbox"]') as HTMLElement;
const names = (f: ComponentFixture<Host>) =>
  Array.from(list(f).querySelectorAll('[role="option"]')).map((o) =>
    o.textContent?.trim(),
  );
const options = (f: ComponentFixture<Host>) =>
  Array.from(list(f).querySelectorAll<HTMLElement>('[role="option"]'));

function key(target: Element, init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

function pointer(type: string, target: Element, x: number, y: number): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 0,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: 'mouse' });
  target.dispatchEvent(event);
}

describe('OgeListBox — reordering', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      setTimeout(() => cb(0), 0),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('advertises the reorder keys only when reordering is on', async () => {
    const f = TestBed.createComponent(Host);
    await settle(f);
    expect(list(f).getAttribute('aria-keyshortcuts')).toBe(
      'Alt+ArrowUp Alt+ArrowDown',
    );
    f.componentInstance.allow.set(false);
    await settle(f);
    expect(list(f).getAttribute('aria-keyshortcuts')).toBeNull();
  });

  it('Alt+ArrowDown moves the active option, keeps it active and announces', async () => {
    const f = TestBed.createComponent(Host);
    await settle(f);
    list(f).focus();
    list(f).dispatchEvent(new FocusEvent('focus'));
    await settle(f);
    const event = key(list(f), { key: 'ArrowDown', altKey: true });
    await settle(f);
    expect(event.defaultPrevented).toBe(true);
    expect(names(f)).toEqual(['Berlin', 'Ankara', 'Bonn', 'İzmir']);
    const moved = f.componentInstance.moves.at(-1)!;
    expect(moved).toMatchObject({
      fromIndex: 0,
      toIndex: 1,
      cause: 'keyboard',
    });
    expect(moved.items.map((c) => c.name)).toEqual([
      'Berlin',
      'Ankara',
      'Bonn',
      'İzmir',
    ]);
    // the moved option is still the active one; the selection did not move
    expect(list(f).getAttribute('aria-activedescendant')).toBe(
      options(f)[1].id,
    );
    expect(f.componentInstance.value()).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 200));
    const region = document.querySelector('[data-oge-live-announcer="polite"]');
    expect(region?.textContent).toContain('Ankara moved to position 2 of 4');
  });

  it('a cancelled reordering keeps the order', async () => {
    const f = TestBed.createComponent(Host);
    f.componentInstance.veto.set(true);
    await settle(f);
    list(f).focus();
    list(f).dispatchEvent(new FocusEvent('focus'));
    key(list(f), { key: 'ArrowDown', altKey: true });
    await settle(f);
    expect(names(f)).toEqual(['Ankara', 'Berlin', 'Bonn', 'İzmir']);
    expect(f.componentInstance.moves.length).toBe(0);
  });

  it('ignores the keys while read-only or switched off', async () => {
    const f = TestBed.createComponent(Host);
    f.componentInstance.readonly.set(true);
    await settle(f);
    list(f).focus();
    list(f).dispatchEvent(new FocusEvent('focus'));
    key(list(f), { key: 'ArrowDown', altKey: true });
    await settle(f);
    expect(names(f)).toEqual(['Ankara', 'Berlin', 'Bonn', 'İzmir']);
  });

  it('a pointer drag drops the option before / after another', async () => {
    const f = TestBed.createComponent(Host);
    await settle(f);
    const [ankara, , bonn] = options(f);
    pointer('pointerdown', ankara, 10, 2);
    pointer('pointermove', bonn, 10, 8);
    pointer('pointermove', bonn, 10, 12);
    await settle(f);
    // jsdom rects are empty, so any positive y is past the middle: after
    expect(options(f)[2].classList).toContain('oge-list-box-option-drop-after');
    pointer('pointerup', bonn, 10, 12);
    await settle(f);
    expect(names(f)).toEqual(['Berlin', 'Bonn', 'Ankara', 'İzmir']);
    expect(f.componentInstance.moves.at(-1)).toMatchObject({
      fromIndex: 0,
      toIndex: 2,
      cause: 'drag',
    });
    expect(list(f).querySelector('.oge-list-box-option-drop-after')).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('reorderItem() runs the same path; new items reset the order', async () => {
    const f = TestBed.createComponent(Host);
    await settle(f);
    const box = f.debugElement.children[0]
      .componentInstance as OgeListBox<City>;
    expect(box.reorderItem(CITIES[3], CITIES[0], 'before')).toBe(true);
    await settle(f);
    expect(names(f)).toEqual(['İzmir', 'Ankara', 'Berlin', 'Bonn']);
    expect(f.componentInstance.moves.at(-1)?.cause).toBe('api');
    // a disabled option never moves
    expect(box.reorderItem(CITIES[2], CITIES[0])).toBe(false);
    f.componentInstance.items.set([...CITIES]);
    await settle(f);
    expect(names(f)).toEqual(['Ankara', 'Berlin', 'Bonn', 'İzmir']);
  });
});
