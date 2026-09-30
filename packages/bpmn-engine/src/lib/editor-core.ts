/**
 * The BPMN editor's whole behaviour, framework-free (ADR 0003).
 *
 * Everything the modeler *does* — the tool machine, every pointer gesture
 * (move, marquee, connect rubber band, bend points, segments, resize, space
 * tool, palette drag, label drag, minimap pan, panel separators), the canvas
 * keyboard map, clipboard, search, alignment, announcements, autosave, the
 * public API and every view model the template draws — lives here once. The
 * Angular `<oge-bpmn-editor>` and the React `<OgeBpmnEditor>` are thin
 * templates over one instance of this class, fed the same `.oge-bpmn-*`
 * markup and the same stylesheet.
 *
 * State is held through {@link OgeBpmnReactivity} (signals in Angular, a
 * versioned store in React); DOM access goes through {@link OgeBpmnEditorHost}
 * so the core never assumes a framework's element refs. Standard DOM APIs
 * (document listeners, `getBoundingClientRect`, the Fullscreen API) are used
 * directly — they are the platform, not a framework.
 */
import type {
  OgeBpmnChangeSource,
  OgeBpmnDiagramChangedEvent,
  OgeBpmnElementInfo,
  OgeBpmnElementsChangedEvent,
  OgeBpmnImportEvent,
  OgeBpmnOverlay,
  OgeBpmnSelectionEvent,
} from './bpmn-types';
import type {
  BpmnPaletteItemType,
  OgeBpmnConfig,
  OgeBpmnMessages,
} from './config';
import { OGE_DEFAULT_BPMN_COLOR_PRESETS } from './config';
import type { BpmnDiagram, BpmnEdgeType, BpmnNodeType } from './bpmn-model';
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
} from './bpmn-model';
import {
  activityMarkerPaths,
  collapsedMarkerPath,
  dataObjectPath,
  dataStorePath,
  eventDefinitionFilled,
  eventDefinitionPath,
} from './glyphs';
import type { BpmnCommand } from './command-stack';
import { BpmnCommandStack } from './command-stack';
import type { BpmnClipboard } from './commands';
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
} from './commands';
import type { BpmnAlignMode, BpmnDistributeAxis } from './alignment';
import { edgeLabelAnchor, routeOrthogonal } from './edge-routing';
import type { Point, Rect } from './geometry';
import {
  boundsOfRects,
  distanceToSegment,
  edgeHitTest,
  inflateRect,
  rectContainsPoint,
  rectsIntersect,
  translateRect,
} from './geometry';
import type { BpmnDiagramJson } from './bpmn-json';
import { fromBpmnJson, toBpmnJson } from './bpmn-json';
import { renderDiagramSvg } from './svg-export';
import { connectionKindFor } from './rules';
import type { BpmnSnapGuide } from './snapping';
import { snapPoint, snapToNeighbors, snapValue } from './snapping';
import type { BpmnViewport } from './viewport';
import {
  diagramToScreen,
  fitViewport,
  screenToDiagram,
  zoomAt,
} from './viewport';
import type { BpmnImportResult } from './bpmn-xml-reader';
import { readBpmnXml } from './bpmn-xml-reader';
import { writeBpmnXml } from './bpmn-xml-writer';
import type { OgeBpmnReactiveCell, OgeBpmnReactivity } from './reactivity';

// ------------------------------------------------------------------ types

/** The editor's UI mode: `'view'` locks every mutating surface like `readOnly`. */
export type OgeBpmnEditorMode = 'edit' | 'view';

/**
 * The active canvas tool: plain selection, click-then-place, connect, or one
 * of the tool-strip modes (hand pan, explicit lasso, space tool, global
 * connect awaiting its source). Escape always returns to `select`.
 */
export type BpmnTool =
  | { readonly kind: 'select' }
  | { readonly kind: 'place'; readonly nodeType: BpmnPaletteItemType }
  | { readonly kind: 'connect'; readonly sourceId: string }
  | { readonly kind: 'hand' }
  | { readonly kind: 'lasso' }
  | { readonly kind: 'space' }
  | { readonly kind: 'globalConnect' };

/** The four tool-strip tools. */
export type BpmnStripTool = 'hand' | 'lasso' | 'space' | 'globalConnect';

/** Which user-resizable rail a separator drives. */
export type BpmnPanel = 'rail' | 'properties';

/** Transient move-drag state; pointermove writes only this. */
export interface BpmnDragState {
  readonly ids: readonly string[];
  readonly dx: number;
  readonly dy: number;
  readonly moved: boolean;
  readonly guides: readonly BpmnSnapGuide[];
}

/** One wrapped label line of a shape, in shape-local coordinates. */
export interface BpmnLabelLine {
  readonly text: string;
  readonly y: number;
}

