/**
 * Turns an untrusted request body (or query-string JSON) into checked
 * `LoadOptions`: only schema fields, only known operators, bounded sizes.
 */
import {
  OGE_FILTER_OPERATORS,
  isGroupInterval,
  type FilterExpr,
  type FilterOperator,
  type GroupDescriptor,
  type LoadOptions,
  type SortDescriptor,
  type SummaryDescriptor,
  type SummaryType,
} from '@oge-ui/core';
import { OgeServerError, ogeSchemaField, type OgeServerSchema } from './schema';

/** Bounds on what one request may ask for. */
export interface OgeParseLimits {
  /** Largest page. Default 1000; a missing `take` becomes this. */
  readonly maxTake?: number;
  /** Deepest filter nesting. Default 16. */
  readonly maxFilterDepth?: number;
  /** Most leaves in one filter. Default 200. */
  readonly maxFilterNodes?: number;
  /** Longest `in` / `notin` list. Default 1000. */
  readonly maxListLength?: number;
  /** Longest search or filter text. Default 500 characters. */
  readonly maxTextLength?: number;
}

const OPERATORS = new Set<string>(Object.keys(OGE_FILTER_OPERATORS));
const SUMMARIES = new Set<SummaryType>(['sum', 'avg', 'min', 'max', 'count']);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function int(value: unknown, name: string, min: number): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < min) {
    throw new OgeServerError(`"${name}" must be an integer ≥ ${min}`);
  }
  return n;
}

function bool(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  return value === true || value === 'true';
}

function list(value: unknown, name: string): unknown[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value))
    throw new OgeServerError(`"${name}" must be a list`);
  return value;
}

function dir(value: unknown): 'asc' | 'desc' {
  if (value === undefined || value === 'asc') return 'asc';
  if (value === 'desc') return 'desc';
  throw new OgeServerError('"dir" must be "asc" or "desc"');
}

function scalar(value: unknown, limits: Required<OgeParseLimits>): unknown {
  if (
    value === null ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new OgeServerError('Filter numbers must be finite');
    }
    return value;
  }
  if (typeof value === 'string') {
    if (value.length > limits.maxTextLength) {
      throw new OgeServerError('Filter text is too long');
    }
    return value;
  }
  throw new OgeServerError(
    'Filter values must be text, numbers, booleans or null',
  );
}

/**
 * Checks a request and returns it as `LoadOptions`. Throws
 * {@link OgeServerError} (status 400) for anything the schema or the limits
 * do not allow — answer it as a bad request. Accepts the object or its JSON.
 */
