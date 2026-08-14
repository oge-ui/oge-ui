import { fireEvent, render, screen } from '@testing-library/react';
import { OgeTabs } from './tabs';

/**
 * Drag reordering of tab headers — the React mirror of the Angular
 * `tabs-reorder.spec.ts`: the gesture only starts past the movement
 * threshold, the drop index comes from the pointer position against the tab
 * rects, `onTabReordering` can veto it, Escape cancels an in-flight drag, and
 * the click that ends a drag is suppressed.
 */
const tabs = (): HTMLElement[] => screen.getAllByRole('tab');
const names = (): (string | undefined)[] =>
  tabs().map((t) => t.textContent?.trim());

const ITEMS = [
  { key: 'a', text: 'a' },
  { key: 'b', text: 'b' },
  { key: 'c', text: 'c' },
];

/** jsdom lays nothing out — give each tab a 100px-wide slot. */
function stubRects(): void {
  tabs().forEach((tab, index) => {
    Object.defineProperty(tab, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        left: index * 100,
        right: index * 100 + 100,
        top: 0,
        bottom: 40,
        width: 100,
        height: 40,
        x: index * 100,
        y: 0,
        toJSON: () => ({}),
      }),
    });
  });
}

function pointer(
  type: string,
  init: { clientX?: number; clientY?: number; pointerId?: number } = {},
): PointerEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...init,
  }) as unknown as PointerEvent;
  Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 });
  return event;
}

/** Presses on `tab`, moves past the threshold to `x`, and releases. */
function drag(tab: HTMLElement, x: number, options = { release: true }): void {
  fireEvent(tab, pointer('pointerdown', { clientX: 0, clientY: 0 }));
  fireEvent(tab, pointer('pointermove', { clientX: x, clientY: 0 }));
  if (options.release) {
    fireEvent(tab, pointer('pointerup', { clientX: x, clientY: 0 }));
  }
}

describe('<OgeTabs> drag reorder', () => {
  it('dragging the first tab past the last reorders to b, c, a', () => {
    const reordered = vi.fn();
    render(
      <OgeTabs items={ITEMS} allowTabReordering onTabReordered={reordered} />,
    );
    stubRects();
    drag(tabs()[0], 250);
    expect(reordered).toHaveBeenCalledTimes(1);
    expect(reordered.mock.calls[0][0]).toMatchObject({
      fromIndex: 0,
      toIndex: 2,
      key: 'a',
    });
    expect(names()).toEqual(['b', 'c', 'a']);
  });

  it('marks the dragged tab while the gesture is past the threshold', () => {
    render(<OgeTabs items={ITEMS} allowTabReordering />);
    stubRects();
    drag(tabs()[0], 250, { release: false });
    expect(document.querySelector('.oge-tab-dragging')).not.toBeNull();
    fireEvent(tabs()[0], pointer('pointerup', { clientX: 250 }));
    expect(document.querySelector('.oge-tab-dragging')).toBeNull();
  });

  it('a canceled onTabReordering keeps the order', () => {
    const reordered = vi.fn();
    render(
      <OgeTabs
        items={ITEMS}
        allowTabReordering
        onTabReordering={(event) => (event.cancel = true)}
        onTabReordered={reordered}
      />,
    );
    stubRects();
    drag(tabs()[0], 250);
    expect(reordered).not.toHaveBeenCalled();
    expect(names()).toEqual(['a', 'b', 'c']);
  });

  it('a sub-threshold press stays a click and still selects', () => {
    const reordered = vi.fn();
    const changed = vi.fn();
    render(
      <OgeTabs
        items={ITEMS}
        allowTabReordering
        onTabReordered={reordered}
        onSelectionChanged={changed}
      />,
    );
    stubRects();
    const second = tabs()[1];
    fireEvent(second, pointer('pointerdown', { clientX: 100, clientY: 0 }));
    fireEvent(second, pointer('pointermove', { clientX: 102, clientY: 0 }));
    fireEvent(second, pointer('pointerup', { clientX: 102, clientY: 0 }));
    fireEvent.click(second);
    expect(reordered).not.toHaveBeenCalled();
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('suppresses the click that follows a drag', () => {
    const changed = vi.fn();
    render(
      <OgeTabs items={ITEMS} allowTabReordering onSelectionChanged={changed} />,
    );
    stubRects();
    const third = tabs()[2];
    drag(third, 10);
    fireEvent.click(third);
    expect(changed).not.toHaveBeenCalled();
  });

  it('Escape cancels an in-flight drag', () => {
    const reordered = vi.fn();
    render(
      <OgeTabs items={ITEMS} allowTabReordering onTabReordered={reordered} />,
    );
    stubRects();
    drag(tabs()[0], 250, { release: false });
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent(tabs()[0], pointer('pointerup', { clientX: 250 }));
    expect(reordered).not.toHaveBeenCalled();
    expect(names()).toEqual(['a', 'b', 'c']);
  });

  it('does nothing without allowTabReordering', () => {
    const reordered = vi.fn();
    render(<OgeTabs items={ITEMS} onTabReordered={reordered} />);
    stubRects();
    drag(tabs()[0], 250);
    expect(reordered).not.toHaveBeenCalled();
  });
});
