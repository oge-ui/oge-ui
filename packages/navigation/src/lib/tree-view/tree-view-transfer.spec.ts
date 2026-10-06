import {
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChildren,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OgeTreeView } from './tree-view';
import type {
  OgeTreeReorderedEvent,
  OgeTreeReorderingEvent,
  OgeTreeTransferredEvent,
} from './tree-view-types';
import { FLAT, key, settle, type Node } from './tree-view-test-host';

/** jsdom has no layout: lay each tree's rows out as 20px slots from `top`. */
function stubRects(rows: HTMLElement[], top: number): void {
  rows.forEach((row, index) => {
    row.getBoundingClientRect = () =>
      ({
        top: top + index * 20,
        bottom: top + index * 20 + 20,
        left: 0,
        right: 200,
        width: 200,
        height: 20,
        x: 0,
        y: top + index * 20,
        toJSON: () => ({}),
      }) as DOMRect;
  });
}

function pointer(target: Element, type: string, clientY: number): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: 10,
    clientY,
    button: 0,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  target.dispatchEvent(event);
}

const TARGET: Node[] = [
  { id: 10, parentId: null, name: 'Inbox' },
  { id: 11, parentId: null, name: 'Archive' },
];

@Component({
  selector: 'oge-transfer-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeTreeView],
  template: `
    <oge-tree-view
      treeId="source-tree"
      [items]="source"
      displayExpr="name"
      [rootValue]="null"
      [allowDragging]="true"
      [dragGroup]="group()"
      [expandedKeys]="[1]"
      (itemTransferred)="transferred.push($event)"
      (itemReordered)="sourceReordered.push($event)"
    />
    <oge-tree-view
      treeId="target-tree"
      [items]="target"
      displayExpr="name"
      [rootValue]="null"
      [allowDragging]="true"
      [dragGroup]="group()"
      (itemReordering)="onReordering($event)"
      (itemReordered)="reordered.push($event)"
    />
  `,
})
class TransferHost {
  readonly trees = viewChildren(OgeTreeView<Node>);
  readonly source = FLAT;
  readonly target = TARGET;
  readonly group = signal<string | undefined>('files');
  cancel = false;
  readonly transferred: OgeTreeTransferredEvent<Node>[] = [];
  readonly sourceReordered: OgeTreeReorderedEvent<Node>[] = [];
  readonly reordered: OgeTreeReorderedEvent<Node>[] = [];
  onReordering(event: OgeTreeReorderingEvent<Node>): void {
    if (this.cancel) event.cancel = true;
  }
}

