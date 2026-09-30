/**
 * The scheduler's keyboard maps, as pure decisions: a render layer passes
 * the key (plus modifiers) and gets back what to do — move the roving cell,
 * activate, cycle chips, delete, or commit a keyboard move/resize. The
 * layer then calls `preventDefault()` exactly when the decision says so and
 * performs the side effect (focus, emit) itself.
 *
 * No WAI-ARIA APG scheduler pattern exists, so the widget composes the
 * calendar-grid pattern: a `role="grid"` with one roving-tabindex cell and a
 * second tab stop of appointment chips.
 */
import {
  proposeMove,
  proposeResize,
  type AppointmentProposal,
} from './gesture-math';
import type { SchedulerAppointment } from './scheduler-model';

/** The key facts a decision needs (a DOM `KeyboardEvent` satisfies it). */
export interface SchedulerKeyInput {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
}

/** A roving-cell decision. */
export type SchedulerCellKeyAction =
  | { readonly kind: 'move'; readonly col: number; readonly row: number }
  | { readonly kind: 'activate' };

/**
 * Time-grid cell keys: arrows move within the grid (clamped), Home/End jump
 * to the first/last column, Enter/Space activate (create). `null` = not ours.
 */
export function timeGridCellKey(
  key: string,
  col: number,
  row: number,
  colCount: number,
  rowCount: number,
): SchedulerCellKeyAction | null {
  switch (key) {
    case 'ArrowUp':
      return { kind: 'move', col, row: Math.max(0, row - 1) };
    case 'ArrowDown':
      return { kind: 'move', col, row: Math.min(rowCount - 1, row + 1) };
    case 'ArrowLeft':
      return { kind: 'move', col: Math.max(0, col - 1), row };
    case 'ArrowRight':
      return { kind: 'move', col: Math.min(colCount - 1, col + 1), row };
    case 'Home':
      return { kind: 'move', col: 0, row };
    case 'End':
      return { kind: 'move', col: colCount - 1, row };
    case 'Enter':
    case ' ':
      return { kind: 'activate' };
    default:
      return null;
  }
}

/** Month cell keys: the same map over the fixed 7 × 6 grid (col = day). */
export function monthCellKey(
  key: string,
  week: number,
  day: number,
): SchedulerCellKeyAction | null {
  return timeGridCellKey(key, day, week, 7, 6);
}

/** A chip-layer decision. */
export type SchedulerChipKeyAction =
  | { readonly kind: 'activate' }
  | { readonly kind: 'delete' }
  | { readonly kind: 'focus'; readonly key: unknown }
  | { readonly kind: 'escape' };

/**
 * Chip keys: Enter/Space open the popup, Delete/Backspace delete,
 * Left/Right cycle chronologically (clamped), Escape arms the tab exit.
 */
export function chipKey<T>(
  key: string,
  appointment: SchedulerAppointment<T>,
  order: readonly SchedulerAppointment<T>[],
): SchedulerChipKeyAction | null {
  switch (key) {
    case 'Enter':
    case ' ':
      return { kind: 'activate' };
    case 'Delete':
    case 'Backspace':
      return { kind: 'delete' };
    case 'ArrowLeft':
    case 'ArrowRight': {
      const index = order.findIndex((entry) => entry.key === appointment.key);
      const next =
        order[
          key === 'ArrowRight'
            ? Math.min(order.length - 1, index + 1)
            : Math.max(0, index - 1)
        ];
      return next === undefined ? null : { kind: 'focus', key: next.key };
    }
    case 'Escape':
      return { kind: 'escape' };
    default:
      return null;
  }
}

/**
 * A keyboard move/resize decision: `handled: false` falls through to the
 * normal chip keys; `handled: true` without a commit swallows the key (the
 * capability is off or the appointment is disabled — no `preventDefault`).
 */
export type SchedulerCtrlKeyResult<T> =
  | { readonly handled: false }
  | { readonly handled: true; readonly commit?: SchedulerCtrlCommit<T> };

