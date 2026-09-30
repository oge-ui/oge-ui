import type { CSSProperties } from 'react';
import type { OgeStateStorage } from '@oge-ui/behavior';
import type {
  OgePivotStore,
  PivotCsvOptions,
  PivotDrillDownArgs,
  PivotFieldConfig,
  PivotGridStateSnapshot,
  PivotResult,
} from '@oge-ui/core';
import type {
  OgePivotCellClickEvent,
  OgePivotCellPrepared,
  OgePivotFieldChooserOptions,
  OgePivotFieldDef,
  OgePivotMessages,
} from '@oge-ui/pivot-engine';

/**
 * Props of `<OgePivotGrid>` — the React face of Angular's `<oge-pivot-grid>`
 * inputs and outputs, member for member (outputs become `on…` callbacks).
 */
export interface OgePivotGridProps<T = unknown> {
  /** Local rows, or any `OgePivotStore` for remote (pre-aggregated) data. */
  data?: readonly T[] | OgePivotStore<T>;
  /**
   * The declared fields — the data form of Angular's `<oge-pivot-field>`
   * children, with the same members and defaults.
   */
  fields?: readonly OgePivotFieldDef<T>[];
  /** Two-axis fixed-track windowing. Default `false`. */
  virtualScrolling?: boolean;
  /** Sub-total lines per axis. Default `true`. */
  showRowTotals?: boolean;
  showColumnTotals?: boolean;
  /** Grand-total lines per axis. Default `true`. */
  showRowGrandTotals?: boolean;
  showColumnGrandTotals?: boolean;
  /** Collapsible drag & drop field panel. Default `true`. */
  fieldPanel?: boolean;
  /** Field-chooser dialog behavior. */
  fieldChooser?: OgePivotFieldChooserOptions;
  /** Per-instance overrides of the UI strings (over the provider's). */
  messages?: Partial<OgePivotMessages>;
  /** Conditional appearance hook: mutate `text` / `cssClass` per cell. */
  customizeCell?: (cell: OgePivotCellPrepared) => void;
  /** Persists the field layout + expansion under this key. */
  stateKey?: string;
  /**
   * Per-grid storage backend for `stateKey`; defaults to the nearest
   * `<OgeGridStateStorageProvider>` (localStorage without one).
   */
  stateStorage?: OgeStateStorage;
  /** Debounced — the persistable state changed. */
  onStateChange?: (snapshot: PivotGridStateSnapshot) => void;
  onCellClick?: (event: OgePivotCellClickEvent) => void;
  onCellDblClick?: (event: OgePivotCellClickEvent) => void;
  /** The field layout changed (drag, chooser, menus). */
  onFieldLayoutChange?: (fields: readonly PivotFieldConfig[]) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * The imperative handle (`ref`) — the React face of the Angular component's
 * public methods.
 */
export interface OgePivotGridHandle<T = unknown> {
  /** The materialized pivot exactly as rendered. */
  getResult(): PivotResult;
  /** Raw rows behind a cell (local data only). */
  drillDown(args: PivotDrillDownArgs): T[];
  /** Axis-wide expansion; remote mode expands only what is loaded. */
  expandAll(area: 'row' | 'column'): void;
  collapseAll(area: 'row' | 'column'): void;
  /** Declared fields merged with user overrides. */
  getFieldLayout(): readonly PivotFieldConfig[];
  /** Opens the field-chooser dialog. */
  showFieldChooser(): void;
  /** Field layout + expansion snapshot. */
  state(): PivotGridStateSnapshot;
  applyState(snapshot: PivotGridStateSnapshot): void;
  /** CSV of exactly what is on screen (multi-level headers flattened). */
  getCsv(options?: PivotCsvOptions): string;
  /** Downloads the current view as a CSV file. */
  exportCsv(filename?: string): void;
}
