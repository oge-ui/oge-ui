declare const ngDevMode: boolean | undefined;

/**
 * User-supplied veto for a pending state change. Returning (or resolving to)
 * `false` blocks the change; throwing or rejecting is also treated as a veto,
 * so a failed confirmation never silently commits.
 */
export type OgeAsyncGuard = () => boolean | Promise<boolean>;

/** Reactions to a guard verdict, all optional except {@link OgeGuardHandlers.allow}. */
export interface OgeGuardHandlers {
  /** Called once the guard permitted the change. */
  allow(): void;
  /**
   * Called when the guard vetoed. `reason` is `'denied'` for a plain `false`,
   * or `'failed'` when the guard threw or rejected.
   */
  deny?(reason: 'denied' | 'failed'): void;
  /**
   * Called with `true` when an async guard starts and `false` when it settles —
   * drive a pending/spinner state from it. Never called for a sync guard.
   */
  pending?(active: boolean): void;
  /** Label used in the dev-mode warning when the guard throws or rejects. */
  label?: string;
}

/**
 * Runs an optional veto guard and routes the verdict to `handlers`.
 *
 * A missing guard allows immediately, a boolean settles synchronously, and a
 * promise reports through `pending` while in flight. Callers get single-flight
 * behavior by skipping the call while their own pending flag is set — this
 * helper deliberately keeps no state of its own.
 *
 * @example
 * runAsyncGuard(item.expandGuard, {
 *   allow: () => this.commitExpand(item),
 *   pending: (active) => this.setPending(item.id, active),
 *   label: 'oge-accordion expandGuard',
 * });
 */
export function runAsyncGuard(
  guard: OgeAsyncGuard | undefined,
  handlers: OgeGuardHandlers,
): void {
  if (!guard) {
    handlers.allow();
    return;
  }
  let verdict: boolean | Promise<boolean>;
  try {
    verdict = guard();
  } catch {
    failGuard(handlers);
    return;
  }
  if (typeof verdict === 'boolean') {
    if (verdict) handlers.allow();
    else handlers.deny?.('denied');
    return;
  }
  handlers.pending?.(true);
  verdict.then(
    (allowed) => {
      handlers.pending?.(false);
      if (allowed) handlers.allow();
      else handlers.deny?.('denied');
    },
    () => {
      handlers.pending?.(false);
      failGuard(handlers);
    },
  );
}

function failGuard(handlers: OgeGuardHandlers): void {
  handlers.deny?.('failed');
  if (typeof ngDevMode === 'undefined' || ngDevMode) {
    console.warn(
      `[${handlers.label ?? 'oge'}] guard threw or rejected — treating it as a veto.`,
    );
  }
}