/** What a keyboard move/resize commits. */
export interface SchedulerCtrlCommit<T> {
  readonly kind: 'move' | 'resize';
  readonly appointment: SchedulerAppointment<T>;
  readonly proposal: AppointmentProposal;
  /** Set when the move reassigns the resource row (timeline only). */
  readonly resourceId?: unknown;
}

/**
 * Day/week chips (**OGE extra** — the keyboard equivalent of drag):
 * Ctrl+Arrow moves by slot/day, Ctrl+Shift+Up/Down resizes the end edge.
 */
export function timeGridChipCtrlKey<T>(
  appointment: SchedulerAppointment<T>,
  input: SchedulerKeyInput,
  cellDuration: number,
  allowDragging: boolean,
  allowResizing: boolean,
): SchedulerCtrlKeyResult<T> {
  if (!input.ctrlKey) return { handled: false };
  if (input.shiftKey) {
    if (input.key !== 'ArrowUp' && input.key !== 'ArrowDown') {
      return { handled: false };
    }
    if (!allowResizing || appointment.disabled) return { handled: true };
    return {
      handled: true,
      commit: {
        kind: 'resize',
        appointment,
        proposal: proposeResize(
          appointment,
          'end',
          input.key === 'ArrowDown' ? cellDuration : -cellDuration,
          cellDuration,
        ),
      },
    };
  }
  let deltaDays = 0;
  let deltaMinutes = 0;
  switch (input.key) {
    case 'ArrowLeft':
      deltaDays = -1;
      break;
    case 'ArrowRight':
      deltaDays = 1;
      break;
    case 'ArrowUp':
      deltaMinutes = -cellDuration;
      break;
    case 'ArrowDown':
      deltaMinutes = cellDuration;
      break;
    default:
      return { handled: false };
  }
  if (!allowDragging || appointment.disabled) return { handled: true };
  return {
    handled: true,
    commit: {
      kind: 'move',
      appointment,
      proposal: proposeMove(appointment, deltaDays, deltaMinutes, cellDuration),
    },
  };
}

/**
 * Timeline bars: Ctrl+Left/Right move by one snap, Ctrl+Shift+Left/Right
 * resize the end edge, Ctrl+Up/Down move to the neighbouring resource row.
 * Every commit reports as a move (the timeline's single commit channel).
 */
export function timelineBarCtrlKey<T>(
  appointment: SchedulerAppointment<T>,
  input: SchedulerKeyInput,
  snap: number,
  allowDragging: boolean,
  rows: readonly { readonly id: unknown }[],
  idOf: (item: T) => unknown,
): SchedulerCtrlKeyResult<T> {
  if (!input.ctrlKey) return { handled: false };
  if (input.shiftKey) {
    if (input.key !== 'ArrowRight' && input.key !== 'ArrowLeft') {
      return { handled: false };
    }
    if (!allowDragging || appointment.disabled) return { handled: true };
    return {
      handled: true,
      commit: {
        kind: 'move',
        appointment,
        proposal: proposeResize(
          appointment,
          'end',
          input.key === 'ArrowRight' ? snap : -snap,
          snap,
        ),
      },
    };
  }
  if (input.key === 'ArrowLeft' || input.key === 'ArrowRight') {
    if (!allowDragging || appointment.disabled) return { handled: true };
    return {
      handled: true,
      commit: {
        kind: 'move',
        appointment,
        proposal: proposeMove(
          appointment,
          0,
          input.key === 'ArrowRight' ? snap : -snap,
          snap,
        ),
      },
    };
  }
  if (input.key === 'ArrowUp' || input.key === 'ArrowDown') {
    const current = rows.findIndex(
      (row) => idOf(appointment.source) === row.id,
    );
    if (current === -1) return { handled: true };
    const next = rows[current + (input.key === 'ArrowDown' ? 1 : -1)];
    if (next === undefined || next.id === null) return { handled: true };
    if (!allowDragging || appointment.disabled) return { handled: true };
    return {
      handled: true,
      commit: {
        kind: 'move',
        appointment,
        proposal: {
          startDate: appointment.startDate,
          endDate: appointment.endDate,
          allDay: appointment.allDay,
        },
        resourceId: next.id,
      },
    };
  }
  return { handled: false };
}
