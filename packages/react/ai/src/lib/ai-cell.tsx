'use client';

import {
  useCallback,
  useEffect,
  useSyncExternalStore,
  type MouseEvent,
} from 'react';
import {
  formatOgeAiValue,
  type OgeAiCellMessages,
  type OgeAiCellState,
  type OgeAiColumn,
} from '@oge-ui/behavior';
import { useOgeAiConfig } from './ai-config';

/** The retry glyph (24 × 24 view box) — the Angular cell's. */
const RETRY_PATH =
  'M4.5 12a7.5 7.5 0 0 1 12.8-5.3L19.5 9M19.5 4.5V9H15M19.5 12a7.5 7.5 0 0 1-12.8 5.3L4.5 15M4.5 19.5V15H9';

const IDLE: OgeAiCellState = { status: 'idle', value: undefined };

/** Props of {@link OgeAiCell}. */
export interface OgeAiCellProps<T extends object> {
  /** The column's shared machine (`createOgeAiColumn()`). */
  column: OgeAiColumn<T>;
  /** The row whose value this cell shows. */
  row: T;
  /** BCP 47 locale of number and date values; falls back to the config, then the runtime. */
  locale?: string;
  /** Per-instance message overrides, merged over the catalog. */
  messages?: Partial<OgeAiCellMessages>;
}

/**
 * One row's AI-computed value, for a grid column's `renderCell` — the React
 * render of the Angular `<oge-ai-cell>`: same markup, same stylesheet, the
 * same `OgeAiColumn` machine batching the visible rows.
 *
 * ```tsx
 * const sentiment = useMemo(() => createOgeAiColumn<Review>({ … }), []);
 * { field: 'sentiment', renderCell: ({ row }) => <OgeAiCell column={sentiment} row={row} /> }
 * ```
 */
export function OgeAiCell<T extends object>(props: OgeAiCellProps<T>) {
  const { column, row } = props;
  const config = useOgeAiConfig();
  const key = column.key(row);
  const subscribe = useCallback(
    (notify: () => void) => column.subscribe(key, notify),
    [column, key],
  );
  const state = useSyncExternalStore(
    subscribe,
    () => column.state(key),
    () => IDLE,
  );

  useEffect(() => {
    column.useTransport(config.transport);
    if (state.status === 'idle') column.request(row);
  }, [column, row, state.status, config.transport]);

  const m: OgeAiCellMessages = { ...config.messages.aiCell, ...props.messages };
  const retry = (event: MouseEvent) => {
    // the click must not select or activate the row
    event.stopPropagation();
    column.refresh(key);
  };
  const className = [
    'oge-ai-cell',
    (state.status === 'pending' || state.status === 'idle') &&
      'oge-ai-cell-pending',
    state.status === 'error' && 'oge-ai-cell-failed',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={className}
      aria-busy={
        state.status === 'pending' || state.status === 'idle' || undefined
      }
    >
      {state.status === 'done' ? (
        <span className="oge-ai-cell-value">
          {formatOgeAiValue(state.value, {
            dataType: column.options.dataType,
            values: column.options.values,
            locale: props.locale ?? config.locale,
            yes: m.yes,
            no: m.no,
            empty: m.empty,
          })}
        </span>
      ) : state.status === 'error' ? (
        <>
          <span className="oge-ai-cell-error">{m.error}</span>
          <button
            type="button"
            className="oge-ai-cell-retry"
            aria-label={m.retry}
            title={m.retry}
            onClick={retry}
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              aria-hidden="true"
              focusable="false"
            >
              <path d={RETRY_PATH} />
            </svg>
          </button>
        </>
      ) : (
        <>
          <span className="oge-ai-cell-skeleton" aria-hidden="true" />
          <span className="oge-sr-only">{m.generating}</span>
        </>
      )}
    </span>
  );
}
