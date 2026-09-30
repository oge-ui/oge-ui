'use client';

import type {
  OgeBpmnReactiveCell,
  OgeBpmnReactivity,
} from '@oge-ui/bpmn-engine';

/**
 * React's face of the engine's reactivity contract (ADR 0003): cells are
 * plain closures that bump a version and ask the component to re-render on
 * write; derived values are memoized per version, so each view model (node
 * views, edge views, the minimap scene) is computed once per render however
 * many places read it — the same "once per change" cost an Angular
 * `computed` pays.
 *
 * The host invalidates at the start of every render as well, because props
 * (which the core reads through closures) can change without a cell write.
 */
export interface OgeBpmnRxAdapter extends OgeBpmnReactivity {
  /** Invalidates every derived value — call once per render. */
  invalidate(): void;
}

export function createBpmnRxAdapter(bump: () => void): OgeBpmnRxAdapter {
  let version = 0;
  return {
    invalidate() {
      version += 1;
    },
    cell<T>(initial: T): OgeBpmnReactiveCell<T> {
      let value = initial;
      const cell = (() => value) as OgeBpmnReactiveCell<T>;
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
