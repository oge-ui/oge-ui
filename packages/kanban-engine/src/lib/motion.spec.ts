import { afterEach, describe, expect, it, vi } from 'vitest';
import type { KanbanSwimlane } from './board-model';
import {
  createKanbanCardAnimator,
  kanbanCardElement,
  kanbanLayoutSignature,
  settleKanbanDragPreview,
} from './motion';

interface FakeAnimation {
  el: Element;
  keyframes: Keyframe[];
  finish(): void;
}

/** A Web Animations stub — jsdom has none, which is the motion-off case. */
function stubMotion(): { calls: FakeAnimation[]; restore(): void } {
  const calls: FakeAnimation[] = [];
  const proto = HTMLElement.prototype as unknown as { animate?: unknown };
  const original = proto.animate;
  proto.animate = function (this: Element, keyframes: Keyframe[]) {
    let finish!: () => void;
    const finished = new Promise<void>((resolve) => (finish = resolve));
    calls.push({ el: this, keyframes, finish });
    return { finished, cancel: () => undefined };
  };
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  return {
    calls,
    restore() {
      if (original === undefined) delete proto.animate;
      else proto.animate = original;
      vi.unstubAllGlobals();
    },
  };
}

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

function board(): HTMLElement {
  document.body.innerHTML = `
    <div class="oge-kanban" id="host">
      <div class="oge-kanban-card" data-key="a">A</div>
      <div class="oge-kanban-card" data-key="b">B</div>
      <div class="oge-kanban" id="nested">
        <div class="oge-kanban-card" data-key="c">C</div>
      </div>
      <div class="oge-kanban-drag-preview"><div class="oge-kanban-card" id="p">A</div></div>
    </div>`;
  const host = document.getElementById('host') as HTMLElement;
  place(host, 0, 0);
  return host;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  document.body.innerHTML = '';
});

describe('kanban motion', () => {
  it('finds a card of the board itself, never of a nested board', () => {
    const host = board();
    expect(kanbanCardElement(host, 'b')?.textContent).toBe('B');
    expect(kanbanCardElement(host, 'c')).toBeNull();
    expect(kanbanCardElement(null, 'a')).toBeNull();
  });

  it('signs the lane / column / card order only', () => {
    const lanes = (keys: string[]): KanbanSwimlane<unknown>[] => [
      {
        key: null,
        count: keys.length,
        columns: [
          {
            column: { key: 'todo' },
            cards: keys.map((key) => ({ key })),
          },
        ],
      } as unknown as KanbanSwimlane<unknown>,
    ];
    expect(kanbanLayoutSignature(lanes(['a', 'b']))).toBe(
      kanbanLayoutSignature(lanes(['a', 'b'])),
    );
    expect(kanbanLayoutSignature(lanes(['a', 'b']))).not.toBe(
      kanbanLayoutSignature(lanes(['b', 'a'])),
    );
  });

  it('is a no-op without Element.animate (SSR, jsdom)', async () => {
    const host = board();
    const to = vi.fn(() => null);
    settleKanbanDragPreview(host, to);
    await flush();
    expect(to).not.toHaveBeenCalled();
    expect(host.querySelectorAll('.oge-kanban-drag-preview')).toHaveLength(1);
  });

  it('FLIPs the moved cards, except the one under the settling preview', async () => {
    const motion = stubMotion();
    try {
      const host = board();
      const a = kanbanCardElement(host, 'a') as HTMLElement;
      const b = kanbanCardElement(host, 'b') as HTMLElement;
      const nested = host.querySelector('[data-key="c"]') as HTMLElement;
      place(a, 0, 0);
      place(b, 0, 100);
      place(nested, 0, 300);
      const animator = createKanbanCardAnimator(host);
      await animator.play(); // records the first layout
      animator.capture();
      place(a, 220, 0);
      place(b, 0, 0);
      place(nested, 0, 400);
      void animator.play({ exclude: ['a'] });
      expect(motion.calls.map((call) => call.el)).toEqual([b]);
      expect(String(motion.calls[0].keyframes[0].transform)).toBe(
        'translate(0px, 100px)',
      );
    } finally {
      motion.restore();
    }
  });

  it('settles a clone of the preview onto the card, then removes it', async () => {
    const motion = stubMotion();
    try {
      const host = board();
      const target = kanbanCardElement(host, 'b') as HTMLElement;
      place(target, 0, 100);
      settleKanbanDragPreview(host, () => target);
      const clones = host.querySelectorAll('[data-oge-settling]');
      expect(clones).toHaveLength(1);
      expect(clones[0].querySelector('[id]')).toBeNull();
      await flush();
      expect(clones[0].classList).toContain('oge-kanban-drag-settling');
      const settle = motion.calls.at(-1) as FakeAnimation;
      expect(settle.el).toBe(clones[0]);
      expect(String(settle.keyframes.at(-1)?.transform)).toContain(
        'translate(0px, 100px)',
      );
      settle.finish();
      await flush();
      expect(host.querySelector('[data-oge-settling]')).toBeNull();
    } finally {
      motion.restore();
    }
  });

  it('fades the clone where it is when the card is not rendered', async () => {
    const motion = stubMotion();
    try {
      const host = board();
      settleKanbanDragPreview(host, () => null);
      await flush();
      const fade = motion.calls.at(-1) as FakeAnimation;
      expect(fade.keyframes.at(-1)).toEqual({ opacity: 0 });
      fade.finish();
      await flush();
      expect(host.querySelector('[data-oge-settling]')).toBeNull();
    } finally {
      motion.restore();
    }
  });
});
