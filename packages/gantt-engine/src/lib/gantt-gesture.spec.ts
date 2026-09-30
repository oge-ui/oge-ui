import { beginGanttGesture, type GanttPointerLike } from './gantt-gesture';

function down(target: EventTarget | null = null): GanttPointerLike {
  return {
    button: 0,
    clientX: 100,
    clientY: 50,
    pointerId: 1,
    target,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
}

const move = (x: number, y = 50) =>
  document.dispatchEvent(
    new MouseEvent('pointermove', { clientX: x, clientY: y }),
  );

describe('beginGanttGesture', () => {
  it('ignores sub-threshold jitter and commits a real drag on pointerup', () => {
    const onMove = vi.fn();
    const onFinish = vi.fn();
    const event = down();
    beginGanttGesture(event, { onMove, onFinish });
    expect(event.preventDefault).toHaveBeenCalled();
    move(102);
    expect(onMove).not.toHaveBeenCalled();
    move(130);
    expect(onMove).toHaveBeenCalledWith(30, 0, expect.anything());
    document.dispatchEvent(new MouseEvent('pointerup'));
    expect(onFinish).toHaveBeenCalledWith(true, false);
  });

  it('a click without movement finishes without committing', () => {
    const onFinish = vi.fn();
    beginGanttGesture(down(), { onMove: vi.fn(), onFinish });
    document.dispatchEvent(new MouseEvent('pointerup'));
    expect(onFinish).toHaveBeenCalledWith(false, false);
  });

  it('Escape cancels mid-gesture and detaches every listener', () => {
    const onMove = vi.fn();
    const onFinish = vi.fn();
    beginGanttGesture(down(), { onMove, onFinish });
    move(140);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onFinish).toHaveBeenCalledWith(false, true);
    move(200);
    document.dispatchEvent(new MouseEvent('pointerup'));
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('pointercancel and the returned handle cancel too', () => {
    const first = vi.fn();
    beginGanttGesture(down(), { onMove: vi.fn(), onFinish: first });
    document.dispatchEvent(new MouseEvent('pointercancel'));
    expect(first).toHaveBeenCalledWith(false, true);

    const second = vi.fn();
    const handle = beginGanttGesture(down(document.createElement('div')), {
      onMove: vi.fn(),
      onFinish: second,
    });
    handle.cancel();
    handle.cancel();
    expect(second).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledWith(false, true);
  });
});
