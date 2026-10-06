import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  afterRenderEffect,
  computed,
  contentChildren,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  OGE_DEFAULT_BPMN_PALETTE_ITEMS,
  OgeBpmnEditorCore,
  bpmnOverlayLinkRel,
  type BpmnDiagramJson,
  type BpmnImportResult,
  type BpmnPaletteItemType,
  type OgeBpmnContextPadProvider,
  type OgeBpmnLintChangedEvent,
  type OgeBpmnLintIssue,
  type OgeBpmnLintRulesInput,
  type OgeBpmnPaletteProvider,
  type OgeBpmnPngExportOptions,
  type OgeBpmnPropertiesProvider,
  type OgeBpmnRenderers,
  type OgeBpmnDiagramChangedEvent,
  type OgeBpmnElementsChangedEvent,
  type OgeBpmnImportEvent,
  type OgeBpmnMessages,
  type OgeBpmnOverlay,
  type OgeBpmnReactiveCell,
  type OgeBpmnReactivity,
  type OgeBpmnSelectionEvent,
} from '@oge-ui/bpmn-engine';
import { OGE_BPMN_CONFIG } from '../config';
import { OgeBpmnPalette } from './bpmn-palette';
import { rasterizeBpmnSvg } from './bpmn-png';
import {
  OgeBpmnProperties,
  OgeBpmnPropertiesEntryTemplate,
} from './bpmn-properties';
import { OgeBpmnSvgNodes } from './bpmn-svg';

/**
 * Angular's reactivity in the shape the engine's editor core consumes
 * (ADR 0003) — `signal()` cells and `computed()` derivations, so every view
 * model keeps driving change detection while its logic lives once, in
 * `@oge-ui/bpmn-engine`, shared with the React editor.
 */
const SIGNAL_REACTIVITY: OgeBpmnReactivity = {
  cell<T>(initial: T): OgeBpmnReactiveCell<T> {
    const state = signal(initial);
    const cell = (() => state()) as OgeBpmnReactiveCell<T>;
    cell.set = (value) => state.set(value);
    return cell;
  },
  derived: (compute) => computed(compute),
};

let nextUid = 0;

/**
 * BPMN 2.0 diagram editor built on the package's own framework-free engine:
 * palette click-then-place, ghost move with commit-on-release, context-pad
 * connect/append, inline label editing, orthogonal routing, snapshot
 * undo/redo and a keyboard-accessible `role="application"` canvas.
 *
 * ```html
 * <oge-bpmn-editor [(zoom)]="zoom" (elementsChanged)="onChanged($event)" />
 * ```
 */
