/**
 * What a server exposes to the grid: the fields a request may name, the
 * column each maps to and how its values compare. Nothing outside the schema
 * ever reaches a query — the schema is the allowlist.
 */

/** How a field's values compare (text folds case and accents). */
export type OgeServerFieldType = 'string' | 'number' | 'date' | 'boolean';

/** One field a request may use. */
export interface OgeServerField {
  /** The column (or SQL expression) behind it. Default: the field name. */
  readonly column?: string;
  /** Default `'string'`. */
  readonly type?: OgeServerFieldType;
  /** Part of the grid's search box. Default: `true` for strings. */
  readonly searchable?: boolean;
  /** May be filtered on. Default `true`. */
  readonly filterable?: boolean;
  /** May be sorted and grouped by. Default `true`. */
  readonly sortable?: boolean;
  /**
   * `column` is a raw SQL expression (`"first_name || ' ' || last_name"`), not
   * an identifier to quote. Written by you, never by a request.
   */
  readonly expression?: boolean;
}

/** The fields of one resource, keyed by the names the grid uses. */
export interface OgeServerSchema {
  readonly fields: Readonly<Record<string, OgeServerField>>;
  /**
   * The key field, appended to every sort so pages are stable (rows with the
   * same sort values never trade places between pages).
   */
  readonly key?: string;
}

/** A request the schema or the limits refuse. */
export class OgeServerError extends Error {
  override readonly name = 'OgeServerError';
  constructor(
    message: string,
    /** HTTP status to answer with: 400 for a bad request. */
    readonly status = 400,
  ) {
    super(message);
  }
}

/** The field, or an {@link OgeServerError} naming it. */
export function ogeSchemaField(
  schema: OgeServerSchema,
  name: string,
  use: 'filter' | 'sort' | 'select' = 'select',
): OgeServerField {
  const field = Object.prototype.hasOwnProperty.call(schema.fields, name)
    ? schema.fields[name]
    : undefined;
  if (!field) throw new OgeServerError(`Unknown field "${name}"`);
  if (use === 'filter' && field.filterable === false) {
    throw new OgeServerError(`Field "${name}" cannot be filtered`);
  }
  if (use === 'sort' && field.sortable === false) {
    throw new OgeServerError(`Field "${name}" cannot be sorted or grouped`);
  }
  return field;
}
