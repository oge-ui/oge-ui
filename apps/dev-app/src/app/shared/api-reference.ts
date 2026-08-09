import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { slugify } from './demo-card';
import { Icon } from './icon';

/** One documented member: a property, method, event or supporting type. */
export interface ApiEntry {
  /** Member name — or full signature for methods/functions. */
  name: string;
  /** Type, signature or definition, rendered in code font. */
  type: string;
  /** Default value; omit where a default makes no sense (methods, events). */
  default?: string;
  /** One-line summary, hand-compiled from the source TSDoc. Inline HTML like `<code>` allowed. */
  description: string;
}

/** A titled cluster of entries — e.g. "Common (OgeInputBase)" vs "OgeTextBox". */
export interface ApiGroup {
  title?: string;
  entries: readonly ApiEntry[];
}

/** The four API reference sections. */
export interface ApiSections {
  properties?: readonly ApiGroup[];
  methods?: readonly ApiGroup[];
  events?: readonly ApiGroup[];
  types?: readonly ApiGroup[];
}

interface RenderedSection {
  key: string;
  label: string;
  count: number;
  showDefault: boolean;
  groups: readonly ApiGroup[];
}

const SECTION_ORDER = [
  { key: 'properties', label: 'Properties' },
  { key: 'methods', label: 'Methods' },
  { key: 'events', label: 'Events' },
  { key: 'types', label: 'Types' },
] as const;

/**
 * API reference block: Properties / Methods / Events / Types
 * tables for one component, with a name filter box. Section anchors reuse the
 * demo-card slugifier, so headings can be linked from `app-page-toc`
 * (`#<title>-properties`, `#<title>-methods`, …).
 *
 * ```html
 * <app-api-reference title="OgeButton" selector="oge-button" [sections]="buttonApi" />
 * ```
 */
@Component({
  selector: 'app-api-reference',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="my-10 scroll-mt-20" [id]="anchorBase()">
      <div
        class="mb-1 flex flex-wrap items-center gap-3 border-b border-gray-200 pb-3 dark:border-gray-800"
      >
        <h2
          class="!my-0 text-lg font-semibold text-gray-900 dark:text-gray-100"
        >
          {{ title() }}
        </h2>
        @if (selector(); as sel) {
          <span
            class="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 font-mono text-[11px] text-indigo-700 dark:border-indigo-950 dark:bg-indigo-950/50 dark:text-indigo-300"
          >
            {{ sel }}
          </span>
        }
        <label class="relative ml-auto block">
          <span class="sr-only">Filter {{ title() }} members</span>
          <span
            class="pointer-events-none absolute inset-y-0 left-2 flex items-center text-gray-400"
          >
            <app-icon name="search" [size]="14" />
          </span>
          <input
            type="search"
            class="w-48 rounded-md border border-gray-200 bg-white py-1 pl-7 pr-2 text-[13px] text-gray-700 placeholder:text-gray-400 focus:border-indigo-300 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300 dark:focus:border-indigo-700"
            placeholder="Filter members…"
            [value]="query()"
            (input)="query.set(searchValue($event))"
          />
        </label>
      </div>
      @for (section of visibleSections(); track section.key) {
        <h3 class="scroll-mt-20" [id]="anchorBase() + '-' + section.key">
          {{ section.label }}
          <span class="ml-1 text-[13px] font-normal text-gray-400">{{
            section.count
          }}</span>
        </h3>
        @for (group of section.groups; track $index) {
          @if (group.title) {
            <h4
              class="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
            >
              {{ group.title }}
            </h4>
          }
          <!-- tabindex + role: a keyboard user must be able to scroll an
               overflowing table (axe: scrollable-region-focusable) -->
          <div
            class="overflow-x-auto rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
            tabindex="0"
            role="region"
            [attr.aria-label]="
              title() +
              ' ' +
              section.label +
              (group.title ? ' — ' + group.title : '')
            "
          >
            <table class="api-table">
              <thead>
                <tr>
                  <th class="w-[22%]">Name</th>
                  <th [class]="section.showDefault ? 'w-[30%]' : 'w-[36%]'">
                    Type
                  </th>
                  @if (section.showDefault) {
                    <th class="w-[12%]">Default</th>
                  }
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of group.entries; track entry.name) {
                  <tr>
                    <td>
                      <code>{{ entry.name }}</code>
                    </td>
                    <td>
                      <code
                        class="whitespace-pre-wrap break-words text-[12px]"
                        >{{ entry.type }}</code
                      >
                    </td>
                    @if (section.showDefault) {
                      <td>
                        @if (entry.default !== undefined) {
                          <code>{{ entry.default }}</code>
                        } @else {
                          <span class="text-gray-400">—</span>
                        }
                      </td>
                    }
                    <td [innerHTML]="entry.description"></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
      @if (query() && !visibleSections().length) {
        <p class="text-sm text-gray-500 dark:text-gray-400">
          No members match "{{ query() }}".
        </p>
      }
    </section>
  `,
})
export class ApiReference {
  /** Component or API name this block documents, e.g. `OgeButton`. */
  readonly title = input.required<string>();
  /** Element/attribute selector rendered as a chip, e.g. `oge-button`. */
  readonly selector = input<string | undefined>(undefined);
  /** Hand-compiled member tables (see `ApiSections`). */
  readonly sections = input.required<ApiSections>();

  protected readonly query = signal('');

  protected readonly anchorBase = computed(() => slugify(this.title()));

  protected readonly visibleSections = computed<readonly RenderedSection[]>(
    () => {
      const needle = this.query().trim().toLowerCase();
      const sections = this.sections();
      const result: RenderedSection[] = [];
      for (const { key, label } of SECTION_ORDER) {
        const groups = (sections[key] ?? [])
          .map((group) => ({
            ...group,
            entries: needle
              ? group.entries.filter((entry) =>
                  entry.name.toLowerCase().includes(needle),
                )
              : group.entries,
          }))
          .filter((group) => group.entries.length > 0);
        if (!groups.length) continue;
        const entries = groups.flatMap((group) => group.entries);
        result.push({
          key,
          label,
          count: entries.length,
          showDefault: entries.some((entry) => entry.default !== undefined),
          groups,
        });
      }
      return result;
    },
  );

  protected searchValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