@Component({
  selector: 'oge-bpmn-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgeBpmnPalette, OgeBpmnProperties, OgeBpmnSvgNodes],
  styleUrl: './bpmn-editor.scss',
  host: {
    class: 'oge-bpmn-editor',
    '[class.oge-bpmn-readonly]': 'locked()',
    '[class.oge-bpmn-maximized]': 'maximized()',
  },
  template: `
    @if (showHeader()) {
      <div
        class="oge-bpmn-header"
        role="toolbar"
        [attr.aria-label]="core.msg().header.label"
      >
        <input
          class="oge-bpmn-header-name"
          type="text"
          spellcheck="false"
          autocomplete="off"
          [value]="core.diagram().processName ?? ''"
          [placeholder]="core.msg().header.namePlaceholder"
          [attr.aria-label]="core.msg().header.nameLabel"
          [disabled]="core.locked()"
          (change)="onHeaderNameChange($event)"
          (keydown)="$event.stopPropagation()"
        />
        <span class="oge-bpmn-header-spacer"></span>
        <button
          type="button"
          class="oge-bpmn-header-btn"
          aria-keyshortcuts="Control+Z"
          [disabled]="core.locked() || !core.canUndo()"
          [attr.aria-label]="core.msg().header.undo"
          [title]="core.msg().header.undo + ' (Ctrl+Z)'"
          (click)="core.undo()"
        >
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <path d="M8 5 4 9l4 4M4 9h7a5 5 0 0 1 0 10h-1" />
          </svg>
        </button>
        <button
          type="button"
          class="oge-bpmn-header-btn"
          aria-keyshortcuts="Control+Y"
          [disabled]="core.locked() || !core.canRedo()"
          [attr.aria-label]="core.msg().header.redo"
          [title]="core.msg().header.redo + ' (Ctrl+Y)'"
          (click)="core.redo()"
        >
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <path d="m12 5 4 4-4 4M16 9H9a5 5 0 0 0 0 10h1" />
          </svg>
        </button>
        <span class="oge-bpmn-header-sep" aria-hidden="true"></span>
        <button
          type="button"
          class="oge-bpmn-header-btn"
          [attr.aria-label]="core.msg().header.zoomOut"
          [title]="core.msg().header.zoomOut"
          (click)="core.zoomStep(1 / 1.2)"
        >
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <path d="M4 10h12" />
          </svg>
        </button>
        <button
          type="button"
          class="oge-bpmn-header-btn oge-bpmn-header-zoom"
          [attr.aria-label]="core.msg().header.zoomFit"
          [title]="core.msg().header.zoomFit + ' (F)'"
          (click)="core.zoomToFit()"
        >
          {{ core.zoomPercent() }}%
        </button>
        <button
          type="button"
          class="oge-bpmn-header-btn"
          [attr.aria-label]="core.msg().header.zoomIn"
          [title]="core.msg().header.zoomIn"
          (click)="core.zoomStep(1.2)"
        >
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <path d="M10 4v12M4 10h12" />
          </svg>
        </button>
        <span class="oge-bpmn-header-sep" aria-hidden="true"></span>
        @if (allowModeToggle() && !readOnly()) {
          <button
            type="button"
            class="oge-bpmn-header-btn"
            [attr.aria-pressed]="mode() === 'edit'"
            [attr.aria-label]="
              mode() === 'edit'
                ? core.msg().header.modeView
                : core.msg().header.modeEdit
            "
            [title]="
              mode() === 'edit'
                ? core.msg().header.modeView
                : core.msg().header.modeEdit
            "
            (click)="core.toggleMode()"
          >
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
              @if (mode() === 'edit') {
                <path
                  d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10Z"
                />
                <circle cx="10" cy="10" r="2.5" />
              } @else {
                <path d="m13 3 4 4L7 17l-4.5 1L4 13.5 13 3Z" />
              }
            </svg>
          </button>
        }
        @if (lint()) {
          <button
            type="button"
            class="oge-bpmn-header-btn oge-bpmn-header-problems"
            [class.oge-bpmn-header-problems-found]="
              core.problemsView().count > 0
            "
            [attr.aria-expanded]="core.problemsOpen()"
            [attr.aria-controls]="core.uid + '-problems'"
            [attr.aria-label]="
              core.msg().lint.panelLabel +
              ' (' +
              core.problemsView().count +
              ')'
            "
            [title]="core.msg().lint.panelLabel"
            (click)="core.toggleProblems()"
          >
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
              <path d="M10 3 18 17H2Z" />
              <path d="M10 8v4M10 14.5v.5" />
            </svg>
            <span class="oge-bpmn-problems-count" aria-hidden="true">{{
              core.problemsView().count
            }}</span>
          </button>
        }
        @if (showPropertiesPanel() && !core.locked()) {
          <button
            type="button"
            class="oge-bpmn-header-btn"
            [attr.aria-pressed]="!core.propertiesCollapsed()"
            [attr.aria-label]="core.msg().header.panelToggle"
            [title]="core.msg().header.panelToggle"
            (click)="core.togglePropertiesPanel()"
          >
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
              <rect x="3" y="4" width="14" height="12" rx="2" />
              <path d="M13 4v12" />
            </svg>
          </button>
        }
        <button
          type="button"
          class="oge-bpmn-header-btn"
          [attr.aria-pressed]="core.maximized()"
          [attr.aria-label]="
            core.maximized()
              ? core.msg().header.fullscreenExit
              : core.msg().header.fullscreenEnter
          "
          [title]="
            core.maximized()
              ? core.msg().header.fullscreenExit
              : core.msg().header.fullscreenEnter
          "
          (click)="core.toggleFullscreen()"
        >
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            @if (core.maximized()) {
              <path d="M8 3v5H3M12 3v5h5M8 17v-5H3M12 17v-5h5" />
            } @else {
              <path d="M3 8V3h5M17 8V3h-5M3 12v5h5M17 12v5h-5" />
            }
          </svg>
        </button>
      </div>
    }
    <div class="oge-bpmn-body">
      <div class="oge-bpmn-rail" [style.inline-size.px]="core.railWidth()">
        <!-- A viewer renders no palette at all: an all-disabled scrollable
           toolbar is dead chrome and an axe scrollable-region violation. -->
        @if (!core.locked()) {
          <oge-bpmn-palette
            [items]="paletteItems()"
            [labels]="core.msg().paletteLabels"
            [activeType]="core.paletteActive()"
            [label]="core.msg().paletteLabel"
            [customEntries]="core.paletteEntries()"
            (entryPicked)="core.onPaletteEntry($event)"
            (toolPicked)="core.onToolPicked($event)"
            (dragStarted)="core.onPaletteDragStart($event)"
          />
        }
        <div
          class="oge-bpmn-toolstrip"
          role="toolbar"
          aria-orientation="vertical"
          [attr.aria-label]="core.msg().tools.label"
        >
          <button
            type="button"
            class="oge-bpmn-tool-btn"
            aria-keyshortcuts="H"
            [class.oge-bpmn-tool-active]="core.tool().kind === 'hand'"
            [attr.aria-pressed]="core.tool().kind === 'hand'"
            [attr.aria-label]="core.msg().tools.hand"
            [title]="core.msg().tools.hand + ' (H)'"
            (click)="core.onStripTool('hand')"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11m0-5.5a1.5 1.5 0 0 1 3 0V11m0-3.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-.6a6 6 0 0 1-5-2.7L4 14.6a1.5 1.5 0 0 1 2.4-1.8L8 15"
              />
            </svg>
          </button>
          <button
            type="button"
            class="oge-bpmn-tool-btn"
            aria-keyshortcuts="L"
            [class.oge-bpmn-tool-active]="core.tool().kind === 'lasso'"
            [attr.aria-pressed]="core.tool().kind === 'lasso'"
            [attr.aria-label]="core.msg().tools.lasso"
            [title]="core.msg().tools.lasso + ' (L)'"
            (click)="core.onStripTool('lasso')"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <rect
                x="4"
                y="4"
                width="16"
                height="16"
                rx="2"
                stroke-dasharray="3 3"
              />
            </svg>
          </button>
          <button
            type="button"
            class="oge-bpmn-tool-btn"
            aria-keyshortcuts="S"
            [class.oge-bpmn-tool-active]="core.tool().kind === 'space'"
            [attr.aria-pressed]="core.tool().kind === 'space'"
            [attr.aria-label]="core.msg().tools.space"
            [title]="core.msg().tools.space + ' (S)'"
            [disabled]="core.locked()"
            (click)="core.onStripTool('space')"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M12 4v16M7 9 4 12l3 3M17 9l3 3-3 3M4 12h5M15 12h5" />
            </svg>
          </button>
          <button
            type="button"
            class="oge-bpmn-tool-btn"
            [class.oge-bpmn-tool-active]="core.tool().kind === 'globalConnect'"
            [attr.aria-pressed]="core.tool().kind === 'globalConnect'"
            [attr.aria-label]="core.msg().tools.globalConnect"
            [title]="core.msg().tools.globalConnect"
            [disabled]="core.locked()"
            (click)="core.onStripTool('globalConnect')"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <circle cx="6" cy="6" r="2.5" />
              <circle cx="18" cy="18" r="2.5" />
              <path d="M8 8l8 8M16 12v4h-4" />
            </svg>
          </button>
          <button
            type="button"
            class="oge-bpmn-tool-btn"
            aria-keyshortcuts="Control+F"
            [class.oge-bpmn-tool-active]="core.searchOpen()"
            [attr.aria-pressed]="core.searchOpen()"
            [attr.aria-label]="core.msg().tools.search"
            [title]="core.msg().tools.search + ' (Ctrl+F)'"
            (click)="core.toggleSearch()"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="5.5" />
              <path d="M15 15l5 5" />
            </svg>
          </button>
        </div>
      </div>
      <div
        class="oge-bpmn-resizer"
        role="separator"
        aria-orientation="vertical"
        tabindex="0"
        [attr.aria-label]="core.msg().railResizeLabel"
        [attr.aria-valuemin]="core.RAIL_MIN"
        [attr.aria-valuemax]="core.RAIL_MAX"
        [attr.aria-valuenow]="core.railWidth()"
        (pointerdown)="core.onPanelResizeStart($event, 'rail')"
        (keydown)="core.onPanelResizeKey($event, 'rail')"
      ></div>
      <div
        #wrap
        class="oge-bpmn-canvas-wrap"
        tabindex="0"
        role="application"
        [attr.aria-label]="core.canvasAriaLabel()"
        [attr.aria-roledescription]="core.msg().canvasLabel"
        [attr.aria-activedescendant]="core.activeDescendant()"
        [attr.aria-keyshortcuts]="core.keyShortcuts"
        (keydown)="core.onCanvasKeydown($event)"
        (keyup)="core.onCanvasKeyup($event)"
        (focus)="core.onCanvasFocus()"
      >
        <svg
          class="oge-bpmn-canvas"
          [class.oge-bpmn-tool-place]="core.tool().kind === 'place'"
          [class.oge-bpmn-tool-connect]="
            core.tool().kind === 'connect' ||
            core.tool().kind === 'globalConnect'
          "
          [class.oge-bpmn-tool-hand]="core.tool().kind === 'hand'"
          [class.oge-bpmn-tool-lasso]="core.tool().kind === 'lasso'"
          [class.oge-bpmn-tool-space]="core.tool().kind === 'space'"
          (pointerdown)="core.onCanvasPointerDown($event)"
          (pointermove)="core.onCanvasPointerMove($event)"
          (wheel)="core.onWheel($event)"
        >
          <defs>
            <pattern
              [attr.id]="core.uid + '-grid'"
              patternUnits="userSpaceOnUse"
              [attr.width]="core.gridSize()"
              [attr.height]="core.gridSize()"
            >
              <circle class="oge-bpmn-grid-dot" cx="1" cy="1" r="1" />
            </pattern>
            <marker
              [attr.id]="core.uid + '-arrow'"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="5"
              orient="auto-start-reverse"
              markerUnits="userSpaceOnUse"
            >
              <path class="oge-bpmn-arrow" d="M0 0 L10 5 L0 10 Z" />
            </marker>
            <marker
              [attr.id]="core.uid + '-open-arrow'"
              markerWidth="12"
              markerHeight="12"
              refX="10"
              refY="5"
              orient="auto-start-reverse"
              markerUnits="userSpaceOnUse"
            >
              <path class="oge-bpmn-open-arrow" d="M1 1 L10 5 L1 9 Z" />
            </marker>
          </defs>
          <g
            class="oge-bpmn-viewport"
            [attr.transform]="core.viewportTransform()"
          >
            @if (gridVisible()) {
              <rect
                class="oge-bpmn-grid"
                x="-10000"
                y="-10000"
                width="20000"
                height="20000"
                [attr.fill]="'url(#' + core.uid + '-grid)'"
              />
            }
            <g class="oge-bpmn-pools">
              @for (p of core.poolViews(); track p.id) {
                <g
                  class="oge-bpmn-pool"
                  [class.oge-bpmn-dimmed]="core.dimmedIds().has(p.id)"
                  [class.oge-bpmn-selected]="p.selected"
                  [class.oge-bpmn-drop-ok]="
                    (core.connectHover()?.id === p.id &&
                      core.connectHover()?.allowed === true) ||
                    core.dropContainerId() === p.id
                  "
                  [class.oge-bpmn-drop-deny]="
                    core.connectHover()?.id === p.id &&
                    core.connectHover()?.allowed === false
                  "
                  [attr.id]="core.uid + '-el-' + p.id"
                  role="img"
                  [attr.aria-label]="p.ariaLabel"
                >
                  <rect
                    class="oge-bpmn-pool-band"
                    [style.fill]="p.fill"
                    [style.stroke]="p.stroke"
                    [attr.x]="p.x"
                    [attr.y]="p.y"
                    [attr.width]="p.width"
                    [attr.height]="p.height"
                  />
                  @for (lane of p.lanes; track lane.id) {
                    <rect
                      class="oge-bpmn-lane"
                      [attr.x]="lane.x"
                      [attr.y]="lane.y"
                      [attr.width]="lane.width"
                      [attr.height]="lane.height"
                    />
                    @if (lane.name) {
                      <text
                        class="oge-bpmn-lane-name"
                        [attr.x]="lane.nameX"
                        [attr.y]="lane.nameY"
                        [attr.transform]="lane.nameTransform"
                      >
                        {{ lane.name }}
                      </text>
                    }
                  }
                  <rect
                    class="oge-bpmn-pool-header"
                    [attr.x]="p.x"
                    [attr.y]="p.y"
                    [attr.width]="core.poolHeaderWidth"
                    [attr.height]="p.height"
                    (pointerdown)="core.onShapePointerDown(p.id, $event)"
                    (dblclick)="core.startLabelEdit(p.id)"
                  />
                  <rect
                    class="oge-bpmn-pool-border"
                    [attr.x]="p.x"
                    [attr.y]="p.y"
                    [attr.width]="p.width"
                    [attr.height]="p.height"
                    (pointerdown)="core.onShapePointerDown(p.id, $event)"
                  />
                  @if (p.name) {
                    <text
                      class="oge-bpmn-pool-name"
                      [attr.x]="p.nameX"
                      [attr.y]="p.nameY"
                      [attr.transform]="p.nameTransform"
                    >
                      {{ p.name }}
                    </text>
                  }
                  @if (p.lint; as badge) {
                    <g
                      class="oge-bpmn-lint-badge"
                      [class.oge-bpmn-lint-error]="badge.severity === 'error'"
                      [class.oge-bpmn-lint-warning]="
                        badge.severity === 'warning'
                      "
                      [class.oge-bpmn-lint-info]="badge.severity === 'info'"
                      aria-hidden="true"
                      [attr.transform]="
                        'translate(' + badge.x + ' ' + badge.y + ')'
                      "
                    >
                      <circle r="8" />
                      <text y="4" text-anchor="middle">{{ badge.count }}</text>
                    </g>
                  }
                </g>
              }
            </g>
            <g class="oge-bpmn-edges">
              @for (e of core.edgeViews(); track e.id) {
                <g
                  class="oge-bpmn-edge"
                  [class.oge-bpmn-dimmed]="core.dimmedIds().has(e.id)"
                  [class.oge-bpmn-selected]="e.selected"
                  [class.oge-bpmn-association]="e.association"
                  [class.oge-bpmn-message-flow]="e.kind === 'messageFlow'"
                  [class.oge-bpmn-data-association]="
                    e.kind === 'dataAssociation'
                  "
                  [attr.id]="core.uid + '-el-' + e.id"
                  role="img"
                  [attr.aria-label]="e.ariaLabel"
                  (pointerdown)="core.onEdgePointerDown(e.id, $event)"
                  (dblclick)="core.onEdgeDblClick(e.id, $event)"
                >
                  <polyline
                    class="oge-bpmn-edge-hit"
                    [attr.points]="e.points"
                  />
                  <polyline
                    class="oge-bpmn-edge-line"
                    [style.stroke]="e.stroke"
                    [attr.points]="e.points"
                    [attr.marker-end]="e.markerEnd"
                  />
                  @if (e.sourceDot; as dot) {
                    <circle
                      class="oge-bpmn-message-dot"
                      [style.stroke]="e.stroke"
                      [attr.cx]="dot.x"
                      [attr.cy]="dot.y"
                      r="4"
                    />
                  }
                  @if (e.defaultMark; as mark) {
                    <line
                      class="oge-bpmn-default-mark"
                      [attr.x1]="mark.x1"
                      [attr.y1]="mark.y1"
                      [attr.x2]="mark.x2"
                      [attr.y2]="mark.y2"
                    />
                  }
                  @if (e.label) {
                    <text
                      class="oge-bpmn-edge-label oge-bpmn-label"
                      [class.oge-bpmn-label-external]="!core.locked()"
                      [attr.data-owner]="e.id"
                      [attr.x]="e.labelX"
                      [attr.y]="e.labelY"
                      (pointerdown)="core.onLabelPointerDown(e.id, $event)"
                    >
                      {{ e.label }}
                    </text>
                  }
                  @if (e.lint; as badge) {
                    <g
                      class="oge-bpmn-lint-badge"
                      [class.oge-bpmn-lint-error]="badge.severity === 'error'"
                      [class.oge-bpmn-lint-warning]="
                        badge.severity === 'warning'
                      "
                      [class.oge-bpmn-lint-info]="badge.severity === 'info'"
                      aria-hidden="true"
                      [attr.transform]="
                        'translate(' + badge.x + ' ' + badge.y + ')'
                      "
                    >
                      <circle r="8" />
                      <text y="4" text-anchor="middle">{{ badge.count }}</text>
                    </g>
                  }
                </g>
              }
            </g>
            <g class="oge-bpmn-shapes">
              @for (n of core.nodeViews(); track n.id) {
                <g
                  class="oge-bpmn-shape"
                  [class.oge-bpmn-dimmed]="core.dimmedIds().has(n.id)"
                  [class.oge-bpmn-selected]="n.selected"
                  [class.oge-bpmn-drop-ok]="
                    (core.connectHover()?.id === n.id &&
                      core.connectHover()?.allowed === true) ||
                    core.attachHover() === n.id ||
                    core.dropContainerId() === n.id
                  "
                  [class.oge-bpmn-drop-deny]="
                    core.connectHover()?.id === n.id &&
                    core.connectHover()?.allowed === false
                  "
                  [attr.id]="core.uid + '-el-' + n.id"
                  role="img"
                  [attr.aria-label]="n.ariaLabel"
                  [attr.transform]="'translate(' + n.x + ' ' + n.y + ')'"
                  (pointerdown)="core.onShapePointerDown(n.id, $event)"
                  (dblclick)="core.startLabelEdit(n.id)"
                >
                  @if (n.custom; as custom) {
                    <svg:g
                      class="oge-bpmn-custom-glyph"
                      ogeBpmnSvgNodes
                      [nodes]="custom"
                    />
                  } @else {
                    @switch (n.glyph) {
                      @case ('event') {
                        <circle
                          class="oge-bpmn-node oge-bpmn-event"
                          [class.oge-bpmn-event-end]="n.thick"
                          [class.oge-bpmn-event-dashed]="n.dashed"
                          [style.fill]="n.fill"
                          [style.stroke]="n.stroke"
                          [attr.cx]="n.width / 2"
                          [attr.cy]="n.height / 2"
                          [attr.r]="n.width / 2"
                        />
                        @if (n.double) {
                          <circle
                            class="oge-bpmn-node oge-bpmn-event"
                            [class.oge-bpmn-event-dashed]="n.dashed"
                            [style.fill]="'none'"
                            [style.stroke]="n.stroke"
                            [attr.cx]="n.width / 2"
                            [attr.cy]="n.height / 2"
                            [attr.r]="n.width / 2 - 4"
                          />
                        }
                        @if (n.throwDot) {
                          <circle
                            class="oge-bpmn-event-dot"
                            [style.fill]="n.stroke"
                            [attr.cx]="n.width / 2"
                            [attr.cy]="n.height / 2"
                            r="4"
                          />
                        }
                        @if (n.eventDefPath; as defPath) {
                          <path
                            class="oge-bpmn-event-def"
                            [class.oge-bpmn-event-def-filled]="n.eventDefFilled"
                            [style.stroke]="n.stroke"
                            [style.fill]="n.eventDefFilled ? n.stroke : null"
                            [attr.d]="defPath"
                          />
                        }
                      }
                      @case ('subprocess') {
                        <rect
                          class="oge-bpmn-node oge-bpmn-task oge-bpmn-subprocess"
                          [class.oge-bpmn-subprocess-event]="n.dotted"
                          [style.fill]="n.fill"
                          [style.stroke]="n.stroke"
                          [attr.width]="n.width"
                          [attr.height]="n.height"
                          rx="10"
                        />
                        @if (n.transactionInner) {
                          <rect
                            class="oge-bpmn-node oge-bpmn-task"
                            x="3"
                            y="3"
                            [style.fill]="'none'"
                            [style.stroke]="n.stroke"
                            [attr.width]="n.width - 6"
                            [attr.height]="n.height - 6"
                            rx="7"
                          />
                        }
                        @if (n.collapsedPath; as plusPath) {
                          <path
                            class="oge-bpmn-marker"
                            [style.stroke]="n.stroke"
                            [attr.d]="plusPath"
                          />
                        }
                      }
                      @case ('data') {
                        <path
                          class="oge-bpmn-node oge-bpmn-data"
                          [style.fill]="n.fill"
                          [style.stroke]="n.stroke"
                          [attr.d]="n.dataPath"
                        />
                      }
                      @case ('group') {
                        <rect
                          class="oge-bpmn-node oge-bpmn-group"
                          [style.stroke]="n.stroke"
                          [attr.width]="n.width"
                          [attr.height]="n.height"
                          rx="10"
                        />
                      }
                      @case ('task') {
                        <rect
                          class="oge-bpmn-node oge-bpmn-task"
                          [class.oge-bpmn-call-activity]="n.callActivity"
                          [style.fill]="n.fill"
                          [style.stroke]="n.stroke"
                          [attr.width]="n.width"
                          [attr.height]="n.height"
                          rx="10"
                        />
                        @switch (n.taskIcon) {
                          @case ('user') {
                            <g class="oge-bpmn-task-icon">
                              <circle cx="14" cy="12" r="3" />
                              <path d="M9 21c0-2.8 2.2-4.6 5-4.6s5 1.8 5 4.6" />
                            </g>
                          }
                          @case ('service') {
                            <g class="oge-bpmn-task-icon">
                              <circle cx="14" cy="14" r="4" />
                              <path
                                d="M14 7.5v3M14 17.5v3M7.5 14h3M17.5 14h3"
                              />
                            </g>
                          }
                          @case ('script') {
                            <g class="oge-bpmn-task-icon">
                              <path d="M8 9h10M8 13h10M8 17h6" />
                            </g>
                          }
                        }
                      }
                      @case ('gateway') {
                        <path
                          class="oge-bpmn-node oge-bpmn-gateway"
                          [style.fill]="n.fill"
                          [style.stroke]="n.stroke"
                          [attr.d]="n.gatewayPath"
                        />
                        <path
                          class="oge-bpmn-gateway-mark"
                          [style.stroke]="n.stroke"
                          [attr.d]="n.gatewayMark"
                        />
                      }
                      @case ('annotation') {
                        <path
                          class="oge-bpmn-node oge-bpmn-annotation"
                          [style.stroke]="n.stroke"
                          [attr.d]="n.annotationPath"
                        />
                      }
                    }
                  }
                  @for (markerPath of n.markerPaths; track $index) {
                    <path
                      class="oge-bpmn-marker"
                      [style.stroke]="n.stroke"
                      [attr.d]="markerPath"
                    />
                  }
                  @for (line of n.lines; track $index) {
                    <text
                      class="oge-bpmn-label"
                      [class.oge-bpmn-label-external]="
                        n.externalLabel && !core.locked()
                      "
                      [attr.data-owner]="n.externalLabel ? n.id : null"
                      [attr.x]="n.labelX"
                      [attr.y]="line.y"
                      [attr.text-anchor]="n.labelAnchor"
                      (pointerdown)="
                        n.externalLabel
                          ? core.onLabelPointerDown(n.id, $event)
                          : null
                      "
                    >
                      {{ line.text }}
                    </text>
                  }
                  @if (n.lint; as badge) {
                    <g
                      class="oge-bpmn-lint-badge"
                      [class.oge-bpmn-lint-error]="badge.severity === 'error'"
                      [class.oge-bpmn-lint-warning]="
                        badge.severity === 'warning'
                      "
                      [class.oge-bpmn-lint-info]="badge.severity === 'info'"
                      aria-hidden="true"
                      [attr.transform]="
                        'translate(' + badge.x + ' ' + badge.y + ')'
                      "
                    >
                      <circle r="8" />
                      <text y="4" text-anchor="middle">{{ badge.count }}</text>
                    </g>
                  }
                  @if (!core.locked()) {
                    <rect
                      class="oge-bpmn-shape-ring"
                      x="-4"
                      y="-4"
                      [attr.width]="n.width + 8"
                      [attr.height]="n.height + 8"
                      (pointerdown)="core.onRingPointerDown(n.id, $event)"
                    />
                  }
                </g>
              }
            </g>
            <g class="oge-bpmn-preview">
              @for (g of core.dragGhosts(); track g.id) {
                <rect
                  class="oge-bpmn-ghost"
                  [attr.x]="g.x"
                  [attr.y]="g.y"
                  [attr.width]="g.width"
                  [attr.height]="g.height"
                  rx="4"
                />
              }
              @for (guide of core.dragGuides(); track $index) {
                <line
                  class="oge-bpmn-snap-guide"
                  [attr.x1]="guide.x1"
                  [attr.y1]="guide.y1"
                  [attr.x2]="guide.x2"
                  [attr.y2]="guide.y2"
                />
              }
              @if (core.rubberView(); as points) {
                <polyline class="oge-bpmn-rubber-band" [attr.points]="points" />
              }
              @if (core.marquee(); as mq) {
                <rect
                  class="oge-bpmn-marquee"
                  [attr.x]="mq.x"
                  [attr.y]="mq.y"
                  [attr.width]="mq.width"
                  [attr.height]="mq.height"
                />
              }
              @if (core.bendPreview(); as points) {
                <polyline
                  class="oge-bpmn-bend-preview"
                  [attr.points]="points"
                />
              }
              @if (core.resizePreview(); as r) {
                <rect
                  class="oge-bpmn-ghost"
                  [attr.x]="r.x"
                  [attr.y]="r.y"
                  [attr.width]="r.width"
                  [attr.height]="r.height"
                  rx="4"
                />
              }
              @if (core.paletteDragGhost(); as g) {
                <rect
                  class="oge-bpmn-ghost"
                  [attr.x]="g.x"
                  [attr.y]="g.y"
                  [attr.width]="g.width"
                  [attr.height]="g.height"
                  rx="4"
                />
              }
              @if (core.labelDragGhost(); as g) {
                <rect
                  class="oge-bpmn-ghost"
                  [attr.x]="g.x"
                  [attr.y]="g.y"
                  [attr.width]="g.width"
                  [attr.height]="g.height"
                  rx="4"
                />
              }
            </g>
            <g class="oge-bpmn-handles">
              @for (r of core.selectionOutlines(); track r.id) {
                <rect
                  class="oge-bpmn-selection-outline"
                  [attr.x]="r.x"
                  [attr.y]="r.y"
                  [attr.width]="r.width"
                  [attr.height]="r.height"
                  rx="6"
                />
              }
              @for (h of core.bendHandles(); track $index) {
                <circle
                  class="oge-bpmn-bend-handle"
                  [attr.cx]="h.x"
                  [attr.cy]="h.y"
                  r="4"
                  (pointerdown)="
                    core.onBendPointerDown(h.edgeId, h.index, $event)
                  "
                  (dblclick)="core.onBendDblClick(h.edgeId, h.index, $event)"
                />
              }
              @for (h of core.resizeHandles(); track h.corner) {
                <rect
                  class="oge-bpmn-resize-handle"
                  [class.oge-bpmn-resize-nwse]="
                    h.corner === 'nw' || h.corner === 'se'
                  "
                  [class.oge-bpmn-resize-nesw]="
                    h.corner === 'ne' || h.corner === 'sw'
                  "
                  [attr.x]="h.x - 4"
                  [attr.y]="h.y - 4"
                  width="8"
                  height="8"
                  (pointerdown)="
                    core.onResizePointerDown(h.id, h.corner, $event)
                  "
                />
              }
            </g>
          </g>
        </svg>
        @if (core.diagram().order.length === 0) {
          <div class="oge-bpmn-empty">{{ core.msg().emptyText }}</div>
        }
        @if (core.padView(); as pad) {
          <div
            class="oge-bpmn-context-pad"
            [class.oge-bpmn-context-pad-left]="pad.side === 'left'"
            role="toolbar"
            [attr.aria-label]="pad.ariaLabel"
            [style.left.px]="pad.x"
            [style.top.px]="pad.y"
          >
            @if (pad.connect) {
              <button
                type="button"
                class="oge-bpmn-pad-btn"
                aria-keyshortcuts="C"
                [attr.aria-label]="core.msg().contextPad.connect"
                [title]="core.msg().contextPad.connect"
                (click)="core.onPadConnect(pad.id)"
              >
                <svg
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                  aria-hidden="true"
                >
                  <path d="M2 8h9M11 8l-3-3M11 8l-3 3" />
                </svg>
              </button>
            }
            @if (pad.append) {
              <button
                type="button"
                class="oge-bpmn-pad-btn"
                aria-keyshortcuts="A"
                [attr.aria-label]="core.msg().contextPad.appendTask"
                [title]="core.msg().contextPad.appendTask"
                (click)="core.onPadAppend(pad.id, 'task')"
              >
                <svg
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                  aria-hidden="true"
                >
                  <rect x="2" y="4" width="12" height="8" rx="2" />
                </svg>
              </button>
              <button
                type="button"
                class="oge-bpmn-pad-btn"
                [attr.aria-label]="core.msg().contextPad.appendGateway"
                [title]="core.msg().contextPad.appendGateway"
                (click)="core.onPadAppend(pad.id, 'exclusiveGateway')"
              >
                <svg
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                  aria-hidden="true"
                >
                  <path d="M8 2 14 8 8 14 2 8Z" />
                </svg>
              </button>
              <button
                type="button"
                class="oge-bpmn-pad-btn"
                [attr.aria-label]="core.msg().contextPad.appendEndEvent"
                [title]="core.msg().contextPad.appendEndEvent"
                (click)="core.onPadAppend(pad.id, 'endEvent')"
              >
                <svg
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                  aria-hidden="true"
                >
                  <circle cx="8" cy="8" r="5.5" stroke-width="2.4" />
                </svg>
              </button>
            }
            @if (pad.editLabel) {
              <button
                type="button"
                class="oge-bpmn-pad-btn"
                aria-keyshortcuts="F2"
                [attr.aria-label]="core.msg().contextPad.editLabel"
                [title]="core.msg().contextPad.editLabel"
                (click)="core.startLabelEdit(pad.id)"
              >
                <svg
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                  aria-hidden="true"
                >
                  <path d="M3 13h3l7-7-3-3-7 7zM9 4l3 3" />
                </svg>
              </button>
            }
            @if (pad.toggleDefault) {
              <button
                type="button"
                class="oge-bpmn-pad-btn"
                [class.oge-bpmn-pad-active]="pad.isDefault"
                [attr.aria-pressed]="pad.isDefault"
                [attr.aria-label]="core.msg().contextPad.toggleDefault"
                [title]="core.msg().contextPad.toggleDefault"
                (click)="core.onPadToggleDefault(pad.id)"
              >
                <svg
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                  aria-hidden="true"
                >
                  <path d="M2 12 14 4M5 12l4-8" />
                </svg>
              </button>
            }
            @for (custom of core.padEntries(); track custom.entry.id) {
              <button
                type="button"
                class="oge-bpmn-pad-btn oge-bpmn-pad-custom"
                [attr.data-entry]="custom.entry.id"
                [attr.aria-label]="custom.entry.label"
                [attr.aria-keyshortcuts]="custom.hotkey?.toUpperCase() ?? null"
                [title]="custom.entry.label"
                (click)="core.onPadEntry(custom.entry, pad.id)"
              >
                <svg
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                  aria-hidden="true"
                >
                  <svg:g ogeBpmnSvgNodes [nodes]="custom.icon" />
                </svg>
              </button>
            }
            <button
              type="button"
              class="oge-bpmn-pad-btn oge-bpmn-pad-danger"
              aria-keyshortcuts="Delete"
              [attr.aria-label]="core.msg().contextPad.deleteElement"
              [title]="core.msg().contextPad.deleteElement"
              (click)="core.deleteSelection()"
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path d="M3 5h10M6 5V3h4v2M5 5l1 8h4l1-8" />
              </svg>
            </button>
          </div>
        }
        @if (core.multiPadView(); as pad) {
          <div
            class="oge-bpmn-context-pad"
            [class.oge-bpmn-context-pad-left]="pad.side === 'left'"
            role="toolbar"
            [attr.aria-label]="core.msg().align.menuLabel"
            [style.left.px]="pad.x"
            [style.top.px]="pad.y"
          >
            <button
              type="button"
              class="oge-bpmn-pad-btn"
              [class.oge-bpmn-pad-active]="core.alignMenuOpen()"
              [attr.aria-expanded]="core.alignMenuOpen()"
              aria-haspopup="true"
              [attr.aria-label]="core.msg().align.menuLabel"
              [title]="core.msg().align.menuLabel"
              (click)="core.toggleAlignMenu()"
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path d="M2 2v12M5 5h9M5 11h6" />
              </svg>
            </button>
            <button
              type="button"
              class="oge-bpmn-pad-btn oge-bpmn-pad-danger"
              aria-keyshortcuts="Delete"
              [attr.aria-label]="core.msg().contextPad.deleteElement"
              [title]="core.msg().contextPad.deleteElement"
              (click)="core.deleteSelection()"
            >
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path d="M3 5h10M6 5V3h4v2M5 5l1 8h4l1-8" />
              </svg>
            </button>
            @if (core.alignMenuOpen()) {
              <div
                class="oge-bpmn-align-menu"
                role="toolbar"
                [attr.aria-label]="core.msg().align.menuLabel"
              >
                <button
                  type="button"
                  class="oge-bpmn-pad-btn"
                  [attr.aria-label]="core.msg().align.alignLeft"
                  [title]="core.msg().align.alignLeft"
                  (click)="core.onAlign(pad.ids, 'left')"
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                    aria-hidden="true"
                  >
                    <path d="M3 2v12M6 5h7M6 11h4" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="oge-bpmn-pad-btn"
                  [attr.aria-label]="core.msg().align.alignCenter"
                  [title]="core.msg().align.alignCenter"
                  (click)="core.onAlign(pad.ids, 'centerX')"
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                    aria-hidden="true"
                  >
                    <path d="M8 2v12M4 5h8M5.5 11h5" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="oge-bpmn-pad-btn"
                  [attr.aria-label]="core.msg().align.alignRight"
                  [title]="core.msg().align.alignRight"
                  (click)="core.onAlign(pad.ids, 'right')"
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                    aria-hidden="true"
                  >
                    <path d="M13 2v12M3 5h7M6 11h4" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="oge-bpmn-pad-btn"
                  [attr.aria-label]="core.msg().align.alignTop"
                  [title]="core.msg().align.alignTop"
                  (click)="core.onAlign(pad.ids, 'top')"
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                    aria-hidden="true"
                  >
                    <path d="M2 3h12M5 6v7M11 6v4" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="oge-bpmn-pad-btn"
                  [attr.aria-label]="core.msg().align.alignMiddle"
                  [title]="core.msg().align.alignMiddle"
                  (click)="core.onAlign(pad.ids, 'centerY')"
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                    aria-hidden="true"
                  >
                    <path d="M2 8h12M5 4v8M11 5.5v5" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="oge-bpmn-pad-btn"
                  [attr.aria-label]="core.msg().align.alignBottom"
                  [title]="core.msg().align.alignBottom"
                  (click)="core.onAlign(pad.ids, 'bottom')"
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                    aria-hidden="true"
                  >
                    <path d="M2 13h12M5 3v7M11 6v4" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="oge-bpmn-pad-btn"
                  [disabled]="pad.ids.length < 3"
                  [attr.aria-label]="core.msg().align.distributeHorizontal"
                  [title]="core.msg().align.distributeHorizontal"
                  (click)="core.onDistribute(pad.ids, 'x')"
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                    aria-hidden="true"
                  >
                    <path d="M2 2v12M14 2v12M6 5.5h4v5H6z" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="oge-bpmn-pad-btn"
                  [disabled]="pad.ids.length < 3"
                  [attr.aria-label]="core.msg().align.distributeVertical"
                  [title]="core.msg().align.distributeVertical"
                  (click)="core.onDistribute(pad.ids, 'y')"
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                    aria-hidden="true"
                  >
                    <path d="M2 2h12M2 14h12M5.5 6h5v4h-5z" />
                  </svg>
                </button>
              </div>
            }
          </div>
        }
        @if (core.searchOpen()) {
          <div class="oge-bpmn-search">
            <input
              #searchInput
              type="text"
              class="oge-bpmn-search-input"
              role="combobox"
              aria-autocomplete="list"
              [attr.aria-controls]="core.uid + '-search-list'"
              [attr.aria-expanded]="core.searchResults().length > 0"
              [attr.aria-activedescendant]="
                core.searchResults().length > 0
                  ? core.uid + '-search-' + core.searchActive()
                  : null
              "
              [attr.aria-label]="core.msg().search.label"
              [attr.placeholder]="core.msg().search.placeholder"
              [value]="core.searchQuery()"
              (input)="onSearchInput($event)"
              (keydown)="core.onSearchKeydown($event)"
            />
            @if (core.searchQuery().trim() !== '') {
              <ul
                class="oge-bpmn-search-results"
                role="listbox"
                [id]="core.uid + '-search-list'"
              >
                @for (r of core.searchResults(); track r.id; let i = $index) {
                  <li
                    role="option"
                    [id]="core.uid + '-search-' + i"
                    class="oge-bpmn-search-result"
                    [class.oge-bpmn-search-active]="i === core.searchActive()"
                    [attr.aria-selected]="i === core.searchActive()"
                    tabindex="-1"
                    (pointerdown)="$event.preventDefault()"
                    (click)="core.pickSearchResult(r.id)"
                    (keydown.enter)="core.pickSearchResult(r.id)"
                  >
                    <span class="oge-bpmn-search-name">{{ r.label }}</span>
                    <span class="oge-bpmn-search-id">{{ r.id }}</span>
                  </li>
                } @empty {
                  <li class="oge-bpmn-search-empty" role="presentation">
                    {{ core.msg().search.noResults }}
                  </li>
                }
              </ul>
            }
          </div>
        }
        @if (showMinimap() && core.minimapView(); as mm) {
          <div
            class="oge-bpmn-minimap"
            role="img"
            [attr.aria-label]="core.msg().minimapLabel"
          >
            <svg
              #minimapSvg
              viewBox="0 0 180 120"
              width="180"
              height="120"
              (pointerdown)="core.onMinimapPointerDown($event)"
            >
              @for (s of mm.shapes; track $index) {
                @switch (s.kind) {
                  @case ('circle') {
                    <circle
                      class="oge-bpmn-minimap-shape"
                      [attr.cx]="s.x + s.width / 2"
                      [attr.cy]="s.y + s.height / 2"
                      [attr.r]="s.width / 2"
                    />
                  }
                  @case ('diamond') {
                    <path
                      class="oge-bpmn-minimap-shape"
                      [attr.d]="
                        'M' +
                        (s.x + s.width / 2) +
                        ' ' +
                        s.y +
                        ' L' +
                        (s.x + s.width) +
                        ' ' +
                        (s.y + s.height / 2) +
                        ' L' +
                        (s.x + s.width / 2) +
                        ' ' +
                        (s.y + s.height) +
                        ' L' +
                        s.x +
                        ' ' +
                        (s.y + s.height / 2) +
                        ' Z'
                      "
                    />
                  }
                  @default {
                    <rect
                      class="oge-bpmn-minimap-shape"
                      [attr.x]="s.x"
                      [attr.y]="s.y"
                      [attr.width]="s.width"
                      [attr.height]="s.height"
                    />
                  }
                }
              }
              <rect
                class="oge-bpmn-minimap-viewport"
                [attr.x]="mm.viewport.x"
                [attr.y]="mm.viewport.y"
                [attr.width]="mm.viewport.width"
                [attr.height]="mm.viewport.height"
              />
            </svg>
          </div>
        }
        <!-- Branding — bare logo, no chrome; removable exclusively from code
             via [showBranding]="false" (never a license term, unlike bpmn-js). -->
        @if (showBranding()) {
          <a
            class="oge-bpmn-brand-link"
            href="https://www.ogeui.com"
            target="_blank"
            rel="noopener"
            [attr.aria-label]="core.msg().brandLabel"
            [title]="core.msg().brandLabel"
          >
            @if (core.brandLogoSrc(); as src) {
              <img class="oge-bpmn-brand-img" [src]="src" alt="" />
            } @else {
              <svg
                viewBox="0 0 20 20"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <circle cx="10" cy="10" r="7.5" />
                <path d="M10 6.5v3.5h3.5" />
              </svg>
            }
          </a>
        }
        @for (o of core.overlayViews(); track o.id) {
          <div
            class="oge-bpmn-overlay"
            [style.left.px]="o.x"
            [style.top.px]="o.y"
            [innerHTML]="o.html"
          ></div>
        }
        @if (core.labelEditView(); as edit) {
          <textarea
            #labelEdit
            class="oge-bpmn-label-edit"
            [style.left.px]="edit.x"
            [style.top.px]="edit.y"
            [style.width.px]="edit.width"
            [style.height.px]="edit.height"
            [style.fontSize.px]="edit.fontSize"
            [value]="core.editValue()"
            (input)="onLabelEditInput($event)"
            (keydown)="core.onLabelEditKeydown($event)"
            (blur)="core.onLabelEditBlur()"
          ></textarea>
        }
        <div class="oge-bpmn-live" aria-live="polite">
          {{ core.announcement() }}
        </div>
      </div>
      @if (
        showPropertiesPanel() && !core.locked() && !core.propertiesCollapsed()
      ) {
        <div
          class="oge-bpmn-resizer"
          role="separator"
          aria-orientation="vertical"
          tabindex="0"
          [attr.aria-label]="core.msg().propertiesResizeLabel"
          [attr.aria-valuemin]="core.PROPS_MIN"
          [attr.aria-valuemax]="core.PROPS_MAX"
          [attr.aria-valuenow]="core.propertiesWidth()"
          (pointerdown)="core.onPanelResizeStart($event, 'properties')"
          (keydown)="core.onPanelResizeKey($event, 'properties')"
        ></div>
        <oge-bpmn-properties
          [diagram]="core.diagram()"
          [selection]="core.selection()"
          [messages]="core.msg()"
          [colorPresets]="core.colorPresets()"
          [groups]="core.propertiesGroups()"
          [entryTemplates]="entryTemplateMap()"
          [style.inline-size.px]="core.propertiesWidth()"
          (commandRequested)="core.onPanelCommand($event)"
        />
      }
    </div>
    @if (lint() && core.problemsOpen()) {
      <section
        class="oge-bpmn-problems"
        role="region"
        tabindex="-1"
        [id]="core.uid + '-problems'"
        [attr.aria-label]="
          core.msg().canvasLabel + ' — ' + core.msg().lint.panelLabel
        "
      >
        <p class="oge-bpmn-problems-summary">
          {{ core.problemsView().summary }}
        </p>
        @if (core.problemsView().rows.length === 0) {
          <p class="oge-bpmn-problems-empty">{{ core.msg().lint.empty }}</p>
        } @else {
          <ul class="oge-bpmn-problems-list">
            @for (row of core.problemsView().rows; track row.issue.key) {
              <li>
                <button
                  type="button"
                  class="oge-bpmn-problem"
                  [class.oge-bpmn-problem-error]="
                    row.issue.severity === 'error'
                  "
                  [class.oge-bpmn-problem-warning]="
                    row.issue.severity === 'warning'
                  "
                  [class.oge-bpmn-problem-info]="row.issue.severity === 'info'"
                  [attr.data-element]="row.issue.elementId"
                  (click)="core.onProblemPick(row.issue)"
                >
                  {{ row.text }}
                </button>
              </li>
            }
          </ul>
        }
      </section>
    }
  `,
})
export class OgeBpmnEditor {
  private readonly config = inject(OGE_BPMN_CONFIG);
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Disables every mutation: palette, context pad, keyboard editing and drags. */
  readonly readOnly = input(false);
  /**
   * Current UI mode — two-way. `'view'` locks the editor exactly like
   * `readOnly`; the header offers a toggle when `allowModeToggle` is on.
   */
  readonly mode = model<'edit' | 'view'>('edit');
  /** Shows the edit/view toggle in the header (hidden while `readOnly`). */
  readonly allowModeToggle = input(false);
  /** Shows the header toolbar (name, undo/redo, zoom, panel and mode toggles). */
  readonly showHeader = input(true);
  /**
   * Shows the OGE badge in the canvas corner. Removable exclusively from
   * code (`false`) — branding here is a courtesy, never a license term
   * (unlike bpmn-js's mandatory watermark).
   */
  readonly showBranding = input(true);
  /** Badge image URL; `undefined` falls back to config, then the drawn mark. */
  readonly brandLogoUrl = input<string | undefined>(undefined);
  /** Shows the dotted background grid. */
  readonly gridVisible = input(true);
  /** Enables grid and neighbor-alignment snapping while moving and placing. */
  readonly snapEnabled = input(true);
  /** Palette items offered, in order; defaults to every placeable item. */
  readonly paletteItems = input<readonly BpmnPaletteItemType[]>(
    OGE_DEFAULT_BPMN_PALETTE_ITEMS,
  );
  /** Shows the right-side properties panel (always hidden in `readOnly`). */
  readonly showPropertiesPanel = input(true);
  /** Shows the bottom-right minimap overlay (hidden while the diagram is empty). */
  readonly showMinimap = input(true);
  /** Per-instance message overrides, merged over the DI config. */
  readonly messages = input<Partial<OgeBpmnMessages>>({});
  /** Two-way zoom factor; wheel zooming writes it back. */
  readonly zoom = model(1);
  /**
   * Live validation: badges on offending shapes (with the problem text in
   * their accessible name), a header toggle with the problem count, the
   * problems panel and `lintChanged`. `validate()` works either way.
   */
  readonly lint = input(false);
  /**
   * Validation rules added to, replacing or re-grading the built-ins —
   * `{ id: 'label-required', severity: 'off' }` disables one.
   */
  readonly lintRules = input<OgeBpmnLintRulesInput | undefined>(undefined);
  /**
   * Properties providers merged with the built-in ones by `id` (pass
   * `OGE_BPMN_CAMUNDA_PROVIDERS` for the Camunda / Zeebe fields).
   */
  readonly propertiesProviders = input<
    readonly OgeBpmnPropertiesProvider[] | undefined
  >(undefined);
  /** Custom palette entries (icon, label, hotkey, action). */
  readonly paletteProvider = input<OgeBpmnPaletteProvider | undefined>(
    undefined,
  );
  /** Custom context-pad actions of the selected element. */
  readonly contextPadProvider = input<OgeBpmnContextPadProvider | undefined>(
    undefined,
  );
  /** Per-type shape overrides drawn with the safe `bpmnSvg` builders. */
  readonly renderers = input<OgeBpmnRenderers | undefined>(undefined);

