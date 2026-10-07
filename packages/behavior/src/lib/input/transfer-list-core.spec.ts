import { describe, expect, it } from 'vitest';
import {
  ogeTransferAnnouncement,
  ogeTransferCountText,
  ogeTransferDropSide,
  ogeTransferKeyCommand,
  ogeTransferKeyShortcuts,
  ogeTransferMovableValues,
  ogeTransferMove,
  ogeTransferOpposite,
  ogeTransferSplit,
  ogeTransferDropTarget,
  ogeTransferReorderable,
  ogeTransferReorderLine,
  ogeTransferReorderSource,
  ogeTransferReorderTarget,
} from './transfer-list-core';

const ITEMS = [
  { id: 'a', locked: false },
  { id: 'b', locked: true },
  { id: 'c', locked: false },
  { id: 'd', locked: false },
];
const id = (item: { id: string }) => item.id;
const locked = (item: { locked: boolean }) => item.locked;

describe('transfer list core', () => {
  it('splits by value: source in items order, target in arrival order', () => {
    const split = ogeTransferSplit(ITEMS, ['d', 'a', 'zz'], id);
    expect(split.source.map(id)).toEqual(['b', 'c']);
    expect(split.target.map(id)).toEqual(['d', 'a']);
  });

  it('moves append to the target and remove toward the source', () => {
    expect(ogeTransferMove(['a'], ['c', 'a', 'd'], 'target')).toEqual([
      'a',
      'c',
      'd',
    ]);
    expect(ogeTransferMove(['a', 'c', 'd'], ['c'], 'source')).toEqual([
      'a',
      'd',
    ]);
    expect(ogeTransferOpposite('source')).toBe('target');
    expect(ogeTransferOpposite('target')).toBe('source');
  });

  it('movable values skip disabled items; "all" means every shown item', () => {
    expect(
      ogeTransferMovableValues('selected', ITEMS, ['b', 'c'], id, locked),
    ).toEqual(['c']);
    expect(ogeTransferMovableValues('all', ITEMS, [], id, locked)).toEqual([
      'a',
      'c',
      'd',
    ]);
  });

  it('maps Ctrl+arrows toward the other list, mirrored in RTL', () => {
    expect(
      ogeTransferKeyCommand(
        { key: 'ArrowRight', ctrlKey: true },
        'source',
        false,
      ),
    ).toEqual({ scope: 'selected', from: 'source' });
    expect(
      ogeTransferKeyCommand(
        { key: 'ArrowRight', metaKey: true, shiftKey: true },
        'source',
        false,
      ),
    ).toEqual({ scope: 'all', from: 'source' });
    expect(
      ogeTransferKeyCommand(
        { key: 'ArrowLeft', ctrlKey: true },
        'source',
        false,
      ),
    ).toBeNull();
    expect(
      ogeTransferKeyCommand(
        { key: 'ArrowLeft', ctrlKey: true },
        'target',
        false,
      ),
    ).toEqual({ scope: 'selected', from: 'target' });
    expect(
      ogeTransferKeyCommand(
        { key: 'ArrowLeft', ctrlKey: true },
        'source',
        true,
      ),
    ).toEqual({ scope: 'selected', from: 'source' });
    expect(
      ogeTransferKeyCommand({ key: 'ArrowRight' }, 'source', false),
    ).toBeNull();
    expect(
      ogeTransferKeyCommand(
        { key: 'ArrowRight', ctrlKey: true, altKey: true },
        'source',
        false,
      ),
    ).toBeNull();
    expect(ogeTransferKeyShortcuts('source', false)).toBe(
      'Control+ArrowRight Control+Shift+ArrowRight',
    );
    expect(ogeTransferKeyShortcuts('target', true)).toBe(
      'Control+ArrowRight Control+Shift+ArrowRight',
    );
  });

  it('formats the announcement and count as ICU plurals (pinned locale)', () => {
    const template =
      '{count, plural, one {# item moved to {list}} other {# items moved to {list}}}';
    expect(ogeTransferAnnouncement(template, 1, 'Selected', 'en-US')).toBe(
      '1 item moved to Selected',
    );
    expect(ogeTransferAnnouncement(template, 1200, 'Selected', 'en-US')).toBe(
      '1,200 items moved to Selected',
    );
    expect(
      ogeTransferCountText(
        '{count, plural, one {# item} other {# items}}',
        2,
        'en-US',
      ),
    ).toBe('2 items');
  });

  it('resolves the drop side to the other pane of the same host only', () => {
    document.body.innerHTML = `
      <div class="oge-transfer-list" id="outer">
        <div data-oge-transfer-side="source"><span id="s">s</span></div>
        <div data-oge-transfer-side="target"><span id="t">t</span>
          <div class="oge-transfer-list" id="inner">
            <div data-oge-transfer-side="source"><span id="n">n</span></div>
          </div>
        </div>
      </div>`;
    const host = document.getElementById('outer')!;
    const at = (key: string) => document.getElementById(key);
    expect(ogeTransferDropSide(at('t'), host, 'source')).toBe('target');
    expect(ogeTransferDropSide(at('s'), host, 'source')).toBeNull();
    expect(ogeTransferDropSide(at('s'), host, 'target')).toBe('source');
    expect(ogeTransferDropSide(at('n'), host, 'target')).toBeNull();
    expect(ogeTransferDropSide(null, host, 'source')).toBeNull();
    document.body.innerHTML = '';
  });
});

