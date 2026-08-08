import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { JsonPipe } from '@angular/common';
import type { GridStateSnapshot } from '@oge-ui/core';
import {
  OGE_STATE_STORAGE,
  OgeColumn,
  OgeGrid,
  type OgeStateStorage,
} from '@oge-ui/grid';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { makeEmployees } from '../../shared/demo-data';
import {
  CUSTOM_STORAGE_SNIPPET,
  IMPERATIVE_SNIPPET,
  STATE_KEY_SNIPPET,
} from './persistence-snippets';

interface LoggingStorage extends OgeStateStorage {
  readonly log: ReturnType<typeof signal<readonly string[]>>;
}

function createFakeApiStorage(): LoggingStorage {
  const store = new Map<string, string>();
  const log = signal<readonly string[]>([]);
  return {
    log,
    get: async (key) => {
      await new Promise((resolve) => setTimeout(resolve, 250));
      log.update((entries) => [`GET ${key}`, ...entries].slice(0, 8));
      return store.get(key) ?? null;
    },
    set: async (key, value) => {
      await new Promise((resolve) => setTimeout(resolve, 250));
      store.set(key, value);
      log.update((entries) =>
        [`PUT ${key} (${value.length} B)`, ...entries].slice(0, 8),
      );
    },
  };
}

/** Isolated provider scope: this grid persists through a fake async API. */
@Component({
  selector: 'app-persistence-api-demo',
  imports: [OgeGrid, OgeColumn],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: OGE_STATE_STORAGE, useFactory: createFakeApiStorage }],
  template: `
    <div
      class="grid grid-cols-[minmax(0,2fr)_minmax(240px,1fr)] items-start gap-4 max-lg:grid-cols-1"
    >
      <oge-grid
        [data]="employees"
        keyField="id"
        stateKey="api-demo"
        [filterRow]="true"
        [paging]="{ pageSize: 6 }"
      >
        <oge-column field="firstName" caption="First Name" />
        <oge-column field="department" caption="Department" />
        <oge-column field="salary" caption="Salary" dataType="number" />
      </oge-grid>
      <aside
        class="max-h-[360px] overflow-auto rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 dark:border-gray-800 dark:bg-gray-900"
      >
        <h3 class="!mt-0 mb-2 text-sm font-semibold">
          Fake API log (250ms latency)
        </h3>
        <ol class="m-0 list-none p-0 font-mono text-xs leading-relaxed">
          @for (entry of storageLog(); track $index) {
            <li>{{ entry }}</li>
          } @empty {
            <li class="text-gray-400">Sort or filter the grid…</li>
          }
        </ol>
      </aside>
    </div>
  `,
})
export class PersistenceApiDemo {
  protected readonly employees = makeEmployees(30, 9);
  protected readonly storageLog = (inject(OGE_STATE_STORAGE) as LoggingStorage)
    .log;
}