  /** The selection changed (user interaction or `select()`). */
  readonly selectionChanged = output<OgeBpmnSelectionEvent>();
  /** The diagram model changed: command, undo/redo, import or `newDiagram()`. */
  readonly elementsChanged = output<OgeBpmnElementsChangedEvent>();
  /** An `importXml()` call finished parsing; carries the fidelity warnings. */
  readonly importCompleted = output<OgeBpmnImportEvent>();
  /** The dirty state flipped (model diverged from / returned to the save point). */
  readonly dirtyChanged = output<boolean>();
  /**
   * Debounced autosave stream: after model changes settle for
   * `autoSaveDebounceMs` (default 500ms; `0` emits synchronously) the diagram
   * is serialized once to both JSON and XML and emitted together with the
   * change source. Emitted for every source including `import` and `new` —
   * filter on `source` to persist only user edits. No serialization happens
   * mid-drag (gestures commit one command on release); a pending emission is
   * cancelled on destroy.
   */
  readonly diagramChanged = output<OgeBpmnDiagramChangedEvent>();
  /** The live validation result changed (only while `lint` is on). */
  readonly lintChanged = output<OgeBpmnLintChangedEvent>();

  /** `<ng-template ogeBpmnPropertiesEntry="id">` templates of custom entries. */
  private readonly entryTemplates = contentChildren(
    OgeBpmnPropertiesEntryTemplate,
  );
  /** The custom-entry templates by entry id. */
  protected readonly entryTemplateMap = computed(
    () =>
      new Map(
        this.entryTemplates().map(
          (t) => [t.ogeBpmnPropertiesEntry(), t.template] as const,
        ),
      ),
  );

