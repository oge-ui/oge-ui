import { computed, signal } from '@angular/core';
import {
  pathKey,
  type PivotArea,
  type PivotFieldConfig,
  type PivotPath,
} from '@oge-ui/core';

/**
 * UI state of a pivot grid: user-driven field layout overrides (on top of the
 * declared `<oge-pivot-field>` configuration), the expansion of both axes
 * (kept as key → path so remote contracts get real paths back) and the
 * field-panel collapse flag.
 */
export class OgePivotStateStore {
  private readonly _fieldOverrides = signal<
    ReadonlyMap<string, Partial<PivotFieldConfig>>
  >(new Map());
  private readonly _rowExpanded = signal<ReadonlyMap<string, PivotPath>>(
    new Map(),
  );
  private readonly _columnExpanded = signal<ReadonlyMap<string, PivotPath>>(
    new Map(),
  );
  private readonly _fieldPanelCollapsed = signal(false);

  readonly fieldOverrides = this._fieldOverrides.asReadonly();
  readonly fieldPanelCollapsed = this._fieldPanelCollapsed.asReadonly();

  /** `pathKey` sets, as the engine consumes them. */
  readonly rowExpandedPaths = computed<ReadonlySet<string>>(
    () => new Set(this._rowExpanded().keys()),
  );
  readonly columnExpandedPaths = computed<ReadonlySet<string>>(
    () => new Set(this._columnExpanded().keys()),
  );

  /** Actual expanded paths, as remote contracts consume them. */
  readonly rowExpandedPathList = computed<readonly PivotPath[]>(() => [
    ...this._rowExpanded().values(),
  ]);
  readonly columnExpandedPathList = computed<readonly PivotPath[]>(() => [
    ...this._columnExpanded().values(),
  ]);

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
