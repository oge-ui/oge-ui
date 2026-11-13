import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import {
  ogeDiffModel,
  ogeFormatMessage,
  type OgeDiffCell,
  type OgeDiffLanguage,
  type OgeDiffViewerMessages,
} from '@oge-ui/behavior';
import { OGE_DIFF_VIEWER_CONFIG } from './config';

/**
 * Compares two texts — or two JSON documents — side by side or inline:
 *
 * ```html
 * <oge-diff-viewer [oldValue]="before" [newValue]="after" />
 * <oge-diff-viewer language="json" [oldValue]="config1" [newValue]="config2" mode="inline" />
 * ```
 *
 * A Myers line diff with the changed words highlighted inside changed lines;
 * unchanged runs fold to `context` lines around each change and open on a
 * click. JSON is compared as canonical, key-sorted text, so key order never
 * counts as a change. The toolbar shows the added / removed counts, switches
 * the layout and steps through the changes (announced politely); every line
 * says "Added" or "Removed" to a screen reader, not only by colour.
 */
@Component({
  selector: 'oge-diff-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'oge-diff-viewer-host' },
  styleUrl: './diff-viewer.scss',
  template: `
    <div class="oge-diff-viewer" role="group" [attr.aria-label]="text().label">
      @if (toolbar()) {
        <div class="oge-diff-viewer-toolbar">
          <span class="oge-diff-viewer-stats">
            <span class="oge-diff-viewer-added-count"
              >+{{ diff().stats.added }}</span
            >
            <span class="oge-diff-viewer-removed-count"
              >−{{ diff().stats.removed }}</span
            >
          </span>
          <span class="oge-diff-viewer-group">
            <button
              type="button"
              class="oge-diff-viewer-button oge-diff-viewer-split"
              [attr.aria-pressed]="mode() === 'split'"
              (click)="mode.set('split')"
            >
              {{ text().split }}
            </button>
            <button
              type="button"
              class="oge-diff-viewer-button oge-diff-viewer-inline"
              [attr.aria-pressed]="mode() === 'inline'"
              (click)="mode.set('inline')"
            >
              {{ text().inline }}
            </button>
          </span>
          <span class="oge-diff-viewer-group">
            <button
              type="button"
              class="oge-diff-viewer-button oge-diff-viewer-previous"
              [disabled]="!diff().stats.changes"
              (click)="previousChange()"
            >
              {{ text().previousChange }}
            </button>
            <button
              type="button"
              class="oge-diff-viewer-button oge-diff-viewer-next"
              [disabled]="!diff().stats.changes"
              (click)="nextChange()"
            >
              {{ text().nextChange }}
            </button>
          </span>
          <span class="oge-diff-viewer-position" role="status">{{
            position()
          }}</span>
        </div>
      }
      @if (diff().error; as error) {
        <p class="oge-diff-viewer-message oge-diff-viewer-error">
          {{ errorText() }}
        </p>
      } @else if (!diff().stats.changes) {
        <p class="oge-diff-viewer-message">{{ text().noChanges }}</p>
      }
      @if (diff().rows.length) {
        <div
          #scroller
          class="oge-diff-viewer-scroll"
          tabindex="0"
          [attr.aria-label]="text().label"
        >
          <table
            class="oge-diff-viewer-table"
            [class.oge-diff-viewer-table-inline]="mode() === 'inline'"
          >
            <thead>
              @if (mode() === 'split') {
                <tr>
                  <th scope="col" colspan="2">{{ text().oldLabel }}</th>
                  <th scope="col" colspan="2">{{ text().newLabel }}</th>
                </tr>
              } @else {
                <tr>
                  <th scope="col" class="oge-diff-viewer-number">
                    {{ text().oldLabel }}
                  </th>
                  <th scope="col" class="oge-diff-viewer-number">
                    {{ text().newLabel }}
                  </th>
                  <th scope="col">
                    <span class="oge-diff-viewer-sr">{{ text().label }}</span>
                  </th>
                </tr>
              }
            </thead>
            <tbody>
              @for (row of diff().rows; track row.key) {
                @if (row.kind === 'fold') {
                  <tr class="oge-diff-viewer-fold">
                    <td [attr.colspan]="mode() === 'split' ? 4 : 3">
                      <button
                        type="button"
                        class="oge-diff-viewer-expand"
                        (click)="expand(row.key)"
                      >
                        {{ expandText(row.count) }}
                      </button>
                    </td>
                  </tr>
                } @else if (mode() === 'split') {
                  <tr
                    class="oge-diff-viewer-row"
                    [attr.data-change]="row.change >= 0 ? row.change : null"
                    [class.oge-diff-viewer-current]="
                      row.change >= 0 && row.change === current()
                    "
                  >
                    <td
                      class="oge-diff-viewer-number"
                      [class]="cellClass(row.old)"
                    >
                      {{ row.old?.line }}
                    </td>
                    <td
                      class="oge-diff-viewer-code"
                      [class]="cellClass(row.old)"
                    >
                      @if (row.old; as cell) {
                        <ng-container
                          *ngTemplateOutlet="code; context: { $implicit: cell }"
                        />
                      }
                    </td>
                    <td
                      class="oge-diff-viewer-number"
                      [class]="cellClass(row.new)"
                    >
                      {{ row.new?.line }}
                    </td>
                    <td
                      class="oge-diff-viewer-code"
                      [class]="cellClass(row.new)"
                    >
                      @if (row.new; as cell) {
                        <ng-container
                          *ngTemplateOutlet="code; context: { $implicit: cell }"
                        />
                      }
                    </td>
                  </tr>
                } @else {
                  <tr
                    class="oge-diff-viewer-row"
                    [attr.data-change]="row.change >= 0 ? row.change : null"
                    [class.oge-diff-viewer-current]="
                      row.change >= 0 && row.change === current()
                    "
                  >
                    <td
                      class="oge-diff-viewer-number"
                      [class]="cellClass(row.new ?? row.old)"
                    >
                      {{ row.old?.line }}
                    </td>
                    <td
                      class="oge-diff-viewer-number"
                      [class]="cellClass(row.new ?? row.old)"
                    >
                      {{ row.new?.line }}
                    </td>
                    <td
                      class="oge-diff-viewer-code"
                      [class]="cellClass(row.new ?? row.old)"
                    >
                      <ng-container
                        *ngTemplateOutlet="
                          code;
                          context: {
                            $implicit:
                              row.new && row.old?.kind !== 'delete'
                                ? row.new
                                : row.old,
                          }
                        "
                      />
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      }
    </div>
    <ng-template #code let-cell>
      @if (cell.kind !== 'equal') {
        <span class="oge-diff-viewer-marker" aria-hidden="true">{{
          cell.kind === 'insert' ? '+' : '−'
        }}</span>
        <span class="oge-diff-viewer-sr"
          >{{ cell.kind === 'insert' ? text().added : text().removed }}:
        </span>
      }
      @if (cell.segments) {
        @for (segment of cell.segments; track $index) {
          @if (segment.changed) {
            <mark class="oge-diff-viewer-word">{{ segment.text }}</mark>
          } @else {
            <span>{{ segment.text }}</span>
          }
        }
      } @else {
        <span>{{ cell.text }}</span>
      }
    </ng-template>
  `,
  imports: [NgTemplateOutlet],
})
export class OgeDiffViewer {
  private readonly config = inject(OGE_DIFF_VIEWER_CONFIG);

