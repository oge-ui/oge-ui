import { StrictMode, createRef, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type {
  OgeTileLayoutChangedEvent,
  OgeTileLayoutItemData,
  OgeTileLayoutReorderingEvent,
  OgeTileLayoutResizedEvent,
  OgeTileLayoutState,
} from '@oge-ui/behavior';
import { OgeTileLayout, type OgeTileLayoutHandle } from './tile-layout';
import { OgeTileLayoutConfigProvider } from './layout-config';

const ITEMS: OgeTileLayoutItemData[] = [
  { key: 'a', title: 'Alpha', colSpan: 2 },
  { key: 'b', title: 'Beta' },
  { key: 'c', title: 'Gamma', reorderable: false },
  { key: 'd' },
];

const tiles = () =>
  Array.from(document.querySelectorAll<HTMLElement>('.oge-tile-layout-tile'));
const keysOf = () => tiles().map((t) => t.getAttribute('data-oge-tile-key'));

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
  act(() => {
    el.dispatchEvent(event);
  });
}

describe('<OgeTileLayout>', () => {
  it('renders the list / group semantics with one tab stop', () => {
    render(
      <OgeTileLayout
        items={ITEMS}
        resizable
        renderContent={({ item }) => (
          <button type="button">Open {item.key}</button>
        )}
      />,
    );
    const list = screen.getByRole('list', { name: 'Dashboard' });
    expect(list.children).toHaveLength(4);
    const [a, , c, d] = tiles();
    expect(a).toHaveAttribute('role', 'group');
    expect(a).toHaveAttribute('aria-roledescription', 'tile');
    expect(screen.getByRole('group', { name: 'Alpha' })).toBe(a);
    expect(d).toHaveAttribute('aria-label', 'Tile 4');
    expect(a.getAttribute('aria-keyshortcuts')).toContain(
      'Control+Shift+ArrowDown',
    );
    expect(c.getAttribute('aria-keyshortcuts')).not.toContain(
      'Control+ArrowLeft',
    );
    expect(tiles().map((t) => t.tabIndex)).toEqual([0, -1, -1, -1]);
    expect(
      (a.parentElement as HTMLElement).style.getPropertyValue(
        '--oge-tile-col-span',
      ),
    ).toBe('2');
    expect(screen.getByRole('button', { name: 'Open b' })).toBeInTheDocument();
  });

  it('moves focus with arrows and moves / resizes with the keyboard twins', () => {
    const changes: OgeTileLayoutChangedEvent[] = [];
    const resized: OgeTileLayoutResizedEvent[] = [];
    render(
      <OgeTileLayout
        items={ITEMS}
        resizable
        locale="en-US"
        onLayoutChanged={(e) => changes.push(e)}
        onResized={(e) => resized.push(e)}
      />,
    );
    const [a, b] = tiles();
    a.focus();
    fireEvent.keyDown(a, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(b);
    fireEvent.keyDown(b, { key: 'Home' });
    expect(document.activeElement).toBe(a);
    fireEvent.keyDown(a, { key: 'ArrowRight', ctrlKey: true });
    expect(keysOf()).toEqual(['b', 'a', 'c', 'd']);
    expect(document.activeElement?.getAttribute('data-oge-tile-key')).toBe('a');
    expect(changes.at(-1)?.source).toBe('keyboard');
    const moved = tiles()[1];
    fireEvent.keyDown(moved, {
      key: 'ArrowRight',
      ctrlKey: true,
      shiftKey: true,
    });
    fireEvent.keyDown(moved, {
      key: 'ArrowRight',
      ctrlKey: true,
      shiftKey: true,
    });
    expect(resized.map((r) => r.next.colSpan)).toEqual([3, 4]);
  });

  it('honours the cancelable reordering event and inner content keys', () => {
    const veto = (e: OgeTileLayoutReorderingEvent) => {
      e.cancel = true;
    };
    render(
      <OgeTileLayout
        items={ITEMS}
        onReordering={veto}
        renderContent={() => <input aria-label="Field" />}
      />,
    );
    fireEvent.keyDown(tiles()[0], { key: 'ArrowRight', ctrlKey: true });
    fireEvent.keyDown(screen.getAllByLabelText('Field')[0], {
      key: 'ArrowRight',
      ctrlKey: true,
    });
    expect(keysOf()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('reorders by dragging a header and cancels with Escape', () => {
    const changes: OgeTileLayoutChangedEvent[] = [];
    render(
      <OgeTileLayout items={ITEMS} onLayoutChanged={(e) => changes.push(e)} />,
    );
    const all = tiles();
    [0, 220, 330, 440].forEach((left, i) => {
      all[i].getBoundingClientRect = () =>
        ({ left, top: 0, width: 100, height: 100 }) as DOMRect;
    });
    const header = all[0].querySelector('.oge-tile-layout-header')!;
    pointer(header, 'pointerdown', 10, 10);
    pointer(header, 'pointermove', 400, 20);
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });
    pointer(header, 'pointerup', 400, 20);
    expect(keysOf()).toEqual(['a', 'b', 'c', 'd']);

    pointer(header, 'pointerdown', 10, 10);
    pointer(header, 'pointermove', 240, 20);
    expect(all[0].className).toContain('oge-tile-layout-tile-dragged');
    expect(all[1].className).toContain('oge-tile-layout-tile-drop-target');
    pointer(header, 'pointerup', 240, 20);
    expect(keysOf()).toEqual(['b', 'a', 'c', 'd']);
    expect(changes.at(-1)?.source).toBe('pointer');
  });

  it('resizes with the corner handle', () => {
    const resized: OgeTileLayoutResizedEvent[] = [];
    render(
      <OgeTileLayout
        items={ITEMS}
        resizable
        onResized={(e) => resized.push(e)}
      />,
    );
    const [a] = tiles();
    a.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 210, height: 160 }) as DOMRect;
    const handle = a.querySelector('.oge-tile-layout-resize')!;
    expect(handle).toHaveAttribute('aria-hidden', 'true');
    pointer(handle, 'pointerdown', 210, 160);
    pointer(handle, 'pointermove', 330, 340);
    expect(
      (a.parentElement as HTMLElement).style.getPropertyValue(
        '--oge-tile-col-span',
      ),
    ).toBe('3');
    pointer(handle, 'pointerup', 330, 340);
    expect(resized[0]).toMatchObject({
      source: 'pointer',
      next: { colSpan: 3, rowSpan: 2 },
    });
  });

  it('is controllable and exposes the imperative handle', () => {
    const ref = createRef<OgeTileLayoutHandle>();
    const seen: OgeTileLayoutState[] = [];
    function Controlled() {
      const [state, setState] = useState<OgeTileLayoutState | undefined>();
      return (
        <OgeTileLayout
          ref={ref}
          items={ITEMS}
          resizable
          state={state}
          onStateChange={(s) => {
            seen.push(s);
            setState(s);
          }}
        />
      );
    }
    render(<Controlled />);
    act(() => {
      expect(ref.current!.moveTile('d', 0)).toBe(true);
    });
    expect(keysOf()).toEqual(['d', 'a', 'b', 'c']);
    act(() => {
      ref.current!.resizeTile('b', 9, 2);
    });
    expect(
      ref.current!.getState().tiles.find((t) => t.key === 'b'),
    ).toMatchObject({
      colSpan: 4,
      rowSpan: 2,
    });
    expect(ref.current!.applyState({ version: 3 })).toBe(false);
    act(() => {
      ref.current!.applyState(
        JSON.parse('{"version":1,"tiles":[{"key":"c","order":0}]}'),
      );
    });
    expect(keysOf()[0]).toBe('c');
    expect(seen).toHaveLength(3);
  });

  it('reads messages from the provider', () => {
    render(
      <OgeTileLayoutConfigProvider
        config={{ messages: { layoutLabel: 'Pano' } }}
      >
        <OgeTileLayout items={ITEMS} />
      </OgeTileLayoutConfigProvider>,
    );
    expect(screen.getByRole('list', { name: 'Pano' })).toBeInTheDocument();
  });

  it('survives StrictMode double effects', () => {
    render(
      <StrictMode>
        <OgeTileLayout items={ITEMS} />
      </StrictMode>,
    );
    const [a] = tiles();
    a.focus();
    fireEvent.keyDown(a, { key: 'ArrowRight', ctrlKey: true });
    expect(keysOf()).toEqual(['b', 'a', 'c', 'd']);
    expect(document.activeElement?.getAttribute('data-oge-tile-key')).toBe('a');
    const header = tiles()[0].querySelector('.oge-tile-layout-header')!;
    pointer(header, 'pointerdown', 0, 0);
    pointer(header, 'pointermove', 50, 0);
    pointer(header, 'pointerup', 50, 0);
    expect(keysOf()).toHaveLength(4);
  });
});
