import { resolveDropPosition } from './tree-view-dnd';
import { render, settle } from './tree-view-test-host';

/** jsdom has no layout: lay the rows out as 20px slots stacked from y=0. */
function stubRects(rows: HTMLElement[]): void {
  rows.forEach((row, index) => {
    row.getBoundingClientRect = () =>
      ({
        top: index * 20,
        bottom: index * 20 + 20,
        left: 0,
        right: 200,
        width: 200,
        height: 20,
        x: 0,
        y: index * 20,
        toJSON: () => ({}),
      }) as DOMRect;
  });
}

function pointer(
  target: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  clientY: number,
  clientX = 10,
): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
    button: 0,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  target.dispatchEvent(event);
}

describe('resolveDropPosition', () => {
  const rect = { top: 100, height: 20 };

  it('splits into before / inside / after when dropping inside is allowed', () => {
    expect(resolveDropPosition(102, rect, true)).toBe('before');
    expect(resolveDropPosition(110, rect, true)).toBe('inside');
    expect(resolveDropPosition(118, rect, true)).toBe('after');
  });

  it('splits at the midpoint when dropping inside is not allowed', () => {
    expect(resolveDropPosition(104, rect, false)).toBe('before');
    expect(resolveDropPosition(116, rect, false)).toBe('after');
  });
});

describe('OgeTreeView drag & drop', () => {
  async function draggable() {
    const api = await render((h) => {
      h.allowDragging.set(true);
      h.expandedKeys.set([1, 4]);
    });
    stubRects(api.rows());
    return api;
  }

  it('does not start a drag below the movement threshold', async () => {
    const { fixture, host, rows } = await draggable();
    pointer(rows()[0], 'pointerdown', 10);
    pointer(rows()[0], 'pointermove', 12);
    pointer(rows()[0], 'pointerup', 12);
    await settle(fixture);
    expect(host.reordered).toEqual([]);
  });

  it('drops a node inside another and reports the reparent', async () => {
    const { fixture, host, rows } = await draggable();
    // rows: 0 Documents, 1 Reports, 2 Photos, 3 Holiday
    pointer(rows()[1], 'pointerdown', 30);
    pointer(rows()[1], 'pointermove', 50); // past the threshold, over Photos
    await settle(fixture);
    pointer(rows()[1], 'pointerup', 50);
    await settle(fixture);

    expect(host.reordered).toHaveLength(1);
    expect(host.reordered[0]).toMatchObject({
      dragKey: 2,
      dropKey: 4,
      position: 'inside',
    });
  });

  it('resolves the edge zones to before / after', async () => {
    const { fixture, host, rows } = await draggable();
    pointer(rows()[1], 'pointerdown', 30);
    pointer(rows()[1], 'pointermove', 41); // top edge of the Photos row
    await settle(fixture);
    pointer(rows()[1], 'pointerup', 41);
    await settle(fixture);
    expect(host.reordered[0]).toMatchObject({ dropKey: 4, position: 'before' });
  });

  it('refuses to drop a node into its own subtree', async () => {
    const { fixture, host, rows } = await draggable();
    // drag Documents (row 0) onto its child Reports (row 1)
    pointer(rows()[0], 'pointerdown', 10);
    pointer(rows()[0], 'pointermove', 30);
    await settle(fixture);
    pointer(rows()[0], 'pointerup', 30);
    await settle(fixture);
    expect(host.reordered).toEqual([]);
  });

  it('marks the drop target while dragging', async () => {
    const { fixture, el, rows } = await draggable();
    pointer(rows()[1], 'pointerdown', 30);
    pointer(rows()[1], 'pointermove', 50);
    await settle(fixture);
    expect(el.querySelector('.oge-tree-view-item-drop-inside')).not.toBeNull();
    expect(el.querySelector('.oge-tree-view-item-dragging')).not.toBeNull();

    pointer(rows()[1], 'pointerup', 50);
    await settle(fixture);
    expect(el.querySelector('.oge-tree-view-item-drop-inside')).toBeNull();
  });

  it('honors the cancelable itemReordering pre-event', async () => {
    const { fixture, host, rows } = await draggable();
    host.tree().itemReordering.subscribe((e) => (e.cancel = true));
    pointer(rows()[1], 'pointerdown', 30);
    pointer(rows()[1], 'pointermove', 50);
    await settle(fixture);
    pointer(rows()[1], 'pointerup', 50);
    await settle(fixture);
    expect(host.reordered).toEqual([]);
  });

  it('does nothing while dragging is disabled', async () => {
    const { fixture, host, rows } = await render((h) =>
      h.expandedKeys.set([1, 4]),
    );
    stubRects(rows());
    pointer(rows()[1], 'pointerdown', 30);
    pointer(rows()[1], 'pointermove', 50);
    await settle(fixture);
    pointer(rows()[1], 'pointerup', 50);
    await settle(fixture);
    expect(host.reordered).toEqual([]);
  });
});
