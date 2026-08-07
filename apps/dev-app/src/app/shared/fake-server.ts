import { Injectable, signal } from '@angular/core';
import {
  applyFilter,
  compareValues,
  createFieldAccessor,
  runLoadOptions,
  type FilterExpr,
  type LoadOptions,
  type LoadResult,
} from '@oge-ui/core';
import { makeEmployees, type Employee } from './demo-data';

function networkDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

function describeOptions(options: LoadOptions): string {
  const parts = [`skip=${options.skip ?? 0}`, `take=${options.take ?? '∞'}`];
  if (options.sort?.length) {
    parts.push(
      `sort=${options.sort.map((s) => `${s.field} ${s.dir}`).join(',')}`,
    );
  }
  if (options.filter) parts.push(`filter=${JSON.stringify(options.filter)}`);
  if (options.searchText) parts.push(`search="${options.searchText}"`);
  return parts.join('&');
}

/**
 * In-browser stand-in for a .NET-style query endpoint: it receives the grid's
 * serializable LoadOptions, "executes SQL" (the client pipeline over a fixed
 * dataset) after an artificial latency, and logs every request so the demo can
 * show exactly what would go over the wire.
 */
@Injectable({ providedIn: 'root' })
export class FakeEmployeeServer {
  private readonly db = makeEmployees(500, 7);
  private counter = 0;

  readonly requestLog = signal<readonly string[]>([]);

  async load(options: LoadOptions): Promise<LoadResult<Employee>> {
    this.push(`GET /api/employees?${describeOptions(options)}`);
    await networkDelay(250, options.signal);
    return runLoadOptions(this.db, options);
  }

  async distinct(
    field: string,
    options?: { filter?: FilterExpr | null },
  ): Promise<readonly unknown[]> {
    this.push(`GET /api/employees/distinct?field=${field}`);
    await networkDelay(150);
    const accessor = createFieldAccessor<Employee>(field);
    const rows = applyFilter(this.db, options?.filter);
    return [...new Set(rows.map(accessor))].sort(compareValues);
  }

  private push(entry: string): void {
    this.counter += 1;
    this.requestLog.set(
      [`#${this.counter} ${entry}`, ...this.requestLog()].slice(0, 30),
    );
  }
}
