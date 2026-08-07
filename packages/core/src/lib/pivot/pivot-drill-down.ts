import type { FilterExpr } from '../data/load-options';
import { intervalRange } from './pivot-interval';
import type { PivotEngine } from './compute-pivot';
import type {
  PivotDrillDownArgs,
  PivotFieldConfig,
  PivotPath,
} from './pivot-types';

/** Raw rows behind one pivot cell (local data). */
export function drillDownRows<T>(
  engine: PivotEngine<T>,
  args: PivotDrillDownArgs,
): T[] {
  return engine.drillDownRows(args.rowPath, args.columnPath);
}

/**
 * Translates an axis path into a serializable filter for remote drill-down:
 * an `and` chain of one condition per path segment. Interval-bucketed fields
 * expand to a range where possible (numeric intervals, `year`); recurring
 * date parts (`quarter`/`month`/`day`/`dayOfWeek`) cannot be expressed as a
 * plain range and yield `null` — the server must apply the interval itself.
 */
export function pathToFilterExpr(
  fields: readonly PivotFieldConfig[],
  path: PivotPath,
): FilterExpr | null {
  const operands: FilterExpr[] = [];
  for (let index = 0; index < path.length; index++) {
    const field = fields[index];
    if (!field) return null;
    const value = path[index];
    if (field.groupInterval === undefined) {
      operands.push(
        value == null
          ? { type: 'binary', field: field.dataField, op: 'isnull' }
          : { type: 'binary', field: field.dataField, op: 'eq', value },
      );
      continue;
    }
    const range = intervalRange(value, field.groupInterval);
    if (!range) return null;
    operands.push({
      type: 'and',
      operands: [
        { type: 'binary', field: field.dataField, op: 'ge', value: range.from },
        { type: 'binary', field: field.dataField, op: 'lt', value: range.to },
      ],
    });
  }
  if (!operands.length) return null;
  return operands.length === 1 ? operands[0] : { type: 'and', operands };
}

/** Combines row + column paths into one drill-down filter. */
export function drillDownFilter(
  rowFields: readonly PivotFieldConfig[],
  columnFields: readonly PivotFieldConfig[],
  args: PivotDrillDownArgs,
): FilterExpr | null {
  const row = pathToFilterExpr(rowFields, args.rowPath);
  const column = pathToFilterExpr(columnFields, args.columnPath);
  if (row && column) return { type: 'and', operands: [row, column] };
  return row ?? column;
}
