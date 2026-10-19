// Hand-compiled from packages/ai/src/lib/ai-cell/**, packages/react/ai/src/lib/ai-cell.tsx
// and the shared machine in packages/behavior/src/lib/ai/ai-column.ts — keep in
// sync with the source TSDoc. The React table mirrors the Angular one member
// for member (the parity gate diffs them).
import type {
  ApiEntry,
  ApiGroup,
  ApiSections,
} from '../../shared/api-reference';

const CELL_PROPS: ApiEntry[] = [
  {
    name: 'column',
    type: 'OgeAiColumn<T>',
    default: '—',
    description:
      'The column’s shared machine from <code>createOgeAiColumn()</code> — one per column, shared by every cell, so the visible rows batch into a few requests and values are cached per row.',
  },
  {
    name: 'row',
    type: 'T',
    default: '—',
    description:
      'The row this cell shows; the column reads its key (<code>keyField</code>) and its <code>inputs</code> fields.',
  },
];

/** The machine and its options — the same objects in both layers. */
export const OGE_AI_COLUMN_TYPES: readonly ApiGroup[] = [
  {
    title: 'AI column',
    entries: [
      {
        name: 'createOgeAiColumn(options)',
        type: '<T>(options: OgeAiColumnOptions<T>) => OgeAiColumn<T>',
        description:
          'Creates the machine of one AI column. <strong>It sends row data</strong> — exactly the <code>inputs</code> fields of the rows being shown, nothing else.',
      },
      {
        name: 'OgeAiColumn',
        type: 'class OgeAiColumn<T> { options; key(row); request(row); state(key); valueOf(key); values(); fill(rows); refresh(key?); subscribe(key, listener); useTransport(t); destroy() }',
        description:
          'The machine itself (what <code>createOgeAiColumn()</code> returns): queues and batches cell requests, validates replies with <code>coerceOgeAiValue</code> (a choice column accepts only its listed values) and caches them per row key.',
      },
      {
        name: 'OgeAiColumnOptions',
        type: "{ prompt; inputs: readonly string[]; keyField; dataType?: 'string' | 'number' | 'boolean' | 'date'; values?; transport?; batchSize?; maxConcurrent?; maxLength?; instructions? }",
        description:
          '<code>values</code> restricts the answer to listed choices; <code>batchSize</code> (20) rows per request, <code>maxConcurrent</code> (2) requests at once, <code>maxLength</code> (200) characters per string value. Without <code>transport</code> the cells use the provider’s.',
      },
      {
        name: 'OgeAiColumn.request(row) / state(key) / valueOf(key)',
        type: '(row: T) => void · (key: RowKey) => OgeAiCellState · (key: RowKey) => unknown',
        description:
          'Asks for a row once (until refreshed); reads its state (<code>idle</code> · <code>pending</code> · <code>done</code> · <code>error</code>) or its value.',
      },
      {
        name: 'OgeAiColumn.values() / fill(rows)',
        type: '() => ReadonlyMap<RowKey, unknown> · (rows: readonly T[]) => Promise<ReadonlyMap<RowKey, unknown>>',
        description:
          'Every value computed so far, or compute some rows and await them — write them into your data to sort, filter, export or persist.',
      },
      {
        name: 'OgeAiColumn.refresh(key?) / subscribe(key, listener) / destroy()',
        type: '(key?: RowKey) => void · (key, () => void) => () => void · () => void',
        description:
          'Forgets one or all values (shown cells ask again), watches a row, aborts everything.',
      },
      {
        name: 'OgeAiCellMessages',
        type: '{ generating; error; retry; empty; yes; no }',
        description:
          'Under <code>messages.aiCell</code> in the AI config; every <code>@oge-ui/locales</code> pack carries them.',
      },
    ],
  },
];

export const OGE_AI_CELL_API: ApiSections = {
  properties: [
    {
      entries: [
        ...CELL_PROPS,
        {
          name: 'locale',
          type: 'string',
          default: 'undefined',
          description:
            'BCP 47 locale of number and date values; falls back to the config, then <code>LOCALE_ID</code>.',
        },
        {
          name: 'messages',
          type: 'Partial<OgeAiCellMessages>',
          default: 'undefined',
          description:
            'Per-instance string overrides, merged over the catalog.',
        },
      ],
    },
  ],
  types: OGE_AI_COLUMN_TYPES,
};

export const OGE_REACT_AI_CELL_API: ApiSections = {
  properties: [
    {
      entries: [
        ...CELL_PROPS,
        {
          name: 'locale',
          type: 'string',
          default: 'undefined',
          description:
            'BCP 47 locale of number and date values; falls back to the config, then the runtime default.',
        },
        {
          name: 'messages',
          type: 'Partial<OgeAiCellMessages>',
          default: 'undefined',
          description:
            'Per-instance string overrides, merged over the catalog.',
        },
      ],
    },
  ],
  types: OGE_AI_COLUMN_TYPES,
};