async function renderPair(setup?: (host: TransferHost) => void) {
  const fixture = TestBed.createComponent(TransferHost);
  setup?.(fixture.componentInstance);
  document.body.appendChild(fixture.nativeElement);
  await settle(fixture);
  const hosts = Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
      'oge-tree-view',
    ),
  );
  const rowsOf = (index: number) =>
    Array.from(
      hosts[index].querySelectorAll<HTMLElement>('.oge-tree-view-item'),
    );
  return { fixture, host: fixture.componentInstance, rowsOf };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('OgeTreeView drag between trees', () => {
  it('drops a node of one tree onto a row of another of the same group', async () => {
    const { fixture, host, rowsOf } = await renderPair();
    stubRects(rowsOf(0), 0);
    stubRects(rowsOf(1), 200);
    // source rows: Documents, Reports, Photos — drag Reports (key 2)
    pointer(rowsOf(0)[1], 'pointerdown', 30);
    pointer(rowsOf(1)[0], 'pointermove', 210);
    await settle(fixture);
    expect(
      rowsOf(1)[0].classList.contains('oge-tree-view-item-drop-inside'),
    ).toBe(true);
    expect(rowsOf(0)[1].classList.contains('oge-tree-view-item-dragging')).toBe(
      true,
    );
    pointer(rowsOf(1)[0], 'pointerup', 210);
    await settle(fixture);

    expect(host.reordered).toHaveLength(1);
    expect(host.reordered[0]).toMatchObject({
      dragKey: 2,
      dragItem: { name: 'Reports' },
      dropKey: 10,
      position: 'inside',
      sourceTreeId: 'source-tree',
      targetTreeId: 'target-tree',
      trigger: 'pointer',
    });
    expect(host.transferred).toHaveLength(1);
    expect(host.transferred[0]).toMatchObject({ dragKey: 2, dropKey: 10 });
    expect(host.sourceReordered).toEqual([]);
    expect(rowsOf(1)[0].className).not.toContain('drop-inside');
  });

  it('ignores trees of another group', async () => {
    const { fixture, host, rowsOf } = await renderPair((h) =>
      h.group.set(undefined),
    );
    stubRects(rowsOf(0), 0);
    stubRects(rowsOf(1), 200);
    pointer(rowsOf(0)[1], 'pointerdown', 30);
    pointer(rowsOf(1)[0], 'pointermove', 210);
    await settle(fixture);
    pointer(rowsOf(1)[0], 'pointerup', 210);
    await settle(fixture);
    expect(host.reordered).toEqual([]);
    expect(host.transferred).toEqual([]);
  });

  it('honours the target’s cancelable itemReordering', async () => {
    const { fixture, host, rowsOf } = await renderPair(
      (h) => (h.cancel = true),
    );
    stubRects(rowsOf(0), 0);
    stubRects(rowsOf(1), 200);
    pointer(rowsOf(0)[1], 'pointerdown', 30);
    pointer(rowsOf(1)[0], 'pointermove', 210);
    await settle(fixture);
    pointer(rowsOf(1)[0], 'pointerup', 210);
    await settle(fixture);
    expect(host.reordered).toEqual([]);
    expect(host.transferred).toEqual([]);
  });

  it('moves with Ctrl+X in one tree and Ctrl+V in the other', async () => {
    const { fixture, host, rowsOf } = await renderPair();
    const reports = rowsOf(0)[1];
    reports.focus();
    key(reports, 'x', { ctrlKey: true });
    await settle(fixture);
    expect(reports.classList.contains('oge-tree-view-item-cut')).toBe(true);
    expect(reports.getAttribute('aria-keyshortcuts')).toContain('Control+X');

    const archive = rowsOf(1)[1];
    archive.focus();
    key(archive, 'v', { ctrlKey: true, shiftKey: true });
    await settle(fixture);
    expect(host.reordered[0]).toMatchObject({
      dragKey: 2,
      dropKey: 11,
      position: 'after',
      trigger: 'keyboard',
      sourceTreeId: 'source-tree',
      targetTreeId: 'target-tree',
    });
    expect(host.transferred).toHaveLength(1);
    expect(rowsOf(0)[1].classList.contains('oge-tree-view-item-cut')).toBe(
      false,
    );
  });

  it('announces the keyboard move through the live announcer', async () => {
    const { fixture, rowsOf } = await renderPair();
    rowsOf(0)[1].focus();
    key(rowsOf(0)[1], 'x', { ctrlKey: true });
    rowsOf(1)[0].focus();
    key(rowsOf(1)[0], 'v', { ctrlKey: true });
    await settle(fixture);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const region = document.querySelector('[data-oge-live-announcer="polite"]');
    expect(region?.textContent).toContain('Reports moved into Inbox.');
  });

  it('Escape drops a pending cut', async () => {
    const { fixture, host, rowsOf } = await renderPair();
    rowsOf(0)[1].focus();
    key(rowsOf(0)[1], 'x', { ctrlKey: true });
    await settle(fixture);
    key(rowsOf(0)[1], 'Escape');
    await settle(fixture);
    expect(rowsOf(0)[1].className).not.toContain('item-cut');
    key(rowsOf(1)[0], 'v', { ctrlKey: true });
    expect(host.reordered).toEqual([]);
  });

  it('exposes cutItem / pasteItem as the single-pointer twin', async () => {
    const { fixture, host } = await renderPair();
    const [source, target] = host.trees();
    expect(source.cutItem(4)).toBe(true);
    expect(target.pasteItem(10)).toBe(true);
    await settle(fixture);
    expect(host.reordered[0]).toMatchObject({
      dragKey: 4,
      dropKey: 10,
      position: 'inside',
      trigger: 'keyboard',
    });
  });
});
