import { JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  signal,
} from '@angular/core';
import { createElement, createRef, type ReactNode } from 'react';
import type { GridStateSnapshot } from '@oge-ui/core';
import {
  OgeGrid,
  OgeGridStateStorageProvider,
  type OgeGridColumnProps,
  type OgeGridHandle,
  type OgeStateStorage,
} from '@oge-ui/react-grid';
import { OgeCard } from '@oge-ui/layout';
import { DemoCard } from '../../shared/demo-card';
import { makeEmployees, type Employee } from '../../shared/demo-data';
import { ReactHost } from '../../shared/react-host';
import { GRID_PERSISTENCE_DEMOS } from './persistence-snippets';

const employees = makeEmployees(60, 4);

const FULL_COLUMNS: OgeGridColumnProps<Employee>[] = [
  { field: 'id', caption: 'Id', width: 70, dataType: 'number' },
  { field: 'firstName', caption: 'First Name' },
  { field: 'lastName', caption: 'Last Name' },
  { field: 'department', caption: 'Department' },
  { field: 'salary', caption: 'Salary', dataType: 'number' },
];

const SMALL_COLUMNS: OgeGridColumnProps<Employee>[] = [
  { field: 'firstName', caption: 'First Name' },
  { field: 'department', caption: 'Department' },
  { field: 'salary', caption: 'Salary', dataType: 'number' },
];

const IMPERATIVE_COLUMNS: OgeGridColumnProps<Employee>[] = [
  { field: 'firstName', caption: 'First Name' },
  { field: 'department', caption: 'Department' },
  { field: 'city', caption: 'City' },
  { field: 'salary', caption: 'Salary', dataType: 'number' },
];

/**
 * The React half of the persistence page — `stateKey` against the default
 * storage, a fake async API backend through `OgeGridStateStorageProvider`, and
 * the imperative `state()` / `applyState()` / `onStateChange` trio, rendered
 * as real React trees inside `/components/data-grid/persistence` when the
 * reader has chosen React.
 */
