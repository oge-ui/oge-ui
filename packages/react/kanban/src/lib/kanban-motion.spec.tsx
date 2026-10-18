import { act, render } from '@testing-library/react';
import { OgeKanban } from './kanban';

interface Task {
  id: number;
  status: string;
  title: string;
}

const TASKS: Task[] = [
  { id: 1, status: 'todo', title: 'One' },
  { id: 2, status: 'todo', title: 'Two' },
  { id: 3, status: 'doing', title: 'Three' },
];

interface FakeAnimation {
  el: Element;
  keyframes: Keyframe[];
  finish(): void;
}

const frames = () =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, 20)));

function place(el: Element, left: number, top: number): void {
  (el as HTMLElement).getBoundingClientRect = () =>
    ({
      left,
      top,
      width: 200,
      height: 80,
      right: left + 200,
      bottom: top + 80,
      x: left,
      y: top,
    }) as DOMRect;
}

function pointer(type: string, init: MouseEventInit): PointerEvent {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...init,
  }) as unknown as PointerEvent;
}

/**
 * Layout motion wiring with a Web Animations stub (jsdom has none — there
 * the board never animates): the drop settle and the FLIP of a move — the
 * same set as the Angular specs.
 */
describe('<OgeKanban> layout motion', () => {
  let calls: FakeAnimation[];
  let original: unknown;

  beforeEach(() => {
    calls = [];
    const proto = HTMLElement.prototype as unknown as { animate?: unknown };
    original = proto.animate;
    proto.animate = function (this: Element, keyframes: Keyframe[]) {
      let finish!: () => void;
      const finished = new Promise<void>((resolve) => (finish = resolve));
      calls.push({ el: this, keyframes, finish });
      return { finished, cancel: () => undefined };
    };
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });

  afterEach(() => {
    const proto = HTMLElement.prototype as unknown as { animate?: unknown };
    if (original === undefined) delete proto.animate;
    else proto.animate = original;
    vi.unstubAllGlobals();
  });

  function setup() {
    const { container } = render(
      <OgeKanban<Task>
        dataSource={TASKS}
        columns={[{ key: 'todo' }, { key: 'doing' }, { key: 'done' }]}
        virtualScrolling={false}
        keyExpr="id"
        columnExpr="status"
        titleExpr="title"
      />,
    );
    const card = (key: number) =>
      container.querySelector<HTMLElement>(
        `.oge-kanban-card[data-key="${key}"]`,
      );
    return { container, card };
  }

  it('Escape glides the lifted preview back onto its card', async () => {
    const { container, card } = setup();
    const one = card(1) as HTMLElement;
    act(() => {
      one.dispatchEvent(
        pointer('pointerdown', { button: 0, clientX: 10, clientY: 10 }),
      );
    });
    act(() => {
      document.dispatchEvent(
        pointer('pointermove', { clientX: 60, clientY: 60 }),
      );
    });
    place(one, 0, 120);
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }),
      );
    });
    const clone = container.querySelector<HTMLElement>('[data-oge-settling]');
    expect(clone).not.toBeNull();
    await frames();
    const glide = calls.find((call) => call.el === clone);
    expect(String(glide?.keyframes.at(-1)?.transform)).toContain(
      'translate(0px, 120px)',
    );
    expect(clone?.classList).toContain('oge-kanban-drag-settling');
    glide?.finish();
    await frames();
    expect(container.querySelector('[data-oge-settling]')).toBeNull();
  });

  it('a keyboard move glides the card from its old box', () => {
    const { card } = setup();
    place(card(1) as HTMLElement, 10, 50);
    place(card(2) as HTMLElement, 10, 150);
    act(() => {
      card(1)?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    const moved = calls.filter((call) => call.el === card(1));
    expect(moved).toHaveLength(1);
    expect(moved[0].keyframes[0].transform).toBe('translate(10px, 50px)');
    expect(calls.some((call) => call.el === card(2))).toBe(false);
  });
});
