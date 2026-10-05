import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  afterRenderEffect,
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
import type { OgeFormItemData } from '@oge-ui/forms';
import {
  KANBAN_CARD_GAP,
  KANBAN_DEFAULT_CARD_HEIGHT,
  beginKanbanGesture,
  prepareKanbanTouchDrag,
  buildKanbanEditorChoices,
  buildKanbanItem,
  columnReorderIndex,
  commitKanbanMove,
  filterCards,
  findKanbanCard,
  focusFirstKanbanMenuItem,
  focusKanbanCard,
  focusOwningKanbanCard,
  isKanbanCardContentTarget,
  kanbanCardActionLabel,
  kanbanCardKeyRoute,
  syncKanbanCardTabStops,
  formatKanbanDue,
  formatKanbanMessage,
  groupBoard,
  isKanbanCardShifted,
  isKanbanLegalTarget,
  isKanbanMenuAvailable,
  isKanbanOverdue,
  kanbanAutoScrollStep,
  kanbanCardLabel,
  kanbanCardShortcuts,
  kanbanCellKey,
  kanbanCellLabel,
  kanbanCellWindow,
  kanbanColumnCounts,
  kanbanColumnOrderPreview,
  kanbanColumnTitle,
  kanbanColumnWip,
  kanbanDropIndex,
  kanbanEditorModelFrom,
  kanbanFocusableKeys,
  kanbanGridTemplate,
  kanbanHeaderCenters,
  kanbanInitials,
  kanbanKeyboardMove,
  kanbanMoveTargets,
  kanbanNavigationTarget,
  watchKanbanDirection,
  kanbanNewColumn,
  kanbanScrollIntoViewTop,
  kanbanToolbarAddColumn,
  measureKanbanCells,
  measureKanbanDragGeometry,
  mergeOgeKanbanMessages,
  newKanbanEditorModel,
  newKanbanItemBase,
  normalizeCards,
  planKanbanMove,
  resolveKanbanColumns,
  resolveKanbanDragTarget,
  resolveKanbanFields,
  scrollKanbanCell,
  startKanbanFrameLoop,
  stepKanbanMenuFocus,
  toKanbanAccessor,
  toggleKanbanKey,
  type KanbanCard,
  type KanbanCellScroll,
  type KanbanColumnDef,
  type KanbanColumnWindow,
  type KanbanDragGeometry,
  type KanbanDragState,
  type KanbanDragTarget,
  type KanbanEditorModel,
  type KanbanEditorResult,
  type KanbanFieldExprs,
  type KanbanMappedFields,
  type KanbanSwimlane,
  type KanbanWipState,
  type OgeKanbanMessages,
  KanbanHistory,
  kanbanCssEscape,
  KANBAN_DEFAULT_UNDO_LIMIT,
  applyKanbanFilters,
  buildKanbanCsv,
  buildKanbanExportRows,
  canEditKanbanTitle,
  compileKanbanFilter,
  downloadKanbanText,
  fillKanbanMessages,
  formatKanbanCount,
  isInsideKanbanHost,
  isKanbanEditingTarget,
  isKanbanFilterChipActive,
  isKanbanFilterEmpty,
  kanbanActiveSort,
  kanbanAnchorIndex,
  kanbanBoardPeers,
  kanbanCarriedCards,
  kanbanCellCounts,
  kanbanCellWip,
  kanbanChecklistLabel,
  kanbanChecklistProgress,
  kanbanChecklistToggle,
  kanbanColumnSortSpec,
  kanbanFilterChoices,
  kanbanHistoryShortcut,
  kanbanLaneCounts,
  kanbanLaneWip,
  kanbanMultiMoveAnchor,
  kanbanOrderKeys,
  kanbanPeerAt,
  kanbanQuickAddItem,
  kanbanSelectCard,
  kanbanSelectCell,
  kanbanSelectionShortcut,
  kanbanTitleUpdate,
  nextKanbanBoardId,
  registerKanbanBoard,
  setKanbanColumnSort,
  sortKanbanLanes,
  toggleKanbanFilterChip,
  withFieldValue,
  type KanbanBoardPeer,
  type KanbanChecklistItem,
  type KanbanHistoryOp,
  type KanbanTransfer,
  type KanbanTransferResult,
  type OgeKanbanColumnSort,
  type OgeKanbanExportData,
  type OgeKanbanExportOptions,
  type OgeKanbanFilter,
  type OgeKanbanFilterChipKind,
  type OgeKanbanFilterExpression,
  type OgeKanbanResolvedMessages,
  type OgeKanbanSelectionMode,
  type OgeKanbanSortField,
} from '@oge-ui/kanban-engine';
import { OGE_KANBAN_CONFIG } from '../config';
import type {
  OgeKanbanCardAddedEvent,
  OgeKanbanCardAddingEvent,
  OgeKanbanCardDeletedEvent,
  OgeKanbanCardDeletingEvent,
  OgeKanbanCardEvent,
  OgeKanbanCardMovedEvent,
  OgeKanbanCardMovingEvent,
  OgeKanbanCardUpdatedEvent,
  OgeKanbanCardUpdatingEvent,
  OgeKanbanColumn,
  OgeKanbanColumnAddedEvent,
  OgeKanbanColumnAddingEvent,
  OgeKanbanColumnReorderedEvent,
  OgeKanbanCardTransferredEvent,
  OgeKanbanCardTransferringEvent,
  OgeKanbanEditDialogShowingEvent,
  OgeKanbanFieldExpr,
} from '../kanban-types';
import { OgeKanbanCardDialog } from './kanban-card-dialog';
import {
  OgeKanbanCardTemplate,
  OgeKanbanColumnHeaderTemplate,
} from './kanban-templates';

// Every decision this component takes — the view model, the keyboard and
// drag machines, the move pipeline, the editor model — lives in
// `@oge-ui/kanban-engine`, shared with `@oge-ui/react-kanban` (ADR 0003).
// What stays here is Angular: signals, the template and the DI config.

interface KanbanMenuState {
  readonly x: number;
  readonly y: number;
  readonly card: KanbanCard | null;
  readonly column: KanbanColumnDef | null;
  readonly swimlane: string | null;
}

/**
 * A signal-based Kanban board: columns, swimlanes and virtualized card
 * lists over the pure board kernel, with a built-in edit dialog, context
 * menu and toolbar.
 *
 * ```html
 * <oge-kanban
 *   [dataSource]="tasks"
 *   keyExpr="id"
 *   columnExpr="status"
 *   titleExpr="title"
 *   [columns]="[{ key: 'todo', title: 'To do', wipLimit: 4 }, { key: 'done' }]"
 * />
 * ```
 */
