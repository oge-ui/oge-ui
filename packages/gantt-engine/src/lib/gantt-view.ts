/**
 * Pure view-model helpers of the Gantt controller — the arithmetic the
 * Angular and React render layers would otherwise each carry: the widening
 * render range, the virtual row window, zoom-to-fit, message formatting and
 * the task dialog's default form.
 */
import type { OgeFormItemDataBase } from '@oge-ui/behavior';
import type { OgeGanttDialogMessages } from './gantt-config';
import type { OgeGanttResource } from './gantt-types';
import type { GanttTask } from './engine/gantt-model';
import {
  buildGanttScale,
  GANTT_SCALE_ORDER,
  type GanttScaleType,
} from './engine/time-scale';

/** Rows rendered above and below the viewport. */
export const GANTT_OVERSCAN_ROWS = 6;

/** Sticky scale header height (two 24px tick rows). */
export const GANTT_SCALE_HEAD_PX = 48;

/** Bounds of the draggable splitter between the panes, in px. */
export const GANTT_LIST_WIDTH_MIN = 160;
export const GANTT_LIST_WIDTH_MAX = 720;

/** A date range. */
export interface GanttRange {
  readonly min: Date;
  readonly max: Date;
}

/**
 * The range the tasks (and their baselines) cover, always including today.
 */
export function ganttDataRange(
  tasks: readonly GanttTask[],
  now: Date,
): GanttRange {
  let min = now;
  let max = now;
  for (const task of tasks) {
    if (task.start.getTime() < min.getTime()) min = task.start;
    if (task.end.getTime() > max.getTime()) max = task.end;
    if (
      task.baselineStart !== undefined &&
      task.baselineStart.getTime() < min.getTime()
    ) {
      min = task.baselineStart;
    }
    if (
      task.baselineEnd !== undefined &&
      task.baselineEnd.getTime() > max.getTime()
    ) {
      max = task.baselineEnd;
    }
  }
  return { min, max };
}

/**
 * The rendered range only ever WIDENS while the component lives — dragging
 * the earliest task to the right must not re-anchor the whole chart under
 * the pointer. A disjoint new dataset resets it to the data.
 */
export function widenGanttRange(
  data: GanttRange,
  rendered: GanttRange | null,
): GanttRange {
  if (
    rendered === null ||
    data.max.getTime() < rendered.min.getTime() ||
    data.min.getTime() > rendered.max.getTime()
  ) {
    return data;
  }
  return {
    min: data.min.getTime() < rendered.min.getTime() ? data.min : rendered.min,
    max: data.max.getTime() > rendered.max.getTime() ? data.max : rendered.max,
  };
}

/** Whether two ranges are the same instants. */
export function sameGanttRange(a: GanttRange | null, b: GanttRange): boolean {
  return (
    a !== null &&
    a.min.getTime() === b.min.getTime() &&
    a.max.getTime() === b.max.getTime()
  );
}

/** The `[first, last)` slice of rows to render, overscan included. */
export function ganttWindowRange(
  scrollTop: number,
  viewportPx: number,
  rowHeight: number,
  count: number,
): { first: number; last: number } {
  const first = Math.max(
    0,
    Math.floor(scrollTop / rowHeight) - GANTT_OVERSCAN_ROWS,
  );
  const last = Math.min(
    count,
    Math.ceil((scrollTop + viewportPx) / rowHeight) + GANTT_OVERSCAN_ROWS,
  );
  return { first, last };
}

/** The next scale one zoom step away, or `null` at either end. */
export function stepGanttScale(
  current: GanttScaleType,
  direction: -1 | 1,
): GanttScaleType | null {
  const next = GANTT_SCALE_ORDER.indexOf(current) + direction;
  return next >= 0 && next < GANTT_SCALE_ORDER.length
    ? GANTT_SCALE_ORDER[next]
    : null;
}

/** The finest scale whose full range fits `viewportPx`; else the coarsest. */
export function fitGanttScaleType(
  range: GanttRange,
  viewportPx: number,
  firstDayOfWeek: number,
): GanttScaleType {
  for (const type of GANTT_SCALE_ORDER) {
    if (
      buildGanttScale(range.min, range.max, type, firstDayOfWeek).totalPx <=
      viewportPx
    ) {
      return type;
    }
  }
  return GANTT_SCALE_ORDER[GANTT_SCALE_ORDER.length - 1];
}

/** Replaces each `{token}` of a message template (first occurrence). */
export function formatGanttMessage(
  template: string,
  tokens: Readonly<Record<string, string>>,
): string {
  let text = template;
  for (const [token, value] of Object.entries(tokens)) {
    text = text.replace(`{${token}}`, value);
  }
  return text;
}

/** The task dialog's working model (independent of the user's item shape). */
export interface GanttEditorModel {
  title: string;
  start: Date;
  end: Date;
  progress: number;
  color?: string;
  /** Present only when resources are configured — enables the tag editor. */
  resourceIds?: readonly unknown[];
}

/** What the dialog hands back on save. */
export interface GanttEditorResult {
  readonly model: GanttEditorModel;
  readonly isNew: boolean;
}

/**
 * The task dialog's default form items — title, start/end (with the
 * end-before-start rule), progress slider, color and, when resources exist,
 * the multi-assignment tag editor. Both layers' dialogs render these through
 * their own form component.
 */
export function buildGanttDialogItems(
  messages: OgeGanttDialogMessages,
  resources: readonly OgeGanttResource[],
): OgeFormItemDataBase[] {
  return [
    {
      field: 'title',
      label: messages.titleLabel,
      placeholder: messages.titlePlaceholder,
      isRequired: true,
      colSpan: 2,
    },
    {
      field: 'start',
      label: messages.startLabel,
      editorType: 'dateBox',
      editorOptions: { type: 'date' },
    },
    {
      field: 'end',
      label: messages.endLabel,
      editorType: 'dateBox',
      editorOptions: { type: 'date' },
      validationRules: [
        {
          type: 'custom',
          validate: (context) => {
            const data = context.data as unknown as GanttEditorModel;
            return data.end instanceof Date &&
              data.start instanceof Date &&
              data.end.getTime() < data.start.getTime()
              ? messages.endBeforeStart
              : null;
          },
        },
      ],
    },
    {
      field: 'progress',
      label: messages.progressLabel,
      editorType: 'slider',
      editorOptions: { min: 0, max: 100, step: 5 },
    },
    {
      field: 'color',
      label: messages.colorLabel,
      editorType: 'colorBox',
    },
    ...(resources.length > 0
      ? [
          {
            field: 'resourceIds',
            label: messages.resourcesLabel,
            editorType: 'tagBox',
            editorOptions: {
              items: [...resources],
              valueExpr: 'id',
              displayExpr: 'text',
            },
            colSpan: 2,
          } satisfies OgeFormItemDataBase,
        ]
      : []),
  ];
}
