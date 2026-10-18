import type { GridStateSnapshot } from '@oge-ui/core';
import type { OgeDataType } from '../grid/grid-columns';
import type {
  OgeAiJsonSchema,
  OgeAiMessage,
  OgeAiRequest,
} from './ai-transport';

/**
 * What the grid assistant tells the model about one column — the narrowest
 * contract the feature needs, so the Angular grid, the React grid and a host
 * describing its own columns all fit it.
 *
 * **No row data is ever sent.** The model sees column names, types and — only
 * where the column declares them — its allowed values.
 */
export interface OgeAiGridColumn {
  /** The data field; the only name the model may write back. */
  readonly field: string;
  /** The header text the user knows the column by. */
  readonly caption: string;
  readonly dataType: OgeDataType;
  readonly sortable: boolean;
  readonly filterable: boolean;
  readonly groupable: boolean;
  /** Whether the column is shown now. */
  readonly visible: boolean;
  /**
   * The column's allowed values (a lookup's items). The model may answer with
   * either the value or its text; the text is mapped back to the value.
   */
  readonly values?: readonly OgeAiGridColumnValue[];
  /** Extra meaning for the model ("net amount in EUR, VAT excluded"). */
  readonly description?: string;
}

/** One allowed value of an {@link OgeAiGridColumn}. */
export interface OgeAiGridColumnValue {
  readonly value: string | number | boolean;
  readonly text?: string;
}

/** Which parts of the grid state the assistant may change. */
export interface OgeGridAiCapabilities {
  readonly sort: boolean;
  readonly filter: boolean;
  readonly group: boolean;
  readonly search: boolean;
  readonly columns: boolean;
}

/** Every capability on. */
export const OGE_GRID_AI_ALL_CAPABILITIES: OgeGridAiCapabilities = {
  sort: true,
  filter: true,
  group: true,
  search: true,
  columns: true,
};

/** One earlier exchange, replayed so follow-ups ("now group it by city") work. */
export interface OgeGridAiTurn {
  readonly prompt: string;
  readonly summary: string;
}

/** Input of {@link buildOgeGridAiRequest}. */
export interface OgeGridAiRequestOptions {
  readonly columns: readonly OgeAiGridColumn[];
  /** The grid's current state, so the model edits it instead of starting over. */
  readonly state: GridStateSnapshot;
  readonly capabilities?: OgeGridAiCapabilities;
  /** Earlier exchanges, oldest first. */
  readonly history?: readonly OgeGridAiTurn[];
  /** Host instructions appended to the system prompt (domain vocabulary). */
  readonly instructions?: string;
  /** BCP 47 locale the user writes in; the summary comes back in it. */
  readonly locale?: string;
  /** "Today", for relative dates; the current time by default. */
  readonly now?: Date;
}

const FILTER_OPERATORS = [
  'eq',
  'ne',
  'gt',
  'ge',
  'lt',
  'le',
  'contains',
  'notcontains',
  'startswith',
  'endswith',
  'in',
  'between',
  'isnull',
  'isnotnull',
] as const;

/**
 * JSON Schema of the assistant's reply. Every state key is optional: an
 * omitted key leaves that part of the grid as it is.
 */
export const OGE_GRID_AI_RESPONSE_SCHEMA: OgeAiJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'summary'],
  properties: {
    status: {
      type: 'string',
      enum: ['apply', 'clarify', 'unsupported'],
      description:
        '"apply" to change the grid, "clarify" to ask one question, ' +
        '"unsupported" when the request cannot be done with these columns.',
    },
    summary: {
      type: 'string',
      description:
        'One short sentence in the user language: what changes, the ' +
        'question to ask, or why it is not possible.',
    },
    sort: {
      type: 'array',
      description: 'Replaces the sort order; [] removes sorting.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['field', 'dir'],
        properties: {
          field: { type: 'string' },
          dir: { type: 'string', enum: ['asc', 'desc'] },
        },
      },
    },
    group: {
      type: 'array',
      description: 'Replaces the grouping; [] removes grouping.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['field'],
        properties: {
          field: { type: 'string' },
          dir: { type: 'string', enum: ['asc', 'desc'] },
          interval: {
            description:
              'Date bucket (hour, day, week, month, quarter, year) or a ' +
              'positive number bucket width.',
            anyOf: [
              {
                type: 'string',
                enum: ['hour', 'day', 'week', 'month', 'quarter', 'year'],
              },
              { type: 'number' },
            ],
          },
        },
      },
    },
    filter: {
      description: 'Replaces the assistant filter; null removes it.',
      anyOf: [{ $ref: '#/$defs/expr' }, { type: 'null' }],
    },
    clearOtherFilters: {
      type: 'boolean',
      description:
        'true to also remove the filters the user set in the filter row ' +
        'and header menus.',
    },
    search: {
      type: 'string',
      description: 'Full-text search across columns; "" clears it.',
    },
    hiddenColumns: {
      type: 'array',
      description: 'The complete list of fields to hide; [] shows all.',
      items: { type: 'string' },
    },
  },
  $defs: {
    expr: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'field', 'op'],
          properties: {
            type: { const: 'binary' },
            field: { type: 'string' },
            op: { type: 'string', enum: [...FILTER_OPERATORS] },
            value: {
              description:
                'Number, string, boolean, "YYYY-MM-DD" date, an array for ' +
                '"in", or [from, to] for "between". Omit for isnull/isnotnull.',
            },
          },
        },
        {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'operands'],
          properties: {
            type: { type: 'string', enum: ['and', 'or'] },
            operands: { type: 'array', items: { $ref: '#/$defs/expr' } },
          },
        },
        {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'operand'],
          properties: {
            type: { const: 'not' },
            operand: { $ref: '#/$defs/expr' },
          },
        },
      ],
    },
  },
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** `YYYY-MM-DD` of a local date (never `toISOString`, which is UTC). */
function localIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * JSON replacer writing dates as local `YYYY-MM-DD[THH:mm]`. It reads the raw
 * property from `this`: `JSON.stringify` has already run `Date#toJSON` (UTC)
 * on the `value` it passes.
 */
