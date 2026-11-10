/**
 * Class values as Angular's `[class]` accepts them — shared by every hook
 * that returns classes (grid cell/row class callbacks, conditional formats)
 * and by the part-styling inputs (`panelClass`, `backdropClass`…). Kept in a
 * module of its own, free of imports, so a popover does not pull the grid's
 * formatting code in just to join two class names.
 */

/** What a class hook may return — the shapes Angular's `[class]` accepts. */
export type OgeClassValue =
  | string
  | readonly string[]
  | Readonly<Record<string, boolean | null | undefined>>
  | null
  | undefined;

/**
 * Normalizes a class hook's result into a list of class names: strings split
 * on whitespace, arrays flattened, records keep their truthy keys.
 */
export function ogeClassList(value: OgeClassValue): string[] {
  if (!value) return [];
  if (typeof value === 'string') return value.split(/\s+/).filter(Boolean);
  if (Array.isArray(value))
    return (value as readonly string[]).flatMap((entry) =>
      typeof entry === 'string' ? entry.split(/\s+/).filter(Boolean) : [],
    );
  return Object.entries(value)
    .filter(([, on]) => !!on)
    .map(([name]) => name);
}