@Component({
  selector: 'app-persistence',
  imports: [
    OgeGrid,
    OgeColumn,
    PersistenceApiDemo,
    DemoCard,
    DocHeader,
    JsonPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="State Persistence"
      [chips]="[
        'stateKey',
        'OGE_STATE_STORAGE',
        'state()',
        'applyState()',
        'stateChange',
      ]"
    >
      <p>
        The grid's whole UI state — sorting, filters, grouping, column widths,
        order, pins and visibility — is one serializable snapshot. Persist it
        automatically with
        <code>stateKey</code> (localStorage by default, any sync or async
        backend via <code>OGE_STATE_STORAGE</code>), or take full control with
        <code>state()</code> / <code>applyState()</code> and the
        <code>stateChange</code> event.
      </p>
    </app-doc-header>

    <app-demo-card
      [chips]="['stateKey', 'localStorage']"
      [code]="stateKeySnippet"
      language="html"
    >
      <p class="mb-2 text-sm text-gray-500 dark:text-gray-400">
        Sort, filter, group, resize or hide columns — then reload the page:
        everything comes back.
      </p>
      <oge-grid
        [data]="employees"
        keyField="id"
        stateKey="docs-persistence"
        [groupPanel]="true"
        [filterRow]="true"
        [columnChooser]="true"
        [paging]="{ pageSize: 8 }"
      >
        <oge-column field="id" caption="Id" [width]="70" dataType="number" />
        <oge-column field="firstName" caption="First Name" />
        <oge-column field="lastName" caption="Last Name" />
        <oge-column field="department" caption="Department" />
        <oge-column field="salary" caption="Salary" dataType="number" />
      </oge-grid>
    </app-demo-card>

    <h3>Custom backend (API, database, IndexedDB…)</h3>
    <p>
      Provide <code>OGE_STATE_STORAGE</code> anywhere in the injector tree —
      both methods may return promises, so an HTTP backend plugs in directly.
      The demo below saves through a fake API with 250ms latency; watch the
      calls on the right.
    </p>
    <app-demo-card
      [chips]="['OGE_STATE_STORAGE', 'async']"
      [code]="customStorageSnippet"
      language="ts"
    >
      <app-persistence-api-demo />
    </app-demo-card>

    <h3>Imperative: state() / applyState() / stateChange</h3>
    <p>
      No token needed: read the snapshot with <code>state()</code>, apply one
      with <code>applyState()</code>, and react to
      <code>stateChange</code> (debounced) to persist on your own terms — e.g. a
      <em>Save view</em> button or per-user server profiles.
    </p>
    <app-demo-card
      [chips]="['state()', 'applyState()', 'stateChange']"
      [code]="imperativeSnippet"
      language="ts"
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
          stateChange fired
          <span class="font-semibold">{{ changeCount() }}</span> times
        </span>
      </div>
      <div
        class="grid grid-cols-[minmax(0,2fr)_minmax(240px,1fr)] items-start gap-4 max-lg:grid-cols-1"
      >
        <oge-grid
          #imperativeGrid
          [data]="employees"
          keyField="id"
          [filterRow]="true"
          [groupPanel]="true"
          [paging]="{ pageSize: 6 }"
          (stateChange)="onStateChange($event)"
        >
          <oge-column field="firstName" caption="First Name" />
          <oge-column field="department" caption="Department" />
          <oge-column field="city" caption="City" />
          <oge-column field="salary" caption="Salary" dataType="number" />
        </oge-grid>
        <aside
          class="max-h-[360px] overflow-auto rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 dark:border-gray-800 dark:bg-gray-900"
        >
          <h3 class="!mt-0 mb-2 text-sm font-semibold">
            Last stateChange payload
          </h3>
          <pre
            class="m-0 whitespace-pre-wrap break-all font-mono text-xs leading-relaxed"
            >{{ lastState() ? (lastState() | json) : '—' }}</pre>
        </aside>
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
export class PersistencePage {
  protected readonly employees = makeEmployees(60, 4);
  protected readonly stateKeySnippet = STATE_KEY_SNIPPET;
  protected readonly customStorageSnippet = CUSTOM_STORAGE_SNIPPET;
  protected readonly imperativeSnippet = IMPERATIVE_SNIPPET;

  protected readonly imperativeGrid =
    viewChild<OgeGrid<{ id: number }>>('imperativeGrid');
  protected readonly captured = signal<GridStateSnapshot | null>(null);
  protected readonly lastState = signal<GridStateSnapshot | null>(null);
  protected readonly changeCount = signal(0);

  protected capture(): void {
    const grid = this.imperativeGrid();
    if (grid) this.captured.set(grid.state());
  }

  protected restore(): void {
    const snapshot = this.captured();
    const grid = this.imperativeGrid();
    if (snapshot && grid) grid.applyState(snapshot);
  }

  protected onStateChange(snapshot: GridStateSnapshot): void {
    this.lastState.set(snapshot);
    this.changeCount.update((count) => count + 1);
  }
}
