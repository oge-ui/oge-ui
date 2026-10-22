import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import {
  OGE_SHEET_MAX_COLUMNS,
  OGE_SHEET_MAX_ROWS,
  OgeSpreadsheetCore,
  formatOgeCellAddress,
  ogeCheckSpreadsheetLicense,
  ogeCreateCanvasMeasurer,
  ogeFormatLocale,
  ogeGridHeaderAt,
  ogeGridPoint,
  ogeIconParts,
  ogeOpenLink,
  ogeRevealScroll,
  ogeScrollEdges,
  ogeSliderToZoom,
  ogeZoomToSlider,
  type OgeFindOptions,
  type OgeGridView,
  type OgeIconPart,
  type OgeRenderMark,
  type OgeScrollEdges,
  type OgeSpreadsheetMenuKind,
  type OgeSpreadsheetMessages,
  type OgeViewportPanes,
  type OgeWorkbook,
} from '@oge-ui/spreadsheet-engine';
import { OGE_SPREADSHEET_CONFIG } from '../config';
import { SIGNAL_ADAPTER } from '../signal-adapter';
import type {
  OgeSpreadsheetCellClickEvent,
  OgeSpreadsheetHyperlinkClickEvent,
  OgeSpreadsheetLoadedEvent,
  OgeSpreadsheetLoadErrorEvent,
  OgeSpreadsheetSelectionChangeEvent,
  OgeSpreadsheetSource,
} from './spreadsheet-types';

let nextId = 0;

/**
 * A spreadsheet viewer that shows `.xlsx` workbooks the way Excel does:
 * Excel-measured geometry, fonts, number formats, borders and fills,
 * conditional formats, frozen panes, merges, pictures, notes and links, with
 * Excel's selection, keyboard map, find, copy and status bar.
 *
 * ```html
 * <oge-spreadsheet [source]="file" (loaded)="issues = $event.issues" />
 * ```
 */
