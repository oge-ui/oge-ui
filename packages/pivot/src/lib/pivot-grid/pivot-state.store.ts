import { signal } from '@angular/core';
import { pathKey, type PivotArea, type PivotFieldConfig, type PivotPath } from '@oge-ui/core';

/**
 * UI state of a pivot grid: user-driven field layout overrides (on top of the
 * declared `<oge-pivot-field>` configuration), the expansion sets of both
 * axes and the field-panel collapse flag.
 */
export class PivotStateStore {
  private readonly _fieldOverrides = signal<ReadonlyMap<string, Partial<PivotFieldConfig>>>(
    new Map()
  );
  private readonly _rowExpandedPaths = signal<ReadonlySet<string>>(new Set());
  private readonly _columnExpandedPaths = signal<ReadonlySet<string>>(new Set());
  private readonly _fieldPanelCollapsed = signal(false);

  readonly fieldOverrides = this._fieldOverrides.asReadonly();
  readonly rowExpandedPaths = this._rowExpandedPaths.asReadonly();
  readonly columnExpandedPaths = this._columnExpandedPaths.asReadonly();
  readonly fieldPanelCollapsed = this._fieldPanelCollapsed.asReadonly();

  toggleRowPath(path: PivotPath): void {
    this._rowExpandedPaths.set(toggle(this._rowExpandedPaths(), pathKey(path)));
  }

  toggleColumnPath(path: PivotPath): void {
    this._columnExpandedPaths.set(toggle(this._columnExpandedPaths(), pathKey(path)));
  }

  setExpansion(rows: ReadonlySet<string>, columns: ReadonlySet<string>): void {
    this._rowExpandedPaths.set(rows);
    this._columnExpandedPaths.set(columns);
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

  applyOverrides(overrides: ReadonlyMap<string, Partial<PivotFieldConfig>>): void {
    this._fieldOverrides.set(overrides);
  }
}

function toggle(set: ReadonlySet<string>, key: string): ReadonlySet<string> {
  const next = new Set(set);
  if (!next.delete(key)) next.add(key);
  return next;
}
