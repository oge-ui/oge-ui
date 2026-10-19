import { fireEvent, render, screen } from '@testing-library/react';
import { OgeTabs } from './tabs';

/**
 * The sliding ink and the reorder FLIP — the React mirror of the Angular
 * `tabs-motion.spec.ts`. jsdom has no Web Animations API (motion off), so a
 * stub on `HTMLElement.prototype.animate` turns it on.
 */
interface AnimateCall {
  el: Element;
  keyframes: Keyframe[];
}

function stubAnimate(): { calls: AnimateCall[]; restore(): void } {
  const proto = HTMLElement.prototype as unknown as { animate?: unknown };
  const original = proto.animate;
  const calls: AnimateCall[] = [];
  proto.animate = function (this: Element, keyframes: Keyframe[]) {
    calls.push({ el: this, keyframes });
    return { finished: new Promise(() => undefined), cancel: () => undefined };
  };
  return {
    calls,
    restore() {
      if (original === undefined) delete proto.animate;
      else proto.animate = original;
    },
  };
}

const ITEMS = [
  { key: 'a', text: 'Alpha' },
  { key: 'b', text: 'Beta' },
  { key: 'c', text: 'Gamma' },
];

const tabs = (): HTMLElement[] => screen.getAllByRole('tab');

/** 100px slots by current DOM position, plus the stylesheet's underline. */
function layOut(): void {
  for (const tab of tabs()) {
    tab.style.borderBottom = '2px solid transparent';
    Object.defineProperty(tab, 'getBoundingClientRect', {
      configurable: true,
      value: () => {
        const index = Array.from(tab.parentElement?.children ?? []).indexOf(
          tab,
        );
        return {
          left: index * 100,
          right: index * 100 + 100,
          top: 0,
          bottom: 30,
          width: 100,
          height: 30,
          x: index * 100,
          y: 0,
          toJSON: () => ({}),
        };
      },
    });
  }
}

function pointer(type: string, clientX: number): PointerEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX,
  }) as unknown as PointerEvent;
  Object.defineProperty(event, 'pointerId', { value: 1 });
  return event;
}

const glides = (calls: AnimateCall[]) =>
  calls.filter((c) => c.el.classList.contains('oge-tab-ink-glide'));

describe('<OgeTabs> motion', () => {
  let stub: ReturnType<typeof stubAnimate> | null = null;
  afterEach(() => {
    stub?.restore();
    stub = null;
  });

  it('never glides on the first render', () => {
    stub = stubAnimate();
    const { container } = render(<OgeTabs items={ITEMS} />);
    expect(container.querySelector('.oge-tab-ink-glide')).toBeNull();
    expect(glides(stub.calls)).toHaveLength(0);
  });

  it('slides one ink bar from the old tab to the new one', () => {
    stub = stubAnimate();
    const { container, rerender } = render(
      <OgeTabs items={ITEMS} selectedIndex={0} />,
    );
    layOut();
    rerender(<OgeTabs items={ITEMS} selectedIndex={2} />);
    const list = container.querySelector('.oge-tab-strip-list');
    const bar = list?.querySelector('.oge-tab-ink-glide');
    expect(bar?.getAttribute('aria-hidden')).toBe('true');
    expect(list?.getAttribute('data-oge-indicator-glide')).toBe('run');
    const [glide] = glides(stub.calls);
    expect(glide.keyframes[0].transform).toBe(
      'translate(-200px, 0px) scale(1, 1)',
    );
  });

  it('just jumps without the Web Animations API (jsdom)', () => {
    const { container, rerender } = render(
      <OgeTabs items={ITEMS} selectedIndex={0} />,
    );
    layOut();
    rerender(<OgeTabs items={ITEMS} selectedIndex={1} />);
    expect(container.querySelector('.oge-tab-ink-glide')).toBeNull();
  });

  it('FLIPs the tabs a drag reorder moved', () => {
    stub = stubAnimate();
    render(<OgeTabs items={ITEMS} allowTabReordering />);
    layOut();
    const alpha = tabs()[0];
    fireEvent(alpha, pointer('pointerdown', 10));
    fireEvent(alpha, pointer('pointermove', 280));
    fireEvent(alpha, pointer('pointerup', 280));
    expect(tabs().map((t) => t.textContent?.trim())).toEqual([
      'Beta',
      'Gamma',
      'Alpha',
    ]);
    const moves = stub.calls.filter((c) => c.el.classList.contains('oge-tab'));
    expect(
      moves
        .map((c) => [c.el.textContent?.trim(), c.keyframes[0].transform])
        .sort(),
    ).toEqual([
      ['Alpha', 'translate(-200px, 0px)'],
      ['Beta', 'translate(100px, 0px)'],
      ['Gamma', 'translate(100px, 0px)'],
    ]);
  });
});
