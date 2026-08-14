import { act, fireEvent, render } from '@testing-library/react';
import { StrictMode, useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  OgeSplitter,
  type OgeSplitterHandle,
  type OgeSplitterPaneItem,
} from './splitter';
import { OgeSplitterConfigProvider } from './layout-config';

/**
 * The React mirror of the Angular splitter specs. jsdom lays nothing out, so a
 * splitter made only of share panes measures no pixels and falls back to a
 * unit-free scale of 100 — one "pixel" of drag is exactly one share point,
 * which is what makes these numbers readable. The one case that needs real
 * pixels stubs `getBoundingClientRect` the way the slider specs do.
 */

const root = (): HTMLElement =>
  document.querySelector('.oge-splitter') as HTMLElement;
const roots = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('.oge-splitter'));
const separators = (host: HTMLElement = root()): HTMLElement[] =>
  Array.from(
    host.querySelectorAll<HTMLElement>(':scope > .oge-splitter-separator'),
  );
const panes = (host: HTMLElement = root()): HTMLElement[] =>
  Array.from(host.querySelectorAll<HTMLElement>(':scope > .oge-splitter-pane'));
const grips = (separator: HTMLElement): HTMLElement[] =>
  Array.from(separator.querySelectorAll<HTMLElement>('.oge-splitter-grip'));
const template = (host: HTMLElement = root()): string =>
  host.style.gridTemplateColumns || host.style.gridTemplateRows;

function pointer(
  type: string,
  init: { clientX?: number; clientY?: number; button?: number } = {},
): PointerEvent {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...init,
  }) as unknown as PointerEvent;
}

function drag(
  separatorIndex: number,
  to: number,
  axis: 'x' | 'y' = 'x',
  host: HTMLElement = root(),
): void {
  const at = (value: number) =>
    axis === 'x' ? { clientX: value } : { clientY: value };
  act(() => {
    fireEvent(separators(host)[separatorIndex], pointer('pointerdown', at(0)));
    document.dispatchEvent(pointer('pointermove', at(to)));
    document.dispatchEvent(pointer('pointerup', at(to)));
  });
}

const even: OgeSplitterPaneItem[] = [
  { key: 'a', size: 50 },
  { key: 'b', size: 50 },
];

afterEach(() => vi.restoreAllMocks());

// --- rendering --------------------------------------------------------------

