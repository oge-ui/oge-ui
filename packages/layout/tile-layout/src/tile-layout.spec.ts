import { Component, signal, viewChild } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  OgeTileLayoutChangedEvent,
  OgeTileLayoutItemData,
  OgeTileLayoutReorderingEvent,
  OgeTileLayoutResizable,
  OgeTileLayoutResizedEvent,
  OgeTileLayoutState,
} from '@oge-ui/behavior';
import { OgeTileLayout } from './tile-layout';
import { OgeTileLayoutItem } from './tile-layout-item';
import {
  OgeTileLayoutContentTemplate,
  OgeTileLayoutItemHeader,
} from './templates';
import { provideOgeTileLayoutConfig } from './config';

const ITEMS: OgeTileLayoutItemData[] = [
  { key: 'a', title: 'Alpha', colSpan: 2 },
  { key: 'b', title: 'Beta' },
  { key: 'c', title: 'Gamma', reorderable: false },
  { key: 'd' },
];

@Component({
  imports: [OgeTileLayout, OgeTileLayoutContentTemplate],
  template: `
    <oge-tile-layout
      [items]="items()"
      [columns]="4"
      [resizable]="resizable()"
      [(state)]="state"
      locale="en-US"
      (reordering)="onReordering($event)"
      (reordered)="moves.push($event.toIndex)"
      (resized)="resizes.push($event)"
      (layoutChanged)="changes.push($event)"
    >
      <ng-template ogeTileLayoutContentTemplate let-item>
        <button type="button" class="inner">Open {{ item.key }}</button>
      </ng-template>
    </oge-tile-layout>
  `,
})
class Host {
  readonly items = signal<OgeTileLayoutItemData[]>([...ITEMS]);
  readonly resizable = signal<OgeTileLayoutResizable>(true);
  readonly state = signal<OgeTileLayoutState | undefined>(undefined);
  readonly layout = viewChild.required(OgeTileLayout);
  readonly moves: number[] = [];
  readonly resizes: OgeTileLayoutResizedEvent[] = [];
  readonly changes: OgeTileLayoutChangedEvent[] = [];
  veto = false;
  onReordering(event: OgeTileLayoutReorderingEvent): void {
    event.cancel = this.veto;
  }
}

@Component({
  imports: [OgeTileLayout, OgeTileLayoutItem, OgeTileLayoutItemHeader],
  template: `
    <oge-tile-layout [items]="extra">
      <oge-tile-layout-item key="x" title="Declared" [colSpan]="2">
        <span ogeTileLayoutItemHeader>Custom <b>head</b></span>
        <p class="declared-body">Body of x</p>
      </oge-tile-layout-item>
      <oge-tile-layout-item title="Auto key">Second</oge-tile-layout-item>
    </oge-tile-layout>
  `,
})
class DeclarativeHost {
  readonly extra: OgeTileLayoutItemData[] = [{ key: 'data', title: 'Data' }];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const tiles = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>('.oge-tile-layout-tile'));
const keysOf = (root: HTMLElement) =>
  tiles(root).map((t) => t.getAttribute('data-oge-tile-key'));

function key(
  el: HTMLElement,
  k: string,
  mods: Partial<KeyboardEventInit> = {},
): void {
  el.dispatchEvent(
    new KeyboardEvent('keydown', { key: k, bubbles: true, ...mods }),
  );
}

function pointer(el: Element, type: string, x: number, y: number): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 0,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: 'mouse' });
  el.dispatchEvent(event);
}

