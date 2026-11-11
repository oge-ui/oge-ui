import type { FilterExpr } from '../data/load-options';

/**
 * Rewrites the fields of a filter tree through `map` — how a column's
 * `filterField` sends its filters to the server under another field than the
 * one it displays. Fields the map does not name stay; the input is returned
 * untouched when nothing changes, so memoized load options keep their
 * identity.
 */
export function ogeRemapFilterFields(
  expr: FilterExpr,
  map: Readonly<Record<string, string>>,
): FilterExpr;
export function ogeRemapFilterFields(
  expr: FilterExpr | null | undefined,
  map: Readonly<Record<string, string>>,
): FilterExpr | null | undefined;
export function ogeRemapFilterFields(
  expr: FilterExpr | null | undefined,
  map: Readonly<Record<string, string>>,
): FilterExpr | null | undefined {
  if (!expr) return expr;
  switch (expr.type) {
    case 'and':
    case 'or': {
      const operands = expr.operands.map((operand) =>
        ogeRemapFilterFields(operand, map),
      );
      return operands.every((operand, i) => operand === expr.operands[i])
        ? expr
        : { ...expr, operands };
    }
    case 'not': {
      const operand = ogeRemapFilterFields(expr.operand, map);
      return operand === expr.operand ? expr : { ...expr, operand };
    }
    default: {
      const target = Object.prototype.hasOwnProperty.call(map, expr.field)
        ? map[expr.field]
        : undefined;
      return target && target !== expr.field
        ? { ...expr, field: target }
        : expr;
    }
  }
}
