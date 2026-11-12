import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import type { FilterExpr } from '@oge-ui/core';
import { OgeColumn, OgeGrid } from '@oge-ui/grid';
import { OgeGrid as OgeReactGrid } from '@oge-ui/react-grid';
import { createElement, useEffect, useState, type ReactNode } from 'react';
import { ReactHost } from '../../shared/react-host';
import {
  BENCH_COLUMNS,
  benchRows,
  benchmarkBridge,
  type BenchRow,
} from './benchmark-data';

/** One array for every render: a new columns array would re-set the grid each time. */
const REACT_COLUMNS = BENCH_COLUMNS.map((c) => ({ ...c }));

/** The React grid under test; filter and sort arrive through the bridge. */
function ReactBench({
  rows,
}: {
  readonly rows: readonly BenchRow[];
}): ReactNode {
  const [filter, setFilter] = useState<FilterExpr | null>(null);
  useEffect(() => {
    benchmarkBridge.setFilter = setFilter;
  }, []);
  return createElement(OgeReactGrid<BenchRow>, {
    data: rows,
    keyField: 'id',
    virtualScroll: true,
    filterValue: filter,
    onFilterValueChange: setFilter,
    columns: REACT_COLUMNS,
    style: { height: 600 },
  });
}

/**
 * `/benchmarks/run?fw=angular|react&rows=100000` — the page
 * `tools/benchmarks/grid-bench.mjs` drives. Not in the navigation and not
 * indexed: it renders one grid over generated rows and exposes
 * `window.__ogeBench` for the runner.
 */
@Component({
  selector: 'app-benchmark-run',
  imports: [OgeColumn, OgeGrid, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // the React grid carries class names only; the docs pull its stylesheet
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../../../../packages/react/grid/src/styles.scss'],
  template: `
    <h1 class="text-lg font-semibold">
      Grid benchmark ({{ fw }}, {{ count }} rows)
    </h1>
    <p class="mb-3 text-sm text-slate-600 dark:text-slate-300">
      Driven by <code>tools/benchmarks/grid-bench.mjs</code>; see
      <a
        href="/benchmarks"
        class="text-indigo-600 underline dark:text-indigo-400"
        >Benchmarks</a
      >.
    </p>
    <div class="bench-host">
      @if (show()) {
        @if (fw === 'react') {
          <app-react-host [render]="reactGrid" />
        } @else {
          <oge-grid
            [data]="rows"
            keyField="id"
            [virtualScroll]="true"
            [(filterValue)]="filter"
            style="height: 600px"
          >
            @for (column of columns; track column.field) {
              <oge-column
                [field]="column.field"
                [caption]="column.caption"
                [dataType]="column.dataType"
                [width]="column.width"
              />
            }
          </oge-grid>
        }
      }
    </div>
  `,
})
export class BenchmarkRunPage {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;
  protected readonly fw =
    this.query.get('fw') === 'react' ? 'react' : 'angular';
  protected readonly count = Math.min(
    1_000_000,
    Math.max(1, Number(this.query.get('rows')) || 100_000),
  );
  protected readonly columns = BENCH_COLUMNS;
  protected rows: readonly BenchRow[] = [];
  protected readonly show = signal(false);
  protected readonly filter = signal<FilterExpr | null>(null);
  protected readonly reactGrid = () =>
    createElement(ReactBench, { rows: this.rows });

  constructor() {
    afterNextRender(() => {
      // rows are generated before the clock starts: the benchmark measures
      // the grid, not the data generator
      this.rows = benchRows(this.count);
      benchmarkBridge.setFilter = (filter) => this.filter.set(filter);
      void benchmarkBridge.start(this.host.nativeElement, () =>
        this.show.set(true),
      );
    });
  }
}
