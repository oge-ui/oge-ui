import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
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
  type GanttLagUnit,
  type GanttTask,
  type OgeGanttCoreEvents,
} from '@oge-ui/gantt-engine';
import type { OgeGanttMessages } from '../config';
import { OGE_GANTT_CONFIG } from '../config';
import type {
  OgeGanttColumn,
  OgeGanttColumnReorderedEvent,
  OgeGanttColumnResizedEvent,
  OgeGanttDependencyUpdatedEvent,
  OgeGanttDependencyUpdatingEvent,
  OgeGanttSchedulingConflictEvent,
  OgeGanttSelectionMode,
  OgeGanttSlack,
  OgeGanttSortChangedEvent,
  OgeGanttViewMode,
  OgeGanttZoomPreset,
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
  host: {
    class: 'oge-gantt',
    '[class.oge-gantt-rtl]': 'core.rtl()',
    '[attr.dir]': 'hostDir()',
  },
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
      <select
        class="oge-gantt-select"
        [attr.aria-label]="core.msg().toolbar.scale"
        (change)="core.applyZoomPreset(+$any($event.target).value)"
      >
        @if (core.activeZoomIndex() < 0) {
          <option value="-1" selected disabled>—</option>
        }
        @for (option of core.zoomOptions(); track option.index) {
          <option
            [value]="option.index"
            [selected]="option.index === core.activeZoomIndex()"
          >
            {{ option.label }}
          </option>
        }
      </select>
      @if (core.baselineCount() > 1) {
        <select
          class="oge-gantt-select"
          [attr.aria-label]="core.msg().toolbar.baseline"
          (change)="core.setBaselineIndex(+$any($event.target).value)"
        >
          <option value="-1" [selected]="core.activeBaseline() < 0">
            {{ core.msg().grid.baselineNone }}
          </option>
          @for (index of baselineOptions(); track index) {
            <option [value]="index" [selected]="index === core.activeBaseline()">
              {{ baselineLabel(index) }}
            </option>
          }
        </select>
      }
      @if (resources().length > 0) {
        <button
          type="button"
          class="oge-gantt-btn oge-gantt-btn-toggle"
          [attr.aria-pressed]="core.viewMode() === 'resources'"
          (click)="core.toggleViewMode()"
        >
          {{ core.msg().toolbar.resourceView }}
        </button>
      }
      @if (searchPanel()) {
        <input
          type="search"
          class="oge-gantt-search"
          [attr.aria-label]="core.msg().toolbar.search"
          [placeholder]="core.msg().toolbar.search"
          [value]="core.searchText()"
          (input)="core.setSearchText($any($event.target).value)"
        />
      }
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
          [attr.aria-rowcount]="core.rowCount()"
          [attr.aria-multiselectable]="
            core.selectionMode() === 'multiple' ? true : null
          "
          (keydown)="core.onPaneKeydown($event)"
        >
          <div
            class="oge-gantt-pane-head"
            [class.oge-gantt-pane-head-filter]="filterRow()"
          >
            <div class="oge-gantt-pane-header" role="row">
              @for (
                column of core.resolvedColumns();
                track column.field;
                let colIndex = $index
              ) {
                @if (core.headerInteractive()) {
                  <div
                    class="oge-gantt-pane-headcell oge-gantt-headcell-interactive"
                    role="columnheader"
                    [class.oge-gantt-frozen]="column.frozen"
                    [class.oge-gantt-sortable]="column.sortable"
                    [style.width.px]="column.widthPx"
                    [style.inset-inline-start.px]="
                      column.frozen ? column.frozenOffsetPx : null
                    "
                    [attr.aria-sort]="column.sortDirection"
                    [attr.aria-keyshortcuts]="core.headerShortcuts()"
                    [attr.data-col-index]="colIndex"
                    [tabindex]="colIndex === core.headerFocusIndex() ? 0 : -1"
                    (click)="core.onHeaderClick(column, colIndex)"
                    (keydown)="core.onHeaderKeydown(colIndex, $event)"
                    (pointerdown)="core.onHeaderPointerDown(column, $event)"
                  >
                    <span class="oge-gantt-headcell-text">{{
                      column.header
                    }}</span>
                    @if (column.sortDirection) {
                      <svg
                        class="oge-gantt-sort-icon"
                        [class.oge-gantt-sort-desc]="
                          column.sortDirection === 'descending'
                        "
                        viewBox="0 0 16 16"
                        width="11"
                        height="11"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M8 12.5v-9M4.5 7 8 3.5 11.5 7" />
                      </svg>
                    }
                    @if (allowColumnResizing()) {
                      <span
                        class="oge-gantt-col-resize"
                        aria-hidden="true"
                        (pointerdown)="
                          core.onColumnResizePointerDown(column, $event)
                        "
                      ></span>
                    }
                  </div>
                } @else {
                  <div
                    class="oge-gantt-pane-headcell"
                    role="columnheader"
                    [class.oge-gantt-frozen]="column.frozen"
                    [style.width.px]="column.widthPx"
                    [style.inset-inline-start.px]="
                      column.frozen ? column.frozenOffsetPx : null
                    "
                  >
                    {{ column.header }}
                  </div>
                }
              }
            </div>
            @if (filterRow()) {
              <div class="oge-gantt-filter-row" role="row">
                @for (column of core.resolvedColumns(); track column.field) {
                  <div
                    class="oge-gantt-filter-cell"
                    role="gridcell"
                    [class.oge-gantt-frozen]="column.frozen"
                    [style.width.px]="column.widthPx"
                    [style.inset-inline-start.px]="
                      column.frozen ? column.frozenOffsetPx : null
                    "
                  >
                    <input
                      type="text"
                      class="oge-gantt-filter-input"
                      [attr.aria-label]="core.filterLabel(column)"
                      [value]="core.filters()[column.field] ?? ''"
                      (input)="
                        core.setFilter(column.field, $any($event.target).value)
                      "
                    />
                  </div>
                }
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
              [attr.aria-selected]="core.isSelected(task)"
              [attr.aria-rowindex]="core.rowIndexOf(task) + 1"
              [attr.aria-label]="core.taskAriaLabel(task)"
              [class.oge-gantt-row-selected]="core.isSelected(task)"
              [class.oge-gantt-row-group]="core.isGroupRow(task)"
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
                <!-- double-click edits inline; F2 on the row is the keyboard twin -->
                <div
                  class="oge-gantt-pane-cell"
                  role="gridcell"
                  [class.oge-gantt-frozen]="column.frozen"
                  [class.oge-gantt-cell-editing]="
                    core.isEditingCell(task, column.field)
                  "
                  [style.width.px]="column.widthPx"
                  [style.inset-inline-start.px]="
                    column.frozen ? column.frozenOffsetPx : null
                  "
                  (dblclick)="core.onCellDblClick(task, column.field, $event)"
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
                  @if (core.editingCell(); as cell) {
                    @if (cell.key === task.key && cell.field === column.field) {
                      <input
                        class="oge-gantt-cell-editor"
                        [type]="core.editorInputType(cell.editor)"
                        [value]="cell.value"
                        [attr.aria-label]="core.cellEditorLabel(task, column)"
                        (input)="core.cellEditInput($any($event.target).value)"
                        (keydown)="core.onCellEditorKeydown($event)"
                        (blur)="core.onCellEditorBlur(task.key, column.field)"
                        (click)="$event.stopPropagation()"
                        (dblclick)="$event.stopPropagation()"
                      />
                    } @else {
                      <span class="oge-gantt-cell-text">{{
                        core.cellText(task, column)
                      }}</span>
                    }
                  } @else {
                    <span class="oge-gantt-cell-text">{{
                      core.cellText(task, column)
                    }}</span>
                  }
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
              [style.height.px]="core.rowCount() * core.rowHeight()"
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
                  [class.oge-gantt-row-selected]="core.isSelected(task)"
                  [class.oge-gantt-row-hover]="task.key === core.hoverKey()"
                  [style.top.px]="core.rowIndexOf(task) * core.rowHeight()"
                  [style.height.px]="core.rowHeight()"
                  (mouseenter)="core.hoverKey.set(task.key)"
                  (mouseleave)="core.hoverKey.set(null)"
                ></div>
              }
              <svg
                class="oge-gantt-arrows"
                [attr.height]="core.rowCount() * core.rowHeight()"
                [attr.width]="core.scale().totalPx"
                aria-hidden="true"
              >
                <!-- logical x; RTL mirrors the whole group (x' = width - x) -->
                <g [attr.transform]="core.arrowsTransform()">
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
                      (dblclick)="core.onArrowDblClick(arrow.dependency, $event)"
                    />
                  }
                  @if (core.progressLine(); as line) {
                    <path class="oge-gantt-progress-line" [attr.d]="line.path" />
                  }
                  @if (core.linkPreview(); as preview) {
                    <path
                      class="oge-gantt-arrow oge-gantt-arrow-preview"
                      [class.oge-gantt-arrow-invalid]="!preview.valid"
                      [attr.d]="preview.path"
                    />
                  }
                </g>
              </svg>
              @for (arrow of core.windowArrows(); track arrow.dependency.key) {
                @if (arrow.label) {
                  <span
                    class="oge-gantt-arrow-label"
                    [style.inset-inline-start.px]="arrow.labelX"
                    [style.top.px]="arrow.labelY"
                    aria-hidden="true"
                    >{{ arrow.label }}</span
                  >
                }
              }
              @if (core.progressLine(); as line) {
                <div
                  class="oge-gantt-status-date"
                  [style.inset-inline-start.px]="line.statusPx"
                  [title]="core.msg().scheduling.statusDate"
                  aria-hidden="true"
                ></div>
              }
              @for (bar of core.windowBars(); track bar.task.key) {
                <div
                  class="oge-gantt-bar-box"
                  [class.oge-gantt-bar-box-selected]="core.isSelected(bar.task)"
                  [class.oge-gantt-bar-box-conflict]="bar.conflict"
                  [class.oge-gantt-bar-box-overdue]="bar.overdue"
                  [style.top.px]="bar.index * core.rowHeight()"
                  [style.height.px]="core.rowHeight()"
                >
                  @if (bar.deadlinePx !== null) {
                    <div
                      class="oge-gantt-deadline"
                      [class.oge-gantt-deadline-missed]="bar.overdue"
                      [style.inset-inline-start.px]="bar.deadlinePx"
                      [title]="core.deadlineTitle(bar.task)"
                      aria-hidden="true"
                    ></div>
                  }
                  @if (bar.constraintPx !== null) {
                    <div
                      class="oge-gantt-constraint"
                      [style.inset-inline-start.px]="bar.constraintPx"
                      aria-hidden="true"
                    ></div>
                  }
                  @if (bar.conflict) {
                    <span
                      class="oge-gantt-conflict-mark"
                      [style.inset-inline-start.px]="bar.leftPx - 18"
                      aria-hidden="true"
                      >!</span
                    >
                  }
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
                      [class.oge-gantt-summary-group]="core.isGroupRow(bar.task)"
                      [style.inset-inline-start.px]="bar.leftPx"
                      [style.width.px]="bar.widthPx"
                      [style.background-color]="bar.task.color ?? null"
                      [attr.data-task-key]="String(bar.task.key)"
                      (mouseenter)="core.tooltipKey.set(bar.task.key)"
                      (mouseleave)="core.tooltipKey.set(null)"
                    ></div>
                    @for (rollup of bar.rollups; track rollup.key) {
                      <div
                        class="oge-gantt-rollup"
                        [style.inset-inline-start.px]="rollup.px - 5"
                        [title]="rollup.title"
                        aria-hidden="true"
                      ></div>
                    }
                  } @else {
                    <div
                      class="oge-gantt-bar oge-gantt-target"
                      [class.oge-gantt-critical]="bar.critical"
                      [class.oge-gantt-bar-split]="bar.segments.length > 1"
                      [class.oge-gantt-bar-manual]="bar.manual"
                      [class.oge-gantt-dragging]="
                        core.dragKey() === bar.task.key
                      "
                      [style.inset-inline-start.px]="bar.leftPx"
                      [style.width.px]="bar.widthPx"
                      [style.background-color]="
                        bar.segments.length > 1 ? null : (bar.task.color ?? null)
                      "
                      [style.color]="core.barForeground(bar.task)"
                      [attr.data-task-key]="String(bar.task.key)"
                      (pointerdown)="core.onBarPointerDown(bar, 'move', $event)"
                      (dblclick)="core.onRowDblClick(bar.task, $event)"
                      (mouseenter)="core.tooltipKey.set(bar.task.key)"
                      (mouseleave)="core.tooltipKey.set(null)"
                    >
                      @if (bar.segments.length > 1) {
                        <div class="oge-gantt-split-link" aria-hidden="true"></div>
                        @for (segment of bar.segments; track segment.offsetPx) {
                          <div
                            class="oge-gantt-segment"
                            [style.inset-inline-start.px]="segment.offsetPx"
                            [style.width.px]="segment.widthPx"
                            [style.background-color]="bar.task.color ?? null"
                            aria-hidden="true"
                          >
                            <div
                              class="oge-gantt-segment-fill"
                              [style.width.px]="segment.fillPx"
                            ></div>
                          </div>
                        }
                      } @else {
                        <div
                          class="oge-gantt-progress"
                          [style.width.%]="bar.task.progress"
                          aria-hidden="true"
                        ></div>
                      }
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
            @if (core.histogramRows().length > 0) {
              <div
                class="oge-gantt-histogram"
                role="group"
                [attr.aria-label]="core.msg().grid.histogramLabel"
              >
                @for (row of core.histogramRows(); track row.id) {
                  <div
                    class="oge-gantt-histogram-row"
                    role="img"
                    [attr.aria-label]="row.label"
                  >
                    <span class="oge-gantt-histogram-label" aria-hidden="true">{{
                      row.text
                    }}</span>
                    <div
                      class="oge-gantt-histogram-capacity"
                      [style.bottom.%]="row.capacityPct"
                      aria-hidden="true"
                    ></div>
                    @for (cell of row.cells; track cell.px) {
                      <div
                        class="oge-gantt-histogram-bar"
                        [class.oge-gantt-histogram-over]="cell.over"
                        [style.inset-inline-start.px]="cell.px + 2"
                        [style.width.px]="cell.widthPx - 4"
                        [style.height.%]="cell.heightPct"
                        aria-hidden="true"
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

    @if (core.dependencyEditor(); as editor) {
      <div
        class="oge-gantt-dep-editor"
        role="dialog"
        [attr.aria-label]="core.msg().dependencyEditor.title"
        [style.left.px]="editor.x"
        [style.top.px]="editor.y"
        (keydown)="core.onDependencyEditorKeydown($event)"
      >
        <div class="oge-gantt-dep-editor-title" aria-hidden="true">
          {{ core.msg().dependencyEditor.title }}
        </div>
        <label class="oge-gantt-dep-editor-field">
          <span>{{ core.msg().dependencyEditor.typeLabel }}</span>
          <select
            class="oge-gantt-select"
            (change)="core.dependencyEditorChange({ type: $any($event.target).value })"
          >
            @for (type of core.dependencyTypes; track type) {
              <option [value]="type" [selected]="type === editor.type">
                {{ core.msg().scheduling.dependencyTypes[type] }}
              </option>
            }
          </select>
        </label>
        <label class="oge-gantt-dep-editor-field">
          <span>{{ core.msg().dependencyEditor.lagLabel }}</span>
          <input
            type="number"
            class="oge-gantt-dep-editor-input"
            step="0.5"
            [value]="editor.lag"
            (input)="core.dependencyEditorChange({ lag: +$any($event.target).value })"
          />
        </label>
        <label class="oge-gantt-dep-editor-field">
          <span>{{ core.msg().dependencyEditor.unitLabel }}</span>
          <select
            class="oge-gantt-select"
            (change)="setLagUnit($any($event.target).value)"
          >
            <option value="days" [selected]="editor.lagUnit === 'days'">
              {{ core.msg().dependencyEditor.days }}
            </option>
            <option value="hours" [selected]="editor.lagUnit === 'hours'">
              {{ core.msg().dependencyEditor.hours }}
            </option>
          </select>
        </label>
        <div class="oge-gantt-dep-editor-actions">
          @if (allowDependencyDeleting()) {
            <button
              type="button"
              class="oge-gantt-btn oge-gantt-btn-danger"
              (click)="core.deleteFromDependencyEditor()"
            >
              {{ core.msg().dependencyEditor.delete }}
            </button>
          }
          <span class="oge-gantt-dialog-spacer"></span>
          <button
            type="button"
            class="oge-gantt-btn"
            (click)="core.closeDependencyEditor()"
          >
            {{ core.msg().dependencyEditor.cancel }}
          </button>
          <button
            type="button"
            class="oge-gantt-btn oge-gantt-btn-primary"
            (click)="core.saveDependencyEditor()"
          >
            {{ core.msg().dependencyEditor.save }}
          </button>
        </div>
      </div>
    }

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
  /** Link lag amount (negative = lead), in `dependencyLagUnitExpr` units. */
  readonly dependencyLagExpr = input<GanttFieldExpr<D>>('lag');
  /** Link lag unit: `'days'` (working days on a calendar) or `'hours'`. */
  readonly dependencyLagUnitExpr = input<GanttFieldExpr<D>>('lagUnit');

  /** `true` = auto-scheduling never moves the task (MS Project manual mode). */
  readonly manuallyScheduledExpr = input<GanttFieldExpr<T>>('manuallyScheduled');
  /** `'ASAP' | 'ALAP' | 'SNET' | 'SNLT' | 'FNET' | 'FNLT' | 'MSO' | 'MFO'`. */
  readonly constraintTypeExpr = input<GanttFieldExpr<T>>('constraintType');
  readonly constraintDateExpr = input<GanttFieldExpr<T>>('constraintDate');
  /** Target finish: a marker, an overdue state and a `deadline` conflict. */
  readonly deadlineExpr = input<GanttFieldExpr<T>>('deadline');
  /** Split-task pieces `[{ start, end }, …]` (two or more split the bar). */
  readonly segmentsExpr = input<GanttFieldExpr<T>>('segments');
  /** Baseline sets `[{ start, end }, …]` — wins over `baselineStartExpr`. */
  readonly baselinesExpr = input<GanttFieldExpr<T>>('baselines');
  /** Assignment units in %: a number, an array per resource or an id map. */
  readonly unitsExpr = input<GanttFieldExpr<T>>('units');
  /** Work in hours (`effortDriven`). */
  readonly effortExpr = input<GanttFieldExpr<T>>('effort');

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
  /** Per-period utilization rows (units vs capacity, over-allocation red). */
  readonly showResourceHistogram = input(false);
  readonly stripLines = input<readonly OgeGanttStripLine[]>([]);
  /**
   * Project-level auto-scheduling: after every edit the engine moves tasks
   * earlier or later to honour links (with lag), constraints and ALAP;
   * manually scheduled tasks stay put. `scheduleProject()` runs it on demand.
   */
  readonly autoScheduling = input(false);
  /** Where unlinked ASAP tasks start when auto-scheduling; `null` keeps them. */
  readonly projectStart = input<Date | null>(null);
  /** Effort-driven: assignment / units / work changes recompute the finish. */
  readonly effortDriven = input(false);
  /** Working hours per day for effort-driven durations. */
  readonly hoursPerDay = input(8);
  /** Draws the progress line through the status date. */
  readonly showProgressLine = input(false);
  /** Status date of the progress line; `null` = today. */
  readonly statusDate = input<Date | null>(null);
  /** Draws child milestones onto their summary bars. */
  readonly showRollups = input(false);
  /** Which baseline renders (0-based); `-1` hides baselines. */
  readonly baselineIndex = model(0);
  /** The toolbar's zoom-preset chooser; `null` = one entry per scale. */
  readonly zoomPresets = input<readonly OgeGanttZoomPreset[] | null>(null);
  /** `'tasks'` or the resource-centric `'resources'` view. */
  readonly viewMode = model<OgeGanttViewMode>('tasks');

  /* ---------------- task list ---------------- */

  /** Double-click / F2 edits task-list cells in place. */
  readonly inlineEditing = input(false);
  /** Header click / Enter sorts (siblings within each parent). */
  readonly allowSorting = input(false);
  /** Header edge drag / Alt+Arrow resizes columns. */
  readonly allowColumnResizing = input(false);
  /** Header drag / Ctrl+Shift+Arrow reorders columns. */
  readonly allowColumnReordering = input(false);
  /** A filter row under the headers (matches keep their ancestors). */
  readonly filterRow = input(false);
  /** A search box in the toolbar (any column). */
  readonly searchPanel = input(false);
  /** `'multiple'`: Ctrl/Shift-click, Shift+Arrow, Ctrl+A and bulk actions. */
  readonly selectionMode = input<OgeGanttSelectionMode>('single');
  readonly locale = input<string | undefined>(undefined);
  readonly messages = input<Partial<OgeGanttMessages>>({});
  /**
   * Right-to-left layout: mirrors the timeline, the arrow keys, drag deltas
   * and the dependency arrows. Unset follows the page direction (the nearest
   * `dir` / computed `direction`, kept current while it changes); an explicit
   * value is also set as `dir` on the host.
   */
  readonly rtlEnabled = input<boolean | undefined>(undefined);

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
  /** Every selected key (`selectionMode: 'multiple'`). */
  readonly selectedTaskKeys = model<readonly RowKey[]>([]);

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
  /** The scheduling-conflict set changed (link, constraint, deadline). */
  readonly schedulingConflict = output<OgeGanttSchedulingConflictEvent<T>>();
  /** Cancelable: before a link's type / lag change reaches the store. */
  readonly dependencyUpdating = output<OgeGanttDependencyUpdatingEvent<D>>();
  readonly dependencyUpdated = output<OgeGanttDependencyUpdatedEvent<D>>();
  readonly sortChanged = output<OgeGanttSortChangedEvent>();
  readonly columnResized = output<OgeGanttColumnResizedEvent>();
  readonly columnReordered = output<OgeGanttColumnReorderedEvent>();

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
        rtlEnabled: () => this.rtlEnabled(),
        config: () => this.config,
        manuallyScheduledExpr: () => this.manuallyScheduledExpr(),
        constraintTypeExpr: () => this.constraintTypeExpr(),
        constraintDateExpr: () => this.constraintDateExpr(),
        deadlineExpr: () => this.deadlineExpr(),
        segmentsExpr: () => this.segmentsExpr(),
        baselinesExpr: () => this.baselinesExpr(),
        unitsExpr: () => this.unitsExpr(),
        effortExpr: () => this.effortExpr(),
        dependencyLagExpr: () => this.dependencyLagExpr(),
        dependencyLagUnitExpr: () => this.dependencyLagUnitExpr(),
        projectStart: () => this.projectStart(),
        statusDate: () => this.statusDate(),
        showProgressLine: () => this.showProgressLine(),
        showRollups: () => this.showRollups(),
        baselineIndex: () => this.baselineIndex(),
        zoomPresets: () => this.zoomPresets(),
        effortDriven: () => this.effortDriven(),
        hoursPerDay: () => this.hoursPerDay(),
        showResourceHistogram: () => this.showResourceHistogram(),
        viewMode: () => this.viewMode(),
        selectionMode: () => this.selectionMode(),
        selectedTaskKeys: () => this.selectedTaskKeys(),
        inlineEditing: () => this.inlineEditing(),
        allowSorting: () => this.allowSorting(),
        allowColumnResizing: () => this.allowColumnResizing(),
        allowColumnReordering: () => this.allowColumnReordering(),
        filterRow: () => this.filterRow(),
        searchPanel: () => this.searchPanel(),
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

  /** An explicit `rtlEnabled` is mirrored to `dir` so CSS follows it. */
  protected readonly hostDir = computed(() => {
    const rtl = this.rtlEnabled();
    return rtl === undefined ? null : rtl ? 'rtl' : 'ltr';
  });

  /** Baseline chooser entries (0-based). */
  protected readonly baselineOptions = computed(() =>
    Array.from({ length: this.core.baselineCount() }, (_, i) => i),
  );

  protected baselineLabel(index: number): string {
    return this.core
      .msg()
      .grid.baselineOption.replace('{index}', String(index + 1));
  }

  protected setLagUnit(unit: string): void {
    this.core.dependencyEditorChange({
      lagUnit: (unit === 'hours' ? 'hours' : 'days') as GanttLagUnit,
    });
  }

  constructor() {
    // direction is read in the browser only, after the first render
    afterNextRender(() => this.core.connectDirection());
    effect(() => this.core.syncRenderedRange());
    // `schedulingConflict` fires when the conflict set changes
    effect(() => this.core.syncConflicts());
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
      schedulingConflict: (event) => this.schedulingConflict.emit(event),
      dependencyUpdating: (event) => this.dependencyUpdating.emit(event),
      dependencyUpdated: (event) => this.dependencyUpdated.emit(event),
      sortChanged: (event) => this.sortChanged.emit(event),
      columnResized: (event) => this.columnResized.emit(event),
      columnReordered: (event) => this.columnReordered.emit(event),
      scaleTypeChange: (type) => this.scaleType.set(type),
      selectedTaskKeyChange: (key) => this.selectedTaskKey.set(key),
      selectedTaskKeysChange: (keys) => this.selectedTaskKeys.set(keys),
      baselineIndexChange: (index) => this.baselineIndex.set(index),
      viewModeChange: (mode) => this.viewMode.set(mode),
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

  /** Inserts a dependency link (cycle-checked, cancelable), optionally with a lag. */
  insertDependency(
    predecessorKey: RowKey,
    successorKey: RowKey,
    type: OgeGanttDependencyType = 'FS',
    options: { readonly lag?: number; readonly lagUnit?: GanttLagUnit } = {},
  ): void {
    this.core.insertDependency(predecessorKey, successorKey, type, options);
  }

  /** Updates a link's fields (type, lag, lag unit…) through the pipeline. */
  updateDependency(dependencyData: D, patch: Partial<D>): void {
    this.core.updateDependency(dependencyData, patch);
  }

  /** Runs the scheduling engine now (one undo step), even with `autoScheduling` off. */
  scheduleProject(): void {
    this.core.scheduleProject();
  }

  /** Total and free slack of a leaf task (days), or `null`. */
  getTaskSlack(key: RowKey): OgeGanttSlack | null {
    return this.core.getTaskSlack(key);
  }

  /** Saves every leaf task's dates as baseline `index` (0-based; one undo step). */
  setBaseline(index = 0): void {
    this.core.setBaseline(index);
  }

  /** Applies a zoom preset (index into `zoomPresets`, or the built-in scales). */
  applyZoomPreset(index: number): void {
    this.core.applyZoomPreset(index);
  }

  /** Sorts the task list by a column; `null` clears the sort. */
  sortBy(field: string | null, direction: 'asc' | 'desc' = 'asc'): void {
    this.core.sortBy(field, direction);
  }

  /** Sets one filter-row text (fold-insensitive "contains"). */
  setFilter(field: string, text: string): void {
    this.core.setFilter(field, text);
  }

  /** Sets the search text (matches any column). */
  setSearchText(text: string): void {
    this.core.setSearchText(text);
  }

  /** Clears every filter and the search. */
  clearFilters(): void {
    this.core.clearFilters();
  }

  /** Sets a task-list column's width (clamped 40–600px). */
  setColumnWidth(field: string, widthPx: number): void {
    this.core.setColumnWidth(field, widthPx);
  }

  /** Moves a task-list column to `toIndex` (frozen columns stay first). */
  moveColumn(field: string, toIndex: number): void {
    this.core.moveColumn(field, toIndex);
  }

  /** Opens the inline editor on a cell (`field` unset = the first editable one). */
  editCell(task: OgeGanttTask<T>, field?: string): boolean {
    return this.core.beginCellEdit(task as GanttTask<T>, field);
  }

  /** Every selected task, in tree order. */
  getSelectedTasks(): OgeGanttTask<T>[] {
    return this.core.getSelectedTasks();
  }

  /** Selects every visible task (`selectionMode: 'multiple'`). */
  selectAll(): void {
    this.core.selectAll();
  }

  /** Clears the selection. */
  clearSelection(): void {
    this.core.clearSelection();
  }

  /** Deletes several tasks (and their links) — one undo step. */
  deleteTasks(items: readonly T[]): void {
    this.core.deleteTasks(items);
  }

  /** Indents several tasks in tree order — one undo step. */
  indentTasks(tasks: readonly OgeGanttTask<T>[]): void {
    this.core.indentTasks(tasks);
  }

  /** Outdents several tasks — one undo step. */
  outdentTasks(tasks: readonly OgeGanttTask<T>[]): void {
    this.core.outdentTasks(tasks);
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
