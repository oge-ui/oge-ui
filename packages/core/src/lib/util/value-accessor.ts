import type { RowKey } from '../rows/row-node';

export type ValueAccessor<T = unknown> = (row: T) => unknown;

/**
 * Builds an accessor for a (possibly dotted) field path, e.g. `"customer.name"`.
 * Missing intermediate objects yield `undefined` instead of throwing.
 */
export function createFieldAccessor<T = unknown>(field: string): ValueAccessor<T> {
  if (!field.includes('.')) {
    return (row: T) => (row as Record<string, unknown> | null | undefined)?.[field];
  }
  const path = field.split('.');
  return (row: T) => {
    let value: unknown = row;
    for (const segment of path) {
      if (value == null) return undefined;
      value = (value as Record<string, unknown>)[segment];
    }
    return value;
  };
}

/** Normalizes a key specification (field name or selector function) into a selector function. */
export function resolveKeySelector<T>(
  key: keyof T | ((row: T) => RowKey)
): (row: T) => RowKey {
  if (typeof key === 'function') return key;
  const accessor = createFieldAccessor<T>(String(key));
  return (row: T) => accessor(row) as RowKey;
}
