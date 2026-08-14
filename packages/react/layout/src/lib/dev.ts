declare const process: { env?: Record<string, string | undefined> } | undefined;

/**
 * Whether to emit development-only warnings — the React counterpart of the
 * Angular packages' `ngDevMode` guard.
 *
 * Written defensively rather than as a bare `process.env.NODE_ENV` check: the
 * package is consumed from bundlers that inline it, from bundlers that do not,
 * and — since the docs site renders these components inside an Angular build —
 * from toolchains with no `process` shim at all. A bare reference would be a
 * `ReferenceError` there; the `typeof` guard is still statically eliminable.
 *
 * The no-signal default is **false**: a toolchain that defines neither
 * `process` nor `NODE_ENV` behaves like a production build (no warnings)
 * rather than warning forever in someone's shipped app.
 */
export function isDevMode(): boolean {
  return (
    typeof process !== 'undefined' &&
    typeof process.env !== 'undefined' &&
    process.env['NODE_ENV'] === 'development'
  );
}
