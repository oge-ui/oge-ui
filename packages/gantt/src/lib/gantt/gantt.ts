import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  contentChild,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  contrastForeground,
  parseColor,
  resolveFirstDayOfWeek,
  sameDay,
  startOfDay,
  type RowKey,
} from '@oge-ui/core';
import type { OgeGanttMessages } from '../config';
import { OGE_GANTT_CONFIG } from '../config';
import {
  dependencyAnchors,
  dependencyPath,
  routeDependency,
} from '../engine/dependency-routing';
import {
  proposeTaskMove,
  proposeTaskProgress,
  proposeTaskResize,
  type GanttTaskProposal,
} from '../engine/gantt-gesture-math';
import {
  buildGanttDependencies,
  buildGanttTasks,
  ganttTaskPatch,
  resolveGanttFields,
  wouldCreateCycle,
  type GanttDependency,
  type GanttFieldExpr,
  type GanttTask,
} from '../engine/gantt-model';
import { autoScheduleForward, criticalPathKeys } from '../engine/schedule';
import {
  buildGanttScale,
  dateToPx,
  GANTT_SCALE_ORDER,
  type GanttScale,
} from '../engine/time-scale';
import type {
  OgeGanttColumn,
  OgeGanttDependencyDeletedEvent,
  OgeGanttDependencyDeletingEvent,
  OgeGanttDependencyInsertedEvent,
  OgeGanttDependencyInsertingEvent,
  OgeGanttDependencyType,
  OgeGanttDialogShowingEvent,
  OgeGanttScaleType,
  OgeGanttSelectionChangedEvent,
  OgeGanttStripLine,
  OgeGanttTaskClickEvent,
  OgeGanttTaskDeletedEvent,
  OgeGanttTaskDeletingEvent,
  OgeGanttTaskInsertedEvent,
  OgeGanttTaskInsertingEvent,
  OgeGanttTaskTitlePosition,
  OgeGanttTaskUpdatedEvent,
  OgeGanttTaskUpdatingEvent,
} from '../gantt-types';
import { beginGanttGesture } from './gantt-gesture';
import {
  OgeGanttTaskDialog,
  type GanttEditorModel,
  type GanttEditorResult,
} from './gantt-task-dialog';
import { OgeGanttTaskTemplate } from './gantt-templates';

/** One rendered chart bar with its pixel geometry. */
interface GanttBar<T> {
  readonly task: GanttTask<T>;
  readonly index: number;
  readonly leftPx: number;
  readonly widthPx: number;
  readonly baselineLeftPx: number | null;
  readonly baselineWidthPx: number | null;
  readonly critical: boolean;
}

/** One routed dependency arrow. */
interface GanttArrow<D> {
  readonly dependency: GanttDependency<D>;
  readonly path: string;
  readonly critical: boolean;
}

interface UndoSnapshot<T, D> {
  readonly tasks: readonly T[];
  readonly dependencies: readonly D[];
}

const OVERSCAN_ROWS = 6;

/**
 * Signal-based Gantt chart — commercial (`@oge-ui/gantt`). A task tree
 * pane and a timeline chart with synced, virtualized rows; summary /
 * milestone / baseline bars with progress fill, FS/SS/FF/SF dependency
 * arrows, critical path, drag editing with Escape-cancel and snapshot
 * undo/redo.
 *
 * ```html
 * <oge-gantt [tasks]="tasks" [dependencies]="links" />
 * ```
 */
