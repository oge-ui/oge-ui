'use client';

import type {
  OgeSpreadsheetReactiveCell,
  OgeSpreadsheetReactivity,
} from '@oge-ui/spreadsheet-engine';

/**
 * React's face of the engine's reactivity contract (ADR 0003): cells are
 * plain closures that ask the component to re-render on a write (React
 * batches the writes of one event into one render); derived values are
 * memoized per write, so each is computed once per change however many
 * places read it — the cost an Angular `computed` pays.
 */
export function createSpreadsheetRxAdapter(
  bump: () => void,
): OgeSpreadsheetReactivity {
  let version = 0;
  return {
    cell<T>(initial: T): OgeSpreadsheetReactiveCell<T> {
      let value = initial;
      const cell = (() => value) as OgeSpreadsheetReactiveCell<T>;
      cell.set = (next) => {
        if (Object.is(value, next)) return;
        value = next;
        version += 1;
        bump();
      };
      return cell;
    },
    derived<T>(compute: () => T): () => T {
      let seen = -1;
      let cached: T;
      return () => {
        if (seen !== version) {
          cached = compute();
          seen = version;
        }
        return cached;
      };
    },
  };
}
