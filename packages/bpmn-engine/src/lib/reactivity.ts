/**
 * How the editor core holds reactive state without importing a framework
 * (ADR 0001 / ADR 0003).
 *
 * Structurally identical to `@oge-ui/behavior`'s `OgeReactivityAdapter` — an
 * adapter written for one satisfies the other — but declared here so the
 * engine package stays dependency-free. Angular backs it with `signal()` /
 * `computed()`, React with a versioned store that re-renders on write.
 */

/** A writable reactive cell — callable getter plus `set`. */
export interface OgeBpmnReactiveCell<T> {
  (): T;
  set(value: T): void;
}

/** How the core creates its reactive state — supplied per render layer. */
export interface OgeBpmnReactivity {
  cell<T>(initial: T): OgeBpmnReactiveCell<T>;
  derived<T>(compute: () => T): () => T;
}

/**
 * A reactivity with no memoization and no change notification — plain
 * closures. What the engine's own specs run the core against, which proves
 * the core depends on neither framework's caching.
 */
export function createPlainBpmnReactivity(): OgeBpmnReactivity {
  return {
    cell<T>(initial: T): OgeBpmnReactiveCell<T> {
      let value = initial;
      const cell = (() => value) as OgeBpmnReactiveCell<T>;
      cell.set = (next) => {
        value = next;
      };
      return cell;
    },
    derived: (compute) => compute,
  };
}
