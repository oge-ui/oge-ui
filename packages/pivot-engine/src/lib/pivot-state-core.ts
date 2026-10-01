import type { OgeReactiveCell, OgeReactivityAdapter } from '@oge-ui/behavior';
import {
  pathKey,
  type PivotArea,
  type PivotFieldConfig,
  type PivotPath,
} from '@oge-ui/core';

/**
 * UI state of a pivot grid: user-driven field layout overrides (on top of the
 * declared field configuration), the expansion of both axes (kept as
 * key → path so remote contracts get real paths back) and the field-panel
 * collapse flag.
 *
 * Framework-free (ADR 0003): the state lives in cells the render layer
 * supplies through {@link OgeReactivityAdapter} — `signal()` in Angular,
 * a versioned store in React.
 */
export class OgePivotStateCore {
  private readonly _fieldOverrides: OgeReactiveCell<
    ReadonlyMap<string, Partial<PivotFieldConfig>>
  >;
  private readonly _rowExpanded: OgeReactiveCell<
    ReadonlyMap<string, PivotPath>
  >;
  private readonly _columnExpanded: OgeReactiveCell<
    ReadonlyMap<string, PivotPath>
  >;
  private readonly _fieldPanelCollapsed: OgeReactiveCell<boolean>;

  /** Layout overrides per field id. */
  readonly fieldOverrides: () => ReadonlyMap<string, Partial<PivotFieldConfig>>;
  readonly fieldPanelCollapsed: () => boolean;
  /** `pathKey` sets, as the engine consumes them. */
  readonly rowExpandedPaths: () => ReadonlySet<string>;
  readonly columnExpandedPaths: () => ReadonlySet<string>;
  /** Actual expanded paths, as remote contracts consume them. */
  readonly rowExpandedPathList: () => readonly PivotPath[];
  readonly columnExpandedPathList: () => readonly PivotPath[];

  constructor(rx: OgeReactivityAdapter) {
    this._fieldOverrides = rx.cell<
      ReadonlyMap<string, Partial<PivotFieldConfig>>
    >(new Map());
    this._rowExpanded = rx.cell<ReadonlyMap<string, PivotPath>>(new Map());
    this._columnExpanded = rx.cell<ReadonlyMap<string, PivotPath>>(new Map());
    this._fieldPanelCollapsed = rx.cell(false);

    this.fieldOverrides = () => this._fieldOverrides();
    this.fieldPanelCollapsed = () => this._fieldPanelCollapsed();
    this.rowExpandedPaths = rx.derived(
      () => new Set(this._rowExpanded().keys()),
    );
    this.columnExpandedPaths = rx.derived(
      () => new Set(this._columnExpanded().keys()),
    );
    this.rowExpandedPathList = rx.derived(() => [
      ...this._rowExpanded().values(),
    ]);
    this.columnExpandedPathList = rx.derived(() => [
      ...this._columnExpanded().values(),
    ]);
  }

  toggleRowPath(path: PivotPath): void {
    this._rowExpanded.set(toggle(this._rowExpanded(), path));
  }

  toggleColumnPath(path: PivotPath): void {
    this._columnExpanded.set(toggle(this._columnExpanded(), path));
  }

  setExpansion(
    rows: readonly PivotPath[],
    columns: readonly PivotPath[],
  ): void {
    this._rowExpanded.set(new Map(rows.map((path) => [pathKey(path), path])));
    this._columnExpanded.set(
      new Map(columns.map((path) => [pathKey(path), path])),
    );
  }

  /** Moves a field to an area position (null area = unused). */
  moveField(id: string, area: PivotArea | null, areaIndex: number): void {
    this.patchField(id, { area, areaIndex });
  }

  patchField(id: string, patch: Partial<PivotFieldConfig>): void {
    const next = new Map(this._fieldOverrides());
    next.set(id, { ...next.get(id), ...patch });
    this._fieldOverrides.set(next);
  }

  /** Several field patches as one state change (a reorder renumbers an area). */
  patchFields(patches: ReadonlyMap<string, Partial<PivotFieldConfig>>): void {
    const next = new Map(this._fieldOverrides());
    for (const [id, patch] of patches)
      next.set(id, { ...next.get(id), ...patch });
    this._fieldOverrides.set(next);
  }

  toggleFieldPanel(): void {
    this._fieldPanelCollapsed.set(!this._fieldPanelCollapsed());
  }

  applyOverrides(
    overrides: ReadonlyMap<string, Partial<PivotFieldConfig>>,
  ): void {
    this._fieldOverrides.set(overrides);
  }
}

function toggle(
  map: ReadonlyMap<string, PivotPath>,
  path: PivotPath,
): ReadonlyMap<string, PivotPath> {
  const key = pathKey(path);
  const next = new Map(map);
  if (!next.delete(key)) next.set(key, path);
  return next;
}
