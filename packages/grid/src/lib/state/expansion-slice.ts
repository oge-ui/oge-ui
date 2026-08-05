import { signal } from '@angular/core';
import type { RowKey } from '@oge-ui/core';

/**
 * Expansion state slice. Groups default to expanded (a *collapsed* set is
 * tracked); master-detail rows default to collapsed (an *expanded* set).
 * Deliberately not part of LoadOptions — toggling re-runs only the flatten step.
 */
export class ExpansionSlice {
  private readonly _collapsedGroups = signal<ReadonlySet<RowKey>>(new Set());
  private readonly _expandedDetails = signal<ReadonlySet<RowKey>>(new Set());

  readonly collapsedGroups = this._collapsedGroups.asReadonly();
  readonly expandedDetails = this._expandedDetails.asReadonly();

  toggleGroup(key: RowKey): void {
    const next = new Set(this._collapsedGroups());
    if (!next.delete(key)) next.add(key);
    this._collapsedGroups.set(next);
  }

  toggleDetail(key: RowKey): void {
    const next = new Set(this._expandedDetails());
    if (!next.delete(key)) next.add(key);
    this._expandedDetails.set(next);
  }

  isDetailExpanded(key: RowKey): boolean {
    return this._expandedDetails().has(key);
  }

  clearGroups(): void {
    if (this._collapsedGroups().size) this._collapsedGroups.set(new Set());
  }

  /** Replaces the toggled-group set (expand-all / collapse-all). */
  setGroups(keys: ReadonlySet<RowKey>): void {
    this._collapsedGroups.set(new Set(keys));
  }

  clearDetails(): void {
    if (this._expandedDetails().size) this._expandedDetails.set(new Set());
  }
}
