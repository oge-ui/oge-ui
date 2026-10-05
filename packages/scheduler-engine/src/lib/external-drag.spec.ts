import {
  armOgeSchedulerPayload,
  armedOgeSchedulerPayload,
  beginOgeSchedulerExternalDrag,
  findOgeSchedulerDropTarget,
  ogeSchedulerDraggableKey,
  onArmedOgeSchedulerPayload,
  registerOgeSchedulerDropTarget,
  takeArmedOgeSchedulerPayload,
  type OgeSchedulerDropSlot,
} from './external-drag';
import { printOgeScheduler } from './print';

function pointer(type: string, x: number, y: number): PointerEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 0,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: 'mouse' });
  return event as unknown as PointerEvent;
}

describe('scheduler drop targets', () => {
  it('finds the innermost registered host containing the hit', () => {
    const outer = document.createElement('div');
    const inner = document.createElement('div');
    const cell = document.createElement('span');
    outer.appendChild(inner);
    inner.appendChild(cell);
    const slot: OgeSchedulerDropSlot = {
      startDate: new Date(2026, 7, 6, 9),
      allDay: false,
      resources: {},
    };
    const target = (element: Element) => ({
      element,
      resolve: () => slot,
      over: () => undefined,
      drop: () => true,
    });
    const offOuter = registerOgeSchedulerDropTarget(target(outer));
    const offInner = registerOgeSchedulerDropTarget(target(inner));
    expect(findOgeSchedulerDropTarget(cell)?.element).toBe(inner);
    offInner();
    expect(findOgeSchedulerDropTarget(cell)?.element).toBe(outer);
    offOuter();
    expect(findOgeSchedulerDropTarget(cell)).toBeNull();
    expect(findOgeSchedulerDropTarget(null)).toBeNull();
  });

  it('runs the pointer drag-drop gesture against a target', () => {
    const host = document.createElement('div');
    const source = document.createElement('div');
    document.body.append(host, source);
    const overs: (OgeSchedulerDropSlot | null)[] = [];
    const drops: unknown[] = [];
    const slot: OgeSchedulerDropSlot = {
      startDate: new Date(2026, 7, 6, 9),
      allDay: false,
      resources: { room: 'a' },
    };
    const off = registerOgeSchedulerDropTarget({
      element: host,
      resolve: () => slot,
      over: (next) => overs.push(next),
      drop: (payload) => {
        drops.push(payload.data);
        return true;
      },
    });
    const ended: boolean[] = [];
    beginOgeSchedulerExternalDrag(pointer('pointerdown', 0, 0), {
      source,
      payload: { data: { text: 'Item' } },
      onEnd: (result) => ended.push(result.dropped),
    });
    // jsdom has no hit-testing: the move's target stands in for it
    host.dispatchEvent(pointer('pointermove', 40, 40));
    host.dispatchEvent(pointer('pointerup', 40, 40));
    off();
    host.remove();
    source.remove();
    expect(overs[0]).toBe(slot);
    expect(drops).toEqual([{ text: 'Item' }]);
    expect(ended).toEqual([true]);
  });
});

describe('the keyboard / single-pointer twin', () => {
  it('arms, toggles, cancels and takes a payload', () => {
    const seen: unknown[] = [];
    const stop = onArmedOgeSchedulerPayload((payload) =>
      seen.push(payload?.data ?? null),
    );
    const payload = { data: 'x', text: 'X' };
    expect(ogeSchedulerDraggableKey('Enter', payload, 'Picked up X')).toBe(
      true,
    );
    expect(armedOgeSchedulerPayload()).toBe(payload);
    // the same key on the same item puts it down again
    expect(ogeSchedulerDraggableKey(' ', payload, 'Picked up X')).toBe(true);
    expect(armedOgeSchedulerPayload()).toBeNull();
    ogeSchedulerDraggableKey('Enter', payload, '');
    expect(ogeSchedulerDraggableKey('Escape', payload, '')).toBe(true);
    expect(ogeSchedulerDraggableKey('Escape', payload, '')).toBe(false);
    expect(ogeSchedulerDraggableKey('a', payload, '')).toBe(false);
    armOgeSchedulerPayload(payload);
    expect(takeArmedOgeSchedulerPayload()).toBe(payload);
    expect(takeArmedOgeSchedulerPayload()).toBeNull();
    stop();
    expect(seen).toEqual(['x', null, 'x', null, 'x', null]);
  });
});

describe('print', () => {
  it('clones the host and the styles into a hidden frame', async () => {
    vi.useFakeTimers();
    try {
      const host = document.createElement('div');
      host.className = 'oge-scheduler';
      host.textContent = 'Week';
      document.body.appendChild(host);
      const done = printOgeScheduler(host, { title: 'Plan' });
      const frame = document.querySelector('iframe');
      expect(frame?.getAttribute('aria-hidden')).toBe('true');
      expect(frame?.contentDocument?.body.textContent).toBe('Week');
      expect(frame?.contentDocument?.title).toBe('Plan');
      vi.advanceTimersByTime(300);
      await done;
      vi.advanceTimersByTime(1100);
      expect(document.querySelector('iframe')).toBeNull();
      host.remove();
    } finally {
      vi.useRealTimers();
    }
  });
});
