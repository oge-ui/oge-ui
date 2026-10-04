'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { sanitizeResourceUrl } from '@oge-ui/behavior';
import {
  OGE_DEFAULT_BPMN_PALETTE_ITEMS,
  OgeBpmnEditorCore,
  type BpmnDiagramJson,
  type BpmnImportResult,
  type BpmnPaletteItemType,
  type OgeBpmnDiagramChangedEvent,
  type OgeBpmnEditorMode,
  type OgeBpmnElementsChangedEvent,
  type OgeBpmnImportEvent,
  type OgeBpmnMessages,
  type OgeBpmnOverlay,
  type OgeBpmnSelectionEvent,
} from '@oge-ui/bpmn-engine';
import { useOgeBpmnConfig } from './bpmn-config';
import { BpmnPalette } from './bpmn-palette';
import { BpmnProperties } from './bpmn-properties';
import { BpmnOverlayContent } from './overlay-content';
import { createBpmnRxAdapter } from './rx-adapter';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

/** Props of {@link OgeBpmnEditor}. */
export interface OgeBpmnEditorProps {
  /** Disables every mutation: palette, context pad, keyboard editing and drags. */
  readOnly?: boolean;
  /**
   * Current UI mode (controlled). `'view'` locks the editor exactly like
   * `readOnly`; the header offers a toggle when `allowModeToggle` is on.
   */
  mode?: OgeBpmnEditorMode;
  /** Initial mode when `mode` is uncontrolled. Default `'edit'`. */
  defaultMode?: OgeBpmnEditorMode;
  /** The mode toggle was used — the controlled half of `mode`. */
  onModeChange?: (mode: OgeBpmnEditorMode) => void;
  /** Shows the edit/view toggle in the header (hidden while `readOnly`). */
  allowModeToggle?: boolean;
  /** Shows the header toolbar (name, undo/redo, zoom, panel and mode toggles). */
  showHeader?: boolean;
  /**
   * Shows the OGE badge in the canvas corner. Removable exclusively from code
   * (`false`) — branding is a courtesy, never a license term.
   */
  showBranding?: boolean;
  /** Badge image URL; `undefined` falls back to config, then the drawn mark. */
  brandLogoUrl?: string;
  /** Shows the dotted background grid. */
  gridVisible?: boolean;
  /** Enables grid and neighbor-alignment snapping while moving and placing. */
  snapEnabled?: boolean;
  /** Palette items offered, in order; defaults to every placeable item. */
  paletteItems?: readonly BpmnPaletteItemType[];
  /** Shows the right-side properties panel (always hidden in `readOnly`). */
  showPropertiesPanel?: boolean;
  /** Shows the bottom-right minimap overlay (hidden while the diagram is empty). */
  showMinimap?: boolean;
  /** Per-instance message overrides, merged over the provider config. */
  messages?: Partial<OgeBpmnMessages>;
  /** Zoom factor (controlled); wheel zooming reports through `onZoomChange`. */
  zoom?: number;
  /** Initial zoom when `zoom` is uncontrolled. Default `1`. */
  defaultZoom?: number;
  /** The zoom changed (wheel, buttons, fit, keys) — the controlled half of `zoom`. */
  onZoomChange?: (zoom: number) => void;
  /** The selection changed (user interaction or `select()`). */
  onSelectionChanged?: (event: OgeBpmnSelectionEvent) => void;
  /** The diagram model changed: command, undo/redo, import or `newDiagram()`. */
  onElementsChanged?: (event: OgeBpmnElementsChangedEvent) => void;
  /** An `importXml()` call finished parsing; carries the fidelity warnings. */
  onImportCompleted?: (event: OgeBpmnImportEvent) => void;
  /** The dirty state flipped (model diverged from / returned to the save point). */
  onDirtyChanged?: (dirty: boolean) => void;
  /**
   * Debounced autosave stream: after model changes settle for
   * `autoSaveDebounceMs` (default 500ms; `0` emits synchronously) the diagram
   * is serialized once to both JSON and XML. Emitted for every source,
   * `import` and `new` included — filter on `source`.
   */
  onDiagramChanged?: (event: OgeBpmnDiagramChangedEvent) => void;
  /** Extra class on the host element. */
  className?: string;
  /** Inline style on the host element (give the editor its height here). */
  style?: CSSProperties;
}

/** The imperative handle of {@link OgeBpmnEditor} — the Angular public methods. */
export interface OgeBpmnEditorHandle {
  /** Parses BPMN XML and loads it, resetting history and fitting the viewport. */
  importXml(xml: string): Promise<BpmnImportResult>;
  /** Serializes the current diagram to deterministic BPMN 2.0 XML. */
  exportXml(): string;
  /** Wraps the current diagram in the versioned JSON persistence envelope. */
  exportJson(): BpmnDiagramJson;
  /** Validates and loads a JSON envelope; returns the error on failure. */
  importJson(value: unknown): { error?: string };
  /** Renders the current diagram as a self-contained static SVG string. */
  exportSvg(): string;
  /** Replaces the diagram with an empty one and resets history and viewport. */
  newDiagram(): void;
  /** Fits and centers the whole diagram in the canvas. */
  zoomToFit(): void;
  /** Pans (keeping the zoom) so the element is centered. Unknown ids are ignored. */
  centerOn(id: string): void;
  /** Selects the given element ids, pools included (unknown ids are ignored). */
  select(ids: readonly string[]): void;
  /** The currently selected element ids. */
  getSelection(): readonly string[];
  /** Deletes the selected elements (cascading to their attached edges). */
  deleteSelection(): void;
  /** Undoes the most recent command. */
  undo(): void;
  /** Re-applies the most recently undone command. */
  redo(): void;
  /** True when at least one command can be undone. */
  canUndo(): boolean;
  /** True when at least one undone command can be redone. */
  canRedo(): boolean;
  /** True when the model differs from the last save point. */
  isDirty(): boolean;
  /** Marks the current model as saved. */
  markSaved(): void;
  /** Moves keyboard focus onto the diagram canvas. */
  focus(): void;
  /** Attaches an HTML badge to an element; returns its handle. */
  addOverlay(overlay: OgeBpmnOverlay): string;
  /** Removes the overlay registered under the handle. */
  removeOverlay(id: string): void;
  /** Removes every overlay, or only those attached to `elementId`. */
  clearOverlays(elementId?: string): void;
}

/** Joins the truthy class names. */
function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ');
}

