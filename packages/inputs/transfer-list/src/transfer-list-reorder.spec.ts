import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { OgeTransferListReorderSides } from '@oge-ui/behavior';
import { OgeTransferList } from './transfer-list';
import type {
  OgeTransferListReorderedEvent,
  OgeTransferListReorderingEvent,
} from './transfer-list-types';

interface Perm {
  id: string;
  name: string;
}

const PERMS: Perm[] = [
  { id: 'read', name: 'Read' },
  { id: 'write', name: 'Write' },
  { id: 'admin', name: 'Admin' },
  { id: 'share', name: 'Share' },
];

@Component({
  imports: [OgeTransferList],
  template: `
    <oge-transfer-list
      [items]="items"
      displayExpr="name"
      valueExpr="id"
      [allowReordering]="allow()"
      [(value)]="value"
      (reordering)="onReordering($event)"
      (reordered)="reorders.push($event)"
    />
  `,
})
class Host {
  readonly items = PERMS;
  readonly allow = signal<OgeTransferListReorderSides>(true);
  readonly value = signal<readonly unknown[]>(['share', 'admin']);
  readonly veto = signal(false);
  readonly reorders: OgeTransferListReorderedEvent<Perm>[] = [];
  onReordering(event: OgeTransferListReorderingEvent<Perm>): void {
    if (this.veto()) event.cancel = true;
  }
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const pane = (f: ComponentFixture<unknown>, side: 'source' | 'target') =>
  f.nativeElement.querySelector(
    `[data-oge-transfer-side="${side}"]`,
  ) as HTMLElement;
const listOf = (f: ComponentFixture<unknown>, side: 'source' | 'target') =>
  pane(f, side).querySelector('[role="listbox"]') as HTMLElement;
const texts = (f: ComponentFixture<unknown>, side: 'source' | 'target') =>
  Array.from(pane(f, side).querySelectorAll('[role="option"]')).map((o) =>
    o.textContent?.trim(),
  );
const option = (
  f: ComponentFixture<unknown>,
  side: 'source' | 'target',
  index: number,
) => pane(f, side).querySelectorAll<HTMLElement>('[role="option"]')[index];

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

async function focusList(
  f: ComponentFixture<unknown>,
  side: 'source' | 'target',
): Promise<HTMLElement> {
  const list = listOf(f, side);
  list.focus();
  list.dispatchEvent(new FocusEvent('focus'));
  await settle(f);
  return list;
}

describe('OgeTransferList — reordering', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      setTimeout(() => cb(0), 0),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('Alt+ArrowDown on the target reorders the value', async () => {
    const f = TestBed.createComponent(Host);
    await settle(f);
    expect(texts(f, 'target')).toEqual(['Share', 'Admin']);
    const list = await focusList(f, 'target');
    list.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        altKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    await settle(f);
    expect(f.componentInstance.value()).toEqual(['admin', 'share']);
    expect(texts(f, 'target')).toEqual(['Admin', 'Share']);
    expect(f.componentInstance.reorders.at(-1)).toMatchObject({
      side: 'target',
      fromIndex: 0,
      toIndex: 1,
      cause: 'keyboard',
      value: ['admin', 'share'],
    });
  });

  it('reorders the source order without touching the value', async () => {
    const f = TestBed.createComponent(Host);
    await settle(f);
    expect(texts(f, 'source')).toEqual(['Read', 'Write']);
    const list = await focusList(f, 'source');
    list.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        altKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    await settle(f);
    expect(texts(f, 'source')).toEqual(['Write', 'Read']);
    expect(f.componentInstance.value()).toEqual(['share', 'admin']);
    // the reordered source keeps its order across a move
    option(f, 'target', 0).click();
    await settle(f);
    (
      f.nativeElement.querySelectorAll(
        '.oge-transfer-list-action',
      )[2] as HTMLButtonElement
    ).click();
    await settle(f);
    expect(texts(f, 'source')).toEqual(['Write', 'Read', 'Share']);
  });

  it('opts in per side', async () => {
    const f = TestBed.createComponent(Host);
    f.componentInstance.allow.set('target');
    await settle(f);
    expect(listOf(f, 'source').getAttribute('aria-keyshortcuts')).not.toContain(
      'Alt+ArrowUp',
    );
    expect(listOf(f, 'target').getAttribute('aria-keyshortcuts')).toContain(
      'Alt+ArrowUp',
    );
    const list = await focusList(f, 'source');
    list.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        altKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    await settle(f);
    expect(texts(f, 'source')).toEqual(['Read', 'Write']);
  });

  it('one drag: inside its own list it reorders, over the other it moves', async () => {
    const f = TestBed.createComponent(Host);
    await settle(f);
    const read = option(f, 'source', 0);
    const write = option(f, 'source', 1);
    pointer('pointerdown', read, 10, 2);
    pointer('pointermove', write, 10, 8);
    pointer('pointermove', write, 10, 12);
    await settle(f);
    expect(
      pane(f, 'source').querySelector('.oge-transfer-list-reorder-line'),
    ).not.toBeNull();
    pointer('pointerup', write, 10, 12);
    await settle(f);
    expect(texts(f, 'source')).toEqual(['Write', 'Read']);
    expect(f.componentInstance.reorders.at(-1)).toMatchObject({
      side: 'source',
      cause: 'drag',
    });
    expect(
      pane(f, 'source').querySelector('.oge-transfer-list-reorder-line'),
    ).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const target = listOf(f, 'target');
    pointer('pointerdown', option(f, 'source', 0), 10, 2);
    pointer('pointermove', target, 60, 10);
    pointer('pointermove', target, 80, 12);
    pointer('pointerup', target, 80, 12);
    await settle(f);
    expect(f.componentInstance.value()).toEqual(['share', 'admin', 'write']);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('a cancelled reordering keeps both lists', async () => {
    const f = TestBed.createComponent(Host);
    f.componentInstance.veto.set(true);
    await settle(f);
    const list = await focusList(f, 'target');
    list.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        altKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    await settle(f);
    expect(f.componentInstance.value()).toEqual(['share', 'admin']);
    expect(f.componentInstance.reorders.length).toBe(0);
  });
});
