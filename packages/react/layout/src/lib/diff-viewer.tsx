'use client';
import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  ogeDiffModel,
  ogeFormatMessage,
  type OgeDiffCell,
  type OgeDiffLanguage,
  type OgeDiffModel,
  type OgeDiffViewerMessages,
} from '@oge-ui/behavior';
import { useOgeDiffViewerConfig } from './layout-config';

/** Props of {@link OgeDiffViewer}. */
export interface OgeDiffViewerProps {
  /** The old text (or, with `language="json"`, JSON text or a value). */
  oldValue?: unknown;
  /** The new text (or JSON text or a value). */
  newValue?: unknown;
  /** `'text'` (default) or `'json'` — compared as canonical, key-sorted text. */
  language?: OgeDiffLanguage;
  /** `'split'` (side by side) or `'inline'` (controlled; `defaultMode` when uncontrolled). */
  mode?: 'split' | 'inline';
  defaultMode?: 'split' | 'inline';
  onModeChange?: (mode: 'split' | 'inline') => void;
  /** Unchanged lines kept around each change (config ?? 3); `Infinity` folds nothing. */
  context?: number;
  /** Lines differing only in whitespace count as equal. */
  ignoreWhitespace?: boolean;
  /** Lines differing only in letter case count as equal. */
  ignoreCase?: boolean;
  /** Highlight the changed words inside changed lines (default `true`). */
  wordDiff?: boolean;
  /** JSON: sort object keys before comparing (default `true`). */
  sortKeys?: boolean;
  /** The toolbar: counts, layout switch, previous / next change (default `true`). */
  toolbar?: boolean;
  /** Per-instance message overrides. */
  messages?: Partial<OgeDiffViewerMessages>;
  className?: string;
  style?: CSSProperties;
}

/** What a `ref` on {@link OgeDiffViewer} reaches. */
export interface OgeDiffViewerHandle {
  /** Scrolls to the next change (wrapping) and announces it. */
  nextChange(): void;
  /** Scrolls to the previous change (wrapping) and announces it. */
  previousChange(): void;
  /** The rows, counts and JSON paths the viewer shows. */
  diff(): OgeDiffModel;
}

const cellClass = (cell: OgeDiffCell | null | undefined): string =>
  cell ? `oge-diff-viewer-${cell.kind}` : 'oge-diff-viewer-empty';

/** Compares two texts — or two JSON documents — side by side or inline. */
export const OgeDiffViewer = forwardRef<
  OgeDiffViewerHandle,
  OgeDiffViewerProps
