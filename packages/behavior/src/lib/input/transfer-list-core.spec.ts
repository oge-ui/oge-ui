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
