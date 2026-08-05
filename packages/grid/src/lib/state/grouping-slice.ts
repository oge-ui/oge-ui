import { signal } from '@angular/core';
import type { GroupDescriptor, SummaryDescriptor } from '@oge-ui/core';

/** Row grouping state slice: group descriptors + summary configuration. */
export class GroupingSlice {
  private readonly _descriptors = signal<readonly GroupDescriptor[]>([]);
  private readonly _groupSummary = signal<readonly SummaryDescriptor[]>([]);
  private readonly _totalSummary = signal<readonly SummaryDescriptor[]>([]);

  readonly descriptors = this._descriptors.asReadonly();
  readonly groupSummary = this._groupSummary.asReadonly();
  readonly totalSummary = this._totalSummary.asReadonly();

  groupBy(field: string): void {
    if (this._descriptors().some((d) => d.field === field)) return;
    this._descriptors.set([...this._descriptors(), { field, dir: 'asc' }]);
  }

  ungroup(field: string): void {
    const next = this._descriptors().filter((d) => d.field !== field);
    if (next.length !== this._descriptors().length) this._descriptors.set(next);
  }

  toggleDirection(field: string): void {
    this._descriptors.set(
      this._descriptors().map((d) =>
        d.field === field ? { field, dir: d.dir === 'asc' ? 'desc' : 'asc' } : d
      )
    );
  }

  set(descriptors: readonly GroupDescriptor[]): void {
    this._descriptors.set(descriptors);
  }

  clear(): void {
    if (this._descriptors().length) this._descriptors.set([]);
  }

  /** Synced from column definitions; guarded so effects do not loop. */
  setSummaries(group: readonly SummaryDescriptor[], total: readonly SummaryDescriptor[]): void {
    if (JSON.stringify(group) !== JSON.stringify(this._groupSummary())) {
      this._groupSummary.set(group);
    }
    if (JSON.stringify(total) !== JSON.stringify(this._totalSummary())) {
      this._totalSummary.set(total);
    }
  }
}
