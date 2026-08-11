import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  computed,
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
  OGE_BPMN_CONFIG,
  OGE_DEFAULT_BPMN_COLOR_PRESETS,
  type BpmnPaletteItemType,
  type OgeBpmnMessages,
} from '../config';
import type {
  OgeBpmnChangeSource,
  OgeBpmnDiagramChangedEvent,
  OgeBpmnElementInfo,
  OgeBpmnElementsChangedEvent,
  OgeBpmnImportEvent,
  OgeBpmnOverlay,
  OgeBpmnSelectionEvent,
} from '../bpmn-types';
import type {
  BpmnDiagram,
  BpmnEdgeType,
  BpmnNodeType,
} from '../engine/bpmn-model';
import {
  DEFAULT_SIZES,
  MIN_SIZES,
  POOL_DEFAULT_SIZE,
  POOL_HEADER_WIDTH,
  POOL_MIN_SIZE,
  createEmptyDiagram,
  generateBpmnId,
  hiddenByCollapsed,
  idPrefixFor,
  isBpmnActivityType,
  isBpmnEventType,
  isBpmnSubProcessType,
  poolAtPoint,
  takenIds,
} from '../engine/bpmn-model';
import {
  activityMarkerPaths,
  collapsedMarkerPath,
  dataObjectPath,
  dataStorePath,
  eventDefinitionFilled,
  eventDefinitionPath,
} from '../engine/glyphs';
import type { BpmnCommand } from '../engine/command-stack';
import { BpmnCommandStack } from '../engine/command-stack';
import type { BpmnClipboard } from '../engine/commands';
import {
  addNodeCommand,
  addPoolCommand,
  alignElementsCommand,
  connectCommand,
  deleteElementsCommand,
  distributeElementsCommand,
  estimateLabelBounds,
  extractClipboard,
  makeSpaceCommand,
  moveElementsCommand,
  moveLabelCommand,
  pasteCommand,
  resizeNodeCommand,
  setDefaultFlowCommand,
  updateLabelCommand,
  updateProcessCommand,
  updateWaypointsCommand,
} from '../engine/commands';
import type { BpmnAlignMode, BpmnDistributeAxis } from '../engine/alignment';
import { edgeLabelAnchor, routeOrthogonal } from '../engine/edge-routing';
import type { Point, Rect } from '../engine/geometry';
import {
  boundsOfRects,
  distanceToSegment,
  edgeHitTest,
  inflateRect,
  rectContainsPoint,
  rectsIntersect,
  translateRect,
} from '../engine/geometry';
import type { BpmnDiagramJson } from '../engine/bpmn-json';
import { fromBpmnJson, toBpmnJson } from '../engine/bpmn-json';
import { renderDiagramSvg } from '../engine/svg-export';
import { connectionKindFor } from '../engine/rules';
import type { BpmnSnapGuide } from '../engine/snapping';
import { snapPoint, snapToNeighbors, snapValue } from '../engine/snapping';
import type { BpmnViewport } from '../engine/viewport';
import {
  diagramToScreen,
  fitViewport,
  screenToDiagram,
  zoomAt,
} from '../engine/viewport';
import type { BpmnImportResult } from '../engine/bpmn-xml-reader';
import { readBpmnXml } from '../engine/bpmn-xml-reader';
import { writeBpmnXml } from '../engine/bpmn-xml-writer';
import { OgeBpmnPalette } from './bpmn-palette';
import { OgeBpmnProperties } from './bpmn-properties';

/**
 * The active canvas tool: plain selection, click-then-place, connect, or one
 * of the v0.5 tool-strip modes (hand pan, explicit lasso, space tool, global
 * connect awaiting its source). Escape always returns to `select`.
 */
type BpmnTool =
  | { readonly kind: 'select' }
  | { readonly kind: 'place'; readonly nodeType: BpmnPaletteItemType }
  | { readonly kind: 'connect'; readonly sourceId: string }
  | { readonly kind: 'hand' }
  | { readonly kind: 'lasso' }
  | { readonly kind: 'space' }
  | { readonly kind: 'globalConnect' };

interface BpmnDragState {
  readonly ids: readonly string[];
  readonly dx: number;
  readonly dy: number;
  readonly moved: boolean;
  readonly guides: readonly BpmnSnapGuide[];
}

interface BpmnLabelLine {
  readonly text: string;
  readonly y: number;
}

interface BpmnNodeView {
  readonly id: string;
  readonly type: BpmnNodeType;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly glyph:
    | 'event'
    | 'task'
    | 'gateway'
    | 'annotation'
    | 'subprocess'
    | 'data'
    | 'group';
  readonly thick: boolean;
  /** Call activities render the task rect with the BPMN thick border. */
  readonly callActivity: boolean;
  /** Data object / data store glyph path (shape-local), or null. */
  readonly dataPath: string | null;
  readonly double: boolean;
  readonly dashed: boolean;
  readonly dotted: boolean;
  readonly transactionInner: boolean;
  readonly throwDot: boolean;
  readonly eventDefPath: string | null;
  readonly eventDefFilled: boolean;
  readonly collapsedPath: string | null;
  readonly markerPaths: readonly string[];
  readonly taskIcon: 'user' | 'service' | 'script' | null;
  readonly gatewayPath: string;
  readonly gatewayMark: string;
  readonly annotationPath: string;
  readonly lines: readonly BpmnLabelLine[];
  readonly labelX: number;
  readonly labelAnchor: 'middle' | 'start';
  /** True for below-shape labels (events/gateways/data) — draggable as their own hit target. */
  readonly externalLabel: boolean;
  readonly selected: boolean;
  readonly ariaLabel: string;
  readonly fill: string | null;
  readonly stroke: string | null;
}

interface BpmnLaneView {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly name: string;
  readonly nameX: number;
  readonly nameY: number;
  readonly nameTransform: string;
}

interface BpmnPoolView {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly name: string;
  readonly nameX: number;
  readonly nameY: number;
  readonly nameTransform: string;
  readonly lanes: readonly BpmnLaneView[];
  readonly selected: boolean;
  readonly ariaLabel: string;
  readonly fill: string | null;
  readonly stroke: string | null;
}

interface BpmnEdgeView {
  readonly id: string;
  readonly points: string;
  readonly kind: BpmnEdgeType;
  readonly association: boolean;
  /** Full `marker-end` url value, or null (associations have no arrowhead). */
  readonly markerEnd: string | null;
  /** First waypoint of a message flow (BPMN source circle), or null. */
  readonly sourceDot: Point | null;
  readonly label: string;
  readonly labelX: number;
  readonly labelY: number;
  readonly defaultMark: {
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
  } | null;
  readonly selected: boolean;
  readonly ariaLabel: string;
  readonly stroke: string | null;
}

/** The four corner handles of the resize gesture. */
type BpmnResizeCorner = 'nw' | 'ne' | 'se' | 'sw';

const ARROWS: Readonly<Record<string, readonly [number, number]>> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

const CHAR_WIDTH = 12 * 0.58;

function wrapLabel(text: string, maxWidth: number): string[] {
  const trimmed = text.trim();
  if (trimmed === '') {
    return [];
  }
  const maxChars = Math.max(4, Math.floor(maxWidth / CHAR_WIDTH));
  const words = trimmed.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  let truncated = false;
  for (const word of words) {
    const candidate = line === '' ? word : `${line} ${word}`;
    if (candidate.length <= maxChars || line === '') {
      line = candidate;
      continue;
    }
    if (lines.length === 2) {
      truncated = true;
      break;
    }
    lines.push(line);
    line = word;
  }
  if (line !== '' && lines.length < 3) {
    lines.push(line);
  }
  if (truncated) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = `${last.slice(0, Math.max(1, maxChars - 1))}…`;
  }
  return lines;
}

/**
 * All placeable items, in palette order. Event sub-processes and
 * transactions are reached by morphing a sub-process (panel type select);
 * `'pool'` creates a collaboration participant.
 */