/** Everything the template draws for one flow node / annotation. */
export interface BpmnNodeView {
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

/** One lane band of a pool. */
export interface BpmnLaneView {
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

/** One pool band with its lanes. */
export interface BpmnPoolView {
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

/** One connection. */
export interface BpmnEdgeView {
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
export type BpmnResizeCorner = 'nw' | 'ne' | 'se' | 'sw';

/** A rect with the element id it belongs to. */
export type BpmnIdRect = Rect & { readonly id: string };

/** The single-selection context pad. */
export interface BpmnPadView {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly connect: boolean;
  readonly append: boolean;
  readonly editLabel: boolean;
  readonly toggleDefault: boolean;
  readonly isDefault: boolean;
  readonly ariaLabel: string;
}

/** The multi-selection pad (align/distribute flyout + delete). */
export interface BpmnMultiPadView {
  readonly ids: readonly string[];
  readonly x: number;
  readonly y: number;
}

/** Screen geometry of the inline label editor. */
export interface BpmnLabelEditView {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fontSize: number;
}

/** The minimap scene in its fixed 180×120 box. */
export interface BpmnMinimapView {
  readonly shapes: readonly (Rect & {
    readonly kind: 'rect' | 'circle' | 'diamond';
  })[];
  readonly viewport: Rect;
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

/** A screen-positioned overlay badge. */
export interface BpmnOverlayView {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly html: string;
}

/** A guide line of the move snap, in diagram coordinates. */
export interface BpmnGuideLine {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/** A search overlay result. */
export interface BpmnSearchResult {
  readonly id: string;
  readonly label: string;
}

/** The palette drag gesture's start payload. */
export interface BpmnPaletteDragStart {
  readonly type: BpmnPaletteItemType;
  readonly clientX: number;
  readonly clientY: number;
}

// Structural event inputs: a native DOM event and a React synthetic event
// both satisfy these, so each layer passes its own event unchanged (and a
// React handler's `stopPropagation()` stops React's own propagation).

/** The pointer fields a gesture reads. */
export interface BpmnPointerInput {
  readonly button: number;
  readonly clientX: number;
  readonly clientY: number;
  readonly shiftKey: boolean;
  readonly pointerId: number;
  readonly target: EventTarget | null;
  preventDefault(): void;
  stopPropagation(): void;
}

/** The mouse fields a double click reads. */
export interface BpmnMouseInput {
  readonly clientX: number;
  readonly clientY: number;
  preventDefault(): void;
  stopPropagation(): void;
}

/** The keyboard fields a key handler reads. */
export interface BpmnKeyInput {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  preventDefault(): void;
  stopPropagation(): void;
}

/** The wheel fields the zoom handler reads. */
export interface BpmnWheelInput {
  readonly deltaY: number;
  readonly clientX: number;
  readonly clientY: number;
  preventDefault(): void;
}

/** Where the editor's events go — outputs in Angular, callbacks in React. */
export interface OgeBpmnEditorEmitter {
  selectionChanged(event: OgeBpmnSelectionEvent): void;
  elementsChanged(event: OgeBpmnElementsChangedEvent): void;
  importCompleted(event: OgeBpmnImportEvent): void;
  dirtyChanged(dirty: boolean): void;
  diagramChanged(event: OgeBpmnDiagramChangedEvent): void;
}

/**
 * What the render layer provides: live inputs (read inside derived values, so
 * Angular tracks them), the resolved config, DOM accessors and the emitter.
 */
export interface OgeBpmnEditorHost {
  /** Unique per-instance prefix for element and defs ids. */
  readonly uid: string;
  readOnly(): boolean;
  mode(): OgeBpmnEditorMode;
  /** Writes the two-way mode back (Angular model / React controlled pair). */
  setMode(mode: OgeBpmnEditorMode): void;
  snapEnabled(): boolean;
  brandLogoUrl(): string | undefined;
  /** Per-instance message overrides, merged over `config().messages`. */
  messages(): Partial<OgeBpmnMessages>;
  config(): OgeBpmnConfig;
  /** The element fullscreen targets (the editor host). */
  hostElement(): HTMLElement | null;
  /** The focusable canvas wrapper (`.oge-bpmn-canvas-wrap`). */
  wrap(): HTMLElement | null;
  labelEdit(): HTMLTextAreaElement | null;
  searchInput(): HTMLInputElement | null;
  minimapSvg(): SVGSVGElement | null;
  readonly emit: OgeBpmnEditorEmitter;
}

const ARROWS: Readonly<Record<string, readonly [number, number]>> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

const CHAR_WIDTH = 12 * 0.58;

/** Wraps a label to at most three lines of the given width (ellipsis past that). */
export function wrapBpmnLabel(text: string, maxWidth: number): string[] {
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

/** Shortcuts advertised on the canvas via `aria-keyshortcuts`. */
export const BPMN_CANVAS_KEY_SHORTCUTS =
  'Control+Z Control+Y Control+C Control+X Control+V Control+A Control+F Delete F2 Enter C A F H L S + -';

/** Window-listener bookkeeping every document-level gesture shares. */
function listenGesture(handlers: {
  move?: (e: PointerEvent) => void;
  up: () => void;
  cancel: () => void;
  escape?: (e: KeyboardEvent) => void;
  blur: () => void;
}): () => void {
  const onKeydown = handlers.escape;
  if (handlers.move) document.addEventListener('pointermove', handlers.move);
  document.addEventListener('pointerup', handlers.up);
  document.addEventListener('pointercancel', handlers.cancel);
  if (onKeydown) document.addEventListener('keydown', onKeydown, true);
  window.addEventListener('blur', handlers.blur);
  return () => {
    if (handlers.move) {
      document.removeEventListener('pointermove', handlers.move);
    }
    document.removeEventListener('pointerup', handlers.up);
    document.removeEventListener('pointercancel', handlers.cancel);
    if (onKeydown) document.removeEventListener('keydown', onKeydown, true);
    window.removeEventListener('blur', handlers.blur);
  };
}

/** An Escape-cancels keydown listener for a capture-phase gesture. */
function escapeCancels(finish: (cancelled: boolean) => void) {
  return (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    finish(true);
  };
}

/**
 * The BPMN editor's framework-free core — see the module note. One instance
 * per rendered editor; the render layer calls {@link revive} on mount and
 * {@link destroy} on unmount (StrictMode-safe: destroy → revive restores the
 * model subscription on the same instance).
 */
export class OgeBpmnEditorCore {
  /** Unique per-instance prefix for element and defs ids. */
  readonly uid: string;
  /** Shortcuts advertised on the canvas via `aria-keyshortcuts`. */
  readonly keyShortcuts = BPMN_CANVAS_KEY_SHORTCUTS;
  /** Width of the pool name strip. */
  readonly poolHeaderWidth = POOL_HEADER_WIDTH;

  readonly RAIL_MIN = 48;
  readonly RAIL_MAX = 320;
  readonly PROPS_MIN = 180;
  readonly PROPS_MAX = 480;

  private readonly stack = new BpmnCommandStack(createEmptyDiagram());

  /** The current diagram model (synced from the command stack). */
  readonly diagram: OgeBpmnReactiveCell<BpmnDiagram>;
  /** Pan/zoom of the canvas. */
  readonly vp: OgeBpmnReactiveCell<BpmnViewport>;
  /** The selected element ids. */
  readonly selection: OgeBpmnReactiveCell<readonly string[]>;
  /** The active tool of the canvas. */
  readonly tool: OgeBpmnReactiveCell<BpmnTool>;
  /** Transient move-drag state. */
  readonly dragState: OgeBpmnReactiveCell<BpmnDragState | null>;
  /** Connect-tool preview endpoint in diagram coordinates. */
  readonly rubberBand: OgeBpmnReactiveCell<Point | null>;
  /** Connect-tool hover target and whether the connection would be allowed. */
  readonly connectHover: OgeBpmnReactiveCell<{
    readonly id: string;
    readonly allowed: boolean;
  } | null>;
  /** Activity whose border the armed boundary-event place tool would attach to. */
  readonly attachHover: OgeBpmnReactiveCell<string | null>;
  /** Marquee-selection rectangle in diagram coordinates, or null. */
  readonly marquee: OgeBpmnReactiveCell<Rect | null>;
  /** Ghost polyline points of an in-flight bend-point drag, or null. */
  readonly bendPreview: OgeBpmnReactiveCell<string | null>;
  /** Ghost bounds of an in-flight corner-resize drag, or null. */
  readonly resizePreview: OgeBpmnReactiveCell<Rect | null>;
  /** Id of the element whose label is being edited inline, or null. */
  readonly editingLabelId: OgeBpmnReactiveCell<string | null>;
  /** Working value of the inline label editor. */
  readonly editValue: OgeBpmnReactiveCell<string>;
  /** Ghost bounds of an in-flight palette drag-to-canvas gesture, or null. */
  readonly paletteDragGhost: OgeBpmnReactiveCell<Rect | null>;
  /** Ghost bounds of an in-flight external-label drag, or null. */
  readonly labelDragGhost: OgeBpmnReactiveCell<Rect | null>;
  /** Whether the element search overlay is open. */
  readonly searchOpen: OgeBpmnReactiveCell<boolean>;
  /** Live query of the element search overlay. */
  readonly searchQuery: OgeBpmnReactiveCell<string>;
  /** Index of the keyboard-active search result. */
  readonly searchActive: OgeBpmnReactiveCell<number>;
  /** Whether the align/distribute flyout of the multi-selection pad is open. */
  readonly alignMenuOpen: OgeBpmnReactiveCell<boolean>;
  /** Current live-region announcement text. */
  readonly announcement: OgeBpmnReactiveCell<string>;
  /** Width of the palette/tool rail; adjustable via its separator. */
  readonly railWidth: OgeBpmnReactiveCell<number>;
  /** Width of the properties panel; adjustable via its separator. */
  readonly propertiesWidth: OgeBpmnReactiveCell<number>;
  /** The properties panel's header-toggle collapse (session-scoped). */
  readonly propertiesCollapsed: OgeBpmnReactiveCell<boolean>;
  /** Fullscreen (native) or maximized-fallback state. */
  readonly maximized: OgeBpmnReactiveCell<boolean>;
  /** Registered HTML overlays (badges), keyed by their generated handle. */
  private readonly overlayDefs: OgeBpmnReactiveCell<
    readonly { readonly id: string; readonly def: OgeBpmnOverlay }[]
  >;
  /** Bumped when undo/redo availability may have changed. */
  private readonly historyRevision: OgeBpmnReactiveCell<number>;

  // --- derived ---------------------------------------------------------------

  /** Config-merged messages, overlaid by the per-instance overrides. */
  readonly msg: () => OgeBpmnMessages;
  /** The effective lock — `readOnly` or the `'view'` mode. */
  readonly locked: () => boolean;
  /** The badge image source resolved through the config chain. */
  readonly brandLogoSrc: () => string | undefined;
  /** Grid step in diagram units. */
  readonly gridSize: () => number;
  /** Fill presets passed to the properties panel's appearance section. */
  readonly colorPresets: () => readonly string[];
  private readonly snapThreshold: () => number;
  private readonly zoomMin: () => number;
  private readonly zoomMax: () => number;
  /** Current zoom as a whole percentage for the header display. */
  readonly zoomPercent: () => number;
  readonly canvasAriaLabel: () => string;
  readonly viewportTransform: () => string;
  readonly activeDescendant: () => string | null;
  readonly paletteActive: () => BpmnPaletteItemType | null;
  /** Reactive twins of `canUndo()` / `canRedo()` for templates. */
  readonly undoAvailable: () => boolean;
  readonly redoAvailable: () => boolean;
  private readonly hiddenNodes: () => ReadonlySet<string>;
  readonly nodeViews: () => readonly BpmnNodeView[];
  readonly edgeViews: () => readonly BpmnEdgeView[];
  readonly poolViews: () => readonly BpmnPoolView[];
  readonly dragGhosts: () => readonly BpmnIdRect[];
  readonly dragGuides: () => readonly BpmnGuideLine[];
  readonly rubberView: () => string | null;
  readonly selectionOutlines: () => readonly BpmnIdRect[];
  readonly bendHandles: () => readonly {
    readonly edgeId: string;
    readonly index: number;
    readonly x: number;
    readonly y: number;
  }[];
  readonly resizeHandles: () => readonly {
    readonly id: string;
    readonly corner: BpmnResizeCorner;
    readonly x: number;
    readonly y: number;
  }[];
  readonly padView: () => BpmnPadView | null;
  readonly labelEditView: () => BpmnLabelEditView | null;
  readonly multiPadView: () => BpmnMultiPadView | null;
  readonly searchResults: () => readonly BpmnSearchResult[];
  readonly dimmedIds: () => ReadonlySet<string>;
  readonly minimapView: () => BpmnMinimapView | null;
  readonly overlayViews: () => readonly BpmnOverlayView[];

  // --- plain (non-reactive) interaction state --------------------------------

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
  private overlayCounter = 0;
  private unsubscribe: (() => void) | null = null;
  private fullscreenListener: (() => void) | null = null;

  constructor(
    rx: OgeBpmnReactivity,
    private readonly host: OgeBpmnEditorHost,
  ) {
    this.uid = host.uid;
    this.diagram = rx.cell<BpmnDiagram>(this.stack.current);
    this.vp = rx.cell<BpmnViewport>({ x: 0, y: 0, zoom: 1 });
    this.selection = rx.cell<readonly string[]>([]);
    this.tool = rx.cell<BpmnTool>({ kind: 'select' });
    this.dragState = rx.cell<BpmnDragState | null>(null);
    this.rubberBand = rx.cell<Point | null>(null);
    this.connectHover = rx.cell<{
      readonly id: string;
      readonly allowed: boolean;
    } | null>(null);
    this.attachHover = rx.cell<string | null>(null);
    this.marquee = rx.cell<Rect | null>(null);
    this.bendPreview = rx.cell<string | null>(null);
    this.resizePreview = rx.cell<Rect | null>(null);
    this.editingLabelId = rx.cell<string | null>(null);
    this.editValue = rx.cell('');
    this.paletteDragGhost = rx.cell<Rect | null>(null);
    this.labelDragGhost = rx.cell<Rect | null>(null);
    this.searchOpen = rx.cell(false);
    this.searchQuery = rx.cell('');
    this.searchActive = rx.cell(0);
    this.alignMenuOpen = rx.cell(false);
    this.announcement = rx.cell('');
    this.railWidth = rx.cell(64);
    this.propertiesWidth = rx.cell(240);
    this.propertiesCollapsed = rx.cell(false);
    this.maximized = rx.cell(false);
    this.overlayDefs = rx.cell<
      readonly { readonly id: string; readonly def: OgeBpmnOverlay }[]
    >([]);
    this.historyRevision = rx.cell(0);

    this.msg = rx.derived(() => ({
      ...host.config().messages,
      ...host.messages(),
    }));
    this.locked = rx.derived(() => host.readOnly() || host.mode() === 'view');
    this.brandLogoSrc = rx.derived(
      () => host.brandLogoUrl() ?? host.config().brandLogoUrl,
    );
    this.gridSize = rx.derived(() => host.config().gridSize ?? 10);
    this.colorPresets = rx.derived(
      () => host.config().colorPresets ?? OGE_DEFAULT_BPMN_COLOR_PRESETS,
    );
    this.snapThreshold = rx.derived(() => host.config().snapThreshold ?? 5);
    this.zoomMin = rx.derived(() => host.config().zoomMin ?? 0.2);
    this.zoomMax = rx.derived(() => host.config().zoomMax ?? 4);
    this.zoomPercent = rx.derived(() => Math.round(this.vp().zoom * 100));
    this.canvasAriaLabel = rx.derived(
      () => `${this.msg().canvasLabel}. ${this.msg().canvasHint}`,
    );
    this.viewportTransform = rx.derived(() => {
      const v = this.vp();
      return `translate(${v.x} ${v.y}) scale(${v.zoom})`;
    });
    this.activeDescendant = rx.derived(() => {
      const sel = this.selection();
      return sel.length === 1 ? `${this.uid}-el-${sel[0]}` : null;
    });
    this.paletteActive = rx.derived(() => {
      const t = this.tool();
      return t.kind === 'place' ? t.nodeType : null;
    });
    this.undoAvailable = rx.derived(() => {
      this.historyRevision();
      this.diagram();
      return this.stack.canUndo;
    });
    this.redoAvailable = rx.derived(() => {
      this.historyRevision();
      this.diagram();
      return this.stack.canRedo;
    });
    this.hiddenNodes = rx.derived(() => hiddenByCollapsed(this.diagram()));
    this.nodeViews = rx.derived(() => this.buildNodeViews());
    this.edgeViews = rx.derived(() => this.buildEdgeViews());
    this.poolViews = rx.derived(() => this.buildPoolViews());
    this.dragGhosts = rx.derived(() => {
      const d = this.dragState();
      if (d === null || !d.moved) {
        return [] as readonly BpmnIdRect[];
      }
      const m = this.diagram();
      const ghosts: BpmnIdRect[] = [];
      for (const id of d.ids) {
        const di = m.shapeDi[id];
        if (di) {
          ghosts.push({ id, ...translateRect(di.bounds, d.dx, d.dy) });
        }
      }
      return ghosts;
    });
    this.dragGuides = rx.derived(() => {
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
    this.rubberView = rx.derived(() => {
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
    this.selectionOutlines = rx.derived(() => {
      const m = this.diagram();
      const outlines: BpmnIdRect[] = [];
      for (const id of this.selection()) {
        const di = m.shapeDi[id];
        if (di) {
          outlines.push({ id, ...inflateRect(di.bounds, 6) });
        }
      }
      return outlines;
    });
    this.bendHandles = rx.derived(() => {
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
    this.resizeHandles = rx.derived(() => this.buildResizeHandles());
    this.padView = rx.derived(() => this.buildPadView());
    this.labelEditView = rx.derived(() => this.buildLabelEditView());
    this.multiPadView = rx.derived(() => this.buildMultiPadView());
    this.searchResults = rx.derived(() => this.buildSearchResults());
    this.dimmedIds = rx.derived(() => this.buildDimmedIds());
    this.minimapView = rx.derived(() => this.buildMinimapView());
    this.overlayViews = rx.derived(() => this.buildOverlayViews());

    this.revive();
  }

  // ------------------------------------------------------------- lifecycle

  /**
   * (Re)connects the model subscription and the fullscreen listener.
   * Idempotent; called by the constructor and by React's effect mount side,
   * which StrictMode runs again after a cleanup on the same instance.
   */
  revive(): void {
    if (this.unsubscribe === null) {
      this.unsubscribe = this.stack.onChange((m, source) =>
        this.onModelChange(m, source),
      );
    }
    // Guarded: the core is also constructed during server rendering /
    // build-time prerender, where there is no global `document`.
    if (this.fullscreenListener === null && typeof document !== 'undefined') {
      const onFullscreenChange = (): void => {
        const hostEl = this.host.hostElement();
        if (
          this.maximized() &&
          document.fullscreenElement !== hostEl &&
          document.fullscreenElement !== null
        ) {
          return; // another element took fullscreen — not ours to track
        }
        if (this.maximized() && document.fullscreenElement === null) {
          this.maximized.set(false);
        }
      };
      document.addEventListener('fullscreenchange', onFullscreenChange);
      this.fullscreenListener = () =>
        document.removeEventListener('fullscreenchange', onFullscreenChange);
    }
  }

  /** Tears down listeners, an in-flight gesture and a pending autosave. */
  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.fullscreenListener?.();
    this.fullscreenListener = null;
    this.activeGestureCleanup?.();
    if (this.autosaveTimer !== null) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
  }

  private onModelChange(
    m: BpmnDiagram,
    source: 'execute' | 'undo' | 'redo' | 'reset',
  ): void {
    this.diagram.set(m);
    this.historyRevision.set(this.historyRevision() + 1);
    const kept = this.selection().filter(
      (id) => m.nodes[id] || m.edges[id] || m.pools[id],
    );
    if (kept.length !== this.selection().length) {
      this.selection.set(kept);
      this.host.emit.selectionChanged({
        ids: kept,
        elements: this.elementInfos(m, kept),
      });
    }
    const src: OgeBpmnChangeSource =
      source === 'reset' ? this.resetSource : source;
    this.host.emit.elementsChanged({ source: src, label: this.pendingLabel });
    this.scheduleDiagramChanged(src);
    const dirty = this.stack.isDirty;
    if (dirty !== this.lastDirty) {
      this.lastDirty = dirty;
      this.host.emit.dirtyChanged(dirty);
    }
  }

  /**
   * Applies a zoom factor written from outside (the two-way `zoom` input),
   * zooming around the canvas center. A value equal to the current zoom is a
   * no-op, which is what keeps the two-way loop from bouncing.
   */
  applyZoom(z: number): void {
    const v = this.vp();
    if (z === v.zoom) {
      return;
    }
    const size = this.hostSize();
    const cursor = size
      ? { x: size.width / 2, y: size.height / 2 }
      : { x: 0, y: 0 };
    this.vp.set(zoomAt(v, cursor, z / v.zoom, this.zoomMin(), this.zoomMax()));
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
    this.host.emit.importCompleted({ warnings: result.warnings });
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
      this.host.emit.dirtyChanged(false);
    }
  }

  /** Moves keyboard focus onto the diagram canvas. */
  focus(): void {
    this.host.wrap()?.focus();
  }

  /**
   * Pans the viewport (keeping the current zoom) so the given element is
   * centered in the canvas. Unknown ids are ignored.
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
   * Attaches an HTML badge to a diagram element and returns a handle for
   * {@link removeOverlay}. The badge tracks the element through pan/zoom and
   * model changes; a dangling `elementId` hides it without removing the
   * registration.
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

  // ------------------------------------------------------- header toolbar

  togglePropertiesPanel(): void {
    this.propertiesCollapsed.set(!this.propertiesCollapsed());
  }

  toggleMode(): void {
    this.host.setMode(this.host.mode() === 'edit' ? 'view' : 'edit');
  }

  /** Commits the header's diagram-name field (a native `change`). */
  onHeaderNameChange(raw: string): void {
    const value = raw.trim();
    this.stack.execute(
      updateProcessCommand({ name: value.length > 0 ? value : undefined }),
    );
  }

  /**
   * Native fullscreen when the platform offers it, a fixed-position
   * maximized fallback otherwise (some embeds deny the Fullscreen API).
   */
  toggleFullscreen(): void {
    const hostEl = this.host.hostElement() as
      (HTMLElement & { requestFullscreen?: () => Promise<void> }) | null;
    if (this.maximized()) {
      if (hostEl !== null && document.fullscreenElement === hostEl) {
        void document.exitFullscreen?.();
      }
      this.maximized.set(false);
      return;
    }
    if (hostEl !== null && typeof hostEl.requestFullscreen === 'function') {
      hostEl
        .requestFullscreen()
        .then(() => this.maximized.set(true))
        .catch(() => this.maximized.set(true)); // fallback class still applies
    } else {
      this.maximized.set(true);
    }
  }

  // ------------------------------------------------------- panel separators

  private panelWidthCell(panel: BpmnPanel): OgeBpmnReactiveCell<number> {
    return panel === 'rail' ? this.railWidth : this.propertiesWidth;
  }

  private panelWidthBounds(panel: BpmnPanel): [number, number] {
    return panel === 'rail'
      ? [this.RAIL_MIN, this.RAIL_MAX]
      : [this.PROPS_MIN, this.PROPS_MAX];
  }

  /** Separator drag — the splitter's gesture idiom (Escape restores). */
  onPanelResizeStart(event: BpmnPointerInput, panel: BpmnPanel): void {
    if (event.button !== 0) return;
    event.preventDefault();
    const width = this.panelWidthCell(panel);
    const [min, max] = this.panelWidthBounds(panel);
    const startX = event.clientX;
    const startWidth = width();
    // the properties panel sits on the right — dragging left widens it
    const direction = panel === 'rail' ? 1 : -1;
    capturePointer(event);
    const finish = (cancelled: boolean): void => {
      cleanup();
      if (cancelled) width.set(startWidth);
    };
    const cleanup = this.startGesture({
      move: (e) =>
        width.set(
          Math.min(
            Math.max(startWidth + direction * (e.clientX - startX), min),
            max,
          ),
        ),
      up: () => finish(false),
      cancel: () => finish(true),
      escape: escapeCancels(finish),
      blur: () => finish(true),
    });
  }

  /** APG window-splitter keys: arrows move the separator, Home/End to bounds. */
  onPanelResizeKey(event: BpmnKeyInput, panel: BpmnPanel): void {
    const width = this.panelWidthCell(panel);
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

  // ------------------------------------------------------------ interactions

  onToolPicked(type: BpmnPaletteItemType): void {
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

  onCanvasPointerDown(event: BpmnPointerInput): void {
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

  onCanvasPointerMove(event: { clientX: number; clientY: number }): void {
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

  onShapePointerDown(id: string, event: BpmnPointerInput): void {
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

  onEdgePointerDown(id: string, event: BpmnPointerInput): void {
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

  onWheel(event: BpmnWheelInput): void {
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

  onCanvasFocus(): void {
    this.tabExitArmed = false;
  }

  onCanvasKeyup(event: { readonly key: string }): void {
    if (event.key === ' ') {
      this.spaceHeld = false;
    }
  }

  onCanvasKeydown(event: BpmnKeyInput): void {
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

  onPadConnect(id: string): void {
    if (this.locked()) {
      return;
    }
    this.tool.set({ kind: 'connect', sourceId: id });
    this.focus();
  }

  onPadAppend(id: string, type: BpmnNodeType): void {
    this.appendFrom(id, type);
    this.focus();
  }

  onPadToggleDefault(edgeId: string): void {
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

  // ------------------------------------------------------------- tool strip

  /**
   * Toggles a tool-strip mode: picking the armed tool again (or Escape)
   * returns to select. Hand and lasso work in read-only mode; space and
   * global connect mutate and are blocked there.
   */
  onStripTool(kind: BpmnStripTool): void {
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

  toggleAlignMenu(): void {
    this.alignMenuOpen.set(!this.alignMenuOpen());
  }

  /** Aligns the multi-selection along the given edge/axis and announces the result. */
  onAlign(ids: readonly string[], mode: BpmnAlignMode): void {
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
  onDistribute(ids: readonly string[], axis: BpmnDistributeAxis): void {
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
  toggleSearch(forceOpen = false): void {
    if (this.searchOpen() && !forceOpen) {
      this.closeSearch();
      return;
    }
    this.searchOpen.set(true);
    this.searchActive.set(0);
    setTimeout(() => this.host.searchInput()?.focus(), 0);
  }

  private closeSearch(): void {
    this.searchOpen.set(false);
    this.searchQuery.set('');
    this.searchActive.set(0);
    this.focus();
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchActive.set(0);
    if (this.searchQuery().trim() !== '') {
      const m = this.diagram();
      const total = Object.keys(m.pools).length + m.order.length;
      this.announce(this.msg().announcements.searchResults, {
        count: total - this.dimmedIds().size,
      });
    }
  }

  onSearchKeydown(event: BpmnKeyInput): void {
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
  pickSearchResult(id: string): void {
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
  onPaletteDragStart(start: BpmnPaletteDragStart): void {
    if (this.locked()) {
      return;
    }
    const size =
      start.type === 'pool' ? POOL_DEFAULT_SIZE : DEFAULT_SIZES[start.type];
    let active = false;
    let lastPoint: Point | null = null;
    const finish = (cancelled: boolean): void => {
      cleanup();
      this.paletteDragGhost.set(null);
      this.attachHover.set(null);
      if (cancelled || !active || lastPoint === null) {
        return;
      }
      this.placeItem(start.type, lastPoint);
    };
    const cleanup = this.startGesture({
      move: (e) => {
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
        const center = this.host.snapEnabled()
          ? snapPoint(raw, this.gridSize())
          : raw;
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
      },
      up: () => finish(false),
      cancel: () => finish(true),
      escape: escapeCancels(finish),
      blur: () => finish(true),
    });
  }

  private isOverCanvas(event: { clientX: number; clientY: number }): boolean {
    const rect = this.host.wrap()?.getBoundingClientRect();
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
  onLabelPointerDown(id: string, event: BpmnPointerInput): void {
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
    const cleanup = this.startGesture({
      move: (e) => {
        moved = moved || Math.hypot(e.clientX - startX, e.clientY - startY) > 3;
        const zoom = this.vp().zoom;
        dx = Math.round((e.clientX - startX) / zoom);
        dy = Math.round((e.clientY - startY) / zoom);
        this.labelDragGhost.set(translateRect(base, dx, dy));
      },
      up: () => finish(false),
      cancel: () => finish(true),
      escape: escapeCancels(finish),
      blur: () => finish(true),
    });
  }

  // ---------------------------------------------------------------- space tool

  /**
   * The space-tool gesture: once the drag exceeds 10px the dominant axis
   * locks, every element whose center lies beyond the drag origin on that
   * axis previews a shift by the (grid-snapped) delta, and release commits a
   * single `makeSpaceCommand`. Escape cancels without a command.
   */
  private beginSpaceDrag(event: BpmnPointerInput): void {
    if (this.locked()) {
      return;
    }
    event.preventDefault();
    const origin = this.toDiagram(event);
    const startX = event.clientX;
    const startY = event.clientY;
    let axis: 'x' | 'y' | null = null;
    let delta = 0;
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
    const cleanup = this.startGesture({
      move: (e) => {
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
        if (this.host.snapEnabled()) {
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
      },
      up: () => finish(false),
      cancel: () => finish(true),
      escape: escapeCancels(finish),
      blur: () => finish(true),
    });
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
  onMinimapPointerDown(event: BpmnPointerInput): void {
    const mm = this.minimapView();
    const svg = this.host.minimapSvg();
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
    const finish = (): void => cleanup();
    const cleanup = this.startGesture({
      move: (e) => centerAt(e),
      up: finish,
      cancel: finish,
      blur: finish,
    });
  }

  // ---------------------------------------------- bendpoint remove & segments

  /**
   * Double-click on a bend handle removes that waypoint (endpoints and
   * 2-point edges are kept — the polyline never drops below 2 points). Stops
   * propagation so the edge's own dblclick-insert cannot fire.
   */
  onBendDblClick(edgeId: string, index: number, event: BpmnMouseInput): void {
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
  private beginSegmentDrag(edgeId: string, event: BpmnPointerInput): void {
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
    const finish = (cancelled: boolean): void => {
      cleanup();
      this.bendPreview.set(null);
      if (cancelled || !moved) {
        return;
      }
      this.exec(updateWaypointsCommand(edgeId, current));
    };
    const cleanup = this.startGesture({
      move: (e) => {
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
      },
      up: () => finish(false),
      cancel: () => finish(true),
      escape: escapeCancels(finish),
      blur: () => finish(true),
    });
  }

  // -------------------------------------------------------------- label edit

  /** Opens the inline label editor for the given element (dblclick / F2 / Enter). */
  startLabelEdit(id: string): void {
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
      this.editValue.set(
        node.type === 'textAnnotation' ? node.text : (node.name ?? ''),
      );
    } else if (pool) {
      if (!m.shapeDi[id]) {
        return;
      }
      this.editValue.set(pool.name ?? '');
    } else if (
      edge &&
      (edge.type === 'sequenceFlow' || edge.type === 'messageFlow')
    ) {
      this.editValue.set(edge.name ?? '');
    } else {
      return;
    }
    this.editingLabelId.set(id);
    setTimeout(() => this.host.labelEdit()?.focus(), 0);
  }

  onLabelEditInput(value: string): void {
    this.editValue.set(value);
  }

  onLabelEditKeydown(event: BpmnKeyInput): void {
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

  onLabelEditBlur(): void {
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
    this.exec(updateLabelCommand(id, this.editValue()));
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
  private beginMarquee(event: BpmnPointerInput, start: Point): void {
    const additive = event.shiftKey;
    const startX = event.clientX;
    const startY = event.clientY;
    let moved = false;
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
    const cleanup = this.startGesture({
      move: (e) => {
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
      },
      up: () => finish(false),
      cancel: () => finish(true),
      escape: escapeCancels(finish),
      blur: () => finish(true),
    });
  }

  // -------------------------------------------- edge-drag connect & bendpoints

  /**
   * Pointerdown on a shape's border ring: arms the connect tool from that
   * shape and drags a rubber band; releasing over a valid target commits the
   * connection, releasing elsewhere after a drag cancels, and a plain click
   * leaves the tool armed for the click-then-click path.
   */
  onRingPointerDown(id: string, event: BpmnPointerInput): void {
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
    const cleanup = this.startGesture({
      move: (e) => {
        moved = moved || Math.hypot(e.clientX - startX, e.clientY - startY) > 3;
        const pt = this.toDiagram(e);
        this.rubberBand.set(pt);
        this.updateConnectHover(pt, id);
      },
      up: () => finish(false),
      cancel: () => finish(true),
      escape: escapeCancels(finish),
      blur: () => finish(true),
    });
  }

  /**
   * Double-click on an edge inserts a bend point into its nearest segment
   * (marking the edge's waypoints as manual). Associations and edges without
   * DI fall back to opening the label editor.
   */
  onEdgeDblClick(id: string, event: BpmnMouseInput): void {
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
  onBendPointerDown(
    edgeId: string,
    index: number,
    event: BpmnPointerInput,
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
    const finish = (cancelled: boolean): void => {
      cleanup();
      this.bendPreview.set(null);
      if (cancelled || !moved) {
        return;
      }
      this.exec(updateWaypointsCommand(edgeId, current));
    };
    const cleanup = this.startGesture({
      move: (e) => {
        moved = moved || Math.hypot(e.clientX - startX, e.clientY - startY) > 3;
        const zoom = this.vp().zoom;
        const dx = (e.clientX - startX) / zoom;
        const dy = (e.clientY - startY) / zoom;
        current = base.map((p, i) =>
          i === index
            ? { x: Math.round(p.x + dx), y: Math.round(p.y + dy) }
            : p,
        );
        this.bendPreview.set(current.map((p) => `${p.x},${p.y}`).join(' '));
      },
      up: () => finish(false),
      cancel: () => finish(true),
      escape: escapeCancels(finish),
      blur: () => finish(true),
    });
  }

  /**
   * Drags one corner resize handle of the selected node with a ghost preview:
   * the opposite corner stays fixed, the dragged corner grid-snaps (when
   * snapping is enabled) and is clamped to the type's `MIN_SIZES` entry. A
   * single `resizeNodeCommand` commits on release; Escape cancels without a
   * command.
   */
  onResizePointerDown(
    id: string,
    corner: BpmnResizeCorner,
    event: BpmnPointerInput,
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
    const cleanup = this.startGesture({
      move: (e) => {
        moved = moved || Math.hypot(e.clientX - startX, e.clientY - startY) > 3;
        const zoom = this.vp().zoom;
        let mx = mx0 + (e.clientX - startX) / zoom;
        let my = my0 + (e.clientY - startY) / zoom;
        if (this.host.snapEnabled()) {
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
      },
      up: () => finish(false),
      cancel: () => finish(true),
      escape: escapeCancels(finish),
      blur: () => finish(true),
    });
  }

  // ------------------------------------------------------- properties panel

  /**
   * Executes an engine command requested by the properties panel, announcing
   * recolor and type-morph results (derived by diffing the model, so denied or
   * no-op commands stay silent).
   */
  onPanelCommand(command: BpmnCommand): void {
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
    const delay = this.host.config().autoSaveDebounceMs ?? 500;
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
    this.host.emit.diagramChanged({
      json: toBpmnJson(m),
      xml: writeBpmnXml(m),
      source,
    });
  }

  private beginMoveDrag(event: BpmnPointerInput): void {
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
    capturePointer(event);
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
    const cleanup = this.startGesture({
      move: (e) => {
        const zoom = this.vp().zoom;
        const rawDx = (e.clientX - startX) / zoom;
        const rawDy = (e.clientY - startY) / zoom;
        const moved =
          (this.dragState()?.moved ?? false) ||
          Math.hypot(e.clientX - startX, e.clientY - startY) > 3;
        let dx = rawDx;
        let dy = rawDy;
        let guides: readonly BpmnSnapGuide[] = [];
        if (this.host.snapEnabled()) {
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
      },
      up: () => finish(false),
      cancel: () => finish(true),
      escape: escapeCancels(finish),
      blur: () => finish(true),
    });
  }

  private beginPan(event: BpmnPointerInput): void {
    event.preventDefault();
    const start = this.vp();
    const startX = event.clientX;
    const startY = event.clientY;
    const finish = (): void => cleanup();
    const cleanup = this.startGesture({
      move: (e) =>
        this.vp.set({
          x: start.x + e.clientX - startX,
          y: start.y + e.clientY - startY,
          zoom: start.zoom,
        }),
      up: finish,
      cancel: finish,
      blur: finish,
    });
  }

  /** Registers one document-level gesture; the returned cleanup also clears the slot. */
  private startGesture(
    handlers: Parameters<typeof listenGesture>[0],
  ): () => void {
    const remove = listenGesture(handlers);
    const cleanup = (): void => {
      remove();
      this.activeGestureCleanup = null;
    };
    this.activeGestureCleanup = cleanup;
    return cleanup;
  }

  private cancelTool(): void {
    this.tool.set({ kind: 'select' });
    this.rubberBand.set(null);
    this.connectHover.set(null);
    this.attachHover.set(null);
  }

  /** Zooms by a factor around the canvas center (header buttons, `+`/`-`). */
  zoomStep(factor: number): void {
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
    this.host.emit.selectionChanged({
      ids,
      elements: this.elementInfos(m, ids),
    });
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
    const rect = this.host.wrap()?.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      return { x: event.clientX, y: event.clientY };
    }
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private toDiagram(event: { clientX: number; clientY: number }): Point {
    return screenToDiagram(this.vp(), this.toScreen(event));
  }

  private hostSize(): { width: number; height: number } | null {
    const el = this.host.wrap();
    if (!el) {
      return null;
    }
    const width = el.clientWidth;
    const height = el.clientHeight;
    return width > 0 && height > 0 ? { width, height } : null;
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

  // ------------------------------------------------------------- view models

  private buildNodeViews(): readonly BpmnNodeView[] {
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
      const wrapped = wrapBpmnLabel(text, below ? 90 : b.width - 12);
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
  }

  private buildEdgeViews(): readonly BpmnEdgeView[] {
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
  }

  private buildPoolViews(): readonly BpmnPoolView[] {
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
  }

  /**
   * The 4 corner resize handles of the single selected resizable node
   * (activities and text annotations only — events and gateways have a fixed
   * BPMN size, exactly as in bpmn-js). Empty in read-only mode and mid-drag.
   */
  private buildResizeHandles() {
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
      { id: sel[0], corner: 'nw' as const, x: b.x, y: b.y },
      { id: sel[0], corner: 'ne' as const, x: b.x + b.width, y: b.y },
      {
        id: sel[0],
        corner: 'se' as const,
        x: b.x + b.width,
        y: b.y + b.height,
      },
      { id: sel[0], corner: 'sw' as const, x: b.x, y: b.y + b.height },
    ];
  }

  private buildPadView(): BpmnPadView | null {
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
  }

  private buildLabelEditView(): BpmnLabelEditView | null {
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
  }

  /**
   * The multi-selection context pad (2+ movable elements): anchored to the
   * top-right of the joint bounding box, offering the align/distribute flyout
   * and delete. `ids` carries only the movable members (nodes and pools).
   */
  private buildMultiPadView(): BpmnMultiPadView | null {
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
  }

  /** Search matches (max 8) by case-insensitive name/id containment. */
  private buildSearchResults(): readonly BpmnSearchResult[] {
    const query = this.searchQuery().trim().toLocaleLowerCase();
    if (!this.searchOpen() || query === '') {
      return [];
    }
    const m = this.diagram();
    const names = this.msg().elementNames;
    const results: BpmnSearchResult[] = [];
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
  }

  /**
   * Elements dimmed while the search overlay is open with a non-empty query:
   * everything that does NOT match (the full match set, not just the visible
   * top-8 results).
   */
  private buildDimmedIds(): ReadonlySet<string> {
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
  }

  /**
   * The minimap scene: shape primitives and the current-viewport rectangle,
   * both mapped into the fixed 180×120 minimap box (fit-and-center math, no
   * `getScreenCTM`). Null while the diagram has no shapes.
   */
  private buildMinimapView(): BpmnMinimapView | null {
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
  }

  /**
   * Screen-positioned overlay badges: each registered overlay anchored to its
   * element's bounds corner (or center), transformed through the viewport.
   * Overlays whose element is missing from the model are omitted (hidden, not
   * removed — they reappear when the element id returns).
   */
  private buildOverlayViews(): readonly BpmnOverlayView[] {
    const defs = this.overlayDefs();
    if (defs.length === 0) {
      return [];
    }
    const m = this.diagram();
    const v = this.vp();
    const views: BpmnOverlayView[] = [];
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
  }
}

/** Pointer capture is a progressive enhancement (jsdom / detached nodes throw). */
function capturePointer(event: BpmnPointerInput): void {
  const target = event.target as HTMLElement | null;
  if (target && typeof target.setPointerCapture === 'function') {
    try {
      target.setPointerCapture(event.pointerId);
    } catch {
      /* jsdom / detached elements — capture is a progressive enhancement */
    }
  }
}