>(function OgeDiffViewerRender(props, ref): ReactElement {
  const config = useOgeDiffViewerConfig();
  const text = { ...config.messages, ...props.messages };
  const [uncontrolledMode, setUncontrolledMode] = useState(
    props.defaultMode ?? 'split',
  );
  const mode = props.mode ?? uncontrolledMode;
  const setMode = (next: 'split' | 'inline') => {
    if (props.mode === undefined) setUncontrolledMode(next);
    props.onModeChange?.(next);
  };
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [current, setCurrent] = useState(-1);
  const scroller = useRef<HTMLDivElement>(null);
  const context = props.context ?? config.context ?? 3;

  const diff = useMemo(
    () =>
      ogeDiffModel(props.oldValue ?? '', props.newValue ?? '', {
        language: props.language ?? 'text',
        mode,
        context,
        expanded,
        words: props.wordDiff ?? true,
        sortKeys: props.sortKeys ?? true,
        ignoreWhitespace: props.ignoreWhitespace ?? false,
        ignoreCase: props.ignoreCase ?? false,
      }),
    [
      props.oldValue,
      props.newValue,
      props.language,
      mode,
      context,
      expanded,
      props.wordDiff,
      props.sortKeys,
      props.ignoreWhitespace,
      props.ignoreCase,
    ],
  );

  const go = (step: 1 | -1) => {
    const count = diff.stats.changes;
    if (!count) return;
    const next =
      current < 0
        ? step > 0
          ? 0
          : count - 1
        : (current + step + count) % count;
    setCurrent(next);
    scroller.current
      ?.querySelector<HTMLElement>(`[data-change="${next}"]`)
      ?.scrollIntoView?.({ block: 'center' });
  };
  const latest = useRef({ go, diff });
  latest.current = { go, diff };
  useImperativeHandle(
    ref,
    () => ({
      nextChange: () => latest.current.go(1),
      previousChange: () => latest.current.go(-1),
      diff: () => latest.current.diff,
    }),
    [],
  );

  const code = (cell: OgeDiffCell): ReactNode => (
    <>
      {cell.kind !== 'equal' && (
        <>
          <span className="oge-diff-viewer-marker" aria-hidden="true">
            {cell.kind === 'insert' ? '+' : '−'}
          </span>
          <span className="oge-diff-viewer-sr">
            {cell.kind === 'insert' ? text.added : text.removed}:{' '}
          </span>
        </>
      )}
      {cell.segments ? (
        cell.segments.map((segment, i) =>
          segment.changed ? (
            <mark key={i} className="oge-diff-viewer-word">
              {segment.text}
            </mark>
          ) : (
            <span key={i}>{segment.text}</span>
          ),
        )
      ) : (
        <span>{cell.text}</span>
      )}
    </>
  );

  const errorText = diff.error
    ? ogeFormatMessage(text.invalidJson, {
        side: diff.error.side === 'old' ? text.oldLabel : text.newLabel,
        error: diff.error.message,
      })
    : '';
  const columns = mode === 'split' ? 4 : 3;

  return (
    <div
      className={
        props.className
          ? `oge-diff-viewer ${props.className}`
          : 'oge-diff-viewer'
      }
      style={props.style}
      role="group"
      aria-label={text.label}
    >
      {props.toolbar !== false && (
        <div className="oge-diff-viewer-toolbar">
          <span className="oge-diff-viewer-stats">
            <span className="oge-diff-viewer-added-count">
              +{diff.stats.added}
            </span>
            <span className="oge-diff-viewer-removed-count">
              −{diff.stats.removed}
            </span>
          </span>
          <span className="oge-diff-viewer-group">
            <button
              type="button"
              className="oge-diff-viewer-button oge-diff-viewer-split"
              aria-pressed={mode === 'split'}
              onClick={() => setMode('split')}
            >
              {text.split}
            </button>
            <button
              type="button"
              className="oge-diff-viewer-button oge-diff-viewer-inline"
              aria-pressed={mode === 'inline'}
              onClick={() => setMode('inline')}
            >
              {text.inline}
            </button>
          </span>
          <span className="oge-diff-viewer-group">
            <button
              type="button"
              className="oge-diff-viewer-button oge-diff-viewer-previous"
              disabled={!diff.stats.changes}
              onClick={() => go(-1)}
            >
              {text.previousChange}
            </button>
            <button
              type="button"
              className="oge-diff-viewer-button oge-diff-viewer-next"
              disabled={!diff.stats.changes}
              onClick={() => go(1)}
            >
              {text.nextChange}
            </button>
          </span>
          <span className="oge-diff-viewer-position" role="status">
            {current >= 0
              ? ogeFormatMessage(text.changePosition, {
                  index: current + 1,
                  count: diff.stats.changes,
                })
              : ''}
          </span>
        </div>
      )}
      {diff.error ? (
        <p className="oge-diff-viewer-message oge-diff-viewer-error">
          {errorText}
        </p>
      ) : !diff.stats.changes ? (
        <p className="oge-diff-viewer-message">{text.noChanges}</p>
      ) : null}
      {diff.rows.length > 0 && (
        <div
          ref={scroller}
          className="oge-diff-viewer-scroll"
          tabIndex={0}
          aria-label={text.label}
        >
          <table
            className={
              mode === 'inline'
                ? 'oge-diff-viewer-table oge-diff-viewer-table-inline'
                : 'oge-diff-viewer-table'
            }
          >
            <thead>
              {mode === 'split' ? (
                <tr>
                  <th scope="col" colSpan={2}>
                    {text.oldLabel}
                  </th>
                  <th scope="col" colSpan={2}>
                    {text.newLabel}
                  </th>
                </tr>
              ) : (
                <tr>
                  <th scope="col" className="oge-diff-viewer-number">
                    {text.oldLabel}
                  </th>
                  <th scope="col" className="oge-diff-viewer-number">
                    {text.newLabel}
                  </th>
                  <th scope="col">
                    <span className="oge-diff-viewer-sr">{text.label}</span>
                  </th>
                </tr>
              )}
            </thead>
            <tbody>
              {diff.rows.map((row) => {
                if (row.kind === 'fold') {
                  return (
                    <tr key={row.key} className="oge-diff-viewer-fold">
                      <td colSpan={columns}>
                        <button
                          type="button"
                          className="oge-diff-viewer-expand"
                          onClick={() =>
                            setExpanded((set) => new Set([...set, row.key]))
                          }
                        >
                          {ogeFormatMessage(text.expand, { count: row.count })}
                        </button>
                      </td>
                    </tr>
                  );
                }
                const rowClass =
                  row.change >= 0 && row.change === current
                    ? 'oge-diff-viewer-row oge-diff-viewer-current'
                    : 'oge-diff-viewer-row';
                const change = row.change >= 0 ? row.change : undefined;
                if (mode === 'split') {
                  return (
                    <tr key={row.key} className={rowClass} data-change={change}>
                      <td
                        className={`oge-diff-viewer-number ${cellClass(row.old)}`}
                      >
                        {row.old?.line}
                      </td>
                      <td
                        className={`oge-diff-viewer-code ${cellClass(row.old)}`}
                      >
                        {row.old && code(row.old)}
                      </td>
                      <td
                        className={`oge-diff-viewer-number ${cellClass(row.new)}`}
                      >
                        {row.new?.line}
                      </td>
                      <td
                        className={`oge-diff-viewer-code ${cellClass(row.new)}`}
                      >
                        {row.new && code(row.new)}
                      </td>
                    </tr>
                  );
                }
                const shown =
                  row.new && row.old?.kind !== 'delete' ? row.new : row.old;
                const kind = cellClass(row.new ?? row.old);
                return (
                  <tr key={row.key} className={rowClass} data-change={change}>
                    <td className={`oge-diff-viewer-number ${kind}`}>
                      {row.old?.line}
                    </td>
                    <td className={`oge-diff-viewer-number ${kind}`}>
                      {row.new?.line}
                    </td>
                    <td className={`oge-diff-viewer-code ${kind}`}>
                      {shown && code(shown)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});