@Component({
  selector: 'oge-spreadsheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-spreadsheet',
    '[attr.aria-busy]': "status() === 'loading' ? 'true' : null",
    '[class.oge-spreadsheet-link-hover]': 'linkHover()',
  },
  styleUrl: './spreadsheet.scss',
  template: `
    @if (macroNotice()) {
      <div class="oge-spreadsheet-message-bar" role="status">
        <span class="oge-spreadsheet-message-text">{{
          text().macrosNotice
        }}</span>
        <button
          type="button"
          class="oge-spreadsheet-icon-button"
          [attr.aria-label]="text().close"
          (click)="macroDismissed.set(true)"
        >
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
            <path
              d="M3 3l10 10M13 3L3 13"
              stroke="currentColor"
              stroke-width="1.6"
            />
          </svg>
        </button>
      </div>
    }
    @if (showFormulaBar()) {
      <div
        class="oge-spreadsheet-formula-bar"
        [class.oge-spreadsheet-formula-expanded]="formulaExpanded()"
      >
        <div class="oge-spreadsheet-name-field">
          <input
            #nameBoxInput
            class="oge-spreadsheet-name-box"
            type="text"
            spellcheck="false"
            autocomplete="off"
            [attr.aria-label]="text().nameBoxLabel"
            [value]="nameBox()"
            (focus)="selectText($event)"
            (keydown)="onNameBoxKeydown($event)"
            (blur)="restoreNameBox($event)"
          />
          @if (hasNames()) {
            <button
              #namesButton
              type="button"
              class="oge-spreadsheet-field-button"
              aria-haspopup="menu"
              [attr.aria-expanded]="menuKind() === 'names'"
              [attr.aria-controls]="menuKind() === 'names' ? menuId : null"
              [attr.aria-label]="text().definedNames"
              [attr.title]="text().definedNames"
              (mousedown)="$event.preventDefault()"
              (click)="toggleMenu('names')"
              (keydown)="onMenuButtonKeydown($event, 'names')"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3.5 6l4.5 4.5L12.5 6" />
              </svg>
            </button>
          }
          @if (menuKind() === 'names') {
            <div
              class="oge-spreadsheet-menu oge-spreadsheet-name-list"
              role="menu"
              tabindex="-1"
              [id]="menuId"
              [attr.aria-label]="text().definedNames"
              (keydown)="onMenuKeydown($event)"
              (focusout)="onMenuFocusOut($event)"
            >
              @for (item of menuItems(); track item.key; let i = $index) {
                <button
                  type="button"
                  class="oge-spreadsheet-menu-item"
                  role="menuitem"
                  tabindex="-1"
                  [attr.data-item]="i"
                  (click)="pickMenuItem(i)"
                >
                  <span
                    class="oge-spreadsheet-menu-label"
                    [textContent]="item.label"
                  ></span>
                </button>
              }
            </div>
          }
        </div>
        <span class="oge-spreadsheet-formula-tools" aria-hidden="true">
          <svg class="oge-spreadsheet-cancel-icon" viewBox="0 0 12 12">
            <path d="M.5.5l11 11M11.5.5l-11 11" />
          </svg>
          <svg class="oge-spreadsheet-enter-icon" viewBox="0 0 16 12">
            <path d="M.5 6.5L5 11 15.5.5" />
          </svg>
          <svg class="oge-spreadsheet-fx" viewBox="0 0 16 14">
            <path
              d="M6.5 1.5c-1.2-.4-2 .2-2.3 1.4L2.5 12.5M2 5.5h3.8M8.5 6l4.5 6M13 6l-4.5 6"
            />
          </svg>
          <svg class="oge-spreadsheet-fx-chevron" viewBox="0 0 8 8">
            <path d="M1.5 3L4 5.5 6.5 3" />
          </svg>
        </span>
        <div class="oge-spreadsheet-formula-field">
          <div
            class="oge-spreadsheet-formula"
            role="textbox"
            aria-readonly="true"
            tabindex="0"
            [attr.aria-label]="text().formulaBarLabel"
            [attr.aria-multiline]="formulaExpanded() ? 'true' : null"
            [class.oge-spreadsheet-formula-ghost]="formula().ghost"
            [textContent]="formula().text"
          ></div>
          <button
            type="button"
            class="oge-spreadsheet-field-button"
            [attr.aria-expanded]="formulaExpanded()"
            [attr.aria-label]="text().expandFormulaBar"
            [attr.title]="text().expandFormulaBar"
            (click)="core.toggleFormulaBar()"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path
                [attr.d]="
                  formulaExpanded()
                    ? 'M3.5 10.5L8 6l4.5 4.5'
                    : 'M3.5 6l4.5 4.5L12.5 6'
                "
              />
            </svg>
          </button>
        </div>
      </div>
    }
    <div class="oge-spreadsheet-body">
      <div
        #scroller
        class="oge-spreadsheet-grid"
        role="grid"
        tabindex="0"
        aria-multiselectable="true"
        [attr.aria-label]="text().gridLabel"
        [attr.aria-rowcount]="maxRows"
        [attr.aria-colcount]="maxColumns"
        [attr.aria-activedescendant]="status() === 'ready' ? cellId : null"
        [attr.dir]="rtl() ? 'rtl' : 'ltr'"
        [class.oge-spreadsheet-grid-rtl]="rtl()"
        (scroll)="onScroll()"
        (keydown)="onKeydown($event)"
        (copy)="onCopy($event)"
        (pointerdown)="onPointerDown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="onPointerUp($event)"
        (pointercancel)="onPointerCancel()"
        (mouseleave)="onPointerLeave()"
      >
        @if (view(); as v) {
          <div
            class="oge-spreadsheet-sizer"
            role="presentation"
            [style]="v.sizer"
          >
            @for (item of v.render; track item.pane.key) {
              @let pane = item.pane;
              <div
                class="oge-spreadsheet-pane"
                [style]="item.style"
                [attr.data-pane]="pane.key"
                aria-hidden="true"
              >
                <div class="oge-spreadsheet-pane-flip">
                  @if (pane.gridlines) {
                    <svg
                      class="oge-spreadsheet-layer"
                      [attr.width]="pane.width"
                      [attr.height]="pane.height"
                    >
                      <path
                        class="oge-spreadsheet-gridlines"
                        [attr.d]="pane.gridlines"
                      />
                    </svg>
                  }
                  @for (fill of pane.fills; track fill.key) {
                    <div
                      class="oge-spreadsheet-fill"
                      [style]="fill.style"
                    ></div>
                  }
                  @for (mark of pane.marks; track mark.key) {
                    @if (mark.kind === 'dataBar') {
                      <div
                        class="oge-spreadsheet-data-bar"
                        [style]="mark.style"
                      ></div>
                    }
                  }
                  @for (cell of pane.texts; track cell.key) {
                    <div class="oge-spreadsheet-clip" [style]="cell.clip">
                      <!-- plain text through textContent: under white-space: pre, template whitespace would show -->
                      @if (cell.text !== null) {
                        <div
                          class="oge-spreadsheet-text"
                          [style]="cell.style"
                          [textContent]="cell.text"
                        ></div>
                      } @else {
                        <div class="oge-spreadsheet-text" [style]="cell.style">
                          @if (cell.runs) {
                            @for (run of cell.runs; track $index) {
                              <span [style]="run.style">{{ run.text }}</span>
                            }
                          } @else if (cell.lines) {
                            @for (line of cell.lines; track $index) {
                              <span [style]="line.style">{{ line.text }}</span>
                            }
                          } @else if (cell.repeat) {
                            <span>{{ cell.repeat.before }}</span>
                            <span class="oge-spreadsheet-repeat">{{
                              repeat(cell.repeat.char)
                            }}</span>
                            <span>{{ cell.repeat.after }}</span>
                          }
                        </div>
                      }
                    </div>
                  }
                  @if (pane.borders.length) {
                    <svg
                      class="oge-spreadsheet-layer"
                      [attr.width]="pane.width"
                      [attr.height]="pane.height"
                      fill="none"
                    >
                      @for (stroke of pane.borders; track $index) {
                        <path
                          [attr.d]="stroke.d"
                          [attr.stroke]="stroke.color ?? '#000000'"
                          [attr.stroke-width]="stroke.width"
                          [attr.stroke-dasharray]="stroke.dash"
                          [attr.stroke-dashoffset]="
                            stroke.dash ? stroke.dashOffset : null
                          "
                          [attr.shape-rendering]="
                            stroke.crisp ? 'crispEdges' : null
                          "
                        />
                      }
                    </svg>
                  }
                  @for (mark of pane.marks; track mark.key) {
                    @switch (mark.kind) {
                      @case ('underline') {
                        <div
                          class="oge-spreadsheet-underline"
                          [style]="mark.style"
                        ></div>
                      }
                      @case ('note') {
                        <svg
                          class="oge-spreadsheet-note-mark"
                          [style]="mark.style"
                        >
                          <polygon [attr.points]="mark.points" />
                        </svg>
                      }
                      @case ('icon') {
                        <svg
                          class="oge-spreadsheet-icon"
                          viewBox="0 0 16 16"
                          [style]="mark.style"
                        >
                          @for (part of iconParts(mark); track $index) {
                            <path
                              [attr.d]="part.d"
                              [attr.fill]="part.fill"
                              [attr.stroke]="part.stroke ?? null"
                              [attr.stroke-width]="part.strokeWidth ?? null"
                              [attr.transform]="part.transform ?? null"
                            />
                          }
                        </svg>
                      }
                      @case ('filter') {
                        <span
                          class="oge-spreadsheet-filter-button"
                          [class.oge-spreadsheet-filter-active]="mark.filtered"
                          [style]="mark.style"
                        >
                          <svg viewBox="0 0 16 16" aria-hidden="true">
                            @if (mark.filtered) {
                              <path d="M2.5 3.5h8l-3 3.6v4.4l-2-1.2V7.1z" />
                              <path d="M11 9.5h4l-2 2.5z" />
                            } @else {
                              <path d="M4.5 6.5h7L8 10.5z" />
                            }
                          </svg>
                        </span>
                      }
                    }
                  }
                  @if (item.selection; as s) {
                    @if (s.overlay) {
                      <svg
                        class="oge-spreadsheet-layer"
                        [attr.width]="pane.width"
                        [attr.height]="pane.height"
                      >
                        <path
                          class="oge-spreadsheet-selection-overlay"
                          [attr.d]="s.overlay"
                        />
                      </svg>
                    }
                    @if (s.spill) {
                      <div
                        class="oge-spreadsheet-spill-frame"
                        [style]="s.spill"
                      ></div>
                    }
                    @if (s.inner) {
                      <div
                        class="oge-spreadsheet-selection-inner"
                        [style]="s.inner"
                      ></div>
                    }
                    @if (s.frame) {
                      <div
                        class="oge-spreadsheet-selection-frame"
                        [style]="s.frame"
                      ></div>
                    }
                    @if (s.active) {
                      <div
                        class="oge-spreadsheet-selection-active"
                        [style]="s.active"
                      ></div>
                    }
                    @if (s.moat) {
                      <div
                        class="oge-spreadsheet-selection-moat"
                        [style]="s.moat"
                      ></div>
                    }
                    @if (s.handle) {
                      <div
                        class="oge-spreadsheet-selection-handle"
                        [style]="s.handle"
                      ></div>
                    }
                  }
                  @for (picture of item.pictures; track picture.key) {
                    <div
                      class="oge-spreadsheet-picture"
                      [style]="picture.frame"
                    >
                      <img
                        [src]="picture.url"
                        [attr.alt]="picture.alt"
                        [style]="picture.image"
                        draggable="false"
                      />
                    </div>
                  }
                  @for (chart of item.charts; track chart.key) {
                    <svg
                      class="oge-spreadsheet-chart"
                      [style]="chart.frame"
                      [attr.width]="chart.view.width"
                      [attr.height]="chart.view.height"
                    >
                      @for (mark of chart.view.paths; track $index) {
                        <path
                          [attr.d]="mark.d"
                          [attr.fill]="mark.fill ?? 'none'"
                          [attr.fill-opacity]="mark.fillOpacity ?? null"
                          [attr.stroke]="mark.stroke ?? null"
                          [attr.stroke-width]="mark.strokeWidth ?? null"
                          [attr.stroke-dasharray]="mark.dash ?? null"
                          [attr.stroke-linejoin]="mark.round ? 'round' : null"
                          [attr.stroke-linecap]="mark.round ? 'round' : null"
                          [attr.shape-rendering]="
                            mark.crisp ? 'crispEdges' : null
                          "
                        />
                      }
                      @for (mark of chart.view.texts; track $index) {
                        <text
                          [attr.x]="mark.x"
                          [attr.y]="mark.y"
                          [attr.text-anchor]="mark.anchor"
                          [attr.transform]="mark.transform ?? null"
                          [style]="mark.style"
                          [textContent]="mark.text"
                        ></text>
                      }
                    </svg>
                  }
                </div>
              </div>
            }
            @for (strip of v.columnHeaders; track strip.key) {
              <div
                class="oge-spreadsheet-column-headers"
                [class.oge-spreadsheet-headers-frozen]="strip.frozen"
                [style]="strip.style"
                aria-hidden="true"
              >
                <div class="oge-spreadsheet-pane-flip" [style]="v.headerFont">
                  @for (header of strip.cells; track header.index) {
                    <div
                      class="oge-spreadsheet-column-header"
                      [class.oge-spreadsheet-header-selected]="
                        header.state === 'selected'
                      "
                      [class.oge-spreadsheet-header-full]="
                        header.state === 'full'
                      "
                      [style.left.px]="header.offset"
                      [style.width.px]="header.size"
                      [attr.data-col]="header.index"
                    >
                      <span class="oge-spreadsheet-header-label">{{
                        header.label
                      }}</span>
                    </div>
                  }
                  @for (mark of strip.marks; track mark.key) {
                    <div
                      class="oge-spreadsheet-header-mark"
                      [attr.data-kind]="mark.kind"
                      [style]="mark.style"
                    ></div>
                  }
                </div>
              </div>
            }
            @for (strip of v.rowHeaders; track strip.key) {
              <div
                class="oge-spreadsheet-row-headers"
                [class.oge-spreadsheet-headers-frozen]="strip.frozen"
                [style]="strip.style"
                aria-hidden="true"
              >
                <div class="oge-spreadsheet-pane-flip" [style]="v.headerFont">
                  @for (header of strip.cells; track header.index) {
                    <div
                      class="oge-spreadsheet-row-header"
                      [class.oge-spreadsheet-header-selected]="
                        header.state === 'selected'
                      "
                      [class.oge-spreadsheet-header-full]="
                        header.state === 'full'
                      "
                      [style.top.px]="header.offset"
                      [style.height.px]="header.size"
                      [attr.data-row]="header.index"
                    >
                      <span class="oge-spreadsheet-header-label">{{
                        header.label
                      }}</span>
                    </div>
                  }
                  @for (mark of strip.marks; track mark.key) {
                    <div
                      class="oge-spreadsheet-header-mark"
                      [attr.data-kind]="mark.kind"
                      [style]="mark.style"
                    ></div>
                  }
                </div>
              </div>
            }
            @for (strip of v.rowOutline; track strip.key) {
              <div
                class="oge-spreadsheet-outline oge-spreadsheet-row-outline"
                [style]="strip.style"
                aria-hidden="true"
              >
                <div class="oge-spreadsheet-pane-flip">
                  @for (mark of strip.marks; track mark.key) {
                    @if (mark.kind === 'bracket') {
                      <div
                        class="oge-spreadsheet-outline-bracket"
                        [attr.data-tick]="mark.tick"
                        [style]="mark.style"
                      ></div>
                    } @else {
                      <div
                        class="oge-spreadsheet-outline-button"
                        [class.oge-spreadsheet-outline-collapsed]="
                          mark.collapsed
                        "
                        data-axis="rows"
                        [attr.data-group]="mark.group"
                        [style]="mark.style"
                      ></div>
                    }
                  }
                </div>
              </div>
            }
            @for (strip of v.columnOutline; track strip.key) {
              <div
                class="oge-spreadsheet-outline oge-spreadsheet-column-outline"
                [style]="strip.style"
                aria-hidden="true"
              >
                <div class="oge-spreadsheet-pane-flip">
                  @for (mark of strip.marks; track mark.key) {
                    @if (mark.kind === 'bracket') {
                      <div
                        class="oge-spreadsheet-outline-bracket"
                        [attr.data-tick]="mark.tick"
                        [style]="mark.style"
                      ></div>
                    } @else {
                      <div
                        class="oge-spreadsheet-outline-button"
                        [class.oge-spreadsheet-outline-collapsed]="
                          mark.collapsed
                        "
                        data-axis="columns"
                        [attr.data-group]="mark.group"
                        [style]="mark.style"
                      ></div>
                    }
                  }
                </div>
              </div>
            }
            @if (v.outlineCorner; as outlineCorner) {
              <div
                class="oge-spreadsheet-outline-corner"
                [style]="outlineCorner"
                aria-hidden="true"
              >
                @for (
                  button of v.outlineLevels;
                  track button.axis + button.level
                ) {
                  <div
                    class="oge-spreadsheet-outline-level"
                    [attr.data-axis]="button.axis"
                    [attr.data-level]="button.level"
                    [style]="button.style"
                    [textContent]="button.level"
                  ></div>
                }
              </div>
            }
            @if (v.panes.headers.rowHeaderWidth > 0) {
              <div
                class="oge-spreadsheet-select-all"
                [style]="v.corner"
                [attr.title]="text().selectAllLabel"
                aria-hidden="true"
              ></div>
            }
          </div>
        }
        <div
          role="row"
          class="oge-spreadsheet-a11y-row"
          [attr.aria-rowindex]="active().row + 1"
        >
          <div
            role="gridcell"
            class="oge-spreadsheet-a11y-cell"
            [id]="cellId"
            [attr.aria-colindex]="active().col + 1"
            aria-selected="true"
            [textContent]="activeDescription()"
          ></div>
        </div>
      </div>
      @if (status() !== 'ready') {
        <div
          class="oge-spreadsheet-placeholder"
          [class.oge-spreadsheet-placeholder-error]="status() === 'error'"
        >
          @switch (status()) {
            @case ('loading') {
              <span class="oge-spreadsheet-spinner" aria-hidden="true"></span
              >{{ text().loading }}
            }
            @case ('error') {
              {{ errorText() }}
            }
            @default {
              {{ text().empty }}
            }
          }
        </div>
      }
      @if (findState().open) {
        <div
          class="oge-spreadsheet-find"
          role="search"
          [attr.aria-label]="text().find"
        >
          <input
            #findInput
            class="oge-spreadsheet-find-input"
            type="search"
            spellcheck="false"
            [attr.aria-label]="text().find"
            [attr.placeholder]="text().findPlaceholder"
            [value]="findState().query"
            (keydown)="onFindKeydown($event)"
          />
          <span class="oge-spreadsheet-find-count" aria-live="polite">{{
            findCount()
          }}</span>
          <button
            type="button"
            class="oge-spreadsheet-icon-button"
            [attr.aria-label]="text().findPrevious"
            (click)="findStep(-1)"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path
                d="M4 10l4-4 4 4"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
              />
            </svg>
          </button>
          <button
            type="button"
            class="oge-spreadsheet-icon-button"
            [attr.aria-label]="text().findNext"
            (click)="findStep(1)"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path
                d="M4 6l4 4 4-4"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
              />
            </svg>
          </button>
          <button
            type="button"
            class="oge-spreadsheet-toggle"
            [attr.aria-pressed]="!!findOptions().matchCase"
            [attr.aria-label]="text().matchCase"
            [attr.title]="text().matchCase"
            (click)="toggleFind('matchCase')"
          >
            Aa
          </button>
          <button
            type="button"
            class="oge-spreadsheet-toggle"
            [attr.aria-pressed]="!!findOptions().entireCell"
            [attr.aria-label]="text().matchEntireCell"
            [attr.title]="text().matchEntireCell"
            (click)="toggleFind('entireCell')"
          >
            [ ]
          </button>
          <button
            type="button"
            class="oge-spreadsheet-toggle"
            [attr.aria-pressed]="!!findOptions().workbook"
            [attr.aria-label]="text().searchWorkbook"
            [attr.title]="text().searchWorkbook"
            (click)="toggleFind('workbook')"
          >
            ⊞
          </button>
          <button
            type="button"
            class="oge-spreadsheet-icon-button"
            [attr.aria-label]="text().close"
            (click)="closeFind()"
          >
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                stroke-width="1.6"
              />
            </svg>
          </button>
        </div>
      }
      @if (notes().length) {
        <div class="oge-spreadsheet-notes" [attr.dir]="rtl() ? 'rtl' : 'ltr'">
          @for (note of notes(); track note.key) {
            <div
              class="oge-spreadsheet-note"
              role="note"
              [attr.aria-label]="text().notePopupLabel"
              [style]="note.style"
            >
              @for (run of note.runs; track $index) {
                <span
                  [class.oge-spreadsheet-note-bold]="run.bold"
                  [class.oge-spreadsheet-note-italic]="run.italic"
                  >{{ run.text }}</span
                >
              }
            </div>
          }
        </div>
      }
      @if (chartLabels().length) {
        <ul
          class="oge-spreadsheet-chart-list"
          [attr.aria-label]="text().chartListLabel"
        >
          @for (label of chartLabels(); track $index) {
            <li>{{ label }}</li>
          }
        </ul>
      }
    </div>
    @if (showTabs()) {
      <div class="oge-spreadsheet-tab-strip">
        <div class="oge-spreadsheet-tab-scroll" aria-hidden="true">
          <button
            type="button"
            tabindex="-1"
            class="oge-spreadsheet-tab-nav"
            [attr.title]="text().previousSheets"
            [disabled]="!tabScroll().back"
            (click)="scrollTabs(-1)"
          >
            <svg viewBox="0 0 16 16"><path d="M10 3.5L5.5 8l4.5 4.5" /></svg>
          </button>
          <button
            type="button"
            tabindex="-1"
            class="oge-spreadsheet-tab-nav"
            [attr.title]="text().nextSheets"
            [disabled]="!tabScroll().forward"
            (click)="scrollTabs(1)"
          >
            <svg viewBox="0 0 16 16"><path d="M6 3.5l4.5 4.5L6 12.5" /></svg>
          </button>
        </div>
        <div class="oge-spreadsheet-sheet-menu">
          <button
            #sheetMenuButton
            type="button"
            class="oge-spreadsheet-sheet-menu-button"
            aria-haspopup="menu"
            [attr.aria-expanded]="menuKind() === 'sheets'"
            [attr.aria-controls]="menuKind() === 'sheets' ? menuId : null"
            [attr.aria-label]="text().allSheets"
            [attr.title]="text().allSheets"
            (mousedown)="$event.preventDefault()"
            (click)="toggleMenu('sheets')"
            (keydown)="onMenuButtonKeydown($event, 'sheets')"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
            </svg>
          </button>
          @if (menuKind() === 'sheets') {
            <div
              class="oge-spreadsheet-menu oge-spreadsheet-sheet-list"
              role="menu"
              tabindex="-1"
              [id]="menuId"
              [attr.aria-label]="text().allSheets"
              (keydown)="onMenuKeydown($event)"
              (focusout)="onMenuFocusOut($event)"
            >
              @for (item of menuItems(); track item.key; let i = $index) {
                <button
                  type="button"
                  class="oge-spreadsheet-menu-item"
                  role="menuitemradio"
                  tabindex="-1"
                  [attr.aria-checked]="item.checked"
                  [attr.data-item]="i"
                  (click)="pickMenuItem(i)"
                >
                  <svg
                    class="oge-spreadsheet-menu-check"
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                  >
                    <path d="M3 8.5l3.2 3.2L13 5" />
                  </svg>
                  <span
                    class="oge-spreadsheet-menu-label"
                    [textContent]="item.label"
                  ></span>
                </button>
              }
            </div>
          }
        </div>
        <div
          #tabList
          class="oge-spreadsheet-tabs"
          role="tablist"
          [attr.aria-label]="text().sheetTabsLabel"
          (scroll)="updateTabScroll()"
        >
          @for (tab of tabs(); track tab.index) {
            <button
              type="button"
              role="tab"
              class="oge-spreadsheet-tab"
              [class.oge-spreadsheet-tab-active]="tab.index === activeIndex()"
              [class.oge-spreadsheet-tab-colored]="!!tab.color"
              [class.oge-spreadsheet-tab-colored-light]="tab.ink === 'light'"
              [style.--oge-spreadsheet-tab-color]="tab.color ?? null"
              [attr.aria-selected]="tab.index === activeIndex()"
              [attr.tabindex]="tab.index === activeIndex() ? 0 : -1"
              [attr.data-sheet]="tab.index"
              (click)="selectSheet(tab.index)"
              (keydown)="onTabKeydown($event)"
            >
              <span
                class="oge-spreadsheet-tab-label"
                [attr.data-label]="tab.name"
                [textContent]="tab.name"
              ></span>
            </button>
          }
        </div>
      </div>
    }
    @if (showStatusBar()) {
      <div
        class="oge-spreadsheet-status-bar"
        role="group"
        [attr.aria-label]="text().statusBarLabel"
      >
        <span class="oge-spreadsheet-status-items">
          @for (item of statusItems(); track item.kind) {
            <span class="oge-spreadsheet-status-item">{{ item.text }}</span>
          }
        </span>
        <span class="oge-spreadsheet-zoom">
          <button
            type="button"
            class="oge-spreadsheet-zoom-step"
            [attr.aria-label]="text().zoomOut"
            (click)="stepZoom(-1)"
          >
            −
          </button>
          <input
            class="oge-spreadsheet-zoom-slider"
            type="range"
            min="0"
            max="200"
            step="1"
            [attr.aria-label]="zoomText()"
            [attr.aria-valuetext]="currentZoom() + '%'"
            [value]="sliderValue()"
            (input)="onSlider($event)"
          />
          <button
            type="button"
            class="oge-spreadsheet-zoom-step"
            [attr.aria-label]="text().zoomIn"
            (click)="stepZoom(1)"
          >
            +
          </button>
          <span class="oge-spreadsheet-zoom-value">{{ currentZoom() }}%</span>
        </span>
      </div>
    }
    <div class="oge-spreadsheet-live" aria-live="polite" aria-atomic="true">
      {{ liveText() }}
    </div>
  `,
})
export class OgeSpreadsheet {
  private readonly config = inject(OGE_SPREADSHEET_CONFIG);
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);

  /** The workbook to open: bytes, a `Blob` / `File`, or a URL. */
  readonly source = input<OgeSpreadsheetSource | null>(null);
  /** A workbook built or read elsewhere (wins over `source` when both change). */
  readonly workbook = input<OgeWorkbook | null>(null);
  /** Overrides of the message catalog (merged over the configured one). */
  readonly messages = input<Partial<OgeSpreadsheetMessages>>({});
  /**
   * BCP 47 locale of the built-in number formats, separators and month names
   * — Excel takes them from the reader's region. Default: the configured
   * locale, else the browser's.
   */
  readonly locale = input<string | undefined>(undefined);
  /** The name box and formula bar. */
  readonly showFormulaBar = input<boolean>(true);
  /** The sheet tabs. Default: the workbook's own setting. */
  readonly showSheetTabs = input<boolean | undefined>(undefined);
  /** The status bar: the selection's Average, Count and Sum, and the zoom. */
  readonly showStatusBar = input<boolean>(true);
  /** Row and column headers. Default: each sheet's own setting. */
  readonly showHeaders = input<boolean | undefined>(undefined);
  /** Gridlines. Default: each sheet's own setting. */
  readonly showGridLines = input<boolean | undefined>(undefined);
  /** The outline's brackets and buttons beside the headers. Default: each sheet's own setting. */
  readonly showOutlineSymbols = input<boolean | undefined>(undefined);
  /** The active sheet's index (two-way). */
  readonly activeSheet = model<number | undefined>(undefined);
  /** The active sheet's zoom in percent (two-way); each sheet keeps its own. */
  readonly zoom = model<number | undefined>(undefined);

  /** A workbook opened. */
  readonly loaded = output<OgeSpreadsheetLoadedEvent>();
  /** Opening a workbook failed. */
  readonly loadError = output<OgeSpreadsheetLoadErrorEvent>();
  /** The selection changed. */
  readonly selectionChange = output<OgeSpreadsheetSelectionChangeEvent>();
  /** An external hyperlink is about to open (cancelable). */
  readonly hyperlinkClick = output<OgeSpreadsheetHyperlinkClickEvent>();
  /** A cell was clicked. */
  readonly cellClick = output<OgeSpreadsheetCellClickEvent>();

  /** The controller (ADR 0003): everything that is not a template binding. */
  readonly core = new OgeSpreadsheetCore({
    reactivity: SIGNAL_ADAPTER,
    messages: this.config.messages,
  });

  protected readonly maxRows = OGE_SHEET_MAX_ROWS;
  protected readonly maxColumns = OGE_SHEET_MAX_COLUMNS;
  protected readonly cellId = `oge-spreadsheet-${++nextId}-active`;
  protected readonly menuId = `oge-spreadsheet-${nextId}-menu`;

  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private readonly nameBoxInput =
    viewChild<ElementRef<HTMLInputElement>>('nameBoxInput');
  private readonly findInput =
    viewChild<ElementRef<HTMLInputElement>>('findInput');
  private readonly tabList = viewChild<ElementRef<HTMLElement>>('tabList');
  private readonly sheetMenuButton =
    viewChild<ElementRef<HTMLElement>>('sheetMenuButton');
  private readonly namesButton =
    viewChild<ElementRef<HTMLElement>>('namesButton');

  private readonly scrollTop = signal(0);
  private readonly scrollLeft = signal(0);
  private readonly gridWidth = signal(0);
  private readonly gridHeight = signal(0);
  protected readonly macroDismissed = signal(false);
  /** Where the sheet tabs can still scroll: the scroll buttons are off otherwise. */
  protected readonly tabScroll = signal<OgeScrollEdges>({
    back: false,
    forward: false,
  });
  /** Set after the first browser render: a server render never fetches or reads a source. */
  private readonly inBrowser = signal(false);
  private sheetEcho: number | undefined;
  private zoomEcho: number | undefined;

  protected readonly text = computed<OgeSpreadsheetMessages>(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));
  protected readonly status = computed(() => this.core.status());
  protected readonly active = computed(() => this.core.selection().active);
  protected readonly activeIndex = computed(() => this.core.activeSheet());
  protected readonly tabs = computed(() => {
    this.core.version();
    return this.core.workbook() ? this.core.tabs() : [];
  });
  protected readonly showTabs = computed(() => {
    const workbook = this.core.workbook();
    return (
      !!workbook && (this.showSheetTabs() ?? workbook.showSheetTabs) !== false
    );
  });
  protected readonly rtl = computed(
    () => this.core.sheet()?.view.rightToLeft ?? false,
  );
  protected readonly currentZoom = computed(() => this.core.zoom());
  protected readonly sliderValue = computed(() =>
    ogeZoomToSlider(this.core.zoom()),
  );
  protected readonly nameBox = computed(() => {
    this.core.selection();
    return this.core.nameBox();
  });
  protected readonly formula = computed(() => {
    this.core.selection();
    this.core.version();
    return this.core.formulaBar();
  });
  protected readonly statusItems = computed(() => {
    this.core.selection();
    this.core.version();
    return this.core.statusItems();
  });
  protected readonly formulaExpanded = computed(() =>
    this.core.formulaExpanded(),
  );
  protected readonly menuKind = computed(() => this.core.menu().kind);
  protected readonly menuItems = computed(() => {
    this.core.menu();
    this.core.activeSheet();
    this.core.version();
    return this.core.menuItems();
  });
  protected readonly hasNames = computed(() => {
    this.core.activeSheet();
    this.core.version();
    return this.core.definedNames().length > 0;
  });
  protected readonly findState = computed(() => this.core.findState());
  protected readonly findOptions = computed<OgeFindOptions>(
    () => this.core.findState().options,
  );
  protected readonly findCount = computed(() => this.core.findCount());
  protected readonly errorText = computed(() => this.core.errorText());
  protected readonly zoomText = computed(() => this.core.zoomText());
  protected readonly macroNotice = computed(
    () =>
      !this.macroDismissed() &&
      this.core.issues().some((issue) => issue.code === 'macros-kept'),
  );
  protected readonly activeDescription = computed(() => {
    const { row, col } = this.active();
    this.core.version();
    return this.core.describeCell(row, col);
  });
  /** The live region: everything but a single cell's description, which the active descendant already speaks. */
  protected readonly liveText = computed(() => {
    const said = this.core.announcement();
    return said === this.activeDescription() ? '' : said;
  });
  protected readonly linkHover = computed(() => this.core.hoverLink());

  /** The panes for the current scroll position, size and zoom. */
  private readonly panes = computed<OgeViewportPanes | null>(() => {
    this.core.version();
    if (!this.core.sheet() || this.gridWidth() === 0) return null;
    return this.core.panes({
      width: this.gridWidth(),
      height: this.gridHeight(),
      scrollTop: this.scrollTop(),
      scrollLeft: this.scrollLeft(),
      ...(this.showHeaders() !== undefined
        ? { headers: this.showHeaders() }
        : {}),
      ...(this.showOutlineSymbols() !== undefined
        ? { outline: this.showOutlineSymbols() }
        : {}),
    });
  });

  /** Whether the grid has a size and a sheet (the panes exist); flips once, not per scroll. */
  private readonly gridReady = computed(() => this.panes() !== null);

  /** The grid frame: panes, selection, pictures, headers (`OgeSpreadsheetCore.gridView`). */
  protected readonly view = computed<OgeGridView | null>(() => {
    const panes = this.panes();
    if (!panes) return null;
    const showGridLines = this.showGridLines();
    return this.core.gridView(
      panes,
      showGridLines === undefined ? {} : { showGridLines },
    );
  });

  /** The active sheet's charts as assistive tech hears them (the panes they draw in are hidden from it). */
  protected readonly chartLabels = computed(() => {
    this.core.activeSheet();
    this.core.version();
    return this.core.workbook() ? this.core.chartLabels() : [];
  });

  /** Notes shown: those pinned open in the file, and the one under the pointer (or opened with Shift+F2). */
  protected readonly notes = computed(() => {
    const panes = this.panes();
    return panes
      ? this.core.notes(panes, {
          scrollTop: this.scrollTop(),
          scrollLeft: this.scrollLeft(),
        })
      : [];
  });

  constructor() {
    ogeCheckSpreadsheetLicense();
    const destroyRef = inject(DestroyRef);
    // messages and locale: the configured ones under the inputs
    effect(() => this.core.setMessages(this.text()));
    effect(() => {
      const tag =
        this.locale() ??
        this.config.locale ??
        (typeof navigator === 'undefined' ? 'en-US' : navigator.language);
      untracked(() => this.core.setLocale(ogeFormatLocale(tag)));
    });
    // a source opens, and a workbook shows, in the browser only — the server
    // cannot lay a sheet out and a relative URL means nothing there (React's
    // effects skip both too); the workbook effect runs second, so a workbook
    // given with a source wins (setWorkbook cancels the read)
    effect(() => {
      const source = this.source();
      if (source !== null && this.inBrowser())
        untracked(() => void this.open(source));
    });
    effect(() => {
      const workbook = this.workbook();
      if (workbook && this.inBrowser())
        untracked(() => this.core.setWorkbook(workbook));
    });
    // two-way active sheet and zoom: a value the component wrote back is its
    // own echo, not a request; the core holds a request until a workbook opens
    effect(() => {
      const wanted = this.activeSheet();
      if (wanted === undefined || wanted === this.sheetEcho) return;
      untracked(() => this.core.requestSheet(wanted));
    });
    effect(() => {
      const index = this.core.activeSheet();
      if (!this.core.workbook()) return;
      untracked(() => {
        this.sheetEcho = index;
        if (this.activeSheet() !== index) this.activeSheet.set(index);
      });
    });
    effect(() => {
      const wanted = this.zoom();
      if (wanted === undefined || wanted === this.zoomEcho) return;
      untracked(() => this.core.requestZoom(wanted));
    });
    effect(() => {
      const zoom = this.core.zoom();
      if (!this.core.workbook()) return;
      untracked(() => {
        this.zoomEcho = zoom;
        if (this.zoom() !== zoom) this.zoom.set(zoom);
      });
    });
    // selection events
    effect(() => {
      const selection = this.core.selection();
      if (!untracked(() => this.core.workbook())) return;
      untracked(() =>
        this.selectionChange.emit({
          sheet: this.core.activeSheet(),
          ranges: selection.ranges,
          active: selection.active,
          address: formatOgeCellAddress(selection.active),
        }),
      );
    });
    // scroll a requested cell into view
    effect(() => {
      const request = this.core.reveal();
      const scroller = this.scroller()?.nativeElement;
      const panes = untracked(() => this.panes());
      const sheet = untracked(() => this.core.sheet());
      if (!scroller || !panes || !sheet || request.token === 0) return;
      const next = ogeRevealScroll(sheet, panes, request, {
        scrollTop: scroller.scrollTop,
        scrollLeft: scroller.scrollLeft,
      });
      this.scrollTo(next.scrollTop, next.scrollLeft);
    });
    // a sheet opens where it was left, else at its saved top-left cell — once the grid has a size
    effect(() => {
      this.core.activeSheet();
      const workbook = this.core.workbook();
      const ready = this.gridReady();
      untracked(() => {
        const panes = this.panes();
        if (!workbook || !ready || !panes) return;
        const target = this.core.sheetScroll(panes);
        this.scrollTo(target.scrollTop, target.scrollLeft);
      });
    });
    // a new workbook shows its own macro notice
    effect(() => {
      this.core.workbook();
      untracked(() => this.macroDismissed.set(false));
    });
    // the sheet tabs' scroll buttons follow what the strip can still show
    effect((onCleanup) => {
      const list = this.tabList()?.nativeElement;
      this.tabs();
      if (!list) return;
      untracked(() => this.updateTabScroll());
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => this.updateTabScroll());
      observer.observe(list);
      onCleanup(() => observer.disconnect());
    });
    afterNextRender(() => {
      this.inBrowser.set(true);
      const measurer = ogeCreateCanvasMeasurer();
      if (measurer) this.core.setMeasurer(measurer);
      const fonts = (this.document as Document & { fonts?: FontFaceSet }).fonts;
      // web fonts arriving later change text widths: measure again
      fonts?.ready.then(() => {
        const again = ogeCreateCanvasMeasurer();
        if (again) this.core.setMeasurer(again);
      });
      const scroller = this.scroller()?.nativeElement;
      if (!scroller) return;
      const measure = () => {
        this.gridWidth.set(scroller.clientWidth);
        this.gridHeight.set(scroller.clientHeight);
      };
      measure();
      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(measure);
        observer.observe(scroller);
        destroyRef.onDestroy(() => observer.disconnect());
      }
      // Ctrl+wheel zooms; the listener must not be passive to keep the page from zooming
      const wheel = (event: WheelEvent) => {
        if (!event.ctrlKey && !event.metaKey) return;
        event.preventDefault();
        this.core.stepZoom(event.deltaY < 0 ? 1 : -1);
      };
      scroller.addEventListener('wheel', wheel, { passive: false });
      destroyRef.onDestroy(() => scroller.removeEventListener('wheel', wheel));
    });
    destroyRef.onDestroy(() => this.core.destroy());
  }

  // ── public API ───────────────────────────────────────────────────────────

  /** Opens a workbook: bytes, a `Blob` / `File`, or a URL. */
  async open(source: OgeSpreadsheetSource): Promise<void> {
    await this.core.open(source);
    const workbook = this.core.workbook();
    const error = this.core.error();
    if (workbook) this.loaded.emit({ workbook, issues: this.core.issues() });
    else if (error) this.loadError.emit({ error });
  }

  /** The open workbook, or `null`. */
  getWorkbook(): OgeWorkbook | null {
    return this.core.workbook();
  }

  /** Shows a sheet by index; hidden sheets are refused (`false`). */
  selectSheet(index: number): boolean {
    return this.core.selectSheet(index);
  }

  /** Goes to a reference (`B4`, `Sheet2!A1:C3`, a defined name). `false` when unknown. */
  goTo(reference: string): boolean {
    return this.core.goTo(reference);
  }

  /** Sets the zoom (10–400%). */
  setZoom(percent: number): void {
    this.core.setZoom(percent);
  }

  /** Searches the sheet (or the workbook) and selects the first match. */
  find(query: string, options: OgeFindOptions = {}): void {
    this.core.find(query, options);
  }

  /** Copies the selection to the clipboard (text and Excel-compatible HTML). */
  copy(): Promise<boolean> {
    return this.core.copyToClipboard();
  }

  /**
   * Prints the active sheet's used range as a table — built from DOM nodes,
   * never markup — in a hidden frame that goes away after printing.
   */
  print(): void {
    this.core.print(this.document);
  }

  /** Focuses the grid. */
  focus(): void {
    this.scroller()?.nativeElement.focus({ preventScroll: true });
  }

  // ── template helpers ─────────────────────────────────────────────────────

  protected repeat(char: string): string {
    return char.repeat(200);
  }

  protected iconParts(mark: OgeRenderMark): readonly OgeIconPart[] {
    return mark.icon ? ogeIconParts(mark.icon.set, mark.icon.index) : [];
  }

  // ── events ───────────────────────────────────────────────────────────────

  protected onScroll(): void {
    const scroller = this.scroller()?.nativeElement;
    if (!scroller) return;
    this.scrollTop.set(scroller.scrollTop);
    this.scrollLeft.set(scroller.scrollLeft);
    this.core.rememberScroll(scroller);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.target !== event.currentTarget) return;
    const panes = this.panes();
    const action = this.core.keydown(event, {
      rows: panes?.pageRows ?? 10,
      cols: panes?.pageCols ?? 5,
    });
    // Ctrl+C: the browser fires `copy`, which writes the clipboard (onCopy)
    if (action === null || action === 'copy') return;
    event.preventDefault();
    if (action === 'find')
      setTimeout(() => this.findInput()?.nativeElement.focus());
    else if (action === 'goto') this.nameBoxInput()?.nativeElement.focus();
    else if (action === 'open-link')
      this.followLink(this.active().row, this.active().col);
  }

  protected onCopy(event: ClipboardEvent): void {
    if (!event.clipboardData) return;
    const content = this.core.copy();
    if (!content) return;
    event.clipboardData.setData('text/plain', content.text);
    event.clipboardData.setData('text/html', content.html);
    event.preventDefault();
  }

  protected onPointerDown(event: PointerEvent): void {
    const panes = this.panes();
    const scroller = this.scroller()?.nativeElement;
    if (
      !panes ||
      !scroller ||
      !this.core.pointerDown(
        panes,
        ogeGridPoint(event, scroller),
        ogeGridHeaderAt(event.target),
        event,
      )
    )
      return;
    event.preventDefault();
    this.focus();
    try {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      // jsdom and some pointer types cannot capture
    }
  }

  protected onPointerMove(event: PointerEvent): void {
    const panes = this.panes();
    const scroller = this.scroller()?.nativeElement;
    if (panes && scroller)
      this.core.pointerMove(panes, ogeGridPoint(event, scroller), event);
  }

  protected onPointerUp(event: PointerEvent): void {
    const panes = this.panes();
    const scroller = this.scroller()?.nativeElement;
    const click =
      panes && scroller
        ? this.core.pointerUp(panes, ogeGridPoint(event, scroller), event)
        : null;
    if (!click) return;
    this.cellClick.emit({
      row: click.row,
      col: click.col,
      address: click.address,
      text: click.text,
      event,
    });
    // Excel follows a link on a click
    if (click.follow) this.followLink(click.row, click.col);
  }

  protected onPointerCancel(): void {
    this.core.pointerCancel();
  }

  protected onPointerLeave(): void {
    this.core.pointerLeave();
  }

  protected selectText(event: FocusEvent): void {
    (event.target as HTMLInputElement).select();
  }

  protected onNameBoxKeydown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.core.goTo(input.value)) this.focus();
      else input.select();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      input.value = this.nameBox();
      this.focus();
    }
  }

  protected restoreNameBox(event: FocusEvent): void {
    (event.target as HTMLInputElement).value = this.nameBox();
  }

  protected onFindKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.core.submitFind(
        (event.target as HTMLInputElement).value,
        event.shiftKey ? -1 : 1,
      );
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.closeFind();
    }
  }

  protected findStep(step: 1 | -1): void {
    this.core.submitFind(
      this.findInput()?.nativeElement.value ?? this.findState().query,
      step,
    );
  }

  protected toggleFind(option: 'matchCase' | 'entireCell' | 'workbook'): void {
    this.core.toggleFindOption(
      option,
      this.findInput()?.nativeElement.value ?? '',
    );
  }

  protected closeFind(): void {
    this.core.closeFind();
    this.focus();
  }

  protected onTabKeydown(event: KeyboardEvent): void {
    const index = this.core.tabKeydown(
      event.key,
      getComputedStyle(this.hostEl.nativeElement).direction === 'rtl',
    );
    if (index === null) return;
    event.preventDefault();
    setTimeout(() => {
      const button = this.tabList()?.nativeElement.querySelector<HTMLElement>(
        `[data-sheet="${index}"]`,
      );
      button?.focus();
      button?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    });
  }

  protected scrollTabs(direction: 1 | -1): void {
    const list = this.tabList()?.nativeElement;
    list?.scrollBy({ left: direction * 120, behavior: 'smooth' });
  }

  protected updateTabScroll(): void {
    const list = this.tabList()?.nativeElement;
    if (!list) return;
    const edges = ogeScrollEdges(list);
    const was = this.tabScroll();
    if (was.back !== edges.back || was.forward !== edges.forward)
      this.tabScroll.set(edges);
  }

  /** The opener keeps focus where it is on a press (`mousedown` is cancelled), so a click on it while open closes the list. */
  protected toggleMenu(kind: OgeSpreadsheetMenuKind): void {
    if (this.menuKind() === kind) {
      this.core.closeMenu();
      this.menuOpener(kind)?.focus();
      return;
    }
    this.core.openMenu(kind);
    this.focusMenuItem();
  }

  protected onMenuButtonKeydown(
    event: KeyboardEvent,
    kind: OgeSpreadsheetMenuKind,
  ): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    this.core.openMenu(kind, event.key === 'ArrowUp' ? 'last' : 'checked');
    this.focusMenuItem();
  }

  protected onMenuKeydown(event: KeyboardEvent): void {
    const kind = this.menuKind();
    const action = this.core.menuKeydown(event.key);
    if (action === null) return;
    // Tab closes the list and lets the browser move on from the opener
    if (action !== 'leave') event.preventDefault();
    if (action === 'focus') this.focusMenuItem();
    else if (action === 'picked') this.focus();
    else this.menuOpener(kind)?.focus();
  }

  /** Focus leaving the list for anything but its opener closes it. */
  protected onMenuFocusOut(event: FocusEvent): void {
    const menu = event.currentTarget as HTMLElement;
    const next = event.relatedTarget as Node | null;
    if (
      next &&
      (menu.contains(next) || next === this.menuOpener(this.menuKind()))
    )
      return;
    this.core.closeMenu();
  }

  protected pickMenuItem(position: number): void {
    this.core.pickMenuItem(position);
    this.focus();
  }

  private menuOpener(kind: OgeSpreadsheetMenuKind | null): HTMLElement | null {
    const ref = kind === 'names' ? this.namesButton() : this.sheetMenuButton();
    return ref?.nativeElement ?? null;
  }

  /** Focuses the open list's focused item once it is drawn. */
  private focusMenuItem(): void {
    setTimeout(() => {
      const { kind, focus } = this.core.menu();
      if (kind === null) return;
      this.hostEl.nativeElement
        .querySelector<HTMLElement>(`#${this.menuId} [data-item="${focus}"]`)
        ?.focus();
    });
  }

  protected stepZoom(direction: 1 | -1): void {
    this.core.stepZoom(direction);
  }

  protected onSlider(event: Event): void {
    this.core.setZoom(
      ogeSliderToZoom(Number((event.target as HTMLInputElement).value)),
    );
  }

  // ── internals ────────────────────────────────────────────────────────────

  private scrollTo(scrollTop: number, scrollLeft: number): void {
    const scroller = this.scroller()?.nativeElement;
    if (!scroller) return;
    scroller.scrollTop = scrollTop;
    scroller.scrollLeft = this.rtl() ? -scrollLeft : scrollLeft;
    this.scrollTop.set(scroller.scrollTop);
    this.scrollLeft.set(scroller.scrollLeft);
    this.core.rememberScroll(scroller);
  }

  private followLink(row: number, col: number): void {
    const action = this.core.followHyperlink(row, col);
    if (!action || action.kind !== 'external') return;
    const event: OgeSpreadsheetHyperlinkClickEvent = {
      href: action.href,
      link: action.link,
      cancel: false,
    };
    this.hyperlinkClick.emit(event);
    if (!event.cancel) ogeOpenLink(this.document.defaultView, action.href);
  }
}