describe('OgeTileLayout', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let root: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    root = fixture.nativeElement as HTMLElement;
    await settle(fixture);
  });

  it('renders a labelled list of described, roledescribed groups', () => {
    const list = root.querySelector('[role="list"]')!;
    expect(list.getAttribute('aria-label')).toBe('Dashboard');
    expect(root.querySelectorAll('[role="listitem"]')).toHaveLength(4);
    const [a, , c, d] = tiles(root);
    expect(a.getAttribute('role')).toBe('group');
    expect(a.getAttribute('aria-roledescription')).toBe('tile');
    const title = root.querySelector(`#${a.getAttribute('aria-labelledby')}`);
    expect(title?.textContent?.trim()).toBe('Alpha');
    expect(d.getAttribute('aria-label')).toBe('Tile 4');
    const hint = root.querySelector(`#${a.getAttribute('aria-describedby')}`);
    expect(hint?.textContent).toContain('Control');
    expect(a.getAttribute('aria-keyshortcuts')).toContain(
      'Control+Shift+ArrowUp',
    );
    expect(c.getAttribute('aria-keyshortcuts')).not.toContain(
      'Control+ArrowLeft',
    );
    const cell = a.parentElement as HTMLElement;
    expect(cell.style.getPropertyValue('--oge-tile-col-span')).toBe('2');
    expect(root.querySelector('.inner')?.textContent).toContain('Open a');
  });

  it('keeps one roving tab stop and moves focus with arrows / Home / End', async () => {
    const all = tiles(root);
    expect(all.map((t) => t.tabIndex)).toEqual([0, -1, -1, -1]);
    all[0].focus();
    key(all[0], 'ArrowRight');
    await settle(fixture);
    expect(document.activeElement).toBe(all[1]);
    expect(tiles(root).map((t) => t.tabIndex)).toEqual([-1, 0, -1, -1]);
    key(all[1], 'End');
    expect(document.activeElement).toBe(all[3]);
    key(all[3], 'Home');
    expect(document.activeElement).toBe(all[0]);
  });

  it('Ctrl+Arrow moves a tile, keeps focus and writes the state', async () => {
    const [a] = tiles(root);
    a.focus();
    key(a, 'ArrowRight', { ctrlKey: true });
    await settle(fixture);
    expect(keysOf(root)).toEqual(['b', 'a', 'c', 'd']);
    expect(host.moves).toEqual([1]);
    expect(host.state()?.tiles.map((t) => t.key)).toEqual(['b', 'a', 'c', 'd']);
    expect(host.changes.at(-1)?.source).toBe('keyboard');
    expect(document.activeElement?.getAttribute('data-oge-tile-key')).toBe('a');
  });

  it('ignores keys from content inside a tile', async () => {
    const inner = root.querySelector<HTMLElement>('.inner')!;
    key(inner, 'ArrowRight', { ctrlKey: true });
    await settle(fixture);
    expect(keysOf(root)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('honours the cancelable reordering event and non-reorderable tiles', async () => {
    host.veto = true;
    const [a, , c] = tiles(root);
    key(a, 'ArrowRight', { ctrlKey: true });
    key(c, 'ArrowLeft', { ctrlKey: true });
    await settle(fixture);
    expect(keysOf(root)).toEqual(['a', 'b', 'c', 'd']);
    expect(host.moves).toEqual([]);
  });

  it('Ctrl+Shift+Arrow resizes within the bounds', async () => {
    const [a] = tiles(root);
    key(a, 'ArrowRight', { ctrlKey: true, shiftKey: true });
    key(a, 'ArrowDown', { ctrlKey: true, shiftKey: true });
    await settle(fixture);
    expect(host.resizes.map((r) => r.next)).toEqual([
      { colSpan: 3, rowSpan: 1 },
      { colSpan: 3, rowSpan: 2 },
    ]);
    const cell = tiles(root)[0].parentElement as HTMLElement;
    expect(cell.style.getPropertyValue('--oge-tile-row-span')).toBe('2');
    key(tiles(root)[0], 'ArrowRight', { ctrlKey: true, shiftKey: true });
    key(tiles(root)[0], 'ArrowRight', { ctrlKey: true, shiftKey: true });
    await settle(fixture);
    expect(host.resizes.at(-1)?.next.colSpan).toBe(4);
    expect(host.resizes).toHaveLength(3);
  });

  it('does not resize when the layout is not resizable', async () => {
    host.resizable.set(false);
    await settle(fixture);
    expect(root.querySelector('.oge-tile-layout-resize')).toBeNull();
    key(tiles(root)[0], 'ArrowRight', { ctrlKey: true, shiftKey: true });
    await settle(fixture);
    expect(host.resizes).toEqual([]);
  });

  it('reorders by dragging a header — the same commit as the keyboard', async () => {
    const all = tiles(root);
    const rects = [0, 220, 330, 440].map((left) => ({
      left,
      top: 0,
      width: 100,
      height: 100,
      right: left + 100,
      bottom: 100,
      x: left,
      y: 0,
      toJSON: () => ({}),
    }));
    all.forEach(
      (t, i) => (t.getBoundingClientRect = () => rects[i] as DOMRect),
    );
    const header = all[0].querySelector('.oge-tile-layout-header')!;
    pointer(header, 'pointerdown', 10, 10);
    pointer(header, 'pointermove', 240, 20);
    await settle(fixture);
    expect(all[0].classList).toContain('oge-tile-layout-tile-dragged');
    expect(all[1].classList).toContain('oge-tile-layout-tile-drop-target');
    pointer(header, 'pointerup', 240, 20);
    await settle(fixture);
    expect(keysOf(root)).toEqual(['b', 'a', 'c', 'd']);
    expect(host.changes.at(-1)?.source).toBe('pointer');
  });

  it('cancels a drag with Escape', async () => {
    const all = tiles(root);
    const header = all[0].querySelector('.oge-tile-layout-header')!;
    pointer(header, 'pointerdown', 10, 10);
    pointer(header, 'pointermove', 300, 10);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    pointer(header, 'pointerup', 300, 10);
    await settle(fixture);
    expect(keysOf(root)).toEqual(['a', 'b', 'c', 'd']);
    expect(all[0].classList).not.toContain('oge-tile-layout-tile-dragged');
  });

  it('resizes with the corner handle, snapping to tracks', async () => {
    const [a] = tiles(root);
    a.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 210,
        height: 160,
        right: 210,
        bottom: 160,
      }) as DOMRect;
    const handle = a.querySelector('.oge-tile-layout-resize')!;
    expect(handle.getAttribute('aria-hidden')).toBe('true');
    pointer(handle, 'pointerdown', 210, 160);
    pointer(handle, 'pointermove', 330, 340);
    await settle(fixture);
    expect(
      (a.parentElement as HTMLElement).style.getPropertyValue(
        '--oge-tile-col-span',
      ),
    ).toBe('3');
    pointer(handle, 'pointerup', 330, 340);
    await settle(fixture);
    expect(host.resizes.at(-1)).toMatchObject({
      key: 'a',
      source: 'pointer',
      next: { colSpan: 3, rowSpan: 2 },
    });
  });

  it('moveTile / resizeTile / getState / applyState', async () => {
    const layout = host.layout();
    expect(layout.moveTile('d', 0)).toBe(true);
    await settle(fixture);
    expect(keysOf(root)).toEqual(['d', 'a', 'b', 'c']);
    expect(layout.resizeTile('b', 9, 2)).toBe(true);
    expect(layout.getState().tiles.find((t) => t.key === 'b')).toMatchObject({
      colSpan: 4,
      rowSpan: 2,
    });
    expect(layout.applyState({ version: 9 })).toBe(false);
    expect(
      layout.applyState(
        JSON.parse(
          '{"version":1,"tiles":[{"key":"c","order":0,"colSpan":2,"rowSpan":1},{"key":"zz","order":1}]}',
        ),
      ),
    ).toBe(true);
    await settle(fixture);
    expect(keysOf(root)).toEqual(['c', 'a', 'b', 'd']);
    expect(host.changes.at(-1)?.source).toBe('api');
  });

  it('reads messages from the config', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideOgeTileLayoutConfig({ messages: { layoutLabel: 'Pano' } }),
      ],
    });
    const f = TestBed.createComponent(Host);
    await settle(f);
    expect(
      (f.nativeElement as HTMLElement)
        .querySelector('[role="list"]')
        ?.getAttribute('aria-label'),
    ).toBe('Pano');
  });
});

describe('OgeTileLayoutItem', () => {
  it('merges declarative children before the items and stamps their content', async () => {
    const fixture = TestBed.createComponent(DeclarativeHost);
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    const all = tiles(root);
    expect(all).toHaveLength(3);
    expect(all[0].getAttribute('data-oge-tile-key')).toBe('x');
    expect(all[0].querySelector('.oge-tile-layout-title b')?.textContent).toBe(
      'head',
    );
    expect(all[0].querySelector('.declared-body')?.textContent).toBe(
      'Body of x',
    );
    expect(all[1].textContent).toContain('Second');
    expect(all[1].getAttribute('data-oge-tile-key')).toMatch(/^t\d+$/);
    expect(all[2].getAttribute('data-oge-tile-key')).toBe('data');
    expect(
      (all[0].parentElement as HTMLElement).style.getPropertyValue(
        '--oge-tile-col-span',
      ),
    ).toBe('2');
  });
});
