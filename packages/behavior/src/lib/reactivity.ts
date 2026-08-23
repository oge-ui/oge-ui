/**
 * The one contract every framework-free machine in this package uses to hold
 * state (ADR 0001).
 *
 * A machine that needs reactive state does not import a framework's primitive —
 * it asks the caller for these two functions. Angular backs them with
 * `signal()` / `computed()`, React with its own store and a change
 * notification, so the machine's semantics exist once and both render layers
 * run that one copy.
 *
 * It lives in its own module rather than beside the first machine that needed
 * it: the select list, the list virtualizer, the grid models and everything
 * after them share it, and importing infrastructure out of a sibling feature
 * file reads like a dependency that isn't one.
 */

/** A writable reactive cell — callable getter plus `set`. */
export interface OgeReactiveCell<T> {
  (): T;
  set(value: T): void;
}

/** How a machine creates its reactive state — supplied per render layer. */
export interface OgeReactivityAdapter {
  cell<T>(initial: T): OgeReactiveCell<T>;
  derived<T>(compute: () => T): () => T;
}
