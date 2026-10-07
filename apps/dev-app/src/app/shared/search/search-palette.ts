import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  FRAMEWORKS,
  FrameworkService,
  frameworksOfPage,
  type DocsFramework,
} from '../framework.service';
import { Icon, type IconName } from '../icon';
import {
  flattenIndex,
  resultUrl,
  searchItems,
  type SearchGroup,
  type SearchIndexFile,
  type SearchItem,
  type SearchKind,
  type SearchResult,
} from './search-model';
import { SearchService } from './search.service';

const RECENT_KEY = 'oge-docs-recent-searches';
const RECENT_LIMIT = 6;

/** What a recent search remembers — enough to show and reopen it. */
interface RecentEntry {
  readonly kind: SearchKind;
  readonly title: string;
  readonly context: string;
  readonly detail: string;
  readonly path: string;
  readonly anchor?: string;
  readonly framework?: DocsFramework;
}

/** A rendered option: its group, its result and its flat position. */
interface Row {
  readonly id: string;
  readonly index: number;
  readonly result: SearchResult;
}

interface RenderedGroup {
  readonly id: string;
  readonly label: string;
  readonly rows: readonly Row[];
}

const KIND_ICON: Readonly<Record<SearchKind, IconName>> = {
  page: 'pages',
  section: 'list',
  api: 'code',
  token: 'palette',
};

let indexRequest: Promise<SearchItem[]> | null = null;

/** Fetches and expands the index once per page load. */
function loadIndex(): Promise<SearchItem[]> {
  indexRequest ??= fetch('/search-index.json')
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<SearchIndexFile>;
    })
    .then(flattenIndex)
    .catch((error: unknown) => {
      indexRequest = null; // let the next open retry
      throw error;
    });
  return indexRequest;
}

/**
 * The Ctrl/⌘K search palette: the WAI-ARIA combobox pattern with a listbox
 * popup, inside a modal `<dialog>`.
 *
 * - Focus stays in the input; ↑/↓ (and Home/End) move the active option,
 *   announced through `aria-activedescendant`; Enter opens it; Escape closes.
 * - Results are grouped (Pages / Sections / API) and ranked prefix > word
 *   start > substring; items the active framework has come first, the rest
 *   carry a badge naming the layer they are in. Opening one of those switches
 *   the site to that layer, so the reader lands on the page that has it.
 * - With an empty query the listbox shows recent picks (localStorage).
 *
 * Loaded on demand by the shell (`@defer (when search.requested())`), so none
 * of this, nor the index, is in the initial bundle.
 */
