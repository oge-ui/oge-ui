import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  inject,
  viewChild,
  type ElementRef,
  type TemplateRef,
} from '@angular/core';
import {
  OGE_DIALOG_ICONS,
  OGE_DIALOG_TRIANGLE_PATH,
  ogeDialogEnterIsPrimary,
  type OgeDialogCore,
  type OgeResolvedDialog,
} from '@oge-ui/behavior';
import { OGE_MODAL_DATA } from './modal-tokens';

/** @internal What `OgeModalService`'s helpers hand their content component. */
export interface OgeDialogContentData {
  readonly dialog: OgeResolvedDialog;
  readonly core: OgeDialogCore;
  /** Per-dialog id prefix (message / field / error ids). */
  readonly id: string;
  readonly icon: TemplateRef<unknown> | null;
}

/**
 * @internal The body of a `confirm()` / `alert()` / `prompt()` dialog: icon,
 * message, the prompt field with its error, and the action row. All
 * decisions come from `@oge-ui/behavior`'s `OgeDialogCore`; this only draws.
 */
@Component({
  selector: 'oge-dialog-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet],
  styleUrl: './dialog.scss',
  host: { class: 'oge-dialog', '(keydown)': 'onKeydown($event)' },
  template: `
    <div class="oge-dialog-body">
      @if (dialog.icon !== 'none') {
        <span
          class="oge-dialog-icon"
          [class]="'oge-dialog-icon-' + (dialog.severity ?? 'info')"
          aria-hidden="true"
        >
          @if (dialog.icon === 'custom' && data.icon) {
            <ng-container [ngTemplateOutlet]="data.icon" />
          } @else {
            <svg viewBox="0 0 16 16" width="22" height="22">
              @if (glyph.frame === 'triangle') {
                <path
                  [attr.d]="trianglePath"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linejoin="round"
                />
              } @else {
                <circle
                  cx="8"
                  cy="8"
                  r="6.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
              }
              @for (d of glyph.paths; track $index) {
                <path
                  [attr.d]="d"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              }
            </svg>
          }
        </span>
      }
      <div class="oge-dialog-text">
        @if (dialog.message) {
          <p class="oge-dialog-message" [id]="data.id + '-message'">
            {{ dialog.message }}
          </p>
        }
        @if (dialog.prompt; as prompt) {
          <div class="oge-dialog-field">
            @if (prompt.label) {
              <label class="oge-dialog-label" [for]="data.id + '-input'">{{
                prompt.label
              }}</label>
            }
            <input
              #field
              class="oge-dialog-input"
              [id]="data.id + '-input'"
              [type]="prompt.inputType"
              [value]="core.value()"
              [attr.placeholder]="prompt.placeholder ?? null"
              [attr.aria-label]="
                prompt.label ? null : (dialog.message ?? dialog.title)
              "
              [attr.aria-required]="prompt.required || null"
              [attr.aria-invalid]="core.error() ? 'true' : null"
              [attr.aria-describedby]="core.error() ? data.id + '-error' : null"
              (input)="core.input($any($event.target).value)"
            />
            @if (core.error(); as error) {
              <p class="oge-dialog-error" [id]="data.id + '-error'">
                {{ error }}
              </p>
            }
          </div>
        }
      </div>
    </div>
    <div class="oge-dialog-actions">
      @if (dialog.cancelText !== null) {
        <button
          type="button"
          class="oge-dialog-button oge-dialog-cancel"
          (click)="core.cancel()"
        >
          {{ dialog.cancelText }}
        </button>
      }
      <button
        type="button"
        class="oge-dialog-button oge-dialog-ok"
        [class.oge-dialog-button-danger]="dialog.danger"
        [attr.aria-disabled]="core.pending() || null"
        (click)="submit()"
      >
        {{ dialog.okText }}
      </button>
    </div>
  `,
})
export class OgeDialogContent {
  protected readonly data = inject(OGE_MODAL_DATA) as OgeDialogContentData;
  protected readonly dialog = this.data.dialog;
  protected readonly core = this.data.core;
  protected readonly glyph = OGE_DIALOG_ICONS[this.dialog.severity ?? 'info'];
  protected readonly trianglePath = OGE_DIALOG_TRIANGLE_PATH;
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  protected submit(): void {
    this.core.submit();
    // a sync validation error sends the user back to the field
    if (this.core.error()) this.field()?.nativeElement.focus();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!ogeDialogEnterIsPrimary(event)) return;
    event.preventDefault();
    this.submit();
  }
}
