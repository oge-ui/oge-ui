import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

/** One run of a cell: plain text, or `code` written between backticks. */
export interface CellRun {
  readonly code: boolean;
  readonly text: string;
}

/**
 * Splits a cell into text and code runs — `` `provideOgeGridConfig()` `` in a
 * data row renders as inline code. Template-only rendering (no `innerHTML`),
 * so the guides hold under the strict-CSP / Trusted Types run.
 */
export function cellRuns(cell: string): CellRun[] {
  return cell
    .split('`')
    .map((text, index) => ({ code: index % 2 === 1, text }))
    .filter((run) => run.text.length > 0);
}

/**
 * The guides' data table: a caption, column headers and rows whose first cell
 * is the row header. Wrapped in a focusable, labelled scroll region so a wide
 * table scrolls inside itself on a phone instead of widening the page.
 *
 * ```html
 * <app-guide-table caption="Keys" [head]="['Key', 'Action']" [rows]="rows" />
 * ```
 */
@Component({
  selector: 'app-guide-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="my-3 mb-6 overflow-x-auto rounded-lg border border-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 dark:border-gray-800"
      tabindex="0"
      role="region"
      [attr.aria-label]="caption()"
    >
      <table class="api-table !my-0">
        <caption class="sr-only">
          {{
            caption()
          }}
        </caption>
        <thead>
          <tr>
            @for (label of head(); track $index) {
              <th scope="col">{{ label }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of parsed(); track $index) {
            <tr>
              @for (cell of row; track $index; let first = $first) {
                @if (first) {
                  <th scope="row" class="font-medium">
                    @for (run of cell; track $index) {
                      @if (run.code) {
                        <code>{{ run.text }}</code>
                      } @else {
                        {{ run.text }}
                      }
                    }
                  </th>
                } @else {
                  <td>
                    @for (run of cell; track $index) {
                      @if (run.code) {
                        <code>{{ run.text }}</code>
                      } @else {
                        {{ run.text }}
                      }
                    }
                  </td>
                }
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class GuideTable {
  /** Names the table for screen readers and labels its scroll region. */
  readonly caption = input.required<string>();
  readonly head = input.required<readonly string[]>();
  readonly rows = input.required<readonly (readonly string[])[]>();

  protected readonly parsed = computed(() =>
    this.rows().map((row) => row.map(cellRuns)),
  );
}
