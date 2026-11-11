import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/layout/simple-table/src/** and the shared core
 * (packages/behavior/src/lib/layout/simple-table-core.ts) — keep in sync with
 * the source TSDoc when the public API changes.
 */

/** Shared with the React page: the vocabulary both layers export. */
export const SIMPLE_TABLE_VOCABULARY: ApiGroup = {
  title: 'Vocabulary',
  entries: [
    {
      name: 'OgeSimpleTableColumn',
      type: '{ field?: string; caption?: string; align?: OgeSimpleTableAlign; width?: string; cssClass?: string }',
      description:
        'One column: its header cell, and the default cell when no row template is given. <code>field</code> takes dot paths; <code>caption</code> defaults to the field, humanized; <code>width</code> goes on the column’s <code>&lt;col&gt;</code>.',
    },
    {
      name: 'OgeSimpleTableAlign',
      type: "'start' | 'center' | 'end'",
      description:
        'Alignment of a column’s header and cells (logical: <code>end</code> is the left edge in a right-to-left page).',
    },
    {
      name: 'OgeSimpleTableResolvedColumn',
      type: 'OgeSimpleTableColumn & { caption: string; align: OgeSimpleTableAlign; cellClass: string }',
      description:
        'A column as templates receive it. <code>cellClass</code> carries the alignment and <code>cssClass</code>: put it on a <code>&lt;td&gt;</code> of your own row to line it up with its header.',
    },
  ],
};

const DATA_ENTRIES = [
  {
    name: 'value',
    type: 'readonly T[]',
    default: '[]',
    description: 'The rows.',
  },
  {
    name: 'columns',
    type: 'readonly OgeSimpleTableColumn[] | undefined',
    description:
      'Header cells and default cells. Unset: one column per own key of the first row.',
  },
];

const PAGING_ENTRIES = (controlled: boolean) => [
  {
    name: 'paging',
    type: 'boolean',
    default: 'false',
    description:
      'Shows <code>pageSize</code> rows at a time with a previous / next pager and a <code>{from}–{to} of {count}</code> text (announced politely).',
  },
  {
    name: 'pageSize',
    type: 'number | undefined',
    default: 'config ?? 10',
    description: 'Rows per page with <code>paging</code>.',
  },
  {
    name: 'pageIndex',
    type: 'number',
    default: '0',
    description: controlled
      ? '0-based page shown (controlled; <code>defaultPageIndex</code> uncontrolled), clamped into range.'
      : '0-based page shown (two-way <code>[(pageIndex)]</code>), clamped into range.',
  },
];

const PRESENTATION_ENTRIES = [
  {
    name: 'compact',
    type: 'boolean | undefined',
    default: 'config ?? false',
    description: 'Denser rows (4px 8px cell padding instead of the token).',
  },
  {
    name: 'caption',
    type: 'string | undefined',
    description:
      'A visible <code>&lt;caption&gt;</code> — the table’s accessible name.',
  },
  {
    name: 'ariaLabel',
    type: 'string | undefined',
    description: 'The accessible name when there is no visible caption.',
  },
  {
    name: 'scrollable',
    type: 'boolean',
    default: 'true',
    description:
      'Wraps the table in a focusable, labelled scroll region, so a wide table scrolls inside itself on a narrow screen instead of widening the page.',
  },
  {
    name: 'locale',
    type: 'string | undefined',
    description:
      'BCP 47 locale of the pager’s numbers; falls back to the config, then the application locale.',
  },
];

export const SIMPLE_TABLE_GROUPS = (controlled: boolean): ApiGroup[] => [
  { title: 'Data', entries: DATA_ENTRIES },
  { title: 'Paging', entries: PAGING_ENTRIES(controlled) },
  { title: 'Presentation', entries: PRESENTATION_ENTRIES },
];