@Component({
  selector: 'oge-gantt',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, OgeGanttTaskDialog],
  host: { class: 'oge-gantt' },
  styleUrl: './gantt.scss',
  template: `
    <div
      class="oge-gantt-toolbar"
      role="toolbar"
      [attr.aria-label]="msg().toolbar.label"
    >
      @if (effectiveEditing() && allowTaskAdding()) {
        <button
          type="button"
          class="oge-gantt-btn oge-gantt-btn-primary oge-gantt-btn-add"
          (click)="showTaskDetailsDialog()"
        >
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round"
            aria-hidden="true"><path d="M8 3.5v9M3.5 8h9" /></svg>
          {{ msg().toolbar.addTask }}
        </button>
      }
      <div class="oge-gantt-toolbar-group">
        <button type="button" class="oge-gantt-btn oge-gantt-btn-icon"
          [attr.aria-label]="msg().toolbar.zoomOut"
          [disabled]="!canZoom(1)" (click)="zoomOut()">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round"
            aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3M5 7h4" /></svg>
        </button>
        <button type="button" class="oge-gantt-btn oge-gantt-btn-icon"
          [attr.aria-label]="msg().toolbar.zoomIn"
          [disabled]="!canZoom(-1)" (click)="zoomIn()">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round"
            aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3M5 7h4M7 5v4" /></svg>
        </button>
        <button type="button" class="oge-gantt-btn"
          (click)="zoomToFit()">{{ msg().toolbar.zoomToFit }}</button>
      </div>
      <div class="oge-gantt-toolbar-group">
        <button type="button" class="oge-gantt-btn"
          (click)="expandAll()">{{ msg().toolbar.expandAll }}</button>
        <button type="button" class="oge-gantt-btn"
          (click)="collapseAll()">{{ msg().toolbar.collapseAll }}</button>
      </div>
      @if (effectiveEditing()) {
        <div class="oge-gantt-toolbar-group">
          <button type="button" class="oge-gantt-btn oge-gantt-btn-icon"
            [attr.aria-label]="msg().toolbar.undo"
            [disabled]="!canUndo()" (click)="undo()">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round"
              stroke-linejoin="round" aria-hidden="true"><path d="M6.5 3.5 3 7l3.5 3.5M3 7h7a3 3 0 0 1 0 6H8" /></svg>
          </button>
          <button type="button" class="oge-gantt-btn oge-gantt-btn-icon"
            [attr.aria-label]="msg().toolbar.redo"
            [disabled]="!canRedo()" (click)="redo()">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round"
              stroke-linejoin="round" aria-hidden="true"><path d="M9.5 3.5 13 7l-3.5 3.5M13 7H6a3 3 0 0 0 0 6h2" /></svg>
          </button>
        </div>
      }
    </div>

    <div class="oge-gantt-body" #bodyEl (scroll)="onBodyScroll()">
      <div
        class="oge-gantt-layout"
        [style.--oge-gantt-list-width.px]="listWidth()"
        [style.--oge-gantt-row-height.px]="rowHeight()"
      >
        <!-- ======== task list pane ======== -->
        <!-- delegated keydown; focus lives on the roving row -->
        <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -->
        <div
          class="oge-gantt-pane"
          role="treegrid"
          [attr.aria-label]="paneAriaLabel()"
          [attr.aria-rowcount]="tasks().length"
          (keydown)="onPaneKeydown($event)"
        >
          <div class="oge-gantt-pane-header" role="row">
            @for (column of resolvedColumns(); track column.field) {
              <div
                class="oge-gantt-pane-headcell"
                role="columnheader"
                [style.width.px]="column.widthPx"
              >
                {{ column.header }}
              </div>
            }
          </div>
          <div [style.height.px]="windowTopPx()" aria-hidden="true"></div>
          @for (task of windowTasks(); track task.key) {
            <div
              class="oge-gantt-row"
              role="row"
              [attr.aria-level]="task.level + 1"
              [attr.aria-expanded]="task.hasChildren ? task.expanded : null"
              [attr.aria-selected]="task.key === selectedTaskKey()"
              [attr.aria-rowindex]="rowIndexOf(task) + 1"
              [attr.aria-label]="taskAriaLabel(task)"
              [class.oge-gantt-row-selected]="task.key === selectedTaskKey()"
              [class.oge-gantt-row-hover]="task.key === hoverKey()"
              [tabindex]="task.key === focusKey() ? 0 : -1"
              [attr.data-focus-target]="task.key === focusKey() ? '' : null"
              (click)="onRowClick(task, $event)"
              (dblclick)="onRowDblClick(task, $event)"
              (contextmenu)="onRowContextMenu(task, $event)"
              (mouseenter)="hoverKey.set(task.key)"
              (mouseleave)="hoverKey.set(null)"
              (keydown)="onRowKeydown(task, $event)"
            >
              @for (
                column of resolvedColumns();
                track column.field;
                let colIndex = $index
              ) {
                <div
                  class="oge-gantt-pane-cell"
                  role="gridcell"
                  [style.width.px]="column.widthPx"
                >
                  @if (colIndex === 0) {
                    <span
                      class="oge-gantt-indent"
                      [style.width.px]="task.level * 18"
                      aria-hidden="true"
                    ></span>
                    @if (task.hasChildren) {
                      <span
                        class="oge-gantt-toggle"
                        [class.oge-gantt-toggle-open]="task.expanded"
                        aria-hidden="true"
                        (click)="toggleExpanded(task, $event)"
                      >
                        <svg viewBox="0 0 16 16" width="11" height="11"
                          fill="none" stroke="currentColor" stroke-width="2"
                          stroke-linecap="round" stroke-linejoin="round">
                          <path d="m6 3.5 4.5 4.5L6 12.5" /></svg>
                      </span>
                    } @else {
                      <span class="oge-gantt-toggle-spacer" aria-hidden="true"></span>
                    }
                  }
                  <span class="oge-gantt-cell-text">{{
                    cellText(task, column)
                  }}</span>
                </div>
              }
            </div>
          }
          <div [style.height.px]="windowBottomPx()" aria-hidden="true"></div>
        </div>

        <!-- ======== splitter ======== -->
        <div
          class="oge-gantt-splitter"
          role="separator"
          aria-orientation="vertical"
          tabindex="-1"
          (pointerdown)="onSplitterPointerDown($event)"
        ></div>

        <!-- ======== chart ======== -->
        <div class="oge-gantt-chart-scroll" #chartScrollEl>
          <div class="oge-gantt-chart" [style.width.px]="scale().totalPx">
            <div class="oge-gantt-scale" role="presentation">
              <div class="oge-gantt-scale-major">
                @for (tick of scale().majorTicks; track tick.px) {
                  <span
                    class="oge-gantt-scale-cell"
                    [style.inset-inline-start.px]="tick.px"
                    [style.width.px]="tick.widthPx"
                    >{{ majorLabel(tick.date) }}</span
                  >
                }
              </div>
              <div class="oge-gantt-scale-minor">
                @for (tick of scale().ticks; track tick.px) {
                  <span
                    class="oge-gantt-scale-cell"
                    [style.inset-inline-start.px]="tick.px"
                    [style.width.px]="tick.widthPx"
                    >{{ minorLabel(tick.date) }}</span
                  >
                }
              </div>
            </div>
            <div
              class="oge-gantt-canvas"
              #canvasEl
              [style.height.px]="tasks().length * rowHeight()"
            >
              @for (shade of shadedTicks(); track shade.px) {
                <div
                  class="oge-gantt-offday"
                  [style.inset-inline-start.px]="shade.px"
                  [style.width.px]="shade.widthPx"
                  aria-hidden="true"
                ></div>
              }
              @for (strip of stripRects(); track strip.px) {
                <div
                  class="oge-gantt-strip"
                  [class.oge-gantt-strip-line]="strip.widthPx === 0"
                  [style.inset-inline-start.px]="strip.px"
                  [style.width.px]="strip.widthPx || 2"
                  [style.background-color]="strip.color ?? null"
                  aria-hidden="true"
                >
                  @if (strip.label) {
                    <span class="oge-gantt-strip-label">{{ strip.label }}</span>
                  }
                </div>
              }
              @if (todayPx(); as px) {
                <div
                  class="oge-gantt-today"
                  [style.inset-inline-start.px]="px"
                  [title]="msg().grid.todayLabel"
                  aria-hidden="true"
                ></div>
              }
              @if (showRowLines()) {
                @for (task of windowTasks(); track task.key) {
                  <div
                    class="oge-gantt-rowline"
                    [style.top.px]="(rowIndexOf(task) + 1) * rowHeight()"
                    aria-hidden="true"
                  ></div>
                }
              }
              @for (task of windowTasks(); track task.key) {
                <div
                  class="oge-gantt-lane"
                  [class.oge-gantt-row-selected]="task.key === selectedTaskKey()"
                  [class.oge-gantt-row-hover]="task.key === hoverKey()"
                  [style.top.px]="rowIndexOf(task) * rowHeight()"
                  [style.height.px]="rowHeight()"
                  (mouseenter)="hoverKey.set(task.key)"
                  (mouseleave)="hoverKey.set(null)"
                ></div>
              }
              <svg
                class="oge-gantt-arrows"
                [attr.height]="tasks().length * rowHeight()"
                [attr.width]="scale().totalPx"
                aria-hidden="true"
              >
                @for (arrow of windowArrows(); track arrow.dependency.key) {
                  <path
                    class="oge-gantt-arrow"
                    [class.oge-gantt-arrow-critical]="arrow.critical"
                    [class.oge-gantt-arrow-selected]="
                      arrow.dependency.key === selectedDependencyKey()
                    "
                    [attr.d]="arrow.path"
                    (click)="onArrowClick(arrow.dependency, $event)"
                  />
                }
                @if (linkPreview(); as preview) {
                  <path
                    class="oge-gantt-arrow oge-gantt-arrow-preview"
                    [class.oge-gantt-arrow-invalid]="!preview.valid"
                    [attr.d]="preview.path"
                  />
                }
              </svg>
              @for (bar of windowBars(); track bar.task.key) {
                <div
                  class="oge-gantt-bar-box"
                  [style.top.px]="bar.index * rowHeight()"
                  [style.height.px]="rowHeight()"
                >
                  @if (bar.baselineLeftPx !== null) {
                    <div
                      class="oge-gantt-baseline"
                      [style.inset-inline-start.px]="bar.baselineLeftPx"
                      [style.width.px]="bar.baselineWidthPx"
                      aria-hidden="true"
                    ></div>
                  }
                  @if (bar.task.isMilestone) {
                    <div
                      class="oge-gantt-milestone oge-gantt-target"
                      [class.oge-gantt-critical]="bar.critical"
                      [style.inset-inline-start.px]="bar.leftPx - 7"
                      [style.background-color]="bar.task.color ?? null"
                      [attr.data-task-key]="String(bar.task.key)"
                      (pointerdown)="onBarPointerDown(bar, 'move', $event)"
                    ></div>
                  } @else if (bar.task.isSummary) {
                    <div
                      class="oge-gantt-summary oge-gantt-target"
                      [class.oge-gantt-critical]="bar.critical"
                      [style.inset-inline-start.px]="bar.leftPx"
                      [style.width.px]="bar.widthPx"
                      [style.background-color]="bar.task.color ?? null"
                      [attr.data-task-key]="String(bar.task.key)"
                    ></div>
                  } @else {
                    <div
                      class="oge-gantt-bar oge-gantt-target"
                      [class.oge-gantt-critical]="bar.critical"
                      [class.oge-gantt-dragging]="dragKey() === bar.task.key"
                      [style.inset-inline-start.px]="bar.leftPx"
                      [style.width.px]="bar.widthPx"
                      [style.background-color]="bar.task.color ?? null"
                      [style.color]="barForeground(bar.task)"
                      [attr.data-task-key]="String(bar.task.key)"
                      (pointerdown)="onBarPointerDown(bar, 'move', $event)"
                    >
                      <div
                        class="oge-gantt-progress"
                        [style.width.%]="bar.task.progress"
                        aria-hidden="true"
                      ></div>
                      @if (effectiveEditing() && allowTaskUpdating()) {
                        <div
                          class="oge-gantt-handle oge-gantt-handle-start"
                          aria-hidden="true"
                          (pointerdown)="onBarPointerDown(bar, 'resize-start', $event)"
                        ></div>
                        <div
                          class="oge-gantt-handle oge-gantt-handle-end"
                          aria-hidden="true"
                          (pointerdown)="onBarPointerDown(bar, 'resize-end', $event)"
                        ></div>
                        <div
                          class="oge-gantt-progress-knob"
                          [style.inset-inline-start.%]="bar.task.progress"
                          aria-hidden="true"
                          (pointerdown)="onBarPointerDown(bar, 'progress', $event)"
                        ></div>
                      }
                      @if (effectiveEditing() && allowDependencyAdding()) {
                        <div
                          class="oge-gantt-link-dot oge-gantt-link-dot-start"
                          aria-hidden="true"
                          (pointerdown)="onLinkPointerDown(bar, false, $event)"
                        ></div>
                        <div
                          class="oge-gantt-link-dot oge-gantt-link-dot-end"
                          aria-hidden="true"
                          (pointerdown)="onLinkPointerDown(bar, true, $event)"
                        ></div>
                      }
                      @if (taskTitlePosition() === 'inside') {
                        <span class="oge-gantt-bar-title">
                          @if (taskTemplate(); as tpl) {
                            <ng-container
                              [ngTemplateOutlet]="tpl.templateRef"
                              [ngTemplateOutletContext]="{ $implicit: bar.task }"
                            />
                          } @else {
                            {{ bar.task.title }}
                          }
                        </span>
                      }
                    </div>
                    @if (taskTitlePosition() === 'outside') {
                      <span
                        class="oge-gantt-bar-title-outside"
                        [style.inset-inline-start.px]="bar.leftPx + bar.widthPx + 8"
                        >{{ bar.task.title }}</span
                      >
                    }
                  }
                  @if (resourceText(bar.task); as text) {
                    <span
                      class="oge-gantt-resource"
                      [style.inset-inline-start.px]="resourceLabelLeft(bar)"
                      >{{ text }}</span
                    >
                  }
                </div>
              }
              @if (dragTip(); as tip) {
                <div
                  class="oge-gantt-drag-tip"
                  [style.inset-inline-start.px]="tip.x"
                  [style.top.px]="tip.y"
                  aria-hidden="true"
                >
                  {{ tip.text }}
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>

    <oge-gantt-task-dialog
      [messages]="msg().dialog"
      [locale]="effectiveLocale()"
      [allowDeleting]="effectiveEditing() && allowTaskDeleting()"
      (saved)="onDialogSaved($event)"
      (deleteRequested)="onDialogDelete()"
    />
    <div class="oge-gantt-live" aria-live="polite">{{ announcement() }}</div>
  `,
})
export class OgeGantt<
  T extends object = Record<string, unknown>,
  D extends object = Record<string, unknown>,
