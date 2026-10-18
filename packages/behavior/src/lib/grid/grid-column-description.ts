import type { OgeDataType, OgeGridResolvedColumn } from './grid-columns';

/**
 * A plain description of one grid column, as `describeColumns()` returns it: what
 * a toolbar, a saved-view editor or the AI assistant needs to know about the
 * column set without reaching into templates or accessors.
 */
export interface OgeGridColumnDescription {
  readonly field: string;
  readonly caption: string;
  readonly dataType: OgeDataType;
  /** Whether the column is shown (the responsive width pass does not count). */
  readonly visible: boolean;
  readonly sortable: boolean;
  readonly filterable: boolean;
  /** Any column with a data field can be grouped by. */
  readonly groupable: boolean;
  /** The lookup's items, when the column declares a lookup. */
  readonly values?: readonly OgeGridColumnDescriptionValue[];
}

/** One allowed value of a lookup column. */
export interface OgeGridColumnDescriptionValue {
  readonly value: string | number | boolean;
  readonly text: string;
}

function inferType(value: unknown): OgeDataType | undefined {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (value instanceof Date) return 'date';
  return undefined;
}

/**
 * Describes the columns of a grid-like component.
 *
 * `all` is every column resolved with hidden ones included (an export pass),
 * in display order; `visibleIds` the ids shown now. Columns without a data
 * field are skipped — nothing can sort, filter or group by them. Auto-derived
 * columns (no declaration, so `dataType` is `'string'`) take their type from
 * `sample`, the first data row, when one is given.
 */
export function ogeDescribeGridColumns<T>(
  all: readonly OgeGridResolvedColumn<T>[],
  visibleIds: ReadonlySet<string>,
  sample?: T,
): OgeGridColumnDescription[] {
  const out: OgeGridColumnDescription[] = [];
  for (const column of all) {
    if (!column.field) continue;
    const inferred =
      column.source === undefined && column.dataType === 'string' && sample
        ? inferType(column.accessor(sample))
        : undefined;
    const values = column.lookupItems
      ?.filter(
        (item): item is { value: string | number | boolean; text: string } =>
          typeof item.value === 'string' ||
          typeof item.value === 'boolean' ||
          (typeof item.value === 'number' && Number.isFinite(item.value)),
      )
      .map((item) => ({ value: item.value, text: item.text }));
    out.push({
      field: column.field,
      caption: column.caption,
      dataType: inferred ?? column.dataType,
      visible: visibleIds.has(column.id),
      sortable: column.sortable,
      filterable: column.filterable,
      groupable: true,
      ...(values?.length ? { values } : {}),
    });
  }
  return out;
}
