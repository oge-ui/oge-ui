import { beginKanbanGesture } from './gesture';

function pointer(type: string, x: number, y: number): PointerEvent {
  const event = new MouseEvent(type, {
    clientX: x,
    clientY: y,
    bubbles: true,
    cancelable: true,
  }) as unknown as PointerEvent;
  Object.defineProperty(event, 'pointerId', { value: 1 });
  return event;
}

function start() {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const down = pointer('pointerdown', 10, 10);
  Object.defineProperty(down, 'target', { value: target });
  const moves: number[][] = [];
  const finishes: boolean[][] = [];
  beginKanbanGesture(down, {
    onMove: (dx, dy) => moves.push([dx, dy]),
    onFinish: (commit, cancelled) => finishes.push([commit, cancelled]),
  });
  return { moves, finishes, down };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('beginKanbanGesture', () => {
  it('ignores sub-threshold movement and never commits a plain click', () => {
    const { moves, finishes, down } = start();
    expect(down.defaultPrevented).toBe(true);
    document.dispatchEvent(pointer('pointermove', 12, 11));
    document.dispatchEvent(pointer('pointerup', 12, 11));
    expect(moves).toEqual([]);
    expect(finishes).toEqual([[false, false]]);
  });

  it('commits a real drag exactly once', () => {
    const { moves, finishes } = start();
    document.dispatchEvent(pointer('pointermove', 30, 10));
    document.dispatchEvent(pointer('pointerup', 30, 10));
    document.dispatchEvent(pointer('pointerup', 30, 10));
    expect(moves).toEqual([[20, 0]]);
    expect(finishes).toEqual([[true, false]]);
  });

  it('cancels on Escape (capture phase) and removes its listeners', () => {
    const { moves, finishes } = start();
    document.dispatchEvent(pointer('pointermove', 30, 10));
    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    document.dispatchEvent(pointer('pointermove', 60, 10));
    expect(moves).toHaveLength(1);
    expect(finishes).toEqual([[false, true]]);
  });

  it('cancels on pointercancel and window blur', () => {
    const first = start();
    document.dispatchEvent(pointer('pointercancel', 0, 0));
    expect(first.finishes).toEqual([[false, true]]);
    const second = start();
    window.dispatchEvent(new Event('blur'));
    expect(second.finishes).toEqual([[false, true]]);
  });
});
