/**
 * Pure gesture proposals: pixel deltas on the timeline become date/progress
 * changes. The component-side machines call these per pointermove and
 * render the result as a preview — the model mutates once, on commit.
 */
import type { GanttTask } from './gantt-model';
import { pxToDate, snapToUnit, type GanttScale } from './time-scale';

export interface GanttTaskProposal {
  readonly start: Date;
  readonly end: Date;
}

/** Move: shifts both ends by the pixel delta, snapped to the scale unit. */
export function proposeTaskMove(
  task: GanttTask,
  deltaPx: number,
  scale: GanttScale,
  firstDayOfWeek: number,
): GanttTaskProposal {
  const deltaMs = deltaPx * scale.msPerPx;
  const snappedStart = snapToUnit(
    scale,
    new Date(task.start.getTime() + deltaMs),
    firstDayOfWeek,
  );
  const shift = snappedStart.getTime() - task.start.getTime();
  return {
    start: snappedStart,
    end: new Date(task.end.getTime() + shift),
  };
}

/** Resize: moves one edge, snapped; never inverts (min zero duration). */
export function proposeTaskResize(
  task: GanttTask,
  edge: 'start' | 'end',
  deltaPx: number,
  scale: GanttScale,
  firstDayOfWeek: number,
): GanttTaskProposal {
  const deltaMs = deltaPx * scale.msPerPx;
  if (edge === 'start') {
    let start = snapToUnit(
      scale,
      new Date(task.start.getTime() + deltaMs),
      firstDayOfWeek,
    );
    if (start.getTime() > task.end.getTime()) start = task.end;
    return { start, end: task.end };
  }
  let end = snapToUnit(
    scale,
    new Date(task.end.getTime() + deltaMs),
    firstDayOfWeek,
  );
  if (end.getTime() < task.start.getTime()) end = task.start;
  return { start: task.start, end };
}

/** Progress drag: bar-local x → clamped 0–100 (rounded to 5). */
export function proposeTaskProgress(
  barStartPx: number,
  barEndPx: number,
  pointerPx: number,
): number {
  const width = Math.max(1, barEndPx - barStartPx);
  const fraction = (pointerPx - barStartPx) / width;
  return Math.min(100, Math.max(0, Math.round((fraction * 100) / 5) * 5));
}

/** Chart x pixel → snapped date (drag-to-create, dependency previews). */
export function chartPxToDate(
  scale: GanttScale,
  px: number,
  firstDayOfWeek: number,
): Date {
  return snapToUnit(scale, pxToDate(scale, px), firstDayOfWeek);
}
