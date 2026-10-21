/**
 * How the spreadsheet core holds reactive state without importing a
 * framework (ADR 0001 / ADR 0003).
 *
 * Structurally identical to `@oge-ui/behavior`'s `OgeReactivityAdapter` — an
 * adapter written for one satisfies the other. Angular backs it with
 * `signal()` / `computed()`, React with a versioned store.
 */

/** A writable reactive cell — callable getter plus `set`. */
export interface OgeSpreadsheetReactiveCell<T> {
  (): T;
  set(value: T): void;
}

/** How the core creates its reactive state — supplied per render layer. */
export interface OgeSpreadsheetReactivity {
  cell<T>(initial: T): OgeSpreadsheetReactiveCell<T>;
  derived<T>(compute: () => T): () => T;
}

/**
 * Plain closures: no memoization, no notification. What the engine's specs
 * run the core against — proof the core relies on neither framework.
 */
export function createPlainSpreadsheetReactivity(): OgeSpreadsheetReactivity {
  return {
    cell<T>(initial: T): OgeSpreadsheetReactiveCell<T> {
      let value = initial;
      const cell = (() => value) as OgeSpreadsheetReactiveCell<T>;
      cell.set = (next) => {
        value = next;
      };
      return cell;
    },
    derived: (compute) => compute,
  };
}
