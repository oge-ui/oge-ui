import { beginPointerGesture } from './gesture';

function pointer(type: string, x: number, y: number): PointerEvent {
  // jsdom has no PointerEvent constructor everywhere; a MouseEvent carries
  // every field the machine reads
  const event = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  return event as unknown as PointerEvent;
}

function start(): PointerEvent {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const down = pointer('pointerdown', 10, 10);
  Object.defineProperty(down, 'target', { value: target });
  return down;
}

describe('beginPointerGesture', () => {
  it('ignores movement inside the 3px threshold and never commits a click', () => {
    const onMove = vi.fn();
    const onFinish = vi.fn();
    beginPointerGesture(start(), { onMove, onFinish });
    document.dispatchEvent(pointer('pointermove', 12, 11));
    document.dispatchEvent(pointer('pointerup', 12, 11));
    expect(onMove).not.toHaveBeenCalled();
    expect(onFinish).toHaveBeenCalledWith(false, false);
  });

  it('reports deltas past the threshold and commits on pointerup, once', () => {
    const onMove = vi.fn();
    const onFinish = vi.fn();
    beginPointerGesture(start(), { onMove, onFinish });
    document.dispatchEvent(pointer('pointermove', 30, 50));
    expect(onMove).toHaveBeenCalledWith(20, 40, expect.anything());
    document.dispatchEvent(pointer('pointerup', 30, 50));
    document.dispatchEvent(pointer('pointerup', 30, 50));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith(true, false);
  });

  it('cancels on Escape mid-gesture and stops the key from propagating', () => {
    const onFinish = vi.fn();
    const later = vi.fn();
    document.addEventListener('keydown', later);
    beginPointerGesture(start(), { onMove: () => undefined, onFinish });
    document.dispatchEvent(pointer('pointermove', 40, 40));
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(onFinish).toHaveBeenCalledWith(false, true);
    expect(later).not.toHaveBeenCalled();
    document.removeEventListener('keydown', later);
  });

  it('cancels on pointercancel and on window blur', () => {
    const first = vi.fn();
    beginPointerGesture(start(), { onMove: () => undefined, onFinish: first });
    document.dispatchEvent(pointer('pointercancel', 0, 0));
    expect(first).toHaveBeenCalledWith(false, true);
    const second = vi.fn();
    beginPointerGesture(start(), { onMove: () => undefined, onFinish: second });
    window.dispatchEvent(new Event('blur'));
    expect(second).toHaveBeenCalledWith(false, true);
  });
});
