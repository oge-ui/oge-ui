import type { TemplateRef } from '@angular/core';
import type {
  OgeToastBaseOptions,
  OgeToastPromiseBaseOptions,
} from '@oge-ui/behavior';

// The toast vocabulary lives beside the engine in `@oge-ui/behavior` (ADR
// 0001) so the React toast speaks the exact same severities, positions and
// reasons; re-exported so `@oge-ui/overlay` remains the Angular import path.
export type {
  OgeToastSeverity,
  OgeToastPosition,
  OgeToastCloseReason,
  OgeToastAnnounce,
  OgeToastActionEvent,
  OgeToastAction,
  OgeToastClosedEvent,
} from '@oge-ui/behavior';

/** Context of a `template` toast body. */
export interface OgeToastSlotContext<D = unknown> {
  /** Closes the toast (reason `'api'`). */
  $implicit: () => void;
  /** The `data` value the toast was shown with, if any. */
  data?: D;
}

/**
 * Options accepted by `OgeToastService.show()` (and the severity sugar): the
 * shared base options plus the Angular-only template slots.
 */
export interface OgeToastOptions<D = unknown> extends OgeToastBaseOptions<D> {
  /** Replaces the severity icon (the `loading` spinner still wins). */
  icon?: TemplateRef<void>;
  /** Replaces the title/message body; `$implicit` closes the toast. */
  template?: TemplateRef<OgeToastSlotContext<D>>;
}

/**
 * Patch accepted by `OgeToastRef.update()`. Changing `displayTime`, `sticky`
 * or `loading` restarts the auto-dismiss timer; a changed `message`
 * re-announces.
 */
export type OgeToastUpdate<D = unknown> = Partial<
  Omit<OgeToastOptions<D>, 'position' | 'id'>
>;

/** Options of `OgeToastService.promise()`. */
export type OgeToastPromiseOptions<T, D = unknown> = OgeToastPromiseBaseOptions<
  T,
  OgeToastOptions<D>
>;
