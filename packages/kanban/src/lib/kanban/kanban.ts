import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
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
import { OGE_KANBAN_CONFIG } from '../config';
import {
  deriveColumns,
  filterCards,
  groupBoard,
  normalizeCards,
  orderBetween,
  orderColumns,
  renumberPatches,
  resolveKanbanFields,
  toKanbanAccessor,
  withFieldValue,
  type KanbanCard,
  type KanbanColumnDef,
  type KanbanFieldExprs,
  type KanbanSwimlane,
} from '../engine/board-model';
import {
  columnReorderIndex,
  edgeScrollVelocity,
  hitTestCell,
  insertionIndexAt,
  type KanbanCellRect,
} from '../engine/drag-math';
import {
  computeColumnWindow,
  type KanbanColumnWindow,
} from '../engine/virtual-column';
import { beginKanbanGesture } from './kanban-gesture';
import { wipState, type KanbanWipState } from '../engine/wip';
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
  OgeKanbanEditDialogShowingEvent,
  OgeKanbanFieldExpr,
} from '../kanban-types';
import type { OgeKanbanMessages } from '../config';
import {
  OgeKanbanCardDialog,
  type KanbanEditorModel,
  type KanbanEditorResult,
} from './kanban-card-dialog';
import {
  OgeKanbanCardTemplate,
  OgeKanbanColumnHeaderTemplate,
} from './kanban-templates';

/** Vertical gap between cards (must match the SCSS slot math). */
const CARD_GAP = 8;

/** Fallback cell viewport before the first measurement lands. */
const DEFAULT_CELL_HEIGHT = 600;