const DEFAULT_PALETTE: readonly BpmnPaletteItemType[] = [
  'startEvent',
  'endEvent',
  'intermediateThrowEvent',
  'intermediateCatchEvent',
  'boundaryEvent',
  'task',
  'userTask',
  'serviceTask',
  'scriptTask',
  'callActivity',
  'subProcess',
  'exclusiveGateway',
  'parallelGateway',
  'dataObject',
  'dataStore',
  'group',
  'pool',
  'textAnnotation',
];

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
  imports: [OgeBpmnPalette, OgeBpmnProperties],
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
        [attr.aria-label]="msg().header.label"
      >
        <input
          class="oge-bpmn-header-name"
          type="text"
          spellcheck="false"
          autocomplete="off"
          [value]="diagram().processName ?? ''"
          [placeholder]="msg().header.namePlaceholder"
          [attr.aria-label]="msg().header.nameLabel"
          [disabled]="locked()"
          (change)="onHeaderNameChange($event)"
          (keydown)="$event.stopPropagation()"
        />
        <span class="oge-bpmn-header-spacer"></span>
        <button
          type="button"
          class="oge-bpmn-header-btn"
          aria-keyshortcuts="Control+Z"
          [disabled]="locked() || !canUndo()"
          [attr.aria-label]="msg().header.undo"
          [title]="msg().header.undo + ' (Ctrl+Z)'"
          (click)="undo()"
        >
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <path d="M8 5 4 9l4 4M4 9h7a5 5 0 0 1 0 10h-1" />
          </svg>
        </button>
        <button
          type="button"
          class="oge-bpmn-header-btn"
          aria-keyshortcuts="Control+Y"
          [disabled]="locked() || !canRedo()"
          [attr.aria-label]="msg().header.redo"
          [title]="msg().header.redo + ' (Ctrl+Y)'"
          (click)="redo()"
        >
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <path d="m12 5 4 4-4 4M16 9H9a5 5 0 0 0 0 10h1" />
          </svg>
        </button>
        <span class="oge-bpmn-header-sep" aria-hidden="true"></span>
        <button
          type="button"
          class="oge-bpmn-header-btn"
          [attr.aria-label]="msg().header.zoomOut"
          [title]="msg().header.zoomOut"
          (click)="zoomStep(1 / 1.2)"
        >
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <path d="M4 10h12" />
          </svg>
        </button>
        <button
          type="button"
          class="oge-bpmn-header-btn oge-bpmn-header-zoom"
          [attr.aria-label]="msg().header.zoomFit"
          [title]="msg().header.zoomFit + ' (F)'"
          (click)="zoomToFit()"
        >
          {{ zoomPercent() }}%
        </button>
        <button
          type="button"
          class="oge-bpmn-header-btn"
          [attr.aria-label]="msg().header.zoomIn"
          [title]="msg().header.zoomIn"
          (click)="zoomStep(1.2)"
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
              mode() === 'edit' ? msg().header.modeView : msg().header.modeEdit
            "
            [title]="
              mode() === 'edit' ? msg().header.modeView : msg().header.modeEdit
            "
            (click)="toggleMode()"
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
        @if (showPropertiesPanel() && !locked()) {
          <button
            type="button"
            class="oge-bpmn-header-btn"
            [attr.aria-pressed]="!propertiesCollapsed()"
            [attr.aria-label]="msg().header.panelToggle"
            [title]="msg().header.panelToggle"
            (click)="togglePropertiesPanel()"
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
          [attr.aria-pressed]="maximized()"
          [attr.aria-label]="
            maximized()
              ? msg().header.fullscreenExit
              : msg().header.fullscreenEnter
          "
          [title]="
            maximized()
              ? msg().header.fullscreenExit
              : msg().header.fullscreenEnter
          "
          (click)="toggleFullscreen()"
        >
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            @if (maximized()) {
              <path d="M8 3v5H3M12 3v5h5M8 17v-5H3M12 17v-5h5" />
            } @else {
              <path d="M3 8V3h5M17 8V3h-5M3 12v5h5M17 12v5h-5" />
            }
          </svg>
        </button>
      </div>
    }
    <div class="oge-bpmn-body">
      <div class="oge-bpmn-rail" [style.inline-size.px]="railWidth()">
        <!-- A viewer renders no palette at all: an all-disabled scrollable
           toolbar is dead chrome and an axe scrollable-region violation. -->
        @if (!locked()) {
          <oge-bpmn-palette
            [items]="paletteItems()"
            [labels]="msg().paletteLabels"
            [activeType]="paletteActive()"
            [label]="msg().paletteLabel"
            (toolPicked)="onToolPicked($event)"
            (dragStarted)="onPaletteDragStart($event)"
          />
        }
        <div
          class="oge-bpmn-toolstrip"
          role="toolbar"
          aria-orientation="vertical"
          [attr.aria-label]="msg().tools.label"
        >
          <button
            type="button"
            class="oge-bpmn-tool-btn"
            aria-keyshortcuts="H"
            [class.oge-bpmn-tool-active]="tool().kind === 'hand'"
            [attr.aria-pressed]="tool().kind === 'hand'"
            [attr.aria-label]="msg().tools.hand"
            [title]="msg().tools.hand + ' (H)'"
            (click)="onStripTool('hand')"
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
            [class.oge-bpmn-tool-active]="tool().kind === 'lasso'"
            [attr.aria-pressed]="tool().kind === 'lasso'"
            [attr.aria-label]="msg().tools.lasso"
            [title]="msg().tools.lasso + ' (L)'"
            (click)="onStripTool('lasso')"
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
            [class.oge-bpmn-tool-active]="tool().kind === 'space'"
            [attr.aria-pressed]="tool().kind === 'space'"
            [attr.aria-label]="msg().tools.space"
            [title]="msg().tools.space + ' (S)'"
            [disabled]="locked()"
            (click)="onStripTool('space')"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M12 4v16M7 9 4 12l3 3M17 9l3 3-3 3M4 12h5M15 12h5" />
            </svg>
          </button>
          <button
            type="button"
            class="oge-bpmn-tool-btn"
            [class.oge-bpmn-tool-active]="tool().kind === 'globalConnect'"
            [attr.aria-pressed]="tool().kind === 'globalConnect'"
            [attr.aria-label]="msg().tools.globalConnect"
            [title]="msg().tools.globalConnect"
            [disabled]="locked()"
            (click)="onStripTool('globalConnect')"
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
            [class.oge-bpmn-tool-active]="searchOpen()"
            [attr.aria-pressed]="searchOpen()"
            [attr.aria-label]="msg().tools.search"
            [title]="msg().tools.search + ' (Ctrl+F)'"
            (click)="toggleSearch()"
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
        [attr.aria-label]="msg().railResizeLabel"
        [attr.aria-valuemin]="RAIL_MIN"
        [attr.aria-valuemax]="RAIL_MAX"
        [attr.aria-valuenow]="railWidth()"
        (pointerdown)="onPanelResizeStart($event, 'rail')"
        (keydown)="onPanelResizeKey($event, 'rail')"
      ></div>
      <div
        #wrap
        class="oge-bpmn-canvas-wrap"
        tabindex="0"
        role="application"
        [attr.aria-label]="canvasAriaLabel()"
        [attr.aria-roledescription]="msg().canvasLabel"
        [attr.aria-activedescendant]="activeDescendant()"
        [attr.aria-keyshortcuts]="keyShortcuts"
        (keydown)="onCanvasKeydown($event)"
        (keyup)="onCanvasKeyup($event)"
        (focus)="onCanvasFocus()"
      >
        <svg
          class="oge-bpmn-canvas"
          [class.oge-bpmn-tool-place]="tool().kind === 'place'"
          [class.oge-bpmn-tool-connect]="
            tool().kind === 'connect' || tool().kind === 'globalConnect'
          "
          [class.oge-bpmn-tool-hand]="tool().kind === 'hand'"
          [class.oge-bpmn-tool-lasso]="tool().kind === 'lasso'"
          [class.oge-bpmn-tool-space]="tool().kind === 'space'"
          (pointerdown)="onCanvasPointerDown($event)"
          (pointermove)="onCanvasPointerMove($event)"
          (wheel)="onWheel($event)"
        >
          <defs>
            <pattern
              [attr.id]="uid + '-grid'"
              patternUnits="userSpaceOnUse"
              [attr.width]="gridSize()"
              [attr.height]="gridSize()"
            >
              <circle class="oge-bpmn-grid-dot" cx="1" cy="1" r="1" />
            </pattern>
            <marker
              [attr.id]="uid + '-arrow'"
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
              [attr.id]="uid + '-open-arrow'"
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
          <g class="oge-bpmn-viewport" [attr.transform]="viewportTransform()">
            @if (gridVisible()) {
              <rect
                class="oge-bpmn-grid"
                x="-10000"
                y="-10000"
                width="20000"
                height="20000"
                [attr.fill]="'url(#' + uid + '-grid)'"
              />
            }
            <g class="oge-bpmn-pools">
              @for (p of poolViews(); track p.id) {
                <g
                  class="oge-bpmn-pool"
                  [class.oge-bpmn-dimmed]="dimmedIds().has(p.id)"
                  [class.oge-bpmn-selected]="p.selected"
                  [class.oge-bpmn-drop-ok]="
                    connectHover()?.id === p.id &&
                    connectHover()?.allowed === true
                  "
                  [class.oge-bpmn-drop-deny]="
                    connectHover()?.id === p.id &&
                    connectHover()?.allowed === false
                  "
                  [attr.id]="uid + '-el-' + p.id"
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
                    [attr.width]="poolHeaderWidth"
                    [attr.height]="p.height"
                    (pointerdown)="onShapePointerDown(p.id, $event)"
                    (dblclick)="startLabelEdit(p.id)"
                  />
                  <rect
                    class="oge-bpmn-pool-border"
                    [attr.x]="p.x"
                    [attr.y]="p.y"
                    [attr.width]="p.width"
                    [attr.height]="p.height"
                    (pointerdown)="onShapePointerDown(p.id, $event)"
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
                </g>
              }
            </g>
            <g class="oge-bpmn-edges">
              @for (e of edgeViews(); track e.id) {
                <g
                  class="oge-bpmn-edge"
                  [class.oge-bpmn-dimmed]="dimmedIds().has(e.id)"
                  [class.oge-bpmn-selected]="e.selected"
                  [class.oge-bpmn-association]="e.association"
                  [class.oge-bpmn-message-flow]="e.kind === 'messageFlow'"
                  [class.oge-bpmn-data-association]="
                    e.kind === 'dataAssociation'
                  "
                  [attr.id]="uid + '-el-' + e.id"
                  role="img"
                  [attr.aria-label]="e.ariaLabel"
                  (pointerdown)="onEdgePointerDown(e.id, $event)"
                  (dblclick)="onEdgeDblClick(e.id, $event)"
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
                      [class.oge-bpmn-label-external]="!locked()"
                      [attr.data-owner]="e.id"
                      [attr.x]="e.labelX"
                      [attr.y]="e.labelY"
                      (pointerdown)="onLabelPointerDown(e.id, $event)"
                    >
                      {{ e.label }}
                    </text>
                  }
                </g>
              }
            </g>
            <g class="oge-bpmn-shapes">
              @for (n of nodeViews(); track n.id) {
                <g
                  class="oge-bpmn-shape"
                  [class.oge-bpmn-dimmed]="dimmedIds().has(n.id)"
                  [class.oge-bpmn-selected]="n.selected"
                  [class.oge-bpmn-drop-ok]="
                    (connectHover()?.id === n.id &&
                      connectHover()?.allowed === true) ||
                    attachHover() === n.id
                  "
                  [class.oge-bpmn-drop-deny]="
                    connectHover()?.id === n.id &&
                    connectHover()?.allowed === false
                  "
                  [attr.id]="uid + '-el-' + n.id"
                  role="img"
                  [attr.aria-label]="n.ariaLabel"
                  [attr.transform]="'translate(' + n.x + ' ' + n.y + ')'"
                  (pointerdown)="onShapePointerDown(n.id, $event)"
                  (dblclick)="startLabelEdit(n.id)"
                >
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
                            <path d="M14 7.5v3M14 17.5v3M7.5 14h3M17.5 14h3" />
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
                        n.externalLabel && !locked()
                      "
                      [attr.data-owner]="n.externalLabel ? n.id : null"
                      [attr.x]="n.labelX"
                      [attr.y]="line.y"
                      [attr.text-anchor]="n.labelAnchor"
                      (pointerdown)="
                        n.externalLabel
                          ? onLabelPointerDown(n.id, $event)
                          : null
                      "
                    >
                      {{ line.text }}
                    </text>
                  }
                  @if (!locked()) {
                    <rect
                      class="oge-bpmn-shape-ring"
                      x="-4"
                      y="-4"
                      [attr.width]="n.width + 8"
                      [attr.height]="n.height + 8"
                      (pointerdown)="onRingPointerDown(n.id, $event)"
                    />
                  }
                </g>
              }
            </g>
            <g class="oge-bpmn-preview">
              @for (g of dragGhosts(); track g.id) {
                <rect
                  class="oge-bpmn-ghost"
                  [attr.x]="g.x"
                  [attr.y]="g.y"
                  [attr.width]="g.width"
                  [attr.height]="g.height"
                  rx="4"
                />
              }
              @for (guide of dragGuides(); track $index) {
                <line
                  class="oge-bpmn-snap-guide"
                  [attr.x1]="guide.x1"
                  [attr.y1]="guide.y1"
                  [attr.x2]="guide.x2"
                  [attr.y2]="guide.y2"
                />
              }
              @if (rubberView(); as points) {
                <polyline class="oge-bpmn-rubber-band" [attr.points]="points" />
              }
              @if (marquee(); as mq) {
                <rect
                  class="oge-bpmn-marquee"
                  [attr.x]="mq.x"
                  [attr.y]="mq.y"
                  [attr.width]="mq.width"
                  [attr.height]="mq.height"
                />
              }
              @if (bendPreview(); as points) {
                <polyline
                  class="oge-bpmn-bend-preview"
                  [attr.points]="points"
                />
              }
              @if (resizePreview(); as r) {
                <rect
                  class="oge-bpmn-ghost"
                  [attr.x]="r.x"
                  [attr.y]="r.y"
                  [attr.width]="r.width"
                  [attr.height]="r.height"
                  rx="4"
                />
              }
              @if (paletteDragGhost(); as g) {
                <rect
                  class="oge-bpmn-ghost"
                  [attr.x]="g.x"
                  [attr.y]="g.y"
                  [attr.width]="g.width"
                  [attr.height]="g.height"
                  rx="4"
                />
              }
              @if (labelDragGhost(); as g) {
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
              @for (r of selectionOutlines(); track r.id) {
                <rect
                  class="oge-bpmn-selection-outline"
                  [attr.x]="r.x"
                  [attr.y]="r.y"
                  [attr.width]="r.width"
                  [attr.height]="r.height"
                  rx="6"
                />
              }
              @for (h of bendHandles(); track $index) {
                <circle
                  class="oge-bpmn-bend-handle"
                  [attr.cx]="h.x"
                  [attr.cy]="h.y"
                  r="4"
                  (pointerdown)="onBendPointerDown(h.edgeId, h.index, $event)"
                  (dblclick)="onBendDblClick(h.edgeId, h.index, $event)"
                />
              }
              @for (h of resizeHandles(); track h.corner) {
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
                  (pointerdown)="onResizePointerDown(h.id, h.corner, $event)"
                />
              }
            </g>
          </g>
        </svg>
        @if (diagram().order.length === 0) {
          <div class="oge-bpmn-empty">{{ msg().emptyText }}</div>
        }
        @if (padView(); as pad) {
          <div
            class="oge-bpmn-context-pad"
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
                [attr.aria-label]="msg().contextPad.connect"
                [title]="msg().contextPad.connect"
                (click)="onPadConnect(pad.id)"
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
                [attr.aria-label]="msg().contextPad.appendTask"
                [title]="msg().contextPad.appendTask"
                (click)="onPadAppend(pad.id, 'task')"
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
                [attr.aria-label]="msg().contextPad.appendGateway"
                [title]="msg().contextPad.appendGateway"
                (click)="onPadAppend(pad.id, 'exclusiveGateway')"
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
                [attr.aria-label]="msg().contextPad.appendEndEvent"
                [title]="msg().contextPad.appendEndEvent"
                (click)="onPadAppend(pad.id, 'endEvent')"
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
                [attr.aria-label]="msg().contextPad.editLabel"
                [title]="msg().contextPad.editLabel"
                (click)="startLabelEdit(pad.id)"
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
                [attr.aria-label]="msg().contextPad.toggleDefault"
                [title]="msg().contextPad.toggleDefault"
                (click)="onPadToggleDefault(pad.id)"
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
            <button
              type="button"
              class="oge-bpmn-pad-btn oge-bpmn-pad-danger"
              aria-keyshortcuts="Delete"
              [attr.aria-label]="msg().contextPad.deleteElement"
              [title]="msg().contextPad.deleteElement"
              (click)="deleteSelection()"
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
        @if (multiPadView(); as pad) {
          <div
            class="oge-bpmn-context-pad"
            role="toolbar"
            [attr.aria-label]="msg().align.menuLabel"
            [style.left.px]="pad.x"
            [style.top.px]="pad.y"
          >
            <button
              type="button"
              class="oge-bpmn-pad-btn"
              [class.oge-bpmn-pad-active]="alignMenuOpen()"
              [attr.aria-expanded]="alignMenuOpen()"
              aria-haspopup="true"
              [attr.aria-label]="msg().align.menuLabel"
              [title]="msg().align.menuLabel"
              (click)="alignMenuOpen.set(!alignMenuOpen())"
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
              [attr.aria-label]="msg().contextPad.deleteElement"
              [title]="msg().contextPad.deleteElement"
              (click)="deleteSelection()"
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
            @if (alignMenuOpen()) {
              <div
                class="oge-bpmn-align-menu"
                role="toolbar"
                [attr.aria-label]="msg().align.menuLabel"
              >
                <button
                  type="button"
                  class="oge-bpmn-pad-btn"
                  [attr.aria-label]="msg().align.alignLeft"
                  [title]="msg().align.alignLeft"
                  (click)="onAlign(pad.ids, 'left')"
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
                  [attr.aria-label]="msg().align.alignCenter"
                  [title]="msg().align.alignCenter"
                  (click)="onAlign(pad.ids, 'centerX')"
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
                  [attr.aria-label]="msg().align.alignRight"
                  [title]="msg().align.alignRight"
                  (click)="onAlign(pad.ids, 'right')"
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
                  [attr.aria-label]="msg().align.alignTop"
                  [title]="msg().align.alignTop"
                  (click)="onAlign(pad.ids, 'top')"
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
                  [attr.aria-label]="msg().align.alignMiddle"
                  [title]="msg().align.alignMiddle"
                  (click)="onAlign(pad.ids, 'centerY')"
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
                  [attr.aria-label]="msg().align.alignBottom"
                  [title]="msg().align.alignBottom"
                  (click)="onAlign(pad.ids, 'bottom')"
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
                  [attr.aria-label]="msg().align.distributeHorizontal"
                  [title]="msg().align.distributeHorizontal"
                  (click)="onDistribute(pad.ids, 'x')"
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
                  [attr.aria-label]="msg().align.distributeVertical"
                  [title]="msg().align.distributeVertical"
                  (click)="onDistribute(pad.ids, 'y')"
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
        @if (searchOpen()) {
          <div class="oge-bpmn-search">
            <input
              #searchInput
              type="text"
              class="oge-bpmn-search-input"
              role="combobox"
              aria-autocomplete="list"
              [attr.aria-controls]="uid + '-search-list'"
              [attr.aria-expanded]="searchResults().length > 0"
              [attr.aria-activedescendant]="
                searchResults().length > 0
                  ? uid + '-search-' + searchActive()
                  : null
              "
              [attr.aria-label]="msg().search.label"
              [attr.placeholder]="msg().search.placeholder"
              [value]="searchQuery()"
              (input)="onSearchInput($event)"
              (keydown)="onSearchKeydown($event)"
            />
            @if (searchQuery().trim() !== '') {
              <ul
                class="oge-bpmn-search-results"
                role="listbox"
                [id]="uid + '-search-list'"
              >
                @for (r of searchResults(); track r.id; let i = $index) {
                  <li
                    role="option"
                    [id]="uid + '-search-' + i"
                    class="oge-bpmn-search-result"
                    [class.oge-bpmn-search-active]="i === searchActive()"
                    [attr.aria-selected]="i === searchActive()"
                    tabindex="-1"
                    (pointerdown)="$event.preventDefault()"
                    (click)="pickSearchResult(r.id)"
                    (keydown.enter)="pickSearchResult(r.id)"
                  >
                    <span class="oge-bpmn-search-name">{{ r.label }}</span>
                    <span class="oge-bpmn-search-id">{{ r.id }}</span>
                  </li>
                } @empty {
                  <li class="oge-bpmn-search-empty" role="presentation">
                    {{ msg().search.noResults }}
                  </li>
                }
              </ul>
            }
          </div>
        }
        @if (showMinimap() && minimapView(); as mm) {
          <div
            class="oge-bpmn-minimap"
            role="img"
            [attr.aria-label]="msg().minimapLabel"
          >
            <svg
              #minimapSvg
              viewBox="0 0 180 120"
              width="180"
              height="120"
              (pointerdown)="onMinimapPointerDown($event)"
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
            href="https://ogeui.com"
            target="_blank"
            rel="noopener"
            [attr.aria-label]="msg().brandLabel"
            [title]="msg().brandLabel"
          >
            @if (brandLogoSrc(); as src) {
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
        @for (o of overlayViews(); track o.id) {
          <div
            class="oge-bpmn-overlay"
            [style.left.px]="o.x"
            [style.top.px]="o.y"
            [innerHTML]="o.html"
          ></div>
        }
        @if (labelEditView(); as edit) {
          <textarea
            #labelEdit
            class="oge-bpmn-label-edit"
            [style.left.px]="edit.x"
            [style.top.px]="edit.y"
            [style.width.px]="edit.width"
            [style.height.px]="edit.height"
            [style.fontSize.px]="edit.fontSize"
            [value]="editValue"
            (input)="onLabelEditInput($event)"
            (keydown)="onLabelEditKeydown($event)"
            (blur)="onLabelEditBlur()"
          ></textarea>
        }
        <div class="oge-bpmn-live" aria-live="polite">{{ announcement() }}</div>
      </div>
      @if (showPropertiesPanel() && !locked() && !propertiesCollapsed()) {
        <div
          class="oge-bpmn-resizer"
          role="separator"
          aria-orientation="vertical"
          tabindex="0"
          [attr.aria-label]="msg().propertiesResizeLabel"
          [attr.aria-valuemin]="PROPS_MIN"
          [attr.aria-valuemax]="PROPS_MAX"
          [attr.aria-valuenow]="propertiesWidth()"
          (pointerdown)="onPanelResizeStart($event, 'properties')"
          (keydown)="onPanelResizeKey($event, 'properties')"
        ></div>
        <oge-bpmn-properties
          [diagram]="diagram()"
          [selection]="selection()"
          [messages]="msg()"
          [colorPresets]="colorPresets()"
          [style.inline-size.px]="propertiesWidth()"
          (commandRequested)="onPanelCommand($event)"
        />
      }
    </div>
  `,
})
export class OgeBpmnEditor {
  private readonly config = inject(OGE_BPMN_CONFIG);
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Unique per-instance prefix for element and defs ids. */
  protected readonly uid = `oge-bpmn-${nextUid++}`;
  /** Shortcuts advertised on the canvas via `aria-keyshortcuts`. */
  protected readonly keyShortcuts =
    'Control+Z Control+Y Control+C Control+X Control+V Control+A Control+F Delete F2 Enter C A F H L S + -';

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
  /** The badge image source resolved through the config chain. */
  protected readonly brandLogoSrc = computed(
    () => this.brandLogoUrl() ?? this.config.brandLogoUrl,
  );
  /**
   * The effective lock — the `readOnly` input or the `'view'` mode. Every
   * mutating surface checks this, never `readOnly` alone.
   */
  protected readonly locked = computed(
    () => this.readOnly() || this.mode() === 'view',
  );
  /** Shows the dotted background grid. */
  readonly gridVisible = input(true);
  /** Enables grid and neighbor-alignment snapping while moving and placing. */
  readonly snapEnabled = input(true);
  /** Palette items offered, in order; defaults to `DEFAULT_PALETTE`. */
  readonly paletteItems =
    input<readonly BpmnPaletteItemType[]>(DEFAULT_PALETTE);
  /** Shows the right-side properties panel (always hidden in `readOnly`). */
  readonly showPropertiesPanel = input(true);
  /** Shows the bottom-right minimap overlay (hidden while the diagram is empty). */
  readonly showMinimap = input(true);
  /** Per-instance message overrides, merged over the DI config. */
  readonly messages = input<Partial<OgeBpmnMessages>>({});
  /** Two-way zoom factor; wheel zooming writes it back. */
  readonly zoom = model(1);

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

  private readonly stack = new BpmnCommandStack(createEmptyDiagram());
  /** The current diagram model as a signal (synced from the command stack). */
  protected readonly diagram = signal<BpmnDiagram>(this.stack.current);
  /** Pan/zoom of the canvas. */
  protected readonly vp = signal<BpmnViewport>({ x: 0, y: 0, zoom: 1 });
  /** The selected element ids (read by the template and the properties panel). */
  protected readonly selection = signal<readonly string[]>([]);
  /** The active tool of the canvas. */
  protected readonly tool = signal<BpmnTool>({ kind: 'select' });
  /** Transient move-drag state; pointermove writes only this signal. */
  protected readonly dragState = signal<BpmnDragState | null>(null);
  /** Connect-tool preview endpoint in diagram coordinates. */
  protected readonly rubberBand = signal<Point | null>(null);
  /** Connect-tool hover target and whether the connection would be allowed. */
  protected readonly connectHover = signal<{
    readonly id: string;
    readonly allowed: boolean;
  } | null>(null);
  /** Activity whose border the armed boundary-event place tool would attach to. */
  protected readonly attachHover = signal<string | null>(null);
  /** Marquee-selection rectangle in diagram coordinates, or null. */
  protected readonly marquee = signal<Rect | null>(null);
  /** Ghost polyline points of an in-flight bend-point drag, or null. */
  protected readonly bendPreview = signal<string | null>(null);
  /** Ghost bounds of an in-flight corner-resize drag, or null. */
  protected readonly resizePreview = signal<Rect | null>(null);
  /** Id of the element whose label is being edited inline, or null. */
  protected readonly editingLabelId = signal<string | null>(null);
  /** Ghost bounds of an in-flight palette drag-to-canvas gesture, or null. */
  protected readonly paletteDragGhost = signal<Rect | null>(null);
  /** Ghost bounds of an in-flight external-label drag, or null. */
  protected readonly labelDragGhost = signal<Rect | null>(null);
  /** Whether the element search overlay is open. */
  protected readonly searchOpen = signal(false);
  /** Live query of the element search overlay. */
  protected readonly searchQuery = signal('');
  /** Index of the keyboard-active search result. */
  protected readonly searchActive = signal(0);
  /** Whether the align/distribute flyout of the multi-selection pad is open. */
  protected readonly alignMenuOpen = signal(false);
  /** Registered HTML overlays (badges), keyed by their generated handle. */
  private readonly overlayDefs = signal<
    readonly { readonly id: string; readonly def: OgeBpmnOverlay }[]
  >([]);
  private overlayCounter = 0;
  /** Current live-region announcement text. */
  protected readonly announcement = signal('');

  // --- panel widths (user-resizable rails, session-scoped) -------------------

  protected readonly RAIL_MIN = 48;
  protected readonly RAIL_MAX = 320;
  protected readonly PROPS_MIN = 180;
  protected readonly PROPS_MAX = 480;
  /** Width of the palette/tool rail; adjustable via its separator. */
  protected readonly railWidth = signal(64);
  /** Width of the properties panel; adjustable via its separator. */
  protected readonly propertiesWidth = signal(240);

  // --- header toolbar state --------------------------------------------------

  /** The properties panel's header-toggle collapse (session-scoped). */
  protected readonly propertiesCollapsed = signal(false);
  /** Fullscreen (native) or maximized-fallback state. */
  protected readonly maximized = signal(false);
  /** Current zoom as a whole percentage for the header display. */
  protected readonly zoomPercent = computed(() =>
    Math.round(this.vp().zoom * 100),
  );

  protected togglePropertiesPanel(): void {
    this.propertiesCollapsed.update((collapsed) => !collapsed);
  }

  protected toggleMode(): void {
    this.mode.set(this.mode() === 'edit' ? 'view' : 'edit');
  }

  protected onHeaderNameChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    this.stack.execute(
      updateProcessCommand({ name: value.length > 0 ? value : undefined }),
    );
  }

  /**
   * Native fullscreen when the platform offers it, a fixed-position
   * maximized fallback otherwise (some embeds deny the Fullscreen API).
   */
  protected toggleFullscreen(): void {
    const host = this.hostRef.nativeElement as HTMLElement & {
      requestFullscreen?: () => Promise<void>;
    };
    if (this.maximized()) {
      if (document.fullscreenElement === host) {
        void document.exitFullscreen?.();
      }
      this.maximized.set(false);
      return;
    }
    if (typeof host.requestFullscreen === 'function') {
      host
        .requestFullscreen()
        .then(() => this.maximized.set(true))
        .catch(() => this.maximized.set(true)); // fallback class still applies
    } else {
      this.maximized.set(true);
    }
  }

  private panelWidthSignal(panel: 'rail' | 'properties') {
    return panel === 'rail' ? this.railWidth : this.propertiesWidth;
  }

  private panelWidthBounds(panel: 'rail' | 'properties'): [number, number] {
    return panel === 'rail'
      ? [this.RAIL_MIN, this.RAIL_MAX]
      : [this.PROPS_MIN, this.PROPS_MAX];
  }

  /** Separator drag — the splitter's gesture idiom (Escape restores). */
  protected onPanelResizeStart(
    event: PointerEvent,
    panel: 'rail' | 'properties',
  ): void {
    if (event.button !== 0) return;
    event.preventDefault();
    const width = this.panelWidthSignal(panel);
    const [min, max] = this.panelWidthBounds(panel);
    const startX = event.clientX;
    const startWidth = width();
    // the properties panel sits on the right — dragging left widens it
    const direction = panel === 'rail' ? 1 : -1;
    const target = event.target as HTMLElement | null;
    if (target && typeof target.setPointerCapture === 'function') {
      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        /* jsdom — capture is a progressive enhancement */
      }
    }
    const onMove = (e: PointerEvent): void => {
      width.set(
        Math.min(
          Math.max(startWidth + direction * (e.clientX - startX), min),
          max,
        ),
      );
    };
    const finish = (cancelled: boolean): void => {
      cleanup();
      if (cancelled) width.set(startWidth);
    };
    const onUp = (): void => finish(false);
    const onCancel = (): void => finish(true);
    const onKeydown = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      finish(true);
    };
    const onWindowBlur = (): void => finish(true);
    const cleanup = (): void => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      document.removeEventListener('keydown', onKeydown, true);
      window.removeEventListener('blur', onWindowBlur);
      this.activeGestureCleanup = null;
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    document.addEventListener('keydown', onKeydown, true);
    window.addEventListener('blur', onWindowBlur);
    this.activeGestureCleanup = cleanup;
  }

  /** APG window-splitter keys: arrows move the separator, Home/End to bounds. */
  protected onPanelResizeKey(
    event: KeyboardEvent,
    panel: 'rail' | 'properties',
  ): void {
    const width = this.panelWidthSignal(panel);
    const [min, max] = this.panelWidthBounds(panel);
    const grow = panel === 'rail' ? 1 : -1; // ArrowRight moves the separator right
    let next: number | null = null;
    switch (event.key) {
      case 'ArrowRight':
        next = width() + grow * 16;
        break;
      case 'ArrowLeft':
        next = width() - grow * 16;
        break;
      case 'Home':
        next = min;
        break;
      case 'End':
        next = max;
        break;
      default:
        return;
    }
    event.preventDefault();
    width.set(Math.min(Math.max(next, min), max));
  }
  /** Working value of the inline label editor. */
  protected editValue = '';

  private readonly wrapEl = viewChild<ElementRef<HTMLDivElement>>('wrap');
  private readonly labelEditEl =
    viewChild<ElementRef<HTMLTextAreaElement>>('labelEdit');
  private readonly searchInputEl =
    viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private readonly minimapSvgEl =
    viewChild<ElementRef<SVGSVGElement>>('minimapSvg');

  private spaceHeld = false;
  private tabExitArmed = false;
  private resetSource: OgeBpmnChangeSource = 'new';
  private pendingLabel = '';
  private lastDirty = false;
  private readonly labelPast: string[] = [];
  private readonly labelFuture: string[] = [];
  private activeGestureCleanup: (() => void) | null = null;
  private clipboard: BpmnClipboard | null = null;
  private pasteSteps = 0;
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;

  /** Config-merged messages, overlaid by the `messages` input. */
  protected readonly msg = computed(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));
  /** Grid step in diagram units. */
  protected readonly gridSize = computed(() => this.config.gridSize ?? 10);
  /** Fill presets passed to the properties panel's appearance section. */
  protected readonly colorPresets = computed(
    () => this.config.colorPresets ?? OGE_DEFAULT_BPMN_COLOR_PRESETS,
  );
  private readonly snapThreshold = computed(
    () => this.config.snapThreshold ?? 5,
  );
  private readonly zoomMin = computed(() => this.config.zoomMin ?? 0.2);
  private readonly zoomMax = computed(() => this.config.zoomMax ?? 4);

  protected readonly canvasAriaLabel = computed(
    () => `${this.msg().canvasLabel}. ${this.msg().canvasHint}`,
  );
  protected readonly viewportTransform = computed(() => {
    const v = this.vp();
    return `translate(${v.x} ${v.y}) scale(${v.zoom})`;
  });
  protected readonly activeDescendant = computed(() => {
    const sel = this.selection();
    return sel.length === 1 ? `${this.uid}-el-${sel[0]}` : null;
  });
  protected readonly paletteActive = computed(() => {
    const t = this.tool();
    return t.kind === 'place' ? t.nodeType : null;
  });

  /** Nodes hidden inside collapsed sub-processes (not rendered). */
  private readonly hiddenNodes = computed(() =>
    hiddenByCollapsed(this.diagram()),
  );

  protected readonly nodeViews = computed<readonly BpmnNodeView[]>(() => {
    const m = this.diagram();
    const hidden = this.hiddenNodes();
    const selected = new Set(this.selection());
    const names = this.msg().elementNames;
    const views: BpmnNodeView[] = [];
    for (const id of m.order) {
      const node = m.nodes[id];
      const di = m.shapeDi[id];
      if (!node || !di || hidden.has(id)) {
        continue;
      }
      const b = di.bounds;
      const type = node.type;
      const isEvent = isBpmnEventType(type);
      const isGateway =
        type === 'exclusiveGateway' || type === 'parallelGateway';
      const isContainer = isBpmnSubProcessType(type);
      const isData = type === 'dataObject' || type === 'dataStore';
      const collapsed =
        isContainer &&
        node.type !== 'textAnnotation' &&
        node.collapsed === true;
      const glyph: BpmnNodeView['glyph'] = isEvent
        ? 'event'
        : isGateway
          ? 'gateway'
          : type === 'textAnnotation'
            ? 'annotation'
            : isData
              ? 'data'
              : type === 'group'
                ? 'group'
                : isContainer
                  ? 'subprocess'
                  : 'task';
      const text =
        node.type === 'textAnnotation' ? node.text : (node.name ?? '');
      const below = isEvent || isGateway || isData;
      const expanded = isContainer && !collapsed;
      const topLabel = type === 'textAnnotation' || expanded;
      const wrapped = wrapLabel(text, below ? 90 : b.width - 12);
      // A dragged external label is rendered at its stored DI labelBounds.
      const lb = below ? di.labelBounds : undefined;
      const lines: BpmnLabelLine[] = wrapped.map((t, i) => ({
        text: t,
        y: lb
          ? lb.y - b.y + 12 + i * 14
          : below
            ? b.height + 14 + i * 14
            : topLabel || type === 'group'
              ? 16 + i * 14
              : b.height / 2 - (wrapped.length - 1) * 7 + i * 14 + 4,
      }));
      const w = b.width;
      const h = b.height;
      const eventDef =
        isEvent && node.type !== 'textAnnotation'
          ? (node.eventDefinition ?? null)
          : null;
      const markers =
        node.type !== 'textAnnotation' && isBpmnActivityType(type)
          ? (node.markers ?? [])
          : [];
      views.push({
        id,
        type,
        x: b.x,
        y: b.y,
        width: w,
        height: h,
        glyph,
        thick: type === 'endEvent',
        callActivity: type === 'callActivity',
        dataPath:
          type === 'dataObject'
            ? dataObjectPath(w, h)
            : type === 'dataStore'
              ? dataStorePath(w, h)
              : null,
        double:
          type === 'intermediateThrowEvent' ||
          type === 'intermediateCatchEvent' ||
          type === 'boundaryEvent',
        dashed:
          type === 'boundaryEvent' &&
          node.type === 'boundaryEvent' &&
          node.cancelActivity === false,
        dotted: type === 'eventSubProcess',
        transactionInner: type === 'transaction',
        throwDot: type === 'intermediateThrowEvent' && eventDef === null,
        eventDefPath:
          eventDef === null
            ? null
            : eventDefinitionPath(eventDef, w / 2, h / 2),
        eventDefFilled:
          eventDef !== null && eventDefinitionFilled(type, eventDef),
        collapsedPath: collapsed ? collapsedMarkerPath(w, h) : null,
        markerPaths: activityMarkerPaths(markers, w, h),
        taskIcon:
          type === 'userTask'
            ? 'user'
            : type === 'serviceTask'
              ? 'service'
              : type === 'scriptTask'
                ? 'script'
                : null,
        gatewayPath: `M${w / 2} 0 L${w} ${h / 2} L${w / 2} ${h} L0 ${h / 2} Z`,
        gatewayMark:
          type === 'exclusiveGateway'
            ? `M${w / 2 - 8} ${h / 2 - 8} L${w / 2 + 8} ${h / 2 + 8} M${w / 2 + 8} ${h / 2 - 8} L${w / 2 - 8} ${h / 2 + 8}`
            : `M${w / 2} ${h / 2 - 9} V${h / 2 + 9} M${w / 2 - 9} ${h / 2} H${w / 2 + 9}`,
        annotationPath: `M15 0 H0 V${h} H15`,
        lines,
        labelX: lb
          ? lb.x + lb.width / 2 - b.x
          : type === 'textAnnotation'
            ? 8
            : expanded
              ? 10
              : w / 2,
        labelAnchor: type === 'textAnnotation' || expanded ? 'start' : 'middle',
        externalLabel: below,
        selected: selected.has(id),
        ariaLabel:
          node.type === 'textAnnotation'
            ? names[type]
            : (node.name ?? names[type]),
        fill: di.fill ?? null,
        stroke: di.stroke ?? null,
      });
    }
    return views;
  });

  protected readonly edgeViews = computed<readonly BpmnEdgeView[]>(() => {
    const m = this.diagram();
    const selected = new Set(this.selection());
    const names = this.msg().elementNames;
    const defaults = new Set<string>();
    for (const node of Object.values(m.nodes)) {
      if (node.type !== 'textAnnotation' && node.defaultFlowId !== undefined) {
        defaults.add(node.defaultFlowId);
      }
    }
    const hidden = this.hiddenNodes();
    const views: BpmnEdgeView[] = [];
    for (const id of m.order) {
      const edge = m.edges[id];
      const di = m.edgeDi[id];
      if (
        !edge ||
        !di ||
        di.waypoints.length < 2 ||
        hidden.has(edge.sourceRef) ||
        hidden.has(edge.targetRef)
      ) {
        continue;
      }
      const anchor = edgeLabelAnchor(di.waypoints);
      let defaultMark: BpmnEdgeView['defaultMark'] = null;
      if (defaults.has(id)) {
        const a = di.waypoints[0];
        const b = di.waypoints[1];
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const ux = (b.x - a.x) / len;
        const uy = (b.y - a.y) / len;
        const px = a.x + ux * 12;
        const py = a.y + uy * 12;
        // A short tick rotated 45° off the segment direction.
        const sx = (ux - uy) * 0.7071;
        const sy = (uy + ux) * 0.7071;
        defaultMark = {
          x1: px - sx * 5,
          y1: py - sy * 5,
          x2: px + sx * 5,
          y2: py + sy * 5,
        };
      }
      const label =
        edge.type === 'sequenceFlow' || edge.type === 'messageFlow'
          ? (edge.name ?? '')
          : '';
      views.push({
        id,
        points: di.waypoints.map((p) => `${p.x},${p.y}`).join(' '),
        kind: edge.type,
        association: edge.type === 'association',
        markerEnd:
          edge.type === 'association'
            ? null
            : edge.type === 'messageFlow' || edge.type === 'dataAssociation'
              ? `url(#${this.uid}-open-arrow)`
              : `url(#${this.uid}-arrow)`,
        sourceDot: edge.type === 'messageFlow' ? di.waypoints[0] : null,
        label,
        labelX: di.labelBounds
          ? di.labelBounds.x + di.labelBounds.width / 2
          : anchor.x,
        labelY: di.labelBounds ? di.labelBounds.y + 11 : anchor.y - 6,
        defaultMark,
        selected: selected.has(id),
        ariaLabel:
          edge.type === 'sequenceFlow' || edge.type === 'messageFlow'
            ? (edge.name ?? names[edge.type])
            : names[edge.type],
        stroke: di.stroke ?? null,
      });
    }
    return views;
  });

  /** Pool bands with their lanes, rendered beneath edges and shapes. */
  protected readonly poolViews = computed<readonly BpmnPoolView[]>(() => {
    const m = this.diagram();
    const selected = new Set(this.selection());
    const names = this.msg().elementNames;
    const views: BpmnPoolView[] = [];
    for (const pool of Object.values(m.pools)) {
      const di = m.shapeDi[pool.id];
      if (!di) {
        continue;
      }
      const b = di.bounds;
      const nameX = b.x + POOL_HEADER_WIDTH / 2 + 4;
      const nameY = b.y + b.height / 2;
      const lanes: BpmnLaneView[] = [];
      for (const lane of pool.lanes) {
        const laneDi = m.shapeDi[lane.id];
        if (!laneDi) {
          continue;
        }
        const lb = laneDi.bounds;
        const laneNameX = lb.x + 12;
        const laneNameY = lb.y + lb.height / 2;
        lanes.push({
          id: lane.id,
          x: lb.x,
          y: lb.y,
          width: lb.width,
          height: lb.height,
          name: lane.name ?? '',
          nameX: laneNameX,
          nameY: laneNameY,
          nameTransform: `rotate(-90 ${laneNameX} ${laneNameY})`,
        });
      }
      views.push({
        id: pool.id,
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        name: pool.name ?? '',
        nameX,
        nameY,
        nameTransform: `rotate(-90 ${nameX} ${nameY})`,
        lanes,
        selected: selected.has(pool.id),
        ariaLabel: pool.name ?? names['pool'],
        fill: di.fill ?? null,
        stroke: di.stroke ?? null,
      });
    }
    return views;
  });

  /** Width of the pool name strip, exposed to the template. */
  protected readonly poolHeaderWidth = POOL_HEADER_WIDTH;

  protected readonly dragGhosts = computed(() => {
    const d = this.dragState();
    if (d === null || !d.moved) {
      return [] as readonly (Rect & { readonly id: string })[];
    }
    const m = this.diagram();
    const ghosts: (Rect & { readonly id: string })[] = [];
    for (const id of d.ids) {
      const di = m.shapeDi[id];
      if (di) {
        ghosts.push({ id, ...translateRect(di.bounds, d.dx, d.dy) });
      }
    }
    return ghosts;
  });

  protected readonly dragGuides = computed(() => {
    const d = this.dragState();
    if (d === null || !d.moved) {
      return [];
    }
    return d.guides.map((g) =>
      g.axis === 'x'
        ? { x1: g.position, y1: -10000, x2: g.position, y2: 10000 }
        : { x1: -10000, y1: g.position, x2: 10000, y2: g.position },
    );
  });

  protected readonly rubberView = computed(() => {
    const t = this.tool();
    const p = this.rubberBand();
    if (t.kind !== 'connect' || p === null) {
      return null;
    }
    const di = this.diagram().shapeDi[t.sourceId];
    if (!di) {
      return null;
    }
    return routeOrthogonal(di.bounds, { x: p.x, y: p.y, width: 0, height: 0 })
      .map((q) => `${q.x},${q.y}`)
      .join(' ');
  });

  protected readonly selectionOutlines = computed(() => {
    const m = this.diagram();
    const outlines: (Rect & { readonly id: string })[] = [];
    for (const id of this.selection()) {
      const di = m.shapeDi[id];
      if (di) {
        outlines.push({ id, ...inflateRect(di.bounds, 6) });
      }
    }
    return outlines;
  });

  /** Draggable waypoint handles of the single selected edge (edit mode only). */
  protected readonly bendHandles = computed(() => {
    if (this.locked()) {
      return [];
    }
    const sel = this.selection();
    if (sel.length !== 1) {
      return [];
    }
    const m = this.diagram();
    const edgeId = sel[0];
    const di = m.edges[edgeId] ? m.edgeDi[edgeId] : undefined;
    if (!di) {
      return [];
    }
    return di.waypoints.map((p, index) => ({
      edgeId,
      index,
      x: p.x,
      y: p.y,
    }));
  });

  /**
   * The 4 corner resize handles of the single selected resizable node
   * (activities and text annotations only — events and gateways have a fixed
   * BPMN size, exactly as in bpmn-js). Empty in read-only mode and mid-drag.
   */
  protected readonly resizeHandles = computed<
    readonly {
      readonly id: string;
      readonly corner: BpmnResizeCorner;
      readonly x: number;
      readonly y: number;
    }[]
  >(() => {
    if (this.locked() || this.dragState() !== null) {
      return [];
    }
    const sel = this.selection();
    if (sel.length !== 1) {
      return [];
    }
    const m = this.diagram();
    const node = m.nodes[sel[0]];
    const isPool = m.pools[sel[0]] !== undefined;
    const di = m.shapeDi[sel[0]];
    const resizable =
      isPool || (node !== undefined && MIN_SIZES[node.type] !== undefined);
    if (!di || !resizable) {
      return [];
    }
    const b = di.bounds;
    return [
      { id: sel[0], corner: 'nw', x: b.x, y: b.y },
      { id: sel[0], corner: 'ne', x: b.x + b.width, y: b.y },
      { id: sel[0], corner: 'se', x: b.x + b.width, y: b.y + b.height },
      { id: sel[0], corner: 'sw', x: b.x, y: b.y + b.height },
    ];
  });

  protected readonly padView = computed(() => {
    if (
      this.locked() ||
      this.dragState() !== null ||
      this.editingLabelId() !== null
    ) {
      return null;
    }
    const sel = this.selection();
    if (sel.length !== 1) {
      return null;
    }
    const id = sel[0];
    const m = this.diagram();
    const v = this.vp();
    const node = m.nodes[id];
    if (node) {
      const di = m.shapeDi[id];
      if (!di) {
        return null;
      }
      const p = diagramToScreen(v, {
        x: di.bounds.x + di.bounds.width,
        y: di.bounds.y,
      });
      return {
        id,
        x: p.x + 8,
        y: p.y,
        connect: true,
        append: node.type !== 'textAnnotation' && node.type !== 'endEvent',
        editLabel: true,
        toggleDefault: false,
        isDefault: false,
        ariaLabel: this.displayName(id),
      };
    }
    if (m.pools[id] !== undefined) {
      const di = m.shapeDi[id];
      if (!di) {
        return null;
      }
      const p = diagramToScreen(v, {
        x: di.bounds.x + di.bounds.width,
        y: di.bounds.y,
      });
      return {
        id,
        x: p.x + 8,
        y: p.y,
        connect: true,
        append: false,
        editLabel: true,
        toggleDefault: false,
        isDefault: false,
        ariaLabel: this.displayName(id),
      };
    }
    const edge = m.edges[id];
    if (!edge) {
      return null;
    }
    const anchor = edgeLabelAnchor(m.edgeDi[id]?.waypoints ?? []);
    const p = diagramToScreen(v, anchor);
    const source = m.nodes[edge.sourceRef];
    const isDefault =
      source !== undefined &&
      source.type !== 'textAnnotation' &&
      source.defaultFlowId === id;
    return {
      id,
      x: p.x + 8,
      y: p.y - 40,
      connect: false,
      append: false,
      editLabel: edge.type === 'sequenceFlow' || edge.type === 'messageFlow',
      toggleDefault:
        edge.type === 'sequenceFlow' && source?.type === 'exclusiveGateway',
      isDefault,
      ariaLabel: this.displayName(id),
    };
  });

  protected readonly labelEditView = computed(() => {
    const id = this.editingLabelId();
    if (id === null) {
      return null;
    }
    const m = this.diagram();
    const v = this.vp();
    const di = m.shapeDi[id];
    if (di) {
      const p = diagramToScreen(v, { x: di.bounds.x, y: di.bounds.y });
      return {
        x: p.x,
        y: p.y,
        width: Math.max(di.bounds.width, 100) * v.zoom,
        height: Math.max(di.bounds.height, 40) * v.zoom,
        fontSize: 12 * v.zoom,
      };
    }
    const anchor = edgeLabelAnchor(m.edgeDi[id]?.waypoints ?? []);
    const p = diagramToScreen(v, anchor);
    return {
      x: p.x - 50 * v.zoom,
      y: p.y - 12 * v.zoom,
      width: 100 * v.zoom,
      height: 40 * v.zoom,
      fontSize: 12 * v.zoom,
    };
  });

  /**
   * The multi-selection context pad (2+ movable elements): anchored to the
   * top-right of the joint bounding box, offering the align/distribute flyout
   * and delete. `ids` carries only the movable members (nodes and pools).
   */
  protected readonly multiPadView = computed(() => {
    if (
      this.locked() ||
      this.dragState() !== null ||
      this.editingLabelId() !== null
    ) {
      return null;
    }
    const sel = this.selection();
    if (sel.length < 2) {
      return null;
    }
    const m = this.diagram();
    const ids = sel.filter(
      (id) =>
        m.shapeDi[id] !== undefined &&
        (m.nodes[id] !== undefined || m.pools[id] !== undefined),
    );
    if (ids.length < 2) {
      return null;
    }
    const bbox = boundsOfRects(ids.map((id) => m.shapeDi[id].bounds));
    if (bbox === null) {
      return null;
    }
    const p = diagramToScreen(this.vp(), {
      x: bbox.x + bbox.width,
      y: bbox.y,
    });
    return { ids, x: p.x + 8, y: p.y };
  });

  /** Search matches (max 8) by case-insensitive name/id containment. */
  protected readonly searchResults = computed<
    readonly { readonly id: string; readonly label: string }[]
  >(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase();
    if (!this.searchOpen() || query === '') {
      return [];
    }
    const m = this.diagram();
    const names = this.msg().elementNames;
    const results: { id: string; label: string }[] = [];
    const consider = (
      id: string,
      name: string | undefined,
      fallback: string,
    ): void => {
      if (results.length >= 8) {
        return;
      }
      const matches =
        id.toLocaleLowerCase().includes(query) ||
        (name !== undefined && name.toLocaleLowerCase().includes(query));
      if (matches) {
        results.push({ id, label: name ?? fallback });
      }
    };
    for (const pool of Object.values(m.pools)) {
      consider(pool.id, pool.name, names['pool']);
    }
    for (const id of m.order) {
      const node = m.nodes[id];
      if (node) {
        consider(
          id,
          node.type === 'textAnnotation' ? node.text : node.name,
          names[node.type],
        );
        continue;
      }
      const edge = m.edges[id];
      if (edge) {
        consider(
          id,
          edge.type === 'sequenceFlow' || edge.type === 'messageFlow'
            ? edge.name
            : undefined,
          names[edge.type],
        );
      }
    }
    return results;
  });

  /**
   * Elements dimmed while the search overlay is open with a non-empty query:
   * everything that does NOT match (the full match set, not just the visible
   * top-8 results).
   */
  protected readonly dimmedIds = computed<ReadonlySet<string>>(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase();
    if (!this.searchOpen() || query === '') {
      return new Set<string>();
    }
    const m = this.diagram();
    const dimmed = new Set<string>();
    const matches = (id: string, name: string | undefined): boolean =>
      id.toLocaleLowerCase().includes(query) ||
      (name !== undefined && name.toLocaleLowerCase().includes(query));
    for (const pool of Object.values(m.pools)) {
      if (!matches(pool.id, pool.name)) {
        dimmed.add(pool.id);
      }
    }
    for (const id of m.order) {
      const node = m.nodes[id];
      if (node) {
        const name = node.type === 'textAnnotation' ? node.text : node.name;
        if (!matches(id, name)) {
          dimmed.add(id);
        }
        continue;
      }
      const edge = m.edges[id];
      if (
        edge &&
        !matches(
          id,
          edge.type === 'sequenceFlow' || edge.type === 'messageFlow'
            ? edge.name
            : undefined,
        )
      ) {
        dimmed.add(id);
      }
    }
    return dimmed;
  });

  /**
   * The minimap scene: shape primitives and the current-viewport rectangle,
   * both mapped into the fixed 180×120 minimap box (fit-and-center math, no
   * `getScreenCTM`). Null while the diagram has no shapes.
   */
  protected readonly minimapView = computed(() => {
    const m = this.diagram();
    const hidden = this.hiddenNodes();
    const rects = Object.entries(m.shapeDi)
      .filter(([id]) => !hidden.has(id))
      .map(([, di]) => di.bounds);
    const content = boundsOfRects(rects);
    if (content === null || m.order.length === 0) {
      return null;
    }
    const W = 180;
    const H = 120;
    const PAD = 6;
    const scale = Math.min(
      (W - 2 * PAD) / Math.max(content.width, 1),
      (H - 2 * PAD) / Math.max(content.height, 1),
      1,
    );
    const offsetX = (W - content.width * scale) / 2 - content.x * scale;
    const offsetY = (H - content.height * scale) / 2 - content.y * scale;
    const toMini = (r: Rect): Rect => ({
      x: r.x * scale + offsetX,
      y: r.y * scale + offsetY,
      width: Math.max(r.width * scale, 2),
      height: Math.max(r.height * scale, 2),
    });
    const shapes: (Rect & { readonly kind: 'rect' | 'circle' | 'diamond' })[] =
      [];
    for (const pool of Object.values(m.pools)) {
      const di = m.shapeDi[pool.id];
      if (di) {
        shapes.push({ kind: 'rect', ...toMini(di.bounds) });
      }
    }
    for (const id of m.order) {
      const node = m.nodes[id];
      const di = m.shapeDi[id];
      if (!node || !di || hidden.has(id)) {
        continue;
      }
      const kind =
        node.type !== 'textAnnotation' && isBpmnEventType(node.type)
          ? 'circle'
          : node.type === 'exclusiveGateway' || node.type === 'parallelGateway'
            ? 'diamond'
            : 'rect';
      shapes.push({ kind, ...toMini(di.bounds) });
    }
    const v = this.vp();
    const size = this.hostSize() ?? { width: 800, height: 600 };
    const topLeft = screenToDiagram(v, { x: 0, y: 0 });
    const bottomRight = screenToDiagram(v, {
      x: size.width,
      y: size.height,
    });
    const viewport = toMini({
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    });
    return { shapes, viewport, scale, offsetX, offsetY };
  });

  /**
   * Screen-positioned overlay badges: each registered overlay anchored to its
   * element's bounds corner (or center), transformed through the viewport.
   * Overlays whose element is missing from the model are omitted (hidden, not
   * removed — they reappear when the element id returns).
   */
  protected readonly overlayViews = computed(() => {
    const defs = this.overlayDefs();
    if (defs.length === 0) {
      return [];
    }
    const m = this.diagram();
    const v = this.vp();
    const views: {
      readonly id: string;
      readonly x: number;
      readonly y: number;
      readonly html: string;
    }[] = [];
    for (const { id, def } of defs) {
      let bounds: Rect | null = null;
      const shape = m.shapeDi[def.elementId];
      if (
        shape !== undefined &&
        (m.nodes[def.elementId] !== undefined ||
          m.pools[def.elementId] !== undefined)
      ) {
        bounds = shape.bounds;
      } else {
        const edge = m.edges[def.elementId]
          ? m.edgeDi[def.elementId]
          : undefined;
        if (edge !== undefined && edge.waypoints.length >= 2) {
          bounds = boundsOfRects(
            edge.waypoints.map((p) => ({
              x: p.x,
              y: p.y,
              width: 0,
              height: 0,
            })),
          );
        }
      }
      if (bounds === null) {
        continue;
      }
      const anchor: Point =
        def.position === 'top-left'
          ? { x: bounds.x, y: bounds.y }
          : def.position === 'top-right'
            ? { x: bounds.x + bounds.width, y: bounds.y }
            : def.position === 'bottom-left'
              ? { x: bounds.x, y: bounds.y + bounds.height }
              : def.position === 'bottom-right'
                ? {
                    x: bounds.x + bounds.width,
                    y: bounds.y + bounds.height,
                  }
                : {
                    x: bounds.x + bounds.width / 2,
                    y: bounds.y + bounds.height / 2,
                  };
      const p = diagramToScreen(v, {
        x: anchor.x + (def.offset?.x ?? 0),
        y: anchor.y + (def.offset?.y ?? 0),
      });
      views.push({ id, x: p.x, y: p.y, html: def.html });
    }
    return views;
  });

  constructor() {
    // Leaving native fullscreen (Esc) must clear the maximized state too.
    const onFullscreenChange = (): void => {
      if (
        this.maximized() &&
        document.fullscreenElement !== this.hostRef.nativeElement &&
        document.fullscreenElement !== null
      ) {
        return; // another element took fullscreen — not ours to track
      }
      if (this.maximized() && document.fullscreenElement === null) {
        this.maximized.set(false);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    this.destroyRef.onDestroy(() =>
      document.removeEventListener('fullscreenchange', onFullscreenChange),
    );
    const unsubscribe = this.stack.onChange((m, source) => {
      this.diagram.set(m);
      const kept = this.selection().filter(
        (id) => m.nodes[id] || m.edges[id] || m.pools[id],
      );
      if (kept.length !== this.selection().length) {
        this.selection.set(kept);
        this.selectionChanged.emit({
          ids: kept,
          elements: this.elementInfos(m, kept),
        });
      }
      const src: OgeBpmnChangeSource =
        source === 'reset' ? this.resetSource : source;
      this.elementsChanged.emit({ source: src, label: this.pendingLabel });
      this.scheduleDiagramChanged(src);
      const dirty = this.stack.isDirty;
      if (dirty !== this.lastDirty) {
        this.lastDirty = dirty;
        this.dirtyChanged.emit(dirty);
      }
    });
    this.destroyRef.onDestroy(() => {
      unsubscribe();
      this.activeGestureCleanup?.();
      if (this.autosaveTimer !== null) {
        clearTimeout(this.autosaveTimer);
        this.autosaveTimer = null;
      }
    });

    // zoom model → viewport (zoom around the canvas center).
    effect(() => {
      const z = this.zoom();
      const v = untracked(this.vp);
      if (z === v.zoom) {
        return;
      }
      const size = this.hostSize();
      const cursor = size
        ? { x: size.width / 2, y: size.height / 2 }
        : { x: 0, y: 0 };
      this.vp.set(
        zoomAt(v, cursor, z / v.zoom, this.zoomMin(), this.zoomMax()),
      );
    });
    // viewport → zoom model.
    effect(() => {
      const v = this.vp();
      if (untracked(this.zoom) !== v.zoom) {
        this.zoom.set(v.zoom);
      }
    });
  }

  // ------------------------------------------------------------- public API

  /**
   * Parses BPMN XML and loads it into the editor, resetting undo history and
   * fitting the viewport. Resolves with the import result (model + warnings);
   * on a fatal parse error the current diagram is left untouched.
   */
  importXml(xml: string): Promise<BpmnImportResult> {
    const result = readBpmnXml(xml);
    if (result.model !== null) {
      this.setSelection([], false);
      this.cancelTool();
      this.resetSource = 'import';
      this.pendingLabel = 'Import diagram';
      this.labelPast.length = 0;
      this.labelFuture.length = 0;
      this.stack.reset(result.model);
      this.zoomToFit();
      const a = this.msg().announcements;
      if (result.warnings.length > 0) {
        this.announce(a.importedWithWarnings, {
          count: result.warnings.length,
        });
      } else {
        this.announce(a.imported, {});
      }
    }
    this.importCompleted.emit({ warnings: result.warnings });
    return Promise.resolve(result);
  }

  /** Serializes the current diagram to deterministic BPMN 2.0 XML. */
  exportXml(): string {
    return writeBpmnXml(this.diagram());
  }

  /** Wraps the current diagram in the versioned JSON persistence envelope. */
  exportJson(): BpmnDiagramJson {
    return toBpmnJson(this.diagram());
  }

  /**
   * Validates a JSON persistence envelope (see `fromBpmnJson`) and loads it,
   * resetting undo history and fitting the viewport exactly like `importXml`.
   * On a validation error the current diagram is left untouched and the error
   * message is returned.
   */
  importJson(value: unknown): { error?: string } {
    const result = fromBpmnJson(value);
    if (result.model === null) {
      return { error: result.error ?? 'Invalid diagram JSON' };
    }
    this.setSelection([], false);
    this.cancelTool();
    this.resetSource = 'import';
    this.pendingLabel = 'Import diagram';
    this.labelPast.length = 0;
    this.labelFuture.length = 0;
    this.stack.reset(result.model);
    this.zoomToFit();
    this.announce(this.msg().announcements.imported, {});
    return {};
  }

  /**
   * Renders the current diagram as a self-contained static SVG string
   * (neutral hardcoded colors, no grid or selection) via `renderDiagramSvg`.
   */
  exportSvg(): string {
    return renderDiagramSvg(this.diagram());
  }

  /** Replaces the diagram with an empty one and resets history and viewport. */
  newDiagram(): void {
    this.setSelection([], false);
    this.cancelTool();
    this.resetSource = 'new';
    this.pendingLabel = 'New diagram';
    this.labelPast.length = 0;
    this.labelFuture.length = 0;
    this.stack.reset(createEmptyDiagram());
    this.vp.set({ x: 0, y: 0, zoom: 1 });
  }

  /** Fits and centers the whole diagram in the canvas. */
  zoomToFit(): void {
    const m = this.diagram();
    const content = boundsOfRects(
      Object.values(m.shapeDi).map((di) => di.bounds),
    );
    const size = this.hostSize();
    if (content === null || size === null) {
      this.vp.set({ x: 0, y: 0, zoom: 1 });
      return;
    }
    this.vp.set(fitViewport(content, size));
  }

  /** Selects the given element ids, pools included (unknown ids are ignored). */
  select(ids: readonly string[]): void {
    const m = this.diagram();
    this.setSelection(
      ids.filter((id) => m.nodes[id] || m.edges[id] || m.pools[id]),
      false,
    );
  }

  /** The currently selected element ids. */
  getSelection(): readonly string[] {
    return this.selection();
  }

  /** Deletes the selected elements (cascading to their attached edges). */
  deleteSelection(): void {
    if (this.locked()) {
      return;
    }
    const ids = this.selection();
    if (ids.length === 0) {
      return;
    }
    const before = this.diagram();
    this.exec(deleteElementsCommand(ids));
    const after = this.diagram();
    if (after !== before) {
      this.announce(this.msg().announcements.deleted, {
        count: before.order.length - after.order.length,
      });
    }
  }

  /** Undoes the most recent command. */
  undo(): void {
    if (!this.stack.canUndo) {
      return;
    }
    const label = this.labelPast.pop() ?? '';
    this.labelFuture.push(label);
    this.pendingLabel = label;
    this.stack.undo();
    this.announce(this.msg().announcements.undone, { label });
  }

  /** Re-applies the most recently undone command. */
  redo(): void {
    if (!this.stack.canRedo) {
      return;
    }
    const label = this.labelFuture.pop() ?? '';
    this.labelPast.push(label);
    this.pendingLabel = label;
    this.stack.redo();
    this.announce(this.msg().announcements.redone, { label });
  }

  /** True when at least one command can be undone. */
  canUndo(): boolean {
    return this.stack.canUndo;
  }

  /** True when at least one undone command can be redone. */
  canRedo(): boolean {
    return this.stack.canRedo;
  }

  /** True when the model differs from the last save point. */
  isDirty(): boolean {
    return this.stack.isDirty;
  }

  /** Marks the current model as saved; `isDirty()` reports false until it changes. */
  markSaved(): void {
    this.stack.markSaved();
    if (this.lastDirty) {
      this.lastDirty = false;
      this.dirtyChanged.emit(false);
    }
  }

  /** Moves keyboard focus onto the diagram canvas. */
  focus(): void {
    this.wrapEl()?.nativeElement.focus();
  }

  /**
   * Pans the viewport (keeping the current zoom) so the given element is
   * centered in the canvas. Unknown ids are ignored. Used by the element
   * search overlay; public for app-driven navigation.
   */
  centerOn(id: string): void {
    const bounds = this.elementBounds(id);
    if (bounds === null) {
      return;
    }
    const size = this.hostSize() ?? { width: 800, height: 600 };
    const v = this.vp();
    this.vp.set({
      x: size.width / 2 - (bounds.x + bounds.width / 2) * v.zoom,
      y: size.height / 2 - (bounds.y + bounds.height / 2) * v.zoom,
      zoom: v.zoom,
    });
  }

  /**
   * Attaches an HTML badge to a diagram element (see {@link OgeBpmnOverlay})
   * and returns a handle for {@link removeOverlay}. The badge tracks the
   * element through pan/zoom and model changes; a dangling `elementId` hides
   * it without removing the registration. The `html` renders through
   * Angular's sanitizing `[innerHTML]` binding.
   */
  addOverlay(overlay: OgeBpmnOverlay): string {
    const id = `overlay-${this.overlayCounter++}`;
    this.overlayDefs.set([...this.overlayDefs(), { id, def: overlay }]);
    return id;
  }

  /** Removes the overlay registered under the given handle. Unknown handles are ignored. */
  removeOverlay(id: string): void {
    this.overlayDefs.set(this.overlayDefs().filter((entry) => entry.id !== id));
  }

  /**
   * Removes every registered overlay, or — when `elementId` is given — only
   * the overlays attached to that element.
   */
  clearOverlays(elementId?: string): void {
    if (elementId === undefined) {
      this.overlayDefs.set([]);
      return;
    }
    this.overlayDefs.set(
      this.overlayDefs().filter((entry) => entry.def.elementId !== elementId),
    );
  }

  /** The bounds of a shape, pool or edge (waypoint bounding box), or null. */
  private elementBounds(id: string): Rect | null {
    const m = this.diagram();
    const shape = m.shapeDi[id];
    if (shape !== undefined) {
      return shape.bounds;
    }
    const edge = m.edges[id] ? m.edgeDi[id] : undefined;
    if (edge !== undefined && edge.waypoints.length >= 2) {
      return boundsOfRects(
        edge.waypoints.map((p) => ({ x: p.x, y: p.y, width: 0, height: 0 })),
      );
    }
    return null;
  }

  // ------------------------------------------------------------ interactions

  protected onToolPicked(type: BpmnPaletteItemType): void {
    if (this.locked()) {
      return;
    }
    const t = this.tool();
    if (t.kind === 'place' && t.nodeType === type) {
      this.tool.set({ kind: 'select' });
      return;
    }
    this.tool.set({ kind: 'place', nodeType: type });
  }

  protected onCanvasPointerDown(event: PointerEvent): void {
    if (event.button === 1 || (event.button === 0 && this.spaceHeld)) {
      this.beginPan(event);
      return;
    }
    if (event.button !== 0) {
      return;
    }
    const t = this.tool();
    if (t.kind === 'hand') {
      this.beginPan(event);
      return;
    }
    if (t.kind === 'space') {
      this.beginSpaceDrag(event);
      return;
    }
    if (t.kind === 'lasso') {
      this.beginMarquee(event, this.toDiagram(event));
      return;
    }
    if (t.kind === 'globalConnect') {
      return; // stays armed until a source shape is clicked (Escape cancels)
    }
    if (t.kind === 'place') {
      if (!this.locked()) {
        this.placeAt(this.toDiagram(event));
      }
      return;
    }
    if (t.kind === 'connect') {
      this.cancelTool();
      return;
    }
    // Select tool on the empty canvas: try an edge hit first, then start a
    // marquee; a sub-3px "drag" degrades to the plain click-clears behavior.
    const pt = this.toDiagram(event);
    const m = this.diagram();
    const tolerance = 6 / this.vp().zoom;
    for (let i = m.order.length - 1; i >= 0; i--) {
      const id = m.order[i];
      const di = m.edgeDi[id];
      if (m.edges[id] && di && edgeHitTest(di.waypoints, pt, tolerance)) {
        this.setSelection([id], true);
        return;
      }
    }
    this.beginMarquee(event, pt);
  }

  protected onCanvasPointerMove(event: PointerEvent): void {
    const t = this.tool();
    if (t.kind === 'place' && t.nodeType === 'boundaryEvent') {
      const host = this.attachTargetAt(this.toDiagram(event));
      this.attachHover.set(host?.id ?? null);
      return;
    }
    if (t.kind !== 'connect') {
      return;
    }
    const pt = this.toDiagram(event);
    this.rubberBand.set(pt);
    this.updateConnectHover(pt, t.sourceId);
  }

  /**
   * Finds the activity whose border lies within 12 diagram units of the given
   * point (topmost in document order wins) together with the border midpoint
   * nearest the point — the dock position of a placed boundary event.
   */
  private attachTargetAt(
    pt: Point,
  ): { readonly id: string; readonly dock: Point } | null {
    const m = this.diagram();
    const hidden = this.hiddenNodes();
    let found: { id: string; dock: Point } | null = null;
    for (const id of m.order) {
      const node = m.nodes[id];
      const di = m.shapeDi[id];
      if (
        !node ||
        !di ||
        hidden.has(id) ||
        node.type === 'textAnnotation' ||
        !isBpmnActivityType(node.type)
      ) {
        continue;
      }
      const b = di.bounds;
      const nearBorder =
        rectContainsPoint(inflateRect(b, 12), pt) &&
        !rectContainsPoint(inflateRect(b, -12), pt);
      if (!nearBorder) {
        continue;
      }
      const midpoints: Point[] = [
        { x: b.x + b.width / 2, y: b.y },
        { x: b.x + b.width, y: b.y + b.height / 2 },
        { x: b.x + b.width / 2, y: b.y + b.height },
        { x: b.x, y: b.y + b.height / 2 },
      ];
      let dock = midpoints[0];
      let best = Infinity;
      for (const candidate of midpoints) {
        const d = Math.hypot(candidate.x - pt.x, candidate.y - pt.y);
        if (d < best) {
          best = d;
          dock = candidate;
        }
      }
      found = { id, dock };
    }
    return found;
  }

  private updateConnectHover(pt: Point, sourceId: string): void {
    const m = this.diagram();
    let hover: { id: string; allowed: boolean } | null = null;
    for (const id of m.order) {
      const di = m.shapeDi[id];
      if (!m.nodes[id] || !di || id === sourceId) {
        continue;
      }
      if (rectContainsPoint(di.bounds, pt)) {
        hover = { id, allowed: connectionKindFor(m, sourceId, id) !== null };
      }
    }
    if (hover === null) {
      // No node under the cursor: a pool band is a message-flow endpoint.
      const poolId = poolAtPoint(m, pt);
      if (poolId !== undefined && poolId !== sourceId) {
        hover = {
          id: poolId,
          allowed: connectionKindFor(m, sourceId, poolId) !== null,
        };
      }
    }
    this.connectHover.set(hover);
  }

  protected onShapePointerDown(id: string, event: PointerEvent): void {
    if (event.button === 1) {
      return; // bubble to the canvas pan handler
    }
    event.stopPropagation();
    if (event.button !== 0) {
      return;
    }
    if (this.spaceHeld) {
      this.beginPan(event);
      return;
    }
    const t = this.tool();
    if (t.kind === 'hand') {
      this.beginPan(event);
      return;
    }
    if (t.kind === 'space') {
      this.beginSpaceDrag(event);
      return;
    }
    if (t.kind === 'lasso') {
      this.beginMarquee(event, this.toDiagram(event));
      return;
    }
    if (t.kind === 'globalConnect') {
      // First click of the global connect tool: the shape becomes the source.
      if (!this.locked()) {
        this.tool.set({ kind: 'connect', sourceId: id });
      }
      return;
    }
    if (t.kind === 'place') {
      if (!this.locked()) {
        this.placeAt(this.toDiagram(event));
      }
      return;
    }
    if (t.kind === 'connect') {
      this.tryConnect(t.sourceId, id);
      return;
    }
    event.preventDefault();
    if (event.shiftKey) {
      const sel = this.selection();
      this.setSelection(
        sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id],
        true,
      );
      return;
    }
    if (!this.selection().includes(id)) {
      this.setSelection([id], true);
    }
    if (!this.locked()) {
      this.beginMoveDrag(event);
    }
  }

  protected onEdgePointerDown(id: string, event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }
    event.stopPropagation();
    const t = this.tool();
    if (t.kind === 'hand' || this.spaceHeld) {
      this.beginPan(event);
      return;
    }
    if (t.kind === 'lasso') {
      this.beginMarquee(event, this.toDiagram(event));
      return;
    }
    if (t.kind === 'space') {
      this.beginSpaceDrag(event);
      return;
    }
    if (t.kind !== 'select') {
      if (t.kind === 'connect') {
        this.cancelTool();
      }
      return;
    }
    if (event.shiftKey) {
      const sel = this.selection();
      this.setSelection(
        sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id],
        true,
      );
      return;
    }
    const sel = this.selection();
    if (sel.length === 1 && sel[0] === id && !this.locked()) {
      // Second press on the selected edge: drag the segment under the cursor
      // perpendicular to its direction (bpmn-js segment move).
      this.beginSegmentDrag(id, event);
      return;
    }
    this.setSelection([id], true);
  }

  protected onWheel(event: WheelEvent): void {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    this.vp.set(
      zoomAt(
        this.vp(),
        this.toScreen(event),
        factor,
        this.zoomMin(),
        this.zoomMax(),
      ),
    );
  }

  protected onCanvasFocus(): void {
    this.tabExitArmed = false;
  }

  protected onCanvasKeyup(event: KeyboardEvent): void {
    if (event.key === ' ') {
      this.spaceHeld = false;
    }
  }

  protected onCanvasKeydown(event: KeyboardEvent): void {
    if (event.key === ' ') {
      this.spaceHeld = true;
      event.preventDefault();
      return;
    }
    if (this.editingLabelId() !== null) {
      return;
    }
    if (
      (event.ctrlKey || event.metaKey) &&
      (event.key === 'f' || event.key === 'F')
    ) {
      // Element search works in read-only viewers too.
      event.preventDefault();
      this.toggleSearch(true);
      return;
    }
    if (this.locked()) {
      return;
    }
    const key = event.key;
    if (event.ctrlKey || event.metaKey) {
      const k = key.toLowerCase();
      if (k === 'z' && !event.shiftKey) {
        event.preventDefault();
        this.undo();
      } else if (k === 'y' || (k === 'z' && event.shiftKey)) {
        event.preventDefault();
        this.redo();
      } else if (k === 'c') {
        event.preventDefault();
        this.copySelection(false);
      } else if (k === 'x') {
        event.preventDefault();
        this.copySelection(true);
      } else if (k === 'v') {
        event.preventDefault();
        this.pasteClipboard();
      } else if (k === 'a') {
        event.preventDefault();
        const m = this.diagram();
        this.setSelection([...Object.keys(m.pools), ...m.order], false);
      }
      return;
    }
    if (key === 'Escape') {
      if (this.tool().kind !== 'select') {
        this.cancelTool();
      } else if (this.selection().length > 0) {
        this.setSelection([], false);
        this.announce(this.msg().announcements.selectionCleared, {});
        this.tabExitArmed = true;
      }
      return;
    }
    if (key === 'Tab') {
      const order = this.diagram().order;
      if (order.length === 0 || this.tabExitArmed) {
        return; // let focus leave the diagram
      }
      event.preventDefault();
      const sel = this.selection();
      if (sel.length === 0) {
        this.setSelection(
          [event.shiftKey ? order[order.length - 1] : order[0]],
          true,
        );
        return;
      }
      const index = order.indexOf(sel[0]);
      const next = event.shiftKey
        ? (index - 1 + order.length) % order.length
        : (index + 1) % order.length;
      this.setSelection([order[next]], true);
      return;
    }
    const arrow = ARROWS[key];
    if (arrow) {
      const m = this.diagram();
      const ids = this.selection().filter(
        (id) => (m.nodes[id] || m.pools[id]) && m.shapeDi[id],
      );
      if (ids.length === 0) {
        return;
      }
      event.preventDefault();
      const step = event.shiftKey ? 1 : this.gridSize();
      const before = m;
      this.exec(moveElementsCommand(ids, arrow[0] * step, arrow[1] * step));
      if (this.diagram() !== before) {
        this.announce(this.msg().announcements.moved, {
          name: this.displayName(ids[0]),
        });
      }
      return;
    }
    if (key === 'Delete' || key === 'Backspace') {
      event.preventDefault();
      this.deleteSelection();
      return;
    }
    if (key === 'Enter' && this.tool().kind === 'place') {
      event.preventDefault();
      const size = this.hostSize();
      const center = size
        ? screenToDiagram(this.vp(), {
            x: size.width / 2,
            y: size.height / 2,
          })
        : screenToDiagram(this.vp(), { x: 0, y: 0 });
      this.placeAt(center);
      return;
    }
    if (key === 'F2' || key === 'Enter') {
      const sel = this.selection();
      if (sel.length === 1) {
        event.preventDefault();
        this.startLabelEdit(sel[0]);
      }
      return;
    }
    if (key === 'h' || key === 'H') {
      event.preventDefault();
      this.onStripTool('hand');
      return;
    }
    if (key === 'l' || key === 'L') {
      event.preventDefault();
      this.onStripTool('lasso');
      return;
    }
    if (key === 's' || key === 'S') {
      event.preventDefault();
      this.onStripTool('space');
      return;
    }
    if (key === 'c' || key === 'C') {
      const sel = this.selection();
      if (sel.length === 1 && this.diagram().nodes[sel[0]]) {
        event.preventDefault();
        this.tool.set({ kind: 'connect', sourceId: sel[0] });
      }
      return;
    }
    if (key === 'a' || key === 'A') {
      const sel = this.selection();
      if (sel.length === 1) {
        event.preventDefault();
        this.appendFrom(sel[0], 'task');
      }
      return;
    }
    if (key === '+' || key === '=') {
      event.preventDefault();
      this.zoomStep(1.2);
      return;
    }
    if (key === '-' || key === '_') {
      event.preventDefault();
      this.zoomStep(1 / 1.2);
      return;
    }
    if (key === 'f' || key === 'F') {
      event.preventDefault();
      this.zoomToFit();
    }
  }

  // ------------------------------------------------------------- context pad

  protected onPadConnect(id: string): void {
    if (this.locked()) {
      return;
    }
    this.tool.set({ kind: 'connect', sourceId: id });
    this.focus();
  }

  protected onPadAppend(id: string, type: BpmnNodeType): void {
    this.appendFrom(id, type);
    this.focus();
  }

  protected onPadToggleDefault(edgeId: string): void {
    if (this.locked()) {
      return;
    }
    const m = this.diagram();
    const edge = m.edges[edgeId];
    if (!edge || edge.type !== 'sequenceFlow') {
      return;
    }
    const gateway = m.nodes[edge.sourceRef];
    if (!gateway || gateway.type === 'textAnnotation') {
      return;
    }
    this.exec(
      setDefaultFlowCommand(
        edge.sourceRef,
        gateway.defaultFlowId === edgeId ? undefined : edgeId,
      ),
    );
  }

  // ------------------------------------------------------- v0.5 tool strip

  /**
   * Toggles a tool-strip mode: picking the armed tool again (or Escape)
   * returns to select. Hand and lasso work in read-only mode; space and
   * global connect mutate and are blocked there.
   */
  protected onStripTool(
    kind: 'hand' | 'lasso' | 'space' | 'globalConnect',
  ): void {
    if ((kind === 'space' || kind === 'globalConnect') && this.locked()) {
      return;
    }
    const current = this.tool().kind;
    this.cancelTool();
    if (current !== kind) {
      this.tool.set({ kind });
    }
    this.focus();
  }

  // ------------------------------------------------------- align & distribute

  /** Aligns the multi-selection along the given edge/axis and announces the result. */
  protected onAlign(ids: readonly string[], mode: BpmnAlignMode): void {
    const before = this.diagram();
    this.exec(alignElementsCommand(ids, mode));
    this.alignMenuOpen.set(false);
    const after = this.diagram();
    if (after !== before) {
      this.announce(this.msg().announcements.aligned, {
        count: this.changedShapeCount(before, after),
      });
    }
    this.focus();
  }

  /** Distributes the multi-selection (3+) at equal gaps and announces the result. */
  protected onDistribute(
    ids: readonly string[],
    axis: BpmnDistributeAxis,
  ): void {
    const before = this.diagram();
    this.exec(distributeElementsCommand(ids, axis));
    this.alignMenuOpen.set(false);
    const after = this.diagram();
    if (after !== before) {
      this.announce(this.msg().announcements.distributed, {
        count: this.changedShapeCount(before, after),
      });
    }
    this.focus();
  }

  private changedShapeCount(before: BpmnDiagram, after: BpmnDiagram): number {
    let count = 0;
    for (const [id, di] of Object.entries(after.shapeDi)) {
      if (before.shapeDi[id] !== di) {
        count++;
      }
    }
    return count;
  }

  // ------------------------------------------------------------ element search

  /** Opens the search overlay (Ctrl+F / strip button); a second toggle closes it. */
  protected toggleSearch(forceOpen = false): void {
    if (this.searchOpen() && !forceOpen) {
      this.closeSearch();
      return;
    }
    this.searchOpen.set(true);
    this.searchActive.set(0);
    setTimeout(() => this.searchInputEl()?.nativeElement.focus(), 0);
  }

  private closeSearch(): void {
    this.searchOpen.set(false);
    this.searchQuery.set('');
    this.searchActive.set(0);
    this.focus();
  }

  protected onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.searchActive.set(0);
    if (this.searchQuery().trim() !== '') {
      const m = this.diagram();
      const total = Object.keys(m.pools).length + m.order.length;
      this.announce(this.msg().announcements.searchResults, {
        count: total - this.dimmedIds().size,
      });
    }
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    event.stopPropagation();
    const results = this.searchResults();
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeSearch();
      return;
    }
    if (event.key === 'ArrowDown' && results.length > 0) {
      event.preventDefault();
      this.searchActive.set((this.searchActive() + 1) % results.length);
      return;
    }
    if (event.key === 'ArrowUp' && results.length > 0) {
      event.preventDefault();
      this.searchActive.set(
        (this.searchActive() - 1 + results.length) % results.length,
      );
      return;
    }
    if (event.key === 'Enter' && results.length > 0) {
      event.preventDefault();
      const active = results[Math.min(this.searchActive(), results.length - 1)];
      this.pickSearchResult(active.id);
    }
  }

  /** Selects and centers a search result, then closes the overlay. */
  protected pickSearchResult(id: string): void {
    this.setSelection([id], true);
    this.centerOn(id);
    this.closeSearch();
  }

  // ------------------------------------------------------- palette drag-to-canvas

  /**
   * Turns a palette pointerdown into a drag-to-canvas gesture: past a 3px
   * threshold a ghost of the shape follows the (snapped) cursor over the
   * canvas; releasing over the canvas places the element through the same
   * validated path as click-then-place (boundary border attach, pool band
   * membership), releasing anywhere else cancels. A sub-threshold release
   * falls through to the palette's plain click (click-then-place stays).
   */
  protected onPaletteDragStart(start: {
    readonly type: BpmnPaletteItemType;
    readonly clientX: number;
    readonly clientY: number;
  }): void {
    if (this.locked()) {
      return;
    }
    const size =
      start.type === 'pool' ? POOL_DEFAULT_SIZE : DEFAULT_SIZES[start.type];
    let active = false;
    let lastPoint: Point | null = null;
    const onMove = (e: PointerEvent): void => {
      active =
        active ||
        Math.hypot(e.clientX - start.clientX, e.clientY - start.clientY) > 3;
      if (!active) {
        return;
      }
      if (!this.isOverCanvas(e)) {
        lastPoint = null;
        this.paletteDragGhost.set(null);
        this.attachHover.set(null);
        return;
      }
      const raw = this.toDiagram(e);
      const center = this.snapEnabled() ? snapPoint(raw, this.gridSize()) : raw;
      lastPoint = raw;
      this.paletteDragGhost.set({
        x: center.x - size.width / 2,
        y: center.y - size.height / 2,
        width: size.width,
        height: size.height,
      });
      if (start.type === 'boundaryEvent') {
        this.attachHover.set(this.attachTargetAt(raw)?.id ?? null);
      }
    };
    const finish = (cancelled: boolean): void => {
      cleanup();
      this.paletteDragGhost.set(null);
      this.attachHover.set(null);
      if (cancelled || !active || lastPoint === null) {
        return;
      }
      this.placeItem(start.type, lastPoint);
    };
    const onUp = (): void => finish(false);
    const onCancel = (): void => finish(true);
    const onKeydown = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      finish(true);
    };
    const cleanup = (): void => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      document.removeEventListener('keydown', onKeydown, true);
      window.removeEventListener('blur', onCancel);
      this.activeGestureCleanup = null;
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    document.addEventListener('keydown', onKeydown, true);
    window.addEventListener('blur', onCancel);
    this.activeGestureCleanup = cleanup;
  }

  private isOverCanvas(event: { clientX: number; clientY: number }): boolean {
    const rect = this.wrapEl()?.nativeElement.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      return true; // headless layouts (jsdom): treat everything as canvas
    }
    return (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  }

  // --------------------------------------------------------------- label drag

  /**
   * Drags an element's external label (below-shape node labels and edge
   * labels) with a ghost rectangle and commits one `moveLabelCommand` on
   * release, creating the DI `labelBounds` from the shared estimate when the
   * element has none yet. Escape cancels without a command.
   */
  protected onLabelPointerDown(id: string, event: PointerEvent): void {
    if (event.button !== 0 || this.locked()) {
      return;
    }
    if (this.tool().kind !== 'select' || this.spaceHeld) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    const m = this.diagram();
    const base =
      m.shapeDi[id]?.labelBounds ??
      m.edgeDi[id]?.labelBounds ??
      estimateLabelBounds(m, id);
    if (base === null) {
      return;
    }
    const startX = event.clientX;
    const startY = event.clientY;
    let dx = 0;
    let dy = 0;
    let moved = false;
    const onMove = (e: PointerEvent): void => {
      moved = moved || Math.hypot(e.clientX - startX, e.clientY - startY) > 3;
      const zoom = this.vp().zoom;
      dx = Math.round((e.clientX - startX) / zoom);
      dy = Math.round((e.clientY - startY) / zoom);
      this.labelDragGhost.set(translateRect(base, dx, dy));
    };
    const finish = (cancelled: boolean): void => {
      cleanup();
      this.labelDragGhost.set(null);
      if (cancelled || !moved || (dx === 0 && dy === 0)) {
        return;
      }
      const before = this.diagram();
      this.exec(moveLabelCommand(id, dx, dy));
      if (this.diagram() !== before) {
        this.announce(this.msg().announcements.labelMoved, {
          name: this.displayName(id),
        });
      }
    };
    const onUp = (): void => finish(false);
    const onCancel = (): void => finish(true);
    const onKeydown = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      finish(true);
    };
    const cleanup = (): void => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      document.removeEventListener('keydown', onKeydown, true);
      window.removeEventListener('blur', onCancel);
      this.activeGestureCleanup = null;
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    document.addEventListener('keydown', onKeydown, true);
    window.addEventListener('blur', onCancel);
    this.activeGestureCleanup = cleanup;
  }

  // ---------------------------------------------------------------- space tool

  /**
   * The space-tool gesture: once the drag exceeds 10px the dominant axis
   * locks, every element whose center lies beyond the drag origin on that
   * axis previews a shift by the (grid-snapped) delta, and release commits a
   * single `makeSpaceCommand`. Escape cancels without a command.
   */
  private beginSpaceDrag(event: PointerEvent): void {
    if (this.locked()) {
      return;
    }
    event.preventDefault();
    const origin = this.toDiagram(event);
    const startX = event.clientX;
    const startY = event.clientY;
    let axis: 'x' | 'y' | null = null;
    let delta = 0;
    const onMove = (e: PointerEvent): void => {
      const dxs = e.clientX - startX;
      const dys = e.clientY - startY;
      if (axis === null && Math.max(Math.abs(dxs), Math.abs(dys)) > 10) {
        axis = Math.abs(dxs) >= Math.abs(dys) ? 'x' : 'y';
      }
      if (axis === null) {
        return;
      }
      const zoom = this.vp().zoom;
      let d = (axis === 'x' ? dxs : dys) / zoom;
      if (this.snapEnabled()) {
        d = snapValue(d, this.gridSize());
      }
      delta = Math.round(d);
      this.dragState.set({
        ids: this.spaceAffectedIds(origin, axis),
        dx: axis === 'x' ? delta : 0,
        dy: axis === 'y' ? delta : 0,
        moved: true,
        guides: [],
      });
    };
    const finish = (cancelled: boolean): void => {
      cleanup();
      this.dragState.set(null);
      if (cancelled || axis === null || delta === 0) {
        return;
      }
      const before = this.diagram();
      this.exec(makeSpaceCommand(origin, axis, delta));
      const after = this.diagram();
      if (after !== before) {
        this.announce(this.msg().announcements.spaceAdjusted, {
          count: this.changedShapeCount(before, after),
        });
      }
    };
    const onUp = (): void => finish(false);
    const onCancel = (): void => finish(true);
    const onKeydown = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      finish(true);
    };
    const cleanup = (): void => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      document.removeEventListener('keydown', onKeydown, true);
      window.removeEventListener('blur', onCancel);
      this.activeGestureCleanup = null;
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    document.addEventListener('keydown', onKeydown, true);
    window.addEventListener('blur', onCancel);
    this.activeGestureCleanup = cleanup;
  }

  /** The nodes and pools whose center lies beyond the origin on the axis. */
  private spaceAffectedIds(origin: Point, axis: 'x' | 'y'): readonly string[] {
    const m = this.diagram();
    const threshold = axis === 'x' ? origin.x : origin.y;
    const ids: string[] = [];
    for (const id of [...Object.keys(m.pools), ...m.order]) {
      const di = m.shapeDi[id];
      if (
        di === undefined ||
        (m.nodes[id] === undefined && m.pools[id] === undefined)
      ) {
        continue;
      }
      const center = {
        x: di.bounds.x + di.bounds.width / 2,
        y: di.bounds.y + di.bounds.height / 2,
      };
      if ((axis === 'x' ? center.x : center.y) > threshold) {
        ids.push(id);
      }
    }
    return ids;
  }

  // ------------------------------------------------------------------ minimap

  /**
   * Click (or drag) on the minimap pans the main viewport so the clicked
   * diagram point sits at the canvas center — pure math against the
   * minimap's fit transform, no `getScreenCTM`.
   */
  protected onMinimapPointerDown(event: PointerEvent): void {
    const mm = this.minimapView();
    const svg = this.minimapSvgEl()?.nativeElement;
    if (mm === null || !svg || event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const rect = svg.getBoundingClientRect();
    const centerAt = (e: { clientX: number; clientY: number }): void => {
      const local = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const pt = {
        x: (local.x - mm.offsetX) / mm.scale,
        y: (local.y - mm.offsetY) / mm.scale,
      };
      const size = this.hostSize() ?? { width: 800, height: 600 };
      const v = this.vp();
      this.vp.set({
        x: size.width / 2 - pt.x * v.zoom,
        y: size.height / 2 - pt.y * v.zoom,
        zoom: v.zoom,
      });
    };
    centerAt(event);
    const onMove = (e: PointerEvent): void => centerAt(e);
    const finish = (): void => cleanup();
    const cleanup = (): void => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', finish);
      window.removeEventListener('blur', finish);
      this.activeGestureCleanup = null;
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', finish);
    document.addEventListener('pointercancel', finish);
    window.addEventListener('blur', finish);
    this.activeGestureCleanup = cleanup;
  }

  // ---------------------------------------------- bendpoint remove & segments

  /**
   * Double-click on a bend handle removes that waypoint (endpoints and
   * 2-point edges are kept — the polyline never drops below 2 points). Stops
   * propagation so the edge's own dblclick-insert cannot fire.
   */
  protected onBendDblClick(
    edgeId: string,
    index: number,
    event: MouseEvent,
  ): void {
    event.stopPropagation();
    event.preventDefault();
    if (this.locked()) {
      return;
    }
    const di = this.diagram().edgeDi[edgeId];
    if (
      !di ||
      di.waypoints.length <= 2 ||
      index <= 0 ||
      index >= di.waypoints.length - 1
    ) {
      return;
    }
    this.exec(
      updateWaypointsCommand(
        edgeId,
        di.waypoints.filter((_, i) => i !== index),
      ),
    );
    this.announce(this.msg().announcements.waypointRemoved, {});
  }

  /**
   * Drags the edge segment under the cursor perpendicular to its direction
   * (both bounding waypoints shift together); end segments first gain an
   * extra waypoint at the dock so the endpoint stays attached — bpmn-js
   * segment-move behavior. Ghost preview, one `updateWaypointsCommand` on
   * release (marks the edge manual), Escape cancels.
   */
  private beginSegmentDrag(edgeId: string, event: PointerEvent): void {
    const di = this.diagram().edgeDi[edgeId];
    if (!di || di.waypoints.length < 2) {
      return;
    }
    event.preventDefault();
    const pt = this.toDiagram(event);
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < di.waypoints.length - 1; i++) {
      const d = distanceToSegment(pt, di.waypoints[i], di.waypoints[i + 1]);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    const a = di.waypoints[best];
    const b = di.waypoints[best + 1];
    // A vertical segment moves horizontally and vice versa.
    const moveAxis: 'x' | 'y' =
      Math.abs(b.y - a.y) > Math.abs(b.x - a.x) ? 'x' : 'y';
    const wps = di.waypoints.map((p) => ({ x: p.x, y: p.y }));
    let seg = best;
    if (seg === 0) {
      wps.splice(1, 0, { ...wps[0] });
      seg = 1;
    }
    if (seg + 1 === wps.length - 1) {
      wps.splice(wps.length - 1, 0, { ...wps[wps.length - 1] });
    }
    const startX = event.clientX;
    const startY = event.clientY;
    let current = wps;
    let moved = false;
    const onMove = (e: PointerEvent): void => {
      moved = moved || Math.hypot(e.clientX - startX, e.clientY - startY) > 3;
      const zoom = this.vp().zoom;
      const d = Math.round(
        (moveAxis === 'x' ? e.clientX - startX : e.clientY - startY) / zoom,
      );
      current = wps.map((p, i) =>
        i === seg || i === seg + 1
          ? moveAxis === 'x'
            ? { x: p.x + d, y: p.y }
            : { x: p.x, y: p.y + d }
          : p,
      );
      this.bendPreview.set(current.map((p) => `${p.x},${p.y}`).join(' '));
    };
    const finish = (cancelled: boolean): void => {
      cleanup();
      this.bendPreview.set(null);
      if (cancelled || !moved) {
        return;
      }
      this.exec(updateWaypointsCommand(edgeId, current));
    };
    const onUp = (): void => finish(false);
    const onCancel = (): void => finish(true);
    const onKeydown = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      finish(true);
    };
    const cleanup = (): void => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      document.removeEventListener('keydown', onKeydown, true);
      window.removeEventListener('blur', onCancel);
      this.activeGestureCleanup = null;
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    document.addEventListener('keydown', onKeydown, true);
    window.addEventListener('blur', onCancel);
    this.activeGestureCleanup = cleanup;
  }

  // -------------------------------------------------------------- label edit

  /** Opens the inline label editor for the given element (dblclick / F2 / Enter). */
  protected startLabelEdit(id: string): void {
    if (this.locked()) {
      return;
    }
    const m = this.diagram();
    const node = m.nodes[id];
    const edge = m.edges[id];
    const pool = m.pools[id];
    if (node) {
      if (!m.shapeDi[id]) {
        return;
      }
      this.editValue =
        node.type === 'textAnnotation' ? node.text : (node.name ?? '');
    } else if (pool) {
      if (!m.shapeDi[id]) {
        return;
      }
      this.editValue = pool.name ?? '';
    } else if (
      edge &&
      (edge.type === 'sequenceFlow' || edge.type === 'messageFlow')
    ) {
      this.editValue = edge.name ?? '';
    } else {
      return;
    }
    this.editingLabelId.set(id);
    setTimeout(() => this.labelEditEl()?.nativeElement.focus(), 0);
  }

  protected onLabelEditInput(event: Event): void {
    this.editValue = (event.target as HTMLTextAreaElement).value;
  }

  protected onLabelEditKeydown(event: KeyboardEvent): void {
    event.stopPropagation();
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.commitLabelEdit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.editingLabelId.set(null);
      this.focus();
    }
  }

  protected onLabelEditBlur(): void {
    if (this.editingLabelId() !== null) {
      this.commitLabelEdit();
    }
  }

  private commitLabelEdit(): void {
    const id = this.editingLabelId();
    if (id === null) {
      return;
    }
    this.editingLabelId.set(null);
    const before = this.diagram();
    this.exec(updateLabelCommand(id, this.editValue));
    if (this.diagram() !== before) {
      this.announce(this.msg().announcements.labelEdited, {});
    }
    this.focus();
  }

  // ---------------------------------------------------------------- internals

  private exec(command: BpmnCommand): void {
    const before = this.stack.current;
    this.pendingLabel = command.label;
    this.stack.execute(command);
    if (this.stack.current !== before) {
      this.labelPast.push(command.label);
      if (this.labelPast.length > 100) {
        this.labelPast.shift();
      }
      this.labelFuture.length = 0;
    }
  }

  private placeAt(pt: Point): void {
    const t = this.tool();
    if (t.kind !== 'place') {
      return;
    }
    this.placeItem(t.nodeType, pt);
  }

  /**
   * Places one palette item centered at the given point — shared by the
   * click-then-place tool and the palette drag-to-canvas gesture. Boundary
   * events go through the border-attach validation, pools through
   * `addPoolCommand`; everything else joins the pool band under the point.
   */
  private placeItem(type: BpmnPaletteItemType, pt: Point): void {
    if (type === 'boundaryEvent') {
      this.placeBoundaryAt(pt);
      return;
    }
    const before = this.diagram();
    if (type === 'pool') {
      this.exec(addPoolCommand(pt));
      const after = this.diagram();
      if (after !== before) {
        const poolIds = Object.keys(after.pools);
        this.setSelection([poolIds[poolIds.length - 1]], false);
        this.announce(this.msg().announcements.poolCreated, {});
      }
      this.tool.set({ kind: 'select' });
      return;
    }
    // A node dropped inside a pool band joins that pool's process.
    const poolId = poolAtPoint(before, pt);
    this.exec(
      addNodeCommand(
        type,
        pt,
        undefined,
        poolId !== undefined ? { poolId } : undefined,
      ),
    );
    const after = this.diagram();
    if (after !== before) {
      const newId = after.order[after.order.length - 1];
      this.setSelection([newId], false);
      this.announce(this.msg().announcements.created, {
        type: this.msg().elementNames[type],
      });
    }
    this.tool.set({ kind: 'select' });
  }

  /**
   * Places a boundary event: within 12 units of an activity border it attaches
   * to that activity, docked at the nearest border midpoint and inheriting the
   * host's container; anywhere else the placement is denied with an
   * announcement and the tool stays armed.
   */
  private placeBoundaryAt(pt: Point): void {
    const target = this.attachTargetAt(pt);
    if (target === null) {
      this.announce(this.msg().announcements.attachDenied, {});
      return;
    }
    const m = this.diagram();
    const host = m.nodes[target.id];
    const before = m;
    this.exec(
      addNodeCommand('boundaryEvent', target.dock, undefined, {
        attachedToRef: target.id,
        ...(host !== undefined && host.parentId !== undefined
          ? { parentId: host.parentId }
          : {}),
        ...(host !== undefined && host.poolId !== undefined
          ? { poolId: host.poolId }
          : {}),
        snap: false,
      }),
    );
    const after = this.diagram();
    if (after !== before) {
      const newId = after.order[after.order.length - 1];
      this.setSelection([newId], false);
      this.announce(this.msg().announcements.attached, {
        name: this.msg().elementNames['boundaryEvent'],
        host: this.displayName(target.id),
      });
    }
    this.attachHover.set(null);
    this.tool.set({ kind: 'select' });
  }

  private tryConnect(sourceId: string, targetId: string): void {
    this.cancelTool();
    if (this.locked()) {
      return;
    }
    const m = this.diagram();
    const kind = connectionKindFor(m, sourceId, targetId);
    if (kind === null) {
      this.announce(this.msg().announcements.connectDenied, {});
      return;
    }
    this.exec(connectCommand(kind, sourceId, targetId));
    const after = this.diagram();
    if (after !== m) {
      const edgeId = after.order[after.order.length - 1];
      this.setSelection([edgeId], false);
      this.announce(this.msg().announcements.connected, {
        source: this.displayName(sourceId),
        target: this.displayName(targetId),
      });
    }
  }

  private appendFrom(sourceId: string, type: BpmnNodeType): void {
    if (this.locked()) {
      return;
    }
    const m = this.diagram();
    const source = m.nodes[sourceId];
    const di = m.shapeDi[sourceId];
    if (!source || !di || source.type === 'endEvent') {
      return;
    }
    const size = DEFAULT_SIZES[type];
    const b = di.bounds;
    let center = snapPoint(
      {
        x: b.x + b.width + 60 + size.width / 2,
        y: b.y + b.height / 2,
      },
      this.gridSize(),
    );
    const others = Object.values(m.shapeDi).map((s) => s.bounds);
    const rectAt = (c: Point): Rect => ({
      x: c.x - size.width / 2,
      y: c.y - size.height / 2,
      width: size.width,
      height: size.height,
    });
    let guard = 0;
    while (
      others.some((r) => rectsIntersect(r, rectAt(center))) &&
      guard++ < 50
    ) {
      center = { x: center.x, y: center.y + 100 };
    }
    const kind =
      type === 'textAnnotation' || source.type === 'textAnnotation'
        ? 'association'
        : 'sequenceFlow';
    const taken = takenIds(m);
    const newId = generateBpmnId(idPrefixFor(type), taken);
    const edgeId = generateBpmnId(
      idPrefixFor(kind),
      new Set([...taken, newId]),
    );
    const at = center;
    // The appended node inherits the source's container and pool, so append
    // chains keep building inside the same sub-process and process.
    const parentId = source.parentId;
    const poolId = source.poolId;
    const command: BpmnCommand = {
      label: 'Append element',
      apply: (current) =>
        connectCommand(kind, sourceId, newId, edgeId).apply(
          addNodeCommand(type, at, newId, {
            ...(parentId !== undefined ? { parentId } : {}),
            ...(poolId !== undefined ? { poolId } : {}),
          }).apply(current),
        ),
    };
    const before = this.diagram();
    this.exec(command);
    if (this.diagram() !== before) {
      this.setSelection([newId], false);
      this.announce(this.msg().announcements.created, {
        type: this.msg().elementNames[type],
      });
    }
  }

  // ----------------------------------------------------- clipboard & marquee

  /** Copies the selected subgraph to the internal clipboard; `cut` also deletes it. */
  private copySelection(cut: boolean): void {
    const clip = extractClipboard(this.diagram(), this.selection());
    if (clip === null) {
      return;
    }
    this.clipboard = clip;
    this.pasteSteps = 0;
    const count = clip.nodes.length + clip.edges.length;
    const a = this.msg().announcements;
    if (!cut) {
      this.announce(a.copied, { count });
      return;
    }
    const before = this.diagram();
    this.exec(deleteElementsCommand(this.selection()));
    const after = this.diagram();
    if (after !== before) {
      this.announce(a.cut, { count: before.order.length - after.order.length });
    }
  }

  /** Pastes the internal clipboard, offsetting +20/+20 per repeated paste. */
  private pasteClipboard(): void {
    if (this.clipboard === null) {
      return;
    }
    const offset = 20 * (this.pasteSteps + 1);
    const before = this.diagram();
    this.exec(pasteCommand(this.clipboard, { x: offset, y: offset }));
    const after = this.diagram();
    if (after === before) {
      return;
    }
    this.pasteSteps++;
    const newIds = after.order.slice(before.order.length);
    this.setSelection(newIds, false);
    this.announce(this.msg().announcements.pasted, { count: newIds.length });
  }

  /**
   * Starts a marquee selection on the empty canvas. On release beyond a 3px
   * threshold it selects every node whose bounds intersect the marquee plus
   * every edge with both endpoints selected (Shift adds to the selection);
   * below the threshold it falls back to the plain click-clears behavior.
   * Escape cancels the gesture.
   */
  private beginMarquee(event: PointerEvent, start: Point): void {
    const additive = event.shiftKey;
    const startX = event.clientX;
    const startY = event.clientY;
    let moved = false;
    const onMove = (e: PointerEvent): void => {
      moved = moved || Math.hypot(e.clientX - startX, e.clientY - startY) > 3;
      if (!moved) {
        return;
      }
      const pt = this.toDiagram(e);
      this.marquee.set({
        x: Math.min(start.x, pt.x),
        y: Math.min(start.y, pt.y),
        width: Math.abs(pt.x - start.x),
        height: Math.abs(pt.y - start.y),
      });
    };
    const finish = (cancelled: boolean): void => {
      cleanup();
      const rect = this.marquee();
      this.marquee.set(null);
      if (cancelled) {
        return;
      }
      if (!moved || rect === null) {
        if (this.selection().length > 0) {
          this.setSelection([], false);
          this.announce(this.msg().announcements.selectionCleared, {});
        }
        return;
      }
      const m = this.diagram();
      const picked: string[] = [];
      for (const id of m.order) {
        const di = m.shapeDi[id];
        if (m.nodes[id] && di && rectsIntersect(di.bounds, rect)) {
          picked.push(id);
        }
      }
      const pickedSet = new Set(picked);
      for (const id of m.order) {
        const edge = m.edges[id];
        if (
          edge &&
          pickedSet.has(edge.sourceRef) &&
          pickedSet.has(edge.targetRef)
        ) {
          picked.push(id);
        }
      }
      const ids = additive
        ? [...new Set([...this.selection(), ...picked])]
        : picked;
      this.setSelection(ids, false);
    };
    const onUp = (): void => finish(false);
    const onCancel = (): void => finish(true);
    const onKeydown = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      finish(true);
    };
    const cleanup = (): void => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      document.removeEventListener('keydown', onKeydown, true);
      window.removeEventListener('blur', onCancel);
      this.activeGestureCleanup = null;
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    document.addEventListener('keydown', onKeydown, true);
    window.addEventListener('blur', onCancel);
    this.activeGestureCleanup = cleanup;
  }

  // -------------------------------------------- edge-drag connect & bendpoints

  /**
   * Pointerdown on a shape's border ring: arms the connect tool from that
   * shape and drags a rubber band; releasing over a valid target commits the
   * connection, releasing elsewhere after a drag cancels, and a plain click
   * leaves the tool armed for the click-then-click path.
   */
  protected onRingPointerDown(id: string, event: PointerEvent): void {
    if (event.button !== 0 || this.locked() || this.spaceHeld) {
      return;
    }
    const t = this.tool();
    if (t.kind !== 'select') {
      this.onShapePointerDown(id, event);
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    this.tool.set({ kind: 'connect', sourceId: id });
    const startX = event.clientX;
    const startY = event.clientY;
    let moved = false;
    const onMove = (e: PointerEvent): void => {
      moved = moved || Math.hypot(e.clientX - startX, e.clientY - startY) > 3;
      const pt = this.toDiagram(e);
      this.rubberBand.set(pt);
      this.updateConnectHover(pt, id);
    };
    const finish = (cancelled: boolean): void => {
      cleanup();
      if (cancelled) {
        this.cancelTool();
        return;
      }
      if (!moved) {
        return; // plain click on the ring: tool stays armed
      }
      const hover = this.connectHover();
      if (hover !== null) {
        this.tryConnect(id, hover.id);
      } else {
        this.cancelTool();
      }
    };
    const onUp = (): void => finish(false);
    const onCancel = (): void => finish(true);
    const onKeydown = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      finish(true);
    };
    const cleanup = (): void => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      document.removeEventListener('keydown', onKeydown, true);
      window.removeEventListener('blur', onCancel);
      this.activeGestureCleanup = null;
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    document.addEventListener('keydown', onKeydown, true);
    window.addEventListener('blur', onCancel);
    this.activeGestureCleanup = cleanup;
  }

  /**
   * Double-click on an edge inserts a bend point into its nearest segment
   * (marking the edge's waypoints as manual). Associations and edges without
   * DI fall back to opening the label editor.
   */
  protected onEdgeDblClick(id: string, event: MouseEvent): void {
    if (this.locked()) {
      return;
    }
    const m = this.diagram();
    const edge = m.edges[id];
    const di = m.edgeDi[id];
    if (!edge || !di || di.waypoints.length < 2) {
      this.startLabelEdit(id);
      return;
    }
    const pt = this.toDiagram(event);
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < di.waypoints.length - 1; i++) {
      const d = distanceToSegment(pt, di.waypoints[i], di.waypoints[i + 1]);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    const inserted = { x: Math.round(pt.x), y: Math.round(pt.y) };
    this.exec(
      updateWaypointsCommand(id, [
        ...di.waypoints.slice(0, best + 1),
        inserted,
        ...di.waypoints.slice(best + 1),
      ]),
    );
  }

  /**
   * Drags one waypoint handle of the selected edge with a ghost preview and
   * commits a single `updateWaypointsCommand` on release (marking the edge
   * manual). Escape cancels without a command.
   */
  protected onBendPointerDown(
    edgeId: string,
    index: number,
    event: PointerEvent,
  ): void {
    if (event.button !== 0 || this.locked()) {
      return;
    }
    const di = this.diagram().edgeDi[edgeId];
    if (!di || index < 0 || index >= di.waypoints.length) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    const base = di.waypoints.map((p) => ({ x: p.x, y: p.y }));
    const startX = event.clientX;
    const startY = event.clientY;
    let current = base;
    let moved = false;
    const onMove = (e: PointerEvent): void => {
      moved = moved || Math.hypot(e.clientX - startX, e.clientY - startY) > 3;
      const zoom = this.vp().zoom;
      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;
      current = base.map((p, i) =>
        i === index ? { x: Math.round(p.x + dx), y: Math.round(p.y + dy) } : p,
      );
      this.bendPreview.set(current.map((p) => `${p.x},${p.y}`).join(' '));
    };
    const finish = (cancelled: boolean): void => {
      cleanup();
      this.bendPreview.set(null);
      if (cancelled || !moved) {
        return;
      }
      this.exec(updateWaypointsCommand(edgeId, current));
    };
    const onUp = (): void => finish(false);
    const onCancel = (): void => finish(true);
    const onKeydown = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      finish(true);
    };
    const cleanup = (): void => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      document.removeEventListener('keydown', onKeydown, true);
      window.removeEventListener('blur', onCancel);
      this.activeGestureCleanup = null;
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    document.addEventListener('keydown', onKeydown, true);
    window.addEventListener('blur', onCancel);
    this.activeGestureCleanup = cleanup;
  }

  /**
   * Drags one corner resize handle of the selected node with a ghost preview:
   * the opposite corner stays fixed, the dragged corner grid-snaps (when
   * snapping is enabled) and is clamped to the type's `MIN_SIZES` entry. A
   * single `resizeNodeCommand` commits on release; Escape cancels without a
   * command.
   */
  protected onResizePointerDown(
    id: string,
    corner: BpmnResizeCorner,
    event: PointerEvent,
  ): void {
    if (event.button !== 0 || this.locked()) {
      return;
    }
    const m = this.diagram();
    const node = m.nodes[id];
    const di = m.shapeDi[id];
    const min =
      m.pools[id] !== undefined
        ? POOL_MIN_SIZE
        : node
          ? MIN_SIZES[node.type]
          : undefined;
    if (!di || !min) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    const base = di.bounds;
    const eastward = corner === 'ne' || corner === 'se';
    const southward = corner === 'sw' || corner === 'se';
    const fx = eastward ? base.x : base.x + base.width;
    const fy = southward ? base.y : base.y + base.height;
    const mx0 = eastward ? base.x + base.width : base.x;
    const my0 = southward ? base.y + base.height : base.y;
    const startX = event.clientX;
    const startY = event.clientY;
    let current: Rect = base;
    let moved = false;
    const onMove = (e: PointerEvent): void => {
      moved = moved || Math.hypot(e.clientX - startX, e.clientY - startY) > 3;
      const zoom = this.vp().zoom;
      let mx = mx0 + (e.clientX - startX) / zoom;
      let my = my0 + (e.clientY - startY) / zoom;
      if (this.snapEnabled()) {
        const grid = this.gridSize();
        mx = snapValue(mx, grid);
        my = snapValue(my, grid);
      }
      mx = eastward
        ? Math.max(mx, fx + min.width)
        : Math.min(mx, fx - min.width);
      my = southward
        ? Math.max(my, fy + min.height)
        : Math.min(my, fy - min.height);
      current = {
        x: Math.min(fx, mx),
        y: Math.min(fy, my),
        width: Math.abs(mx - fx),
        height: Math.abs(my - fy),
      };
      this.resizePreview.set(current);
    };
    const finish = (cancelled: boolean): void => {
      cleanup();
      this.resizePreview.set(null);
      if (cancelled || !moved) {
        return;
      }
      const before = this.diagram();
      this.exec(resizeNodeCommand(id, current));
      if (this.diagram() !== before) {
        this.announce(this.msg().announcements.resized, {
          name: this.displayName(id),
        });
      }
    };
    const onUp = (): void => finish(false);
    const onCancel = (): void => finish(true);
    const onKeydown = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      finish(true);
    };
    const cleanup = (): void => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      document.removeEventListener('keydown', onKeydown, true);
      window.removeEventListener('blur', onCancel);
      this.activeGestureCleanup = null;
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    document.addEventListener('keydown', onKeydown, true);
    window.addEventListener('blur', onCancel);
    this.activeGestureCleanup = cleanup;
  }

  // ------------------------------------------------------- properties panel

  /**
   * Executes an engine command requested by the properties panel, announcing
   * recolor and type-morph results (derived by diffing the model, so denied or
   * no-op commands stay silent).
   */
  protected onPanelCommand(command: BpmnCommand): void {
    if (this.locked()) {
      return;
    }
    const before = this.diagram();
    this.exec(command);
    const after = this.diagram();
    if (after === before) {
      return;
    }
    const a = this.msg().announcements;
    if (command.label === 'Set colors') {
      let count = 0;
      for (const [id, di] of Object.entries(after.shapeDi)) {
        if (before.shapeDi[id] !== di) {
          count++;
        }
      }
      for (const [id, di] of Object.entries(after.edgeDi)) {
        if (before.edgeDi[id] !== di) {
          count++;
        }
      }
      this.announce(a.recolored, { count });
      return;
    }
    if (command.label === 'Change element type') {
      for (const [id, node] of Object.entries(after.nodes)) {
        const previous = before.nodes[id];
        if (previous && previous.type !== node.type) {
          this.announce(a.typeChanged, {
            name: this.displayName(id),
            type: this.msg().elementNames[node.type],
          });
          return;
        }
      }
      return;
    }
    if (command.label === 'Add lane' || command.label === 'Remove lane') {
      for (const [poolId, pool] of Object.entries(after.pools)) {
        if (before.pools[poolId] !== pool) {
          this.announce(
            command.label === 'Add lane' ? a.laneAdded : a.laneRemoved,
            { name: this.displayName(poolId) },
          );
          return;
        }
      }
      return;
    }
    if (command.label === 'Toggle sub-process collapse') {
      for (const [id, node] of Object.entries(after.nodes)) {
        const previous = before.nodes[id];
        if (
          previous &&
          previous.type !== 'textAnnotation' &&
          node.type !== 'textAnnotation' &&
          previous.collapsed !== node.collapsed
        ) {
          this.announce(a.collapsedToggled, { name: this.displayName(id) });
          return;
        }
      }
    }
  }

  // ------------------------------------------------------------- autosave

  private scheduleDiagramChanged(source: OgeBpmnChangeSource): void {
    const delay = this.config.autoSaveDebounceMs ?? 500;
    if (delay <= 0) {
      this.emitDiagramChanged(source);
      return;
    }
    if (this.autosaveTimer !== null) {
      clearTimeout(this.autosaveTimer);
    }
    this.autosaveTimer = setTimeout(() => {
      this.autosaveTimer = null;
      this.emitDiagramChanged(source);
    }, delay);
  }

  private emitDiagramChanged(source: OgeBpmnChangeSource): void {
    const m = this.diagram();
    this.diagramChanged.emit({
      json: toBpmnJson(m),
      xml: writeBpmnXml(m),
      source,
    });
  }

  private beginMoveDrag(event: PointerEvent): void {
    const m = this.diagram();
    const ids = this.selection().filter(
      (id) => (m.nodes[id] || m.pools[id]) && m.shapeDi[id],
    );
    if (ids.length === 0) {
      return;
    }
    const startBounds = m.shapeDi[ids[0]].bounds;
    const dragged = new Set(ids);
    const neighborRects = Object.entries(m.shapeDi)
      .filter(([id]) => !dragged.has(id))
      .map(([, di]) => di.bounds);
    const startX = event.clientX;
    const startY = event.clientY;
    this.dragState.set({ ids, dx: 0, dy: 0, moved: false, guides: [] });

    const target = event.target as HTMLElement | null;
    if (target && typeof target.setPointerCapture === 'function') {
      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        /* jsdom / detached elements — capture is a progressive enhancement */
      }
    }

    const onMove = (e: PointerEvent): void => {
      const zoom = this.vp().zoom;
      const rawDx = (e.clientX - startX) / zoom;
      const rawDy = (e.clientY - startY) / zoom;
      const moved =
        (this.dragState()?.moved ?? false) ||
        Math.hypot(e.clientX - startX, e.clientY - startY) > 3;
      let dx = rawDx;
      let dy = rawDy;
      let guides: readonly BpmnSnapGuide[] = [];
      if (this.snapEnabled()) {
        const grid = this.gridSize();
        dx = snapValue(startBounds.x + rawDx, grid) - startBounds.x;
        dy = snapValue(startBounds.y + rawDy, grid) - startBounds.y;
        const snap = snapToNeighbors(
          translateRect(startBounds, dx, dy),
          neighborRects,
          this.snapThreshold(),
        );
        dx += snap.dx;
        dy += snap.dy;
        guides = snap.guides;
      }
      this.dragState.set({ ids, dx, dy, moved, guides });
    };
    const finish = (cancelled: boolean): void => {
      cleanup();
      const state = this.dragState();
      this.dragState.set(null);
      if (cancelled || state === null || !state.moved) {
        return;
      }
      if (state.dx === 0 && state.dy === 0) {
        return;
      }
      this.exec(moveElementsCommand(state.ids, state.dx, state.dy));
      this.announce(this.msg().announcements.moved, {
        name: this.displayName(state.ids[0]),
      });
    };
    const onUp = (): void => finish(false);
    const onCancel = (): void => finish(true);
    const onKeydown = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      finish(true);
    };
    const onWindowBlur = (): void => finish(true);
    const cleanup = (): void => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      document.removeEventListener('keydown', onKeydown, true);
      window.removeEventListener('blur', onWindowBlur);
      this.activeGestureCleanup = null;
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    document.addEventListener('keydown', onKeydown, true);
    window.addEventListener('blur', onWindowBlur);
    this.activeGestureCleanup = cleanup;
  }

  private beginPan(event: PointerEvent): void {
    event.preventDefault();
    const start = this.vp();
    const startX = event.clientX;
    const startY = event.clientY;
    const onMove = (e: PointerEvent): void => {
      this.vp.set({
        x: start.x + e.clientX - startX,
        y: start.y + e.clientY - startY,
        zoom: start.zoom,
      });
    };
    const finish = (): void => cleanup();
    const cleanup = (): void => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', finish);
      window.removeEventListener('blur', finish);
      this.activeGestureCleanup = null;
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', finish);
    document.addEventListener('pointercancel', finish);
    window.addEventListener('blur', finish);
    this.activeGestureCleanup = cleanup;
  }

  private cancelTool(): void {
    this.tool.set({ kind: 'select' });
    this.rubberBand.set(null);
    this.connectHover.set(null);
    this.attachHover.set(null);
  }

  protected zoomStep(factor: number): void {
    const size = this.hostSize();
    const cursor = size
      ? { x: size.width / 2, y: size.height / 2 }
      : { x: 0, y: 0 };
    this.vp.set(
      zoomAt(this.vp(), cursor, factor, this.zoomMin(), this.zoomMax()),
    );
  }

  private setSelection(ids: readonly string[], announceIt: boolean): void {
    const previous = this.selection();
    if (
      previous.length === ids.length &&
      previous.every((id, i) => id === ids[i])
    ) {
      return;
    }
    this.selection.set(ids);
    this.tabExitArmed = false;
    this.alignMenuOpen.set(false);
    const m = this.diagram();
    this.selectionChanged.emit({ ids, elements: this.elementInfos(m, ids) });
    if (announceIt && ids.length >= 1) {
      this.announce(this.msg().announcements.selected, {
        name: this.displayName(ids[ids.length - 1]),
      });
    }
  }

  private elementInfos(
    m: BpmnDiagram,
    ids: readonly string[],
  ): readonly OgeBpmnElementInfo[] {
    const infos: OgeBpmnElementInfo[] = [];
    for (const id of ids) {
      const node = m.nodes[id];
      if (node) {
        infos.push({
          id,
          type: node.type,
          ...(node.type !== 'textAnnotation' && node.name !== undefined
            ? { name: node.name }
            : {}),
        });
        continue;
      }
      const pool = m.pools[id];
      if (pool) {
        infos.push({
          id,
          type: 'pool',
          ...(pool.name !== undefined ? { name: pool.name } : {}),
        });
        continue;
      }
      const edge = m.edges[id];
      if (edge) {
        infos.push({
          id,
          type: edge.type,
          ...((edge.type === 'sequenceFlow' || edge.type === 'messageFlow') &&
          edge.name !== undefined
            ? { name: edge.name }
            : {}),
        });
      }
    }
    return infos;
  }

  private displayName(id: string): string {
    const m = this.diagram();
    const names = this.msg().elementNames;
    const node = m.nodes[id];
    if (node) {
      return node.type === 'textAnnotation'
        ? names[node.type]
        : (node.name ?? names[node.type]);
    }
    const pool = m.pools[id];
    if (pool) {
      return pool.name ?? names['pool'];
    }
    const edge = m.edges[id];
    if (edge) {
      return edge.type === 'sequenceFlow' || edge.type === 'messageFlow'
        ? (edge.name ?? names[edge.type])
        : names[edge.type];
    }
    return id;
  }

  private announce(
    template: string,
    params: Readonly<Record<string, string | number>>,
  ): void {
    this.announcement.set(
      template.replace(/\{(\w+)\}/g, (match, token: string) =>
        token in params ? String(params[token]) : match,
      ),
    );
  }

  private toScreen(event: { clientX: number; clientY: number }): Point {
    const rect = this.wrapEl()?.nativeElement.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      return { x: event.clientX, y: event.clientY };
    }
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private toDiagram(event: { clientX: number; clientY: number }): Point {
    return screenToDiagram(this.vp(), this.toScreen(event));
  }

  private hostSize(): { width: number; height: number } | null {
    const el = this.wrapEl()?.nativeElement;
    if (!el) {
      return null;
    }
    const width = el.clientWidth;
    const height = el.clientHeight;
    return width > 0 && height > 0 ? { width, height } : null;
  }
}