export const OGE_SIMPLE_TABLE_API: ApiSections = {
  properties: SIMPLE_TABLE_GROUPS(false),
  methods: [
    {
      entries: [
        {
          name: 'goToPage(index)',
          type: '(index: number) => void',
          description: 'Shows a page, clamped into range.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'pageIndexChange',
          type: 'number',
          description: 'The banana half of <code>[(pageIndex)]</code>.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Slots',
      entries: [
        {
          name: 'OgeSimpleTableRow',
          type: '[ogeSimpleTableRow]',
          description:
            'The markup of each row — a whole <code>&lt;tr&gt;</code> with free <code>&lt;td&gt;</code>s. Bind <code>[ogeSimpleTableRowOf]</code> to the same array as <code>value</code> and <code>let-row</code> is typed under <code>strictTemplates</code> (<code>ngTemplateContextGuard</code>).',
        },
        {
          name: 'OgeSimpleTableHeader',
          type: '[ogeSimpleTableHeader]',
          description:
            'Replaces the header row(s) inside <code>&lt;thead&gt;</code> — grouped headers, <code>colspan</code>. Give each <code>&lt;th&gt;</code> a <code>scope</code>.',
        },
        {
          name: 'OgeSimpleTableFooter',
          type: '[ogeSimpleTableFooter]',
          description:
            'Rows of a <code>&lt;tfoot&gt;</code> — totals, notes; <code>let-all="rows"</code> is every row of <code>value</code>.',
        },
        {
          name: 'OgeSimpleTableEmpty',
          type: '[ogeSimpleTableEmpty]',
          description:
            'Content of the full-width cell shown when <code>value</code> is empty (default: the <code>noData</code> message).',
        },
        {
          name: 'OgeSimpleTableRowContext',
          type: '{ $implicit: T; columns: readonly OgeSimpleTableResolvedColumn[]; rowIndex: number }',
          description:
            'Context of the row template; <code>rowIndex</code> counts in <code>value</code>, not in the page.',
        },
        {
          name: 'OgeSimpleTableSectionContext',
          type: '{ $implicit: readonly OgeSimpleTableResolvedColumn[]; rows: readonly T[] }',
          description: 'Context of the header and footer templates.',
        },
      ],
    },
    SIMPLE_TABLE_VOCABULARY,
  ],
};

export const SIMPLE_TABLE_CONFIG_TYPES: ApiGroup = {
  entries: [
    {
      name: 'OgeSimpleTableConfig',
      type: 'interface',
      description:
        'The resolved config (<code>messages</code>, <code>pageSize?</code>, <code>compact?</code>, <code>locale?</code>).',
    },
    {
      name: 'OgeSimpleTableConfigInput',
      type: 'interface',
      description:
        'The partial input both providers accept (messages merged one level deep).',
    },
    {
      name: 'OGE_DEFAULT_SIMPLE_TABLE_CONFIG',
      type: 'OgeSimpleTableConfig',
      description: 'The resolved defaults.',
    },
    {
      name: 'OgeSimpleTableMessages',
      type: 'interface',
      description:
        'Every user-facing string: <code>pager</code> (the pager group’s name), <code>previousPage</code>, <code>nextPage</code>, <code>pageInfo</code> (<code>{from}</code> <code>{to}</code> <code>{count}</code>) and <code>noData</code>. Translated in every <code>@oge-ui/locales</code> pack (<code>layout.simpleTable</code>).',
    },
    {
      name: 'OGE_DEFAULT_SIMPLE_TABLE_MESSAGES',
      type: 'OgeSimpleTableMessages',
      description: 'The English catalog.',
    },
  ],
};

const CONFIG_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'provideOgeSimpleTableConfig(config)',
        type: '(config: OgeSimpleTableConfigInput | (() => OgeSimpleTableConfigInput)) => Provider',
        description:
          'Application- or component-scoped defaults for <code>pageSize</code>, <code>compact</code>, <code>locale</code> and the <code>messages</code>; a function makes them live (switching the UI language without a reload).',
      },
      {
        name: 'OGE_SIMPLE_TABLE_CONFIG',
        type: 'InjectionToken<OgeSimpleTableConfig>',
        description: 'The token behind the provider.',
      },
    ],
  },
];

export const OGE_SIMPLE_TABLE_CONFIG_API: ApiSections = {
  properties: CONFIG_GROUPS,
  types: [SIMPLE_TABLE_CONFIG_TYPES],
};
