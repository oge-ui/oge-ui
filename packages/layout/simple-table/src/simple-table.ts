import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  ViewEncapsulation,
  computed,
  contentChild,
  inject,
  input,
  model,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  OGE_SIMPLE_TABLE_DEFAULT_PAGE_SIZE,
  ogeSimpleTableCellText,
  ogeSimpleTablePage,
  ogeSimpleTablePageInfo,
  resolveOgeSimpleTableColumns,
  type OgeSimpleTableColumn,
  type OgeSimpleTableMessages,
  type OgeSimpleTableResolvedColumn,
} from '@oge-ui/behavior';
import { OGE_SIMPLE_TABLE_CONFIG } from './config';
import {
  OgeSimpleTableEmpty,
  OgeSimpleTableFooter,
  OgeSimpleTableHeader,
  OgeSimpleTableRow,
  type OgeSimpleTableRowContext,
  type OgeSimpleTableSectionContext,
} from './templates';

/**
 * A native `<table>` for small lists with free row markup: write the `<tr>` /
 * `<td>`s of a row in an `ogeSimpleTableRow` template and the header cells
 * keep their alignment with it; turn on `paging` for a previous / next pager.
 * No sorting, filtering, selection or virtualization — use `oge-grid` for
 * those. Without a row template each column's `field` is shown as text.
 *
 * ```html
 * <oge-simple-table [value]="lines" [columns]="columns" caption="Order lines" />
 * ```
 */
@Component({
  selector: 'oge-simple-table',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-simple-table',
    '[class.oge-simple-table-compact]': 'resolvedCompact()',
  },
  styleUrl: './simple-table.scss',
  template: `
    <div
      class="oge-simple-table-scroll"
      [attr.tabindex]="scrollable() ? 0 : null"
      [attr.role]="scrollable() ? 'region' : null"
      [attr.aria-label]="
        scrollable() ? (caption() ?? ariaLabel() ?? null) : null
      "
    >
      <table
        class="oge-simple-table-table"
        [attr.aria-label]="caption() ? null : (ariaLabel() ?? null)"
      >
        @if (caption()) {
          <caption class="oge-simple-table-caption">
            {{
              caption()
            }}
          </caption>
        }
        @if (hasWidths()) {
          <colgroup>
            @for (column of resolvedColumns(); track $index) {
              <col [style.width]="column.width ?? null" />
            }
          </colgroup>
        }
        <thead>
          @if (headerTemplate(); as header) {
            <ng-container
              *ngTemplateOutlet="header.template; context: sectionContext()"
            />
          } @else if (resolvedColumns().length) {
            <tr>
              @for (column of resolvedColumns(); track $index) {
                <th scope="col" [class]="column.cellClass">
                  {{ column.caption }}
                </th>
              }
            </tr>
          }
        </thead>
        <tbody>
          @for (row of pageRows(); track $index) {
            @if (rowTemplate(); as rowTpl) {
              <ng-container
                *ngTemplateOutlet="
                  rowTpl.template;
                  context: rowContext(row, page().start + $index)
                "
              />
            } @else {
              <tr>
                @for (column of resolvedColumns(); track $index) {
                  <td [class]="column.cellClass">
                    {{ cellText(row, column) }}
                  </td>
                }
              </tr>
            }
          } @empty {
            <tr class="oge-simple-table-empty-row">
              <td
                class="oge-simple-table-empty"
                [attr.colspan]="emptyColspan()"
              >
                @if (emptyTemplate(); as empty) {
                  <ng-container *ngTemplateOutlet="empty.template" />
                } @else {
                  {{ msg().noData }}
                }
              </td>
            </tr>
          }
        </tbody>
        @if (footerTemplate(); as footer) {
          <tfoot>
            <ng-container
              *ngTemplateOutlet="footer.template; context: sectionContext()"
            />
          </tfoot>
        }
      </table>
    </div>
    @if (showPager()) {
      <div
        class="oge-simple-table-pager"
        role="group"
        [attr.aria-label]="msg().pager"
      >
        <button
          type="button"
          class="oge-simple-table-page-btn"
          data-oge-simple-table-pager="prev"
          [disabled]="page().pageIndex === 0"
          [attr.aria-label]="msg().previousPage"
          [attr.title]="msg().previousPage"
          (click)="goToPage(page().pageIndex - 1)"
        >
          <svg
            viewBox="0 0 16 16"
            width="12"
            height="12"
            aria-hidden="true"
            focusable="false"
          >
            <path d="m10 3.5-4.5 4.5L10 12.5" />
          </svg>
        </button>
        <span class="oge-simple-table-info" aria-live="polite">{{
          pageInfo()
        }}</span>
        <button
          type="button"
          class="oge-simple-table-page-btn"
          data-oge-simple-table-pager="next"
          [disabled]="page().pageIndex >= page().pageCount - 1"
          [attr.aria-label]="msg().nextPage"
          [attr.title]="msg().nextPage"
          (click)="goToPage(page().pageIndex + 1)"
        >
          <svg
            viewBox="0 0 16 16"
            width="12"
            height="12"
            aria-hidden="true"
            focusable="false"
          >
            <path d="m6 3.5 4.5 4.5L6 12.5" />
          </svg>
        </button>
      </div>
    }
  `,
})
export class OgeSimpleTable<T = unknown> {
  private readonly config = inject(OGE_SIMPLE_TABLE_CONFIG);
  private readonly localeId = inject(LOCALE_ID);