  private readonly wrapEl = viewChild<ElementRef<HTMLDivElement>>('wrap');
  private readonly labelEditEl =
    viewChild<ElementRef<HTMLTextAreaElement>>('labelEdit');
  private readonly searchInputEl =
    viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private readonly minimapSvgEl =
    viewChild<ElementRef<SVGSVGElement>>('minimapSvg');

  /**
   * The framework-free editor core (`@oge-ui/bpmn-engine`): every tool,
   * gesture, key, view model and public method below delegates to it — the
   * same class the React editor renders.
   */
  protected readonly core = new OgeBpmnEditorCore(SIGNAL_REACTIVITY, {
    uid: `oge-bpmn-${nextUid++}`,
    readOnly: () => this.readOnly(),
    mode: () => this.mode(),
    setMode: (mode) => this.mode.set(mode),
    snapEnabled: () => this.snapEnabled(),
    brandLogoUrl: () => this.brandLogoUrl(),
    messages: () => this.messages(),
    config: () => this.config,
    hostElement: () => this.hostRef.nativeElement,
    wrap: () => this.wrapEl()?.nativeElement ?? null,
    labelEdit: () => this.labelEditEl()?.nativeElement ?? null,
    searchInput: () => this.searchInputEl()?.nativeElement ?? null,
    minimapSvg: () => this.minimapSvgEl()?.nativeElement ?? null,
    emit: {
      selectionChanged: (event) => this.selectionChanged.emit(event),
      elementsChanged: (event) => this.elementsChanged.emit(event),
      importCompleted: (event) => this.importCompleted.emit(event),
      dirtyChanged: (dirty) => this.dirtyChanged.emit(dirty),
      diagramChanged: (event) => this.diagramChanged.emit(event),
      lintChanged: (event) => this.lintChanged.emit(event),
    },
    lint: () => this.lint(),
    lintRules: () => this.lintRules(),
    propertiesProviders: () => this.propertiesProviders(),
    paletteProvider: () => this.paletteProvider(),
    contextPadProvider: () => this.contextPadProvider(),
    renderers: () => this.renderers(),
  });