@Component({
  selector: 'app-search-palette',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -- a backdrop click; Escape is the keyboard path (the dialog's cancel event) -->
    <dialog
      #dialog
      class="app-search-dialog"
      aria-labelledby="app-search-title"
      (close)="onDialogClose()"
      (cancel)="onCancel($event)"
      (click)="onDialogClick($event)"
    >
      <div
        class="flex max-h-[min(36rem,calc(100dvh-6rem))] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-700 shadow-2xl dark:border-gray-700 dark:bg-[#11141c] dark:text-gray-300"
      >
        <h2 id="app-search-title" class="sr-only">Search the documentation</h2>
        <div
          class="flex items-center gap-2.5 border-b border-gray-200 px-4 dark:border-gray-800"
        >
          <span class="text-gray-400 dark:text-gray-500" aria-hidden="true">
            <app-icon name="search" [size]="16" />
          </span>
          <input
            #input
            type="text"
            role="combobox"
            class="h-13 min-w-0 flex-1 bg-transparent text-[15px] text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500"
            placeholder="Search pages, sections and API…"
            aria-label="Search the documentation"
            aria-autocomplete="list"
            aria-controls="app-search-listbox"
            [attr.aria-expanded]="rows().length > 0"
            [attr.aria-activedescendant]="activeId()"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            [value]="query()"
            (input)="onInput($event)"
            (keydown)="onKeydown($event)"
          />
          <kbd
            class="rounded border border-gray-200 px-1.5 py-0.5 font-mono text-[11px] text-gray-500 dark:border-gray-700 dark:text-gray-400"
            >Esc</kbd
          >
        </div>

        <div class="flex min-h-0 flex-1 flex-col">
          <!--
            The listbox is the scroll container and a tab stop of its own: a
            keyboard user who tabs out of the input can still scroll and pick
            (axe: scrollable-region-focusable), with the same keys.
          -->
          <div
            id="app-search-listbox"
            role="listbox"
            tabindex="0"
            class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400/60"
            [attr.aria-label]="query().trim() ? 'Search results' : 'Recent'"
            [attr.aria-activedescendant]="activeId()"
            [class.hidden]="rows().length === 0"
            (keydown)="onKeydown($event)"
          >
            @for (group of groups(); track group.id) {
              <div role="group" [attr.aria-labelledby]="group.id">
                <div
                  [id]="group.id"
                  role="presentation"
                  class="px-2.5 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400"
                >
                  {{ group.label }}
                </div>
                @for (row of group.rows; track row.id) {
                  <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -- combobox options take no focus: the keyboard drives them from the input through aria-activedescendant -->
                  <div
                    role="option"
                    [id]="row.id"
                    [attr.aria-selected]="row.index === active()"
                    class="app-search-option flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2"
                    [class.app-search-option-active]="row.index === active()"
                    (click)="choose(row.result)"
                    (pointermove)="active.set(row.index)"
                  >
                    <span
                      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400"
                      aria-hidden="true"
                    >
                      <app-icon [name]="icon(row.result)" [size]="14" />
                    </span>
                    <span class="flex min-w-0 flex-1 flex-col">
                      <span
                        class="truncate text-[14px] font-medium text-gray-900 dark:text-gray-100"
                        [class.font-mono]="
                          row.result.item.kind === 'api' ||
                          row.result.item.kind === 'token'
                        "
                      >
                        @if (row.result.match; as range) {
                          {{ row.result.item.title.slice(0, range[0])
                          }}<mark class="app-search-mark">{{
                            row.result.item.title.slice(range[0], range[1])
                          }}</mark
                          >{{ row.result.item.title.slice(range[1]) }}
                        } @else {
                          {{ row.result.item.title }}
                        }
                      </span>
                      <span
                        class="truncate text-[12px] text-gray-600 dark:text-gray-400"
                      >
                        {{ subtitle(row.result) }}
                      </span>
                    </span>
                    @if (!row.result.inFramework) {
                      <span
                        class="shrink-0 rounded-full border border-gray-200 px-2 py-0.5 text-[11px] text-gray-600 dark:border-gray-700 dark:text-gray-300"
                        >{{ badge(row.result) }}</span
                      >
                    }
                  </div>
                }
              </div>
            }
          </div>

          @if (rows().length === 0) {
            <p
              class="px-3 py-8 text-center text-[14px] text-gray-500 dark:text-gray-400"
            >
              @switch (state()) {
                @case ('loading') {
                  Loading the search index…
                }
                @case ('error') {
                  The search index could not be loaded. Check your connection
                  and try again.
                }
                @default {
                  @if (query().trim()) {
                    No results for “{{ query().trim() }}”.
                  } @else {
                    Type to search pages, sections and API members.
                  }
                }
              }
            </p>
          }
        </div>

        <div
          class="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-200 px-4 py-2 text-[11.5px] text-gray-500 dark:border-gray-800 dark:text-gray-400"
          aria-hidden="true"
        >
          <span
            ><kbd class="app-search-kbd">↑</kbd
            ><kbd class="app-search-kbd">↓</kbd> to navigate</span
          >
          <span><kbd class="app-search-kbd">Enter</kbd> to open</span>
          <span><kbd class="app-search-kbd">Esc</kbd> to close</span>
          <span class="ml-auto">{{ frameworkLabel() }} results first</span>
        </div>
        <p class="sr-only" role="status" aria-live="polite">{{ status() }}</p>
      </div>
    </dialog>
  `,
  styles: `
    .app-search-dialog {
      width: min(40rem, calc(100vw - 2rem));
      max-width: none;
      max-height: none;
      margin: 4.5rem auto auto;
      padding: 0;
      border: 0;
      background: transparent;
      overflow: visible;
    }
    .app-search-dialog::backdrop {
      background: rgb(15 23 42 / 0.45);
      backdrop-filter: blur(2px);
    }
    .app-search-option-active {
      background: rgb(238 242 255);
    }
    :host-context(.dark) .app-search-option-active {
      background: rgb(99 102 241 / 0.16);
    }
    .app-search-mark {
      background: transparent;
      color: rgb(79 70 229);
      font-weight: 600;
    }
    :host-context(.dark) .app-search-mark {
      color: rgb(165 180 252);
    }
    .app-search-kbd {
      display: inline-block;
      min-width: 1.25rem;
      margin-right: 0.2rem;
      padding: 0 0.3rem;
      border: 1px solid currentColor;
      border-radius: 0.25rem;
      font-family: ui-monospace, monospace;
      font-size: 10.5px;
      text-align: center;
    }
    @media (prefers-reduced-motion: no-preference) {
      .app-search-dialog[open] {
        animation: app-search-in 120ms ease-out;
      }
    }
    @keyframes app-search-in {
      from {
        opacity: 0;
        transform: translateY(-6px);
      }
    }
  `,
})
export class SearchPalette {
  private readonly search = inject(SearchService);
  private readonly framework = inject(FrameworkService);
  private readonly router = inject(Router);

  private readonly dialog =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly input =
    viewChild.required<ElementRef<HTMLInputElement>>('input');

  protected readonly query = signal('');
  protected readonly active = signal(0);
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  private readonly items = signal<readonly SearchItem[]>([]);
  private readonly recent = signal<readonly RecentEntry[]>(readRecent());

  protected readonly frameworkLabel = computed(
    () =>
      FRAMEWORKS.find((entry) => entry.id === this.framework.framework())
        ?.label ?? '',
  );

  private readonly results = computed<SearchGroup[]>(() => {
    const query = this.query();
    if (!query.trim()) {
      const recent = this.recent().map((entry) => this.toResult(entry));
      return recent.length
        ? [{ kind: 'page', label: 'Recent', results: recent }]
        : [];
    }
    return searchItems(
      this.items(),
      query,
      this.framework.framework(),
      (item) => frameworksOf(item),
    );
  });

  /** Groups with flat option indexes and stable ids for aria wiring. */
  protected readonly groups = computed<RenderedGroup[]>(() => {
    let index = 0;
    return this.results().map((group, groupIndex) => ({
      id: `app-search-group-${groupIndex}`,
      label: group.label,
      rows: group.results.map((result) => {
        const row = { id: `app-search-option-${index}`, index, result };
        index++;
        return row;
      }),
    }));
  });

  protected readonly rows = computed(() =>
    this.groups().flatMap((group) => group.rows),
  );

  protected readonly activeId = computed(
    () => this.rows()[this.active()]?.id ?? null,
  );

  protected readonly status = computed(() => {
    if (this.state() === 'loading') return 'Loading the search index';
    const count = this.rows().length;
    if (!this.query().trim()) {
      return count ? `${count} recent searches` : '';
    }
    return count === 1 ? '1 result' : `${count} results`;
  });

  /** Keeps the native dialog in step with the service's open state. */
  private readonly syncOpen = effect(() => {
    const open = this.search.isOpen();
    untracked(() => (open ? this.show() : this.hide()));
  });

  /** A new result list starts at its first option. */
  private readonly resetActive = effect(() => {
    this.results();
    untracked(() => this.active.set(0));
  });

  /** Keeps the active option scrolled into view. */
  private readonly revealActive = effect(() => {
    const id = this.activeId();
    if (!id) return;
    untracked(() =>
      queueMicrotask(() =>
        this.dialog()
          .nativeElement.querySelector(`#${id}`)
          ?.scrollIntoView({ block: 'nearest' }),
      ),
    );
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.hide());
    loadIndex().then(
      (items) => {
        this.items.set(items);
        this.state.set('ready');
      },
      () => this.state.set('error'),
    );
  }

  private show(): void {
    const dialog = this.dialog().nativeElement;
    if (!dialog.open) dialog.showModal();
    const input = this.input().nativeElement;
    input.focus();
    input.select();
    if (this.state() === 'error') {
      this.state.set('loading');
      loadIndex().then(
        (items) => {
          this.items.set(items);
          this.state.set('ready');
        },
        () => this.state.set('error'),
      );
    }
  }

  private hide(): void {
    const dialog = this.dialog().nativeElement;
    if (dialog.open) dialog.close();
  }

  protected onDialogClose(): void {
    // Escape, a backdrop click or a pick — all end here
    this.search.close();
  }

  protected onCancel(event: Event): void {
    // Escape: close through the service so its state stays the truth
    event.preventDefault();
    this.search.close();
  }

  /** A click on the backdrop lands on the dialog element itself. */
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.search.close();
  }

  protected onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.rows().length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (count) this.active.set((this.active() + 1) % count);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (count) this.active.set((this.active() - 1 + count) % count);
        break;
      case 'Home':
      case 'End':
        // Home/End move the caret unless there is a list to move through
        if (!count || event.shiftKey) return;
        if (!(event.ctrlKey || event.metaKey)) return;
        event.preventDefault();
        this.active.set(event.key === 'Home' ? 0 : count - 1);
        break;
      case 'Enter': {
        const row = this.rows()[this.active()];
        if (!row) return;
        event.preventDefault();
        this.choose(row.result);
        break;
      }
    }
  }

  protected choose(result: SearchResult): void {
    const { item } = result;
    this.remember(item);
    // the next open starts fresh, on the recent list
    this.query.set('');
    const current = this.framework.framework();
    // land on the layer that has it — a React-only member is not on the
    // Angular page, so the switch follows the reader's pick
    const target = result.inFramework
      ? current
      : (result.frameworks[0] ?? current);
    this.search.close();
    if (target !== current) this.framework.set(target);
    void this.router
      .navigateByUrl(resultUrl(item, target))
      .then(() => item.anchor && scrollToAnchor(item.anchor));
  }

  protected icon(result: SearchResult): IconName {
    return KIND_ICON[result.item.kind];
  }

  protected subtitle(result: SearchResult): string {
    const { item } = result;
    if (item.kind === 'page') return item.context || 'Page';
    if (item.kind === 'section') return item.context;
    return `${item.detail} · ${item.context}`;
  }

  protected badge(result: SearchResult): string {
    const labels = result.frameworks.map(
      (id) => FRAMEWORKS.find((entry) => entry.id === id)?.label ?? id,
    );
    return labels.length ? `${labels.join(' & ')} only` : '';
  }

  private toResult(entry: RecentEntry): SearchResult {
    const item: SearchItem = {
      ...entry,
      key: entry.title.toLowerCase(),
      extra: '',
    };
    const frameworks = frameworksOf(item);
    return {
      item,
      score: 0,
      match: null,
      frameworks,
      inFramework: frameworks.includes(this.framework.framework()),
    };
  }

  private remember(item: SearchItem): void {
    const entry: RecentEntry = {
      kind: item.kind,
      title: item.title,
      context: item.context,
      detail: item.detail,
      path: item.path,
      ...(item.anchor ? { anchor: item.anchor } : {}),
      ...(item.framework ? { framework: item.framework } : {}),
    };
    const same = (other: RecentEntry): boolean =>
      other.path === entry.path &&
      other.anchor === entry.anchor &&
      other.title === entry.title;
    const next = [
      entry,
      ...this.recent().filter((other) => !same(other)),
    ].slice(0, RECENT_LIMIT);
    this.recent.set(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // storage blocked (private mode, quota) — the list lives for this visit
    }
  }
}

/** The frameworks an item exists in: its page's coverage, narrowed by its tag. */
function frameworksOf(
  item: Pick<SearchItem, 'path' | 'framework'>,
): readonly DocsFramework[] {
  const page = frameworksOfPage(item.path).map((entry) => entry.id);
  return item.framework ? page.filter((id) => id === item.framework) : page;
}

function readRecent(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is RecentEntry =>
          !!entry &&
          typeof entry.title === 'string' &&
          typeof entry.path === 'string' &&
          entry.path.startsWith('/') &&
          ['page', 'section', 'api', 'token'].includes(entry.kind),
      )
      .slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

/**
 * Scrolls to the picked heading once the page has rendered it — a lazy route
 * or a deferred demo can take a few frames, so poll briefly.
 */
function scrollToAnchor(anchor: string): void {
  const started = performance.now();
  const attempt = (): void => {
    const target = document.getElementById(anchor);
    if (target) {
      target.scrollIntoView({ block: 'start' });
      return;
    }
    if (performance.now() - started < 3000) requestAnimationFrame(attempt);
  };
  requestAnimationFrame(attempt);
}