  /** The old text (or, with `language="json"`, JSON text or a value). */
  readonly oldValue = input<unknown>('');
  /** The new text (or JSON text or a value). */
  readonly newValue = input<unknown>('');
  /** `'text'` (default) or `'json'` — compared as canonical, key-sorted text. */
  readonly language = input<OgeDiffLanguage>('text');
  /** Two-way: `'split'` (side by side, default) or `'inline'`. */
  readonly mode = model<'split' | 'inline'>('split');
  /** Unchanged lines kept around each change (config ?? 3); `Infinity` folds nothing. */
  readonly context = input<number | undefined>(undefined);
  /** Lines differing only in whitespace count as equal. */
  readonly ignoreWhitespace = input(false);
  /** Lines differing only in letter case count as equal. */
  readonly ignoreCase = input(false);
  /** Highlight the changed words inside changed lines (default `true`). */
  readonly wordDiff = input(true);
  /** JSON: sort object keys before comparing (default `true`). */
  readonly sortKeys = input(true);
  /** The toolbar: counts, layout switch, previous / next change (default `true`). */
  readonly toolbar = input(true);
  /** Per-instance message overrides. */
  readonly messages = input<Partial<OgeDiffViewerMessages>>({});

  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private readonly expanded = signal<ReadonlySet<string>>(new Set());
  protected readonly current = signal(-1);

  protected readonly text = computed(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  /** The rows, counts and JSON paths the viewer shows. */
  readonly diff = computed(() =>
    ogeDiffModel(this.oldValue(), this.newValue(), {
      language: this.language(),
      mode: this.mode(),
      context: this.context() ?? this.config.context ?? 3,
      expanded: this.expanded(),
      words: this.wordDiff(),
      sortKeys: this.sortKeys(),
      ignoreWhitespace: this.ignoreWhitespace(),
      ignoreCase: this.ignoreCase(),
    }),
  );

  protected readonly position = computed(() =>
    this.current() >= 0
      ? ogeFormatMessage(this.text().changePosition, {
          index: this.current() + 1,
          count: this.diff().stats.changes,
        })
      : '',
  );

  protected readonly errorText = computed(() => {
    const error = this.diff().error;
    if (!error) return '';
    const t = this.text();
    return ogeFormatMessage(t.invalidJson, {
      side: error.side === 'old' ? t.oldLabel : t.newLabel,
      error: error.message,
    });
  });

  /** Scrolls to the next change (wrapping) and announces it. */
  nextChange(): void {
    this.go(1);
  }

  /** Scrolls to the previous change (wrapping) and announces it. */
  previousChange(): void {
    this.go(-1);
  }

  protected expand(key: string): void {
    this.expanded.update((set) => new Set([...set, key]));
  }

  protected expandText(count: number): string {
    return ogeFormatMessage(this.text().expand, { count });
  }

  protected cellClass(cell: OgeDiffCell | null | undefined): string {
    return cell ? `oge-diff-viewer-${cell.kind}` : 'oge-diff-viewer-empty';
  }

  private go(step: 1 | -1): void {
    const count = this.diff().stats.changes;
    if (!count) return;
    const at = this.current();
    const next =
      at < 0 ? (step > 0 ? 0 : count - 1) : (at + step + count) % count;
    this.current.set(next);
    this.scroller()
      ?.nativeElement.querySelector<HTMLElement>(`[data-change="${next}"]`)
      ?.scrollIntoView?.({ block: 'center' });
  }
}
