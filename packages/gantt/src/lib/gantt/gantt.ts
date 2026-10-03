import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  contentChild,
  effect,
  inject,
  input,
  model,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import type { OgeFormItemData } from '@oge-ui/forms';
import { OgeLiveAnnouncer } from '@oge-ui/overlay';
import type { RowKey } from '@oge-ui/core';
import {
  OgeGanttCore,
  type GanttFieldExpr,
  type OgeGanttCoreEvents,
} from '@oge-ui/gantt-engine';
import type { OgeGanttMessages } from '../config';
import { OGE_GANTT_CONFIG } from '../config';
import type {
  OgeGanttColumn,
  OgeGanttDependencyDeletedEvent,
  OgeGanttDependencyDeletingEvent,
  OgeGanttDependencyInsertedEvent,
  OgeGanttDependencyInsertingEvent,
  OgeGanttDependencyType,
  OgeGanttDialogShowingEvent,
  OgeGanttExportData,
  OgeGanttResource,
  OgeGanttScaleType,
  OgeGanttSelectionChangedEvent,
  OgeGanttStripLine,
  OgeGanttTask,
  OgeGanttTaskClickEvent,
  OgeGanttTaskDeletedEvent,
  OgeGanttTaskDeletingEvent,
  OgeGanttTaskInsertedEvent,
  OgeGanttTaskInsertingEvent,
  OgeGanttTaskTitlePosition,
  OgeGanttTaskUpdatedEvent,
  OgeGanttTaskUpdatingEvent,
  OgeGanttWorkCalendar,
} from '../gantt-types';
import { OgeGanttTaskDialog } from './gantt-task-dialog';
import {
  OgeGanttTaskTemplate,
  OgeGanttTooltipTemplate,
} from './gantt-templates';
import { SIGNAL_ADAPTER } from './signal-adapter';

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
      [attr.aria-label]="core.msg().toolbar.label"
    >
      @if (core.effectiveEditing() && allowTaskAdding()) {
        <button
          type="button"
          class="oge-gantt-btn oge-gantt-btn-primary oge-gantt-btn-add"
          (click)="showTaskDetailsDialog()"
        >
          <svg
            viewBox="0 0 16 16"
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M8 3.5v9M3.5 8h9" />
          </svg>
          {{ core.msg().toolbar.addTask }}
        </button>
      }
      <div class="oge-gantt-toolbar-group">
        <button
          type="button"
          class="oge-gantt-btn oge-gantt-btn-icon"
          [attr.aria-label]="core.msg().toolbar.zoomOut"
          [disabled]="!core.canZoom(1)"
          (click)="zoomOut()"
        >
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="4.5" />
            <path d="m10.5 10.5 3 3M5 7h4" />
          </svg>
        </button>
        <button
          type="button"
          class="oge-gantt-btn oge-gantt-btn-icon"
          [attr.aria-label]="core.msg().toolbar.zoomIn"
          [disabled]="!core.canZoom(-1)"
          (click)="zoomIn()"
        >
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="4.5" />
            <path d="m10.5 10.5 3 3M5 7h4M7 5v4" />
          </svg>
        </button>
        <button type="button" class="oge-gantt-btn" (click)="zoomToFit()">
          {{ core.msg().toolbar.zoomToFit }}
        </button>
        <button type="button" class="oge-gantt-btn" (click)="core.goToday()">
          {{ core.msg().toolbar.today }}
        </button>
      </div>
      <div class="oge-gantt-toolbar-group">
        <button type="button" class="oge-gantt-btn" (click)="expandAll()">
          {{ core.msg().toolbar.expandAll }}
        </button>
        <button type="button" class="oge-gantt-btn" (click)="collapseAll()">
          {{ core.msg().toolbar.collapseAll }}
        </button>
      </div>
      @if (core.effectiveEditing()) {
        <div class="oge-gantt-toolbar-group">
          <button
            type="button"
            class="oge-gantt-btn oge-gantt-btn-icon"
            [attr.aria-label]="core.msg().toolbar.undo"
            [disabled]="!core.canUndo()"
            (click)="undo()"
          >
            <svg
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M6.5 3.5 3 7l3.5 3.5M3 7h7a3 3 0 0 1 0 6H8" />
            </svg>
          </button>
          <button
            type="button"
            class="oge-gantt-btn oge-gantt-btn-icon"
            [attr.aria-label]="core.msg().toolbar.redo"
            [disabled]="!core.canRedo()"
            (click)="redo()"
          >
            <svg
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M9.5 3.5 13 7l-3.5 3.5M13 7H6a3 3 0 0 0 0 6h2" />
            </svg>
          </button>
        </div>
      }
    </div>

    <div class="oge-gantt-body" #bodyEl (scroll)="core.onBodyScroll()">
      @if (core.visibleTasks().length === 0) {
        <div class="oge-gantt-empty">
          <svg
            viewBox="0 0 48 48"
            width="44"
            height="44"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <rect x="6" y="10" width="24" height="7" rx="3.5" />
            <rect x="14" y="21" width="28" height="7" rx="3.5" />
            <rect x="10" y="32" width="18" height="7" rx="3.5" />
          </svg>
          <div class="oge-gantt-empty-title">{{ core.msg().grid.noTasks }}</div>
          <div class="oge-gantt-empty-hint">
            {{ core.msg().grid.noTasksHint }}
          </div>
          @if (core.effectiveEditing() && allowTaskAdding()) {
            <button
              type="button"
              class="oge-gantt-btn oge-gantt-btn-primary"
              (click)="showTaskDetailsDialog()"
            >
              {{ core.msg().toolbar.addTask }}
            </button>
          }
        </div>
      }
      <div
        class="oge-gantt-layout"
        [style.--oge-gantt-list-width.px]="core.listWidth()"
        [style.--oge-gantt-row-height.px]="core.rowHeight()"
      >
        <!-- ======== task list pane ======== -->
        <!-- delegated keydown; focus lives on the roving row -->
        <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -->
        <div
          class="oge-gantt-pane"
          role="treegrid"
          [attr.aria-label]="core.paneAriaLabel()"
          [attr.aria-rowcount]="tasks().length"
          (keydown)="core.onPaneKeydown($event)"
        >
          <div class="oge-gantt-pane-header" role="row">
            @for (column of core.resolvedColumns(); track column.field) {
              <div
                class="oge-gantt-pane-headcell"
                role="columnheader"
                [style.width.px]="column.widthPx"
              >
                {{ column.header }}
              </div>
            }
          </div>
          <div [style.height.px]="core.windowTopPx()" aria-hidden="true"></div>
          @for (task of core.windowTasks(); track task.key) {
            <div
              class="oge-gantt-row"
              role="row"
              [attr.aria-level]="task.level + 1"
              [attr.aria-expanded]="task.hasChildren ? task.expanded : null"
              [attr.aria-selected]="task.key === selectedTaskKey()"
              [attr.aria-rowindex]="core.rowIndexOf(task) + 1"
              [attr.aria-label]="core.taskAriaLabel(task)"
              [class.oge-gantt-row-selected]="task.key === selectedTaskKey()"
              [class.oge-gantt-row-hover]="task.key === core.hoverKey()"
              [tabindex]="task.key === core.rovingKey() ? 0 : -1"
              [attr.data-focus-target]="
                task.key === core.rovingKey() ? '' : null
              "
              (click)="core.onRowClick(task, $event)"
              (dblclick)="core.onRowDblClick(task, $event)"
              (contextmenu)="core.onRowContextMenu(task, $event)"
              (mouseenter)="core.hoverKey.set(task.key)"
              (mouseleave)="core.hoverKey.set(null)"
              (keydown)="core.onRowKeydown(task, $event)"
            >
              @for (
                column of core.resolvedColumns();
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
                        (click)="core.toggleExpanded(task, $event)"
                      >
                        <svg
                          viewBox="0 0 16 16"
                          width="11"
                          height="11"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <path d="m6 3.5 4.5 4.5L6 12.5" />
                        </svg>
                      </span>
                    } @else {
                      <span
                        class="oge-gantt-toggle-spacer"
                        aria-hidden="true"
                      ></span>
                    }
                  }
                  <span class="oge-gantt-cell-text">{{
                    core.cellText(task, column)
                  }}</span>
                </div>
              }
            </div>
          }
          <div
            [style.height.px]="core.windowBottomPx()"
            aria-hidden="true"
          ></div>
        </div>

        <!-- ======== splitter ======== -->
        <div
          class="oge-gantt-splitter"
          role="separator"
          aria-orientation="vertical"
          [attr.aria-valuemin]="160"
          [attr.aria-valuemax]="720"
          [attr.aria-valuenow]="core.listWidth()"
          tabindex="-1"
          (pointerdown)="core.onSplitterPointerDown($event)"
        ></div>

        <!-- ======== chart ======== -->
        <div
          class="oge-gantt-chart-scroll"
          #chartScrollEl
          role="group"
          [attr.aria-label]="core.msg().grid.chartLabel"
          tabindex="0"
        >
          <div class="oge-gantt-chart" [style.width.px]="core.scale().totalPx">
            <div class="oge-gantt-scale" role="presentation">
              <div class="oge-gantt-scale-major">
                @for (tick of core.scale().majorTicks; track tick.px) {
                  <span
                    class="oge-gantt-scale-cell"
                    [style.inset-inline-start.px]="tick.px"
                    [style.width.px]="tick.widthPx"
                    >{{ core.majorLabel(tick.date) }}</span
                  >
                }
              </div>
              <div class="oge-gantt-scale-minor">
                @for (tick of core.scale().ticks; track tick.px) {
                  <span
                    class="oge-gantt-scale-cell"
                    [style.inset-inline-start.px]="tick.px"
                    [style.width.px]="tick.widthPx"
                    >{{ core.minorLabel(tick.date) }}</span
                  >
                }
              </div>
            </div>
            <div
              class="oge-gantt-canvas"
              #canvasEl
              [style.height.px]="tasks().length * core.rowHeight()"
              (dblclick)="core.onCanvasDblClick($event)"
              (pointerdown)="core.onCanvasPointerDown($event)"
              (contextmenu)="core.onCanvasContextMenu($event)"
            >
              @for (shade of core.shadedTicks(); track shade.px) {
                <div
                  class="oge-gantt-offday"
                  [style.inset-inline-start.px]="shade.px"
                  [style.width.px]="shade.widthPx"
                  aria-hidden="true"
                ></div>
              }
              @for (strip of core.stripRects(); track strip.px) {
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
              @if (core.todayPx(); as px) {
                <div
                  class="oge-gantt-today"
                  [style.inset-inline-start.px]="px"
                  [title]="core.msg().grid.todayLabel"
                  aria-hidden="true"
                ></div>
              }
              @if (showRowLines()) {
                @for (task of core.windowTasks(); track task.key) {
                  <div
                    class="oge-gantt-rowline"
                    [style.top.px]="
                      (core.rowIndexOf(task) + 1) * core.rowHeight()
                    "
                    aria-hidden="true"
                  ></div>
                }
              }
              @for (task of core.windowTasks(); track task.key) {
                <div
                  class="oge-gantt-lane"
                  [class.oge-gantt-row-selected]="
                    task.key === selectedTaskKey()
                  "
                  [class.oge-gantt-row-hover]="task.key === core.hoverKey()"
                  [style.top.px]="core.rowIndexOf(task) * core.rowHeight()"
                  [style.height.px]="core.rowHeight()"
                  (mouseenter)="core.hoverKey.set(task.key)"
                  (mouseleave)="core.hoverKey.set(null)"
                ></div>
              }
              <svg
                class="oge-gantt-arrows"
                [attr.height]="tasks().length * core.rowHeight()"
                [attr.width]="core.scale().totalPx"
                aria-hidden="true"
              >
                @for (
                  arrow of core.windowArrows();
                  track arrow.dependency.key
                ) {
                  <path
                    class="oge-gantt-arrow"
                    [class.oge-gantt-arrow-critical]="arrow.critical"
                    [class.oge-gantt-arrow-selected]="
                      arrow.dependency.key === core.selectedDependencyKey()
                    "
                    [attr.d]="arrow.path"
                    (click)="core.onArrowClick(arrow.dependency, $event)"
                  />
                }
                @if (core.linkPreview(); as preview) {
                  <path
                    class="oge-gantt-arrow oge-gantt-arrow-preview"
                    [class.oge-gantt-arrow-invalid]="!preview.valid"
                    [attr.d]="preview.path"
                  />
                }
              </svg>
              @for (bar of core.windowBars(); track bar.task.key) {
                <div
                  class="oge-gantt-bar-box"
                  [class.oge-gantt-bar-box-selected]="
                    bar.task.key === selectedTaskKey()
                  "
                  [style.top.px]="bar.index * core.rowHeight()"
                  [style.height.px]="core.rowHeight()"
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
                      (pointerdown)="core.onBarPointerDown(bar, 'move', $event)"
                      (dblclick)="core.onRowDblClick(bar.task, $event)"
                      (mouseenter)="core.tooltipKey.set(bar.task.key)"
                      (mouseleave)="core.tooltipKey.set(null)"
                    ></div>
                  } @else if (bar.task.isSummary) {
                    <div
                      class="oge-gantt-summary oge-gantt-target"
                      [class.oge-gantt-critical]="bar.critical"
                      [style.inset-inline-start.px]="bar.leftPx"
                      [style.width.px]="bar.widthPx"
                      [style.background-color]="bar.task.color ?? null"
                      [attr.data-task-key]="String(bar.task.key)"
                      (mouseenter)="core.tooltipKey.set(bar.task.key)"
                      (mouseleave)="core.tooltipKey.set(null)"
                    ></div>
                  } @else {
                    <div
                      class="oge-gantt-bar oge-gantt-target"
                      [class.oge-gantt-critical]="bar.critical"
                      [class.oge-gantt-dragging]="
                        core.dragKey() === bar.task.key
                      "
                      [style.inset-inline-start.px]="bar.leftPx"
                      [style.width.px]="bar.widthPx"
                      [style.background-color]="bar.task.color ?? null"
                      [style.color]="core.barForeground(bar.task)"
                      [attr.data-task-key]="String(bar.task.key)"
                      (pointerdown)="core.onBarPointerDown(bar, 'move', $event)"
                      (dblclick)="core.onRowDblClick(bar.task, $event)"
                      (mouseenter)="core.tooltipKey.set(bar.task.key)"
                      (mouseleave)="core.tooltipKey.set(null)"
                    >
                      <div
                        class="oge-gantt-progress"
                        [style.width.%]="bar.task.progress"
                        aria-hidden="true"
                      ></div>
                      @if (core.effectiveEditing() && allowTaskUpdating()) {
                        <div
                          class="oge-gantt-handle oge-gantt-handle-start"
                          aria-hidden="true"
                          (pointerdown)="
                            core.onBarPointerDown(bar, 'resize-start', $event)
                          "
                        ></div>
                        <div
                          class="oge-gantt-handle oge-gantt-handle-end"
                          aria-hidden="true"
                          (pointerdown)="
                            core.onBarPointerDown(bar, 'resize-end', $event)
                          "
                        ></div>
                        <div
                          class="oge-gantt-progress-knob"
                          [style.inset-inline-start.%]="bar.task.progress"
                          aria-hidden="true"
                          (pointerdown)="
                            core.onBarPointerDown(bar, 'progress', $event)
                          "
                        ></div>
                      }
                      @if (core.effectiveEditing() && allowDependencyAdding()) {
                        <div
                          class="oge-gantt-link-dot oge-gantt-link-dot-start"
                          aria-hidden="true"
                          (pointerdown)="
                            core.onLinkPointerDown(bar, false, $event)
                          "
                        ></div>
                        <div
                          class="oge-gantt-link-dot oge-gantt-link-dot-end"
                          aria-hidden="true"
                          (pointerdown)="
                            core.onLinkPointerDown(bar, true, $event)
                          "
                        ></div>
                      }
                      @if (taskTitlePosition() === 'inside') {
                        <span class="oge-gantt-bar-title">
                          @if (taskTemplate(); as tpl) {
                            <ng-container
                              [ngTemplateOutlet]="tpl.templateRef"
                              [ngTemplateOutletContext]="{
                                $implicit: bar.task,
                              }"
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
                        [style.inset-inline-start.px]="
                          bar.leftPx + bar.widthPx + 8
                        "
                        >{{ bar.task.title }}</span
                      >
                    }
                  }
                  @if (core.resourceText(bar.task); as text) {
                    <span
                      class="oge-gantt-resource"
                      [style.inset-inline-start.px]="
                        core.resourceLabelLeft(bar)
                      "
                      >{{ text }}</span
                    >
                  }
                </div>
              }
              @if (core.drawPreview(); as draw) {
                <div
                  class="oge-gantt-draw-preview"
                  [style.inset-inline-start.px]="draw.leftPx"
                  [style.width.px]="draw.widthPx"
                  [style.top.px]="draw.top"
                  [style.height.px]="core.rowHeight() - 12"
                  aria-hidden="true"
                ></div>
              }
            </div>
            @if (core.dragTip(); as tip) {
              <div
                class="oge-gantt-drag-tip"
                [style.inset-inline-start.px]="tip.x"
                [style.top.px]="core.dragTipTop(tip)"
                aria-hidden="true"
              >
                {{ tip.text }}
              </div>
            }
            @if (core.tooltipBar(); as bar) {
              <div
                class="oge-gantt-tooltip"
                [class.oge-gantt-tooltip-below]="bar.index < 2"
                [style.inset-inline-start.px]="bar.leftPx"
                [style.top.px]="core.tooltipTop(bar)"
                aria-hidden="true"
              >
                @if (tooltipTemplate(); as tpl) {
                  <ng-container
                    [ngTemplateOutlet]="tpl.templateRef"
                    [ngTemplateOutletContext]="{ $implicit: bar.task }"
                  />
                } @else {
                  <strong class="oge-gantt-tooltip-title">{{
                    bar.task.title
                  }}</strong>
                  <span class="oge-gantt-tooltip-line">{{
                    core.tooltipDates(bar.task)
                  }}</span>
                  @if (!bar.task.isMilestone) {
                    <span class="oge-gantt-tooltip-line"
                      >{{ bar.task.progress }}%</span
                    >
                  }
                  @if (core.resourceText(bar.task); as names) {
                    <span class="oge-gantt-tooltip-line">{{ names }}</span>
                  }
                }
              </div>
            }
            @if (core.workloadRows().length > 0) {
              <div class="oge-gantt-workload" aria-hidden="true">
                @for (row of core.workloadRows(); track row.id) {
                  <div class="oge-gantt-workload-row">
                    <span class="oge-gantt-workload-label">{{ row.text }}</span>
                    @for (segment of row.segments; track segment.px) {
                      <div
                        class="oge-gantt-workload-seg"
                        [class.oge-gantt-workload-over]="segment.over"
                        [style.inset-inline-start.px]="segment.px"
                        [style.width.px]="segment.widthPx"
                        [style.background-color]="
                          segment.over ? null : (row.color ?? null)
                        "
                      ></div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    </div>

    <oge-gantt-task-dialog
      [messages]="core.msg().dialog"
      [locale]="core.effectiveLocale()"
      [resources]="resources()"
      [allowDeleting]="core.effectiveEditing() && allowTaskDeleting()"
      (saved)="core.onDialogSaved($event)"
      (deleteRequested)="core.onDialogDelete()"
    />
    @if (core.contextMenu(); as menu) {
      <!-- click-away surface only; Escape on the focused menu closes too -->
      <!-- eslint-disable @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
      <div
        class="oge-gantt-menu-backdrop"
        (click)="core.closeMenu()"
        (contextmenu)="$event.preventDefault(); core.closeMenu()"
      ></div>
      <!-- eslint-enable @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
      <div
        class="oge-gantt-menu"
        role="menu"
        tabindex="-1"
        [style.left.px]="menu.x"
        [style.top.px]="menu.y"
        (keydown.escape)="core.closeMenu()"
      >
        @if (menu.task !== null) {
          <button
            type="button"
            role="menuitem"
            class="oge-gantt-menu-item"
            [disabled]="!core.menuState().edit"
            (click)="core.menuEdit()"
          >
            {{ core.msg().menu.editTask }}
          </button>
          <button
            type="button"
            role="menuitem"
            class="oge-gantt-menu-item"
            [disabled]="!core.menuState().newSubtask"
            (click)="core.menuNewSubtask()"
          >
            {{ core.msg().menu.newSubtask }}
          </button>
        }
        <button
          type="button"
          role="menuitem"
          class="oge-gantt-menu-item"
          [disabled]="!core.menuState().newTask"
          (click)="core.menuNewTask()"
        >
          {{ core.msg().menu.newTask }}
        </button>
        @if (menu.task !== null) {
          <div class="oge-gantt-menu-sep" role="separator"></div>
          <button
            type="button"
            role="menuitem"
            class="oge-gantt-menu-item"
            [disabled]="!core.menuState().indent"
            (click)="core.menuIndent()"
          >
            {{ core.msg().menu.indent }}
          </button>
          <button
            type="button"
            role="menuitem"
            class="oge-gantt-menu-item"
            [disabled]="!core.menuState().outdent"
            (click)="core.menuOutdent()"
          >
            {{ core.msg().menu.outdent }}
          </button>
          <div class="oge-gantt-menu-sep" role="separator"></div>
          <button
            type="button"
            role="menuitem"
            class="oge-gantt-menu-item oge-gantt-menu-danger"
            [disabled]="!core.menuState().delete"
            (click)="core.menuDelete()"
          >
            {{ core.msg().menu.deleteTask }}
          </button>
        }
      </div>
    }
  `,
})
export class OgeGantt<
  T extends object = Record<string, unknown>,
  D extends object = Record<string, unknown>,
> {
  private readonly config = inject(OGE_GANTT_CONFIG);
  private readonly liveAnnouncer = inject(OgeLiveAnnouncer);
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

  /**
   * Resource choices shown next to bars and in the dialog. A resource's
   * own `calendar` overrides `workCalendar` for tasks assigned to it
   * (first assigned resource with a calendar wins).
   */
  readonly resources = input<readonly OgeGanttResource[]>([]);
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
  /**
   * Weekend days (0 = Sunday … 6 = Saturday) `weekendsHighlighted` shades;
   * `undefined` resolves from the locale's `Intl.Locale` week data (Friday +
   * Saturday in `he-IL`), falling back to Saturday + Sunday. A `workCalendar`
   * takes precedence.
   */
  readonly weekendDays = input<readonly number[] | undefined>(undefined);
  readonly holidays = input<readonly Date[]>([]);
  /**
   * Work-time calendar: working weekdays + holidays. Shades off days and
   * makes auto-scheduling roll starts onto working days, preserving
   * durations in working days (day granularity).
   */
  readonly workCalendar = input<OgeGanttWorkCalendar | null>(null);
  /** Renders the per-resource workload band under the chart. */
  readonly showResourceWorkload = input(false);
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
  readonly dependencyInserted = output<OgeGanttDependencyInsertedEvent<D>>();
  readonly dependencyDeleting = output<OgeGanttDependencyDeletingEvent<D>>();
  readonly dependencyDeleted = output<OgeGanttDependencyDeletedEvent<D>>();
  readonly taskClick = output<OgeGanttTaskClickEvent<T>>();
  readonly taskDblClick = output<OgeGanttTaskClickEvent<T>>();
  readonly taskContextMenu = output<OgeGanttTaskClickEvent<T>>();
  readonly selectionChanged = output<OgeGanttSelectionChangedEvent<T>>();
  readonly taskEditDialogShowing = output<OgeGanttDialogShowingEvent<T>>();

  protected readonly taskTemplate = contentChild(OgeGanttTaskTemplate, {
    descendants: false,
  });
  protected readonly tooltipTemplate = contentChild(OgeGanttTooltipTemplate, {
    descendants: false,
  });
  private readonly dialog = viewChild.required(OgeGanttTaskDialog);
  private readonly bodyEl = viewChild<ElementRef<HTMLElement>>('bodyEl');
  private readonly chartScrollEl =
    viewChild<ElementRef<HTMLElement>>('chartScrollEl');
  private readonly canvasEl = viewChild<ElementRef<HTMLElement>>('canvasEl');

  protected readonly String = String;

  /**
   * The whole controller — stores, undo/redo, view models, editing
   * pipelines, keyboard map and gestures — is the framework-free
   * `OgeGanttCore` from `@oge-ui/gantt-engine`, the same instance type the
   * React `<OgeGantt>` runs. This component binds its signals into it and
   * renders what it derives.
   */
  protected readonly core: OgeGanttCore<T, D> = new OgeGanttCore<T, D>(
    {
      inputs: {
        tasks: () => this.tasks(),
        dependencies: () => this.dependencies(),
        keyExpr: () => this.keyExpr(),
        parentKeyExpr: () => this.parentKeyExpr(),
        titleExpr: () => this.titleExpr(),
        startExpr: () => this.startExpr(),
        endExpr: () => this.endExpr(),
        progressExpr: () => this.progressExpr(),
        colorExpr: () => this.colorExpr(),
        baselineStartExpr: () => this.baselineStartExpr(),
        baselineEndExpr: () => this.baselineEndExpr(),
        dependencyKeyExpr: () => this.dependencyKeyExpr(),
        predecessorKeyExpr: () => this.predecessorKeyExpr(),
        successorKeyExpr: () => this.successorKeyExpr(),
        dependencyTypeExpr: () => this.dependencyTypeExpr(),
        resources: () => this.resources(),
        resourceIdExpr: () => this.resourceIdExpr(),
        scaleType: () => this.scaleType(),
        firstDayOfWeek: () => this.firstDayOfWeek(),
        taskListWidth: () => this.taskListWidth(),
        columns: () => this.columns(),
        taskTitlePosition: () => this.taskTitlePosition(),
        showDependencies: () => this.showDependencies(),
        showCriticalPath: () => this.showCriticalPath(),
        weekendsHighlighted: () => this.weekendsHighlighted(),
        weekendDays: () => this.weekendDays(),
        holidays: () => this.holidays(),
        workCalendar: () => this.workCalendar(),
        showResourceWorkload: () => this.showResourceWorkload(),
        stripLines: () => this.stripLines(),
        autoScheduling: () => this.autoScheduling(),
        locale: () => this.locale(),
        messages: () => this.messages(),
        editingEnabled: () => this.editingEnabled(),
        allowTaskAdding: () => this.allowTaskAdding(),
        allowTaskUpdating: () => this.allowTaskUpdating(),
        allowTaskDeleting: () => this.allowTaskDeleting(),
        allowDependencyAdding: () => this.allowDependencyAdding(),
        allowDependencyDeleting: () => this.allowDependencyDeleting(),
        readOnly: () => this.readOnly(),
        selectedTaskKey: () => this.selectedTaskKey(),
        config: () => this.config,
      },
      events: this.coreEvents(),
      openDialog: (model, isNew, items) =>
        this.dialog().open(model, isNew, items as readonly OgeFormItemData[]),
      hostElement: () => this.hostEl.nativeElement,
      bodyElement: () => this.bodyEl()?.nativeElement ?? null,
      chartScrollElement: () => this.chartScrollEl()?.nativeElement ?? null,
      canvasElement: () => this.canvasEl()?.nativeElement ?? null,
      untracked,
    },
    SIGNAL_ADAPTER,
  );

  constructor() {
    effect(() => this.core.syncRenderedRange());
    // the core's announcements go through the document's shared live region
    effect(() => {
      const text = this.core.announcement();
      untracked(() => this.liveAnnouncer.announce(text));
    });
    effect(() => {
      const tasks = this.tasks();
      untracked(() => this.core.resetTasks(tasks));
    });
    effect(() => {
      const dependencies = this.dependencies();
      untracked(() => this.core.resetDependencies(dependencies));
    });
    effect(() => {
      const width = this.taskListWidth();
      untracked(() => this.core.resetListWidth(width));
    });
    inject(DestroyRef).onDestroy(() => this.core.destroy());
  }

  private coreEvents(): OgeGanttCoreEvents<T, D> {
    return {
      taskInserting: (event) => this.taskInserting.emit(event),
      taskInserted: (event) => this.taskInserted.emit(event),
      taskUpdating: (event) => this.taskUpdating.emit(event),
      taskUpdated: (event) => this.taskUpdated.emit(event),
      taskDeleting: (event) => this.taskDeleting.emit(event),
      taskDeleted: (event) => this.taskDeleted.emit(event),
      dependencyInserting: (event) => this.dependencyInserting.emit(event),
      dependencyInserted: (event) => this.dependencyInserted.emit(event),
      dependencyDeleting: (event) => this.dependencyDeleting.emit(event),
      dependencyDeleted: (event) => this.dependencyDeleted.emit(event),
      taskClick: (event) => this.taskClick.emit(event),
      taskDblClick: (event) => this.taskDblClick.emit(event),
      taskContextMenu: (event) => this.taskContextMenu.emit(event),
      selectionChanged: (event) => this.selectionChanged.emit(event),
      // the same object travels on, so a listener's `cancel` / replaced
      // `formItems` reach the core; Angular listeners may add
      // TemplateRef-carrying items, hence the layer's own item type
      taskEditDialogShowing: (event) =>
        this.taskEditDialogShowing.emit(
          event as OgeGanttDialogShowingEvent<T, OgeFormItemData>,
        ),
      scaleTypeChange: (type) => this.scaleType.set(type),
      selectedTaskKeyChange: (key) => this.selectedTaskKey.set(key),
    };
  }

  /* ---------------- public API (delegates to the engine) ---------------- */

  /** Reverts the last committed change (bounded snapshot stack). */
  undo(): void {
    this.core.undo();
  }

  /** Re-applies the last undone change. */
  redo(): void {
    this.core.redo();
  }

  /** Expands every summary task. */
  expandAll(): void {
    this.core.expandAll();
  }

  /** Collapses every summary task. */
  collapseAll(): void {
    this.core.collapseAll();
  }

  /** Collapses summaries at or below `level` (dx expandAllToLevel parity). */
  expandAllToLevel(level: number): void {
    this.core.expandAllToLevel(level);
  }

  /** Expands every ancestor of `key` and scrolls its row into view. */
  expandToTask(key: RowKey): void {
    this.core.expandToTask(key);
  }

  /** Makes the task a child of its previous sibling (MS Project parity). */
  indentTask(task: OgeGanttTask<T>): void {
    this.core.indentTask(task);
  }

  /** Moves the task up to its grandparent (or the root). */
  outdentTask(task: OgeGanttTask<T>): void {
    this.core.outdentTask(task);
  }

  /** Steps to the next finer scale. */
  zoomIn(): void {
    this.core.zoomIn();
  }

  /** Steps to the next coarser scale. */
  zoomOut(): void {
    this.core.zoomOut();
  }

  /** Picks the finest scale whose full range fits the chart viewport. */
  zoomToFit(): void {
    this.core.zoomToFit();
  }

  /** Scrolls the chart so `date` sits near the left edge. */
  scrollToDate(date: Date): void {
    this.core.scrollToDate(date);
  }

  /**
   * Snapshot for the exporters (`@oge-ui/gantt/export-excel` /
   * `export-pdf`): every task in tree order regardless of collapse state,
   * the resolved columns with pane-identical text formatting, the chart
   * range and the critical-path keys.
   */
  getExportData(): OgeGanttExportData<T> {
    return this.core.getExportData();
  }

  /** Focuses the roving task row. */
  focus(): void {
    this.core.focus();
  }

  /** Inserts a task through the cancelable pipeline. */
  insertTask(taskData: T): void {
    this.core.insertTask(taskData);
  }

  /** Updates a task's fields through the cancelable pipeline. */
  updateTask(taskData: T, patch: Partial<T>): void {
    this.core.updateTask(taskData, patch);
  }

  /** Deletes a task (and its dependency links) through the pipeline. */
  deleteTask(taskData: T): void {
    this.core.deleteTask(taskData);
  }

  /** Inserts a dependency link (cycle-checked, cancelable). */
  insertDependency(
    predecessorKey: RowKey,
    successorKey: RowKey,
    type: OgeGanttDependencyType = 'FS',
  ): void {
    this.core.insertDependency(predecessorKey, successorKey, type);
  }

  /** Deletes a dependency link through the pipeline. */
  deleteDependency(dependencyData: D): void {
    this.core.deleteDependency(dependencyData);
  }

  /** Opens the task dialog: a prefilled create form without arguments. */
  showTaskDetailsDialog(taskData?: T): void {
    this.core.showTaskDetailsDialog(taskData);
  }
}
