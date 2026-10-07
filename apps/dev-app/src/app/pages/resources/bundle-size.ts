import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocHeader } from '../../shared/doc-header';
// Read at build time, so the page always shows the committed baseline CI
// enforces — never a second copy of the numbers.
// eslint-disable-next-line @nx/enforce-module-boundaries -- a build-time data file at the repo root, not a project import
import budgets from '../../../../../../tools/size-budgets.json';
// eslint-disable-next-line @nx/enforce-module-boundaries -- a build-time data file at the repo root, not a project import
import commercial from '../../../../../../tools/commercial-families.json';
import {
  formatKb,
  groupBudgets,
  sortGroups,
  type LicenseTier,
  type SortDirection,
  type SortKey,
} from './bundle-size-data';

const GROUPS = groupBudgets(budgets, commercial.families);
const ENTRY_COUNT = GROUPS.reduce((sum, group) => sum + group.rows.length, 0);

type TierFilter = 'all' | LicenseTier;

/**
 * `/bundle-size` — the gzip size of every published entry point, from the
 * baseline `size-check` holds CI to (`tools/size-budgets.json`), grouped by
 * package and marked MIT or commercial.
 */
@Component({
  selector: 'app-bundle-size',
  imports: [DocHeader, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Bundle size"
      category="Resources"
      categoryLink="/changelog"
      [chips]="[
        entryCount + ' entry points',
        groupsAll.length + ' packages',
        'gzip',
      ]"
    >
      <p>
        What each OGE UI entry point adds to your app, gzipped — the baseline
        every pull request is checked against. Import only the entry points you
        use: secondary entries such as
        <code>&#64;oge-ui/grid/export-excel</code> stay out of your bundle until
        you import them.
      </p>
    </app-doc-header>

    <h2 id="sizes" class="scroll-mt-20">Size per entry point</h2>
    <div class="mb-3 flex flex-wrap items-center gap-3">
      <div
        class="flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-700"
        role="group"
        aria-label="Filter by license"
      >
        @for (option of tierOptions; track option.value) {
          <button
            type="button"
            class="rounded-md px-3 py-1 text-[13px] font-medium transition-colors"
            [class]="
              tier() === option.value
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100'
            "
            [attr.aria-pressed]="tier() === option.value"
            (click)="tier.set(option.value)"
          >
            {{ option.label }}
          </button>
        }
      </div>
      <p class="!my-0 text-[13px] text-gray-500 dark:text-gray-400">
        {{ visibleCount() }} of {{ entryCount }} entry points · CI fails above
        the baseline + {{ tolerancePercent }} %
      </p>
    </div>

    <div
      class="overflow-x-auto rounded-lg border border-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 dark:border-gray-800"
      tabindex="0"
      role="region"
      aria-labelledby="sizes"
    >
      <table class="app-size-table">
        <caption class="sr-only">
          Gzip size per published entry point, grouped by package. Sorted by
          {{
            sortKey() === 'name' ? 'name' : 'size'
          }},
          {{
            direction()
          }}.
        </caption>
        <thead>
          <tr>
            <th scope="col" [attr.aria-sort]="ariaSort('name')">
              <button type="button" (click)="sortBy('name')">
                Entry point
                <span aria-hidden="true">{{ arrow('name') }}</span>
              </button>
            </th>
            <th scope="col">License</th>
            <th
              scope="col"
              class="text-right"
              [attr.aria-sort]="ariaSort('size')"
            >
              <button type="button" (click)="sortBy('size')">
                Gzip
                <span aria-hidden="true">{{ arrow('size') }}</span>
              </button>
            </th>
            <th scope="col" class="text-right">CI ceiling</th>
          </tr>
        </thead>
        @for (group of groups(); track group.name) {
          <tbody>
            <tr class="app-size-package">
              <th scope="rowgroup" colspan="4">
                <span class="font-mono">{{ group.name }}</span>
                <span
                  class="ml-2 text-[12px] font-normal text-gray-500 dark:text-gray-400"
                  >{{ group.rows.length }}
                  {{
                    group.rows.length === 1 ? 'entry point' : 'entry points'
                  }}</span
                >
              </th>
            </tr>
            @for (row of group.rows; track row.entry) {
              <tr>
                <th scope="row" class="font-mono">
                  {{ row.subpath === '.' ? group.name : row.entry }}
                </th>
                <td>
                  <span
                    class="app-size-tier"
                    [class.app-size-tier-commercial]="
                      group.tier === 'commercial'
                    "
                    >{{
                      group.tier === 'commercial' ? 'Commercial' : 'MIT'
                    }}</span
                  >
                </td>
                <td class="text-right tabular-nums">{{ kb(row.bytes) }}</td>
                <td
                  class="text-right tabular-nums text-gray-500 dark:text-gray-400"
                >
                  {{ kb(row.ceiling) }}
                </td>
              </tr>
            }
          </tbody>
        }
      </table>
    </div>

    <h2 id="how-budgets-are-enforced" class="scroll-mt-20">
      How the budgets are enforced
    </h2>
    <ul>
      <li>
        <strong>What is measured.</strong> Every subpath in each published
        package's <code>exports</code> map, resolved to the file a bundler loads
        (the ESM build; stylesheets as they are). A JavaScript entry is measured
        together with the package-internal chunks it statically imports,
        concatenated and gzipped at level 9. Other packages and peer
        dependencies (<code>&#64;angular/*</code>, <code>react</code>) are not
        included, so each number is what that entry point itself adds.
      </li>
      <li>
        <strong>When it fails.</strong>
        <code>npx nx run &#64;oge/source:size-check</code> runs in CI after the
        builds and fails when an entry grows more than {{ tolerancePercent }} %
        over its baseline, or when a new entry point has no baseline yet.
        Entries that shrink by more than that are reported so the budget can
        tighten.
      </li>
      <li>
        <strong>Intended growth</strong> is re-baselined with
        <code>node tools/size-check.mjs --update</code>, and the pull request
        says why — so every jump in this table has a reason in the
        <a
          routerLink="/changelog"
          class="text-indigo-600 underline dark:text-indigo-400"
          >changelog</a
        >.
      </li>
      <li>
        <strong>License marker.</strong> Commercial packages are the six
        families on the ADR 0003 list — the same list the license-boundary gate
        checks every <code>license</code> field and import against. See
        <a
          routerLink="/license"
          class="text-indigo-600 underline dark:text-indigo-400"
          >Licensing</a
        >.
      </li>
    </ul>
  `,
  styles: `
    .app-size-table {
      width: 100%;
      margin: 0;
      border-collapse: collapse;
      font-size: 13px;
    }
    .app-size-table th,
    .app-size-table td {
      padding: 0.45rem 0.85rem;
      border-bottom: 1px solid var(--app-size-rule, rgb(243 244 246));
      text-align: left;
      font-weight: 400;
      white-space: nowrap;
    }
    .app-size-table .text-right {
      text-align: right;
    }
    .app-size-table thead th {
      background: var(--app-size-head, rgb(249 250 251));
      font-size: 12px;
      font-weight: 600;
      color: inherit;
    }
    .app-size-table thead button {
      display: inline-flex;
      gap: 0.3rem;
      align-items: center;
      font: inherit;
      color: inherit;
      cursor: pointer;
    }
    .app-size-table thead button:focus-visible {
      outline: 2px solid rgb(99 102 241);
      outline-offset: 2px;
      border-radius: 0.25rem;
    }
    .app-size-package th {
      padding-top: 0.8rem;
      font-weight: 600;
      background: var(--app-size-group, rgb(249 250 251 / 0.6));
    }
    .app-size-tier {
      display: inline-block;
      padding: 0.05rem 0.5rem;
      border-radius: 999px;
      background: rgb(220 252 231);
      color: rgb(21 128 61);
      font-size: 11px;
      font-weight: 600;
    }
    .app-size-tier-commercial {
      background: rgb(254 243 199);
      color: rgb(146 64 14);
    }
    :host-context(.dark) .app-size-table {
      --app-size-rule: rgb(31 41 55);
      --app-size-head: rgb(17 24 39);
      --app-size-group: rgb(17 24 39 / 0.6);
    }
    :host-context(.dark) .app-size-tier {
      background: rgb(34 197 94 / 0.16);
      color: rgb(134 239 172);
    }
    :host-context(.dark) .app-size-tier-commercial {
      background: rgb(245 158 11 / 0.16);
      color: rgb(252 211 77);
    }
  `,
})
export class BundleSizePage {
  protected readonly entryCount = ENTRY_COUNT;
  protected readonly groupsAll = GROUPS;
  protected readonly tolerancePercent = Math.round(budgets.tolerance * 100);
  protected readonly tierOptions: readonly {
    value: TierFilter;
    label: string;
  }[] = [
    { value: 'all', label: 'All' },
    { value: 'mit', label: 'MIT' },
    { value: 'commercial', label: 'Commercial' },
  ];

  protected readonly sortKey = signal<SortKey>('name');
  protected readonly direction = signal<SortDirection>('ascending');
  protected readonly tier = signal<TierFilter>('all');

  protected readonly groups = computed(() =>
    sortGroups(
      this.tier() === 'all'
        ? GROUPS
        : GROUPS.filter((group) => group.tier === this.tier()),
      this.sortKey(),
      this.direction(),
    ),
  );

  protected readonly visibleCount = computed(() =>
    this.groups().reduce((sum, group) => sum + group.rows.length, 0),
  );

  protected sortBy(key: SortKey): void {
    if (this.sortKey() === key) {
      this.direction.update((current) =>
        current === 'ascending' ? 'descending' : 'ascending',
      );
      return;
    }
    this.sortKey.set(key);
    // sizes read best largest-first; names A→Z
    this.direction.set(key === 'size' ? 'descending' : 'ascending');
  }

  protected ariaSort(key: SortKey): SortDirection | null {
    return this.sortKey() === key ? this.direction() : null;
  }

  protected arrow(key: SortKey): string {
    if (this.sortKey() !== key) return '↕';
    return this.direction() === 'ascending' ? '↑' : '↓';
  }

  protected kb(bytes: number): string {
    return formatKb(bytes);
  }
}