/**
 * BPMN 2.0 diagram editor — the React render of the Angular
 * `<oge-bpmn-editor>`, over the same framework-free core
 * (`OgeBpmnEditorCore` in `@oge-ui/bpmn-engine`: palette click-then-place and
 * drag-to-canvas, ghost moves committed on release, context-pad
 * connect/append, inline label editing, orthogonal routing, snapshot
 * undo/redo and a keyboard-accessible `role="application"` canvas) and the
 * same stylesheet. No watermark.
 *
 * ```tsx
 * const editor = useRef<OgeBpmnEditorHandle>(null);
 * <OgeBpmnEditor ref={editor} style={{ height: 480 }} onElementsChanged={(e) => console.log(e.source)} />
 * ```
 */
export const OgeBpmnEditor = forwardRef<
  OgeBpmnEditorHandle,
  OgeBpmnEditorProps
>(function OgeBpmnEditorRender(props, ref) {
  const {
    readOnly = false,
    allowModeToggle = false,
    showHeader = true,
    showBranding = true,
    gridVisible = true,
    paletteItems = OGE_DEFAULT_BPMN_PALETTE_ITEMS,
    showPropertiesPanel = true,
    showMinimap = true,
    className,
    style,
  } = props;

  const config = useOgeBpmnConfig();
  const reactId = useId();
  const uid = `oge-bpmn-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [uncontrolledMode, setUncontrolledMode] = useState<OgeBpmnEditorMode>(
    props.defaultMode ?? 'edit',
  );
  const mode = props.mode ?? uncontrolledMode;

  const hostRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const labelEditRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const minimapRef = useRef<SVGSVGElement>(null);

  // The core reads live props through this ref, so inline objects and
  // callbacks stay current without recreating it.
  const latest = useRef({ props, config, mode });
  latest.current = { props, config, mode };

  const rxRef = useRef<ReturnType<typeof createBpmnRxAdapter>>(undefined);
  const coreRef = useRef<OgeBpmnEditorCore>(undefined);
  if (!coreRef.current) {
    rxRef.current = createBpmnRxAdapter(() => rerender());
    const emit = <K extends keyof OgeBpmnEditorProps>(name: K) =>
      ((event: unknown) =>
        (latest.current.props[name] as ((e: unknown) => void) | undefined)?.(
          event,
        )) as never;
    coreRef.current = new OgeBpmnEditorCore(rxRef.current, {
      uid,
      readOnly: () => latest.current.props.readOnly ?? false,
      mode: () => latest.current.mode,
      setMode: (next) => {
        if (latest.current.props.mode === undefined) setUncontrolledMode(next);
        latest.current.props.onModeChange?.(next);
      },
      snapEnabled: () => latest.current.props.snapEnabled ?? true,
      brandLogoUrl: () => latest.current.props.brandLogoUrl,
      messages: () => latest.current.props.messages ?? {},
      config: () => latest.current.config,
      hostElement: () => hostRef.current,
      wrap: () => wrapRef.current,
      labelEdit: () => labelEditRef.current,
      searchInput: () => searchInputRef.current,
      minimapSvg: () => minimapRef.current,
      emit: {
        selectionChanged: emit('onSelectionChanged'),
        elementsChanged: emit('onElementsChanged'),
        importCompleted: emit('onImportCompleted'),
        dirtyChanged: emit('onDirtyChanged'),
        diagramChanged: emit('onDiagramChanged'),
      },
    });
  }
  const core = coreRef.current;
  // props may change without any cell write — derived views re-read them
  rxRef.current?.invalidate();

  // StrictMode runs cleanup → mount on the same instance, so the mount
  // side revives what the cleanup destroyed (the `revive()` pattern).
  useEffect(() => {
    core.revive();
    return () => core.destroy();
  }, [core]);

  // zoom prop → viewport, at mount too (Angular applies the initial model
  // value on its first change detection) and before paint.
  const reportedZoom = useRef(props.zoom ?? props.defaultZoom ?? 1);
  const zoomProp = props.zoom ?? null;
  const initialZoom = useRef(props.defaultZoom ?? 1);
  useIsomorphicLayoutEffect(() => {
    const z = zoomProp ?? initialZoom.current;
    reportedZoom.current = z;
    core.applyZoom(z);
  }, [core, zoomProp]);
  // viewport → zoom callback (wheel, buttons, fit, keys, imports)
  // (read live, not from this render: the layout effect above may already
  // have applied a newer zoom that this render has not painted yet)
  const currentZoom = core.vp().zoom;
  useEffect(() => {
    const z = core.vp().zoom;
    if (z !== reportedZoom.current) {
      reportedZoom.current = z;
      latest.current.props.onZoomChange?.(z);
    }
  }, [core, currentZoom]);

  // React's `onWheel` is passive; the zoom-at-cursor gesture must be able
  // to cancel the page scroll, so it is a native non-passive listener.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => core.onWheel(event);
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [core]);

  useImperativeHandle(
    ref,
    () => ({
      importXml: (xml) => core.importXml(xml),
      exportXml: () => core.exportXml(),
      exportJson: () => core.exportJson(),
      importJson: (value) => core.importJson(value),
      exportSvg: () => core.exportSvg(),
      newDiagram: () => core.newDiagram(),
      zoomToFit: () => core.zoomToFit(),
      centerOn: (id) => core.centerOn(id),
      select: (ids) => core.select(ids),
      getSelection: () => core.getSelection(),
      deleteSelection: () => core.deleteSelection(),
      undo: () => core.undo(),
      redo: () => core.redo(),
      canUndo: () => core.canUndo(),
      canRedo: () => core.canRedo(),
      isDirty: () => core.isDirty(),
      markSaved: () => core.markSaved(),
      focus: () => core.focus(),
      addOverlay: (overlay) => core.addOverlay(overlay),
      removeOverlay: (id) => core.removeOverlay(id),
      clearOverlays: (elementId) => core.clearOverlays(elementId),
    }),
    [core],
  );

  // --- render ---------------------------------------------------------------

  const msg = core.msg();
  const locked = core.locked();
  const maximized = core.maximized();
  const tool = core.tool();
  const diagram = core.diagram();
  const dimmed = core.dimmedIds();
  const connectHover = core.connectHover();
  const attachHover = core.attachHover();
  const propertiesCollapsed = core.propertiesCollapsed();
  const searchOpen = core.searchOpen();
  const brandLogoSrc = core.brandLogoSrc();
  const pad = core.padView();
  const multiPad = core.multiPadView();
  const minimap = core.minimapView();
  const labelEdit = core.labelEditView();
  const searchResults = core.searchResults();
  const searchActive = core.searchActive();
  const searchQuery = core.searchQuery();
  const gridSize = core.gridSize();
  const selection = core.selection();

  const header = showHeader && (
    <div
      className="oge-bpmn-header"
      role="toolbar"
      aria-label={msg.header.label}
    >
      <HeaderName
        value={diagram.processName ?? ''}
        placeholder={msg.header.namePlaceholder}
        ariaLabel={msg.header.nameLabel}
        disabled={locked}
        onCommit={(value) => core.onHeaderNameChange(value)}
      />
      <span className="oge-bpmn-header-spacer" />
      <button
        type="button"
        className="oge-bpmn-header-btn"
        aria-keyshortcuts="Control+Z"
        disabled={locked || !core.canUndo()}
        aria-label={msg.header.undo}
        title={`${msg.header.undo} (Ctrl+Z)`}
        onClick={() => core.undo()}
      >
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <path d="M8 5 4 9l4 4M4 9h7a5 5 0 0 1 0 10h-1" />
        </svg>
      </button>
      <button
        type="button"
        className="oge-bpmn-header-btn"
        aria-keyshortcuts="Control+Y"
        disabled={locked || !core.canRedo()}
        aria-label={msg.header.redo}
        title={`${msg.header.redo} (Ctrl+Y)`}
        onClick={() => core.redo()}
      >
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <path d="m12 5 4 4-4 4M16 9H9a5 5 0 0 0 0 10h1" />
        </svg>
      </button>
      <span className="oge-bpmn-header-sep" aria-hidden="true" />
      <button
        type="button"
        className="oge-bpmn-header-btn"
        aria-label={msg.header.zoomOut}
        title={msg.header.zoomOut}
        onClick={() => core.zoomStep(1 / 1.2)}
      >
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <path d="M4 10h12" />
        </svg>
      </button>
      <button
        type="button"
        className="oge-bpmn-header-btn oge-bpmn-header-zoom"
        aria-label={msg.header.zoomFit}
        title={`${msg.header.zoomFit} (F)`}
        onClick={() => core.zoomToFit()}
      >
        {core.zoomPercent()}%
      </button>
      <button
        type="button"
        className="oge-bpmn-header-btn"
        aria-label={msg.header.zoomIn}
        title={msg.header.zoomIn}
        onClick={() => core.zoomStep(1.2)}
      >
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <path d="M10 4v12M4 10h12" />
        </svg>
      </button>
      <span className="oge-bpmn-header-sep" aria-hidden="true" />
      {allowModeToggle && !readOnly && (
        <button
          type="button"
          className="oge-bpmn-header-btn"
          aria-pressed={mode === 'edit'}
          aria-label={
            mode === 'edit' ? msg.header.modeView : msg.header.modeEdit
          }
          title={mode === 'edit' ? msg.header.modeView : msg.header.modeEdit}
          onClick={() => core.toggleMode()}
        >
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            {mode === 'edit' ? (
              <>
                <path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10Z" />
                <circle cx="10" cy="10" r="2.5" />
              </>
            ) : (
              <path d="m13 3 4 4L7 17l-4.5 1L4 13.5 13 3Z" />
            )}
          </svg>
        </button>
      )}
      {showPropertiesPanel && !locked && (
        <button
          type="button"
          className="oge-bpmn-header-btn"
          aria-pressed={!propertiesCollapsed}
          aria-label={msg.header.panelToggle}
          title={msg.header.panelToggle}
          onClick={() => core.togglePropertiesPanel()}
        >
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <rect x="3" y="4" width="14" height="12" rx="2" />
            <path d="M13 4v12" />
          </svg>
        </button>
      )}
      <button
        type="button"
        className="oge-bpmn-header-btn"
        aria-pressed={maximized}
        aria-label={
          maximized ? msg.header.fullscreenExit : msg.header.fullscreenEnter
        }
        title={
          maximized ? msg.header.fullscreenExit : msg.header.fullscreenEnter
        }
        onClick={() => core.toggleFullscreen()}
      >
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          {maximized ? (
            <path d="M8 3v5H3M12 3v5h5M8 17v-5H3M12 17v-5h5" />
          ) : (
            <path d="M3 8V3h5M17 8V3h-5M3 12v5h5M17 12v5h-5" />
          )}
        </svg>
      </button>
    </div>
  );

  const stripButton = (
    kind: 'hand' | 'lasso' | 'space' | 'globalConnect',
    label: string,
    title: string,
    shortcut: string | undefined,
    icon: ReactNode,
    disabled = false,
  ) => (
    <button
      type="button"
      className={cx(
        'oge-bpmn-tool-btn',
        tool.kind === kind && 'oge-bpmn-tool-active',
      )}
      aria-keyshortcuts={shortcut}
      aria-pressed={tool.kind === kind}
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={() => core.onStripTool(kind)}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        {icon}
      </svg>
    </button>
  );

  const dropClasses = (id: string) => ({
    ok: connectHover?.id === id && connectHover.allowed === true,
    deny: connectHover?.id === id && connectHover.allowed === false,
  });

  return (
    <div
      ref={hostRef}
      className={cx(
        'oge-bpmn-editor',
        locked && 'oge-bpmn-readonly',
        maximized && 'oge-bpmn-maximized',
        className,
      )}
      style={style}
    >
      {header}
      <div className="oge-bpmn-body">
        <div
          className="oge-bpmn-rail"
          style={{ inlineSize: `${core.railWidth()}px` }}
        >
          {/* A viewer renders no palette at all: an all-disabled scrollable
                toolbar is dead chrome and an axe scrollable-region violation. */}
          {!locked && (
            <BpmnPalette
              items={paletteItems}
              labels={msg.paletteLabels}
              activeType={core.paletteActive()}
              label={msg.paletteLabel}
              onToolPicked={(type) => core.onToolPicked(type)}
              onDragStarted={(start) => core.onPaletteDragStart(start)}
            />
          )}
          <div
            className="oge-bpmn-toolstrip"
            role="toolbar"
            aria-orientation="vertical"
            aria-label={msg.tools.label}
          >
            {stripButton(
              'hand',
              msg.tools.hand,
              `${msg.tools.hand} (H)`,
              'H',
              <path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11m0-5.5a1.5 1.5 0 0 1 3 0V11m0-3.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-.6a6 6 0 0 1-5-2.7L4 14.6a1.5 1.5 0 0 1 2.4-1.8L8 15" />,
            )}
            {stripButton(
              'lasso',
              msg.tools.lasso,
              `${msg.tools.lasso} (L)`,
              'L',
              <rect
                x="4"
                y="4"
                width="16"
                height="16"
                rx="2"
                strokeDasharray="3 3"
              />,
            )}
            {stripButton(
              'space',
              msg.tools.space,
              `${msg.tools.space} (S)`,
              'S',
              <path d="M12 4v16M7 9 4 12l3 3M17 9l3 3-3 3M4 12h5M15 12h5" />,
              locked,
            )}
            {stripButton(
              'globalConnect',
              msg.tools.globalConnect,
              msg.tools.globalConnect,
              undefined,
              <>
                <circle cx="6" cy="6" r="2.5" />
                <circle cx="18" cy="18" r="2.5" />
                <path d="M8 8l8 8M16 12v4h-4" />
              </>,
              locked,
            )}
            <button
              type="button"
              className={cx(
                'oge-bpmn-tool-btn',
                searchOpen && 'oge-bpmn-tool-active',
              )}
              aria-keyshortcuts="Control+F"
              aria-pressed={searchOpen}
              aria-label={msg.tools.search}
              title={`${msg.tools.search} (Ctrl+F)`}
              onClick={() => core.toggleSearch()}
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                aria-hidden="true"
              >
                <circle cx="10.5" cy="10.5" r="5.5" />
                <path d="M15 15l5 5" />
              </svg>
            </button>
          </div>
        </div>
        <div
          className="oge-bpmn-resizer"
          role="separator"
          aria-orientation="vertical"
          tabIndex={0}
          aria-label={msg.railResizeLabel}
          aria-valuemin={core.RAIL_MIN}
          aria-valuemax={core.RAIL_MAX}
          aria-valuenow={core.railWidth()}
          onPointerDown={(e) => core.onPanelResizeStart(e, 'rail')}
          onKeyDown={(e) => core.onPanelResizeKey(e, 'rail')}
        />
        <div
          ref={wrapRef}
          className="oge-bpmn-canvas-wrap"
          tabIndex={0}
          role="application"
          aria-label={core.canvasAriaLabel()}
          aria-roledescription={msg.canvasLabel}
          aria-activedescendant={core.activeDescendant() ?? undefined}
          aria-keyshortcuts={core.keyShortcuts}
          onKeyDown={(e) => core.onCanvasKeydown(e)}
          onKeyUp={(e) => core.onCanvasKeyup(e)}
          onFocus={(e) => {
            // the Angular (focus) listener sits on the wrap itself and
            // focus does not bubble; React's onFocus does
            if (e.target === e.currentTarget) core.onCanvasFocus();
          }}
        >
          <svg
            ref={svgRef}
            className={cx(
              'oge-bpmn-canvas',
              tool.kind === 'place' && 'oge-bpmn-tool-place',
              (tool.kind === 'connect' || tool.kind === 'globalConnect') &&
                'oge-bpmn-tool-connect',
              tool.kind === 'hand' && 'oge-bpmn-tool-hand',
              tool.kind === 'lasso' && 'oge-bpmn-tool-lasso',
              tool.kind === 'space' && 'oge-bpmn-tool-space',
            )}
            onPointerDown={(e) => core.onCanvasPointerDown(e)}
            onPointerMove={(e) => core.onCanvasPointerMove(e)}
          >
            <defs>
              <pattern
                id={`${uid}-grid`}
                patternUnits="userSpaceOnUse"
                width={gridSize}
                height={gridSize}
              >
                <circle className="oge-bpmn-grid-dot" cx="1" cy="1" r="1" />
              </pattern>
              <marker
                id={`${uid}-arrow`}
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="5"
                orient="auto-start-reverse"
                markerUnits="userSpaceOnUse"
              >
                <path className="oge-bpmn-arrow" d="M0 0 L10 5 L0 10 Z" />
              </marker>
              <marker
                id={`${uid}-open-arrow`}
                markerWidth="12"
                markerHeight="12"
                refX="10"
                refY="5"
                orient="auto-start-reverse"
                markerUnits="userSpaceOnUse"
              >
                <path className="oge-bpmn-open-arrow" d="M1 1 L10 5 L1 9 Z" />
              </marker>
            </defs>
            <g
              className="oge-bpmn-viewport"
              transform={core.viewportTransform()}
            >
              {gridVisible && (
                <rect
                  className="oge-bpmn-grid"
                  x="-10000"
                  y="-10000"
                  width="20000"
                  height="20000"
                  fill={`url(#${uid}-grid)`}
                />
              )}
              <g className="oge-bpmn-pools">
                {core.poolViews().map((p) => {
                  const drop = dropClasses(p.id);
                  return (
                    <g
                      key={p.id}
                      className={cx(
                        'oge-bpmn-pool',
                        dimmed.has(p.id) && 'oge-bpmn-dimmed',
                        p.selected && 'oge-bpmn-selected',
                        drop.ok && 'oge-bpmn-drop-ok',
                        drop.deny && 'oge-bpmn-drop-deny',
                      )}
                      id={`${uid}-el-${p.id}`}
                      role="img"
                      aria-label={p.ariaLabel}
                    >
                      <rect
                        className="oge-bpmn-pool-band"
                        style={{
                          fill: p.fill ?? undefined,
                          stroke: p.stroke ?? undefined,
                        }}
                        x={p.x}
                        y={p.y}
                        width={p.width}
                        height={p.height}
                      />
                      {p.lanes.map((lane) => (
                        <LaneBand key={lane.id} lane={lane} />
                      ))}
                      <rect
                        className="oge-bpmn-pool-header"
                        x={p.x}
                        y={p.y}
                        width={core.poolHeaderWidth}
                        height={p.height}
                        onPointerDown={(e) => core.onShapePointerDown(p.id, e)}
                        onDoubleClick={() => core.startLabelEdit(p.id)}
                      />
                      <rect
                        className="oge-bpmn-pool-border"
                        x={p.x}
                        y={p.y}
                        width={p.width}
                        height={p.height}
                        onPointerDown={(e) => core.onShapePointerDown(p.id, e)}
                      />
                      {p.name && (
                        <text
                          className="oge-bpmn-pool-name"
                          x={p.nameX}
                          y={p.nameY}
                          transform={p.nameTransform}
                        >
                          {p.name}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
              <g className="oge-bpmn-edges">
                {core.edgeViews().map((e) => (
                  <g
                    key={e.id}
                    className={cx(
                      'oge-bpmn-edge',
                      dimmed.has(e.id) && 'oge-bpmn-dimmed',
                      e.selected && 'oge-bpmn-selected',
                      e.association && 'oge-bpmn-association',
                      e.kind === 'messageFlow' && 'oge-bpmn-message-flow',
                      e.kind === 'dataAssociation' &&
                        'oge-bpmn-data-association',
                    )}
                    id={`${uid}-el-${e.id}`}
                    role="img"
                    aria-label={e.ariaLabel}
                    onPointerDown={(event) =>
                      core.onEdgePointerDown(e.id, event)
                    }
                    onDoubleClick={(event) => core.onEdgeDblClick(e.id, event)}
                  >
                    <polyline className="oge-bpmn-edge-hit" points={e.points} />
                    <polyline
                      className="oge-bpmn-edge-line"
                      style={{ stroke: e.stroke ?? undefined }}
                      points={e.points}
                      markerEnd={e.markerEnd ?? undefined}
                    />
                    {e.sourceDot && (
                      <circle
                        className="oge-bpmn-message-dot"
                        style={{ stroke: e.stroke ?? undefined }}
                        cx={e.sourceDot.x}
                        cy={e.sourceDot.y}
                        r="4"
                      />
                    )}
                    {e.defaultMark && (
                      <line
                        className="oge-bpmn-default-mark"
                        x1={e.defaultMark.x1}
                        y1={e.defaultMark.y1}
                        x2={e.defaultMark.x2}
                        y2={e.defaultMark.y2}
                      />
                    )}
                    {e.label && (
                      <text
                        className={cx(
                          'oge-bpmn-edge-label oge-bpmn-label',
                          !locked && 'oge-bpmn-label-external',
                        )}
                        data-owner={e.id}
                        x={e.labelX}
                        y={e.labelY}
                        onPointerDown={(event) =>
                          core.onLabelPointerDown(e.id, event)
                        }
                      >
                        {e.label}
                      </text>
                    )}
                  </g>
                ))}
              </g>
              <g className="oge-bpmn-shapes">
                {core.nodeViews().map((n) => {
                  const drop = dropClasses(n.id);
                  return (
                    <g
                      key={n.id}
                      className={cx(
                        'oge-bpmn-shape',
                        dimmed.has(n.id) && 'oge-bpmn-dimmed',
                        n.selected && 'oge-bpmn-selected',
                        (drop.ok || attachHover === n.id) && 'oge-bpmn-drop-ok',
                        drop.deny && 'oge-bpmn-drop-deny',
                      )}
                      id={`${uid}-el-${n.id}`}
                      role="img"
                      aria-label={n.ariaLabel}
                      transform={`translate(${n.x} ${n.y})`}
                      onPointerDown={(e) => core.onShapePointerDown(n.id, e)}
                      onDoubleClick={() => core.startLabelEdit(n.id)}
                    >
                      <NodeGlyph node={n} />
                      {n.markerPaths.map((markerPath, i) => (
                        <path
                          key={i}
                          className="oge-bpmn-marker"
                          style={{ stroke: n.stroke ?? undefined }}
                          d={markerPath}
                        />
                      ))}
                      {n.lines.map((line, i) => (
                        <text
                          key={i}
                          className={cx(
                            'oge-bpmn-label',
                            n.externalLabel &&
                              !locked &&
                              'oge-bpmn-label-external',
                          )}
                          data-owner={n.externalLabel ? n.id : undefined}
                          x={n.labelX}
                          y={line.y}
                          textAnchor={n.labelAnchor}
                          onPointerDown={
                            n.externalLabel
                              ? (e) => core.onLabelPointerDown(n.id, e)
                              : undefined
                          }
                        >
                          {line.text}
                        </text>
                      ))}
                      {!locked && (
                        <rect
                          className="oge-bpmn-shape-ring"
                          x="-4"
                          y="-4"
                          width={n.width + 8}
                          height={n.height + 8}
                          onPointerDown={(e) => core.onRingPointerDown(n.id, e)}
                        />
                      )}
                    </g>
                  );
                })}
              </g>
              <g className="oge-bpmn-preview">
                {core.dragGhosts().map((g) => (
                  <GhostRect key={g.id} rect={g} />
                ))}
                {core.dragGuides().map((guide, i) => (
                  <line
                    key={i}
                    className="oge-bpmn-snap-guide"
                    x1={guide.x1}
                    y1={guide.y1}
                    x2={guide.x2}
                    y2={guide.y2}
                  />
                ))}
                {core.rubberView() !== null && (
                  <polyline
                    className="oge-bpmn-rubber-band"
                    points={core.rubberView() ?? ''}
                  />
                )}
                {core.marquee() && (
                  <rect
                    className="oge-bpmn-marquee"
                    x={core.marquee()?.x}
                    y={core.marquee()?.y}
                    width={core.marquee()?.width}
                    height={core.marquee()?.height}
                  />
                )}
                {core.bendPreview() !== null && (
                  <polyline
                    className="oge-bpmn-bend-preview"
                    points={core.bendPreview() ?? ''}
                  />
                )}
                {core.resizePreview() && (
                  <GhostRect rect={core.resizePreview()} />
                )}
                {core.paletteDragGhost() && (
                  <GhostRect rect={core.paletteDragGhost()} />
                )}
                {core.labelDragGhost() && (
                  <GhostRect rect={core.labelDragGhost()} />
                )}
              </g>
              <g className="oge-bpmn-handles">
                {core.selectionOutlines().map((r) => (
                  <rect
                    key={r.id}
                    className="oge-bpmn-selection-outline"
                    x={r.x}
                    y={r.y}
                    width={r.width}
                    height={r.height}
                    rx="6"
                  />
                ))}
                {core.bendHandles().map((h, i) => (
                  <circle
                    key={i}
                    className="oge-bpmn-bend-handle"
                    cx={h.x}
                    cy={h.y}
                    r="4"
                    onPointerDown={(e) =>
                      core.onBendPointerDown(h.edgeId, h.index, e)
                    }
                    onDoubleClick={(e) =>
                      core.onBendDblClick(h.edgeId, h.index, e)
                    }
                  />
                ))}
                {core.resizeHandles().map((h) => (
                  <rect
                    key={h.corner}
                    className={cx(
                      'oge-bpmn-resize-handle',
                      (h.corner === 'nw' || h.corner === 'se') &&
                        'oge-bpmn-resize-nwse',
                      (h.corner === 'ne' || h.corner === 'sw') &&
                        'oge-bpmn-resize-nesw',
                    )}
                    x={h.x - 4}
                    y={h.y - 4}
                    width="8"
                    height="8"
                    onPointerDown={(e) =>
                      core.onResizePointerDown(h.id, h.corner, e)
                    }
                  />
                ))}
              </g>
            </g>
          </svg>
          {diagram.order.length === 0 && (
            <div className="oge-bpmn-empty">{msg.emptyText}</div>
          )}
          {pad && (
            <div
              className={
                pad.side === 'left'
                  ? 'oge-bpmn-context-pad oge-bpmn-context-pad-left'
                  : 'oge-bpmn-context-pad'
              }
              role="toolbar"
              aria-label={pad.ariaLabel}
              style={{ left: `${pad.x}px`, top: `${pad.y}px` }}
            >
              {pad.connect && (
                <PadButton
                  label={msg.contextPad.connect}
                  shortcut="C"
                  onClick={() => core.onPadConnect(pad.id)}
                >
                  <path d="M2 8h9M11 8l-3-3M11 8l-3 3" />
                </PadButton>
              )}
              {pad.append && (
                <>
                  <PadButton
                    label={msg.contextPad.appendTask}
                    shortcut="A"
                    onClick={() => core.onPadAppend(pad.id, 'task')}
                  >
                    <rect x="2" y="4" width="12" height="8" rx="2" />
                  </PadButton>
                  <PadButton
                    label={msg.contextPad.appendGateway}
                    onClick={() => core.onPadAppend(pad.id, 'exclusiveGateway')}
                  >
                    <path d="M8 2 14 8 8 14 2 8Z" />
                  </PadButton>
                  <PadButton
                    label={msg.contextPad.appendEndEvent}
                    onClick={() => core.onPadAppend(pad.id, 'endEvent')}
                  >
                    <circle cx="8" cy="8" r="5.5" strokeWidth="2.4" />
                  </PadButton>
                </>
              )}
              {pad.editLabel && (
                <PadButton
                  label={msg.contextPad.editLabel}
                  shortcut="F2"
                  onClick={() => core.startLabelEdit(pad.id)}
                >
                  <path d="M3 13h3l7-7-3-3-7 7zM9 4l3 3" />
                </PadButton>
              )}
              {pad.toggleDefault && (
                <PadButton
                  label={msg.contextPad.toggleDefault}
                  active={pad.isDefault}
                  pressed={pad.isDefault}
                  onClick={() => core.onPadToggleDefault(pad.id)}
                >
                  <path d="M2 12 14 4M5 12l4-8" />
                </PadButton>
              )}
              <PadButton
                label={msg.contextPad.deleteElement}
                shortcut="Delete"
                danger
                onClick={() => core.deleteSelection()}
              >
                <path d="M3 5h10M6 5V3h4v2M5 5l1 8h4l1-8" />
              </PadButton>
            </div>
          )}
          {multiPad && (
            <div
              className={
                multiPad.side === 'left'
                  ? 'oge-bpmn-context-pad oge-bpmn-context-pad-left'
                  : 'oge-bpmn-context-pad'
              }
              role="toolbar"
              aria-label={msg.align.menuLabel}
              style={{ left: `${multiPad.x}px`, top: `${multiPad.y}px` }}
            >
              <button
                type="button"
                className={cx(
                  'oge-bpmn-pad-btn',
                  core.alignMenuOpen() && 'oge-bpmn-pad-active',
                )}
                aria-expanded={core.alignMenuOpen()}
                aria-haspopup="true"
                aria-label={msg.align.menuLabel}
                title={msg.align.menuLabel}
                onClick={() => core.toggleAlignMenu()}
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
              <PadButton
                label={msg.contextPad.deleteElement}
                shortcut="Delete"
                danger
                onClick={() => core.deleteSelection()}
              >
                <path d="M3 5h10M6 5V3h4v2M5 5l1 8h4l1-8" />
              </PadButton>
              {core.alignMenuOpen() && (
                <div
                  className="oge-bpmn-align-menu"
                  role="toolbar"
                  aria-label={msg.align.menuLabel}
                >
                  <PadButton
                    label={msg.align.alignLeft}
                    onClick={() => core.onAlign(multiPad.ids, 'left')}
                  >
                    <path d="M3 2v12M6 5h7M6 11h4" />
                  </PadButton>
                  <PadButton
                    label={msg.align.alignCenter}
                    onClick={() => core.onAlign(multiPad.ids, 'centerX')}
                  >
                    <path d="M8 2v12M4 5h8M5.5 11h5" />
                  </PadButton>
                  <PadButton
                    label={msg.align.alignRight}
                    onClick={() => core.onAlign(multiPad.ids, 'right')}
                  >
                    <path d="M13 2v12M3 5h7M6 11h4" />
                  </PadButton>
                  <PadButton
                    label={msg.align.alignTop}
                    onClick={() => core.onAlign(multiPad.ids, 'top')}
                  >
                    <path d="M2 3h12M5 6v7M11 6v4" />
                  </PadButton>
                  <PadButton
                    label={msg.align.alignMiddle}
                    onClick={() => core.onAlign(multiPad.ids, 'centerY')}
                  >
                    <path d="M2 8h12M5 4v8M11 5.5v5" />
                  </PadButton>
                  <PadButton
                    label={msg.align.alignBottom}
                    onClick={() => core.onAlign(multiPad.ids, 'bottom')}
                  >
                    <path d="M2 13h12M5 3v7M11 6v4" />
                  </PadButton>
                  <PadButton
                    label={msg.align.distributeHorizontal}
                    disabled={multiPad.ids.length < 3}
                    onClick={() => core.onDistribute(multiPad.ids, 'x')}
                  >
                    <path d="M2 2v12M14 2v12M6 5.5h4v5H6z" />
                  </PadButton>
                  <PadButton
                    label={msg.align.distributeVertical}
                    disabled={multiPad.ids.length < 3}
                    onClick={() => core.onDistribute(multiPad.ids, 'y')}
                  >
                    <path d="M2 2h12M2 14h12M5.5 6h5v4h-5z" />
                  </PadButton>
                </div>
              )}
            </div>
          )}
          {searchOpen && (
            <div className="oge-bpmn-search">
              <input
                ref={searchInputRef}
                type="text"
                className="oge-bpmn-search-input"
                role="combobox"
                aria-autocomplete="list"
                aria-controls={`${uid}-search-list`}
                aria-expanded={searchResults.length > 0}
                aria-activedescendant={
                  searchResults.length > 0
                    ? `${uid}-search-${searchActive}`
                    : undefined
                }
                aria-label={msg.search.label}
                placeholder={msg.search.placeholder}
                value={searchQuery}
                onChange={(e) => core.onSearchInput(e.currentTarget.value)}
                onKeyDown={(e) => core.onSearchKeydown(e)}
              />
              {searchQuery.trim() !== '' && (
                <ul
                  className="oge-bpmn-search-results"
                  role="listbox"
                  id={`${uid}-search-list`}
                >
                  {searchResults.length === 0 ? (
                    <li className="oge-bpmn-search-empty" role="presentation">
                      {msg.search.noResults}
                    </li>
                  ) : (
                    searchResults.map((r, i) => (
                      <li
                        key={r.id}
                        role="option"
                        id={`${uid}-search-${i}`}
                        className={cx(
                          'oge-bpmn-search-result',
                          i === searchActive && 'oge-bpmn-search-active',
                        )}
                        aria-selected={i === searchActive}
                        tabIndex={-1}
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => core.pickSearchResult(r.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') core.pickSearchResult(r.id);
                        }}
                      >
                        <span className="oge-bpmn-search-name">{r.label}</span>
                        <span className="oge-bpmn-search-id">{r.id}</span>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          )}
          {showMinimap && minimap && (
            <div
              className="oge-bpmn-minimap"
              role="img"
              aria-label={msg.minimapLabel}
            >
              <svg
                ref={minimapRef}
                viewBox="0 0 180 120"
                width="180"
                height="120"
                onPointerDown={(e) => core.onMinimapPointerDown(e)}
              >
                {minimap.shapes.map((s, i) =>
                  s.kind === 'circle' ? (
                    <circle
                      key={i}
                      className="oge-bpmn-minimap-shape"
                      cx={s.x + s.width / 2}
                      cy={s.y + s.height / 2}
                      r={s.width / 2}
                    />
                  ) : s.kind === 'diamond' ? (
                    <path
                      key={i}
                      className="oge-bpmn-minimap-shape"
                      d={`M${s.x + s.width / 2} ${s.y} L${s.x + s.width} ${s.y + s.height / 2} L${s.x + s.width / 2} ${s.y + s.height} L${s.x} ${s.y + s.height / 2} Z`}
                    />
                  ) : (
                    <rect
                      key={i}
                      className="oge-bpmn-minimap-shape"
                      x={s.x}
                      y={s.y}
                      width={s.width}
                      height={s.height}
                    />
                  ),
                )}
                <rect
                  className="oge-bpmn-minimap-viewport"
                  x={minimap.viewport.x}
                  y={minimap.viewport.y}
                  width={minimap.viewport.width}
                  height={minimap.viewport.height}
                />
              </svg>
            </div>
          )}
          {/* Branding — bare logo, no chrome; removable exclusively from
                code via showBranding={false} (never a license term). */}
          {showBranding && (
            <a
              className="oge-bpmn-brand-link"
              href="https://www.ogeui.com"
              target="_blank"
              rel="noopener"
              aria-label={msg.brandLabel}
              title={msg.brandLabel}
            >
              {brandLogoSrc ? (
                <img
                  className="oge-bpmn-brand-img"
                  src={sanitizeResourceUrl(brandLogoSrc)}
                  alt=""
                />
              ) : (
                <svg
                  viewBox="0 0 20 20"
                  width="16"
                  height="16"
                  aria-hidden="true"
                >
                  <circle cx="10" cy="10" r="7.5" />
                  <path d="M10 6.5v3.5h3.5" />
                </svg>
              )}
            </a>
          )}
          {core.overlayViews().map((o) => (
            <div
              key={o.id}
              className="oge-bpmn-overlay"
              style={{ left: `${o.x}px`, top: `${o.y}px` }}
            >
              <BpmnOverlayContent html={o.html} />
            </div>
          ))}
          {labelEdit && (
            <textarea
              ref={labelEditRef}
              className="oge-bpmn-label-edit"
              style={{
                left: `${labelEdit.x}px`,
                top: `${labelEdit.y}px`,
                width: `${labelEdit.width}px`,
                height: `${labelEdit.height}px`,
                fontSize: `${labelEdit.fontSize}px`,
              }}
              value={core.editValue()}
              onChange={(e) => core.onLabelEditInput(e.currentTarget.value)}
              onKeyDown={(e) => core.onLabelEditKeydown(e)}
              onBlur={() => core.onLabelEditBlur()}
            />
          )}
          <div className="oge-bpmn-live" aria-live="polite">
            {core.announcement()}
          </div>
        </div>
        {showPropertiesPanel && !locked && !propertiesCollapsed && (
          <>
            <div
              className="oge-bpmn-resizer"
              role="separator"
              aria-orientation="vertical"
              tabIndex={0}
              aria-label={msg.propertiesResizeLabel}
              aria-valuemin={core.PROPS_MIN}
              aria-valuemax={core.PROPS_MAX}
              aria-valuenow={core.propertiesWidth()}
              onPointerDown={(e) => core.onPanelResizeStart(e, 'properties')}
              onKeyDown={(e) => core.onPanelResizeKey(e, 'properties')}
            />
            <BpmnProperties
              uid={`${uid}-props`}
              diagram={diagram}
              selection={selection}
              messages={msg}
              colorPresets={core.colorPresets()}
              style={{ inlineSize: `${core.propertiesWidth()}px` }}
              onCommandRequested={(command) => core.onPanelCommand(command)}
            />
          </>
        )}
      </div>
    </div>
  );
});

/** The header's diagram-name field: commits on the native `change` (blur / Enter). */
function HeaderName({
  value,
  placeholder,
  ariaLabel,
  disabled,
  onCommit,
}: {
  value: string;
  placeholder: string;
  ariaLabel: string;
  disabled: boolean;
  onCommit: (value: string) => void;
}): ReactNode {
  const ref = useRef<HTMLInputElement>(null);
  const latest = useRef(onCommit);
  latest.current = onCommit;
  useIsomorphicLayoutEffect(() => {
    if (ref.current) ref.current.value = value;
  }, [value]);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const listener = () => latest.current(element.value);
    element.addEventListener('change', listener);
    return () => element.removeEventListener('change', listener);
  }, []);
  return (
    <input
      ref={ref}
      className="oge-bpmn-header-name"
      type="text"
      spellCheck={false}
      autoComplete="off"
      defaultValue={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      disabled={disabled}
      onKeyDown={(e) => e.stopPropagation()}
    />
  );
}

/** One context-pad button. */
function PadButton({
  label,
  shortcut,
  danger = false,
  active = false,
  pressed,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  danger?: boolean;
  active?: boolean;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}): ReactNode {
  return (
    <button
      type="button"
      className={cx(
        'oge-bpmn-pad-btn',
        danger && 'oge-bpmn-pad-danger',
        active && 'oge-bpmn-pad-active',
      )}
      aria-keyshortcuts={shortcut}
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

/** A dashed preview rect (drag, resize, palette and label ghosts). */
function GhostRect({
  rect,
}: {
  rect: { x: number; y: number; width: number; height: number } | null;
}): ReactNode {
  if (!rect) return null;
  return (
    <rect
      className="oge-bpmn-ghost"
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      rx="4"
    />
  );
}

/** One lane band of a pool with its rotated name. */
function LaneBand({
  lane,
}: {
  lane: ReturnType<OgeBpmnEditorCore['poolViews']>[number]['lanes'][number];
}): ReactNode {
  return (
    <>
      <rect
        className="oge-bpmn-lane"
        x={lane.x}
        y={lane.y}
        width={lane.width}
        height={lane.height}
      />
      {lane.name && (
        <text
          className="oge-bpmn-lane-name"
          x={lane.nameX}
          y={lane.nameY}
          transform={lane.nameTransform}
        >
          {lane.name}
        </text>
      )}
    </>
  );
}

/** The shape glyph of one node view — the same SVG as the Angular `@switch`. */
function NodeGlyph({
  node: n,
}: {
  node: ReturnType<OgeBpmnEditorCore['nodeViews']>[number];
}): ReactNode {
  const fill = n.fill ?? undefined;
  const stroke = n.stroke ?? undefined;
  switch (n.glyph) {
    case 'event':
      return (
        <>
          <circle
            className={cx(
              'oge-bpmn-node oge-bpmn-event',
              n.thick && 'oge-bpmn-event-end',
              n.dashed && 'oge-bpmn-event-dashed',
            )}
            style={{ fill, stroke }}
            cx={n.width / 2}
            cy={n.height / 2}
            r={n.width / 2}
          />
          {n.double && (
            <circle
              className={cx(
                'oge-bpmn-node oge-bpmn-event',
                n.dashed && 'oge-bpmn-event-dashed',
              )}
              style={{ fill: 'none', stroke }}
              cx={n.width / 2}
              cy={n.height / 2}
              r={n.width / 2 - 4}
            />
          )}
          {n.throwDot && (
            <circle
              className="oge-bpmn-event-dot"
              style={{ fill: stroke }}
              cx={n.width / 2}
              cy={n.height / 2}
              r="4"
            />
          )}
          {n.eventDefPath && (
            <path
              className={cx(
                'oge-bpmn-event-def',
                n.eventDefFilled && 'oge-bpmn-event-def-filled',
              )}
              style={{ stroke, fill: n.eventDefFilled ? stroke : undefined }}
              d={n.eventDefPath}
            />
          )}
        </>
      );
    case 'subprocess':
      return (
        <>
          <rect
            className={cx(
              'oge-bpmn-node oge-bpmn-task oge-bpmn-subprocess',
              n.dotted && 'oge-bpmn-subprocess-event',
            )}
            style={{ fill, stroke }}
            width={n.width}
            height={n.height}
            rx="10"
          />
          {n.transactionInner && (
            <rect
              className="oge-bpmn-node oge-bpmn-task"
              x="3"
              y="3"
              style={{ fill: 'none', stroke }}
              width={n.width - 6}
              height={n.height - 6}
              rx="7"
            />
          )}
          {n.collapsedPath && (
            <path
              className="oge-bpmn-marker"
              style={{ stroke }}
              d={n.collapsedPath}
            />
          )}
        </>
      );
    case 'data':
      return (
        <path
          className="oge-bpmn-node oge-bpmn-data"
          style={{ fill, stroke }}
          d={n.dataPath ?? undefined}
        />
      );
    case 'group':
      return (
        <rect
          className="oge-bpmn-node oge-bpmn-group"
          style={{ stroke }}
          width={n.width}
          height={n.height}
          rx="10"
        />
      );
    case 'task':
      return (
        <>
          <rect
            className={cx(
              'oge-bpmn-node oge-bpmn-task',
              n.callActivity && 'oge-bpmn-call-activity',
            )}
            style={{ fill, stroke }}
            width={n.width}
            height={n.height}
            rx="10"
          />
          {n.taskIcon === 'user' && (
            <g className="oge-bpmn-task-icon">
              <circle cx="14" cy="12" r="3" />
              <path d="M9 21c0-2.8 2.2-4.6 5-4.6s5 1.8 5 4.6" />
            </g>
          )}
          {n.taskIcon === 'service' && (
            <g className="oge-bpmn-task-icon">
              <circle cx="14" cy="14" r="4" />
              <path d="M14 7.5v3M14 17.5v3M7.5 14h3M17.5 14h3" />
            </g>
          )}
          {n.taskIcon === 'script' && (
            <g className="oge-bpmn-task-icon">
              <path d="M8 9h10M8 13h10M8 17h6" />
            </g>
          )}
        </>
      );
    case 'gateway':
      return (
        <>
          <path
            className="oge-bpmn-node oge-bpmn-gateway"
            style={{ fill, stroke }}
            d={n.gatewayPath}
          />
          <path
            className="oge-bpmn-gateway-mark"
            style={{ stroke }}
            d={n.gatewayMark}
          />
        </>
      );
    case 'annotation':
      return (
        <path
          className="oge-bpmn-node oge-bpmn-annotation"
          style={{ stroke }}
          d={n.annotationPath}
        />
      );
  }
}
