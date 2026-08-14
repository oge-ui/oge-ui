/**
 * The select-family expression vocabulary (`displayExpr` / `valueExpr` /
 * `disabledExpr`) and its resolvers — shared by both render layers'
 * select-shaped controls (select box, radio group, tag box…), so a field
 * name and a resolver mean exactly the same thing in either framework.
 */

/** Item → display text: a field name, a function, or none (stringify). */
export type OgeSelectDisplayExpr<TItem> = string | ((item: TItem) => string);

/** Item → committed value: a field name, a function, or none (the item). */
export type OgeSelectValueExpr<TItem> = string | ((item: TItem) => unknown);

/** Item → disabled flag: a field name, a function, or none (enabled). */
export type OgeSelectDisabledExpr<TItem> = string | ((item: TItem) => boolean);

/** Item → image URL rendered before the option text. */
export type OgeSelectImageExpr<TItem> =
  string | ((item: TItem) => string | undefined);

/** Which text the search filter matches: field name(s), a function, or the display text. */
export type OgeSelectSearchExpr<TItem> =
  string | readonly string[] | ((item: TItem) => string);

/** Substring (`contains`, default) or prefix (`startswith`) matching. */
export type OgeSelectSearchMode = 'contains' | 'startswith';

/** Groups flat items under headers: a field name or a label function. */
export type OgeSelectGroupExpr<TItem> = string | ((item: TItem) => string);

/** Lazy items source: invoked on first open; may resolve asynchronously. */
export type OgeSelectItemsFn<TItem> = () =>
  readonly TItem[] | PromiseLike<readonly TItem[]>;

/** Resolves a `displayExpr` (field name, function, or none → stringify). */
export function resolveDisplay<TItem>(
  expr: OgeSelectDisplayExpr<TItem> | undefined,
  item: TItem,
): string {
  if (typeof expr === 'function') return expr(item);
  if (typeof expr === 'string') {
    return String((item as Record<string, unknown>)[expr] ?? '');
  }
  return typeof item === 'string' ? item : String(item ?? '');
}

/** Resolves a `valueExpr` (field name, function, or none → the item itself). */
export function resolveValue<TItem>(
  expr: OgeSelectValueExpr<TItem> | undefined,
  item: TItem,
): unknown {
  if (typeof expr === 'function') return expr(item);
  if (typeof expr === 'string') {
    return (item as Record<string, unknown>)[expr];
  }
  return item;
}

/** Resolves a `disabledExpr` (field name, function, or none → enabled). */
export function resolveDisabled<TItem>(
  expr: OgeSelectDisabledExpr<TItem> | undefined,
  item: TItem,
): boolean {
  if (typeof expr === 'function') return expr(item);
  if (typeof expr === 'string') {
    return Boolean((item as Record<string, unknown>)[expr]);
  }
  return false;
}