@Component({
  selector: 'oge-kanban',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, OgeKanbanCardDialog],
  host: {
    class: 'oge-kanban',
    role: 'group',
    '[attr.aria-label]': 'msg().board.boardLabel',
    '[class.oge-kanban-dragging]': 'drag() !== null',
    '(keydown)': 'onHostKeydown($event)',
    '[style.--oge-kanban-slot.px]': 'cardHeightPx() + 8',
    '[attr.dir]':
      "rtlEnabled() === undefined ? null : rtlEnabled() ? 'rtl' : 'ltr'",
  },
  styleUrl: './kanban.scss',
  template: `
    @if (showToolbar()) {
      <div
        class="oge-kanban-toolbar"
        role="toolbar"
        [attr.aria-label]="msg().toolbar.label"
      >
        @if (canAdd()) {
          <button
            type="button"
            class="oge-kanban-btn oge-kanban-btn-primary oge-kanban-btn-add"
            (click)="addFromToolbar()"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path
                d="M8 3v10M3 8h10"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
            {{ msg().toolbar.addCard }}
          </button>
        }
        <div class="oge-kanban-toolbar-group">
          <button
            type="button"
            class="oge-kanban-btn"
            (click)="collapseAllColumns()"
          >
            {{ msg().toolbar.collapseAll }}
          </button>
          <button
            type="button"
            class="oge-kanban-btn"
            (click)="expandAllColumns()"
          >
            {{ msg().toolbar.expandAll }}
          </button>
        </div>
        @if (undoLimit() > 0) {
          <div class="oge-kanban-toolbar-group">
            <button
              type="button"
              class="oge-kanban-btn oge-kanban-btn-undo"
              [disabled]="!canUndo()"
              aria-keyshortcuts="Control+Z"
              (click)="undo()"
            >
              {{ msg().toolbar.undo }}
            </button>
            <button
              type="button"
              class="oge-kanban-btn oge-kanban-btn-redo"
              [disabled]="!canRedo()"
              aria-keyshortcuts="Control+Y"
              (click)="redo()"
            >
              {{ msg().toolbar.redo }}
            </button>
          </div>
        }
        <span class="oge-kanban-toolbar-spacer"></span>
        <div class="oge-kanban-search">
          <svg
            class="oge-kanban-search-icon"
            viewBox="0 0 16 16"
            width="14"
            height="14"
            aria-hidden="true"
          >
            <circle
              cx="7"
              cy="7"
              r="4.4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path
              d="m10.4 10.4 3 3"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          <input
            class="oge-kanban-search-input"
            type="text"
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
            [attr.aria-label]="msg().toolbar.searchLabel"
            [attr.placeholder]="msg().toolbar.searchPlaceholder"
          />
          @if (searchQuery() !== '') {
            <button
              type="button"
              class="oge-kanban-search-clear"
              (click)="clearSearch()"
              [attr.aria-label]="msg().toolbar.clearSearch"
            >
              <svg
                viewBox="0 0 16 16"
                width="12"
                height="12"
                aria-hidden="true"
              >
                <path
                  d="m4 4 8 8m0-8-8 8"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          }
        </div>
      </div>
    }
    @if (showFilterBar()) {
      <div
        class="oge-kanban-filters"
        role="group"
        [attr.aria-label]="msg().toolbar.filterLabel"
      >
        @for (group of chipGroups(); track group.kind) {
          @if (group.values.length > 0) {
            <div
              class="oge-kanban-filter-group"
              role="group"
              [attr.aria-label]="group.label"
            >
              <span class="oge-kanban-filter-caption" aria-hidden="true">{{
                group.label
              }}</span>
              @for (value of group.values; track value) {
                <button
                  type="button"
                  class="oge-kanban-chip"
                  [attr.data-kind]="group.kind"
                  [attr.aria-pressed]="isChipActive(group.kind, value)"
                  (click)="toggleChip(group.kind, value)"
                >
                  <svg
                    class="oge-kanban-chip-check"
                    viewBox="0 0 16 16"
                    width="11"
                    height="11"
                    aria-hidden="true"
                  >
                    <path
                      d="m3.5 8.5 3 3 6-7"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  {{ value }}
                </button>
              }
            </div>
          }
        }
        @if (hasActiveChips()) {
          <button
            type="button"
            class="oge-kanban-btn oge-kanban-filters-clear"
            (click)="clearFilters()"
          >
            {{ msg().toolbar.clearFilters }}
          </button>
        }
      </div>
    }
    <div class="oge-kanban-body">
      @if (totalCount() === 0) {
        <div class="oge-kanban-empty">
          <svg
            class="oge-kanban-empty-icon"
            viewBox="0 0 44 44"
            width="44"
            height="44"
            aria-hidden="true"
          >
            <rect x="4" y="8" width="10" height="24" rx="2" />
            <rect x="17" y="8" width="10" height="16" rx="2" />
            <rect x="30" y="8" width="10" height="28" rx="2" />
          </svg>
          <div class="oge-kanban-empty-title">{{ msg().board.noCards }}</div>
          <div class="oge-kanban-empty-hint">{{ msg().board.noCardsHint }}</div>
          @if (canAdd()) {
            <button
              type="button"
              class="oge-kanban-btn oge-kanban-btn-primary oge-kanban-btn-add"
              (click)="addFromToolbar()"
            >
              {{ msg().toolbar.addCard }}
            </button>
          }
        </div>
      } @else if (noSearchResults()) {
        <div class="oge-kanban-empty">
          <div class="oge-kanban-empty-title">
            {{ noResultsText() }}
          </div>
        </div>
      } @else {
        <div
          class="oge-kanban-header-row"
          [style.grid-template-columns]="gridTemplate()"
        >
          @for (column of visibleColumns(); track column.key) {
            @if (isColumnCollapsed(column.key)) {
              <button
                type="button"
                class="oge-kanban-column-collapsed"
                (click)="toggleColumn(column.key)"
                [attr.aria-label]="
                  msg().menu.expandColumn + ': ' + columnTitle(column)
                "
                [attr.aria-expanded]="false"
              >
                <span class="oge-kanban-column-collapsed-title">{{
                  columnTitle(column)
                }}</span>
                <span class="oge-kanban-count">{{
                  columnCount(column.key)
                }}</span>
              </button>
            } @else {
              <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -->
              <div
                class="oge-kanban-column-header"
                [class.oge-kanban-wip-exceeded]="columnWip(column).exceeded"
                [class.oge-kanban-column-header-dragging]="
                  draggedColumnKey() === column.key
                "
                [class.oge-kanban-column-header-draggable]="
                  allowColumnReordering() && !readOnly()
                "
                [class.oge-kanban-column-sorted]="isColumnSorted(column.key)"
                (contextmenu)="onColumnContextMenu($event, column)"
                (pointerdown)="onColumnHeaderPointerDown($event, column)"
              >
                @if (columnHeaderTemplate(); as headerTpl) {
                  <ng-container
                    [ngTemplateOutlet]="headerTpl.templateRef"
                    [ngTemplateOutletContext]="{
                      $implicit: column,
                      count: columnCount(column.key),
                      wip: columnWip(column),
                    }"
                  />
                } @else {
                  @if (column.color) {
                    <span
                      class="oge-kanban-column-dot"
                      [style.background]="column.color"
                      aria-hidden="true"
                    ></span>
                  }
                  <span class="oge-kanban-column-title">{{
                    columnTitle(column)
                  }}</span>
                  @if (columnWip(column); as wip) {
                    <span
                      class="oge-kanban-count"
                      [class.oge-kanban-count-danger]="wip.exceeded"
                      [class.oge-kanban-count-warn]="wip.underfilled"
                      [attr.title]="
                        wip.exceeded
                          ? format(msg().board.wipExceeded, {
                              count: '' + wip.count,
                              limit: '' + wip.limit,
                            })
                          : null
                      "
                      >{{ wip.count }}
                      @if (wip.limit !== null) {
                        <span class="oge-kanban-count-limit"
                          >/{{ wip.limit }}</span
                        >
                      }
                    </span>
                  }
                }
                @if (canAddTo(column)) {
                  <button
                    type="button"
                    class="oge-kanban-column-add"
                    (click)="openNewCard(column.key, null)"
                    [attr.aria-label]="
                      format(msg().board.addCardToColumn, {
                        title: columnTitle(column),
                      })
                    "
                  >
                    <svg
                      viewBox="0 0 16 16"
                      width="14"
                      height="14"
                      aria-hidden="true"
                    >
                      <path
                        d="M8 3v10M3 8h10"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                      />
                    </svg>
                  </button>
                }
                <button
                  type="button"
                  class="oge-kanban-column-menu-btn"
                  aria-haspopup="menu"
                  [attr.aria-label]="
                    format(msg().menu.sortColumn, {
                      title: columnTitle(column),
                    })
                  "
                  [attr.title]="
                    format(msg().menu.sortColumn, {
                      title: columnTitle(column),
                    })
                  "
                  (click)="onColumnMenuButton($event, column)"
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="14"
                    height="14"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 3v10m0 0-2-2m2 2 2-2M11 13V3m0 0-2 2m2-2 2 2"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  class="oge-kanban-column-collapse"
                  (click)="toggleColumn(column.key)"
                  [attr.aria-label]="
                    msg().menu.collapseColumn + ': ' + columnTitle(column)
                  "
                  [attr.aria-expanded]="true"
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="14"
                    height="14"
                    aria-hidden="true"
                  >
                    <path
                      d="M10 3 5 8l5 5"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.6"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              </div>
            }
          }
          @if (canAddColumn()) {
            @if (addColumnOpen()) {
              <div class="oge-kanban-add-column-form">
                <input
                  class="oge-kanban-add-column-input"
                  type="text"
                  [value]="addColumnName()"
                  (input)="onAddColumnInput($event)"
                  (keydown)="onAddColumnKeydown($event)"
                  (blur)="commitAddColumn()"
                  [attr.aria-label]="msg().board.addColumn"
                  [attr.placeholder]="msg().board.addColumnPlaceholder"
                />
              </div>
            } @else {
              <button
                type="button"
                class="oge-kanban-add-column"
                (click)="startAddColumn()"
              >
                <svg
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                  aria-hidden="true"
                >
                  <path
                    d="M8 3v10M3 8h10"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  />
                </svg>
                {{ msg().board.addColumn }}
              </button>
            }
          }
        </div>
        @for (lane of lanes(); track lane.key) {
          <section
            class="oge-kanban-lane"
            [class.oge-kanban-lane-single]="!hasSwimlanes()"
          >
            @if (hasSwimlanes()) {
              @let laneLimit = laneWip(lane.key);
              <button
                type="button"
                class="oge-kanban-lane-header"
                [class.oge-kanban-lane-wip-exceeded]="!!laneLimit?.exceeded"
                (click)="toggleSwimlane(lane.key)"
                [attr.aria-expanded]="!isSwimlaneCollapsed(lane.key)"
                [attr.title]="
                  laneLimit?.exceeded
                    ? format(msg().board.laneWipExceeded, {
                        count: '' + laneLimit!.count,
                        limit: '' + laneLimit!.limit,
                      })
                    : null
                "
              >
                <svg
                  class="oge-kanban-lane-chevron"
                  [class.oge-kanban-lane-chevron-collapsed]="
                    isSwimlaneCollapsed(lane.key)
                  "
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                  aria-hidden="true"
                >
                  <path
                    d="M5 6.5 8 9.5l3-3"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span class="oge-kanban-lane-title">{{ lane.key ?? '' }}</span>
                <span
                  class="oge-kanban-count"
                  [class.oge-kanban-count-danger]="!!laneLimit?.exceeded"
                  >{{ laneLimit ? laneLimit.count : lane.count }}
                  @if (laneLimit) {
                    <span class="oge-kanban-count-limit"
                      >/{{ laneLimit.limit }}</span
                    >
                  }
                </span>
              </button>
            }
            @if (!isSwimlaneCollapsed(lane.key)) {
              <div
                class="oge-kanban-lane-cells"
                [style.grid-template-columns]="gridTemplate()"
              >
                @for (cell of lane.columns; track cell.column.key) {
                  @if (isColumnCollapsed(cell.column.key)) {
                    <div
                      class="oge-kanban-cell-collapsed"
                      aria-hidden="true"
                    ></div>
                  } @else {
                    <div
                      class="oge-kanban-cell"
                      (dblclick)="onCellDblClick($event, cell.column, lane.key)"
                    >
                      @if (cellWip(cell.column, lane.key); as cw) {
                        <span
                          class="oge-kanban-count oge-kanban-cell-wip"
                          [class.oge-kanban-count-danger]="cw.exceeded"
                          [attr.title]="
                            cw.exceeded
                              ? format(msg().board.cellWipExceeded, {
                                  count: '' + cw.count,
                                  limit: '' + cw.limit,
                                })
                              : null
                          "
                          aria-hidden="true"
                          >{{ cw.count
                          }}<span class="oge-kanban-count-limit"
                            >/{{ cw.limit }}</span
                          ></span
                        >
                      }
                      <div
                        class="oge-kanban-cards"
                        role="list"
                        [attr.aria-label]="
                          cellLabel(cell.column, cell.cards.length, lane.key)
                        "
                        [attr.data-lane]="lane.key ?? ''"
                        [attr.data-col]="cell.column.key"
                        (scroll)="
                          onCellScroll($event, lane.key, cell.column.key)
                        "
                      >
                        @if (cell.cards.length === 0) {
                          <!-- decorative: the list label already carries the zero count -->
                          <div class="oge-kanban-cell-empty" aria-hidden="true">
                            {{ msg().board.emptyColumn }}
                          </div>
                        } @else {
                          @let win =
                            windowFor(
                              lane.key,
                              cell.column.key,
                              cell.cards.length
                            );
                          <div
                            class="oge-kanban-cards-inner"
                            [style.height.px]="
                              virtualScrolling() ? win.totalHeight : null
                            "
                          >
                            @let dropIndex =
                              dropIndexFor(lane.key, cell.column.key);
                            @if (dropIndex !== null) {
                              <div
                                class="oge-kanban-placeholder"
                                [style.top.px]="
                                  dropIndex * (cardHeightPx() + 8)
                                "
                                [style.height.px]="cardHeightPx()"
                                aria-hidden="true"
                              ></div>
                            }
                            <div
                              class="oge-kanban-cards-block"
                              [style.transform]="
                                virtualScrolling()
                                  ? 'translateY(' + win.offsetY + 'px)'
                                  : null
                              "
                            >
                              @for (
                                card of cell.cards.slice(win.start, win.end);
                                track card.key
                              ) {
                                <div
                                  class="oge-kanban-card-item"
                                  role="listitem"
                                >
                                  <div
                                    class="oge-kanban-card"
                                    role="group"
                                    [attr.aria-roledescription]="
                                      msg().board.cardRoleDescription
                                    "
                                    [tabindex]="isCardFocusable(card) ? 0 : -1"
                                    [attr.data-key]="keyOf(card)"
                                    [attr.aria-current]="
                                      selectedCardKey() === card.key
                                        ? 'true'
                                        : null
                                    "
                                    [attr.aria-keyshortcuts]="cardShortcuts()"
                                    [class.oge-kanban-card-selected]="
                                      isCardSelected(card)
                                    "
                                    [class.oge-kanban-card-multi]="
                                      isCardMulti(card)
                                    "
                                    [class.oge-kanban-card-carried]="
                                      isCarriedCard(card)
                                    "
                                    [class.oge-kanban-card-editing]="
                                      editingTitleKey() === card.key
                                    "
                                    [class.oge-kanban-card-hidden]="
                                      isDraggedCard(card)
                                    "
                                    [class.oge-kanban-card-shifted]="
                                      isShifted(
                                        lane.key,
                                        cell.column.key,
                                        win.start + $index,
                                        card
                                      )
                                    "
                                    [class.oge-kanban-card-tinted]="
                                      cardColorMode() === 'surface' &&
                                      !!card.color
                                    "
                                    [style.--oge-kanban-card-tint]="
                                      card.color ?? null
                                    "
                                    [style.height.px]="
                                      virtualScrolling() ? cardHeightPx() : null
                                    "
                                    [attr.aria-label]="cardLabel(card)"
                                    (click)="onCardClick(card, $event)"
                                    (dblclick)="onCardDblClick(card, $event)"
                                    (contextmenu)="
                                      onCardContextMenu(card, $event)
                                    "
                                    (keydown)="onCardKeydown($event, card)"
                                    (pointerdown)="
                                      onCardPointerDown(
                                        $event,
                                        card,
                                        cell.column,
                                        lane.key
                                      )
                                    "
                                  >
                                    @if (editingTitleKey() === card.key) {
                                      <input
                                        class="oge-kanban-card-title-input"
                                        type="text"
                                        [value]="card.title"
                                        [attr.aria-label]="
                                          format(msg().board.editTitleLabel, {
                                            title: card.title,
                                          })
                                        "
                                        (keydown)="
                                          onTitleEditKeydown($event, card)
                                        "
                                        (blur)="onTitleEditBlur($event, card)"
                                      />
                                    }
                                    <ng-container
                                      [ngTemplateOutlet]="cardBody"
                                      [ngTemplateOutletContext]="{
                                        $implicit: card,
                                        column: cell.column,
                                        swimlane: lane.key,
                                      }"
                                    />
                                  </div>
                                </div>
                              }
                            </div>
                          </div>
                        }
                      </div>
                      @if (isQuickAddOpen(lane.key, cell.column.key)) {
                        <div class="oge-kanban-quick-add">
                          <input
                            class="oge-kanban-quick-add-input"
                            type="text"
                            [value]="quickAddText()"
                            [attr.aria-label]="
                              format(msg().board.quickAddLabel, {
                                title: columnTitle(cell.column),
                              })
                            "
                            [attr.placeholder]="msg().board.quickAddPlaceholder"
                            (input)="onQuickAddInput($event)"
                            (keydown)="
                              onQuickAddKeydown($event, cell.column, lane.key)
                            "
                            (blur)="onQuickAddBlur(cell.column, lane.key)"
                          />
                        </div>
                      } @else if (canAddTo(cell.column)) {
                        <button
                          type="button"
                          class="oge-kanban-add-card"
                          (click)="onFooterAdd(cell.column, lane.key)"
                        >
                          <svg
                            viewBox="0 0 16 16"
                            width="13"
                            height="13"
                            aria-hidden="true"
                          >
                            <path
                              d="M8 3v10M3 8h10"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="1.8"
                              stroke-linecap="round"
                            />
                          </svg>
                          {{ msg().menu.addCard }}
                        </button>
                      }
                    </div>
                  }
                }
                @if (canAddColumn()) {
                  <div class="oge-kanban-cell-ghost" aria-hidden="true"></div>
                }
              </div>
            }
          </section>
        }
      }
    </div>

    <ng-template #cardBody let-card let-column="column" let-swimlane="swimlane">
      @if (cardTemplate(); as cardTpl) {
        <ng-container
          [ngTemplateOutlet]="cardTpl.templateRef"
          [ngTemplateOutletContext]="{
            $implicit: card,
            column: column,
            swimlane: swimlane,
          }"
        />
      } @else {
        @if (card.color && cardColorMode() === 'stripe') {
          <span
            class="oge-kanban-card-stripe"
            [style.background]="card.color"
            aria-hidden="true"
          ></span>
        }
        <div class="oge-kanban-card-main">
          <div class="oge-kanban-card-title">{{ card.title }}</div>
          @if (card.description) {
            <div class="oge-kanban-card-desc">
              {{ card.description }}
            </div>
          }
          @if (card.tags.length > 0) {
            <div class="oge-kanban-card-tags">
              @for (tag of card.tags; track tag) {
                <span class="oge-kanban-tag">{{ tag }}</span>
              }
            </div>
          }
          <div class="oge-kanban-card-meta">
            @if (card.priority; as priority) {
              <span
                class="oge-kanban-priority"
                [attr.data-priority]="priority"
                [attr.title]="priority"
              ></span>
            }
            @if (card.dueDate; as due) {
              <span
                class="oge-kanban-due"
                [class.oge-kanban-due-overdue]="isOverdue(due)"
                [attr.title]="
                  isOverdue(due)
                    ? format(msg().board.overdue, {
                        date: formatDue(due),
                      })
                    : null
                "
              >
                <svg
                  viewBox="0 0 16 16"
                  width="12"
                  height="12"
                  aria-hidden="true"
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="6.2"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.4"
                  />
                  <path
                    d="M8 4.8V8l2.2 1.4"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                  />
                </svg>
                {{ formatDue(due) }}
              </span>
            }
            @if (card.checklist.length > 0) {
              @let progress = checklistProgress(card.checklist);
              <span
                class="oge-kanban-checklist"
                [class.oge-kanban-checklist-done]="
                  progress.done === progress.total
                "
                [attr.title]="checklistText(card.checklist)"
              >
                <span class="oge-kanban-checklist-bar" aria-hidden="true"
                  ><span
                    [style.width.%]="(progress.done / progress.total) * 100"
                  ></span
                ></span>
                <span aria-hidden="true"
                  >{{ progress.done }}/{{ progress.total }}</span
                >
                <span class="oge-kanban-sr-only">{{
                  checklistText(card.checklist)
                }}</span>
              </span>
            }
            <span class="oge-kanban-meta-spacer"></span>
            @if (card.assignees.length > 0) {
              <span class="oge-kanban-avatars">
                @for (assignee of card.assignees; track assignee) {
                  <span class="oge-kanban-avatar" [attr.title]="assignee">{{
                    initials(assignee)
                  }}</span>
                }
              </span>
            }
            @if (canUpdate() || canDelete()) {
              <span class="oge-kanban-card-actions">
                @if (canUpdate()) {
                  <button
                    type="button"
                    class="oge-kanban-card-action oge-kanban-card-action-edit"
                    [attr.aria-label]="cardActionLabel('edit', card)"
                    [attr.title]="cardActionLabel('edit', card)"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      width="13"
                      height="13"
                      aria-hidden="true"
                    >
                      <path
                        d="m11.3 2.7 2 2L6 12l-2.6.6L4 10z"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.4"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                }
                @if (canDelete()) {
                  <button
                    type="button"
                    class="oge-kanban-card-action oge-kanban-card-action-delete"
                    [attr.aria-label]="cardActionLabel('delete', card)"
                    [attr.title]="cardActionLabel('delete', card)"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      width="13"
                      height="13"
                      aria-hidden="true"
                    >
                      <path
                        d="M3.5 5h9M6.5 5V3.8h3V5m-5 0 .5 7.4h6L11.5 5"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                }
              </span>
            }
          </div>
        </div>
      }
    </ng-template>

    @if (drag(); as d) {
      <div
        class="oge-kanban-drag-preview"
        [style.width.px]="d.width"
        [style.height.px]="d.height"
        [style.transform]="
          'translate3d(' + (d.x - d.grabX) + 'px,' + (d.y - d.grabY) + 'px,0)'
        "
        aria-hidden="true"
        inert
      >
        @if (dragCarried().length > 1) {
          <span class="oge-kanban-drag-stack"></span>
          <span class="oge-kanban-drag-count">{{
            countText(msg().board.dragCount, { count: dragCarried().length })
          }}</span>
        }
        <div
          class="oge-kanban-card oge-kanban-card-lifted"
          [class.oge-kanban-card-tinted]="
            cardColorMode() === 'surface' && !!d.card.color
          "
          [style.--oge-kanban-card-tint]="d.card.color ?? null"
        >
          <ng-container
            [ngTemplateOutlet]="cardBody"
            [ngTemplateOutletContext]="{
              $implicit: d.card,
              column: d.column,
              swimlane: d.fromLane,
            }"
          />
        </div>
      </div>
    }

    @if (menu(); as m) {
      <!-- click-away surface only; Escape on the focused menu closes too -->
      <!-- eslint-disable @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
      <div
        class="oge-kanban-menu-backdrop"
        (click)="closeMenu()"
        (contextmenu)="$event.preventDefault(); closeMenu()"
      ></div>
      <!-- eslint-enable @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
      <div
        class="oge-kanban-menu"
        role="menu"
        tabindex="-1"
        [style.left.px]="m.x"
        [style.top.px]="m.y"
        (keydown)="onMenuKeydown($event)"
      >
        @if (m.card !== null) {
          <button
            type="button"
            role="menuitem"
            class="oge-kanban-menu-item"
            [disabled]="!canUpdate()"
            (click)="menuEdit()"
          >
            {{ msg().menu.editCard }}
          </button>
          @if (moveTargets(m).length > 0) {
            <div class="oge-kanban-menu-sep" role="separator"></div>
            <div class="oge-kanban-menu-label" aria-hidden="true">
              {{ msg().menu.moveTo }}
            </div>
            @for (target of moveTargets(m); track target.key) {
              <button
                type="button"
                role="menuitem"
                class="oge-kanban-menu-item oge-kanban-menu-item-move"
                (click)="menuMoveTo(target.key)"
              >
                @if (target.color) {
                  <span
                    class="oge-kanban-column-dot"
                    [style.background]="target.color"
                    aria-hidden="true"
                  ></span>
                }
                {{ columnTitle(target) }}
              </button>
            }
          }
          @if (canDrag() && peerBoards().length > 0) {
            <div class="oge-kanban-menu-sep" role="separator"></div>
            @for (peer of peerBoards(); track peer.id) {
              <button
                type="button"
                role="menuitem"
                class="oge-kanban-menu-item oge-kanban-menu-item-board"
                (click)="menuMoveToBoard(peer)"
              >
                {{ format(msg().menu.moveToBoard, { board: peer.id }) }}
              </button>
            }
          }
          <div class="oge-kanban-menu-sep" role="separator"></div>
          <button
            type="button"
            role="menuitem"
            class="oge-kanban-menu-item oge-kanban-menu-danger"
            [disabled]="!canDelete()"
            (click)="menuDelete()"
          >
            {{ msg().menu.deleteCard }}
          </button>
        } @else if (m.column !== null) {
          <button
            type="button"
            role="menuitem"
            class="oge-kanban-menu-item"
            [disabled]="!canAddTo(m.column)"
            (click)="menuAddCard()"
          >
            {{ msg().menu.addCard }}
          </button>
          <button
            type="button"
            role="menuitem"
            class="oge-kanban-menu-item"
            (click)="menuToggleColumn()"
          >
            {{
              isColumnCollapsed(m.column.key)
                ? msg().menu.expandColumn
                : msg().menu.collapseColumn
            }}
          </button>
          @if (selectionMode() === 'multiple') {
            <button
              type="button"
              role="menuitem"
              class="oge-kanban-menu-item oge-kanban-menu-item-select-all"
              (click)="menuSelectAll()"
            >
              {{ msg().menu.selectAll }}
            </button>
          }
          <div class="oge-kanban-menu-sep" role="separator"></div>
          <div class="oge-kanban-menu-label" aria-hidden="true">
            {{ msg().menu.sortBy }}
          </div>
          @let sort = activeSort(m.column);
          @for (field of sortFields; track field) {
            <button
              type="button"
              role="menuitemradio"
              class="oge-kanban-menu-item oge-kanban-menu-item-sort"
              [attr.data-field]="field"
              [attr.aria-checked]="sort.field === field"
              (click)="menuSort(field)"
            >
              <svg
                class="oge-kanban-menu-check"
                viewBox="0 0 16 16"
                width="14"
                height="14"
                aria-hidden="true"
              >
                <path
                  d="m3.5 8.5 3 3 6-7"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              {{ sortFieldLabel(field) }}
            </button>
          }
          <div class="oge-kanban-menu-sep" role="separator"></div>
          @for (direction of sortDirections; track direction) {
            <button
              type="button"
              role="menuitemradio"
              class="oge-kanban-menu-item oge-kanban-menu-item-direction"
              [attr.data-direction]="direction"
              [attr.aria-checked]="sort.direction === direction"
              (click)="menuSort(null, direction)"
            >
              <svg
                class="oge-kanban-menu-check"
                viewBox="0 0 16 16"
                width="14"
                height="14"
                aria-hidden="true"
              >
                <path
                  d="m3.5 8.5 3 3 6-7"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              {{
                direction === 'asc'
                  ? msg().menu.sortAscending
                  : msg().menu.sortDescending
              }}
            </button>
          }
        }
      </div>
    }

    <oge-kanban-card-dialog
      [messages]="msg().dialog"
      [locale]="effectiveLocale()"
      [choices]="editorChoices()"
      [allowDeleting]="canDelete()"
      (saved)="onEditorSaved($event)"
      (deleteRequested)="onEditorDelete()"
      (cancelled)="onEditorCancelled()"
    />

    <div class="oge-kanban-live" aria-live="polite">{{ announcement() }}</div>
  `,
})
export class OgeKanban<T extends object = Record<string, unknown>> {
  private readonly config = inject(OGE_KANBAN_CONFIG);
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);

  // ---------------- data inputs ----------------

  /** Card items; the array and its items are never mutated. */
  readonly dataSource = input<readonly T[]>([]);
  /** Card key field or getter. */
  readonly keyExpr = input<OgeKanbanFieldExpr<T>>('id');
  /** The field holding a card's column key. */
  readonly columnExpr = input<OgeKanbanFieldExpr<T>>('status');
  /** Card title field or getter. */
  readonly titleExpr = input<OgeKanbanFieldExpr<T>>('title');
  /** Card description field or getter. */
  readonly descriptionExpr = input<OgeKanbanFieldExpr<T>>('description');
  /** Card color-stripe field or getter. */
  readonly colorExpr = input<OgeKanbanFieldExpr<T>>('color');
  /** In-column sort order; unset = the array order is the board order. */
  readonly orderExpr = input<OgeKanbanFieldExpr<T> | undefined>(undefined);
  /** Swimlane field or getter; set = the board renders swimlane rows. */
  readonly swimlaneExpr = input<OgeKanbanFieldExpr<T> | undefined>(undefined);
  /** Tag list field (single value or array). */
  readonly tagsExpr = input<OgeKanbanFieldExpr<T> | undefined>(undefined);
  /** Assignee field (single value or array). */
  readonly assigneeExpr = input<OgeKanbanFieldExpr<T> | undefined>(undefined);
  /** Due-date field or getter. */
  readonly dueDateExpr = input<OgeKanbanFieldExpr<T> | undefined>(undefined);
  /** Priority field or getter (rendered as a colored indicator). */
  readonly priorityExpr = input<OgeKanbanFieldExpr<T> | undefined>(undefined);
  /** Extra fields the toolbar search matches, beyond the card's own texts. */
  readonly searchExprs = input<readonly OgeKanbanFieldExpr<T>[] | undefined>(
    undefined,
  );

  /** Declared columns; unset = derived from the data in first-seen order. */
  readonly columns = input<readonly OgeKanbanColumn[] | undefined>(undefined);

  // ---------------- state models ----------------

  /** Collapsed column keys (two-way). */
  readonly collapsedColumns = model<readonly string[]>([]);
  /** Collapsed swimlane keys (two-way). */
  readonly collapsedSwimlanes = model<readonly string[]>([]);
  /** Persisted column key order (two-way; empty = declared order). */
  readonly columnOrder = model<readonly string[]>([]);
  /** The selected card's key (two-way; single selection). */
  readonly selectedCardKey = model<unknown>(null);

  // ---------------- behavior inputs ----------------

  /** Per-column card windowing over a fixed card height. */
  readonly virtualScrolling = input<boolean>(true);
  /** Fixed card height in px; unset = the DI config's. */
  readonly cardHeight = input<number | undefined>(undefined);
  /** Per-instance message overrides. */
  readonly messages = input<Partial<OgeKanbanMessages>>({});
  /** BCP 47 locale for date formats; unset = config, then browser. */
  readonly locale = input<string | undefined>(undefined);
  /** Shows the built-in toolbar (add, collapse, search). */
  readonly showToolbar = input<boolean>(true);
  /** Allows creating cards (toolbar, per-column add, dialog, menu). */
  readonly allowAdding = input<boolean>(true);
  /** Allows editing cards (dialog, menu, Enter). */
  readonly allowUpdating = input<boolean>(true);
  /** Allows deleting cards (dialog, menu, Delete). */
  readonly allowDeleting = input<boolean>(true);
  /** Allows dragging cards (and the Ctrl+Arrow keyboard twin). */
  readonly allowDragging = input<boolean>(true);
  /** Allows dragging column headers to reorder columns. */
  readonly allowColumnReordering = input<boolean>(false);
  /** Shows the "+ Add column" ghost column at the end of the board. */
  readonly allowColumnAdding = input<boolean>(false);
  /** One switch over every `allow*` capability. */
  readonly readOnly = input<boolean>(false);
  /** Column track width in px (fixed — the board scrolls horizontally). */
  readonly columnWidth = input<number>(300);
  /**
   * How `colorExpr` renders: `'stripe'` (accent bar on the card's edge) or
   * `'surface'` (the whole card tinted with the color).
   */
  readonly cardColorMode = input<'stripe' | 'surface'>('stripe');
  /**
   * Right-to-left layout: the first column on the right, ArrowLeft/Right
   * (and Ctrl+Arrow moves) mirrored. Unset follows the page — the computed
   * `direction` or the nearest `dir`, read after the first render and kept
   * current; an explicit value also sets `dir` on the host.
   */
  readonly rtlEnabled = input<boolean | undefined>(undefined);
  /** The page direction (the `rtlEnabled` fallback). */
  private readonly detectedRtl = signal(false);
  /** The direction the arrow keys follow. */
  protected readonly rtl = computed(
    () => this.rtlEnabled() ?? this.detectedRtl(),
  );
  /**
   * Replaces the edit dialog's default form wholesale (generic
   * `OgeFormItemData[]`); `cardEditDialogShowing` can still adjust per open.
   */
  readonly dialogItems = input<readonly OgeFormItemData[] | undefined>(
    undefined,
  );

  // ---------------- G3b: filtering, sorting, selection, transfers ----------------

  /** Checklist / sub-task field: `{ text, done }` items (progress badge on the card). */
  readonly checklistExpr = input<OgeKanbanFieldExpr<T> | undefined>(undefined);
  /**
   * Programmatic card filter — a predicate over the normalized card or a
   * declarative `OgeKanbanFilterExpression`; ANDed with the chip bar and the
   * toolbar search. WIP counts stay unfiltered.
   */
  readonly filter = input<OgeKanbanFilter<T> | undefined>(undefined);
  /** The filter chip bar's state (two-way): active tags / assignees / priorities. */
  readonly filterValue = model<OgeKanbanFilterExpression>({});
  /** Shows the filter chip bar (tags, assignees, priorities) under the toolbar. */
  readonly showFilterBar = input<boolean>(false);
  /**
   * Per-column card sort (two-way; the column menu writes it): a column
   * key — or `'*'` for every column — mapped to `{ field, direction }` or a
   * comparator. Unset columns keep `orderExpr` / array order.
   */
  readonly columnSort = model<OgeKanbanColumnSort<T>>({});
  /** Priority ranking for `columnSort` by priority (highest first); unset = the built-in list. */
  readonly priorityOrder = input<readonly string[] | undefined>(undefined);
  /** `'multiple'` adds Ctrl/Shift-click, Ctrl+A / Ctrl+Space and multi-card drag. */
  readonly selectionMode = input<OgeKanbanSelectionMode>('multiple');
  /** Every selected card key (two-way), in board order. */
  readonly selectedCardKeys = model<readonly unknown[]>([]);
  /**
   * Boards sharing a `dragGroup` exchange cards by drag and through the
   * card menu's "Move to …" entries (`cardTransferring` / `cardTransferred`).
   */
  readonly dragGroup = input<string | undefined>(undefined);
  /** Names this board in transfer events and the other boards' menus. */
  readonly boardId = input<string | undefined>(undefined);
  /** Per-lane total WIP limits, keyed by swimlane value. */
  readonly swimlaneWipLimits = input<
    Readonly<Record<string, number>> | undefined
  >(undefined);
  /** The column footer's add button opens an inline title composer instead of the dialog. */
  readonly quickAdd = input<boolean>(false);
  /** Double-clicking a card title edits it inline (F2 always does). */
  readonly inlineTitleEditing = input<boolean>(false);
  /** Undo/redo depth (Ctrl+Z / Ctrl+Y, toolbar buttons); `0` disables history. */
  readonly undoLimit = input<number>(KANBAN_DEFAULT_UNDO_LIMIT);

  // ---------------- outputs ----------------

  /** A card was clicked (also selects it). */
  readonly cardClick = output<OgeKanbanCardEvent<T>>();
  /** A card was double-clicked (also opens the editor when allowed). */
  readonly cardDblClick = output<OgeKanbanCardEvent<T>>();
  /** A card was right-clicked; fires before the built-in menu opens. */
  readonly cardContextMenu = output<OgeKanbanCardEvent<T>>();
  /** Cancelable: before a new card reaches the data. */
  readonly cardAdding = output<OgeKanbanCardAddingEvent<T>>();
  /** A new card was added. */
  readonly cardAdded = output<OgeKanbanCardAddedEvent<T>>();
  /** Cancelable: before an edit reaches the data. */
  readonly cardUpdating = output<OgeKanbanCardUpdatingEvent<T>>();
  /** A card was updated. */
  readonly cardUpdated = output<OgeKanbanCardUpdatedEvent<T>>();
  /** Cancelable: before a card is removed from the data. */
  readonly cardDeleting = output<OgeKanbanCardDeletingEvent<T>>();
  /** A card was deleted. */
  readonly cardDeleted = output<OgeKanbanCardDeletedEvent<T>>();
  /** Cancelable: before a card moves (drag, keyboard or programmatic). */
  readonly cardMoving = output<OgeKanbanCardMovingEvent<T>>();
  /** A card was moved. */
  readonly cardMoved = output<OgeKanbanCardMovedEvent<T>>();
  /** Cancelable + customization point: before the edit dialog opens. */
  readonly cardEditDialogShowing = output<OgeKanbanEditDialogShowingEvent<T>>();
  /** A column header drag committed a new column order. */
  readonly columnReordered = output<OgeKanbanColumnReorderedEvent>();
  /** The edit dialog closed (saved, cancelled, deleted or `closeDialog()`). */
  readonly cardEditDialogHidden = output<void>();
  /** Cancelable: before the "+ Add column" affordance creates a column. */
  readonly columnAdding = output<OgeKanbanColumnAddingEvent>();
  /** A column was added at runtime. */
  readonly columnAdded = output<OgeKanbanColumnAddedEvent>();
  /** Cancelable, on the target board: cards from another board are about to land. */
  readonly cardTransferring = output<OgeKanbanCardTransferringEvent<T>>();
  /** On both boards: a cross-board transfer landed (the source removes, the target adds). */
  readonly cardTransferred = output<OgeKanbanCardTransferredEvent<T>>();

  // ---------------- content ----------------

  protected readonly cardTemplate = contentChild(OgeKanbanCardTemplate, {
    descendants: false,
  });
  protected readonly columnHeaderTemplate = contentChild(
    OgeKanbanColumnHeaderTemplate,
    { descendants: false },
  );

  private readonly dialog = viewChild.required(OgeKanbanCardDialog);

  // ---------------- derived state ----------------

  /** Merged messages: DI config overlaid by the `messages` input. */
  protected readonly msg = computed<OgeKanbanResolvedMessages>(() =>
    fillKanbanMessages(mergeOgeKanbanMessages(this.config, this.messages())),
  );

  /** Per-instance locale, falling back to the DI config, then the browser. */
  protected readonly effectiveLocale = computed(
    () => this.locale() ?? this.config.locale,
  );

  protected readonly cardHeightPx = computed(
    () =>
      this.cardHeight() ?? this.config.cardHeight ?? KANBAN_DEFAULT_CARD_HEIGHT,
  );

  protected readonly canAdd = computed(
    () => this.allowAdding() && !this.readOnly(),
  );
  protected readonly canUpdate = computed(
    () => this.allowUpdating() && !this.readOnly(),
  );
  protected readonly canDelete = computed(
    () => this.allowDeleting() && !this.readOnly(),
  );
  protected readonly canDrag = computed(
    () => this.allowDragging() && !this.readOnly(),
  );

  protected canAddTo(column: KanbanColumnDef): boolean {
    return this.canAdd() && column.allowAdding !== false;
  }

  protected cardShortcuts(): string | null {
    return kanbanCardShortcuts({
      canUpdate: this.canUpdate(),
      canDelete: this.canDelete(),
      canDrag: this.canDrag(),
      canEditTitle: canEditKanbanTitle(this.fields()),
      multiSelect: this.selectionMode() === 'multiple',
    });
  }

  private readonly fields = computed(() => {
    const exprs: KanbanFieldExprs<T> = {
      keyExpr: this.keyExpr(),
      columnExpr: this.columnExpr(),
      titleExpr: this.titleExpr(),
      descriptionExpr: this.descriptionExpr(),
      colorExpr: this.colorExpr(),
      orderExpr: this.orderExpr(),
      swimlaneExpr: this.swimlaneExpr(),
      tagsExpr: this.tagsExpr(),
      assigneeExpr: this.assigneeExpr(),
      dueDateExpr: this.dueDateExpr(),
      priorityExpr: this.priorityExpr(),
      checklistExpr: this.checklistExpr(),
    };
    return resolveKanbanFields(exprs);
  });

  /** Which optional `*Expr` inputs are configured (editor + write-back). */
  private readonly mapped = computed<KanbanMappedFields>(() => ({
    hasSwimlanes: this.hasSwimlanes(),
    hasTags: this.tagsExpr() !== undefined,
    hasAssignees: this.assigneeExpr() !== undefined,
    hasDueDate: this.dueDateExpr() !== undefined,
    hasPriority: this.priorityExpr() !== undefined,
  }));

  /* ---------- data store ---------- */

  /**
   * The writable working set. The input array is copied here and never
   * mutated — hosts persist through the CRUD events.
   */
  private readonly store = signal<readonly T[]>([]);

  constructor() {
    effect(() => {
      this.store.set([...this.dataSource()]);
    });
    // the browser decides about panning at touchstart: arm the touch guard
    // before the first long-press card drag
    afterNextRender(() => prepareKanbanTouchDrag(this.hostEl.nativeElement));
    // the rtlEnabled fallback: the page direction, kept current
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const stop = watchKanbanDirection(this.hostEl.nativeElement, (rtl) =>
        this.detectedRtl.set(rtl),
      );
      destroyRef.onDestroy(stop);
      // cross-board drag: the other boards of a dragGroup find this one here
      destroyRef.onDestroy(registerKanbanBoard(this.createPeer()));
    });
    effect(() => {
      const limit = this.undoLimit();
      this.history.setLimit(limit);
      untracked(() => this.bumpHistory());
    });
    afterRenderEffect(() => {
      this.lanes(); // re-measure when the board reshapes
      this.measureCells();
      this.resizeObserver?.observe(this.hostEl.nativeElement);
      const pending = this.pendingFocusKey();
      if (pending !== null) {
        this.pendingFocusKey.set(null);
        focusKanbanCard(this.hostEl.nativeElement, pending);
      }
    });
    // one Tab stop per column: card content is tabbable only in the stop
    afterRenderEffect(() => {
      this.focusableKeys();
      this.cellState();
      this.cardTemplate();
      this.canUpdate();
      this.canDelete();
      syncKanbanCardTabStops(this.hostEl.nativeElement);
    });
  }

  /** In-component search query (wired to the toolbar). */
  protected readonly searchQuery = signal('');

  private readonly allCards = computed(() =>
    normalizeCards(this.store(), this.fields()),
  );

  private readonly extraSearchAccessors = computed(() =>
    this.searchExprs()?.map((expr) => toKanbanAccessor(expr)),
  );

  private readonly filterPredicate = computed(() =>
    compileKanbanFilter(this.filter()),
  );
  private readonly chipPredicate = computed(() =>
    compileKanbanFilter<T>(this.filterValue()),
  );

  private readonly visibleCards = computed(() =>
    applyKanbanFilters(
      filterCards(
        this.allCards(),
        this.searchQuery(),
        this.extraSearchAccessors(),
      ),
      [this.filterPredicate(), this.chipPredicate()],
    ),
  );

  protected readonly noSearchResults = computed(
    () =>
      (this.searchQuery().trim() !== '' ||
        this.filterPredicate() !== null ||
        this.chipPredicate() !== null) &&
      this.visibleCards().length === 0 &&
      this.totalCount() > 0,
  );

  /** The empty-result heading: search wording when a query is typed. */
  protected readonly noResultsText = computed(() =>
    this.searchQuery().trim() !== ''
      ? this.msg().board.noSearchResults
      : this.msg().board.noFilterResults,
  );

  /** The chip bar's choices (unfiltered data, so chips never vanish). */
  protected readonly filterChoices = computed(() =>
    kanbanFilterChoices(this.allCards()),
  );

  /** The chip bar's groups, in display order. */
  protected readonly chipGroups = computed(() => {
    const choices = this.filterChoices();
    const toolbar = this.msg().toolbar;
    return [
      {
        kind: 'tags' as const,
        label: toolbar.tagsFilter,
        values: choices.tags,
      },
      {
        kind: 'assignees' as const,
        label: toolbar.assigneesFilter,
        values: choices.assignees,
      },
      {
        kind: 'priorities' as const,
        label: toolbar.priorityFilter,
        values: choices.priorities,
      },
    ];
  });

  protected readonly hasActiveChips = computed(
    () => !isKanbanFilterEmpty(this.filterValue()),
  );

  protected isChipActive(
    kind: OgeKanbanFilterChipKind,
    value: string,
  ): boolean {
    return isKanbanFilterChipActive(this.filterValue(), kind, value);
  }

  protected toggleChip(kind: OgeKanbanFilterChipKind, value: string): void {
    this.filterValue.set(
      toggleKanbanFilterChip(this.filterValue(), kind, value),
    );
  }

  /** Clears the chip bar (the programmatic `filter` input is untouched). */
  clearFilters(): void {
    this.filterValue.set({});
  }

  protected readonly hasSwimlanes = computed(
    () => this.swimlaneExpr() !== undefined,
  );

  /** Columns created at runtime through the "+ Add column" affordance. */
  private readonly runtimeColumns = signal<readonly KanbanColumnDef[]>([]);

  /**
   * Derived-mode keys accumulate for the component's lifetime, so a column
   * does not vanish the moment its last card leaves it.
   */
  private readonly seenDerivedColumns = signal<readonly KanbanColumnDef[]>([]);

  protected readonly visibleColumns = computed<readonly KanbanColumnDef[]>(
    () => {
      const { columns, nextSeenDerived } = resolveKanbanColumns({
        declared: this.columns(),
        seenDerived: this.seenDerivedColumns(),
        cards: this.allCards(),
        runtime: this.runtimeColumns(),
        // a header drag previews its order live; the model commits on drop
        preview: this.dragColumnOrder(),
        columnOrder: this.columnOrder(),
      });
      // remember for the next data change (write outside the computed)
      if (nextSeenDerived !== null) {
        queueMicrotask(() => this.seenDerivedColumns.set(nextSeenDerived));
      }
      return columns;
    },
  );

  protected readonly canAddColumn = computed(
    () => this.allowColumnAdding() && !this.readOnly(),
  );

  /** The inline new-column composer's open state and draft name. */
  protected readonly addColumnOpen = signal(false);
  protected readonly addColumnName = signal('');

  protected startAddColumn(): void {
    this.addColumnOpen.set(true);
    setTimeout(() => {
      this.hostEl.nativeElement
        .querySelector<HTMLInputElement>('.oge-kanban-add-column-input')
        ?.focus();
    });
  }

  protected cancelAddColumn(): void {
    this.addColumnOpen.set(false);
    this.addColumnName.set('');
  }

  protected commitAddColumn(): void {
    const column = kanbanNewColumn(this.addColumnName(), this.visibleColumns());
    if (column === null) {
      this.cancelAddColumn();
      return;
    }
    const event: OgeKanbanColumnAddingEvent = { column, cancel: false };
    this.columnAdding.emit(event);
    if (event.cancel) return;
    this.runtimeColumns.set([...this.runtimeColumns(), column]);
    this.columnAdded.emit({ column });
    this.cancelAddColumn();
  }

  protected onAddColumnKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitAddColumn();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.cancelAddColumn();
    }
  }

  protected onAddColumnInput(event: Event): void {
    this.addColumnName.set((event.target as HTMLInputElement).value);
  }

  protected readonly lanes = computed<readonly KanbanSwimlane<T>[]>(() =>
    sortKanbanLanes(
      groupBoard(
        this.visibleCards(),
        this.visibleColumns(),
        this.hasSwimlanes(),
      ),
      this.columnSort(),
      this.effectiveLocale(),
      this.priorityOrder(),
    ),
  );

  /** Per-cell counts (unfiltered) for the per-swimlane WIP badges. */
  private readonly cellCounts = computed(() =>
    kanbanCellCounts(this.allCards(), this.hasSwimlanes()),
  );
  private readonly laneCounts = computed(() =>
    kanbanLaneCounts(this.allCards()),
  );

  protected cellWip(
    column: KanbanColumnDef,
    lane: string | null,
  ): KanbanWipState | null {
    return kanbanCellWip(column, lane, this.cellCounts(), this.hasSwimlanes());
  }

  protected laneWip(lane: string | null): KanbanWipState | null {
    return kanbanLaneWip(lane, this.swimlaneWipLimits(), this.laneCounts());
  }

  protected isColumnSorted(key: string): boolean {
    return kanbanColumnSortSpec(this.columnSort(), key) !== undefined;
  }

  /** Card counts per column across all lanes (unfiltered — WIP is a data fact). */
  private readonly columnCounts = computed(() =>
    kanbanColumnCounts(this.allCards()),
  );

  protected readonly totalCount = computed(() => this.allCards().length);

  protected readonly gridTemplate = computed(() =>
    kanbanGridTemplate(
      this.visibleColumns(),
      this.collapsedColumns(),
      this.columnWidth(),
      this.canAddColumn(),
    ),
  );

  // ---------------- virtualization ----------------

  /** Per-cell scroll state, keyed `lane column`. */
  private readonly cellState = signal(new Map<string, KanbanCellScroll>());

  protected windowFor(
    lane: string | null,
    column: string,
    count: number,
  ): KanbanColumnWindow {
    return kanbanCellWindow(
      this.cellState().get(kanbanCellKey(lane, column)),
      count,
      this.cardHeightPx(),
      this.virtualScrolling(),
    );
  }

  protected onCellScroll(
    event: Event,
    lane: string | null,
    column: string,
  ): void {
    const el = event.target as HTMLElement;
    const next = new Map(this.cellState());
    next.set(kanbanCellKey(lane, column), {
      top: el.scrollTop,
      height: el.clientHeight,
    });
    this.cellState.set(next);
  }

  private readonly resizeObserver =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => this.measureCells());

  private measureCells(): void {
    const next = measureKanbanCells(
      this.hostEl.nativeElement,
      this.cellState(),
    );
    if (next !== null) this.cellState.set(next);
  }

  // ---------------- collapse ----------------

  protected isColumnCollapsed(key: string): boolean {
    return this.collapsedColumns().includes(key);
  }

  protected toggleColumn(key: string): void {
    this.collapsedColumns.set(toggleKanbanKey(this.collapsedColumns(), key));
  }

  /** Collapses every column (toolbar). */
  collapseAllColumns(): void {
    this.collapsedColumns.set(
      this.visibleColumns().map((column) => column.key),
    );
  }

  /** Expands every column (toolbar). */
  expandAllColumns(): void {
    this.collapsedColumns.set([]);
  }

  protected isSwimlaneCollapsed(key: string | null): boolean {
    return key !== null && this.collapsedSwimlanes().includes(key);
  }

  protected toggleSwimlane(key: string | null): void {
    if (key === null) return;
    this.collapsedSwimlanes.set(
      toggleKanbanKey(this.collapsedSwimlanes(), key),
    );
  }

  // ---------------- search ----------------

  protected onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
  }

  // ---------------- labels ----------------

  protected columnTitle(column: KanbanColumnDef): string {
    return kanbanColumnTitle(column);
  }

  protected columnCount(key: string): number {
    return this.columnCounts().get(key) ?? 0;
  }

  protected columnWip(column: KanbanColumnDef): KanbanWipState {
    return kanbanColumnWip(column, this.columnCounts());
  }

  /** See `isKanbanLegalTarget` — interactive moves only. */
  protected isLegalTarget(fromKey: string, toKey: string): boolean {
    return isKanbanLegalTarget(this.visibleColumns(), fromKey, toKey);
  }

  protected cellLabel(
    column: KanbanColumnDef,
    count: number,
    lane: string | null = null,
  ): string {
    return kanbanCellLabel(
      this.msg().board,
      column,
      count,
      this.cellWip(column, lane) ?? this.columnWip(column),
    );
  }

  protected cardLabel(card: KanbanCard<T>): string {
    return kanbanCardLabel(
      this.msg().board,
      card,
      this.visibleColumns(),
      this.isCardSelected(card),
    );
  }

  protected checklistText(checklist: readonly KanbanChecklistItem[]): string {
    return kanbanChecklistLabel(
      this.msg().board,
      checklist,
      this.effectiveLocale(),
    );
  }

  protected checklistProgress(checklist: readonly KanbanChecklistItem[]): {
    readonly done: number;
    readonly total: number;
  } {
    return kanbanChecklistProgress(checklist);
  }

  protected countText(
    template: string,
    values: Readonly<Record<string, string | number>>,
  ): string {
    return formatKanbanCount(template, values, this.effectiveLocale());
  }

  protected cardActionLabel(
    action: 'edit' | 'delete',
    card: KanbanCard<T>,
  ): string {
    return kanbanCardActionLabel(this.msg().board, action, card);
  }

  protected format(
    template: string,
    tokens: Readonly<Record<string, string>>,
  ): string {
    return formatKanbanMessage(template, tokens);
  }

  protected initials(name: string): string {
    return kanbanInitials(name);
  }

  protected isOverdue(due: Date): boolean {
    return isKanbanOverdue(due);
  }

  protected formatDue(due: Date): string {
    return formatKanbanDue(due, this.effectiveLocale());
  }

  protected keyOf(card: KanbanCard<T>): string {
    return String(card.key);
  }

  // ---------------- focus & keyboard ----------------

  private readonly focusedCardKey = signal<unknown>(null);
  private readonly pendingFocusKey = signal<string | null>(null);

  /** One tab stop per column cell — see `kanbanFocusableKeys`. */
  private readonly focusableKeys = computed(() =>
    kanbanFocusableKeys(this.lanes(), this.focusedCardKey()),
  );

  protected isCardFocusable(card: KanbanCard<T>): boolean {
    return this.focusableKeys().has(card.key);
  }

  protected onCardClick(card: KanbanCard<T>, event: MouseEvent): void {
    // the quick-action buttons resolve here, so a click and a keyboard
    // activation (Enter/Space on the focused button) take one path
    const action = (event.target as HTMLElement).closest(
      '.oge-kanban-card-action',
    );
    if (action === null) {
      this.applySelection(
        kanbanSelectCard(
          this.lanes(),
          this.selection(),
          card.key,
          {
            toggle: event.ctrlKey || event.metaKey,
            range: event.shiftKey,
          },
          this.selectionMode(),
        ),
        card.key,
      );
    } else {
      this.applySelection({ keys: [card.key], anchor: card.key }, card.key);
    }
    this.focusedCardKey.set(card.key);
    this.cardClick.emit({ card, event });
    if (action !== null) {
      if (action.classList.contains('oge-kanban-card-action-edit')) {
        this.editCard(card);
      } else if (action.classList.contains('oge-kanban-card-action-delete')) {
        this.deleteItem(card.source);
      }
    }
  }

  protected onCardDblClick(card: KanbanCard<T>, event: MouseEvent): void {
    event.stopPropagation();
    if (
      isKanbanCardContentTarget(event.target, event.currentTarget as Element)
    ) {
      return;
    }
    this.cardDblClick.emit({ card, event });
    if (
      this.inlineTitleEditing() &&
      (event.target as HTMLElement).closest('.oge-kanban-card-title') !== null
    ) {
      this.startTitleEdit(card.key);
      return;
    }
    if (this.canUpdate()) this.editCard(card);
  }

  protected onCellDblClick(
    event: MouseEvent,
    column: KanbanColumnDef,
    lane: string | null,
  ): void {
    // only a dblclick on empty cell space (not on a card) creates a card
    if ((event.target as HTMLElement).closest('.oge-kanban-card') !== null) {
      return;
    }
    if (this.canAddTo(column)) this.openNewCard(column.key, lane);
  }

  private readonly isCollapsedFn = (key: string): boolean =>
    this.isColumnCollapsed(key);

  protected onCardKeydown(event: KeyboardEvent, card: KanbanCard<T>): void {
    // keys typed into a card's own controls stay with those controls
    const route = kanbanCardKeyRoute(event);
    if (route === 'return') {
      event.preventDefault();
      focusOwningKanbanCard(event.target as Element);
      return;
    }
    if (route === 'content') return;
    const shortcut = kanbanSelectionShortcut(
      event,
      this.selectionMode(),
      this.selectedKeys().length,
    );
    if (shortcut !== null) {
      event.preventDefault();
      this.onSelectionShortcut(shortcut, card);
      return;
    }
    if (event.ctrlKey && !event.metaKey && !event.altKey) {
      this.onCardCtrlArrow(event, card);
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'Enter') {
      if (this.canUpdate()) {
        event.preventDefault();
        this.editCard(card);
      }
      return;
    }
    if (event.key === 'F2') {
      if (this.canUpdate() && canEditKanbanTitle(this.fields())) {
        event.preventDefault();
        this.startTitleEdit(card.key);
      }
      return;
    }
    if (event.key === 'Delete') {
      if (this.canDelete()) {
        event.preventDefault();
        const carried = this.carried(card);
        if (carried.length > 1) {
          this.deleteCards(carried.map((entry) => entry.source));
        } else {
          this.deleteItem(card.source);
        }
      }
      return;
    }
    const position = findKanbanCard(this.lanes(), card.key);
    if (position === null) return;
    const target = kanbanNavigationTarget(
      this.lanes(),
      position,
      event.key,
      this.isCollapsedFn,
      this.rtl(),
    );
    if (target === undefined) return;
    event.preventDefault();
    this.focusCard(target);
  }

  /**
   * Ctrl+Arrow: the exact keyboard twin of the drag — up/down reorders
   * within the column, left/right moves to the neighbouring column at the
   * same position; every commit goes through the `cardMoving` pipeline and
   * is announced. No reference library moves cards from the keyboard.
   */
  private onCardCtrlArrow(event: KeyboardEvent, card: KanbanCard<T>): void {
    if (!this.canDrag()) return;
    const sourceColumn = this.visibleColumns().find(
      (entry) => entry.key === card.column,
    );
    if (sourceColumn?.allowDrag === false) return;
    const position = findKanbanCard(this.lanes(), card.key);
    if (position === null) return;
    const move = kanbanKeyboardMove(
      this.lanes(),
      this.visibleColumns(),
      card,
      position,
      event.key,
      this.isCollapsedFn,
      this.rtl(),
    );
    if (move === null) return;
    event.preventDefault();
    const carried = this.carried(card);
    // a horizontal move carries the whole selection; up/down reorders one
    if (carried.length > 1 && move.toColumn !== card.column) {
      this.moveCards(
        carried.map((entry) => entry.key),
        move.toColumn,
        move.toIndex,
      );
      return;
    }
    this.moveCard(card.key, move.toColumn, move.toIndex);
  }

  private focusCard(card: KanbanCard<T>, keepSelection = false): void {
    this.focusedCardKey.set(card.key);
    if (!keepSelection) {
      this.applySelection({ keys: [card.key], anchor: card.key }, card.key);
    }
    this.scrollCardIntoView(card);
    this.pendingFocusKey.set(this.keyOf(card));
  }

  // ---------------- multi-select ----------------

  /** The anchor of Shift ranges (the last plainly or Ctrl-selected card). */
  private selectionAnchor: unknown = null;

  /** Effective selection: `selectedCardKeys`, else the single `selectedCardKey`. */
  private readonly selectedKeys = computed<readonly unknown[]>(() => {
    const keys = this.selectedCardKeys();
    if (keys.length > 0) return keys;
    const key = this.selectedCardKey();
    return key === null || key === undefined ? [] : [key];
  });

  private readonly selectedSet = computed(() => new Set(this.selectedKeys()));

  private selection(): { keys: readonly unknown[]; anchor: unknown } {
    return {
      keys: untracked(this.selectedKeys),
      anchor: this.selectionAnchor ?? untracked(this.selectedCardKey),
    };
  }

  private applySelection(
    next: { keys: readonly unknown[]; anchor: unknown },
    primary: unknown,
  ): void {
    this.selectionAnchor = next.anchor;
    const before = untracked(this.selectedCardKeys);
    const same =
      before.length === next.keys.length &&
      before.every((key, index) => key === next.keys[index]);
    if (!same) this.selectedCardKeys.set(next.keys);
    this.selectedCardKey.set(
      next.keys.includes(primary) ? primary : (next.keys[0] ?? null),
    );
    if (next.keys.length > 1 && !same) {
      this.announcement.set(
        this.countText(this.msg().announcements.selection, {
          count: next.keys.length,
        }),
      );
    }
  }

  protected isCardSelected(card: KanbanCard<T>): boolean {
    return this.selectedSet().has(card.key);
  }

  /** Multi-selected (two or more) — the accent-tinted state. */
  protected isCardMulti(card: KanbanCard<T>): boolean {
    return this.selectedKeys().length > 1 && this.selectedSet().has(card.key);
  }

  /** The cards a drag / Ctrl+Arrow / Delete of `card` acts on. */
  private carried(card: KanbanCard<T>): KanbanCard<T>[] {
    if (this.selectionMode() !== 'multiple') return [card];
    return kanbanCarriedCards(this.lanes(), card, untracked(this.selectedKeys));
  }

  /** Selects the given card keys (programmatic; board order is applied). */
  selectCards(keys: readonly unknown[]): void {
    const ordered = kanbanOrderKeys(this.lanes(), keys);
    this.applySelection(
      { keys: ordered, anchor: ordered[0] ?? null },
      ordered[0] ?? null,
    );
  }

  /** Clears the selection. */
  clearSelection(): void {
    this.applySelection({ keys: [], anchor: null }, null);
  }

  private onSelectionShortcut(
    shortcut: NonNullable<ReturnType<typeof kanbanSelectionShortcut>>,
    card: KanbanCard<T>,
  ): void {
    const lanes = this.lanes();
    switch (shortcut) {
      case 'select-cell': {
        const next = kanbanSelectCell(lanes, card.key);
        if (next !== null) this.applySelection(next, card.key);
        return;
      }
      case 'toggle':
        this.applySelection(
          kanbanSelectCard(
            lanes,
            this.selection(),
            card.key,
            { toggle: true, range: false },
            'multiple',
          ),
          card.key,
        );
        return;
      case 'clear':
        this.applySelection({ keys: [card.key], anchor: card.key }, card.key);
        return;
      case 'extend-up':
      case 'extend-down': {
        const position = findKanbanCard(lanes, card.key);
        if (position === null) return;
        const target = kanbanNavigationTarget(
          lanes,
          position,
          shortcut === 'extend-up' ? 'ArrowUp' : 'ArrowDown',
          this.isCollapsedFn,
        );
        if (target === undefined) return;
        const current = this.selection();
        this.applySelection(
          kanbanSelectCard(
            lanes,
            { keys: current.keys, anchor: current.anchor ?? card.key },
            target.key,
            { toggle: false, range: true },
            'multiple',
          ),
          target.key,
        );
        this.focusCard(target, true);
        return;
      }
    }
  }

  /** Adjusts the cell's scrollTop so a virtualized target renders and shows. */
  private scrollCardIntoView(card: KanbanCard<T>): void {
    if (!this.virtualScrolling()) return;
    const position = findKanbanCard(this.lanes(), card.key);
    if (position === null) return;
    const lane = this.lanes()[position.laneIndex];
    const key = kanbanCellKey(lane.key, card.column);
    const state = this.cellState().get(key);
    if (state === undefined) return;
    const top = kanbanScrollIntoViewTop(
      state,
      position.cardIndex,
      this.cardHeightPx(),
    );
    if (top !== null) {
      const next = new Map(this.cellState());
      next.set(key, { ...state, top });
      this.cellState.set(next);
      scrollKanbanCell(this.hostEl.nativeElement, lane.key, card.column, top);
    }
  }

  /* ---------------- drag & drop ---------------- */

  protected readonly drag = signal<KanbanDragState<T> | null>(null);
  /** Live column-order preview while a header drag is in flight. */
  private readonly dragColumnOrder = signal<readonly string[] | null>(null);
  /** The header being dragged (styling hook). */
  protected readonly draggedColumnKey = signal<string | null>(null);

  private dragGeometry: KanbanDragGeometry | null = null;
  private stopFrameLoop: (() => void) | null = null;

  protected isDraggedCard(card: KanbanCard<T>): boolean {
    return this.drag()?.card.key === card.key;
  }

  /** The placeholder slot for a cell, or `null` when it is not the target. */
  protected dropIndexFor(lane: string | null, column: string): number | null {
    const incoming = this.incomingTarget();
    if (incoming !== null) {
      return incoming.lane === lane && incoming.column === column
        ? incoming.index
        : null;
    }
    return kanbanDropIndex(this.drag(), lane, column);
  }

  /** Whether a rendered card slides down to open the placeholder gap. */
  protected isShifted(
    lane: string | null,
    columnKey: string,
    absoluteIndex: number,
    card: KanbanCard<T>,
  ): boolean {
    const incoming = this.incomingTarget();
    if (incoming !== null) {
      return (
        incoming.lane === lane &&
        incoming.column === columnKey &&
        absoluteIndex >= incoming.index
      );
    }
    return isKanbanCardShifted(
      this.drag(),
      lane,
      columnKey,
      absoluteIndex,
      card,
    );
  }

  protected onCardPointerDown(
    event: PointerEvent,
    card: KanbanCard<T>,
    column: KanbanColumnDef,
    lane: string | null,
  ): void {
    if (!this.canDrag() || event.button !== 0) return;
    if (column.allowDrag === false) return;
    const cardEl = event.currentTarget as HTMLElement;
    // quick actions and template controls keep their native press
    if (isKanbanCardContentTarget(event.target, cardEl)) return;
    const position = findKanbanCard(this.lanes(), card.key);
    if (position === null) return;
    const rect = cardEl.getBoundingClientRect();
    this.dragGeometry = measureKanbanDragGeometry(this.hostEl.nativeElement);
    // a modifier press is a selection click (decided on `click`); a plain
    // press on an unselected card selects it, on a selected one keeps the
    // multi-selection so the drag carries it
    const modified = event.ctrlKey || event.metaKey || event.shiftKey;
    if (!modified && !this.isCardSelected(card)) {
      this.applySelection({ keys: [card.key], anchor: card.key }, card.key);
    }
    this.focusedCardKey.set(card.key);
    // the gesture's preventDefault suppresses native focus-on-click
    cardEl.focus({ preventScroll: true });
    // the drag state materializes on the first past-threshold move — a
    // plain click must never lift the card
    const pending: KanbanDragState<T> = {
      card,
      column,
      fromLane: lane,
      fromIndex: position.cardIndex,
      width: rect.width,
      height: rect.height,
      grabX: event.clientX - rect.left,
      grabY: event.clientY - rect.top,
      x: event.clientX,
      y: event.clientY,
      target: { lane, column: card.column, index: position.cardIndex },
    };
    beginKanbanGesture(event, {
      onMove: (_dx, _dy, moveEvent) => {
        const current = this.drag();
        if (current === null) {
          // the lift: the selection rides along when the card is in it
          const carried = modified ? [card] : this.carried(card);
          this.dragCarried.set(carried.map((entry) => entry.key));
        }
        const base = current ?? pending;
        const x = moveEvent.clientX;
        const y = moveEvent.clientY;
        const target = this.dragTargetAt(x, y, base);
        this.drag.set({ ...base, x, y, target });
        if (current === null) this.startAutoScroll();
      },
      onFinish: (commit, cancelled) => {
        this.stopAutoScroll();
        const state = this.drag();
        const carried = this.dragCarried();
        const external = this.externalDrop;
        this.externalDrop = null;
        external?.peer.preview(null);
        this.drag.set(null);
        this.dragCarried.set([]);
        if (state === null) return;
        if (cancelled) {
          this.announcement.set(this.msg().announcements.cancelled);
          return;
        }
        if (!commit) return;
        if (external !== null && external.target !== null) {
          this.transferTo(external.peer, carried, state, external.target);
          return;
        }
        if (state.target === null) return;
        if (carried.length > 1) {
          this.moveCards(
            carried,
            state.target.column,
            state.target.index,
            state.target.lane,
            state.card.key,
          );
          return;
        }
        this.moveCard(
          state.card.key,
          state.target.column,
          state.target.index,
          state.target.lane,
        );
      },
    });
  }

  /** Keys the drag in flight carries (the dragged card first in board order). */
  protected readonly dragCarried = signal<readonly unknown[]>([]);
  private readonly dragCarriedSet = computed(() => new Set(this.dragCarried()));

  /** Another selected card riding along with the drag (dimmed in place). */
  protected isCarriedCard(card: KanbanCard<T>): boolean {
    const drag = this.drag();
    return (
      drag !== null &&
      drag.card.key !== card.key &&
      this.dragCarriedSet().has(card.key)
    );
  }

  /** The peer board a drag currently hovers, with its incoming target. */
  private externalDrop: {
    peer: KanbanBoardPeer;
    target: KanbanDragTarget | null;
  } | null = null;

  /**
   * The drop target at a pointer position: inside this board the usual
   * hit-test; outside it, the hovered board of the same `dragGroup` (its
   * placeholder previews there and this board shows none).
   */
  private dragTargetAt(
    x: number,
    y: number,
    origin: KanbanDragState<T>,
  ): KanbanDragTarget | null {
    const host = this.hostEl.nativeElement;
    const group = this.dragGroup();
    if (group !== undefined && !isInsideKanbanHost(host, x, y)) {
      const peer = kanbanPeerAt(group, this.resolvedBoardId(), x, y);
      if (this.externalDrop !== null && this.externalDrop.peer !== peer) {
        this.externalDrop.peer.preview(null);
        this.externalDrop = null;
      }
      if (peer !== null) {
        const target = peer.targetAt(x, y);
        peer.preview(target);
        this.externalDrop = { peer, target };
        return null;
      }
    } else if (this.externalDrop !== null) {
      this.externalDrop.peer.preview(null);
      this.externalDrop = null;
    }
    return this.resolveDragTarget(x, y, origin) ?? origin.target;
  }

  /** Pointer → (lane, column, insertion index), in start-frame coordinates. */
  private resolveDragTarget(
    clientX: number,
    clientY: number,
    origin: KanbanDragState<T>,
  ): KanbanDragTarget | null {
    if (this.dragGeometry === null) return null;
    return resolveKanbanDragTarget(
      this.dragGeometry,
      clientX,
      clientY,
      origin,
      this.lanes(),
      this.visibleColumns(),
      this.cardHeightPx() + KANBAN_CARD_GAP,
    );
  }

  /**
   * Edge auto-scroll: an rAF loop (independent of pointer events, so the
   * board keeps scrolling while the pointer rests at an edge) that scrolls
   * the hovered cell vertically and the board horizontally, then re-runs
   * the hit-test at the resting pointer position.
   */
  private startAutoScroll(): void {
    this.stopFrameLoop = startKanbanFrameLoop(() => {
      const state = this.drag();
      if (state === null || this.dragGeometry === null) return false;
      if (kanbanAutoScrollStep(this.dragGeometry, state)) {
        const next = this.resolveDragTarget(state.x, state.y, state);
        if (next !== null) this.drag.set({ ...state, target: next });
      }
      return true;
    });
  }

  private stopAutoScroll(): void {
    this.stopFrameLoop?.();
    this.stopFrameLoop = null;
  }

  /* ---------------- column reorder drag ---------------- */

  protected onColumnHeaderPointerDown(
    event: PointerEvent,
    column: KanbanColumnDef,
  ): void {
    if (!this.allowColumnReordering() || this.readOnly()) return;
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest('button') !== null) return;
    const columns = this.visibleColumns();
    const fromIndex = columns.findIndex((entry) => entry.key === column.key);
    if (fromIndex < 0) return;
    const centers = kanbanHeaderCenters(this.hostEl.nativeElement);
    const baseOrder = columns.map((entry) => entry.key);
    this.draggedColumnKey.set(column.key);
    beginKanbanGesture(event, {
      onMove: (_dx, _dy, moveEvent) => {
        const toIndex = columnReorderIndex(
          moveEvent.clientX,
          centers,
          fromIndex,
        );
        this.dragColumnOrder.set(
          kanbanColumnOrderPreview(baseOrder, fromIndex, toIndex, column.key),
        );
      },
      onFinish: (commit, _cancelled) => {
        const preview = this.dragColumnOrder();
        this.dragColumnOrder.set(null);
        this.draggedColumnKey.set(null);
        if (!commit || preview === null) return;
        const toIndex = preview.indexOf(column.key);
        if (toIndex === fromIndex) return;
        this.columnOrder.set(preview);
        this.columnReordered.emit({
          column,
          fromIndex,
          toIndex,
          columnOrder: preview,
        });
        this.announce(this.msg().announcements.columnMoved, {
          title: this.columnTitle(column),
          position: String(toIndex + 1),
        });
      },
    });
  }

  /* ---------------- built-in context menu ---------------- */

  protected readonly menu = signal<KanbanMenuState | null>(null);

  protected onCardContextMenu(card: KanbanCard<T>, event: MouseEvent): void {
    this.cardContextMenu.emit({ card, event });
    if (!this.isCardSelected(card)) {
      this.applySelection({ keys: [card.key], anchor: card.key }, card.key);
    }
    this.focusedCardKey.set(card.key);
    this.openMenu(event, card, null);
  }

  /** The header's column-menu button: the same menu, anchored under it. */
  protected onColumnMenuButton(
    event: MouseEvent,
    column: KanbanColumnDef,
  ): void {
    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const hostRect = this.hostEl.nativeElement.getBoundingClientRect();
    event.stopPropagation();
    this.menu.set({
      x: rect.left - hostRect.left,
      y: rect.bottom - hostRect.top + 4,
      card: null,
      column,
      swimlane: null,
    });
    this.menuReturnFocus = button;
    setTimeout(() => focusFirstKanbanMenuItem(this.hostEl.nativeElement));
  }

  /** Where focus returns when a menu opened from a button closes. */
  private menuReturnFocus: HTMLElement | null = null;

  protected readonly sortDirections: readonly ('asc' | 'desc')[] = [
    'asc',
    'desc',
  ];

  protected readonly sortFields: readonly OgeKanbanSortField[] = [
    'order',
    'title',
    'priority',
    'dueDate',
  ];

  protected sortFieldLabel(field: OgeKanbanSortField): string {
    const m = this.msg().menu;
    switch (field) {
      case 'title':
        return m.sortTitle;
      case 'priority':
        return m.sortPriority;
      case 'dueDate':
        return m.sortDueDate;
      default:
        return m.sortManual;
    }
  }

  protected activeSort(column: KanbanColumnDef): {
    field: OgeKanbanSortField | null;
    direction: 'asc' | 'desc';
  } {
    return kanbanActiveSort(this.columnSort(), column.key);
  }

  /** The column menu's sort entries write `columnSort` (two-way). */
  protected menuSort(
    field: OgeKanbanSortField | null,
    direction?: 'asc' | 'desc',
  ): void {
    const state = untracked(this.menu);
    this.closeMenu();
    const column = state?.column;
    if (column == null) return;
    const active = kanbanActiveSort(this.columnSort(), column.key);
    const nextField = field ?? active.field ?? 'order';
    const nextDirection = direction ?? active.direction;
    this.columnSort.set(
      setKanbanColumnSort(
        this.columnSort(),
        column.key,
        nextField,
        nextDirection,
      ),
    );
    this.announce(this.msg().announcements.sorted, {
      column: this.columnTitle(column),
      field: this.sortFieldLabel(nextField),
    });
  }

  protected menuSelectAll(): void {
    const state = untracked(this.menu);
    this.closeMenu();
    const column = state?.column;
    if (column == null) return;
    const keys: unknown[] = [];
    for (const lane of this.lanes()) {
      const cell = lane.columns.find(
        (entry) => entry.column.key === column.key,
      );
      for (const card of cell?.cards ?? []) keys.push(card.key);
    }
    this.selectCards(keys);
  }

  /** Other boards of this board's `dragGroup` (the menu's "Move to …"). */
  protected peerBoards(): KanbanBoardPeer[] {
    return kanbanBoardPeers(this.dragGroup(), this.resolvedBoardId());
  }

  protected menuMoveToBoard(peer: KanbanBoardPeer): void {
    const state = untracked(this.menu);
    this.closeMenu();
    const card = state?.card as KanbanCard<T> | null | undefined;
    if (card == null) return;
    const column = peer.columns().find((entry) => entry.allowDrop !== false);
    if (column === undefined) return;
    const carried = this.carried(card);
    this.transferTo(
      peer,
      carried.map((entry) => entry.key),
      null,
      {
        lane: card.swimlane,
        column: column.key,
        index: Number.MAX_SAFE_INTEGER,
      },
    );
  }

  protected onColumnContextMenu(
    event: MouseEvent,
    column: KanbanColumnDef,
  ): void {
    this.openMenu(event, null, column);
  }

  private openMenu(
    event: MouseEvent,
    card: KanbanCard<T> | null,
    column: KanbanColumnDef | null,
  ): void {
    // no available action → keep the native browser menu
    const available = isKanbanMenuAvailable(card !== null, column !== null, {
      canUpdate: this.canUpdate(),
      canDelete: this.canDelete(),
    });
    if (!available) return;
    event.preventDefault();
    event.stopPropagation();
    const hostRect = this.hostEl.nativeElement.getBoundingClientRect();
    this.menu.set({
      x: event.clientX - hostRect.left,
      y: event.clientY - hostRect.top,
      card,
      column,
      swimlane: card?.swimlane ?? null,
    });
    setTimeout(() => focusFirstKanbanMenuItem(this.hostEl.nativeElement));
  }

  protected closeMenu(): void {
    this.menu.set(null);
    const back = this.menuReturnFocus;
    this.menuReturnFocus = null;
    if (back !== null && back.isConnected) back.focus();
  }

  protected onMenuKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.closeMenu();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    stepKanbanMenuFocus(this.hostEl.nativeElement, event.key);
  }

  /** Move-to targets: every other legal visible column (a menu of real moves). */
  protected moveTargets(menu: KanbanMenuState): readonly KanbanColumnDef[] {
    const card = menu.card;
    if (card === null || !this.canUpdate()) return [];
    return kanbanMoveTargets(this.visibleColumns(), card.column);
  }

  protected menuEdit(): void {
    const state = untracked(this.menu);
    this.closeMenu();
    if (state?.card !== null && state?.card !== undefined) {
      this.editCard(state.card as KanbanCard<T>);
    }
  }

  protected menuDelete(): void {
    const state = untracked(this.menu);
    this.closeMenu();
    if (state?.card !== null && state?.card !== undefined) {
      this.deleteItem(state.card.source as T);
    }
  }

  protected menuMoveTo(columnKey: string): void {
    const state = untracked(this.menu);
    this.closeMenu();
    if (state?.card !== null && state?.card !== undefined) {
      this.moveCard(state.card.key, columnKey);
    }
  }

  protected menuAddCard(): void {
    const state = untracked(this.menu);
    this.closeMenu();
    if (state?.column != null) {
      this.openNewCard(state.column.key, state.swimlane);
    }
  }

  protected menuToggleColumn(): void {
    const state = untracked(this.menu);
    this.closeMenu();
    if (state?.column != null) this.toggleColumn(state.column.key);
  }

  /* ---------------- editor dialog ---------------- */

  /** Choice lists for the default form, built from the current board. */
  protected readonly editorChoices = computed(() =>
    buildKanbanEditorChoices(
      this.allCards(),
      this.visibleColumns(),
      this.fields(),
      this.mapped(),
    ),
  );

  /** The source item being edited; `null` while creating. */
  private editedSource: T | null = null;

  /** Session-unique keys for created cards whose data has no key yet. */
  private newKeyCounter = 0;

  /** Opens the editor for `card` through the `cardEditDialogShowing` hook. */
  editCard(card: KanbanCard<T>): void {
    if (!this.canUpdate()) return;
    this.openEditor(kanbanEditorModelFrom(card), card.source, false);
  }

  /** Opens the editor for a new card prefilled into `column` / `swimlane`. */
  openNewCard(column: string, swimlane: string | null): void {
    if (!this.canAdd()) return;
    this.openEditor(newKanbanEditorModel(column, swimlane), null, true);
  }

  /** Closes the edit dialog without saving (Syncfusion `closeDialog` parity). */
  closeDialog(): void {
    const dialog = this.dialog();
    if (!dialog.isOpen()) return;
    dialog.close();
    this.editedSource = null;
    this.cardEditDialogHidden.emit();
  }

  protected addFromToolbar(): void {
    this.openNewCard(
      kanbanToolbarAddColumn(
        this.visibleColumns(),
        (column) => this.canAddTo(column),
        this.isCollapsedFn,
      ),
      null,
    );
  }

  private openEditor(
    model: KanbanEditorModel,
    source: T | null,
    isNew: boolean,
  ): void {
    const dialog = this.dialog();
    const event: OgeKanbanEditDialogShowingEvent<T> = {
      card: source,
      isNew,
      column: model.column,
      formItems: [...(this.dialogItems() ?? dialog.defaultItems())],
      cancel: false,
    };
    this.cardEditDialogShowing.emit(event);
    if (event.cancel) return;
    this.editedSource = source;
    dialog.open(model, isNew, event.formItems);
  }

  protected onEditorSaved(result: KanbanEditorResult): void {
    this.cardEditDialogHidden.emit();
    if (result.isNew) {
      const base = newKanbanItemBase<T>(this.fields(), ++this.newKeyCounter);
      const item = buildKanbanItem(
        result.model,
        base,
        this.fields(),
        this.mapped(),
      );
      this.insertItem(item, result.model.column, result.model.swimlane);
      return;
    }
    if (this.editedSource !== null) {
      const updated = buildKanbanItem(
        result.model,
        this.editedSource,
        this.fields(),
        this.mapped(),
      );
      this.updateItem(this.editedSource, updated);
      this.editedSource = null;
    }
  }

  protected onEditorDelete(): void {
    this.cardEditDialogHidden.emit();
    if (this.editedSource !== null) {
      this.deleteItem(this.editedSource);
      this.editedSource = null;
    }
  }

  /* ---------------- CRUD executor ---------------- */

  /** Undo/redo stacks (plain, non-reactive — `historyVersion` drives the UI). */
  private readonly history = new KanbanHistory<T>(KANBAN_DEFAULT_UNDO_LIMIT);
  private readonly historyVersion = signal(0);

  /** Whether `undo()` has a step to revert. */
  canUndo(): boolean {
    this.historyVersion();
    return this.history.canUndo;
  }

  /** Whether `redo()` has a step to re-apply. */
  canRedo(): boolean {
    this.historyVersion();
    return this.history.canRedo;
  }

  /**
   * Reverts the last change (an edit, move, add, delete or a multi-card
   * step) by replaying its inverse through the cancelable pipelines, so the
   * `-ing` / `-ed` events fire for the undo as for the original.
   */
  undo(): void {
    const ops = this.history.undo();
    if (ops === null) return;
    this.replayOps(ops);
    this.announcement.set(this.msg().announcements.undone);
  }

  /** Re-applies the last undone change. */
  redo(): void {
    const ops = this.history.redo();
    if (ops === null) return;
    this.replayOps(ops);
    this.announcement.set(this.msg().announcements.redone);
  }

  private bumpHistory(): void {
    this.historyVersion.update((value) => value + 1);
  }

  private record(op: KanbanHistoryOp<T>): void {
    this.history.record(op);
    this.bumpHistory();
  }

  private replayOps(ops: readonly KanbanHistoryOp<T>[]): void {
    this.history.replay(() => {
      for (const op of ops) {
        switch (op.kind) {
          case 'insert': {
            const fields = this.fields();
            this.insertItem(
              op.item,
              String(fields.column(op.item) ?? ''),
              fields.swimlane
                ? ((fields.swimlane(op.item) as string | undefined) ?? null)
                : null,
              op.index,
              true,
            );
            break;
          }
          case 'remove': {
            const item = this.itemByKey(op.key);
            if (item !== undefined) this.deleteItem(item, true);
            break;
          }
          case 'update': {
            const item = this.itemByKey(op.key);
            if (item !== undefined) this.updateItem(item, op.after, true);
            break;
          }
          case 'move':
            this.moveOne(op.key, op.to.column, op.to.index, op.to.swimlane, {
              announce: false,
              focus: true,
              force: true,
            });
            break;
        }
      }
    });
    this.bumpHistory();
  }

  private itemByKey(key: unknown): T | undefined {
    const fields = this.fields();
    return untracked(this.store).find((item) => fields.key(item) === key);
  }

  /** Programmatic insert through the cancelable pipeline. */
  addCard(item: T): void {
    const fields = this.fields();
    const column = String(fields.column(item) ?? '');
    const swimlane = fields.swimlane
      ? ((fields.swimlane(item) as string | undefined) ?? null)
      : null;
    this.insertItem(item, column, swimlane);
  }

  private insertItem(
    item: T,
    column: string,
    swimlane: string | null,
    index?: number,
    force = false,
  ): void {
    if (!force && !this.canAdd()) return;
    const event: OgeKanbanCardAddingEvent<T> = {
      card: item,
      column,
      swimlane,
      cancel: false,
    };
    this.cardAdding.emit(event);
    if (event.cancel) return;
    const store = [...this.store()];
    const at =
      index === undefined
        ? store.length
        : Math.min(Math.max(index, 0), store.length);
    store.splice(at, 0, item);
    this.store.set(store);
    this.record({
      kind: 'insert',
      key: this.fields().key(item),
      item,
      index: at,
    });
    this.cardAdded.emit({ card: item, column, swimlane });
    this.announce(this.msg().announcements.cardCreated, {
      title: String(this.fields().title(item) ?? ''),
    });
  }

  /** Programmatic update through the cancelable pipeline. */
  updateCard(original: T, updated: T): void {
    this.updateItem(original, updated);
  }

  private updateItem(original: T, updated: T, force = false): void {
    if (!force && !this.canUpdate()) return;
    const event: OgeKanbanCardUpdatingEvent<T> = {
      oldData: original,
      newData: updated,
      cancel: false,
    };
    this.cardUpdating.emit(event);
    if (event.cancel) return;
    this.store.set(
      this.store().map((entry) => (entry === original ? updated : entry)),
    );
    this.record({
      kind: 'update',
      key: this.fields().key(updated),
      before: original,
      after: updated,
    });
    this.cardUpdated.emit({ oldData: original, newData: updated });
    this.announce(this.msg().announcements.cardUpdated, {
      title: String(this.fields().title(updated) ?? ''),
    });
  }

  /** Programmatic delete through the cancelable pipeline. */
  deleteCard(item: T): void {
    this.deleteItem(item);
  }

  /** Deletes several items as one undoable step (each through `cardDeleting`). */
  deleteCards(items: readonly T[]): void {
    if (!this.canDelete()) return;
    let deleted = 0;
    this.history.transaction(() => {
      for (const item of items) if (this.deleteItem(item)) deleted++;
    });
    this.bumpHistory();
    if (deleted > 1) {
      this.announcement.set(
        this.countText(this.msg().announcements.cardsDeleted, {
          count: deleted,
        }),
      );
    }
  }

  private deleteItem(item: T, force = false): boolean {
    if (!force && !this.canDelete()) return false;
    const event: OgeKanbanCardDeletingEvent<T> = { card: item, cancel: false };
    this.cardDeleting.emit(event);
    if (event.cancel) return false;
    const index = this.store().indexOf(item);
    this.store.set(this.store().filter((entry) => entry !== item));
    this.record({ kind: 'remove', key: this.fields().key(item), item, index });
    this.cardDeleted.emit({ card: item });
    this.announce(this.msg().announcements.cardDeleted, {
      title: String(this.fields().title(item) ?? ''),
    });
    return true;
  }

  /**
   * Moves a card to `toColumn` (append, or `toIndex` within the target
   * cell) through the cancelable `cardMoving` pipeline. The drag gesture,
   * the Ctrl+Arrow keyboard twin and the context menu all commit here.
   */
  moveCard(
    key: unknown,
    toColumn: string,
    toIndex?: number,
    toSwimlane?: string | null,
  ): void {
    this.moveOne(key, toColumn, toIndex, toSwimlane, {
      announce: true,
      focus: true,
      force: false,
    });
  }

  /**
   * Moves several cards (board order kept) into one cell as one undoable
   * step: inserted consecutively before the card now at `toIndex` (append
   * when unset). Without `toSwimlane` every card stays in its own lane.
   * Each card goes through `cardMoving` / `cardMoved`.
   */
  moveCards(
    keys: readonly unknown[],
    toColumn: string,
    toIndex?: number,
    toSwimlane?: string | null,
    /** Internal: the dragged card, which the drop index does not count. */
    excludeKey?: unknown,
  ): void {
    if (!this.canUpdate() && !this.canDrag()) return;
    const ordered = kanbanOrderKeys(this.lanes(), keys);
    if (ordered.length === 0) return;
    const anchors = new Map<string | null, unknown>();
    const anchorFor = (lane: string | null): unknown => {
      if (!anchors.has(lane)) {
        const cell = this.lanes()
          .find((entry) => entry.key === lane)
          ?.columns.find((entry) => entry.column.key === toColumn);
        anchors.set(
          lane,
          toIndex === undefined || cell === undefined
            ? null
            : kanbanMultiMoveAnchor(cell.cards, toIndex, ordered, excludeKey),
        );
      }
      return anchors.get(lane);
    };
    let moved = 0;
    this.history.transaction(() => {
      for (const key of ordered) {
        const position = findKanbanCard(this.lanes(), key);
        if (position === null) continue;
        const ownLane = this.lanes()[position.laneIndex].key;
        const lane = toSwimlane !== undefined ? toSwimlane : ownLane;
        const cell = this.lanes()
          .find((entry) => entry.key === lane)
          ?.columns.find((entry) => entry.column.key === toColumn);
        const index =
          cell === undefined
            ? undefined
            : kanbanAnchorIndex(cell.cards, anchorFor(lane), key);
        if (
          this.moveOne(key, toColumn, index, lane, {
            announce: false,
            focus: false,
            force: false,
          })
        ) {
          moved++;
        }
      }
    });
    this.bumpHistory();
    const column = this.visibleColumns().find(
      (entry) => entry.key === toColumn,
    );
    if (moved > 0) {
      this.announcement.set(
        this.countText(this.msg().announcements.cardsMoved, {
          count: moved,
          column: column !== undefined ? this.columnTitle(column) : toColumn,
        }),
      );
    }
    const primary = ordered.includes(excludeKey) ? excludeKey : ordered[0];
    const position = findKanbanCard(this.lanes(), primary);
    if (position !== null) {
      const card =
        this.lanes()[position.laneIndex].columns[position.columnIndex].cards[
          position.cardIndex
        ];
      this.focusedCardKey.set(card.key);
      this.scrollCardIntoView(card);
      this.pendingFocusKey.set(this.keyOf(card));
    }
  }

  /** One move through the pipeline; returns whether it was applied. */
  private moveOne(
    key: unknown,
    toColumn: string,
    toIndex: number | undefined,
    toSwimlane: string | null | undefined,
    options: { announce: boolean; focus: boolean; force: boolean },
  ): boolean {
    if (!options.force && !this.canUpdate() && !this.canDrag()) return false;
    const plan = planKanbanMove(
      this.lanes(),
      key,
      toColumn,
      toIndex,
      toSwimlane,
    );
    if (plan === null) return false;
    const { card } = plan;
    const event: OgeKanbanCardMovingEvent<T> = {
      card: card.source,
      fromColumn: card.column,
      toColumn,
      fromIndex: plan.fromIndex,
      toIndex: plan.toIndex,
      fromSwimlane: card.swimlane,
      toSwimlane: plan.toSwimlane,
      cancel: false,
    };
    this.cardMoving.emit(event);
    if (event.cancel) return false;
    const fromLane = this.hasSwimlanes() ? card.swimlane : null;
    const { store, moved } = commitKanbanMove(
      this.store(),
      plan,
      this.fields(),
      {
        hasSwimlanes: this.hasSwimlanes(),
        hasOrder: this.orderExpr() !== undefined,
      },
    );
    this.store.set(store);
    this.record({
      kind: 'move',
      key,
      from: { column: card.column, index: plan.fromIndex, swimlane: fromLane },
      to: { column: toColumn, index: plan.toIndex, swimlane: plan.toSwimlane },
    });
    this.cardMoved.emit({
      card: moved,
      fromColumn: card.column,
      toColumn,
      fromIndex: plan.fromIndex,
      toIndex: plan.toIndex,
      fromSwimlane: card.swimlane,
      toSwimlane: plan.toSwimlane,
    });
    if (options.announce) {
      const column = this.visibleColumns().find(
        (entry) => entry.key === toColumn,
      );
      this.announce(this.msg().announcements.cardMoved, {
        title: card.title,
        column: column !== undefined ? this.columnTitle(column) : toColumn,
        position: String(plan.toIndex + 1),
        count: String(plan.cellCards.length + 1),
      });
    }
    if (options.focus) this.focusCard({ ...card, column: toColumn });
    return true;
  }

  /* ---------------- cross-board transfer ---------------- */

  private fallbackBoardId: string | null = null;

  /** `boardId`, else a stable per-instance fallback. */
  protected resolvedBoardId(): string {
    const id = this.boardId();
    if (id !== undefined) return id;
    this.fallbackBoardId ??= nextKanbanBoardId();
    return this.fallbackBoardId;
  }

  /**
   * Sends cards to another mounted board of the same `dragGroup` (append
   * to `toColumn`, default its first droppable column). Returns whether the
   * target accepted them.
   */
  transferCards(
    keys: readonly unknown[],
    toBoard: string,
    toColumn?: string,
    toIndex?: number,
    toSwimlane?: string | null,
  ): boolean {
    const peer = this.peerBoards().find((entry) => entry.id === toBoard);
    if (peer === undefined) return false;
    const column =
      toColumn ??
      peer.columns().find((entry) => entry.allowDrop !== false)?.key;
    if (column === undefined) return false;
    return this.transferTo(peer, keys, null, {
      lane: toSwimlane ?? null,
      column,
      index: toIndex ?? Number.MAX_SAFE_INTEGER,
    });
  }

  private transferTo(
    peer: KanbanBoardPeer,
    keys: readonly unknown[],
    drag: KanbanDragState<T> | null,
    target: KanbanDragTarget,
  ): boolean {
    if (!this.canDrag() && !this.canUpdate()) return false;
    const ordered = kanbanOrderKeys(this.lanes(), keys);
    const cards: KanbanCard<T>[] = [];
    for (const key of ordered) {
      const position = findKanbanCard(this.lanes(), key);
      if (position === null) continue;
      cards.push(
        this.lanes()[position.laneIndex].columns[position.columnIndex].cards[
          position.cardIndex
        ],
      );
    }
    if (cards.length === 0) return false;
    const lead = drag?.card ?? cards[0];
    const transfer: KanbanTransfer<T> = {
      items: cards.map((card) => card.source),
      cards,
      fromBoard: this.resolvedBoardId(),
      fromColumn: lead.column,
      fromSwimlane: lead.swimlane,
      target,
    };
    const result = peer.receive(transfer as KanbanTransfer<unknown>);
    if (result === null) return false;
    const sources = new Set<T>(transfer.items);
    this.store.set(this.store().filter((entry) => !sources.has(entry)));
    this.clearSelection();
    this.cardTransferred.emit(this.transferEvent(transfer, result));
    this.announcement.set(
      this.countText(this.msg().announcements.cardsTransferred, {
        count: cards.length,
        board: result.toBoard,
        column: result.toColumn,
      }),
    );
    return true;
  }

  private transferEvent(
    transfer: KanbanTransfer<T>,
    result: KanbanTransferResult,
  ): OgeKanbanCardTransferredEvent<T> {
    return {
      cards: result.items as readonly T[],
      sourceCards: transfer.items,
      fromBoard: transfer.fromBoard,
      toBoard: result.toBoard,
      fromColumn: transfer.fromColumn,
      toColumn: result.toColumn,
      fromSwimlane: transfer.fromSwimlane,
      toSwimlane: result.toSwimlane,
      toIndex: result.toIndex,
    };
  }

  /** The incoming placeholder while a peer's drag hovers this board. */
  private readonly incomingTarget = signal<KanbanDragTarget | null>(null);
  private incomingGeometry: KanbanDragGeometry | null = null;

  /** This board as the other boards of its `dragGroup` see it. */
  private createPeer(): KanbanBoardPeer {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const board = this;
    return {
      get id() {
        return board.resolvedBoardId();
      },
      get group() {
        return board.dragGroup() ?? '';
      },
      host: this.hostEl.nativeElement,
      targetAt: (x, y) => this.incomingTargetAt(x, y),
      preview: (target) => {
        if (target === null) this.incomingGeometry = null;
        this.incomingTarget.set(target);
      },
      receive: (transfer) =>
        this.receiveTransfer(transfer as KanbanTransfer<T>),
      columns: () => this.visibleColumns(),
    };
  }

  private incomingTargetAt(x: number, y: number): KanbanDragTarget | null {
    this.incomingGeometry ??= measureKanbanDragGeometry(
      this.hostEl.nativeElement,
    );
    return resolveKanbanDragTarget(
      this.incomingGeometry,
      x,
      y,
      null,
      this.lanes(),
      this.visibleColumns(),
      this.cardHeightPx() + KANBAN_CARD_GAP,
    );
  }

  private receiveTransfer(
    transfer: KanbanTransfer<T>,
  ): KanbanTransferResult | null {
    this.incomingTarget.set(null);
    this.incomingGeometry = null;
    if (this.readOnly()) return null;
    const target = transfer.target;
    const column = this.visibleColumns().find(
      (entry) => entry.key === target.column,
    );
    if (column === undefined || column.allowDrop === false) return null;
    const lane = this.hasSwimlanes() ? target.lane : null;
    const cellCards =
      this.lanes()
        .find((entry) => entry.key === lane)
        ?.columns.find((entry) => entry.column.key === target.column)?.cards ??
      [];
    const toIndex = Math.min(target.index, cellCards.length);
    const event: OgeKanbanCardTransferringEvent<T> = {
      cards: transfer.items,
      fromBoard: transfer.fromBoard,
      toBoard: this.resolvedBoardId(),
      fromColumn: transfer.fromColumn,
      toColumn: target.column,
      fromSwimlane: transfer.fromSwimlane,
      toSwimlane: lane,
      toIndex,
      cancel: false,
    };
    this.cardTransferring.emit(event);
    if (event.cancel) return null;
    const fields = this.fields();
    const names = fields.fieldNames;
    const landed = transfer.items.map((item) => {
      let next = item;
      if (names.column !== null)
        next = withFieldValue(next, names.column, target.column);
      if (lane !== null && names.swimlane !== null) {
        next = withFieldValue(next, names.swimlane, lane);
      }
      return next;
    });
    const anchor = cellCards[toIndex]?.key ?? null;
    this.store.set([...this.store(), ...landed]);
    // position each card before the anchor, silently (one transfer, no
    // per-card move events) and outside the history — a transfer spans two
    // boards, so neither can undo it alone
    this.history.replay(() => {
      for (const item of landed) {
        const key = fields.key(item);
        const cell = this.lanes()
          .find((entry) => entry.key === lane)
          ?.columns.find((entry) => entry.column.key === target.column);
        if (cell === undefined) continue;
        const index = kanbanAnchorIndex(cell.cards, anchor, key);
        const plan = planKanbanMove(
          this.lanes(),
          key,
          target.column,
          index,
          lane,
        );
        if (plan === null) continue;
        this.store.set(
          commitKanbanMove(this.store(), plan, fields, {
            hasSwimlanes: this.hasSwimlanes(),
            hasOrder: this.orderExpr() !== undefined,
          }).store,
        );
      }
    });
    const landedKeys = landed.map((item) => fields.key(item));
    const items = landedKeys
      .map((key) => this.itemByKey(key))
      .filter((item): item is T => item !== undefined);
    const result: KanbanTransferResult = {
      items,
      toBoard: this.resolvedBoardId(),
      toColumn: target.column,
      toSwimlane: lane,
      toIndex,
    };
    this.selectCards(landedKeys);
    this.cardTransferred.emit(this.transferEvent(transfer, result));
    this.announcement.set(
      this.countText(this.msg().announcements.cardsTransferred, {
        count: items.length,
        board: result.toBoard,
        column: this.columnTitle(column),
      }),
    );
    return result;
  }

  /* ---------------- quick add + inline title + checklist ---------------- */

  /** The open quick-add composer's cell key (`lane column`), or `null`. */
  protected readonly quickAddCell = signal<string | null>(null);
  protected readonly quickAddText = signal('');

  protected isQuickAddOpen(lane: string | null, column: string): boolean {
    return this.quickAddCell() === kanbanCellKey(lane, column);
  }

  /** The column footer's add button: the composer, or the dialog without `quickAdd`. */
  protected onFooterAdd(column: KanbanColumnDef, lane: string | null): void {
    if (!this.quickAdd()) {
      this.openNewCard(column.key, lane);
      return;
    }
    this.quickAddText.set('');
    this.quickAddCell.set(kanbanCellKey(lane, column.key));
    setTimeout(() =>
      this.hostEl.nativeElement
        .querySelector<HTMLInputElement>('.oge-kanban-quick-add-input')
        ?.focus(),
    );
  }

  protected onQuickAddInput(event: Event): void {
    this.quickAddText.set((event.target as HTMLInputElement).value);
  }

  protected onQuickAddKeydown(
    event: KeyboardEvent,
    column: KanbanColumnDef,
    lane: string | null,
  ): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitQuickAdd(column, lane, true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.closeQuickAdd(column, lane);
    }
  }

  protected onQuickAddBlur(column: KanbanColumnDef, lane: string | null): void {
    if (!this.isQuickAddOpen(lane, column.key)) return;
    this.commitQuickAdd(column, lane, false);
  }

  private commitQuickAdd(
    column: KanbanColumnDef,
    lane: string | null,
    keepOpen: boolean,
  ): void {
    const item = kanbanQuickAddItem<T>(
      this.quickAddText(),
      column.key,
      this.hasSwimlanes() ? lane : null,
      this.fields(),
      ++this.newKeyCounter,
    );
    if (item !== null) {
      this.insertItem(item, column.key, this.hasSwimlanes() ? lane : null);
    }
    this.quickAddText.set('');
    if (!keepOpen || item === null) this.quickAddCell.set(null);
    else {
      setTimeout(() =>
        this.hostEl.nativeElement
          .querySelector<HTMLInputElement>('.oge-kanban-quick-add-input')
          ?.focus(),
      );
    }
  }

  private closeQuickAdd(column: KanbanColumnDef, lane: string | null): void {
    this.quickAddCell.set(null);
    this.quickAddText.set('');
    setTimeout(() =>
      this.hostEl.nativeElement
        .querySelector<HTMLElement>(
          `.oge-kanban-cards[data-lane="${kanbanCssEscape(lane ?? '')}"][data-col="${kanbanCssEscape(column.key)}"] ~ .oge-kanban-add-card`,
        )
        ?.focus(),
    );
  }

  /** The card whose title is being edited inline, or `null`. */
  protected readonly editingTitleKey = signal<unknown>(null);

  /** Starts inline title editing on a card (F2; double-click with `inlineTitleEditing`). */
  startTitleEdit(key: unknown): void {
    if (!this.canUpdate() || !canEditKanbanTitle(this.fields())) return;
    if (findKanbanCard(this.lanes(), key) === null) return;
    this.editingTitleKey.set(key);
    setTimeout(() => {
      const input = this.hostEl.nativeElement.querySelector<HTMLInputElement>(
        '.oge-kanban-card-title-input',
      );
      input?.focus();
      input?.select();
    });
  }

  protected onTitleEditKeydown(
    event: KeyboardEvent,
    card: KanbanCard<T>,
  ): void {
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitTitleEdit(card, (event.target as HTMLInputElement).value);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.editingTitleKey.set(null);
      this.pendingFocusKey.set(this.keyOf(card));
    }
  }

  protected onTitleEditBlur(event: FocusEvent, card: KanbanCard<T>): void {
    if (this.editingTitleKey() !== card.key) return;
    this.commitTitleEdit(card, (event.target as HTMLInputElement).value, false);
  }

  private commitTitleEdit(
    card: KanbanCard<T>,
    value: string,
    refocus = true,
  ): void {
    this.editingTitleKey.set(null);
    const updated = kanbanTitleUpdate(card, value, this.fields());
    if (updated !== null) this.updateItem(card.source, updated);
    if (refocus) this.pendingFocusKey.set(this.keyOf(card));
  }

  /** Toggles checklist entry `index` of a card through `cardUpdating`. */
  toggleChecklistItem(key: unknown, index: number): void {
    const position = findKanbanCard(this.lanes(), key);
    const item =
      position === null
        ? undefined
        : this.lanes()[position.laneIndex].columns[position.columnIndex].cards[
            position.cardIndex
          ];
    const card = item ?? this.allCards().find((entry) => entry.key === key);
    if (card === undefined) return;
    const updated = kanbanChecklistToggle(card, index, this.fields());
    if (updated !== null) this.updateItem(card.source, updated);
  }

  /* ---------------- export ---------------- */

  /**
   * The cards as export rows in board order (`visibleOnly`: only what the
   * filters and search show) — what `/export-excel` and `exportToCsv` read.
   */
  getExportData(options: OgeKanbanExportOptions = {}): OgeKanbanExportData {
    const lanes = options.visibleOnly
      ? this.lanes()
      : sortKanbanLanes(
          groupBoard(
            this.allCards(),
            this.visibleColumns(),
            this.hasSwimlanes(),
          ),
          this.columnSort(),
          this.effectiveLocale(),
          this.priorityOrder(),
        );
    return {
      rows: buildKanbanExportRows(lanes, this.visibleColumns()),
      messages: this.msg().export,
      locale: this.effectiveLocale(),
      hasSwimlanes: this.hasSwimlanes(),
    };
  }

  /** Builds the CSV (formula-guarded) and downloads it; returns the text. */
  exportToCsv(
    fileName = 'kanban.csv',
    options: OgeKanbanExportOptions = {},
  ): string {
    const csv = buildKanbanCsv(this.getExportData(options));
    downloadKanbanText(csv, fileName);
    return csv;
  }

  /* ---------------- board keys (history) ---------------- */

  protected onHostKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || isKanbanEditingTarget(event.target)) return;
    const shortcut = kanbanHistoryShortcut(event);
    if (shortcut === null || this.undoLimit() === 0) return;
    event.preventDefault();
    if (shortcut === 'undo') this.undo();
    else this.redo();
  }
  protected onEditorCancelled(): void {
    this.editedSource = null;
    this.cardEditDialogHidden.emit();
  }

  /* ---------------- announcements ---------------- */

  protected readonly announcement = signal('');

  private announce(
    template: string,
    tokens: Readonly<Record<string, string>>,
  ): void {
    this.announcement.set(formatKanbanMessage(template, tokens));
  }
}