  /** Host binding: the effective lock (`readOnly` or `'view'` mode). */
  protected readonly locked = this.core.locked;
  /** Host binding: native fullscreen or the maximized fallback. */
  protected readonly maximized = this.core.maximized;

  constructor() {
    this.core.revive();
    this.destroyRef.onDestroy(() => this.core.destroy());
    // the host is attached only after the first render: read the chrome
    // direction (context-pad side, separator keys) from the page then
    afterNextRender(() => this.core.refreshDirection());
    // zoom model → viewport (zoom around the canvas center).
    effect(() => {
      const z = this.zoom();
      untracked(() => this.core.applyZoom(z));
    });
    // live validation → lintChanged (the core emits only on a real change)
    effect(() => {
      this.core.lintIssues();
      untracked(() => this.core.syncLint());
    });
    // viewport → zoom model.
    effect(() => {
      const v = this.core.vp();
      if (untracked(this.zoom) !== v.zoom) {
        this.zoom.set(v.zoom);
      }
    });
    // Overlay badges: Angular's sanitizing [innerHTML] keeps `target` and
    // `role`; apply the same two rules the engine's React tree applies — a
    // targeted link always carries rel="noopener noreferrer", and badge
    // markup cannot re-label itself with a role.
    afterRenderEffect(() => {
      this.core.overlayViews();
      const host = this.hostRef.nativeElement;
      host
        .querySelectorAll<HTMLAnchorElement>('.oge-bpmn-overlay a[target]')
        .forEach((link) => {
          const rel = bpmnOverlayLinkRel(link.getAttribute('rel'));
          if (link.getAttribute('rel') !== rel) link.setAttribute('rel', rel);
        });
      host
        .querySelectorAll('.oge-bpmn-overlay [role]')
        .forEach((element) => element.removeAttribute('role'));
    });
  }

