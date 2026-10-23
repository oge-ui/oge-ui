'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
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
  type OgeChartPathMark,
  type OgeCss,
  type OgeFindOptions,
  type OgeGridPane,
  type OgeHeaderMark,
  type OgePaneChart,
  type OgeRenderMark,
  type OgeRenderText,
  type OgeScrollEdges,
  type OgeSpreadsheetHyperlinkClickEvent,
  type OgeSpreadsheetMenuKind,
  type OgeSpreadsheetMessages,
  type OgeSpreadsheetSource,
  type OgeWorkbook,
} from '@oge-ui/spreadsheet-engine';
import { createSpreadsheetRxAdapter } from './rx-adapter';
import { useOgeSpreadsheetConfig } from './spreadsheet-config';
import type {
  OgeSpreadsheetHandle,
  OgeSpreadsheetProps,
} from './spreadsheet-types';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

/** The engine's style objects bind as they are (camel-cased keys, string values). */
const css = (style: OgeCss | null | undefined) =>
  (style ?? undefined) as CSSProperties | undefined;

const CloseIcon = () => (
  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
    <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

/** A cell's text: plain, rich runs, wrapped lines, or a fill that repeats. */
function CellText({ cell }: { cell: OgeRenderText }) {
  if (cell.text !== null) {
    return (
      <div className="oge-spreadsheet-text" style={css(cell.style)}>
        {cell.text}
      </div>
    );
  }
  return (
    <div className="oge-spreadsheet-text" style={css(cell.style)}>
      {cell.runs
        ? cell.runs.map((run, i) => (
            <span key={i} style={css(run.style)}>
              {run.text}
            </span>
          ))
        : cell.lines
          ? cell.lines.map((line, i) => (
              <span key={i} style={css(line.style)}>
                {line.text}
              </span>
            ))
          : cell.repeat
            ? [
                <span key="before">{cell.repeat.before}</span>,
                <span key="fill" className="oge-spreadsheet-repeat">
                  {cell.repeat.char.repeat(200)}
                </span>,
                <span key="after">{cell.repeat.after}</span>,
              ]
            : null}
    </div>
  );
}

/** A mark over the cells: an underline, a note marker, a table's resize handle, an icon or an AutoFilter button. */
function Mark({ mark }: { mark: OgeRenderMark }) {
  switch (mark.kind) {
    case 'underline':
      return (
        <div className="oge-spreadsheet-underline" style={css(mark.style)} />
      );
    case 'note':
      return (
        <svg className="oge-spreadsheet-note-mark" style={css(mark.style)}>
          <polygon points={mark.points} />
        </svg>
      );
    case 'tableHandle':
      return (
        <svg className="oge-spreadsheet-table-handle" style={css(mark.style)}>
          <polygon points={mark.points} />
        </svg>
      );
    case 'icon':
      return (
        <svg
          className="oge-spreadsheet-icon"
          viewBox="0 0 16 16"
          style={css(mark.style)}
        >
          {(mark.icon ? ogeIconParts(mark.icon.set, mark.icon.index) : []).map(
            (part, i) => (
              <path
                key={i}
                d={part.d}
                fill={part.fill}
                stroke={part.stroke}
                strokeWidth={part.strokeWidth}
                transform={part.transform}
              />
            ),
          )}
        </svg>
      );
    case 'filter':
      return (
        <span
          className={`oge-spreadsheet-filter-button${mark.filtered ? ' oge-spreadsheet-filter-active' : ''}`}
          style={css(mark.style)}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            {mark.filtered ? (
              <>
                <path d="M2.5 3.5h8l-3 3.6v4.4l-2-1.2V7.1z" />
                <path d="M11 9.5h4l-2 2.5z" />
              </>
            ) : (
              <path d="M4.5 6.5h7L8 10.5z" />
            )}
          </svg>
        </span>
      );
    default:
      return null;
  }
}

/** The selection's marks on a header strip: the edge toward the cells and the separator before a run. */
function HeaderMarks({ marks }: { marks: readonly OgeHeaderMark[] }) {
  return (
    <>
      {marks.map((mark) => (
        <div
          key={mark.key}
          className="oge-spreadsheet-header-mark"
          data-kind={mark.kind}
          style={css(mark.style)}
        />
      ))}
    </>
  );
}

/** SVG paths as the engine draws them: a chart's or a sparkline's. */
function paths(marks: readonly OgeChartPathMark[]) {
  return marks.map((mark, i) => (
    <path
      key={i}
      d={mark.d}
      fill={mark.fill ?? 'none'}
      fillOpacity={mark.fillOpacity}
      stroke={mark.stroke}
      strokeWidth={mark.strokeWidth}
      strokeDasharray={mark.dash}
      strokeLinejoin={mark.round ? 'round' : undefined}
      strokeLinecap={mark.round ? 'round' : undefined}
      shapeRendering={mark.crisp ? 'crispEdges' : undefined}
    />
  ));
}

/** A chart, as the engine draws it (`ogeChartView`): plain SVG paths and texts. */
function PaneChart({ chart }: { chart: OgePaneChart }) {
  const { view } = chart;
  return (
    <svg
      className="oge-spreadsheet-chart"
      style={css(chart.frame)}
      width={view.width}
      height={view.height}
    >
      {paths(view.paths)}
      {view.texts.map((mark, i) => (
        <text
          key={i}
          x={mark.x}
          y={mark.y}
          textAnchor={mark.anchor}
          transform={mark.transform}
          style={css(mark.style)}
        >
          {mark.text}
        </text>
      ))}
    </svg>
  );
}

/** A pane: gridlines, fills, data bars and sparklines, text, borders, marks, the selection, pictures and charts. */
function Pane({ item }: { item: OgeGridPane }) {
  const { pane, selection: s } = item;
  return (
    <div
      className="oge-spreadsheet-pane"
      style={css(item.style)}
      data-pane={pane.key}
      aria-hidden="true"
    >
      <div className="oge-spreadsheet-pane-flip">
        {pane.gridlines ? (
          <svg
            className="oge-spreadsheet-layer"
            width={pane.width}
            height={pane.height}
          >
            <path className="oge-spreadsheet-gridlines" d={pane.gridlines} />
          </svg>
        ) : null}
        {pane.fills.map((fill) => (
          <div
            key={fill.key}
            className="oge-spreadsheet-fill"
            style={css(fill.style)}
          />
        ))}
        {pane.marks.map((mark) =>
          mark.kind === 'dataBar' ? (
            <div
              key={mark.key}
              className="oge-spreadsheet-data-bar"
              style={css(mark.style)}
            />
          ) : mark.kind === 'sparkline' ? (
            <svg
              key={mark.key}
              className="oge-spreadsheet-sparkline"
              style={css(mark.style)}
            >
              {paths(mark.paths ?? [])}
            </svg>
          ) : null,
        )}
        {pane.texts.map((cell) => (
          <div
            key={cell.key}
            className="oge-spreadsheet-clip"
            style={css(cell.clip)}
          >
            <CellText cell={cell} />
          </div>
        ))}
        {pane.borders.length ? (
          <svg
            className="oge-spreadsheet-layer"
            width={pane.width}
            height={pane.height}
            fill="none"
          >
            {pane.borders.map((stroke, i) => (
              <path
                key={i}
                d={stroke.d}
                stroke={stroke.color ?? '#000000'}
                strokeWidth={stroke.width}
                strokeDasharray={stroke.dash ?? undefined}
                strokeDashoffset={stroke.dash ? stroke.dashOffset : undefined}
                shapeRendering={stroke.crisp ? 'crispEdges' : undefined}
              />
            ))}
          </svg>
        ) : null}
        {pane.marks.map((mark) =>
          mark.kind === 'dataBar' || mark.kind === 'sparkline' ? null : (
            <Mark key={mark.key} mark={mark} />
          ),
        )}
        {s.overlay ? (
          <svg
            className="oge-spreadsheet-layer"
            width={pane.width}
            height={pane.height}
          >
            <path className="oge-spreadsheet-selection-overlay" d={s.overlay} />
          </svg>
        ) : null}
        {s.spill ? (
          <div className="oge-spreadsheet-spill-frame" style={css(s.spill)} />
        ) : null}
        {s.inner ? (
          <div
            className="oge-spreadsheet-selection-inner"
            style={css(s.inner)}
          />
        ) : null}
        {s.frame ? (
          <div
            className="oge-spreadsheet-selection-frame"
            style={css(s.frame)}
          />
        ) : null}
        {s.active ? (
          <div
            className="oge-spreadsheet-selection-active"
            style={css(s.active)}
          />
        ) : null}
        {s.moat ? (
          <div className="oge-spreadsheet-selection-moat" style={css(s.moat)} />
        ) : null}
        {s.handle ? (
          <div
            className="oge-spreadsheet-selection-handle"
            style={css(s.handle)}
          />
        ) : null}
        {item.pictures.map((picture) => (
          <div
            key={picture.key}
            className="oge-spreadsheet-picture"
            style={css(picture.frame)}
          >
            <img
              src={picture.url}
              alt={picture.alt}
              style={css(picture.image)}
              draggable={false}
            />
          </div>
        ))}
        {item.charts.map((chart) => (
          <PaneChart key={chart.key} chart={chart} />
        ))}
      </div>
    </div>
  );
}

/**
 * A spreadsheet viewer that shows `.xlsx` workbooks the way Excel does — the
 * React render of the Angular `<oge-spreadsheet>`, over the same engine
 * (`OgeSpreadsheetCore` in `@oge-ui/spreadsheet-engine`) and the same
 * stylesheet: Excel-measured geometry, fonts, number formats, borders and
 * fills, conditional formats, frozen panes, merges, pictures, notes and links,
 * with Excel's selection, keyboard map, find, copy and status bar.
 *
 * ```tsx
 * <OgeSpreadsheet source={file} onLoaded={(e) => setIssues(e.issues)} style={{ height: 480 }} />
 * ```
 */
export const OgeSpreadsheet = forwardRef<
  OgeSpreadsheetHandle,
  OgeSpreadsheetProps
>(function OgeSpreadsheetRender(props, ref) {
  useEffect(() => ogeCheckSpreadsheetLicense(), []);
  const config = useOgeSpreadsheetConfig();
  const {
    showFormulaBar = true,
    showStatusBar = true,
    showHeaders,
    showGridLines,
    showOutlineSymbols,
    className,
    style,
  } = props;
  const reactId = useId();
  const cellId = `oge-spreadsheet-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}-active`;
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [scroll, setScroll] = useState({ top: 0, left: 0 });
  const [macroDismissedFor, setMacroDismissedFor] =
    useState<OgeWorkbook | null>(null);
  // where the sheet tabs can still scroll: the scroll buttons are off otherwise
  const [tabScroll, setTabScroll] = useState<OgeScrollEdges>({
    back: false,
    forward: false,
  });

  const rootRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const nameBoxRef = useRef<HTMLInputElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  const sheetMenuButtonRef = useRef<HTMLButtonElement>(null);
  const namesButtonRef = useRef<HTMLButtonElement>(null);
  const menuId = `oge-spreadsheet-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}-menu`;
  // the callbacks are read live, so inline handlers stay current
  const latest = useRef(props);
  latest.current = props;

  // messages: the configured ones under the prop
  const text = useMemo<OgeSpreadsheetMessages>(
    () => ({ ...config.messages, ...props.messages }),
    [config.messages, props.messages],
  );

  const coreRef = useRef<OgeSpreadsheetCore>(undefined);
  coreRef.current ??= new OgeSpreadsheetCore({
    reactivity: createSpreadsheetRxAdapter(() => rerender()),
    messages: text,
  });
  const core = coreRef.current;
  // StrictMode runs cleanup → mount on the same instance, so the mount side
  // revives what the cleanup destroyed (the `revive()` pattern)
  useEffect(() => {
    core.revive();
    return () => core.destroy();
  }, [core]);

  // a new catalog (a language switch) re-renders through the core's own cell
  useIsomorphicLayoutEffect(() => core.setMessages(text), [core, text]);

  const workbook = core.workbook();
  const status = core.status();
  const selection = core.selection();
  const active = selection.active;
  const activeIndex = core.activeSheet();
  const zoom = core.zoom();
  const version = core.version();
  const sheet = core.sheet();
  const rtl = sheet?.view.rightToLeft ?? false;
  const findState = core.findState();
  const formulaExpanded = core.formulaExpanded();
  const menuKind = core.menu().kind;
  const menuItems = core.menuItems();
  const hasNames = core.definedNames().length > 0;

  const panes = useMemo(
    () =>
      sheet && size.width > 0
        ? core.panes({
            width: size.width,
            height: size.height,
            scrollTop: scroll.top,
            scrollLeft: scroll.left,
            ...(showHeaders !== undefined ? { headers: showHeaders } : {}),
            ...(showOutlineSymbols !== undefined
              ? { outline: showOutlineSymbols }
              : {}),
          })
        : null,
    // the active cell widens the extent; version covers geometry and paint inputs
    [
      core,
      sheet,
      size,
      scroll,
      showHeaders,
      showOutlineSymbols,
      zoom,
      version,
      active.row,
      active.col,
    ],
  );
  const view = useMemo(
    () =>
      panes
        ? core.gridView(
            panes,
            showGridLines === undefined ? {} : { showGridLines },
          )
        : null,
    [core, panes, selection, showGridLines],
  );
  const notes = panes
    ? core.notes(panes, { scrollTop: scroll.top, scrollLeft: scroll.left })
    : [];
  // the panes the charts draw in are hidden from assistive tech: it hears this list
  const chartLabels = workbook ? core.chartLabels() : [];
  const tabs = workbook ? core.tabs() : [];
  const showTabs =
    !!workbook && (props.showSheetTabs ?? workbook.showSheetTabs) !== false;
  const formula = core.formulaBar();
  const nameBox = core.nameBox();
  const statusItems = core.statusItems();
  const activeDescription = core.describeCell(active.row, active.col);
  const said = core.announcement();
  const liveText = said === activeDescription ? '' : said;
  const findCount = core.findCount();
  const macroNotice =
    macroDismissedFor !== workbook &&
    core.issues().some((issue) => issue.code === 'macros-kept');

  const scrollTo = (scrollTop: number, scrollLeft: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTop = scrollTop;
    scroller.scrollLeft = rtl ? -scrollLeft : scrollLeft;
    setScroll({ top: scroller.scrollTop, left: scroller.scrollLeft });
    core.rememberScroll(scroller);
  };

  const focus = () => scrollerRef.current?.focus({ preventScroll: true });

  const followLink = (row: number, col: number) => {
    const action = core.followHyperlink(row, col);
    if (!action || action.kind !== 'external') return;
    const event: OgeSpreadsheetHyperlinkClickEvent = {
      href: action.href,
      link: action.link,
      cancel: false,
    };
    latest.current.onHyperlinkClick?.(event);
    if (!event.cancel)
      ogeOpenLink(rootRef.current?.ownerDocument.defaultView, action.href);
  };

  const open = async (source: OgeSpreadsheetSource) => {
    await core.open(source);
    const opened = core.workbook();
    const failure = core.error();
    if (opened)
      latest.current.onLoaded?.({ workbook: opened, issues: core.issues() });
    else if (failure) latest.current.onLoadError?.({ error: failure });
  };

  useImperativeHandle(
    ref,
    () => ({
      core,
      open,
      getWorkbook: () => core.workbook(),
      selectSheet: (index: number) => core.selectSheet(index),
      goTo: (reference: string) => core.goTo(reference),
      setZoom: (percent: number) => core.setZoom(percent),
      find: (query: string, options: OgeFindOptions = {}) =>
        core.find(query, options),
      copy: () => core.copyToClipboard(),
      print: () => void core.print(rootRef.current?.ownerDocument),
      focus,
    }),
    // the handle reads live state through the core
    [core],
  );

  // locale: the prop, else the configured one, else the browser's
  const localeTag =
    props.locale ??
    config.locale ??
    (typeof navigator === 'undefined' ? 'en-US' : navigator.language);
  useIsomorphicLayoutEffect(
    () => core.setLocale(ogeFormatLocale(localeTag)),
    [core, localeTag],
  );

  // a sheet and zoom the host starts with: the core holds them until a workbook opens
  useIsomorphicLayoutEffect(() => {
    const { defaultActiveSheet, defaultZoom } = latest.current;
    if (defaultActiveSheet !== undefined) core.requestSheet(defaultActiveSheet);
    if (defaultZoom !== undefined) core.requestZoom(defaultZoom);
  }, [core]);

  // the source opens, then a workbook given directly wins over it (the core aborts the read)
  const source = props.source ?? null;
  useIsomorphicLayoutEffect(() => {
    if (source !== null) void open(source);
    // a source taken away closes what it opened; a workbook given stays
    else if (!latest.current.workbook && core.status() !== 'empty')
      core.setWorkbook(null);
    // a new source is a new open
  }, [core, source]);
  const workbookProp = props.workbook ?? null;
  useIsomorphicLayoutEffect(() => {
    if (workbookProp) core.setWorkbook(workbookProp);
  }, [core, workbookProp]);

  // two-way active sheet and zoom: a value reported back is an echo, not a request
  const sheetEcho = useRef<number | undefined>(undefined);
  const zoomEcho = useRef<number | undefined>(undefined);
  useIsomorphicLayoutEffect(() => {
    if (
      props.activeSheet === undefined ||
      props.activeSheet === sheetEcho.current
    )
      return;
    core.requestSheet(props.activeSheet);
  }, [core, props.activeSheet]);
  useIsomorphicLayoutEffect(() => {
    if (props.zoom === undefined || props.zoom === zoomEcho.current) return;
    core.requestZoom(props.zoom);
  }, [core, props.zoom]);
  const isOpen = !!workbook;
  useEffect(() => {
    if (!isOpen) return;
    sheetEcho.current = activeIndex;
    if (latest.current.activeSheet !== activeIndex)
      latest.current.onActiveSheetChange?.(activeIndex);
  }, [isOpen, activeIndex]);
  useEffect(() => {
    if (!isOpen) return;
    zoomEcho.current = zoom;
    if (latest.current.zoom !== zoom) latest.current.onZoomChange?.(zoom);
  }, [isOpen, zoom]);

  // selection events
  useEffect(() => {
    if (!core.workbook()) return;
    latest.current.onSelectionChange?.({
      sheet: core.activeSheet(),
      ranges: selection.ranges,
      active: selection.active,
      address: formatOgeCellAddress(selection.active),
    });
  }, [core, selection]);

  // scroll a requested cell into view
  const reveal = core.reveal();
  useIsomorphicLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !panes || !sheet || reveal.token === 0) return;
    const next = ogeRevealScroll(sheet, panes, reveal, {
      scrollTop: scroller.scrollTop,
      scrollLeft: scroller.scrollLeft,
    });
    scrollTo(next.scrollTop, next.scrollLeft);
    // a request scrolls once, with this render's panes
  }, [reveal]);

  // a sheet opens where it was left, else at its saved top-left cell — once the grid has a size
  const ready = panes !== null;
  useIsomorphicLayoutEffect(() => {
    if (!workbook || !panes) return;
    const target = core.sheetScroll(panes);
    scrollTo(target.scrollTop, target.scrollLeft);
    // only a new sheet, workbook or grid scrolls
  }, [activeIndex, workbook, ready]);

  // the name box and the find field are uncontrolled (they commit on Enter); keep them in step
  useIsomorphicLayoutEffect(() => {
    if (nameBoxRef.current) nameBoxRef.current.value = nameBox;
  }, [nameBox]);
  useIsomorphicLayoutEffect(() => {
    if (findInputRef.current) findInputRef.current.value = findState.query;
  }, [findState.open, findState.query]);

  // measure text with a canvas, and the grid's size
  useIsomorphicLayoutEffect(() => {
    const measurer = ogeCreateCanvasMeasurer();
    if (measurer) core.setMeasurer(measurer);
    const doc = rootRef.current?.ownerDocument as
      (Document & { fonts?: FontFaceSet }) | undefined;
    let live = true;
    // web fonts arriving later change text widths: measure again
    void doc?.fonts?.ready.then(() => {
      const again = live ? ogeCreateCanvasMeasurer() : null;
      if (again) core.setMeasurer(again);
    });
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const measure = () =>
      setSize((was) =>
        was.width === scroller.clientWidth &&
        was.height === scroller.clientHeight
          ? was
          : { width: scroller.clientWidth, height: scroller.clientHeight },
      );
    measure();
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(measure);
    observer?.observe(scroller);
    return () => {
      live = false;
      observer?.disconnect();
    };
  }, [core]);

  // Ctrl+wheel zooms: React's onWheel is passive, and this one must keep the page from zooming
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      core.stepZoom(event.deltaY < 0 ? 1 : -1);
    };
    scroller.addEventListener('wheel', wheel, { passive: false });
    return () => scroller.removeEventListener('wheel', wheel);
  }, [core]);

  // ── events ──────────────────────────────────────────────────────────────

  const onScroll = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    setScroll({ top: scroller.scrollTop, left: scroller.scrollLeft });
    core.rememberScroll(scroller);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const action = core.keydown(event, {
      rows: panes?.pageRows ?? 10,
      cols: panes?.pageCols ?? 5,
    });
    // Ctrl+C: the browser fires `copy`, which writes the clipboard (onCopy)
    if (action === null || action === 'copy') return;
    event.preventDefault();
    if (action === 'find') setTimeout(() => findInputRef.current?.focus());
    else if (action === 'goto') nameBoxRef.current?.focus();
    else if (action === 'open-link') followLink(active.row, active.col);
  };

  const onCopy = (event: ReactClipboardEvent<HTMLDivElement>) => {
    if (!event.clipboardData) return;
    const content = core.copy();
    if (!content) return;
    event.clipboardData.setData('text/plain', content.text);
    event.clipboardData.setData('text/html', content.html);
    event.preventDefault();
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;
    if (
      !panes ||
      !scroller ||
      !core.pointerDown(
        panes,
        ogeGridPoint(event, scroller),
        ogeGridHeaderAt(event.target),
        event,
      )
    )
      return;
    event.preventDefault();
    focus();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // jsdom and some pointer types cannot capture
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;
    if (panes && scroller)
      core.pointerMove(panes, ogeGridPoint(event, scroller), event);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;
    const click =
      panes && scroller
        ? core.pointerUp(panes, ogeGridPoint(event, scroller), event)
        : null;
    if (!click) return;
    latest.current.onCellClick?.({
      row: click.row,
      col: click.col,
      address: click.address,
      text: click.text,
      event: event.nativeEvent,
    });
    // Excel follows a link on a click
    if (click.follow) followLink(click.row, click.col);
  };

  const onNameBoxKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    if (event.key === 'Enter') {
      event.preventDefault();
      if (core.goTo(input.value)) focus();
      else input.select();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      input.value = nameBox;
      focus();
    }
  };

  const closeFind = () => {
    core.closeFind();
    focus();
  };

  const onFindKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      core.submitFind(event.currentTarget.value, event.shiftKey ? -1 : 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeFind();
    }
  };

  const findStep = (step: 1 | -1) =>
    core.submitFind(findInputRef.current?.value ?? findState.query, step);
  const toggleFind = (option: 'matchCase' | 'entireCell' | 'workbook') =>
    core.toggleFindOption(option, findInputRef.current?.value ?? '');

  const onTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const host = rootRef.current;
    const pageRtl =
      !!host &&
      host.ownerDocument.defaultView?.getComputedStyle(host).direction ===
        'rtl';
    const index = core.tabKeydown(event.key, pageRtl);
    if (index === null) return;
    event.preventDefault();
    setTimeout(() => {
      const button = tabListRef.current?.querySelector<HTMLElement>(
        `[data-sheet="${index}"]`,
      );
      button?.focus();
      button?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    });
  };

  const scrollTabs = (direction: 1 | -1) =>
    tabListRef.current?.scrollBy({ left: direction * 120, behavior: 'smooth' });

  const updateTabScroll = () => {
    const list = tabListRef.current;
    if (!list) return;
    const edges = ogeScrollEdges(list);
    setTabScroll((was) =>
      was.back === edges.back && was.forward === edges.forward ? was : edges,
    );
  };
  // the scroll buttons follow what the strip can still show
  const tabNames = tabs.map((tab) => tab.name).join('\n');
  useEffect(() => {
    const list = tabListRef.current;
    if (!list) return;
    updateTabScroll();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateTabScroll);
    observer.observe(list);
    return () => observer.disconnect();
  }, [showTabs, tabNames]);

  const menuOpener = (kind: OgeSpreadsheetMenuKind | null) =>
    kind === 'names' ? namesButtonRef.current : sheetMenuButtonRef.current;

  /** Focuses the open list's focused item once it is drawn. */
  const focusMenuItem = () =>
    setTimeout(() => {
      const { kind, focus: at } = core.menu();
      if (kind === null) return;
      rootRef.current
        ?.querySelector<HTMLElement>(`#${menuId} [data-item="${at}"]`)
        ?.focus();
    });

  /** The opener keeps focus where it is on a press (`mousedown` is cancelled), so a click on it while open closes the list. */
  const toggleMenu = (kind: OgeSpreadsheetMenuKind) => {
    if (core.menu().kind === kind) {
      core.closeMenu();
      menuOpener(kind)?.focus();
      return;
    }
    core.openMenu(kind);
    focusMenuItem();
  };

  const onMenuButtonKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    kind: OgeSpreadsheetMenuKind,
  ) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    core.openMenu(kind, event.key === 'ArrowUp' ? 'last' : 'checked');
    focusMenuItem();
  };

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const kind = core.menu().kind;
    const action = core.menuKeydown(event.key);
    if (action === null) return;
    // Tab closes the list and lets the browser move on from the opener
    if (action !== 'leave') event.preventDefault();
    if (action === 'focus') focusMenuItem();
    else if (action === 'picked') focus();
    else menuOpener(kind)?.focus();
  };

  /** Focus leaving the list for anything but its opener closes it. */
  const onMenuBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (
      next &&
      (event.currentTarget.contains(next) ||
        next === menuOpener(core.menu().kind))
    )
      return;
    core.closeMenu();
  };

  const pickMenuItem = (position: number) => {
    core.pickMenuItem(position);
    focus();
  };

  // ── markup (the Angular template, element for element) ────────────────────

  const rootClass = [
    'oge-spreadsheet',
    core.hoverLink() ? 'oge-spreadsheet-link-hover' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div
      ref={rootRef}
      className={rootClass}
      style={style}
      aria-busy={status === 'loading' ? true : undefined}
    >
      {macroNotice ? (
        <div className="oge-spreadsheet-message-bar" role="status">
          <span className="oge-spreadsheet-message-text">
            {text.macrosNotice}
          </span>
          <button
            type="button"
            className="oge-spreadsheet-icon-button"
            aria-label={text.close}
            onClick={() => setMacroDismissedFor(workbook)}
          >
            <CloseIcon />
          </button>
        </div>
      ) : null}
      {showFormulaBar ? (
        <div
          className={`oge-spreadsheet-formula-bar${formulaExpanded ? ' oge-spreadsheet-formula-expanded' : ''}`}
        >
          <div className="oge-spreadsheet-name-field">
            <input
              ref={nameBoxRef}
              className="oge-spreadsheet-name-box"
              type="text"
              spellCheck={false}
              autoComplete="off"
              aria-label={text.nameBoxLabel}
              defaultValue={nameBox}
              onFocus={(event) => event.currentTarget.select()}
              onKeyDown={onNameBoxKeyDown}
              onBlur={(event) => {
                event.currentTarget.value = nameBox;
              }}
            />
            {hasNames ? (
              <button
                ref={namesButtonRef}
                type="button"
                className="oge-spreadsheet-field-button"
                aria-haspopup="menu"
                aria-expanded={menuKind === 'names'}
                aria-controls={menuKind === 'names' ? menuId : undefined}
                aria-label={text.definedNames}
                title={text.definedNames}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => toggleMenu('names')}
                onKeyDown={(event) => onMenuButtonKeyDown(event, 'names')}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M3.5 6l4.5 4.5L12.5 6" />
                </svg>
              </button>
            ) : null}
            {menuKind === 'names' ? (
              <div
                className="oge-spreadsheet-menu oge-spreadsheet-name-list"
                role="menu"
                tabIndex={-1}
                id={menuId}
                aria-label={text.definedNames}
                onKeyDown={onMenuKeyDown}
                onBlur={onMenuBlur}
              >
                {menuItems.map((item, i) => (
                  <button
                    key={item.key}
                    type="button"
                    className="oge-spreadsheet-menu-item"
                    role="menuitem"
                    tabIndex={-1}
                    data-item={i}
                    onClick={() => pickMenuItem(i)}
                  >
                    <span className="oge-spreadsheet-menu-label">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <span className="oge-spreadsheet-formula-tools" aria-hidden="true">
            <svg className="oge-spreadsheet-cancel-icon" viewBox="0 0 12 12">
              <path d="M.5.5l11 11M11.5.5l-11 11" />
            </svg>
            <svg className="oge-spreadsheet-enter-icon" viewBox="0 0 16 12">
              <path d="M.5 6.5L5 11 15.5.5" />
            </svg>
            <svg className="oge-spreadsheet-fx" viewBox="0 0 16 14">
              <path d="M6.5 1.5c-1.2-.4-2 .2-2.3 1.4L2.5 12.5M2 5.5h3.8M8.5 6l4.5 6M13 6l-4.5 6" />
            </svg>
            <svg className="oge-spreadsheet-fx-chevron" viewBox="0 0 8 8">
              <path d="M1.5 3L4 5.5 6.5 3" />
            </svg>
          </span>
          <div className="oge-spreadsheet-formula-field">
            <div
              className={`oge-spreadsheet-formula${formula.ghost ? ' oge-spreadsheet-formula-ghost' : ''}`}
              role="textbox"
              aria-readonly="true"
              tabIndex={0}
              aria-label={text.formulaBarLabel}
              aria-multiline={formulaExpanded ? true : undefined}
            >
              {formula.text}
            </div>
            <button
              type="button"
              className="oge-spreadsheet-field-button"
              aria-expanded={formulaExpanded}
              aria-label={text.expandFormulaBar}
              title={text.expandFormulaBar}
              onClick={() => core.toggleFormulaBar()}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d={
                    formulaExpanded
                      ? 'M3.5 10.5L8 6l4.5 4.5'
                      : 'M3.5 6l4.5 4.5L12.5 6'
                  }
                />
              </svg>
            </button>
          </div>
        </div>
      ) : null}
      <div className="oge-spreadsheet-body">
        <div
          ref={scrollerRef}
          className={`oge-spreadsheet-grid${rtl ? ' oge-spreadsheet-grid-rtl' : ''}`}
          role="grid"
          tabIndex={0}
          aria-multiselectable="true"
          aria-label={text.gridLabel}
          aria-rowcount={OGE_SHEET_MAX_ROWS}
          aria-colcount={OGE_SHEET_MAX_COLUMNS}
          aria-activedescendant={status === 'ready' ? cellId : undefined}
          dir={rtl ? 'rtl' : 'ltr'}
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          onCopy={onCopy}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => core.pointerCancel()}
          onMouseLeave={() => core.pointerLeave()}
        >
          {view ? (
            <div
              className="oge-spreadsheet-sizer"
              role="presentation"
              style={css(view.sizer)}
            >
              {view.render.map((item) => (
                <Pane key={item.pane.key} item={item} />
              ))}
              {view.columnHeaders.map((strip) => (
                <div
                  key={strip.key}
                  className={`oge-spreadsheet-column-headers${strip.frozen ? ' oge-spreadsheet-headers-frozen' : ''}`}
                  style={css(strip.style)}
                  aria-hidden="true"
                >
                  <div
                    className="oge-spreadsheet-pane-flip"
                    style={css(view.headerFont)}
                  >
                    {strip.cells.map((header) => (
                      <div
                        key={header.index}
                        className={`oge-spreadsheet-column-header${header.state === 'selected' ? ' oge-spreadsheet-header-selected' : ''}${header.state === 'full' ? ' oge-spreadsheet-header-full' : ''}`}
                        style={{
                          left: `${header.offset}px`,
                          width: `${header.size}px`,
                        }}
                        data-col={header.index}
                      >
                        <span className="oge-spreadsheet-header-label">
                          {header.label}
                        </span>
                      </div>
                    ))}
                    <HeaderMarks marks={strip.marks} />
                  </div>
                </div>
              ))}
              {view.rowHeaders.map((strip) => (
                <div
                  key={strip.key}
                  className={`oge-spreadsheet-row-headers${strip.frozen ? ' oge-spreadsheet-headers-frozen' : ''}`}
                  style={css(strip.style)}
                  aria-hidden="true"
                >
                  <div
                    className="oge-spreadsheet-pane-flip"
                    style={css(view.headerFont)}
                  >
                    {strip.cells.map((header) => (
                      <div
                        key={header.index}
                        className={`oge-spreadsheet-row-header${header.state === 'selected' ? ' oge-spreadsheet-header-selected' : ''}${header.state === 'full' ? ' oge-spreadsheet-header-full' : ''}`}
                        style={{
                          top: `${header.offset}px`,
                          height: `${header.size}px`,
                        }}
                        data-row={header.index}
                      >
                        <span className="oge-spreadsheet-header-label">
                          {header.label}
                        </span>
                      </div>
                    ))}
                    <HeaderMarks marks={strip.marks} />
                  </div>
                </div>
              ))}
              {view.rowOutline.map((strip) => (
                <div
                  key={strip.key}
                  className="oge-spreadsheet-outline oge-spreadsheet-row-outline"
                  style={css(strip.style)}
                  aria-hidden="true"
                >
                  <div className="oge-spreadsheet-pane-flip">
                    {strip.marks.map((mark) =>
                      mark.kind === 'bracket' ? (
                        <div
                          key={mark.key}
                          className="oge-spreadsheet-outline-bracket"
                          data-tick={mark.tick}
                          style={css(mark.style)}
                        />
                      ) : (
                        <div
                          key={mark.key}
                          className={`oge-spreadsheet-outline-button${mark.collapsed ? ' oge-spreadsheet-outline-collapsed' : ''}`}
                          data-axis="rows"
                          data-group={mark.group}
                          style={css(mark.style)}
                        />
                      ),
                    )}
                  </div>
                </div>
              ))}
              {view.columnOutline.map((strip) => (
                <div
                  key={strip.key}
                  className="oge-spreadsheet-outline oge-spreadsheet-column-outline"
                  style={css(strip.style)}
                  aria-hidden="true"
                >
                  <div className="oge-spreadsheet-pane-flip">
                    {strip.marks.map((mark) =>
                      mark.kind === 'bracket' ? (
                        <div
                          key={mark.key}
                          className="oge-spreadsheet-outline-bracket"
                          data-tick={mark.tick}
                          style={css(mark.style)}
                        />
                      ) : (
                        <div
                          key={mark.key}
                          className={`oge-spreadsheet-outline-button${mark.collapsed ? ' oge-spreadsheet-outline-collapsed' : ''}`}
                          data-axis="columns"
                          data-group={mark.group}
                          style={css(mark.style)}
                        />
                      ),
                    )}
                  </div>
                </div>
              ))}
              {view.outlineCorner ? (
                <div
                  className="oge-spreadsheet-outline-corner"
                  style={css(view.outlineCorner)}
                  aria-hidden="true"
                >
                  {view.outlineLevels.map((button) => (
                    <div
                      key={button.axis + button.level}
                      className="oge-spreadsheet-outline-level"
                      data-axis={button.axis}
                      data-level={button.level}
                      style={css(button.style)}
                    >
                      {button.level}
                    </div>
                  ))}
                </div>
              ) : null}
              {view.panes.headers.rowHeaderWidth > 0 ? (
                <div
                  className="oge-spreadsheet-select-all"
                  style={css(view.corner)}
                  title={text.selectAllLabel}
                  aria-hidden="true"
                />
              ) : null}
            </div>
          ) : null}
          <div
            role="row"
            className="oge-spreadsheet-a11y-row"
            aria-rowindex={active.row + 1}
          >
            <div
              role="gridcell"
              className="oge-spreadsheet-a11y-cell"
              id={cellId}
              aria-colindex={active.col + 1}
              aria-selected="true"
            >
              {activeDescription}
            </div>
          </div>
        </div>
        {status !== 'ready' ? (
          <div
            className={`oge-spreadsheet-placeholder${status === 'error' ? ' oge-spreadsheet-placeholder-error' : ''}`}
          >
            {status === 'loading' ? (
              <>
                <span className="oge-spreadsheet-spinner" aria-hidden="true" />
                {text.loading}
              </>
            ) : status === 'error' ? (
              core.errorText()
            ) : (
              text.empty
            )}
          </div>
        ) : null}
        {findState.open ? (
          <div
            className="oge-spreadsheet-find"
            role="search"
            aria-label={text.find}
          >
            <input
              ref={findInputRef}
              className="oge-spreadsheet-find-input"
              type="search"
              spellCheck={false}
              aria-label={text.find}
              placeholder={text.findPlaceholder}
              defaultValue={findState.query}
              onKeyDown={onFindKeyDown}
            />
            <span className="oge-spreadsheet-find-count" aria-live="polite">
              {findCount}
            </span>
            <button
              type="button"
              className="oge-spreadsheet-icon-button"
              aria-label={text.findPrevious}
              onClick={() => findStep(-1)}
            >
              <svg
                viewBox="0 0 16 16"
                width="14"
                height="14"
                aria-hidden="true"
              >
                <path
                  d="M4 10l4-4 4 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
            </button>
            <button
              type="button"
              className="oge-spreadsheet-icon-button"
              aria-label={text.findNext}
              onClick={() => findStep(1)}
            >
              <svg
                viewBox="0 0 16 16"
                width="14"
                height="14"
                aria-hidden="true"
              >
                <path
                  d="M4 6l4 4 4-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
            </button>
            <button
              type="button"
              className="oge-spreadsheet-toggle"
              aria-pressed={!!findState.options.matchCase}
              aria-label={text.matchCase}
              title={text.matchCase}
              onClick={() => toggleFind('matchCase')}
            >
              Aa
            </button>
            <button
              type="button"
              className="oge-spreadsheet-toggle"
              aria-pressed={!!findState.options.entireCell}
              aria-label={text.matchEntireCell}
              title={text.matchEntireCell}
              onClick={() => toggleFind('entireCell')}
            >
              [ ]
            </button>
            <button
              type="button"
              className="oge-spreadsheet-toggle"
              aria-pressed={!!findState.options.workbook}
              aria-label={text.searchWorkbook}
              title={text.searchWorkbook}
              onClick={() => toggleFind('workbook')}
            >
              ⊞
            </button>
            <button
              type="button"
              className="oge-spreadsheet-icon-button"
              aria-label={text.close}
              onClick={closeFind}
            >
              <CloseIcon />
            </button>
          </div>
        ) : null}
        {notes.length ? (
          <div className="oge-spreadsheet-notes" dir={rtl ? 'rtl' : 'ltr'}>
            {notes.map((note) => (
              <div
                key={note.key}
                className="oge-spreadsheet-note"
                role="note"
                aria-label={text.notePopupLabel}
                style={css(note.style)}
              >
                {note.runs.map((run, i) => (
                  <span
                    key={i}
                    className={
                      [
                        run.bold ? 'oge-spreadsheet-note-bold' : '',
                        run.italic ? 'oge-spreadsheet-note-italic' : '',
                      ]
                        .filter(Boolean)
                        .join(' ') || undefined
                    }
                  >
                    {run.text}
                  </span>
                ))}
              </div>
            ))}
          </div>
        ) : null}
        {chartLabels.length ? (
          <ul
            className="oge-spreadsheet-chart-list"
            aria-label={text.chartListLabel}
          >
            {chartLabels.map((label, i) => (
              <li key={i}>{label}</li>
            ))}
          </ul>
        ) : null}
      </div>
      {showTabs ? (
        <div className="oge-spreadsheet-tab-strip">
          <div className="oge-spreadsheet-tab-scroll" aria-hidden="true">
            <button
              type="button"
              tabIndex={-1}
              className="oge-spreadsheet-tab-nav"
              title={text.previousSheets}
              disabled={!tabScroll.back}
              onClick={() => scrollTabs(-1)}
            >
              <svg viewBox="0 0 16 16">
                <path d="M10 3.5L5.5 8l4.5 4.5" />
              </svg>
            </button>
            <button
              type="button"
              tabIndex={-1}
              className="oge-spreadsheet-tab-nav"
              title={text.nextSheets}
              disabled={!tabScroll.forward}
              onClick={() => scrollTabs(1)}
            >
              <svg viewBox="0 0 16 16">
                <path d="M6 3.5l4.5 4.5L6 12.5" />
              </svg>
            </button>
          </div>
          <div className="oge-spreadsheet-sheet-menu">
            <button
              ref={sheetMenuButtonRef}
              type="button"
              className="oge-spreadsheet-sheet-menu-button"
              aria-haspopup="menu"
              aria-expanded={menuKind === 'sheets'}
              aria-controls={menuKind === 'sheets' ? menuId : undefined}
              aria-label={text.allSheets}
              title={text.allSheets}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => toggleMenu('sheets')}
              onKeyDown={(event) => onMenuButtonKeyDown(event, 'sheets')}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
              </svg>
            </button>
            {menuKind === 'sheets' ? (
              <div
                className="oge-spreadsheet-menu oge-spreadsheet-sheet-list"
                role="menu"
                tabIndex={-1}
                id={menuId}
                aria-label={text.allSheets}
                onKeyDown={onMenuKeyDown}
                onBlur={onMenuBlur}
              >
                {menuItems.map((item, i) => (
                  <button
                    key={item.key}
                    type="button"
                    className="oge-spreadsheet-menu-item"
                    role="menuitemradio"
                    tabIndex={-1}
                    aria-checked={item.checked}
                    data-item={i}
                    onClick={() => pickMenuItem(i)}
                  >
                    <svg
                      className="oge-spreadsheet-menu-check"
                      viewBox="0 0 16 16"
                      aria-hidden="true"
                    >
                      <path d="M3 8.5l3.2 3.2L13 5" />
                    </svg>
                    <span className="oge-spreadsheet-menu-label">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div
            ref={tabListRef}
            className="oge-spreadsheet-tabs"
            role="tablist"
            aria-label={text.sheetTabsLabel}
            onScroll={updateTabScroll}
          >
            {tabs.map((tab) => (
              <button
                key={tab.index}
                type="button"
                role="tab"
                className={`oge-spreadsheet-tab${tab.index === activeIndex ? ' oge-spreadsheet-tab-active' : ''}${tab.color ? ' oge-spreadsheet-tab-colored' : ''}${tab.ink === 'light' ? ' oge-spreadsheet-tab-colored-light' : ''}`}
                style={
                  tab.color
                    ? ({
                        '--oge-spreadsheet-tab-color': tab.color,
                      } as CSSProperties)
                    : undefined
                }
                aria-selected={tab.index === activeIndex}
                tabIndex={tab.index === activeIndex ? 0 : -1}
                data-sheet={tab.index}
                onClick={() => core.selectSheet(tab.index)}
                onKeyDown={onTabKeyDown}
              >
                <span
                  className="oge-spreadsheet-tab-label"
                  data-label={tab.name}
                >
                  {tab.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {showStatusBar ? (
        <div
          className="oge-spreadsheet-status-bar"
          role="group"
          aria-label={text.statusBarLabel}
        >
          <span className="oge-spreadsheet-status-items">
            {statusItems.map((item) => (
              <span key={item.kind} className="oge-spreadsheet-status-item">
                {item.text}
              </span>
            ))}
          </span>
          <span className="oge-spreadsheet-zoom">
            <button
              type="button"
              className="oge-spreadsheet-zoom-step"
              aria-label={text.zoomOut}
              onClick={() => core.stepZoom(-1)}
            >
              −
            </button>
            <input
              className="oge-spreadsheet-zoom-slider"
              type="range"
              min="0"
              max="200"
              step="1"
              aria-label={core.zoomText()}
              aria-valuetext={`${zoom}%`}
              value={ogeZoomToSlider(zoom)}
              onChange={(event) =>
                core.setZoom(ogeSliderToZoom(Number(event.currentTarget.value)))
              }
            />
            <button
              type="button"
              className="oge-spreadsheet-zoom-step"
              aria-label={text.zoomIn}
              onClick={() => core.stepZoom(1)}
            >
              +
            </button>
            <span className="oge-spreadsheet-zoom-value">{zoom}%</span>
          </span>
        </div>
      ) : null}
      <div
        className="oge-spreadsheet-live"
        aria-live="polite"
        aria-atomic="true"
      >
        {liveText}
      </div>
    </div>
  );
});
