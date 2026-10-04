/**
 * Value helpers the item model and the rule evaluator both need — kept in
 * their own module so neither imports the other.
 */

/** Reads a dot-notation path out of a model object. */
export function readPath(data: unknown, path: string): unknown {
  if (data == null) return undefined;
  let current: unknown = data;
  for (const key of path.split('.')) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** Writes a dot-notation path, cloning every object along the way. */
export function writePath<T extends object>(
  data: T,
  path: string,
  value: unknown,
): T {
  const keys = path.split('.');
  const head = keys[0] as keyof T & string;
  if (keys.length === 1) return { ...data, [head]: value };
  const child = (data as Record<string, unknown>)[head];
  const nested =
    child != null && typeof child === 'object'
      ? (child as Record<string, unknown>)
      : {};
  return {
    ...data,
    [head]: writePath(nested, keys.slice(1).join('.'), value),
  };
}

/**
 * Whether a value counts as "not filled in". Only `required` looks at this —
 * every other rule passes an empty field, so a form does not shout about
 * format before anything has been typed.
 */
export function isEmptyFormValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) {
    return value.length === 0 || value.every((entry) => entry == null);
  }
  return false;
}