  // ------------------------------------------------------------- public API

  /**
   * Parses BPMN XML and loads it into the editor, resetting undo history and
   * fitting the viewport. Resolves with the import result (model + warnings);
   * on a fatal parse error the current diagram is left untouched.
   */
  importXml(xml: string): Promise<BpmnImportResult> {
    return this.core.importXml(xml);
  }

  /** Serializes the current diagram to deterministic BPMN 2.0 XML. */
  exportXml(): string {
    return this.core.exportXml();
  }

  /** Wraps the current diagram in the versioned JSON persistence envelope. */
  exportJson(): BpmnDiagramJson {
    return this.core.exportJson();
  }

  /**
   * Validates a JSON persistence envelope (see `fromBpmnJson`) and loads it,
   * resetting undo history and fitting the viewport exactly like `importXml`.
   * On a validation error the current diagram is left untouched and the error
   * message is returned.
   */
  importJson(value: unknown): { error?: string } {
    return this.core.importJson(value);
  }

  /**
   * Renders the current diagram as a self-contained static SVG string
   * (neutral hardcoded colors, no grid or selection) via `renderDiagramSvg`.
   */
  exportSvg(): string {
    return this.core.exportSvg();
  }

  /**
   * Rasterizes the SVG export to a PNG blob (canvas, no library). Resolves
   * null where there is no canvas (server rendering, tests).
   */
  exportPng(options: OgeBpmnPngExportOptions = {}): Promise<Blob | null> {
    return rasterizeBpmnSvg(
      this.core.exportSvg(
        options.padding !== undefined ? { padding: options.padding } : {},
      ),
      options,
    );
  }

