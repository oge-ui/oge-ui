import { act, fireEvent, render } from '@testing-library/react';
import { StrictMode, createRef, useState } from 'react';
import {
  OgeListBox,
  type OgeListBoxHandle,
  type OgeListBoxReorderedEvent,
} from './list-box';
import {
  OgeTransferList,
  type OgeTransferListReorderedEvent,
} from './transfer-list';
import type { OgeTransferListReorderSides } from '@oge-ui/behavior';

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

const names = (root: ParentNode = document) =>
  Array.from(root.querySelectorAll('[role="option"]')).map((o) =>
    o.textContent?.trim(),
  );

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

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('OgeListBox — reordering', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      setTimeout(() => cb(0), 0),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('Alt+ArrowDown moves the active option and announces (StrictMode)', async () => {
    const moves: OgeListBoxReorderedEvent<City>[] = [];
    render(
      <StrictMode>
        <OgeListBox
          label="Cities"
          items={CITIES}
          displayExpr="name"
          valueExpr="id"
          disabledExpr="closed"
          allowReordering
          onReordered={(event) => moves.push(event)}
        />
      </StrictMode>,
    );
    const list = document.querySelector('[role="listbox"]') as HTMLElement;
    expect(list.getAttribute('aria-keyshortcuts')).toBe(
      'Alt+ArrowUp Alt+ArrowDown',
    );
    await act(async () => {
      list.focus();
    });
    await act(async () => {
      fireEvent.keyDown(list, { key: 'ArrowDown', altKey: true });
    });
    expect(names()).toEqual(['Berlin', 'Ankara', 'Bonn', 'İzmir']);
    expect(moves.at(-1)).toMatchObject({
      fromIndex: 0,
      toIndex: 1,
      cause: 'keyboard',
    });
    const options = document.querySelectorAll('[role="option"]');
    expect(list.getAttribute('aria-activedescendant')).toBe(options[1].id);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });
    const region = document.querySelector('[data-oge-live-announcer="polite"]');
    expect(region?.textContent).toContain('Ankara moved to position 2 of 4');
  });

  it('a cancelled onReordering keeps the order', async () => {
    render(
      <OgeListBox
        items={CITIES}
        displayExpr="name"
        allowReordering
        onReordering={(event) => {
          event.cancel = true;
        }}
      />,
    );
    const list = document.querySelector('[role="listbox"]') as HTMLElement;
    await act(async () => {
      list.focus();
    });
    await act(async () => {
      fireEvent.keyDown(list, { key: 'ArrowDown', altKey: true });
    });
    expect(names()).toEqual(['Ankara', 'Berlin', 'Bonn', 'İzmir']);
  });

  it('a pointer drag drops before / after another option', async () => {
    const moves: OgeListBoxReorderedEvent<City>[] = [];
    render(
      <OgeListBox
        items={CITIES}
        displayExpr="name"
        disabledExpr="closed"
        allowReordering
        onReordered={(event) => moves.push(event)}
      />,
    );
    const options = () =>
      document.querySelectorAll<HTMLElement>('[role="option"]');
    const [ankara, , bonn] = Array.from(options());
    await act(async () => {
      pointer('pointerdown', ankara, 10, 2);
      pointer('pointermove', bonn, 10, 8);
      pointer('pointermove', bonn, 10, 12);
    });
    expect(options()[2].classList).toContain('oge-list-box-option-drop-after');
    await act(async () => {
      pointer('pointerup', bonn, 10, 12);
    });
    expect(names()).toEqual(['Berlin', 'Bonn', 'Ankara', 'İzmir']);
    expect(moves.at(-1)).toMatchObject({ toIndex: 2, cause: 'drag' });
    expect(
      document.querySelector('.oge-list-box-option-drop-after'),
    ).toBeNull();
    await act(tick);
  });

  it('reorderItem() runs the same path; a new items array resets it', async () => {
    const ref = createRef<OgeListBoxHandle<City>>();
    function Host() {
      const [items, setItems] = useState(CITIES);
      return (
        <>
          <OgeListBox
            ref={ref}
            items={items}
            displayExpr="name"
            allowReordering
          />
          <button type="button" onClick={() => setItems([...CITIES])}>
            reset
          </button>
        </>
      );
    }
    render(<Host />);
    let moved = false;
    await act(async () => {
      moved = ref.current!.reorderItem(CITIES[3], CITIES[0], 'before');
    });
    expect(moved).toBe(true);
    expect(names()).toEqual(['İzmir', 'Ankara', 'Berlin', 'Bonn']);
    await act(async () => {
      fireEvent.click(document.querySelector('button') as HTMLElement);
    });
    expect(names()).toEqual(['Ankara', 'Berlin', 'Bonn', 'İzmir']);
  });
});

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