> {
  private readonly config = inject(OGE_GANTT_CONFIG);
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);

  /* ---------------- data inputs ---------------- */

  readonly tasks = input<readonly T[]>([]);
  readonly dependencies = input<readonly D[]>([]);

  readonly keyExpr = input<GanttFieldExpr<T>>('id');
  readonly parentKeyExpr = input<GanttFieldExpr<T>>('parentId');
  readonly titleExpr = input<GanttFieldExpr<T>>('title');
  readonly startExpr = input<GanttFieldExpr<T>>('start');
  readonly endExpr = input<GanttFieldExpr<T>>('end');
  readonly progressExpr = input<GanttFieldExpr<T>>('progress');
  readonly colorExpr = input<GanttFieldExpr<T>>('color');
  readonly baselineStartExpr = input<GanttFieldExpr<T>>('baselineStart');
  readonly baselineEndExpr = input<GanttFieldExpr<T>>('baselineEnd');

  readonly dependencyKeyExpr = input<GanttFieldExpr<D>>('id');
  readonly predecessorKeyExpr = input<GanttFieldExpr<D>>('predecessorId');
  readonly successorKeyExpr = input<GanttFieldExpr<D>>('successorId');
  readonly dependencyTypeExpr = input<GanttFieldExpr<D>>('type');

  /** Resource choices shown next to bars and in the dialog. */
  readonly resources = input<
    readonly { id: unknown; text: string; color?: string }[]
  >([]);
  readonly resourceIdExpr = input<GanttFieldExpr<T>>('resourceId');

  /* ---------------- appearance / behavior ---------------- */

  readonly scaleType = model<OgeGanttScaleType>('days');
  readonly firstDayOfWeek = input<number | undefined>(undefined);
  readonly taskListWidth = input(360);
  readonly columns = input<readonly OgeGanttColumn[]>([
    { field: 'title' },
    { field: 'start' },
    { field: 'end' },
    { field: 'duration' },
  ]);
  readonly taskTitlePosition = input<OgeGanttTaskTitlePosition>('inside');
  readonly showDependencies = input(true);
  readonly showRowLines = input(true);
  readonly showCriticalPath = input(false);
  readonly weekendsHighlighted = input(true);
  readonly holidays = input<readonly Date[]>([]);
  readonly stripLines = input<readonly OgeGanttStripLine[]>([]);
  readonly autoScheduling = input(false);
  readonly locale = input<string | undefined>(undefined);
  readonly messages = input<Partial<OgeGanttMessages>>({});

  /** Master editing switch (dx `editing.enabled`). */
  readonly editingEnabled = input(true);
  readonly allowTaskAdding = input(true);
  readonly allowTaskUpdating = input(true);
  readonly allowTaskDeleting = input(true);
  readonly allowDependencyAdding = input(true);
  readonly allowDependencyDeleting = input(true);
  /** Display-only shorthand: equivalent to `editingEnabled=false`. */
  readonly readOnly = input(false);

  readonly selectedTaskKey = model<RowKey | null>(null);

  /* ---------------- events ---------------- */

  readonly taskInserting = output<OgeGanttTaskInsertingEvent<T>>();
  readonly taskInserted = output<OgeGanttTaskInsertedEvent<T>>();
  readonly taskUpdating = output<OgeGanttTaskUpdatingEvent<T>>();
  readonly taskUpdated = output<OgeGanttTaskUpdatedEvent<T>>();
  readonly taskDeleting = output<OgeGanttTaskDeletingEvent<T>>();
  readonly taskDeleted = output<OgeGanttTaskDeletedEvent<T>>();
  readonly dependencyInserting = output<OgeGanttDependencyInsertingEvent>();
  readonly dependencyInserted =
    output<OgeGanttDependencyInsertedEvent<D>>();
  readonly dependencyDeleting =
    output<OgeGanttDependencyDeletingEvent<D>>();
  readonly dependencyDeleted = output<OgeGanttDependencyDeletedEvent<D>>();
  readonly taskClick = output<OgeGanttTaskClickEvent<T>>();
  readonly taskDblClick = output<OgeGanttTaskClickEvent<T>>();
  readonly taskContextMenu = output<OgeGanttTaskClickEvent<T>>();
  readonly selectionChanged = output<OgeGanttSelectionChangedEvent<T>>();
  readonly taskEditDialogShowing = output<OgeGanttDialogShowingEvent<T>>();

  protected readonly taskTemplate = contentChild(OgeGanttTaskTemplate, {
    descendants: false,
  });
  private readonly dialog = viewChild.required(OgeGanttTaskDialog);
  private readonly bodyEl = viewChild<ElementRef<HTMLElement>>('bodyEl');
  private readonly chartScrollEl =
    viewChild<ElementRef<HTMLElement>>('chartScrollEl');
  private readonly canvasEl = viewChild<ElementRef<HTMLElement>>('canvasEl');

  protected readonly msg = computed<OgeGanttMessages>(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  protected readonly rowHeight = computed(() => this.config.rowHeight ?? 36);

  /** Per-instance locale, falling back to the DI config, then the browser. */
  protected readonly effectiveLocale = computed(
    () => this.locale() ?? this.config.locale,
  );

  protected readonly effectiveEditing = computed(
    () => this.editingEnabled() && !this.readOnly(),
  );

  private readonly resolvedFirstDayOfWeek = computed(() =>
    resolveFirstDayOfWeek(this.firstDayOfWeek(), this.effectiveLocale()),
  );

  /* ---------------- stores + undo ---------------- */

  private readonly taskStore = signal<readonly T[]>([]);
  private readonly dependencyStore = signal<readonly D[]>([]);
  private readonly undoStack = signal<readonly UndoSnapshot<T, D>[]>([]);
  private readonly redoStack = signal<readonly UndoSnapshot<T, D>[]>([]);

  constructor() {
    effect(() => {
      this.taskStore.set([...this.tasks()]);
      this.undoStack.set([]);
      this.redoStack.set([]);
    });
    effect(() => {
      this.dependencyStore.set([...this.dependencies()]);
    });
    effect(() => {
      this.listWidth.set(this.taskListWidth());
    });
  }

  private snapshot(): void {
    const limit = this.config.undoLimit ?? 50;
    this.undoStack.set(
      [
        ...untracked(this.undoStack),
        {
          tasks: untracked(this.taskStore),
          dependencies: untracked(this.dependencyStore),
        },
      ].slice(-limit),
    );
    this.redoStack.set([]);
  }

  protected canUndo(): boolean {
    return this.undoStack().length > 0;
  }
  protected canRedo(): boolean {
    return this.redoStack().length > 0;
  }

  /** Reverts the last committed change (bounded snapshot stack). */
  undo(): void {
    const stack = untracked(this.undoStack);
    const last = stack.at(-1);
    if (last === undefined) return;
    this.redoStack.set([
      ...untracked(this.redoStack),
      {
        tasks: untracked(this.taskStore),
        dependencies: untracked(this.dependencyStore),
      },
    ]);
    this.undoStack.set(stack.slice(0, -1));
    this.taskStore.set(last.tasks);
    this.dependencyStore.set(last.dependencies);
    this.announcement.set(this.msg().announcements.undone);
  }

  /** Re-applies the last undone change. */
  redo(): void {
    const stack = untracked(this.redoStack);
    const last = stack.at(-1);
    if (last === undefined) return;
    this.undoStack.set([
      ...untracked(this.undoStack),
      {
        tasks: untracked(this.taskStore),
        dependencies: untracked(this.dependencyStore),
      },
    ]);
    this.redoStack.set(stack.slice(0, -1));
    this.taskStore.set(last.tasks);
    this.dependencyStore.set(last.dependencies);
    this.announcement.set(this.msg().announcements.redone);
  }

  /* ---------------- derived model ---------------- */

  private readonly fields = computed(() =>
    resolveGanttFields<T>({
      keyExpr: this.keyExpr(),
      parentKeyExpr: this.parentKeyExpr(),
      titleExpr: this.titleExpr(),
      startExpr: this.startExpr(),
      endExpr: this.endExpr(),
      progressExpr: this.progressExpr(),
      colorExpr: this.colorExpr(),
      baselineStartExpr: this.baselineStartExpr(),
      baselineEndExpr: this.baselineEndExpr(),
    }),
  );

  private readonly collapsedKeys = signal<ReadonlySet<RowKey>>(new Set());

  /** The visible task rows (tree order, roll-ups applied). */
  protected readonly visibleTasks = computed<readonly GanttTask<T>[]>(() =>
    buildGanttTasks(this.taskStore(), this.fields(), this.collapsedKeys()),
  );

  /** All tasks incl. collapsed subtrees — arrows/critical path need them. */
  private readonly allTasks = computed<readonly GanttTask<T>[]>(() =>
    buildGanttTasks(this.taskStore(), this.fields(), new Set()),
  );

  protected readonly ganttDependencies = computed<
    readonly GanttDependency<D>[]
  >(() =>
    buildGanttDependencies(
      this.dependencyStore(),
      {
        keyExpr: this.dependencyKeyExpr(),
        predecessorKeyExpr: this.predecessorKeyExpr(),
        successorKeyExpr: this.successorKeyExpr(),
        typeExpr: this.dependencyTypeExpr(),
      },
      new Set(this.allTasks().map((task) => task.key)),
    ),
  );

  private readonly criticalKeys = computed<ReadonlySet<RowKey>>(() =>
    this.showCriticalPath()
      ? criticalPathKeys(this.allTasks(), this.ganttDependencies())
      : new Set(),
  );

  protected readonly scale = computed<GanttScale>(() => {
    const tasks = this.allTasks();
    const now = startOfDay(new Date());
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
    return buildGanttScale(
      min,
      max,
      this.scaleType(),
      this.resolvedFirstDayOfWeek(),
    );
  });

  /* ---------------- virtualization ---------------- */

  private readonly scrollTop = signal(0);
  private readonly viewportPx = signal(600);

  protected onBodyScroll(): void {
    const body = this.bodyEl()?.nativeElement;
    if (body === undefined) return;
    this.scrollTop.set(body.scrollTop);
    this.viewportPx.set(body.clientHeight);
  }

  private readonly windowRange = computed(() => {
    const rowHeight = this.rowHeight();
    const count = this.visibleTasks().length;
    const first = Math.max(
      0,
      Math.floor(this.scrollTop() / rowHeight) - OVERSCAN_ROWS,
    );
    const last = Math.min(
      count,
      Math.ceil((this.scrollTop() + this.viewportPx()) / rowHeight) +
        OVERSCAN_ROWS,
    );
    return { first, last };
  });

  protected readonly windowTasks = computed<readonly GanttTask<T>[]>(() => {
    const { first, last } = this.windowRange();
    return this.visibleTasks().slice(first, last);
  });

  protected readonly windowTopPx = computed(
    () => this.windowRange().first * this.rowHeight(),
  );
  protected readonly windowBottomPx = computed(
    () =>
      Math.max(
        0,
        this.visibleTasks().length - this.windowRange().last,
      ) * this.rowHeight(),
  );

  private readonly rowIndexByKey = computed<ReadonlyMap<RowKey, number>>(() => {
    const map = new Map<RowKey, number>();
    this.visibleTasks().forEach((task, index) => map.set(task.key, index));
    return map;
  });

  protected rowIndexOf(task: GanttTask<T>): number {
    return this.rowIndexByKey().get(task.key) ?? 0;
  }

  /* ---------------- bars & arrows ---------------- */

  protected readonly windowBars = computed<readonly GanttBar<T>[]>(() => {
    const scale = this.scale();
    const critical = this.criticalKeys();
    return this.windowTasks().map((task) => {
      const leftPx = dateToPx(scale, task.start);
      const widthPx = Math.max(4, dateToPx(scale, task.end) - leftPx);
      const hasBaseline =
        task.baselineStart !== undefined && task.baselineEnd !== undefined;
      const baselineLeftPx = hasBaseline
        ? dateToPx(scale, task.baselineStart as Date)
        : null;
      return {
        task,
        index: this.rowIndexOf(task),
        leftPx,
        widthPx,
        baselineLeftPx,
        baselineWidthPx: hasBaseline
          ? Math.max(
              4,
              dateToPx(scale, task.baselineEnd as Date) -
                (baselineLeftPx as number),
            )
          : null,
        critical: critical.has(task.key),
      };
    });
  });

  protected readonly windowArrows = computed<readonly GanttArrow<D>[]>(() => {
    if (!this.showDependencies()) return [];
    const scale = this.scale();
    const rowHeight = this.rowHeight();
    const rows = this.rowIndexByKey();
    const tasksByKey = new Map(
      this.visibleTasks().map((task) => [task.key, task]),
    );
    const { first, last } = this.windowRange();
    const critical = this.criticalKeys();
    const arrows: GanttArrow<D>[] = [];
    for (const dependency of this.ganttDependencies()) {
      const from = tasksByKey.get(dependency.predecessorKey);
      const to = tasksByKey.get(dependency.successorKey);
      if (from === undefined || to === undefined) continue;
      const fromRow = rows.get(from.key) as number;
      const toRow = rows.get(to.key) as number;
      if (
        (fromRow < first - OVERSCAN_ROWS && toRow < first - OVERSCAN_ROWS) ||
        (fromRow > last + OVERSCAN_ROWS && toRow > last + OVERSCAN_ROWS)
      ) {
        continue;
      }
      const anchors = dependencyAnchors(dependency.type);
      const fromX = dateToPx(scale, anchors.fromEnd ? from.end : from.start);
      const toX = dateToPx(scale, anchors.toEnd ? to.end : to.start);
      arrows.push({
        dependency,
        path: dependencyPath(
          routeDependency(
            { x: fromX, y: fromRow * rowHeight + rowHeight / 2 },
            { x: toX, y: toRow * rowHeight + rowHeight / 2 },
            dependency.type,
          ),
        ),
        critical:
          critical.has(dependency.predecessorKey) &&
          critical.has(dependency.successorKey),
      });
    }
    return arrows;
  });

  protected readonly shadedTicks = computed(() => {
    const scale = this.scale();
    if (scale.type === 'weeks' || scale.type === 'months') return [];
    const holidays = this.holidays();
    return scale.ticks.filter((tick) => {
      const day = tick.date.getDay();
      const weekend =
        this.weekendsHighlighted() && (day === 0 || day === 6);
      return (
        weekend || holidays.some((holiday) => sameDay(holiday, tick.date))
      );
    });
  });

  protected readonly stripRects = computed(() => {
    const scale = this.scale();
    return this.stripLines().map((strip) => {
      const px = dateToPx(scale, strip.start);
      const widthPx =
        strip.end !== undefined
          ? Math.max(0, dateToPx(scale, strip.end) - px)
          : 0;
      return { px, widthPx, label: strip.label, color: strip.color };
    });
  });

  protected todayPx(): number | null {
    const scale = this.scale();
    const now = new Date();
    if (
      now.getTime() < scale.start.getTime() ||
      now.getTime() > scale.end.getTime()
    ) {
      return null;
    }
    return dateToPx(scale, now);
  }

  /* ---------------- columns / labels ---------------- */

  protected readonly resolvedColumns = computed(() => {
    const messages = this.msg().columns;
    const builtIn: Record<string, { header: string; width: number }> = {
      title: { header: messages.title, width: 180 },
      start: { header: messages.start, width: 88 },
      end: { header: messages.end, width: 88 },
      duration: { header: messages.duration, width: 64 },
      progress: { header: messages.progress, width: 64 },
    };
    return this.columns().map((column) => ({
      field: column.field,
      header: column.header ?? builtIn[column.field]?.header ?? column.field,
      widthPx: column.widthPx ?? builtIn[column.field]?.width ?? 100,
      format: column.format,
    }));
  });

  protected cellText(
    task: GanttTask<T>,
    column: { field: string; format?: (task: GanttTask) => string },
  ): string {
    if (column.format !== undefined) return column.format(task);
    const dateFormat = new Intl.DateTimeFormat(this.effectiveLocale(), {
      day: 'numeric',
      month: 'short',
    });
    switch (column.field) {
      case 'title':
        return task.title;
      case 'start':
        return dateFormat.format(task.start);
      case 'end':
        return dateFormat.format(task.end);
      case 'duration': {
        const days = Math.round(
          (task.end.getTime() - task.start.getTime()) / 86_400_000,
        );
        return this.msg().columns.durationDays.replace(
          '{days}',
          String(days),
        );
      }
      case 'progress':
        return `${task.progress}%`;
      default: {
        const value = (task.source as Record<string, unknown>)[column.field];
        return value == null ? '' : String(value);
      }
    }
  }

  protected paneAriaLabel(): string {
    return `${this.msg().grid.treeLabel}. ${this.msg().grid.treeHint}`;
  }

  protected taskAriaLabel(task: GanttTask<T>): string {
    const format = new Intl.DateTimeFormat(this.effectiveLocale(), {
      dateStyle: 'medium',
    });
    return this.msg()
      .grid.taskLabel.replace('{title}', task.title)
      .replace('{start}', format.format(task.start))
      .replace('{end}', format.format(task.end))
      .replace('{progress}', String(task.progress));
  }

  protected majorLabel(date: Date): string {
    const scale = this.scale();
    const locale = this.effectiveLocale();
    if (scale.type === 'hours') {
      return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
        date,
      );
    }
    return new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  protected minorLabel(date: Date): string {
    const scale = this.scale();
    const locale = this.effectiveLocale();
    switch (scale.type) {
      case 'hours':
        return new Intl.DateTimeFormat(locale, { hour: 'numeric' }).format(
          date,
        );
      case 'days':
        return String(date.getDate());
      case 'weeks':
        return new Intl.DateTimeFormat(locale, {
          day: 'numeric',
          month: 'short',
        }).format(date);
      case 'months':
        return new Intl.DateTimeFormat(locale, { month: 'short' }).format(
          date,
        );
    }
  }

  protected barForeground(task: GanttTask<T>): string | null {
    if (task.color === undefined) return null;
    const parsed = parseColor(task.color);
    return parsed === null ? null : contrastForeground(parsed);
  }

  protected resourceText(task: GanttTask<T>): string | null {
    const resources = this.resources();
    if (resources.length === 0) return null;
    const id = (task.source as Record<string, unknown>)[
      typeof this.resourceIdExpr() === 'string'
        ? (this.resourceIdExpr() as string)
        : ''
    ];
    return resources.find((resource) => resource.id === id)?.text ?? null;
  }

  protected resourceLabelLeft(bar: GanttBar<T>): number {
    const extra = this.taskTitlePosition() === 'outside' ? 90 : 8;
    return bar.leftPx + bar.widthPx + extra;
  }

  protected readonly hoverKey = signal<RowKey | null>(null);
  protected readonly focusKey = signal<RowKey | null>(null);
  protected readonly selectedDependencyKey = signal<RowKey | null>(null);
  protected readonly announcement = signal('');
  protected readonly dragKey = signal<RowKey | null>(null);
  protected readonly dragTip = signal<{
    x: number;
    y: number;
    text: string;
  } | null>(null);
  protected readonly linkPreview = signal<{
    path: string;
    valid: boolean;
  } | null>(null);

  protected readonly listWidth = signal(360);

  protected readonly String = String;

  /* ---------------- selection / expansion / keyboard ---------------- */

  protected toggleExpanded(task: GanttTask<T>, event?: Event): void {
    event?.stopPropagation();
    const next = new Set(untracked(this.collapsedKeys));
    if (next.has(task.key)) next.delete(task.key);
    else next.add(task.key);
    this.collapsedKeys.set(next);
  }

  /** Expands every summary task. */
  expandAll(): void {
    this.collapsedKeys.set(new Set());
  }

  /** Collapses every summary task. */
  collapseAll(): void {
    this.collapsedKeys.set(
      new Set(
        untracked(this.allTasks)
          .filter((task) => task.hasChildren)
          .map((task) => task.key),
      ),
    );
  }

  /** Collapses summaries at or below `level` (dx expandAllToLevel parity). */
  expandAllToLevel(level: number): void {
    this.collapsedKeys.set(
      new Set(
        untracked(this.allTasks)
          .filter((task) => task.hasChildren && task.level >= level)
          .map((task) => task.key),
      ),
    );
  }

  /** Expands every ancestor of `key` and scrolls its row into view. */
  expandToTask(key: RowKey): void {
    const all = untracked(this.allTasks);
    const byKey = new Map(all.map((task) => [task.key, task]));
    const next = new Set(untracked(this.collapsedKeys));
    let current = byKey.get(key)?.parentKey ?? null;
    while (current !== null) {
      next.delete(current);
      current = byKey.get(current)?.parentKey ?? null;
    }
    this.collapsedKeys.set(next);
    const index = untracked(this.rowIndexByKey).get(key);
    const body = this.bodyEl()?.nativeElement;
    if (index !== undefined && body !== undefined) {
      body.scrollTop = Math.max(0, index * this.rowHeight() - 80);
    }
    this.focusKey.set(key);
  }

  private select(task: GanttTask<T> | null): void {
    const key = task?.key ?? null;
    if (untracked(this.selectedTaskKey) === key) return;
    this.selectedTaskKey.set(key);
    this.selectionChanged.emit({ task });
  }

  protected onRowClick(task: GanttTask<T>, event: MouseEvent): void {
    this.focusKey.set(task.key);
    this.select(task);
    this.taskClick.emit({ task, event });
  }

  protected onRowDblClick(task: GanttTask<T>, event: MouseEvent): void {
    this.taskDblClick.emit({ task, event });
    this.openEditDialog(task);
  }

  protected onRowContextMenu(task: GanttTask<T>, event: MouseEvent): void {
    this.taskContextMenu.emit({ task, event });
  }

  protected onPaneKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.select(null);
  }

  protected onRowKeydown(task: GanttTask<T>, event: KeyboardEvent): void {
    const visible = this.visibleTasks();
    const index = this.rowIndexOf(task);
    const focusRow = (next: GanttTask<T> | undefined): void => {
      if (next === undefined) return;
      event.preventDefault();
      this.focusKey.set(next.key);
      this.select(next);
      setTimeout(() => {
        this.hostEl.nativeElement
          .querySelector<HTMLElement>('[data-focus-target]')
          ?.focus();
      });
    };
    if (event.ctrlKey && this.handleBarKey(task, event)) return;
    switch (event.key) {
      case 'ArrowDown':
        focusRow(visible[index + 1]);
        return;
      case 'ArrowUp':
        focusRow(visible[index - 1]);
        return;
      case 'ArrowRight':
        if (task.hasChildren && !task.expanded) {
          event.preventDefault();
          this.toggleExpanded(task);
        }
        return;
      case 'ArrowLeft':
        if (task.hasChildren && task.expanded) {
          event.preventDefault();
          this.toggleExpanded(task);
        } else if (task.parentKey !== null) {
          focusRow(visible.find((row) => row.key === task.parentKey));
        }
        return;
      case 'Enter':
        event.preventDefault();
        this.openEditDialog(task);
        return;
      case 'Delete':
      case 'Backspace':
        event.preventDefault();
        this.deleteTask(task.source);
        return;
      default:
        return;
    }
  }

  /** Ctrl+Arrows move the focused bar; Ctrl+Shift resizes the end edge. */
  private handleBarKey(task: GanttTask<T>, event: KeyboardEvent): boolean {
    if (task.isSummary) return false;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return false;
    if (!this.effectiveEditing() || !this.allowTaskUpdating()) return true;
    event.preventDefault();
    const scale = this.scale();
    const tick = scale.ticks[0]?.widthPx ?? 40;
    const deltaPx = event.key === 'ArrowRight' ? tick : -tick;
    const proposal = event.shiftKey
      ? proposeTaskResize(
          task,
          'end',
          deltaPx,
          scale,
          this.resolvedFirstDayOfWeek(),
        )
      : proposeTaskMove(task, deltaPx, scale, this.resolvedFirstDayOfWeek());
    this.commitProposal(task, proposal, event.shiftKey ? 'resized' : 'moved');
    return true;
  }

  /* ---------------- zoom / scrolling ---------------- */

  protected canZoom(direction: -1 | 1): boolean {
    const index = GANTT_SCALE_ORDER.indexOf(untracked(this.scaleType));
    const next = index + direction;
    return next >= 0 && next < GANTT_SCALE_ORDER.length;
  }

  /** Steps to the next finer scale. */
  zoomIn(): void {
    const index = GANTT_SCALE_ORDER.indexOf(untracked(this.scaleType));
    if (index > 0) this.scaleType.set(GANTT_SCALE_ORDER[index - 1]);
  }

  /** Steps to the next coarser scale. */
  zoomOut(): void {
    const index = GANTT_SCALE_ORDER.indexOf(untracked(this.scaleType));
    if (index < GANTT_SCALE_ORDER.length - 1) {
      this.scaleType.set(GANTT_SCALE_ORDER[index + 1]);
    }
  }

  /** Picks the finest scale whose full range fits the chart viewport. */
  zoomToFit(): void {
    const viewport = this.chartScrollEl()?.nativeElement.clientWidth ?? 800;
    for (const type of GANTT_SCALE_ORDER) {
      this.scaleType.set(type);
      if (untracked(this.scale).totalPx <= viewport) return;
    }
    this.scaleType.set(GANTT_SCALE_ORDER[GANTT_SCALE_ORDER.length - 1]);
  }

  /** Scrolls the chart so `date` sits near the left edge. */
  scrollToDate(date: Date): void {
    const chart = this.chartScrollEl()?.nativeElement;
    if (chart === undefined) return;
    chart.scrollLeft = Math.max(0, dateToPx(untracked(this.scale), date) - 40);
  }

  /** Focuses the roving task row. */
  focus(): void {
    const key =
      untracked(this.focusKey) ?? untracked(this.visibleTasks)[0]?.key;
    if (key === undefined) return;
    this.focusKey.set(key);
    setTimeout(() => {
      this.hostEl.nativeElement
        .querySelector<HTMLElement>('[data-focus-target]')
        ?.focus();
    });
  }

  /* ---------------- splitter ---------------- */

  protected onSplitterPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    const startWidth = untracked(this.listWidth);
    beginGanttGesture(event, {
      onMove: (deltaX) => {
        this.listWidth.set(Math.min(720, Math.max(160, startWidth + deltaX)));
      },
      onFinish: () => undefined,
    });
  }

  /* ---------------- bar gestures ---------------- */

  protected onBarPointerDown(
    bar: GanttBar<T>,
    kind: 'move' | 'resize-start' | 'resize-end' | 'progress',
    event: PointerEvent,
  ): void {
    if (
      !this.effectiveEditing() ||
      !this.allowTaskUpdating() ||
      event.button !== 0 ||
      bar.task.isSummary
    ) {
      return;
    }
    if (kind !== 'move') event.stopPropagation();
    const scale = this.scale();
    const firstDay = this.resolvedFirstDayOfWeek();
    const dateFormat = new Intl.DateTimeFormat(this.effectiveLocale(), {
      day: 'numeric',
      month: 'short',
    });
    let proposal: GanttTaskProposal | null = null;
    let progress: number | null = null;
    this.dragKey.set(bar.task.key);
    beginGanttGesture(event, {
      onMove: (deltaX, _deltaY, moveEvent) => {
        const canvasRect = this.canvasEl()?.nativeElement.getBoundingClientRect();
        const tipX =
          canvasRect !== undefined ? moveEvent.clientX - canvasRect.left : 0;
        const tipY =
          canvasRect !== undefined ? moveEvent.clientY - canvasRect.top - 28 : 0;
        if (kind === 'progress') {
          progress = proposeTaskProgress(
            bar.leftPx,
            bar.leftPx + bar.widthPx,
            tipX,
          );
          this.dragTip.set({ x: tipX, y: tipY, text: `${progress}%` });
          return;
        }
        proposal =
          kind === 'move'
            ? proposeTaskMove(bar.task, deltaX, scale, firstDay)
            : proposeTaskResize(
                bar.task,
                kind === 'resize-start' ? 'start' : 'end',
                deltaX,
                scale,
                firstDay,
              );
        this.dragTip.set({
          x: tipX,
          y: tipY,
          text: `${dateFormat.format(proposal.start)} - ${dateFormat.format(proposal.end)}`,
        });
      },
      onFinish: (commit, cancelled) => {
        this.dragKey.set(null);
        this.dragTip.set(null);
        if (commit && progress !== null) {
          this.applyPatch(
            bar.task,
            ganttTaskPatch(bar.task.source, { progress }, this.fields()),
            'progressChanged',
            { title: bar.task.title, progress: String(progress) },
          );
          return;
        }
        if (commit && proposal !== null) {
          this.commitProposal(
            bar.task,
            proposal,
            kind === 'move' ? 'moved' : 'resized',
          );
        } else if (cancelled) {
          this.announcement.set(this.msg().announcements.cancelled);
        }
      },
    });
  }

  /* ---------------- dependency drawing ---------------- */

  protected onLinkPointerDown(
    bar: GanttBar<T>,
    fromEnd: boolean,
    event: PointerEvent,
  ): void {
    if (
      !this.effectiveEditing() ||
      !this.allowDependencyAdding() ||
      event.button !== 0
    ) {
      return;
    }
    event.stopPropagation();
    const rowHeight = this.rowHeight();
    const fromX = fromEnd ? bar.leftPx + bar.widthPx : bar.leftPx;
    const fromY = bar.index * rowHeight + rowHeight / 2;
    let target: { task: GanttTask<T>; toEnd: boolean } | null = null;
    beginGanttGesture(event, {
      onMove: (_dx, _dy, moveEvent) => {
        const rect = this.canvasEl()?.nativeElement.getBoundingClientRect();
        if (rect === undefined) return;
        const x = moveEvent.clientX - rect.left;
        const y = moveEvent.clientY - rect.top;
        const rowIndex = Math.floor(y / rowHeight);
        const task = this.visibleTasks()[rowIndex];
        target = null;
        let valid = false;
        if (
          task !== undefined &&
          task.key !== bar.task.key &&
          !task.isSummary
        ) {
          const scale = this.scale();
          const mid =
            (dateToPx(scale, task.start) + dateToPx(scale, task.end)) / 2;
          target = { task, toEnd: x > mid };
          valid = !wouldCreateCycle(
            this.ganttDependencies(),
            bar.task.key,
            task.key,
          );
        }
        this.linkPreview.set({
          path: `M ${fromX} ${fromY} L ${x} ${y}`,
          valid,
        });
      },
      onFinish: (commit, cancelled) => {
        this.linkPreview.set(null);
        if (commit && target !== null) {
          const type = ((fromEnd ? 'F' : 'S') +
            (target.toEnd ? 'F' : 'S')) as OgeGanttDependencyType;
          this.insertDependency(bar.task.key, target.task.key, type);
        } else if (cancelled) {
          this.announcement.set(this.msg().announcements.cancelled);
        }
      },
    });
  }

  protected onArrowClick(dependency: GanttDependency<D>, event: Event): void {
    event.stopPropagation();
    this.selectedDependencyKey.set(dependency.key);
    const onKey = (keyEvent: KeyboardEvent): void => {
      if (keyEvent.key === 'Delete' || keyEvent.key === 'Backspace') {
        this.deleteDependency(dependency.source);
      }
      document.removeEventListener('keydown', onKey);
      this.selectedDependencyKey.set(null);
    };
    document.addEventListener('keydown', onKey);
  }

  /* ---------------- CRUD ---------------- */

  private commitProposal(
    task: GanttTask<T>,
    proposal: GanttTaskProposal,
    kind: 'moved' | 'resized',
  ): void {
    const format = new Intl.DateTimeFormat(this.effectiveLocale(), {
      dateStyle: 'medium',
    });
    this.applyPatch(
      task,
      ganttTaskPatch(
        task.source,
        { start: proposal.start, end: proposal.end },
        this.fields(),
      ),
      kind === 'moved' ? 'taskMoved' : 'taskResized',
      {
        title: task.title,
        start: format.format(proposal.start),
        end: format.format(proposal.end),
      },
    );
  }

  /** Guarded update used by every mutation path. */
  private applyPatch(
    task: GanttTask<T>,
    patch: Partial<T>,
    announceKey: keyof OgeGanttMessages['announcements'],
    tokens: Readonly<Record<string, string>>,
  ): void {
    if (!this.effectiveEditing() || !this.allowTaskUpdating()) return;
    const event: OgeGanttTaskUpdatingEvent<T> = {
      oldData: task.source,
      newData: patch,
      cancel: false,
    };
    this.taskUpdating.emit(event);
    if (event.cancel) return;
    this.snapshot();
    const updated = { ...task.source, ...patch };
    this.taskStore.set(
      untracked(this.taskStore).map((item) =>
        item === task.source ? updated : item,
      ),
    );
    this.taskUpdated.emit({ taskData: updated });
    this.announce(this.msg().announcements[announceKey], tokens);
    this.runAutoSchedule();
  }

  /** Inserts a task through the cancelable pipeline. */
  insertTask(taskData: T): void {
    if (!this.effectiveEditing() || !this.allowTaskAdding()) return;
    const event: OgeGanttTaskInsertingEvent<T> = { taskData, cancel: false };
    this.taskInserting.emit(event);
    if (event.cancel) return;
    this.snapshot();
    this.taskStore.set([...untracked(this.taskStore), taskData]);
    this.taskInserted.emit({ taskData });
    this.announce(this.msg().announcements.taskCreated, {
      title: String(this.fields().title(taskData) ?? ''),
    });
    this.runAutoSchedule();
  }

  /** Updates a task's fields through the cancelable pipeline. */
  updateTask(taskData: T, patch: Partial<T>): void {
    const task = untracked(this.allTasks).find(
      (entry) => entry.source === taskData,
    );
    if (task === undefined) return;
    this.applyPatch(task, patch, 'taskUpdated', { title: task.title });
  }

  /** Deletes a task (and its dependency links) through the pipeline. */
  deleteTask(taskData: T): void {
    if (!this.effectiveEditing() || !this.allowTaskDeleting()) return;
    const event: OgeGanttTaskDeletingEvent<T> = { taskData, cancel: false };
    this.taskDeleting.emit(event);
    if (event.cancel) return;
    this.snapshot();
    const fields = this.fields();
    const key = fields.key(taskData) as RowKey;
    const linked = new Set(
      untracked(this.ganttDependencies)
        .filter(
          (dep) => dep.predecessorKey === key || dep.successorKey === key,
        )
        .map((dep) => dep.source),
    );
    this.taskStore.set(
      untracked(this.taskStore).filter((item) => item !== taskData),
    );
    this.dependencyStore.set(
      untracked(this.dependencyStore).filter((item) => !linked.has(item)),
    );
    this.taskDeleted.emit({ taskData });
    this.announce(this.msg().announcements.taskDeleted, {
      title: String(fields.title(taskData) ?? ''),
    });
  }

  /** Inserts a dependency link (cycle-checked, cancelable). */
  insertDependency(
    predecessorKey: RowKey,
    successorKey: RowKey,
    type: OgeGanttDependencyType = 'FS',
  ): void {
    if (!this.effectiveEditing() || !this.allowDependencyAdding()) return;
    if (
      wouldCreateCycle(
        untracked(this.ganttDependencies),
        predecessorKey,
        successorKey,
      )
    ) {
      this.announcement.set(this.msg().announcements.dependencyRejected);
      return;
    }
    const event: OgeGanttDependencyInsertingEvent = {
      predecessorKey,
      successorKey,
      type,
      cancel: false,
    };
    this.dependencyInserting.emit(event);
    if (event.cancel) return;
    this.snapshot();
    const item: Record<string, unknown> = {};
    const set = (expr: GanttFieldExpr<D>, value: unknown): void => {
      if (typeof expr === 'string') item[expr] = value;
    };
    set(
      this.dependencyKeyExpr(),
      `${String(predecessorKey)}-${String(successorKey)}`,
    );
    set(this.predecessorKeyExpr(), predecessorKey);
    set(this.successorKeyExpr(), successorKey);
    set(this.dependencyTypeExpr(), type);
    const dependencyData = item as D;
    this.dependencyStore.set([
      ...untracked(this.dependencyStore),
      dependencyData,
    ]);
    this.dependencyInserted.emit({ dependencyData });
    this.announce(this.msg().announcements.dependencyCreated, {
      from: String(predecessorKey),
      to: String(successorKey),
    });
    this.runAutoSchedule();
  }

  /** Deletes a dependency link through the pipeline. */
  deleteDependency(dependencyData: D): void {
    if (!this.effectiveEditing() || !this.allowDependencyDeleting()) return;
    const event: OgeGanttDependencyDeletingEvent<D> = {
      dependencyData,
      cancel: false,
    };
    this.dependencyDeleting.emit(event);
    if (event.cancel) return;
    this.snapshot();
    const normalized = untracked(this.ganttDependencies).find(
      (entry) => entry.source === dependencyData,
    );
    this.dependencyStore.set(
      untracked(this.dependencyStore).filter(
        (item) => item !== dependencyData,
      ),
    );
    this.dependencyDeleted.emit({ dependencyData });
    this.announce(this.msg().announcements.dependencyDeleted, {
      from: String(normalized?.predecessorKey ?? ''),
      to: String(normalized?.successorKey ?? ''),
    });
  }

  /** Applies the forward pass when `autoScheduling` is on. */
  private runAutoSchedule(): void {
    if (!this.autoScheduling()) return;
    const changes = autoScheduleForward(
      untracked(this.allTasks),
      untracked(this.ganttDependencies),
    );
    if (changes.length === 0) return;
    const fields = this.fields();
    const byKey = new Map(
      untracked(this.allTasks).map((task) => [task.key, task]),
    );
    let next = untracked(this.taskStore);
    for (const change of changes) {
      const task = byKey.get(change.key);
      if (task === undefined) continue;
      const patch = ganttTaskPatch(
        task.source,
        { start: change.start, end: change.end },
        fields,
      );
      next = next.map((item) =>
        item === task.source ? { ...item, ...patch } : item,
      );
    }
    this.taskStore.set(next);
  }

  /* ---------------- dialog ---------------- */

  private editedSource: T | null = null;
  private draftCounter = 0;

  /** Opens the task dialog: a prefilled create form without arguments. */
  showTaskDetailsDialog(taskData?: T): void {
    if (taskData !== undefined) {
      const task = untracked(this.allTasks).find(
        (entry) => entry.source === taskData,
      );
      if (task !== undefined) this.openEditDialog(task);
      return;
    }
    if (!this.effectiveEditing() || !this.allowTaskAdding()) return;
    const today = startOfDay(new Date());
    this.openDialog(
      {
        title: '',
        start: today,
        end: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 1,
        ),
        progress: 0,
      },
      this.buildDraft(today),
      true,
    );
  }

  private buildDraft(start: Date): T {
    const item: Record<string, unknown> = {};
    const set = (expr: GanttFieldExpr<T>, value: unknown): void => {
      if (typeof expr === 'string') item[expr] = value;
    };
    set(this.keyExpr(), `oge-task-${++this.draftCounter}-${untracked(this.taskStore).length}`);
    set(this.titleExpr(), '');
    set(this.startExpr(), start);
    set(
      this.endExpr(),
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1),
    );
    set(this.progressExpr(), 0);
    return item as T;
  }

  private openEditDialog(task: GanttTask<T>): void {
    if (!this.effectiveEditing() || !this.allowTaskUpdating()) return;
    this.openDialog(
      {
        title: task.title,
        start: task.start,
        end: task.end,
        progress: task.progress,
        color: task.color,
      },
      task.source,
      false,
    );
  }

  private openDialog(model: GanttEditorModel, source: T, isNew: boolean): void {
    const dialog = this.dialog();
    const event: OgeGanttDialogShowingEvent<T> = {
      taskData: source,
      isNew,
      formItems: dialog.defaultItems(),
      cancel: false,
    };
    this.taskEditDialogShowing.emit(event);
    if (event.cancel) return;
    this.editedSource = isNew ? null : source;
    dialog.open(model, isNew, event.formItems);
  }

  protected onDialogSaved(result: GanttEditorResult): void {
    const fields = this.fields();
    if (result.isNew) {
      const draft = this.buildDraft(result.model.start);
      const patch = ganttTaskPatch(draft, result.model, fields);
      this.insertTask({ ...draft, ...patch });
    } else if (this.editedSource !== null) {
      this.updateTask(
        this.editedSource,
        ganttTaskPatch(this.editedSource, result.model, fields),
      );
    }
    this.editedSource = null;
  }

  protected onDialogDelete(): void {
    if (this.editedSource !== null) this.deleteTask(this.editedSource);
    this.editedSource = null;
  }

  private announce(
    template: string,
    tokens: Readonly<Record<string, string>>,
  ): void {
    let text = template;
    for (const [token, value] of Object.entries(tokens)) {
      text = text.replace(`{${token}}`, value);
    }
    this.announcement.set(text);
  }
}