function stateReplacer(
  this: Record<string, unknown>,
  key: string,
  serialized: unknown,
): unknown {
  const value = this[key];
  return value instanceof Date
    ? value.getHours() || value.getMinutes()
      ? `${localIsoDate(value)}T${pad(value.getHours())}:${pad(value.getMinutes())}`
      : localIsoDate(value)
    : serialized;
}

function describeColumn(column: OgeAiGridColumn): string {
  const abilities = [
    column.sortable ? 'sort' : '',
    column.filterable ? 'filter' : '',
    column.groupable ? 'group' : '',
  ]
    .filter(Boolean)
    .join('/');
  const parts = [
    `- ${column.field} ("${column.caption}", ${column.dataType}` +
      `${abilities ? `, ${abilities}` : ''}` +
      `${column.visible ? '' : ', hidden'})`,
  ];
  if (column.description) parts.push(`: ${column.description}`);
  if (column.values?.length) {
    const values = column.values
      .slice(0, 50)
      .map((v) =>
        v.text !== undefined && v.text !== String(v.value)
          ? `${JSON.stringify(v.value)} = ${JSON.stringify(v.text)}`
          : JSON.stringify(v.value),
      )
      .join(', ');
    parts.push(` values: ${values}`);
  }
  return parts.join('');
}

/** The parts of the state the model edits, in the reply's own vocabulary. */
function currentState(state: GridStateSnapshot): Record<string, unknown> {
  return {
    sort: state.sort ?? [],
    group: state.group ?? [],
    filter: state.filter?.builder ?? null,
    otherFilters:
      (state.filter?.row?.length ?? 0) + (state.filter?.header?.length ?? 0),
    search: state.filter?.searchText ?? '',
    hiddenColumns: state.columns?.hidden ?? [],
  };
}

/**
 * Builds the model request for one grid-assistant prompt: a system prompt
 * with the column catalog, the current state, the reply schema and the rules,
 * then the earlier exchanges and the new prompt.
 */
export function buildOgeGridAiRequest(
  prompt: string,
  options: OgeGridAiRequestOptions,
): OgeAiRequest {
  const caps = options.capabilities ?? OGE_GRID_AI_ALL_CAPABILITIES;
  const allowed = (Object.keys(caps) as (keyof OgeGridAiCapabilities)[])
    .filter((key) => caps[key])
    .join(', ');
  const now = options.now ?? new Date();
  const system = [
    'You control a data grid for the user. Translate their request into a ' +
      'change of the grid state and reply with a single JSON object only — ' +
      'no prose, no Markdown.',
    '',
    'Columns:',
    ...options.columns.map(describeColumn),
    '',
    `Current state: ${JSON.stringify(currentState(options.state), stateReplacer)}`,
    `Today is ${localIsoDate(now)}.` +
      (options.locale ? ` The user's locale is ${options.locale}.` : ''),
    '',
    'Rules:',
    '- Use only the fields listed above, and only for what each allows.',
    `- You may change: ${allowed || 'nothing'}. Never return keys for anything else.`,
    '- Omit every key you do not change; include only what the request asks for.',
    '- "filter" replaces the current "filter" value — combine it with the ' +
      'current one when the user adds a condition.',
    '- Dates are "YYYY-MM-DD"; resolve relative dates ("last month") ' +
      'against today. A date range is "between" with [from, to] inclusive.',
    '- Text matching is case-insensitive; prefer "contains" for partial names.',
    '- For a column with listed values, filter by those values.',
    '- If the request is ambiguous, use status "clarify" and ask one short ' +
      'question in "summary". If no column can satisfy it, use "unsupported".',
    '- Write "summary" in the language the user wrote in.',
    '',
    `Reply schema: ${JSON.stringify(OGE_GRID_AI_RESPONSE_SCHEMA)}`,
    ...(options.instructions?.trim()
      ? ['', 'Additional instructions:', options.instructions.trim()]
      : []),
  ].join('\n');

  const messages: OgeAiMessage[] = [{ role: 'system', content: system }];
  for (const turn of options.history ?? []) {
    messages.push({ role: 'user', content: turn.prompt });
    messages.push({
      role: 'assistant',
      content: JSON.stringify({ status: 'apply', summary: turn.summary }),
    });
  }
  messages.push({ role: 'user', content: prompt });
  return {
    feature: 'grid-assistant',
    messages,
    responseSchema: OGE_GRID_AI_RESPONSE_SCHEMA,
    responseName: 'oge_grid_state_change',
    temperature: 0,
    maxTokens: 1024,
  };
}