/** `CSS.escape` with a jsdom-safe fallback for attribute selectors. */
function cssEscape(value: string): string {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(value)
    : value.replace(/["\\]/g, '\\$&');
}

interface KanbanMenuState {
  readonly x: number;
  readonly y: number;
  readonly card: KanbanCard | null;
  readonly column: KanbanColumnDef | null;
  readonly swimlane: string | null;
}

interface KanbanDragState<T = unknown> {
  readonly card: KanbanCard<T>;
  readonly column: KanbanColumnDef;
  readonly fromLane: string | null;
  readonly fromIndex: number;
  /** Card box size, so the lifted preview matches the original. */
  readonly width: number;
  readonly height: number;
  /** Pointer offset within the card at grab time. */
  readonly grabX: number;
  readonly grabY: number;
  /** Current pointer position (viewport). */
  readonly x: number;
  readonly y: number;
  readonly target: {
    readonly lane: string | null;
    readonly column: string;
    readonly index: number;
  } | null;
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
    '[style.--oge-kanban-slot.px]': 'cardHeightPx() + 8',
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
            {{ msg().board.noSearchResults }}
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
              <button
                type="button"
                class="oge-kanban-lane-header"
                (click)="toggleSwimlane(lane.key)"
                [attr.aria-expanded]="!isSwimlaneCollapsed(lane.key)"
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
                <span class="oge-kanban-count">{{ lane.count }}</span>
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
                      <div
                        class="oge-kanban-cards"
                        role="listbox"
                        [attr.aria-label]="
                          cellLabel(cell.column, cell.cards.length)
                        "
                        [attr.data-lane]="lane.key ?? ''"
                        [attr.data-col]="cell.column.key"
                        (scroll)="
                          onCellScroll($event, lane.key, cell.column.key)
                        "
                      >
                        @if (cell.cards.length === 0) {
                          <!-- decorative: the listbox label already carries the zero count -->
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
                                  class="oge-kanban-card"
                                  role="option"
                                  [tabindex]="isCardFocusable(card) ? 0 : -1"
                                  [attr.data-key]="keyOf(card)"
                                  [attr.aria-selected]="
                                    selectedCardKey() === card.key
                                  "
                                  [attr.aria-keyshortcuts]="cardShortcuts()"
                                  [class.oge-kanban-card-selected]="
                                    selectedCardKey() === card.key
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
                                  <ng-container
                                    [ngTemplateOutlet]="cardBody"
                                    [ngTemplateOutletContext]="{
                                      $implicit: card,
                                      column: cell.column,
                                      swimlane: lane.key,
                                    }"
                                  />
                                </div>
                              }
                            </div>
                          </div>
                        }
                      </div>
                      @if (canAddTo(cell.column)) {
                        <button
                          type="button"
                          class="oge-kanban-add-card"
                          (click)="openNewCard(cell.column.key, lane.key)"
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
              <span class="oge-kanban-card-actions" aria-hidden="true">
                @if (canUpdate()) {
                  <span
                    class="oge-kanban-card-action oge-kanban-card-action-edit"
                  >
                    <svg viewBox="0 0 16 16" width="13" height="13">
                      <path
                        d="m11.3 2.7 2 2L6 12l-2.6.6L4 10z"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.4"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </span>
                }
                @if (canDelete()) {
                  <span
                    class="oge-kanban-card-action oge-kanban-card-action-delete"
                  >
                    <svg viewBox="0 0 16 16" width="13" height="13">
                      <path
                        d="M3.5 5h9M6.5 5V3.8h3V5m-5 0 .5 7.4h6L11.5 5"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </span>
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
      >
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
   * Replaces the edit dialog's default form wholesale (generic
   * `OgeFormItemData[]`); `cardEditDialogShowing` can still adjust per open.
   */
  readonly dialogItems = input<readonly OgeFormItemData[] | undefined>(
    undefined,
  );

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
  protected readonly msg = computed<OgeKanbanMessages>(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  /** Per-instance locale, falling back to the DI config, then the browser. */
  protected readonly effectiveLocale = computed(
    () => this.locale() ?? this.config.locale,
  );

  protected readonly cardHeightPx = computed(
    () => this.cardHeight() ?? this.config.cardHeight ?? 112,
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
    const parts: string[] = [];
    if (this.canUpdate()) parts.push('Enter');
    if (this.canDelete()) parts.push('Delete');
    if (this.canDrag()) parts.push('Control+ArrowLeft Control+ArrowRight');
    return parts.length > 0 ? parts.join(' ') : null;
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
    };
    return resolveKanbanFields(exprs);
  });

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
    afterRenderEffect(() => {
      this.lanes(); // re-measure when the board reshapes
      this.measureCells();
      this.resizeObserver?.observe(this.hostEl.nativeElement);
      const pending = this.pendingFocusKey();
      if (pending !== null) {
        this.pendingFocusKey.set(null);
        const el = this.hostEl.nativeElement.querySelector<HTMLElement>(
          `.oge-kanban-card[data-key="${cssEscape(pending)}"]`,
        );
        el?.focus();
      }
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

  private readonly visibleCards = computed(() =>
    filterCards(
      this.allCards(),
      this.searchQuery(),
      this.extraSearchAccessors(),
    ),
  );

  protected readonly noSearchResults = computed(
    () =>
      this.searchQuery().trim() !== '' &&
      this.visibleCards().length === 0 &&
      this.totalCount() > 0,
  );

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
      const declared = this.columns();
      let base: KanbanColumnDef[];
      if (declared !== undefined && declared.length > 0) {
        base = [...declared];
      } else {
        const seen = new Map(
          this.seenDerivedColumns().map((column) => [column.key, column]),
        );
        for (const column of deriveColumns(undefined, this.allCards())) {
          if (!seen.has(column.key)) seen.set(column.key, column);
        }
        base = [...seen.values()];
        // remember for the next data change (write outside the computed)
        if (base.length !== this.seenDerivedColumns().length) {
          queueMicrotask(() => this.seenDerivedColumns.set(base));
        }
      }
      const keys = new Set(base.map((column) => column.key));
      for (const column of this.runtimeColumns()) {
        if (!keys.has(column.key)) base.push(column);
      }
      // a header drag previews its order live; the model commits on drop
      const preview = this.dragColumnOrder();
      const order = this.columnOrder();
      return orderColumns(
        base,
        preview ?? (order.length > 0 ? order : undefined),
      );
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
    const name = this.addColumnName().trim();
    if (name === '') {
      this.cancelAddColumn();
      return;
    }
    if (this.visibleColumns().some((column) => column.key === name)) {
      this.cancelAddColumn();
      return;
    }
    const column: KanbanColumnDef = { key: name, title: name };
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
    groupBoard(this.visibleCards(), this.visibleColumns(), this.hasSwimlanes()),
  );

  /** Card counts per column across all lanes (unfiltered — WIP is a data fact). */
  private readonly columnCounts = computed<ReadonlyMap<string, number>>(() => {
    const counts = new Map<string, number>();
    for (const card of this.allCards()) {
      counts.set(card.column, (counts.get(card.column) ?? 0) + 1);
    }
    return counts;
  });

  protected readonly totalCount = computed(() => this.allCards().length);

  protected readonly gridTemplate = computed(() => {
    const width = `${this.columnWidth()}px`;
    const tracks = this.visibleColumns().map((column) =>
      this.collapsedColumns().includes(column.key) ? '44px' : width,
    );
    // fixed tracks keep headers legible — the board scrolls horizontally
    if (this.canAddColumn()) tracks.push(width);
    return tracks.join(' ');
  });

  // ---------------- virtualization ----------------

  /** Per-cell scroll state, keyed `lane column`. */
  private readonly cellState = signal(
    new Map<string, { top: number; height: number }>(),
  );

  private cellKey(lane: string | null, column: string): string {
    return `${lane ?? ''} ${column}`;
  }

  protected windowFor(
    lane: string | null,
    column: string,
    count: number,
  ): KanbanColumnWindow {
    if (!this.virtualScrolling()) {
      const cardHeight = this.cardHeightPx();
      return {
        start: 0,
        end: count,
        offsetY: 0,
        totalHeight: count * (cardHeight + CARD_GAP) - CARD_GAP,
      };
    }
    const state = this.cellState().get(this.cellKey(lane, column));
    // an unmeasured (or jsdom zero-height) cell windows over the fallback
    // height instead of rendering everything
    const height =
      state !== undefined && state.height > 0
        ? state.height
        : DEFAULT_CELL_HEIGHT;
    return computeColumnWindow(
      state?.top ?? 0,
      height,
      count,
      this.cardHeightPx(),
      CARD_GAP,
    );
  }

  protected onCellScroll(
    event: Event,
    lane: string | null,
    column: string,
  ): void {
    const el = event.target as HTMLElement;
    const next = new Map(this.cellState());
    next.set(this.cellKey(lane, column), {
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
    const cells =
      this.hostEl.nativeElement.querySelectorAll<HTMLElement>(
        '.oge-kanban-cards',
      );
    const next = new Map(this.cellState());
    let changed = false;
    for (const el of Array.from(cells)) {
      const key = this.cellKey(
        el.dataset['lane'] === '' ? null : (el.dataset['lane'] ?? null),
        el.dataset['col'] ?? '',
      );
      const prev = next.get(key);
      if (prev?.height !== el.clientHeight) {
        next.set(key, { top: el.scrollTop, height: el.clientHeight });
        changed = true;
      }
    }
    if (changed) this.cellState.set(next);
  }

  // ---------------- collapse ----------------

  protected isColumnCollapsed(key: string): boolean {
    return this.collapsedColumns().includes(key);
  }

  protected toggleColumn(key: string): void {
    const collapsed = this.collapsedColumns();
    this.collapsedColumns.set(
      collapsed.includes(key)
        ? collapsed.filter((entry) => entry !== key)
        : [...collapsed, key],
    );
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
    const collapsed = this.collapsedSwimlanes();
    this.collapsedSwimlanes.set(
      collapsed.includes(key)
        ? collapsed.filter((entry) => entry !== key)
        : [...collapsed, key],
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
    return column.title ?? column.key;
  }

  protected columnCount(key: string): number {
    return this.columnCounts().get(key) ?? 0;
  }

  protected columnWip(column: KanbanColumnDef): KanbanWipState {
    return wipState(
      this.columnCount(column.key),
      column.wipLimit,
      column.minCount,
    );
  }

  /**
   * Whether an interactive move (drag, keyboard, menu) may land a card from
   * `fromKey` in `toKey`: the source must allow dragging out, the target
   * must allow dropping in, and the source's `transitionColumns` (when set)
   * must list the target. Programmatic `moveCard` is deliberately not
   * gated — the app owns its own rules there.
   */
  protected isLegalTarget(fromKey: string, toKey: string): boolean {
    if (fromKey === toKey) return true;
    const columns = this.visibleColumns();
    const from = columns.find((entry) => entry.key === fromKey);
    const to = columns.find((entry) => entry.key === toKey);
    if (to === undefined || to.allowDrop === false) return false;
    if (
      from?.transitionColumns !== undefined &&
      !from.transitionColumns.includes(toKey)
    ) {
      return false;
    }
    return true;
  }

  protected cellLabel(column: KanbanColumnDef, count: number): string {
    const wip = this.columnWip(column);
    const board = this.msg().board;
    return wip.limit !== null
      ? this.format(board.columnLabelWip, {
          title: this.columnTitle(column),
          count: String(count),
          limit: String(wip.limit),
        })
      : this.format(board.columnLabel, {
          title: this.columnTitle(column),
          count: String(count),
        });
  }

  protected cardLabel(card: KanbanCard<T>): string {
    const column = this.visibleColumns().find(
      (entry) => entry.key === card.column,
    );
    return this.format(this.msg().board.cardLabel, {
      title: card.title,
      column: column !== undefined ? this.columnTitle(column) : card.column,
    });
  }

  protected format(
    template: string,
    tokens: Readonly<Record<string, string>>,
  ): string {
    let text = template;
    for (const [token, value] of Object.entries(tokens)) {
      text = text.replace(`{${token}}`, value);
    }
    return text;
  }

  protected initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
    return (first + last).toUpperCase();
  }

  protected isOverdue(due: Date): boolean {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return due.getTime() < today.getTime();
  }

  protected formatDue(due: Date): string {
    return new Intl.DateTimeFormat(this.effectiveLocale(), {
      month: 'short',
      day: 'numeric',
    }).format(due);
  }

  protected keyOf(card: KanbanCard<T>): string {
    return String(card.key);
  }

  // ---------------- focus & keyboard ----------------

  private readonly focusedCardKey = signal<unknown>(null);
  private readonly pendingFocusKey = signal<string | null>(null);

  /**
   * One tab stop per column cell (each listbox is its own composite widget,
   * per the APG); the focused card replaces its own cell's default stop.
   * This is also what keeps every scrollable cell keyboard-reachable.
   */
  private readonly focusableKeys = computed<ReadonlySet<unknown>>(() => {
    const keys = new Set<unknown>();
    const focused = this.focusedCardKey();
    for (const lane of this.lanes()) {
      for (const cell of lane.columns) {
        if (cell.cards.length === 0) continue;
        const focusedHere =
          focused !== null && cell.cards.some((card) => card.key === focused);
        keys.add(focusedHere ? focused : cell.cards[0].key);
      }
    }
    return keys;
  });

  protected isCardFocusable(card: KanbanCard<T>): boolean {
    return this.focusableKeys().has(card.key);
  }

  protected onCardClick(card: KanbanCard<T>, event: MouseEvent): void {
    // hover quick actions resolve from the aria-hidden spans (composite
    // roles cannot host focusable children)
    const action = (event.target as HTMLElement).closest(
      '.oge-kanban-card-action',
    );
    this.selectedCardKey.set(card.key);
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
    this.cardDblClick.emit({ card, event });
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

  protected onCardKeydown(event: KeyboardEvent, card: KanbanCard<T>): void {
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
    if (event.key === 'Delete') {
      if (this.canDelete()) {
        event.preventDefault();
        this.deleteItem(card.source);
      }
      return;
    }
    const position = this.findCard(card.key);
    if (position === null) return;
    const { laneIndex, columnIndex, cardIndex } = position;
    const lanes = this.lanes();
    const lane = lanes[laneIndex];
    let target: KanbanCard<T> | undefined;
    switch (event.key) {
      case 'ArrowDown':
        target = lane.columns[columnIndex].cards[cardIndex + 1];
        break;
      case 'ArrowUp':
        target = lane.columns[columnIndex].cards[cardIndex - 1];
        break;
      case 'ArrowRight':
        target = this.firstCardFrom(lane, columnIndex + 1, +1);
        break;
      case 'ArrowLeft':
        target = this.firstCardFrom(lane, columnIndex - 1, -1);
        break;
      case 'Home':
        target = lane.columns[columnIndex].cards[0];
        break;
      case 'End': {
        const cards = lane.columns[columnIndex].cards;
        target = cards[cards.length - 1];
        break;
      }
      default:
        return;
    }
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
    const position = this.findCard(card.key);
    if (position === null) return;
    const lane = this.lanes()[position.laneIndex];
    const cellCards = lane.columns[position.columnIndex].cards;
    switch (event.key) {
      case 'ArrowUp':
        if (position.cardIndex === 0) break;
        event.preventDefault();
        this.moveCard(card.key, card.column, position.cardIndex - 1);
        break;
      case 'ArrowDown':
        if (position.cardIndex >= cellCards.length - 1) break;
        event.preventDefault();
        this.moveCard(card.key, card.column, position.cardIndex + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowRight': {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        let columnIndex = position.columnIndex + step;
        while (
          columnIndex >= 0 &&
          columnIndex < lane.columns.length &&
          (this.isColumnCollapsed(lane.columns[columnIndex].column.key) ||
            !this.isLegalTarget(
              card.column,
              lane.columns[columnIndex].column.key,
            ))
        ) {
          columnIndex += step;
        }
        if (columnIndex < 0 || columnIndex >= lane.columns.length) break;
        event.preventDefault();
        const target = lane.columns[columnIndex];
        this.moveCard(
          card.key,
          target.column.key,
          Math.min(position.cardIndex, target.cards.length),
        );
        break;
      }
    }
  }

  private firstCardFrom(
    lane: KanbanSwimlane<T>,
    start: number,
    step: 1 | -1,
  ): KanbanCard<T> | undefined {
    for (let i = start; i >= 0 && i < lane.columns.length; i += step) {
      if (this.isColumnCollapsed(lane.columns[i].column.key)) continue;
      const cards = lane.columns[i].cards;
      if (cards.length > 0) return cards[0];
    }
    return undefined;
  }

  private findCard(
    key: unknown,
  ): { laneIndex: number; columnIndex: number; cardIndex: number } | null {
    const lanes = this.lanes();
    for (let laneIndex = 0; laneIndex < lanes.length; laneIndex++) {
      const columns = lanes[laneIndex].columns;
      for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
        const cardIndex = columns[columnIndex].cards.findIndex(
          (card) => card.key === key,
        );
        if (cardIndex >= 0) return { laneIndex, columnIndex, cardIndex };
      }
    }
    return null;
  }

  private focusCard(card: KanbanCard<T>): void {
    this.focusedCardKey.set(card.key);
    this.selectedCardKey.set(card.key);
    this.scrollCardIntoView(card);
    this.pendingFocusKey.set(this.keyOf(card));
  }

  /** Adjusts the cell's scrollTop so a virtualized target renders and shows. */
  private scrollCardIntoView(card: KanbanCard<T>): void {
    if (!this.virtualScrolling()) return;
    const position = this.findCard(card.key);
    if (position === null) return;
    const lane = this.lanes()[position.laneIndex];
    const key = this.cellKey(lane.key, card.column);
    const state = this.cellState().get(key);
    if (state === undefined) return;
    const slot = this.cardHeightPx() + CARD_GAP;
    const cardTop = position.cardIndex * slot;
    const cardBottom = cardTop + this.cardHeightPx();
    let top = state.top;
    if (cardTop < top) top = cardTop;
    else if (cardBottom > top + state.height) top = cardBottom - state.height;
    if (top !== state.top) {
      const next = new Map(this.cellState());
      next.set(key, { ...state, top });
      this.cellState.set(next);
      const el = this.hostEl.nativeElement.querySelector<HTMLElement>(
        `.oge-kanban-cards[data-lane="${cssEscape(lane.key ?? '')}"][data-col="${cssEscape(card.column)}"]`,
      );
      if (el !== null) el.scrollTop = top;
    }
  }

  /* ---------------- drag & drop ---------------- */

  protected readonly drag = signal<KanbanDragState<T> | null>(null);
  /** Live column-order preview while a header drag is in flight. */
  private readonly dragColumnOrder = signal<readonly string[] | null>(null);
  /** The header being dragged (styling hook). */
  protected readonly draggedColumnKey = signal<string | null>(null);

  private dragCells: KanbanCellRect[] = [];
  private dragCellEls: HTMLElement[] = [];
  private dragBodyEl: HTMLElement | null = null;
  private dragStartScrollLeft = 0;
  private dragStartScrollTop = 0;
  private dragRafId: number | null = null;

  protected isDraggedCard(card: KanbanCard<T>): boolean {
    return this.drag()?.card.key === card.key;
  }

  /** The placeholder slot for a cell, or `null` when it is not the target. */
  protected dropIndexFor(lane: string | null, column: string): number | null {
    const target = this.drag()?.target;
    if (
      target === null ||
      target === undefined ||
      target.lane !== lane ||
      target.column !== column
    ) {
      return null;
    }
    return target.index;
  }

  /**
   * Whether a rendered card slides down to open the placeholder gap. The
   * comparison runs in "display" coordinates — the dragged card has left
   * the flow, so cards after it in the same cell sit one slot earlier.
   */
  protected isShifted(
    lane: string | null,
    columnKey: string,
    absoluteIndex: number,
    card: KanbanCard<T>,
  ): boolean {
    const state = this.drag();
    const target = state?.target;
    if (
      state === null ||
      target === null ||
      target === undefined ||
      target.lane !== lane ||
      target.column !== columnKey ||
      this.isDraggedCard(card)
    ) {
      return false;
    }
    let displayIndex = absoluteIndex;
    if (
      state.fromLane === lane &&
      state.card.column === columnKey &&
      state.fromIndex < absoluteIndex
    ) {
      displayIndex -= 1;
    }
    return displayIndex >= target.index;
  }

  protected onCardPointerDown(
    event: PointerEvent,
    card: KanbanCard<T>,
    column: KanbanColumnDef,
    lane: string | null,
  ): void {
    if (!this.canDrag() || event.button !== 0) return;
    if (column.allowDrag === false) return;
    if (
      (event.target as HTMLElement).closest('.oge-kanban-card-action') !== null
    ) {
      return;
    }
    const position = this.findCard(card.key);
    if (position === null) return;
    const cardEl = event.currentTarget as HTMLElement;
    const rect = cardEl.getBoundingClientRect();
    this.measureDragGeometry();
    this.selectedCardKey.set(card.key);
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
          this.drag.set({
            ...pending,
            x: moveEvent.clientX,
            y: moveEvent.clientY,
            target:
              this.resolveDragTarget(
                moveEvent.clientX,
                moveEvent.clientY,
                pending,
              ) ?? pending.target,
          });
          this.startAutoScroll();
          return;
        }
        this.drag.set({
          ...current,
          x: moveEvent.clientX,
          y: moveEvent.clientY,
          target:
            this.resolveDragTarget(moveEvent.clientX, moveEvent.clientY) ??
            current.target,
        });
      },
      onFinish: (commit, cancelled) => {
        this.stopAutoScroll();
        const state = this.drag();
        this.drag.set(null);
        if (state === null) return;
        if (cancelled) {
          this.announcement.set(this.msg().announcements.cancelled);
          return;
        }
        if (commit && state.target !== null) {
          this.moveCard(
            state.card.key,
            state.target.column,
            state.target.index,
            state.target.lane,
          );
        }
      },
    });
  }

  /** Measures every droppable cell once at drag start (rects stay static). */
  private measureDragGeometry(): void {
    const host = this.hostEl.nativeElement;
    this.dragBodyEl = host.querySelector<HTMLElement>('.oge-kanban-body');
    this.dragStartScrollLeft = this.dragBodyEl?.scrollLeft ?? 0;
    this.dragStartScrollTop = this.dragBodyEl?.scrollTop ?? 0;
    this.dragCellEls = Array.from(
      host.querySelectorAll<HTMLElement>('.oge-kanban-cards'),
    );
    this.dragCells = this.dragCellEls.map((el) => {
      const rect = el.getBoundingClientRect();
      const inner = el.querySelector<HTMLElement>('.oge-kanban-cards-inner');
      const contentTop =
        inner !== null
          ? inner.getBoundingClientRect().top + el.scrollTop
          : rect.top;
      return {
        swimlane:
          el.dataset['lane'] === '' ? null : (el.dataset['lane'] ?? null),
        column: el.dataset['col'] ?? '',
        rect: {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
        },
        contentTop,
      };
    });
  }

  /** Pointer → (lane, column, insertion index), in start-frame coordinates. */
  private resolveDragTarget(
    clientX: number,
    clientY: number,
    pending?: KanbanDragState<T>,
  ): { lane: string | null; column: string; index: number } | null {
    const state = pending ?? this.drag();
    if (state === null) return null;
    const scrollDX =
      (this.dragBodyEl?.scrollLeft ?? 0) - this.dragStartScrollLeft;
    const scrollDY =
      (this.dragBodyEl?.scrollTop ?? 0) - this.dragStartScrollTop;
    const x = clientX + scrollDX;
    const y = clientY + scrollDY;
    const cellIndex = hitTestCell(x, y, this.dragCells);
    if (cellIndex < 0) return null;
    const cell = this.dragCells[cellIndex];
    if (!this.isLegalTarget(state.card.column, cell.column)) return null;
    const el = this.dragCellEls[cellIndex];
    const lane = this.lanes().find((entry) => entry.key === cell.swimlane);
    const cards =
      lane?.columns.find((entry) => entry.column.key === cell.column)?.cards ??
      [];
    const sameCell =
      cell.swimlane === state.fromLane && cell.column === state.card.column;
    const index = insertionIndexAt(
      y,
      cell,
      el.scrollTop,
      this.cardHeightPx() + CARD_GAP,
      cards.length,
      sameCell ? state.fromIndex : -1,
    );
    return { lane: cell.swimlane, column: cell.column, index };
  }

  /**
   * Edge auto-scroll: an rAF loop (independent of pointer events, so the
   * board keeps scrolling while the pointer rests at an edge) that scrolls
   * the hovered cell vertically and the board horizontally, then re-runs
   * the hit-test at the resting pointer position.
   */
  private startAutoScroll(): void {
    if (typeof requestAnimationFrame !== 'function') return;
    const tick = (): void => {
      const state = this.drag();
      if (state === null) {
        this.dragRafId = null;
        return;
      }
      let scrolled = false;
      const body = this.dragBodyEl;
      if (body !== null) {
        const bodyRect = body.getBoundingClientRect();
        const vx = edgeScrollVelocity(state.x, bodyRect.left, bodyRect.right);
        if (vx !== 0) {
          const before = body.scrollLeft;
          body.scrollLeft += vx;
          scrolled = scrolled || body.scrollLeft !== before;
        }
      }
      const target = state.target;
      if (target !== null) {
        const cellIndex = this.dragCells.findIndex(
          (cell) =>
            cell.swimlane === target.lane && cell.column === target.column,
        );
        const el = this.dragCellEls[cellIndex];
        if (el !== undefined) {
          const rect = this.dragCells[cellIndex].rect;
          const vy = edgeScrollVelocity(state.y, rect.top, rect.bottom);
          if (vy !== 0) {
            const before = el.scrollTop;
            el.scrollTop += vy;
            scrolled = scrolled || el.scrollTop !== before;
          }
        }
      }
      if (scrolled) {
        const next = this.resolveDragTarget(state.x, state.y);
        if (next !== null) this.drag.set({ ...state, target: next });
      }
      this.dragRafId = requestAnimationFrame(tick);
    };
    this.dragRafId = requestAnimationFrame(tick);
  }

  private stopAutoScroll(): void {
    if (this.dragRafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.dragRafId);
    }
    this.dragRafId = null;
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
    const headers = Array.from(
      this.hostEl.nativeElement.querySelectorAll<HTMLElement>(
        '.oge-kanban-header-row > *',
      ),
    );
    const centers = headers.map((el) => {
      const rect = el.getBoundingClientRect();
      return (rect.left + rect.right) / 2;
    });
    const baseOrder = columns.map((entry) => entry.key);
    this.draggedColumnKey.set(column.key);
    beginKanbanGesture(event, {
      onMove: (_dx, _dy, moveEvent) => {
        const toIndex = columnReorderIndex(
          moveEvent.clientX,
          centers,
          fromIndex,
        );
        const next = [...baseOrder];
        next.splice(fromIndex, 1);
        next.splice(toIndex, 0, column.key);
        this.dragColumnOrder.set(next);
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
    this.selectedCardKey.set(card.key);
    this.focusedCardKey.set(card.key);
    this.openMenu(event, card, null);
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
    const available =
      card !== null
        ? this.canUpdate() || this.canDelete()
        : column !== null && (this.canAddTo(column) || true);
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
    setTimeout(() => {
      this.hostEl.nativeElement
        .querySelector<HTMLElement>('.oge-kanban-menu-item:not(:disabled)')
        ?.focus();
    });
  }

  protected closeMenu(): void {
    this.menu.set(null);
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
    const items = Array.from(
      this.hostEl.nativeElement.querySelectorAll<HTMLButtonElement>(
        '.oge-kanban-menu-item:not(:disabled)',
      ),
    );
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === 'ArrowDown'
        ? items[(index + 1) % items.length]
        : items[(index - 1 + items.length) % items.length];
    next?.focus();
  }

  /** Move-to targets: every other legal visible column (a menu of real moves). */
  protected moveTargets(menu: KanbanMenuState): readonly KanbanColumnDef[] {
    const card = menu.card;
    if (card === null || !this.canUpdate()) return [];
    return this.visibleColumns().filter(
      (column) =>
        column.key !== card.column &&
        this.isLegalTarget(card.column, column.key),
    );
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
  protected readonly editorChoices = computed(() => {
    const cards = this.allCards();
    const distinct = (values: readonly string[]): readonly string[] =>
      Array.from(new Set(values));
    return {
      columns: this.visibleColumns().map((column) => ({
        value: column.key,
        text: this.columnTitle(column),
      })),
      swimlanes: this.hasSwimlanes()
        ? distinct(
            cards
              .map((card) => card.swimlane)
              .filter((lane): lane is string => lane !== null),
          )
        : [],
      tags: distinct(cards.flatMap((card) => [...card.tags])),
      assignees: distinct(cards.flatMap((card) => [...card.assignees])),
      priorities: distinct(
        cards
          .map((card) => card.priority)
          .filter((priority): priority is string => priority !== null),
      ),
      hasSwimlanes: this.hasSwimlanes(),
      hasTags: this.tagsExpr() !== undefined,
      hasAssignees: this.assigneeExpr() !== undefined,
      hasDueDate: this.dueDateExpr() !== undefined,
      hasPriority: this.priorityExpr() !== undefined,
      // description/color have default field names — writable unless the
      // expr was replaced by a getter function (no write-back name)
      hasDescription: this.fields().fieldNames.description !== null,
      hasColor: this.fields().fieldNames.color !== null,
    };
  });

  /** The source item being edited; `null` while creating. */
  private editedSource: T | null = null;

  private editorModelFrom(card: KanbanCard<T>): KanbanEditorModel {
    return {
      title: card.title,
      description: card.description ?? '',
      column: card.column,
      swimlane: card.swimlane,
      color: card.color,
      tags: [...card.tags],
      assignees: [...card.assignees],
      dueDate: card.dueDate,
      priority: card.priority,
    };
  }

  private newEditorModel(
    column: string,
    swimlane: string | null,
  ): KanbanEditorModel {
    return {
      title: '',
      description: '',
      column,
      swimlane,
      color: undefined,
      tags: [],
      assignees: [],
      dueDate: null,
      priority: null,
    };
  }

  /** Session-unique keys for created cards whose data has no key yet. */
  private newKeyCounter = 0;

  /**
   * Writes the editor model onto `base` through the write-back field names.
   * Function exprs have no field name — those fields are skipped.
   */
  private buildItem(model: KanbanEditorModel, base: T): T {
    const names = this.fields().fieldNames;
    let item = base;
    const write = (name: string | null, value: unknown): void => {
      if (name !== null) item = withFieldValue(item, name, value);
    };
    write(names.title, model.title);
    write(names.description, model.description);
    write(names.column, model.column);
    if (this.hasSwimlanes()) write(names.swimlane, model.swimlane);
    write(names.color, model.color);
    if (this.tagsExpr() !== undefined) write(names.tags, model.tags);
    if (this.assigneeExpr() !== undefined) {
      write(names.assignee, model.assignees);
    }
    if (this.dueDateExpr() !== undefined) write(names.dueDate, model.dueDate);
    if (this.priorityExpr() !== undefined) {
      write(names.priority, model.priority);
    }
    return item;
  }

  /** Opens the editor for `card` through the `cardEditDialogShowing` hook. */
  editCard(card: KanbanCard<T>): void {
    if (!this.canUpdate()) return;
    this.openEditor(this.editorModelFrom(card), card.source, false);
  }

  /** Opens the editor for a new card prefilled into `column` / `swimlane`. */
  openNewCard(column: string, swimlane: string | null): void {
    if (!this.canAdd()) return;
    this.openEditor(this.newEditorModel(column, swimlane), null, true);
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
    const first = this.visibleColumns().find(
      (column) => this.canAddTo(column) && !this.isColumnCollapsed(column.key),
    );
    this.openNewCard(first?.key ?? this.visibleColumns()[0]?.key ?? '', null);
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
      const key = this.fields().fieldNames.key;
      let base = {} as T;
      if (key !== null) {
        base = withFieldValue(base, key, `oge-card-${++this.newKeyCounter}`);
      }
      const item = this.buildItem(result.model, base);
      this.insertItem(item, result.model.column, result.model.swimlane);
      return;
    }
    if (this.editedSource !== null) {
      const updated = this.buildItem(result.model, this.editedSource);
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

  /** Programmatic insert through the cancelable pipeline. */
  addCard(item: T): void {
    const fields = this.fields();
    const column = String(fields.column(item) ?? '');
    const swimlane = fields.swimlane
      ? ((fields.swimlane(item) as string | undefined) ?? null)
      : null;
    this.insertItem(item, column, swimlane);
  }

  private insertItem(item: T, column: string, swimlane: string | null): void {
    if (!this.canAdd()) return;
    const event: OgeKanbanCardAddingEvent<T> = {
      card: item,
      column,
      swimlane,
      cancel: false,
    };
    this.cardAdding.emit(event);
    if (event.cancel) return;
    this.store.set([...this.store(), item]);
    this.cardAdded.emit({ card: item, column, swimlane });
    this.announce(this.msg().announcements.cardCreated, {
      title: String(this.fields().title(item) ?? ''),
    });
  }

  /** Programmatic update through the cancelable pipeline. */
  updateCard(original: T, updated: T): void {
    this.updateItem(original, updated);
  }

  private updateItem(original: T, updated: T): void {
    if (!this.canUpdate()) return;
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
    this.cardUpdated.emit({ oldData: original, newData: updated });
    this.announce(this.msg().announcements.cardUpdated, {
      title: String(this.fields().title(updated) ?? ''),
    });
  }

  /** Programmatic delete through the cancelable pipeline. */
  deleteCard(item: T): void {
    this.deleteItem(item);
  }

  private deleteItem(item: T): void {
    if (!this.canDelete()) return;
    const event: OgeKanbanCardDeletingEvent<T> = { card: item, cancel: false };
    this.cardDeleting.emit(event);
    if (event.cancel) return;
    this.store.set(this.store().filter((entry) => entry !== item));
    this.cardDeleted.emit({ card: item });
    this.announce(this.msg().announcements.cardDeleted, {
      title: String(this.fields().title(item) ?? ''),
    });
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
    if (!this.canUpdate() && !this.canDrag()) return;
    const position = this.findCard(key);
    if (position === null) return;
    const lanes = this.lanes();
    const lane = lanes[position.laneIndex];
    const card = lane.columns[position.columnIndex].cards[position.cardIndex];
    const targetLaneKey = toSwimlane !== undefined ? toSwimlane : lane.key;
    const targetLane =
      lanes.find((entry) => entry.key === targetLaneKey) ?? lane;
    const targetCell = targetLane.columns.find(
      (cell) => cell.column.key === toColumn,
    );
    if (targetCell === undefined) return;
    const sameCell =
      card.column === toColumn && (card.swimlane ?? null) === targetLaneKey;
    const cellCards = sameCell
      ? targetCell.cards.filter((entry) => entry.key !== card.key)
      : targetCell.cards;
    const index = Math.max(
      0,
      Math.min(toIndex ?? cellCards.length, cellCards.length),
    );
    if (sameCell && index === position.cardIndex) {
      return; // dropped exactly where it started
    }
    const event: OgeKanbanCardMovingEvent<T> = {
      card: card.source,
      fromColumn: card.column,
      toColumn,
      fromIndex: position.cardIndex,
      toIndex: index,
      fromSwimlane: card.swimlane,
      toSwimlane: targetLaneKey,
      cancel: false,
    };
    this.cardMoving.emit(event);
    if (event.cancel) return;
    const movedItem = this.commitMove(
      card,
      cellCards,
      toColumn,
      targetLaneKey,
      index,
    );
    this.cardMoved.emit({
      card: movedItem,
      fromColumn: card.column,
      toColumn,
      fromIndex: position.cardIndex,
      toIndex: index,
      fromSwimlane: card.swimlane,
      toSwimlane: targetLaneKey,
    });
    const column = this.visibleColumns().find(
      (entry) => entry.key === toColumn,
    );
    this.announce(this.msg().announcements.cardMoved, {
      title: card.title,
      column: column !== undefined ? this.columnTitle(column) : toColumn,
      position: String(index + 1),
      count: String(cellCards.length + 1),
    });
    this.focusCard({ ...card, column: toColumn });
  }

  /**
   * Applies a validated move to the store and returns the updated item
   * (what `cardMoved` hands to hosts for persistence). With an `orderExpr`
   * the moved item gets a midpoint order (sequential renumber of the cell
   * when the midpoint has no room); without one the store array itself is
   * reordered, because the array order is the board order.
   */
  private commitMove(
    card: KanbanCard<T>,
    cellCards: readonly KanbanCard<T>[],
    toColumn: string,
    toSwimlane: string | null,
    index: number,
  ): T {
    const fields = this.fields();
    const names = fields.fieldNames;
    let moved = card.source;
    if (names.column !== null) {
      moved = withFieldValue(moved, names.column, toColumn);
    }
    if (this.hasSwimlanes() && names.swimlane !== null && toSwimlane !== null) {
      moved = withFieldValue(moved, names.swimlane, toSwimlane);
    }
    if (this.orderExpr() !== undefined && names.order !== null) {
      const prev = cellCards[index - 1];
      const next = cellCards[index];
      const order = orderBetween(
        prev !== undefined ? (prev.order ?? prev.sourceIndex) : null,
        next !== undefined ? (next.order ?? next.sourceIndex) : null,
      );
      if (order !== null) {
        moved = withFieldValue(moved, names.order, order);
        this.store.set(
          this.store().map((entry) => (entry === card.source ? moved : entry)),
        );
      } else {
        // no midpoint room: renumber the whole cell sequentially
        const reordered = [...cellCards];
        reordered.splice(index, 0, { ...card, source: moved });
        const patchBySource = new Map<T, T>([[card.source, moved]]);
        for (const [entry, orderValue] of renumberPatches(reordered)) {
          const base = patchBySource.get(entry.source) ?? entry.source;
          patchBySource.set(
            entry.source,
            withFieldValue(base, names.order, orderValue),
          );
        }
        this.store.set(
          this.store().map((entry) => patchBySource.get(entry) ?? entry),
        );
        moved = patchBySource.get(card.source) ?? moved;
      }
      return moved;
    }
    // array order is the board order: reorder the store itself
    const store = this.store().filter((entry) => entry !== card.source);
    const anchor = cellCards[index];
    const anchorIndex =
      anchor !== undefined
        ? store.indexOf(anchor.source)
        : cellCards.length > 0
          ? store.indexOf(cellCards[cellCards.length - 1].source) + 1
          : store.length;
    const next = [...store];
    next.splice(anchorIndex < 0 ? store.length : anchorIndex, 0, moved);
    this.store.set(next);
    return moved;
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
    this.announcement.set(this.format(template, tokens));
  }
}