  /**
   * Validates the diagram against the effective rules and returns every
   * issue (whether or not `lint` is on; with it on, the problems panel opens).
   */
  validate(): readonly OgeBpmnLintIssue[] {
    return this.core.validate();
  }

  /** Replaces the diagram with an empty one and resets history and viewport. */
  newDiagram(): void {
    this.core.newDiagram();
  }

  /** Fits and centers the whole diagram in the canvas. */
  zoomToFit(): void {
    this.core.zoomToFit();
  }

  /** Selects the given element ids, pools included (unknown ids are ignored). */
  select(ids: readonly string[]): void {
    this.core.select(ids);
  }

  /** The currently selected element ids. */
  getSelection(): readonly string[] {
    return this.core.getSelection();
  }

  /** Deletes the selected elements (cascading to their attached edges). */
  deleteSelection(): void {
    this.core.deleteSelection();
  }

  /** Undoes the most recent command. */
  undo(): void {
    this.core.undo();
  }

  /** Re-applies the most recently undone command. */
  redo(): void {
    this.core.redo();
  }

  /** True when at least one command can be undone. */
  canUndo(): boolean {
    return this.core.canUndo();
  }

  /** True when at least one undone command can be redone. */
  canRedo(): boolean {
    return this.core.canRedo();
  }