@Component({
  selector: 'app-react-grid-persistence-demos',
  imports: [DemoCard, ReactHost, OgeCard, JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/grid/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../../../../../packages/react/layout/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['stateKey', 'localStorage']"
      [code]="demos[0].source"
      language="tsx"
    >
      <p class="mb-2 text-sm text-gray-500 dark:text-gray-400">
        Sort, filter, group, resize or hide columns — then reload the page:
        everything comes back.
      </p>
      <app-react-host [render]="persisted" />
    </app-demo-card>

    <h3>Custom backend (API, database, IndexedDB…)</h3>
    <p>
      Wrap the grid in <code>OgeGridStateStorageProvider</code> (or pass
      <code>stateStorage</code> per grid) — both methods may return promises, so
      an HTTP backend plugs in directly. The demo below saves through a fake API
      with 250ms latency; watch the calls on the right.
    </p>
    <app-demo-card
      [chips]="['OgeGridStateStorageProvider', 'async']"
      [code]="demos[1].source"
      language="tsx"
    >
      <div
        class="grid grid-cols-[minmax(0,2fr)_minmax(240px,1fr)] items-start gap-4 max-lg:grid-cols-1"
      >
        <app-react-host [render]="apiPersisted" />
        <oge-card
          stylingMode="filled"
          size="sm"
          class="max-h-[360px]"
          style="overflow: auto"
          role="complementary"
          aria-label="Fake API log"
        >
          <h3 class="!mt-0 mb-2 text-sm font-semibold">
            Fake API log (250ms latency)
          </h3>
          <ol class="m-0 list-decimal pl-4 font-mono text-xs leading-relaxed">
            @for (entry of apiLog(); track $index) {
              <li class="break-all">{{ entry }}</li>
            } @empty {
              <li class="list-none text-gray-400">No calls yet</li>
            }
          </ol>
        </oge-card>
      </div>
    </app-demo-card>

    <h3>Imperative: state() / applyState() / onStateChange</h3>
    <p>
      No provider needed: read the snapshot with <code>state()</code> on the
      handle, apply one with <code>applyState()</code>, and react to
      <code>onStateChange</code> (debounced) to persist on your own terms — e.g.
      a <em>Save view</em> button or per-user server profiles.
    </p>
    <app-demo-card
      [chips]="['state()', 'applyState()', 'onStateChange']"
      [code]="demos[2].source"
      language="tsx"
    >
      <div class="mb-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="rounded-md border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          (click)="capture()"
        >
          Capture view
        </button>
        <button
          type="button"
          class="rounded-md border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
          [disabled]="!captured()"
          (click)="restore()"
        >
          Restore captured view
        </button>
        <span class="text-xs text-gray-500 dark:text-gray-400">
          onStateChange fired
          <span class="font-semibold">{{ changeCount() }}</span> times
        </span>
      </div>
      <div
        class="grid grid-cols-[minmax(0,2fr)_minmax(240px,1fr)] items-start gap-4 max-lg:grid-cols-1"
      >
        <app-react-host [render]="imperative" />
        <oge-card
          stylingMode="filled"
          size="sm"
          class="max-h-[360px]"
          style="overflow: auto"
          role="complementary"
          aria-label="Last onStateChange payload"
        >
          <h3 class="!mt-0 mb-2 text-sm font-semibold">
            Last onStateChange payload
          </h3>
          <pre
            class="m-0 whitespace-pre-wrap break-all font-mono text-xs leading-relaxed"
            >{{ lastState() ? (lastState() | json) : '—' }}</pre>
        </oge-card>
      </div>
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        The snapshot is plain JSON (<code>GridStateSnapshot</code> from
        <code>&#64;oge-ui/core</code>) — safe to store, diff, and version.
      </li>
      <li>
        Saves are debounced (250ms), so rapid interactions produce one write.
      </li>
      <li>
        Restore is async-aware: with an API backend the grid renders immediately
        and applies the state when it arrives — unless the user already
        navigated to another <code>stateKey</code>.
      </li>
      <li>
        <code>applyState()</code> also works across grids: capture on one, apply
        to another with the same columns.
      </li>
    </ul>
  `,
})
export class ReactGridPersistenceDemos {
  protected readonly demos = GRID_PERSISTENCE_DEMOS;
  protected readonly apiLog = signal<readonly string[]>([]);
  protected readonly captured = signal<GridStateSnapshot | null>(null);
  protected readonly lastState = signal<GridStateSnapshot | null>(null);
  protected readonly changeCount = signal(0);

  private readonly handle = createRef<OgeGridHandle<Employee>>();

  /** A fake API: 250ms latency both ways, and every call shows up in the log. */
  private readonly apiStorage: OgeStateStorage = (() => {
    const store = new Map<string, string>();
    return {
      get: async (key) => {
        await new Promise((resolve) => setTimeout(resolve, 250));
        this.apiLog.set([`GET ${key}`, ...this.apiLog()].slice(0, 8));
        return store.get(key) ?? null;
      },
      set: async (key, value) => {
        await new Promise((resolve) => setTimeout(resolve, 250));
        store.set(key, value);
        this.apiLog.set(
          [`PUT ${key} (${value.length} B)`, ...this.apiLog()].slice(0, 8),
        );
      },
    };
  })();

  protected capture(): void {
    this.captured.set(this.handle.current?.state() ?? null);
  }

  protected restore(): void {
    const snapshot = this.captured();
    if (snapshot) this.handle.current?.applyState(snapshot);
  }

  protected readonly persisted = (): ReactNode =>
    createElement(OgeGrid<Employee>, {
      data: employees,
      keyField: 'id',
      columns: FULL_COLUMNS,
      stateKey: 'docs-persistence-react',
      groupPanel: true,
      filterRow: true,
      columnChooser: true,
      paging: { pageSize: 8 },
    });

  protected readonly apiPersisted = (): ReactNode =>
    createElement(
      OgeGridStateStorageProvider,
      { storage: this.apiStorage },
      createElement(OgeGrid<Employee>, {
        data: employees,
        keyField: 'id',
        columns: SMALL_COLUMNS,
        stateKey: 'api-demo-react',
        filterRow: true,
        paging: { pageSize: 6 },
      }),
    );

  protected readonly imperative = (): ReactNode =>
    createElement(OgeGrid<Employee>, {
      ref: this.handle,
      data: employees,
      keyField: 'id',
      columns: IMPERATIVE_COLUMNS,
      filterRow: true,
      groupPanel: true,
      paging: { pageSize: 6 },
      onStateChange: (snapshot) => {
        this.lastState.set(snapshot);
        this.changeCount.set(this.changeCount() + 1);
      },
    });
}
