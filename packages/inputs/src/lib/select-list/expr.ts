import type {
  OgeSelectBoxDisabledExpr,
  OgeSelectBoxDisplayExpr,
  OgeSelectBoxValueExpr,
} from '../select-box/select-box-types';

/** Resolves a `displayExpr` (field name, function, or none → stringify). */
export function resolveDisplay<TItem>(
  expr: OgeSelectBoxDisplayExpr<TItem> | undefined,
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
  expr: OgeSelectBoxValueExpr<TItem> | undefined,
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
  expr: OgeSelectBoxDisabledExpr<TItem> | undefined,
  item: TItem,
): boolean {
  if (typeof expr === 'function') return expr(item);
  if (typeof expr === 'string') {
    return Boolean((item as Record<string, unknown>)[expr]);
  }
  return false;
}
