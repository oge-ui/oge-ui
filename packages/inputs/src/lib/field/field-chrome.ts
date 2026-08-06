import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { formatPattern } from './error-messages';
import { OGE_INPUT_HOST, type OgeInputCounterState } from './input-host';

/**
 * Internal presentational chrome of every oge editor: label, field container
 * with prefix/rail slots and the subscript region. It has no inputs — it
 * reads the owning editor through `OGE_INPUT_HOST`, so the structure and the
 * rail order (`prefix | input | pending⊻success | copy | reveal | clear |
 * spin | suffix`) are defined exactly once.
 */
@Component({
  selector: 'oge-field-chrome',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'oge-input-field' },
  styleUrl: './field-chrome.scss',
  template: `
    @if (
      host.label() &&
      (host.labelMode() === 'outside' || host.labelMode() === 'static')
    ) {
      <label class="oge-input-label" [id]="host.labelId" [for]="host.inputId">
        {{ host.label() }}
        @if (host.required()) {
          <span class="oge-input-required-mark" aria-hidden="true">*</span>
        }
      </label>
    }
    <div class="oge-input-container">
      <span class="oge-input-prefix"
        ><ng-content select="[ogeInputPrefix]"
      /></span>
      <span class="oge-input-infix">
        @if (host.label() && host.labelMode() === 'floating') {
          <label
            class="oge-input-label oge-input-label-float"
            [id]="host.labelId"
            [for]="host.inputId"
          >
            {{ host.label() }}
            @if (host.required()) {
              <span class="oge-input-required-mark" aria-hidden="true">*</span>
            }
          </label>
        }
        <ng-content />
      </span>
      <span class="oge-input-rail">
        @if (host.pendingVisible()) {
          <svg
            class="oge-input-pending"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M8 1.5 A 6.5 6.5 0 1 1 1.5 8" />
          </svg>
          <span class="oge-input-sr">{{ host.msg().pending }}</span>
        } @else if (host.successVisible()) {
          <svg
            class="oge-input-success"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m3 8.5 3.5 3.5L13 4.5" />
          </svg>
          <span class="oge-input-sr">{{ host.msg().valid }}</span>
        }
        @if (host.copy && host.copy.visible()) {
          <button
            type="button"
            class="oge-input-rail-btn oge-input-copy"
            [class.oge-input-copy-done]="host.copy.copied()"
            [attr.aria-label]="host.msg().copyButton"
            [attr.title]="
              host.copy.copied() ? host.msg().copied : host.msg().copyButton
            "
            (mousedown)="$event.preventDefault()"
            (click)="host.copy.trigger()"
          >
            @if (host.copy.copied()) {
              <svg
                viewBox="0 0 16 16"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="m3 8.5 3.5 3.5L13 4.5" />
              </svg>
            } @else {
              <svg
                viewBox="0 0 16 16"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                aria-hidden="true"
              >
                <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
                <path
                  d="M10.5 5.5v-2a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 3.5V9A1.5 1.5 0 0 0 4 10.5h1.5"
                />
              </svg>
            }
          </button>
        }
        @if (host.reveal && host.reveal.visible()) {
          <button
            type="button"
            class="oge-input-rail-btn oge-input-reveal"
            [attr.aria-label]="host.msg().showPassword"
            [attr.title]="
              host.reveal.active()
                ? host.msg().hidePassword
                : host.msg().showPassword
            "
            [attr.aria-pressed]="host.reveal.active()"
            (mousedown)="$event.preventDefault()"
            (click)="host.reveal.toggle()"
          >
            @if (host.reveal.active()) {
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                <path
                  d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"
                />
                <path
                  d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"
                />
                <line x1="2" y1="2" x2="22" y2="22" />
              </svg>
            } @else {
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            }
          </button>
        }
        @if (host.showClear()) {
          <button
            type="button"
            class="oge-input-rail-btn oge-input-clear"
            tabindex="-1"
            [attr.aria-label]="host.msg().clearButton"
            (mousedown)="$event.preventDefault()"
            (click)="host.clear()"
          >
            <svg
              viewBox="0 0 16 16"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="m4 4 8 8m0-8-8 8" />
            </svg>
          </button>
        }
        @if (host.spin && host.spin.visible()) {
          <span class="oge-input-spin">
            <button
              type="button"
              class="oge-input-spin-btn"
              tabindex="-1"
              [disabled]="!host.spin.canUp()"
              [attr.aria-label]="host.msg().spinIncrement"
              (pointerdown)="host.spin.press(1, $event)"
              (pointerup)="host.spin.release()"
              (pointerleave)="host.spin.release()"
              (pointercancel)="host.spin.release()"
            >
              <svg
                viewBox="0 0 16 16"
                width="10"
                height="10"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="m4 10 4-4 4 4" />
              </svg>
            </button>
            <button
              type="button"
              class="oge-input-spin-btn"
              tabindex="-1"
              [disabled]="!host.spin.canDown()"
              [attr.aria-label]="host.msg().spinDecrement"
              (pointerdown)="host.spin.press(-1, $event)"
              (pointerup)="host.spin.release()"
              (pointerleave)="host.spin.release()"
              (pointercancel)="host.spin.release()"
            >
              <svg
                viewBox="0 0 16 16"
                width="10"
                height="10"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="m4 6 4 4 4-4" />
              </svg>
            </button>
          </span>
        }
        <ng-content select="[ogeInputSuffix]" />
      </span>
    </div>
    @if (host.subscriptSizing() !== 'none') {
      <div
        class="oge-input-subscript"
        [class.oge-input-subscript-fixed]="host.subscriptSizing() === 'fixed'"
      >
        <span class="oge-input-subscript-text" aria-live="polite">
          @if (host.showError() && host.resolvedErrorText(); as errorMessage) {
            <span class="oge-input-error" [id]="host.errorId">{{
              errorMessage
            }}</span>
          } @else if (host.hint(); as hintText) {
            <span class="oge-input-hint" [id]="host.hintId">{{
              hintText
            }}</span>
          }
        </span>
        @if (host.counter(); as counterState) {
          <span
            class="oge-input-counter"
            [class.oge-input-counter-over]="counterState.over"
            [id]="host.counterId"
          >
            <span aria-hidden="true">{{ counterText(counterState) }}</span>
            <span class="oge-input-sr">{{ counterAria(counterState) }}</span>
          </span>
        }
      </div>
    }
    @if (host.copy) {
      <span class="oge-input-sr" aria-live="polite">
        @if (host.copy.copied()) {
          {{ host.msg().copied }}
        }
      </span>
    }
  `,
})
export class OgeFieldChrome {
  protected readonly host = inject(OGE_INPUT_HOST);

  protected counterText(state: OgeInputCounterState): string {
    const messages = this.host.msg();
    return state.max === undefined
      ? formatPattern(messages.counterNoMax, { count: String(state.count) })
      : formatPattern(messages.counter, {
          count: String(state.count),
          max: String(state.max),
        });
  }

  protected counterAria(state: OgeInputCounterState): string {
    const messages = this.host.msg();
    return state.max === undefined
      ? formatPattern(messages.counterAriaNoMax, {
          count: String(state.count),
        })
      : formatPattern(messages.counterAria, {
          count: String(state.count),
          max: String(state.max),
        });
  }
}
