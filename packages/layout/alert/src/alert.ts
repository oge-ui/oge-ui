import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  contentChild,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import {
  OGE_ALERT_DISMISS_PATH,
  OGE_ALERT_ICON_PATHS,
  ogeAlertFocusAfterClose,
  ogeAlertRole,
  ogeAlertSeverityLabel,
} from '@oge-ui/behavior';
import { OGE_ALERT_CONFIG, type OgeAlertMessages } from './config';
import { OgeAlertIcon } from './templates';
import type {
  OgeAlertClosedEvent,
  OgeAlertClosingEvent,
  OgeAlertLive,
  OgeAlertSeverity,
  OgeAlertStylingMode,
} from './alert-types';

/**
 * An inline message in the page flow — information, success, a warning or an
 * error — with an optional title, actions and a dismiss button:
 *
 * ```html
 * <oge-alert severity="warning" title="Storage almost full" [dismissible]="true">
 *   You have used 92% of your quota.
 * </oge-alert>
 * ```
 *
 * The role follows the severity (`ogeAlertRole`): `error` / `warning` are
 * `role="alert"` (assertive), `info` / `success` `role="status"` (polite);
 * `live="off"` drops the role for a permanent note. The role stays on the
 * host while the alert is hidden, so showing it again inserts content into an
 * existing live region — which is what makes screen readers announce it. The
 * severity glyph is decoration; a visually hidden prefix ("Warning") carries
 * the meaning, so it never rides on colour alone.
 */
@Component({
  selector: 'oge-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-alert',
    '[class.oge-alert-info]': "resolvedSeverity() === 'info'",
    '[class.oge-alert-success]': "resolvedSeverity() === 'success'",
    '[class.oge-alert-warning]': "resolvedSeverity() === 'warning'",
    '[class.oge-alert-error]': "resolvedSeverity() === 'error'",
    '[class.oge-alert-outlined]': "resolvedStylingMode() === 'outlined'",
    '[class.oge-alert-filled]': "resolvedStylingMode() === 'filled'",
    '[class.oge-alert-no-icon]': '!showIcon()',
    '[attr.role]': 'role()',
    '[attr.aria-label]': 'role() ? (ariaLabel() ?? null) : null',
    '[attr.hidden]': 'visible() ? null : ""',
  },
  styleUrl: './alert.scss',
  template: `
    @if (visible()) {
      @if (showIcon()) {
        <span class="oge-alert-icon" aria-hidden="true">
          <ng-content select="[ogeAlertIcon]" />
          @if (!customIcon()) {
            <svg viewBox="0 0 24 24" width="20" height="20" focusable="false">
              <path [attr.d]="iconPath()" />
            </svg>
          }
        </span>
      }
      <div class="oge-alert-body">
        @if (title()) {
          <div class="oge-alert-title">
            <span class="oge-sr-only">{{ prefix() }} </span>{{ title() }}
          </div>
        }
        <div class="oge-alert-message">
          @if (!title()) {
            <span class="oge-sr-only">{{ prefix() }} </span>
          }
          <ng-content />
        </div>
        <ng-content select="[ogeAlertActions]" />
      </div>
      @if (dismissible()) {
        <button
          type="button"
          class="oge-alert-dismiss"
          [attr.aria-label]="msg().dismiss"
          (click)="dismiss($event)"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            aria-hidden="true"
            focusable="false"
          >
            <path [attr.d]="dismissPath" />
          </svg>
        </button>
      }
    }
  `,
})
export class OgeAlert {
  private readonly config = inject(OGE_ALERT_CONFIG);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Meaning of the message; falls back to the config, then `info`. */
  readonly severity = input<OgeAlertSeverity | undefined>(undefined);
  /** Bold first line above the message. */
  readonly title = input<string | undefined>(undefined);
  /** `soft` (tinted, default), `outlined` or `filled`; falls back to the config. */
  readonly stylingMode = input<OgeAlertStylingMode | undefined>(undefined);
  /** Renders a dismiss button that closes the alert (cancelable `closing`). */
  readonly dismissible = input(false);
  /**
   * Live-region behaviour: `auto` (default) derives `alert` / `status` from
   * the severity, `assertive` / `polite` force one, `off` renders no role.
   */
  readonly live = input<OgeAlertLive>('auto');
  /** Shows the severity glyph (or the projected `[ogeAlertIcon]`). */
  readonly showIcon = input(true);
  /** Accessible name of the live region (only written while it has a role). */
  readonly ariaLabel = input<string | undefined>(undefined);
  /** Whether the alert is shown (two-way). `false` renders nothing. */
  readonly visible = model(true);

  /** The alert is about to close — set `cancel` to keep it. */
  readonly closing = output<OgeAlertClosingEvent>();
  /** The alert closed (`visible` is now `false`). */
  readonly closed = output<OgeAlertClosedEvent>();

  protected readonly customIcon = contentChild(OgeAlertIcon, {
    descendants: false,
  });
  protected readonly dismissPath = OGE_ALERT_DISMISS_PATH;
  protected readonly msg = computed<OgeAlertMessages>(
    () => this.config.messages,
  );
  protected readonly resolvedSeverity = computed<OgeAlertSeverity>(
    () => this.severity() ?? this.config.severity ?? 'info',
  );
  protected readonly resolvedStylingMode = computed<OgeAlertStylingMode>(
    () => this.stylingMode() ?? this.config.stylingMode ?? 'soft',
  );
  protected readonly role = computed(() =>
    ogeAlertRole(this.resolvedSeverity(), this.live()),
  );
  protected readonly iconPath = computed(
    () => OGE_ALERT_ICON_PATHS[this.resolvedSeverity()],
  );
  protected readonly prefix = computed(() =>
    ogeAlertSeverityLabel(this.resolvedSeverity(), this.msg()),
  );

  /** Shows the alert again. */
  show(): void {
    this.visible.set(true);
  }

  /** Runs the cancelable close (`closing` → `closed`), as the dismiss button does. */
  close(): void {
    this.runClose(undefined);
  }

  protected dismiss(event: Event): void {
    this.runClose(event);
  }

  private runClose(event: Event | undefined): void {
    if (!this.visible()) return;
    const closing: OgeAlertClosingEvent = { event, cancel: false };
    this.closing.emit(closing);
    if (closing.cancel) return;
    // computed before the content disappears: afterwards focus is on <body>
    const next = ogeAlertFocusAfterClose(this.host.nativeElement);
    this.visible.set(false);
    this.closed.emit({ event });
    next?.focus();
  }
}
