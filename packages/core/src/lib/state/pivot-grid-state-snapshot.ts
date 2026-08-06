import type { PivotPath, PivotSummaryDisplayMode } from '../pivot/pivot-types';
import type { SortDirection, SummaryType } from '../data/load-options';

/** Persistable per-field layout entry of a pivot grid. */
export interface PivotFieldStateEntry {
  readonly id: string;
  readonly area: 'row' | 'column' | 'data' | 'filter' | null;
  readonly areaIndex?: number;
  readonly summaryType?: SummaryType;
  readonly summaryDisplayMode?: PivotSummaryDisplayMode;
  readonly sortOrder?: SortDirection;
  readonly sortBySummaryField?: string;
  readonly sortBySummaryPath?: PivotPath;
  readonly filterValues?: readonly unknown[];
  readonly filterType?: 'include' | 'exclude';
}

/** Serializable UI state of a pivot grid (`stateKey` / `state()`). */
export interface PivotGridStateSnapshot {
  readonly fields?: readonly PivotFieldStateEntry[];
  readonly rowExpandedPaths?: readonly PivotPath[];
  readonly columnExpandedPaths?: readonly PivotPath[];
  readonly fieldPanelCollapsed?: boolean;
}
