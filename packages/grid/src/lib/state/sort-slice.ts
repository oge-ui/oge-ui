import { signal } from '@angular/core';
import type { SortDescriptor } from '@oge-ui/core';

/** Sort state slice: read-only signals + intent methods. */
export class SortSlice {
  private readonly _descriptors = signal<readonly SortDescriptor[]>([]);
  readonly descriptors = this._descriptors.asReadonly();

  /**
   * Cycles a field through asc → desc → none (or asc → desc → asc when
   * `allowUnsorting` is false). `additive` (multi-sort, e.g. shift+click)
   * keeps other fields' descriptors and preserves this field's chain position.
   */
  toggle(field: string, additive = false, allowUnsorting = true): void {
    const current = this._descriptors();
    const existing = current.find((d) => d.field === field);
    if (!additive) {
      this._descriptors.set(
        !existing
          ? [{ field, dir: 'asc' }]
          : existing.dir === 'asc'
            ? [{ field, dir: 'desc' }]
            : allowUnsorting
              ? []
              : [{ field, dir: 'asc' }]
      );
      return;
    }
    if (!existing) {
      this._descriptors.set([...current, { field, dir: 'asc' }]);
    } else if (existing.dir === 'asc') {
      this._descriptors.set(current.map((d) => (d.field === field ? { field, dir: 'desc' } : d)));
    } else if (allowUnsorting) {
      this._descriptors.set(current.filter((d) => d.field !== field));
    } else {
      this._descriptors.set(current.map((d) => (d.field === field ? { field, dir: 'asc' } : d)));
    }
  }

  set(descriptors: readonly SortDescriptor[]): void {
    this._descriptors.set(descriptors);
  }

  clear(): void {
    this._descriptors.set([]);
  }

  /** Direction and 1-based chain position of a field, or null when unsorted. */
  stateOf(field: string): { dir: 'asc' | 'desc'; index: number } | null {
    const index = this._descriptors().findIndex((d) => d.field === field);
    return index < 0 ? null : { dir: this._descriptors()[index].dir, index: index + 1 };
  }
}