  /** The rows. */
  readonly value = input<readonly T[]>([]);
  /** Header cells and default cells; derived from the first row's keys when unset. */
  readonly columns = input<readonly OgeSimpleTableColumn[] | undefined>(
    undefined,
  );
  /** Shows `pageSize` rows at a time with a previous / next pager. */
  readonly paging = input(false);
  /** Rows per page with `paging`; falls back to the config, then 10. */
  readonly pageSize = input<number | undefined>(undefined);
  /** 0-based page shown (two-way). */
  readonly pageIndex = model(0);
  /** Denser rows (smaller padding); falls back to the config. */
  readonly compact = input<boolean | undefined>(undefined);
  /** Visible `<caption>` naming the table. */
  readonly caption = input<string | undefined>(undefined);
  /** Accessible name when there is no visible caption. */
  readonly ariaLabel = input<string | undefined>(undefined);
  /**
   * Wraps the table in a focusable scroll region, so a wide table scrolls
   * inside itself on a narrow screen. Default `true`.
   */
  readonly scrollable = input(true);
  /** BCP 47 locale of the pager's numbers; falls back to the config, then `LOCALE_ID`. */
  readonly locale = input<string | undefined>(undefined);

  protected readonly rowTemplate = contentChild(OgeSimpleTableRow);
  protected readonly headerTemplate = contentChild(OgeSimpleTableHeader);
  protected readonly footerTemplate = contentChild(OgeSimpleTableFooter);
  protected readonly emptyTemplate = contentChild(OgeSimpleTableEmpty);

  protected readonly msg = computed<OgeSimpleTableMessages>(
    () => this.config.messages,
  );
  protected readonly resolvedCompact = computed(
    () => this.compact() ?? this.config.compact ?? false,
  );
  protected readonly resolvedColumns = computed(() =>
    resolveOgeSimpleTableColumns(this.columns(), this.value()),
  );
  protected readonly hasWidths = computed(() =>
    this.resolvedColumns().some((column) => column.width),
  );
  /** The page actually shown (the requested one, clamped). */
  protected readonly page = computed(() =>
    ogeSimpleTablePage(
      this.value().length,
      this.paging(),
      this.pageSize() ??
        this.config.pageSize ??
        OGE_SIMPLE_TABLE_DEFAULT_PAGE_SIZE,
      this.pageIndex(),
    ),
  );
  protected readonly pageRows = computed(() => {
    const { start, end } = this.page();
    return this.value().slice(start, end);
  });
  protected readonly showPager = computed(
    () => this.paging() && this.page().pageCount > 1,
  );
  protected readonly pageInfo = computed(() =>
    ogeSimpleTablePageInfo(
      this.page(),
      this.value().length,
      this.msg(),
      this.locale() ?? this.config.locale ?? this.localeId,
    ),
  );
  protected readonly emptyColspan = computed(() =>
    Math.max(1, this.resolvedColumns().length),
  );
  protected readonly sectionContext = computed<OgeSimpleTableSectionContext<T>>(
    () => ({ $implicit: this.resolvedColumns(), rows: this.value() }),
  );

  /** Shows a page (clamped into range). */
  goToPage(index: number): void {
    const { pageCount } = this.page();
    this.pageIndex.set(Math.min(Math.max(0, index), pageCount - 1));
  }

  protected rowContext(row: T, rowIndex: number): OgeSimpleTableRowContext<T> {
    return { $implicit: row, columns: this.resolvedColumns(), rowIndex };
  }

  protected cellText(row: T, column: OgeSimpleTableResolvedColumn): string {
    return ogeSimpleTableCellText(row, column);
  }
}