describe('transfer list reordering', () => {
  it('reads allowReordering per side', () => {
    expect(ogeTransferReorderable(true, 'source')).toBe(true);
    expect(ogeTransferReorderable('target', 'source')).toBe(false);
    expect(ogeTransferReorderable('target', 'target')).toBe(true);
    expect(ogeTransferReorderable(false, 'target')).toBe(false);
  });

  it('refills only the source slots of the item order', () => {
    // a, c, d on the source; b on the target
    const next = ogeTransferReorderSource(
      ITEMS,
      [ITEMS[3], ITEMS[0], ITEMS[2]],
      ['b'],
      id,
    );
    expect(next.map(id)).toEqual(['d', 'b', 'a', 'c']);
  });

  it('orders the value like the target list and keeps unknown values', () => {
    expect(
      ogeTransferReorderTarget(['a', 'zz', 'c'], [ITEMS[2], ITEMS[0]], id),
    ).toEqual(['c', 'a', 'zz']);
  });

  it('resolves a move over the other pane, a reorder over its own list', () => {
    document.body.innerHTML = `
      <div class="oge-transfer-list" id="host">
        <div data-oge-transfer-side="source">
          <div role="listbox" id="list">
            <div class="oge-list-box-option" data-index="1"><span id="o">o</span></div>
          </div>
        </div>
        <div data-oge-transfer-side="target"><span id="t">t</span></div>
      </div>`;
    const host = document.getElementById('host')!;
    const list = document.getElementById('list')!;
    const option = list.firstElementChild as HTMLElement;
    option.getBoundingClientRect = () =>
      ({ top: 0, height: 20, bottom: 20, left: 4, width: 80 }) as DOMRect;
    const at = (key: string) => document.getElementById(key);
    expect(ogeTransferDropTarget(at('t'), host, 'source', list, 5)).toEqual({
      kind: 'move',
      side: 'target',
    });
    expect(ogeTransferDropTarget(at('o'), host, 'source', list, 15)).toEqual({
      kind: 'reorder',
      index: 1,
      position: 'after',
    });
    // not reorderable: no list, no reorder target
    expect(ogeTransferDropTarget(at('o'), host, 'source', null, 15)).toBeNull();
    const pane = list.parentElement as HTMLElement;
    pane.getBoundingClientRect = () =>
      ({ top: -10, left: 0, bottom: 200, width: 100 }) as DOMRect;
    expect(ogeTransferReorderLine(option, pane, 'after')).toEqual({
      top: 30,
      left: 4,
      width: 80,
    });
    document.body.innerHTML = '';
  });
});