function TransferHost(props: {
  allow: OgeTransferListReorderSides;
  onReordered?: (event: OgeTransferListReorderedEvent<Perm>) => void;
  onValue?: (value: readonly unknown[]) => void;
}) {
  const [value, setValue] = useState<readonly unknown[]>(['share', 'admin']);
  return (
    <OgeTransferList
      items={PERMS}
      displayExpr="name"
      valueExpr="id"
      allowReordering={props.allow}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        props.onValue?.(next);
      }}
      onReordered={props.onReordered}
    />
  );
}

describe('OgeTransferList — reordering', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      setTimeout(() => cb(0), 0),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  const pane = (side: 'source' | 'target') =>
    document.querySelector(`[data-oge-transfer-side="${side}"]`) as HTMLElement;
  const listOf = (side: 'source' | 'target') =>
    pane(side).querySelector('[role="listbox"]') as HTMLElement;

  it('Alt+ArrowDown on the target reorders the value', async () => {
    const values: (readonly unknown[])[] = [];
    const reorders: OgeTransferListReorderedEvent<Perm>[] = [];
    render(
      <TransferHost
        allow
        onValue={(v) => values.push(v)}
        onReordered={(event) => reorders.push(event)}
      />,
    );
    const list = listOf('target');
    await act(async () => {
      list.focus();
    });
    await act(async () => {
      fireEvent.keyDown(list, { key: 'ArrowDown', altKey: true });
    });
    expect(values.at(-1)).toEqual(['admin', 'share']);
    expect(names(pane('target'))).toEqual(['Admin', 'Share']);
    expect(reorders.at(-1)).toMatchObject({
      side: 'target',
      cause: 'keyboard',
      value: ['admin', 'share'],
    });
  });

  it('opts in per side', () => {
    render(<TransferHost allow="target" />);
    expect(listOf('source').getAttribute('aria-keyshortcuts')).not.toContain(
      'Alt+ArrowUp',
    );
    expect(listOf('target').getAttribute('aria-keyshortcuts')).toContain(
      'Alt+ArrowUp',
    );
  });

  it('one drag: inside its own list it reorders, over the other it moves', async () => {
    const values: (readonly unknown[])[] = [];
    render(<TransferHost allow onValue={(v) => values.push(v)} />);
    const option = (index: number) =>
      pane('source').querySelectorAll<HTMLElement>('[role="option"]')[index];
    const write = option(1);
    await act(async () => {
      pointer('pointerdown', option(0), 10, 2);
      pointer('pointermove', write, 10, 8);
      pointer('pointermove', write, 10, 12);
    });
    expect(
      pane('source').querySelector('.oge-transfer-list-reorder-line'),
    ).not.toBeNull();
    await act(async () => {
      pointer('pointerup', write, 10, 12);
    });
    expect(names(pane('source'))).toEqual(['Write', 'Read']);
    expect(values).toEqual([]);
    expect(
      pane('source').querySelector('.oge-transfer-list-reorder-line'),
    ).toBeNull();
    await act(tick);

    const target = listOf('target');
    await act(async () => {
      pointer('pointerdown', option(0), 10, 2);
      pointer('pointermove', target, 60, 10);
      pointer('pointermove', target, 80, 12);
      pointer('pointerup', target, 80, 12);
    });
    expect(values.at(-1)).toEqual(['share', 'admin', 'write']);
    await act(tick);
  });
});
