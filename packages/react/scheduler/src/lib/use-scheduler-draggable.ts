'use client';

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { prepareTouchDrag } from '@oge-ui/behavior';
import {
  armedOgeSchedulerPayload,
  beginOgeSchedulerExternalDrag,
  fillSchedulerMessages,
  ogeSchedulerDraggableKey,
  onArmedOgeSchedulerPayload,
  type OgeSchedulerDragPayload,
} from '@oge-ui/scheduler-engine';
import { useOgeSchedulerConfig } from './scheduler-config';

/** Options of {@link useOgeSchedulerDraggable}. */
export interface OgeSchedulerDraggableOptions {
  /** The item the drop turns into an appointment (fields mapped by the target's `*Expr`s). */
  readonly data: unknown;
  /** Appointment length in minutes; omitted = the target's cell duration. */
  readonly duration?: number;
  /** The label announced on pick-up. */
  readonly text?: string;
}

/** The props to spread on the draggable element. */
export interface OgeSchedulerDraggableProps {
  readonly className: string;
  readonly role: 'button';
  readonly tabIndex: 0;
  readonly 'aria-pressed': boolean;
  readonly onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  readonly onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  readonly onClick: (event: ReactMouseEvent<HTMLElement>) => void;
}

/**
 * Makes any element a source of appointments for every mounted
 * `<OgeScheduler>` — the React face of Angular's `[ogeSchedulerDraggable]`:
 * drag it onto a slot (the shared pointer gesture, a ghost preview, touch
 * long press, Escape cancels) and the scheduler builds an appointment from
 * `data` through its insert pipeline and calls `onAppointmentDropped`. The
 * keyboard / single-pointer twin: Enter, Space or a click picks the item up
 * (announced), and Enter or a click on a scheduler cell places it.
 *
 * ```tsx
 * function Task({ task }: { task: Task }) {
 *   const drag = useOgeSchedulerDraggable({ data: task, duration: 90 });
 *   return <li {...drag}>{task.text}</li>;
 * }
 * ```
 */
export function useOgeSchedulerDraggable(
  options: OgeSchedulerDraggableOptions,
): OgeSchedulerDraggableProps {
  const config = useOgeSchedulerConfig();
  const latest = useRef(options);
  latest.current = options;
  const dragged = useRef(false);
  // the payload this hook armed last: inline `data` objects change identity
  // every render, so "is it me?" compares the payload, not the data
  const own = useRef<OgeSchedulerDragPayload | null>(null);
  const [armed, setArmed] = useState<OgeSchedulerDragPayload | null>(() =>
    armedOgeSchedulerPayload(),
  );

  useEffect(() => {
    // the one non-passive touchmove guard (idempotent, SSR-safe)
    prepareTouchDrag();
    return onArmedOgeSchedulerPayload(setArmed);
  }, []);

  const payload = (element: HTMLElement): OgeSchedulerDragPayload => {
    const next = {
      data: latest.current.data,
      durationMinutes: latest.current.duration,
      text: latest.current.text ?? element.textContent?.trim() ?? '',
    };
    return next;
  };
  /** Runs the key decision; remembers the payload when it got armed. */
  const runKey = (key: string, next: OgeSchedulerDragPayload): boolean => {
    const handled = ogeSchedulerDraggableKey(
      key,
      next,
      announcement(next.text),
      isArmed,
    );
    if (armedOgeSchedulerPayload() === next) own.current = next;
    return handled;
  };
  const isArmed = armed !== null && armed === own.current;
  const announcement = (text: string | undefined): string =>
    fillSchedulerMessages(config.messages).announcements.pickedUp.replace(
      '{text}',
      text ?? '',
    );

  return {
    className: isArmed
      ? 'oge-scheduler-draggable oge-scheduler-draggable-armed'
      : 'oge-scheduler-draggable',
    role: 'button',
    tabIndex: 0,
    'aria-pressed': isArmed,
    onPointerDown: (event) => {
      if (event.button !== 0) return;
      dragged.current = false;
      beginOgeSchedulerExternalDrag(event.nativeEvent, {
        source: event.currentTarget,
        payload: payload(event.currentTarget),
        onStart: () => (dragged.current = true),
      });
    },
    onKeyDown: (event) => {
      if (runKey(event.key, payload(event.currentTarget))) {
        event.preventDefault();
      }
    },
    onClick: (event) => {
      // a drag swallows its click; a plain click is the single-pointer pick-up
      if (dragged.current || event.detail === 0) return;
      runKey('Enter', payload(event.currentTarget));
    },
  };
}