describe('OgeSplitter rendering', () => {
  it('renders one pane per entry and a separator between them', () => {
    render(<OgeSplitter panes={[{ key: 'a' }, { key: 'b' }, { key: 'c' }]} />);
    expect(panes()).toHaveLength(3);
    expect(separators()).toHaveLength(2);
  });

  it('drops panes with visible: false', () => {
    render(
      <OgeSplitter panes={[{ key: 'a' }, { key: 'b', visible: false }]} />,
    );
    expect(panes()).toHaveLength(1);
    expect(separators()).toHaveLength(0);
  });

  it('renders the empty message when there is nothing to show', () => {
    render(<OgeSplitter panes={[]} />);
    expect(document.querySelector('.oge-splitter-empty')?.textContent).toBe(
      'No panes to display',
    );
  });

  it('renders every orientation value on the matching grid axis', () => {
    const { rerender } = render(<OgeSplitter panes={even} />);
    expect(root().dataset['orientation']).toBe('horizontal');
    expect(root().style.gridTemplateColumns).not.toBe('');
    expect(root().style.gridTemplateRows).toBe('');

    rerender(<OgeSplitter panes={even} orientation="vertical" />);
    expect(root().dataset['orientation']).toBe('vertical');
    expect(root().style.gridTemplateRows).not.toBe('');
    expect(root().style.gridTemplateColumns).toBe('');
  });

  it('writes a track per pane and a fixed track per separator', () => {
    render(<OgeSplitter panes={even} />);
    expect(template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
  });

  it('treats sizes as ratios, not percentages', () => {
    render(
      <OgeSplitter
        panes={[
          { key: 'a', size: 30 },
          { key: 'b', size: 30 },
        ]}
      />,
    );
    expect(template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
  });

  it('pins a px size to a fixed track and shares out the rest', () => {
    render(
      <OgeSplitter
        panes={[{ key: 'a', size: '200px' }, { key: 'b' }, { key: 'c' }]}
      />,
    );
    expect(template()).toBe('200px 6px minmax(0, 50fr) 6px minmax(0, 50fr)');
  });

  it('reads a percent string as a share', () => {
    render(
      <OgeSplitter
        panes={[
          { key: 'a', size: '25%' },
          { key: 'b', size: '75%' },
        ]}
      />,
    );
    expect(template()).toBe('minmax(0, 25fr) 6px minmax(0, 75fr)');
  });

  it('warns about an unusable size and falls back to an even share', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<OgeSplitter panes={[{ key: 'a', size: '3rem' }, { key: 'b' }]} />);
    expect(template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
    warn.mockRestore();
  });

  it('honours the separatorSize prop', () => {
    render(<OgeSplitter panes={even} separatorSize={12} />);
    expect(template()).toBe('minmax(0, 50fr) 12px minmax(0, 50fr)');
  });

  it('lets sizes override the per-pane size entries', () => {
    render(
      <OgeSplitter
        panes={[
          { key: 'a', size: 50 },
          { key: 'b', size: 50 },
        ]}
        sizes={[80, 20]}
      />,
    );
    expect(template()).toBe('minmax(0, 80fr) 6px minmax(0, 20fr)');
  });

  it('marks scrollable panes and applies a custom class and attribute bag', () => {
    render(
      <OgeSplitter
        panes={[
          {
            key: 'a',
            scrollable: false,
            cssClass: 'mine',
            htmlAttributes: { 'data-role': 'nav' },
          },
          { key: 'b' },
        ]}
      />,
    );
    expect(panes()[0].classList.contains('oge-splitter-pane-scroll')).toBe(
      false,
    );
    expect(panes()[0].classList.contains('mine')).toBe(true);
    expect(panes()[0].getAttribute('data-role')).toBe('nav');
    expect(panes()[1].classList.contains('oge-splitter-pane-scroll')).toBe(
      true,
    );
  });

  it('renders a pane body from content, renderPane and text', () => {
    render(
      <OgeSplitter
        panes={[
          { key: 'a', content: <span>from content</span> },
          { key: 'b' },
          { key: 'c', text: 'plain' },
        ]}
        renderPane={(pane, index) =>
          pane.key === 'b' ? <em>rendered {index}</em> : undefined
        }
      />,
    );
    expect(panes()[0].textContent).toBe('from content');
    expect(panes()[1].textContent).toBe('rendered 1');
    // renderPane returning nothing still wins over `text` — same precedence
    // the Angular template gives its pane template.
    expect(panes()[2].textContent).toBe('');
  });

  it('renders a nested splitter for a pane with its own panes', () => {
    render(
      <OgeSplitter
        panes={[
          { key: 'left' },
          { key: 'right', panes: [{ key: 'top' }, { key: 'bottom' }] },
        ]}
      />,
    );
    expect(roots()).toHaveLength(2);
    // the nested splitter flips the axis
    expect(roots()[1].dataset['orientation']).toBe('vertical');
  });

  it('honours an explicit orientation on a nested pane', () => {
    render(
      <OgeSplitter
        panes={[
          { key: 'left' },
          {
            key: 'right',
            orientation: 'horizontal',
            panes: [{ key: 'x' }, { key: 'y' }],
          },
        ]}
      />,
    );
    expect(roots()[1].dataset['orientation']).toBe('horizontal');
  });

  it('honours the config provider and lets messages win over it', () => {
    const { rerender } = render(
      <OgeSplitterConfigProvider
        config={{ separatorSize: 10, messages: { noData: 'Boş' } }}
      >
        <OgeSplitter panes={[]} />
      </OgeSplitterConfigProvider>,
    );
    expect(document.querySelector('.oge-splitter-empty')?.textContent).toBe(
      'Boş',
    );

    rerender(
      <OgeSplitterConfigProvider
        config={{ separatorSize: 10, messages: { noData: 'Boş' } }}
      >
        <OgeSplitter panes={even} messages={{ separator: 'Sep {{first}}' }} />
      </OgeSplitterConfigProvider>,
    );
    expect(template()).toBe('minmax(0, 50fr) 10px minmax(0, 50fr)');
    expect(separators()[0].getAttribute('aria-label')).toBe('Sep 1');
  });

  it('survives a StrictMode remount', () => {
    render(
      <StrictMode>
        <OgeSplitter panes={even} />
      </StrictMode>,
    );
    expect(panes()).toHaveLength(2);
    expect(template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
    drag(0, 10);
    expect(template()).toBe('minmax(0, 60fr) 6px minmax(0, 40fr)');
  });
});

// --- pointer resize ---------------------------------------------------------

describe('OgeSplitter pointer resize', () => {
  interface Events {
    started: unknown[];
    moved: { sizes: readonly (number | string)[] }[];
    ended: {
      sizes: readonly (number | string)[];
      previousSizes: readonly (number | string)[];
    }[];
    committed: readonly (number | string)[][];
  }

  function newEvents(): Events {
    return { started: [], moved: [], ended: [], committed: [] };
  }

  function renderSplitter(
    paneList: readonly OgeSplitterPaneItem[],
    events: Events = newEvents(),
    extra: Record<string, unknown> = {},
  ) {
    render(
      <OgeSplitter
        panes={paneList}
        onResizeStarted={(e) => events.started.push(e)}
        onResized={(e) => events.moved.push(e)}
        onResizeEnded={(e) => events.ended.push(e)}
        onSizesChange={(sizes) => events.committed.push([...sizes])}
        {...extra}
      />,
    );
    return events;
  }

  it('moves both neighbours when a separator is dragged', () => {
    renderSplitter(even);
    drag(0, 10);
    expect(template()).toBe('minmax(0, 60fr) 6px minmax(0, 40fr)');
  });

  it('drags the other way for a negative delta', () => {
    renderSplitter(even);
    drag(0, -20);
    expect(template()).toBe('minmax(0, 30fr) 6px minmax(0, 70fr)');
  });

  it('publishes the result through onSizesChange when the gesture ends', () => {
    const events = renderSplitter(even);
    drag(0, 10);
    expect(events.committed.at(-1)).toEqual([60, 40]);
  });

  it('fires onResizeStarted once, onResized per move and onResizeEnded once', () => {
    const events = renderSplitter(even);
    act(() => {
      fireEvent(separators()[0], pointer('pointerdown', { clientX: 0 }));
      document.dispatchEvent(pointer('pointermove', { clientX: 5 }));
      document.dispatchEvent(pointer('pointermove', { clientX: 10 }));
      document.dispatchEvent(pointer('pointerup', { clientX: 10 }));
    });
    expect(events.started).toHaveLength(1);
    expect(events.moved).toHaveLength(2);
    expect(events.ended).toHaveLength(1);
    expect(events.moved[0].sizes).toEqual([55, 45]);
    expect(events.ended[0].sizes).toEqual([60, 40]);
    expect(events.ended[0].previousSizes).toEqual([50, 50]);
  });

  it('clamps to minSize and maxSize', () => {
    renderSplitter([
      { key: 'a', size: 50, minSize: 30, maxSize: 60 },
      { key: 'b', size: 50 },
    ]);
    drag(0, 40);
    expect(template()).toBe('minmax(0, 60fr) 6px minmax(0, 40fr)');
    drag(0, -40);
    expect(template()).toBe('minmax(0, 30fr) 6px minmax(0, 70fr)');
  });

  it('leaves the third pane alone', () => {
    renderSplitter([
      { key: 'a', size: 40 },
      { key: 'b', size: 30 },
      { key: 'c', size: 30 },
    ]);
    drag(0, 10);
    expect(template()).toBe(
      'minmax(0, 50fr) 6px minmax(0, 20fr) 6px minmax(0, 30fr)',
    );
  });

  it('reverts the gesture when Escape is pressed mid-drag', () => {
    const events = renderSplitter(even);
    act(() => {
      fireEvent(separators()[0], pointer('pointerdown', { clientX: 0 }));
      document.dispatchEvent(pointer('pointermove', { clientX: 20 }));
    });
    expect(template()).toBe('minmax(0, 70fr) 6px minmax(0, 30fr)');
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });
    expect(template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
    expect(events.ended).toHaveLength(1);
  });

  it('reverts on pointercancel', () => {
    renderSplitter(even);
    act(() => {
      fireEvent(separators()[0], pointer('pointerdown', { clientX: 0 }));
      document.dispatchEvent(pointer('pointermove', { clientX: 20 }));
      document.dispatchEvent(pointer('pointercancel', { clientX: 20 }));
    });
    expect(template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
  });

  it('reverts an in-flight drag when the window loses focus', () => {
    const events = renderSplitter(even);
    act(() => {
      fireEvent(separators()[0], pointer('pointerdown', { clientX: 0 }));
      document.dispatchEvent(pointer('pointermove', { clientX: 20 }));
    });
    expect(template()).toBe('minmax(0, 70fr) 6px minmax(0, 30fr)');
    act(() => window.dispatchEvent(new Event('blur')));
    expect(template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
    expect(events.ended).toHaveLength(1);
  });

  it('ignores a non-primary mouse button', () => {
    renderSplitter(even);
    act(() => {
      fireEvent(
        separators()[0],
        pointer('pointerdown', { clientX: 0, button: 2 }),
      );
      document.dispatchEvent(pointer('pointermove', { clientX: 20 }));
      document.dispatchEvent(pointer('pointerup', { clientX: 20 }));
    });
    expect(template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
  });

  it('follows the vertical axis when the orientation is vertical', () => {
    renderSplitter(even, newEvents(), { orientation: 'vertical' });
    drag(0, 10, 'y');
    expect(template()).toBe('minmax(0, 60fr) 6px minmax(0, 40fr)');
  });

  it('does not resize a pinned pane', () => {
    renderSplitter([
      { key: 'a', size: 50, resizable: false },
      { key: 'b', size: 50 },
    ]);
    drag(0, 20);
    expect(template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
  });

  it('does not resize while resizable is false or the splitter is disabled', () => {
    renderSplitter(even, newEvents(), { resizable: false });
    drag(0, 20);
    expect(template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
    expect(separators()[0].getAttribute('aria-disabled')).toBe('true');
  });

  it('inverts the delta in RTL so the separator follows the pointer', () => {
    renderSplitter(even);
    root().style.direction = 'rtl';
    drag(0, 20);
    expect(template()).toBe('minmax(0, 30fr) 6px minmax(0, 70fr)');
  });

  it('resizes a fixed pane in pixels against the measured container', () => {
    renderSplitter([
      { key: 'side', size: '200px', minSize: '120px' },
      { key: 'main', size: 100 },
    ]);
    // 806px host − 200px fixed − 6px separator = 600px of flexible space
    vi.spyOn(root(), 'getBoundingClientRect').mockReturnValue({
      width: 806,
      height: 400,
    } as DOMRect);

    drag(0, 50);
    expect(template()).toBe('250px 6px minmax(0, 100fr)');
    drag(0, -1000);
    expect(template()).toBe('120px 6px minmax(0, 100fr)');
  });

  it('does not write the same size twice while dragging past a stop', () => {
    const events = renderSplitter([
      { key: 'a', size: 50, maxSize: 60 },
      { key: 'b', size: 50 },
    ]);
    act(() => {
      fireEvent(separators()[0], pointer('pointerdown', { clientX: 0 }));
      document.dispatchEvent(pointer('pointermove', { clientX: 40 }));
      document.dispatchEvent(pointer('pointermove', { clientX: 60 }));
      document.dispatchEvent(pointer('pointermove', { clientX: 80 }));
      document.dispatchEvent(pointer('pointerup', { clientX: 80 }));
    });
    expect(events.moved).toHaveLength(1);
    expect(template()).toBe('minmax(0, 60fr) 6px minmax(0, 40fr)');
  });

  it('reads layout once per gesture, not once per pointermove', () => {
    renderSplitter([
      { key: 'a', size: 50 },
      { key: 'b', size: 25 },
      { key: 'c', size: 25 },
    ]);
    const real = window.getComputedStyle.bind(window);
    let calls = 0;
    vi.spyOn(window, 'getComputedStyle').mockImplementation(((
      el: Element,
      pseudo?: string | null,
    ) => {
      calls++;
      return real(el, pseudo ?? undefined);
    }) as typeof window.getComputedStyle);

    act(() => {
      fireEvent(separators()[0], pointer('pointerdown', { clientX: 100 }));
    });
    const afterStart = calls;
    act(() => {
      for (let i = 0; i < 40; i++) {
        document.dispatchEvent(pointer('pointermove', { clientX: 100 + i }));
      }
    });
    // not one style read across forty moves
    expect(calls - afterStart).toBe(0);
    act(() => {
      document.dispatchEvent(pointer('pointerup', { clientX: 140 }));
    });
  });
});

// --- keyboard ---------------------------------------------------------------

describe('OgeSplitter keyboard', () => {
  function key(
    separator: HTMLElement,
    name: string,
    init: KeyboardEventInit = {},
  ): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      key: name,
      bubbles: true,
      cancelable: true,
      ...init,
    });
    act(() => {
      fireEvent(separator, event);
    });
    return event;
  }

  it('moves the separator by step on Left and Right', () => {
    render(<OgeSplitter panes={even} />);
    key(separators()[0], 'ArrowRight');
    expect(template()).toBe('minmax(0, 55fr) 6px minmax(0, 45fr)');
    key(separators()[0], 'ArrowLeft');
    expect(template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
  });

  it('uses Up and Down on a vertical splitter', () => {
    render(<OgeSplitter panes={even} orientation="vertical" />);
    key(separators()[0], 'ArrowDown');
    expect(template()).toBe('minmax(0, 55fr) 6px minmax(0, 45fr)');
  });

  it('ignores the cross-axis arrows', () => {
    render(<OgeSplitter panes={even} />);
    key(separators()[0], 'ArrowDown');
    expect(template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
  });

  it('honours the step prop', () => {
    render(<OgeSplitter panes={even} step={20} />);
    key(separators()[0], 'ArrowRight');
    expect(template()).toBe('minmax(0, 70fr) 6px minmax(0, 30fr)');
  });

  it('mirrors the arrows in RTL', () => {
    render(<OgeSplitter panes={even} />);
    root().style.direction = 'rtl';
    key(separators()[0], 'ArrowRight');
    expect(template()).toBe('minmax(0, 45fr) 6px minmax(0, 55fr)');
  });

  it('jumps to the primary pane minimum on Home and its maximum on End', () => {
    render(
      <OgeSplitter
        panes={[
          { key: 'a', size: 50, minSize: 20, maxSize: 80 },
          { key: 'b', size: 50 },
        ]}
      />,
    );
    key(separators()[0], 'End');
    expect(template()).toBe('minmax(0, 80fr) 6px minmax(0, 20fr)');
    key(separators()[0], 'Home');
    expect(template()).toBe('minmax(0, 20fr) 6px minmax(0, 80fr)');
  });

  it('stops End at the neighbour minimum', () => {
    render(
      <OgeSplitter
        panes={[
          { key: 'a', size: 50 },
          { key: 'b', size: 50, minSize: 30 },
        ]}
      />,
    );
    key(separators()[0], 'End');
    expect(template()).toBe('minmax(0, 70fr) 6px minmax(0, 30fr)');
  });

  it('calls preventDefault on the keys it handles and not on others', () => {
    render(<OgeSplitter panes={even} />);
    expect(key(separators()[0], 'ArrowRight').defaultPrevented).toBe(true);
    expect(key(separators()[0], 'ArrowUp').defaultPrevented).toBe(false);
    expect(key(separators()[0], 'a').defaultPrevented).toBe(false);
  });

  it('fires the resize events for a keyboard nudge too', () => {
    const started: unknown[] = [];
    const moved: unknown[] = [];
    const ended: unknown[] = [];
    render(
      <OgeSplitter
        panes={even}
        onResizeStarted={(e) => started.push(e)}
        onResized={(e) => moved.push(e)}
        onResizeEnded={(e) => ended.push(e)}
      />,
    );
    key(separators()[0], 'ArrowRight');
    expect(started).toHaveLength(1);
    expect(moved).toHaveLength(1);
    expect(ended).toHaveLength(1);
  });

  it('emits nothing for a nudge that is already against the stop', () => {
    const moved: unknown[] = [];
    render(
      <OgeSplitter
        panes={[
          { key: 'a', size: 50, maxSize: 50 },
          { key: 'b', size: 50 },
        ]}
        onResized={(e) => moved.push(e)}
      />,
    );
    key(separators()[0], 'End');
    expect(moved).toHaveLength(0);
  });

  it('does nothing while keyboardNavigation is off, and drops the tab stop', () => {
    render(<OgeSplitter panes={even} keyboardNavigation={false} />);
    expect(separators()[0].tabIndex).toBe(-1);
    key(separators()[0], 'ArrowRight');
    expect(template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
  });
});

// --- accessibility ----------------------------------------------------------

describe('OgeSplitter accessibility', () => {
  it('gives each separator the APG role, orientation and tab stop', () => {
    render(<OgeSplitter panes={[{ key: 'a' }, { key: 'b' }, { key: 'c' }]} />);
    for (const separator of separators()) {
      expect(separator.getAttribute('role')).toBe('separator');
      expect(separator.getAttribute('aria-orientation')).toBe('horizontal');
      expect(separator.tabIndex).toBe(0);
    }
  });

  it('mirrors aria-orientation onto the vertical axis', () => {
    render(<OgeSplitter panes={even} orientation="vertical" />);
    expect(separators()[0].getAttribute('aria-orientation')).toBe('vertical');
  });

  it('points aria-controls at the primary (preceding) pane', () => {
    render(<OgeSplitter panes={[{ key: 'a' }, { key: 'b' }, { key: 'c' }]} />);
    expect(separators()[0].getAttribute('aria-controls')).toBe(panes()[0].id);
    expect(separators()[1].getAttribute('aria-controls')).toBe(panes()[1].id);
  });

  it('reports the primary pane size as aria-valuenow on a 0-100 scale', () => {
    render(
      <OgeSplitter
        panes={[
          { key: 'a', size: 30 },
          { key: 'b', size: 70 },
        ]}
      />,
    );
    expect(separators()[0].getAttribute('aria-valuenow')).toBe('30');
    expect(separators()[0].getAttribute('aria-valuemin')).toBe('0');
    expect(separators()[0].getAttribute('aria-valuemax')).toBe('100');
  });

  it('narrows valuemin and valuemax to the reachable range', () => {
    render(
      <OgeSplitter
        panes={[
          { key: 'a', size: 50, minSize: 20, maxSize: 70 },
          { key: 'b', size: 50, minSize: 10 },
        ]}
      />,
    );
    expect(separators()[0].getAttribute('aria-valuemin')).toBe('20');
    expect(separators()[0].getAttribute('aria-valuemax')).toBe('70');
  });

  it('keeps aria-valuenow in step with a resize', () => {
    render(<OgeSplitter panes={even} />);
    drag(0, 10);
    expect(separators()[0].getAttribute('aria-valuenow')).toBe('60');
  });

  it('labels the separator from the messages and marks it disabled when locked', () => {
    render(<OgeSplitter panes={even} resizable={false} />);
    expect(separators()[0].getAttribute('aria-label')).toBe(
      'Resize panes 1 and 2',
    );
    expect(separators()[0].getAttribute('aria-disabled')).toBe('true');
  });

  it('advertises Enter only when the primary pane is collapsible', () => {
    render(
      <OgeSplitter
        panes={[{ key: 'a', collapsible: true }, { key: 'b' }, { key: 'c' }]}
      />,
    );
    expect(separators()[0].getAttribute('aria-keyshortcuts')).toContain(
      'Enter',
    );
    expect(separators()[1].getAttribute('aria-keyshortcuts')).toBeNull();
  });

  it('advertises Ctrl+Arrow when only the following pane is collapsible', () => {
    render(
      <OgeSplitter panes={[{ key: 'a' }, { key: 'b', collapsible: true }]} />,
    );
    const shortcuts = separators()[0].getAttribute('aria-keyshortcuts');
    expect(shortcuts).toBe('Control+ArrowLeft Control+ArrowRight');
  });

  it('announces a collapsed primary pane in the separator label', () => {
    render(
      <OgeSplitter
        panes={[{ key: 'a', collapsible: true, collapsed: true }, { key: 'b' }]}
      />,
    );
    expect(separators()[0].getAttribute('aria-label')).toBe(
      'Resize panes 1 and 2 (collapsed)',
    );
  });

  it('keeps every decorative glyph out of the accessibility tree', () => {
    render(
      <OgeSplitter panes={[{ key: 'a', collapsible: true }, { key: 'b' }]} />,
    );
    const decorative = separators()[0].querySelectorAll(
      '.oge-splitter-separator-line, .oge-splitter-grip',
    );
    expect(decorative.length).toBeGreaterThan(0);
    for (const el of decorative) {
      expect(el.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('applies an ariaLabel to the container', () => {
    render(<OgeSplitter panes={even} ariaLabel="Workspace" />);
    expect(root().getAttribute('aria-label')).toBe('Workspace');
  });
});

// --- collapse ---------------------------------------------------------------

describe('OgeSplitter collapse', () => {
  const collapsible: OgeSplitterPaneItem[] = [
    { key: 'a', size: 50, collapsible: true },
    { key: 'b', size: 50 },
  ];

  function enter(index = 0): void {
    act(() => {
      fireEvent.keyDown(separators()[index], { key: 'Enter' });
    });
  }

  it('collapses the primary pane on Enter and restores it on the next Enter', () => {
    render(<OgeSplitter panes={collapsible} />);
    enter();
    expect(panes()[0].classList.contains('oge-splitter-pane-collapsed')).toBe(
      true,
    );
    expect(template()).toBe('0px 6px minmax(0, 100fr)');
    enter();
    expect(template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
  });

  it('restores the size the pane had at the moment it was collapsed', () => {
    render(<OgeSplitter panes={collapsible} />);
    drag(0, 20);
    expect(template()).toBe('minmax(0, 70fr) 6px minmax(0, 30fr)');
    enter();
    enter();
    expect(template()).toBe('minmax(0, 70fr) 6px minmax(0, 30fr)');
  });

  it('keeps a collapsedSize instead of going to zero', () => {
    render(
      <OgeSplitter
        panes={[
          { key: 'a', size: 50, collapsible: true, collapsedSize: '32px' },
          { key: 'b', size: 50 },
        ]}
      />,
    );
    enter();
    expect(template()).toBe('32px 6px minmax(0, 100fr)');
  });

  it('makes a collapsed pane inert rather than removing it', () => {
    render(<OgeSplitter panes={collapsible} />);
    enter();
    expect(panes()).toHaveLength(2);
    expect(panes()[0].hasAttribute('inert')).toBe(true);
  });

  it('hands focus to the separator when the focused pane collapses', () => {
    render(
      <OgeSplitter
        panes={[
          {
            key: 'a',
            size: 50,
            collapsible: true,
            content: <button type="button">inside</button>,
          },
          { key: 'b', size: 50 },
        ]}
      />,
    );
    const button = document.querySelector('button') as HTMLButtonElement;
    button.focus();
    expect(document.activeElement).toBe(button);
    enter();
    expect(document.activeElement).toBe(separators()[0]);
  });

  it('fires the cancelable pre-event before the past-tense one', () => {
    const order: string[] = [];
    render(
      <OgeSplitter
        panes={collapsible}
        onPaneCollapsing={() => order.push('collapsing')}
        onPaneCollapsed={() => order.push('collapsed')}
        onPaneExpanding={() => order.push('expanding')}
        onPaneExpanded={() => order.push('expanded')}
      />,
    );
    enter();
    enter();
    expect(order).toEqual(['collapsing', 'collapsed', 'expanding', 'expanded']);
  });

  it('blocks the change when the pre-event is canceled', () => {
    render(
      <OgeSplitter
        panes={collapsible}
        onPaneCollapsing={(e) => (e.cancel = true)}
      />,
    );
    enter();
    expect(template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
  });

  it('does nothing for a pane that is not collapsible', () => {
    render(<OgeSplitter panes={even} />);
    enter();
    expect(template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
  });

  it('seeds the collapsed state from a pane entry and follows later writes', () => {
    function Host() {
      const [collapsed, setCollapsed] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setCollapsed((c) => !c)}>
            flip
          </button>
          <OgeSplitter
            panes={[
              { key: 'a', size: 50, collapsible: true, collapsed },
              { key: 'b', size: 50 },
            ]}
          />
        </>
      );
    }
    render(<Host />);
    expect(template()).toBe('0px 6px minmax(0, 100fr)');
    act(() => {
      fireEvent.click(document.querySelector('button') as HTMLButtonElement);
    });
    expect(template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
  });

  it('locks the separator of a collapsed pane against dragging', () => {
    render(<OgeSplitter panes={collapsible} />);
    enter();
    expect(separators()[0].getAttribute('aria-disabled')).toBe('true');
    drag(0, 20);
    expect(template()).toBe('0px 6px minmax(0, 100fr)');
  });
});

// --- grips ------------------------------------------------------------------

describe('OgeSplitter collapse grips', () => {
  const both: OgeSplitterPaneItem[] = [
    { key: 'a', size: 50, collapsible: true },
    { key: 'b', size: 50, collapsible: true },
  ];

  it('renders one grip per collapsible neighbour', () => {
    render(<OgeSplitter panes={both} />);
    expect(grips(separators()[0]).map((g) => g.dataset['grip'])).toEqual([
      'start',
      'end',
    ]);
  });

  it('hides the grips behind showCollapseGrips', () => {
    render(<OgeSplitter panes={both} showCollapseGrips={false} />);
    expect(grips(separators()[0])).toHaveLength(0);
  });

  it('collapses the preceding pane from the start grip', () => {
    render(<OgeSplitter panes={both} />);
    act(() => {
      fireEvent.click(grips(separators()[0])[0]);
    });
    expect(template()).toBe('0px 6px minmax(0, 100fr)');
  });

  it('collapses the pane after the separator from the end grip', () => {
    render(<OgeSplitter panes={both} />);
    act(() => {
      fireEvent.click(grips(separators()[0])[1]);
    });
    expect(template()).toBe('minmax(0, 100fr) 6px 0px');
  });

  it('flips a grip chevron once its pane is collapsed', () => {
    render(<OgeSplitter panes={both} />);
    const before = grips(separators()[0])[0]
      .querySelector('path')
      ?.getAttribute('d');
    act(() => {
      fireEvent.click(grips(separators()[0])[0]);
    });
    const after = grips(separators()[0])[0]
      .querySelector('path')
      ?.getAttribute('d');
    expect(after).not.toBe(before);
  });

  it('toggles the primary pane from a double click on the bar', () => {
    render(<OgeSplitter panes={both} />);
    act(() => {
      fireEvent.doubleClick(separators()[0]);
    });
    expect(template()).toBe('0px 6px minmax(0, 100fr)');
  });

  it('Ctrl+Arrow collapses the pane the arrow points at', () => {
    render(<OgeSplitter panes={both} />);
    act(() => {
      fireEvent.keyDown(separators()[0], {
        key: 'ArrowRight',
        ctrlKey: true,
      });
    });
    expect(template()).toBe('minmax(0, 100fr) 6px 0px');
  });

  it('Ctrl+Arrow reaches a pane that Enter cannot', () => {
    render(
      <OgeSplitter
        panes={[
          { key: 'a', size: 50 },
          { key: 'b', size: 50, collapsible: true },
        ]}
      />,
    );
    act(() => {
      fireEvent.keyDown(separators()[0], { key: 'Enter' });
    });
    expect(template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
    act(() => {
      fireEvent.keyDown(separators()[0], { key: 'ArrowRight', ctrlKey: true });
    });
    expect(template()).toBe('minmax(0, 100fr) 6px 0px');
  });

  it('does not preventDefault a Ctrl+Arrow it cannot act on', () => {
    render(<OgeSplitter panes={even} />);
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      fireEvent(separators()[0], event);
    });
    expect(event.defaultPrevented).toBe(false);
  });
});

// --- pane pointer events and data source -----------------------------------

describe('OgeSplitter pane events', () => {
  it('fires onPaneClick for the clicked pane only, never through a nested one', () => {
    const clicks: number[] = [];
    render(
      <OgeSplitter
        panes={[
          { key: 'left', content: <span>left body</span> },
          { key: 'right', panes: [{ key: 'top' }, { key: 'bottom' }] },
        ]}
        onPaneClick={(e) => clicks.push(e.index)}
      />,
    );
    act(() => {
      fireEvent.click(document.querySelector('span') as HTMLElement);
    });
    expect(clicks).toEqual([0]);

    // a click inside the nested splitter must not reach the outer one
    clicks.length = 0;
    act(() => {
      fireEvent.click(panes(roots()[1])[0]);
    });
    expect(clicks).toEqual([]);
  });

  it('fires onPaneHold after itemHoldTimeout and cancels on pointerup', () => {
    vi.useFakeTimers();
    try {
      const holds: number[] = [];
      render(
        <OgeSplitter
          panes={even}
          itemHoldTimeout={300}
          onPaneHold={(e) => holds.push(e.index)}
        />,
      );
      act(() => {
        fireEvent(panes()[1], pointer('pointerdown'));
      });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(holds).toEqual([1]);

      holds.length = 0;
      act(() => {
        fireEvent(panes()[0], pointer('pointerdown'));
        fireEvent(panes()[0], pointer('pointerup'));
      });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(holds).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('fires onPaneContextMenu on right click, with the pane index', () => {
    const menus: number[] = [];
    render(
      <OgeSplitter
        panes={even}
        onPaneContextMenu={(e) => menus.push(e.index)}
      />,
    );
    act(() => {
      fireEvent.contextMenu(panes()[1]);
    });
    expect(menus).toEqual([1]);
  });

  it('loads panes from a dataSource, merged after panes', async () => {
    const source = {
      load: () =>
        Promise.resolve({ data: [{ key: 'remote-1' }, { key: 'remote-2' }] }),
    };
    render(<OgeSplitter panes={[{ key: 'local' }]} dataSource={source} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(panes()).toHaveLength(3);
    expect(panes()[0].id).toContain('local');
    expect(panes()[2].id).toContain('remote-2');
  });
});

// --- imperative handle and size reconciliation ------------------------------

describe('OgeSplitter handle and size reconciliation', () => {
  type HandleRef = { current: OgeSplitterHandle | null };

  /** The mounted handle, asserted once so the cases stay readable. */
  const api = (handle: HandleRef): OgeSplitterHandle => {
    if (!handle.current) throw new Error('splitter handle not attached');
    return handle.current;
  };

  function renderWithHandle(
    paneList: readonly OgeSplitterPaneItem[],
    extra: Record<string, unknown> = {},
  ): { current: OgeSplitterHandle | null } {
    const handle: { current: OgeSplitterHandle | null } = { current: null };
    render(<OgeSplitter ref={handle} panes={paneList} {...extra} />);
    return handle;
  }

  it('exposes resize() as the programmatic equivalent of an arrow key', () => {
    const handle = renderWithHandle(even);
    let result = false;
    act(() => {
      result = api(handle).resize(0, 15);
    });
    expect(result).toBe(true);
    expect(template()).toBe('minmax(0, 65fr) 6px minmax(0, 35fr)');
    act(() => {
      result = api(handle).resize(5, 15);
    });
    expect(result).toBe(false);
  });

  it('reports resize() as false when the separator cannot move further', () => {
    const handle = renderWithHandle([
      { key: 'a', size: 50, maxSize: 50 },
      { key: 'b', size: 50 },
    ]);
    let result = true;
    act(() => {
      result = api(handle).resize(0, 50);
    });
    expect(result).toBe(false);
  });

  it('collapses, expands, toggles and reports by index or key', () => {
    const handle = renderWithHandle([
      { key: 'a', size: 50, collapsible: true },
      { key: 'b', size: 50 },
    ]);
    act(() => {
      expect(api(handle).collapse('a')).toBe(true);
    });
    expect(api(handle).isCollapsed('a')).toBe(true);
    act(() => {
      expect(api(handle).expand(0)).toBe(true);
    });
    expect(api(handle).isCollapsed(0)).toBe(false);
    act(() => {
      expect(api(handle).toggle('a')).toBe(true);
    });
    expect(api(handle).isCollapsed('a')).toBe(true);
    expect(api(handle).collapse('nope')).toBe(false);
    expect(api(handle).isCollapsed('nope')).toBe(false);
  });

  it('does not collapse a pane that is not collapsible', () => {
    const handle = renderWithHandle(even);
    act(() => {
      expect(api(handle).collapse(0)).toBe(false);
    });
    expect(template()).toBe('minmax(0, 50fr) 6px minmax(0, 50fr)');
  });

  it('focuses a separator through focus()', () => {
    const handle = renderWithHandle([{ key: 'a' }, { key: 'b' }, { key: 'c' }]);
    act(() => api(handle).focus(1));
    expect(document.activeElement).toBe(separators()[1]);
  });

  it('keeps dragged sizes when an equal but newly created panes array arrives', () => {
    function Host({ children }: { children?: ReactNode }) {
      return <>{children}</>;
    }
    const handle: { current: OgeSplitterHandle | null } = { current: null };
    const { rerender } = render(
      <Host>
        <OgeSplitter
          ref={handle}
          panes={[
            { key: 'a', size: 50 },
            { key: 'b', size: 50 },
          ]}
        />
      </Host>,
    );
    act(() => {
      api(handle).resize(0, 20);
    });
    expect(template()).toBe('minmax(0, 70fr) 6px minmax(0, 30fr)');

    // what a parent re-render passing a fresh array literal does
    rerender(
      <Host>
        <OgeSplitter
          ref={handle}
          panes={[
            { key: 'a', size: 50 },
            { key: 'b', size: 50 },
          ]}
        />
      </Host>,
    );
    expect(template()).toBe('minmax(0, 70fr) 6px minmax(0, 30fr)');
  });

  it('does reset the sizes when a declared size genuinely changes', () => {
    const handle: { current: OgeSplitterHandle | null } = { current: null };
    const { rerender } = render(
      <OgeSplitter
        ref={handle}
        panes={[
          { key: 'a', size: 50 },
          { key: 'b', size: 50 },
        ]}
      />,
    );
    act(() => {
      api(handle).resize(0, 20);
    });
    rerender(
      <OgeSplitter
        ref={handle}
        panes={[
          { key: 'a', size: 25 },
          { key: 'b', size: 75 },
        ]}
      />,
    );
    expect(template()).toBe('minmax(0, 25fr) 6px minmax(0, 75fr)');
  });

  it('resets the sizes when the pane set itself changes', () => {
    const handle: { current: OgeSplitterHandle | null } = { current: null };
    const { rerender } = render(
      <OgeSplitter
        ref={handle}
        panes={[
          { key: 'a', size: 50 },
          { key: 'b', size: 50 },
        ]}
      />,
    );
    act(() => {
      api(handle).resize(0, 20);
    });
    rerender(
      <OgeSplitter
        ref={handle}
        panes={[
          { key: 'a', size: 50 },
          { key: 'b', size: 50 },
          { key: 'c', size: 50 },
        ]}
      />,
    );
    expect(template()).toBe(
      'minmax(0, 33.33fr) 6px minmax(0, 33.33fr) 6px minmax(0, 33.33fr)',
    );
  });

  it('drives a controlled sizes prop through onSizesChange', () => {
    function Host() {
      const [sizes, setSizes] = useState<readonly (number | string)[]>([
        50, 50,
      ]);
      return (
        <OgeSplitter panes={even} sizes={sizes} onSizesChange={setSizes} />
      );
    }
    render(<Host />);
    drag(0, 10);
    expect(template()).toBe('minmax(0, 60fr) 6px minmax(0, 40fr)');
    drag(0, 10);
    expect(template()).toBe('minmax(0, 70fr) 6px minmax(0, 30fr)');
  });

  it('lets a nested splitter inherit the container-level props', () => {
    render(
      <OgeSplitter
        panes={[
          { key: 'left' },
          { key: 'right', panes: [{ key: 'x' }, { key: 'y' }] },
        ]}
        separatorSize={10}
        step={20}
        disabled
      />,
    );
    const nested = roots()[1];
    expect(template(nested)).toBe('minmax(0, 50fr) 10px minmax(0, 50fr)');
    expect(nested.classList.contains('oge-disabled')).toBe(true);
  });

  it('tears an in-flight gesture down when the splitter unmounts', () => {
    const events: unknown[] = [];
    const { unmount } = render(
      <OgeSplitter panes={even} onResized={(e) => events.push(e)} />,
    );
    act(() => {
      fireEvent(separators()[0], pointer('pointerdown', { clientX: 0 }));
    });
    unmount();
    act(() => {
      document.dispatchEvent(pointer('pointermove', { clientX: 20 }));
    });
    expect(events).toHaveLength(0);
  });
});