export function ogeParseLoadOptions(
  input: unknown,
  schema: OgeServerSchema,
  limitsInput: OgeParseLimits = {},
): LoadOptions {
  const limits: Required<OgeParseLimits> = {
    maxTake: 1000,
    maxFilterDepth: 16,
    maxFilterNodes: 200,
    maxListLength: 1000,
    maxTextLength: 500,
    ...limitsInput,
  };
  let raw: unknown = input;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      throw new OgeServerError('The load options are not valid JSON');
    }
  }
  if (raw === undefined || raw === null) raw = {};
  if (!isObject(raw))
    throw new OgeServerError('The load options must be an object');

  const take = int(raw['take'], 'take', 0);
  if (take !== undefined && take > limits.maxTake) {
    throw new OgeServerError(`"take" may be at most ${limits.maxTake}`);
  }
  const sort: SortDescriptor[] = list(raw['sort'], 'sort').map((s) => {
    if (!isObject(s) || typeof s['field'] !== 'string') {
      throw new OgeServerError('Each sort needs a field');
    }
    ogeSchemaField(schema, s['field'], 'sort');
    return { field: s['field'], dir: dir(s['dir']) };
  });
  const group: GroupDescriptor[] = list(raw['group'], 'group').map((g) => {
    if (!isObject(g) || typeof g['field'] !== 'string') {
      throw new OgeServerError('Each group needs a field');
    }
    ogeSchemaField(schema, g['field'], 'sort');
    const interval = g['interval'];
    if (interval !== undefined && !isGroupInterval(interval)) {
      throw new OgeServerError(`Unknown group interval "${String(interval)}"`);
    }
    return interval === undefined
      ? { field: g['field'], dir: dir(g['dir']) }
      : { field: g['field'], dir: dir(g['dir']), interval };
  });
  const summaries = (name: string): SummaryDescriptor[] =>
    list(raw && (raw as Record<string, unknown>)[name], name).map((s) => {
      if (!isObject(s) || typeof s['field'] !== 'string') {
        throw new OgeServerError('Each summary needs a field');
      }
      const type = s['type'] as SummaryType;
      if (!SUMMARIES.has(type)) {
        throw new OgeServerError(
          `Summary type "${String(type)}" is not supported`,
        );
      }
      ogeSchemaField(schema, s['field']);
      return { field: s['field'], type };
    });
  let nodes = 0;
  const filter = (value: unknown, depth: number): FilterExpr => {
    if (depth > limits.maxFilterDepth) {
      throw new OgeServerError('The filter is nested too deeply');
    }
    if (!isObject(value))
      throw new OgeServerError('A filter must be an object');
    if (++nodes > limits.maxFilterNodes) {
      throw new OgeServerError('The filter has too many conditions');
    }
    switch (value['type']) {
      case 'and':
      case 'or':
        return {
          type: value['type'],
          operands: list(value['operands'], 'operands').map((o) =>
            filter(o, depth + 1),
          ),
        };
      case 'not':
        return { type: 'not', operand: filter(value['operand'], depth + 1) };
      case 'binary': {
        const field = value['field'];
        const op = value['op'];
        if (typeof field !== 'string')
          throw new OgeServerError('A condition needs a field');
        ogeSchemaField(schema, field, 'filter');
        if (typeof op !== 'string' || !OPERATORS.has(op)) {
          throw new OgeServerError(`Unknown filter operator "${String(op)}"`);
        }
        const operator = op as FilterOperator;
        if (operator === 'in' || operator === 'notin') {
          const items = list(value['value'], 'value');
          if (items.length > limits.maxListLength) {
            throw new OgeServerError('The filter list is too long');
          }
          return {
            type: 'binary',
            field,
            op: operator,
            value: items.map((v) => scalar(v, limits)),
          };
        }
        if (operator === 'between') {
          const range = list(value['value'], 'value');
          if (range.length !== 2) {
            throw new OgeServerError('"between" needs a [from, to] pair');
          }
          return {
            type: 'binary',
            field,
            op: operator,
            value: range.map((v) => scalar(v, limits)),
          };
        }
        if (
          operator === 'isnull' ||
          operator === 'isnotnull' ||
          operator === 'isblank' ||
          operator === 'isnotblank'
        ) {
          return { type: 'binary', field, op: operator };
        }
        return {
          type: 'binary',
          field,
          op: operator,
          value: scalar(value['value'], limits),
        };
      }
      default:
        throw new OgeServerError(
          'A filter type must be binary, and, or or not',
        );
    }
  };
  const searchText = raw['searchText'];
  if (searchText !== undefined && typeof searchText !== 'string') {
    throw new OgeServerError('"searchText" must be text');
  }
  if (
    typeof searchText === 'string' &&
    searchText.length > limits.maxTextLength
  ) {
    throw new OgeServerError('The search text is too long');
  }
  const out: LoadOptions = {
    skip: int(raw['skip'], 'skip', 0),
    take: take ?? limits.maxTake,
    sort,
    group,
    filter:
      raw['filter'] === undefined || raw['filter'] === null
        ? null
        : filter(raw['filter'], 1),
    groupSummary: summaries('groupSummary'),
    totalSummary: summaries('totalSummary'),
    requireTotalCount: bool(raw['requireTotalCount']),
    requireGroupCount: bool(raw['requireGroupCount']),
    searchText: searchText?.trim() || undefined,
  };
  return out;
}