  /** True when the model differs from the last save point. */
  isDirty(): boolean {
    return this.core.isDirty();
  }

  /** Marks the current model as saved; `isDirty()` reports false until it changes. */
  markSaved(): void {
    this.core.markSaved();
  }

  /** Moves keyboard focus onto the diagram canvas. */
  focus(): void {
    this.core.focus();
  }

  /**
   * Pans the viewport (keeping the current zoom) so the given element is
   * centered in the canvas. Unknown ids are ignored. Used by the element
   * search overlay; public for app-driven navigation.
   */
  centerOn(id: string): void {
    this.core.centerOn(id);
  }

  /**
   * Attaches an HTML badge to a diagram element (see {@link OgeBpmnOverlay})
   * and returns a handle for {@link removeOverlay}. The badge tracks the
   * element through pan/zoom and model changes; a dangling `elementId` hides
   * it without removing the registration. The `html` renders through
   * Angular's sanitizing `[innerHTML]` binding.
   */
  addOverlay(overlay: OgeBpmnOverlay): string {
    return this.core.addOverlay(overlay);
  }

  /** Removes the overlay registered under the given handle. Unknown handles are ignored. */
  removeOverlay(id: string): void {
    this.core.removeOverlay(id);
  }

  /**
   * Removes every registered overlay, or — when `elementId` is given — only
   * the overlays attached to that element.
   */
  clearOverlays(elementId?: string): void {
    this.core.clearOverlays(elementId);
  }

  // ------------------------------------------- template seams (native events)

  protected onHeaderNameChange(event: Event): void {
    this.core.onHeaderNameChange((event.target as HTMLInputElement).value);
  }

  protected onSearchInput(event: Event): void {
    this.core.onSearchInput((event.target as HTMLInputElement).value);
  }

  protected onLabelEditInput(event: Event): void {
    this.core.onLabelEditInput((event.target as HTMLTextAreaElement).value);
  }
}
