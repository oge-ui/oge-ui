import type { ApiGroup, ApiSections } from '../../shared/api-reference';
import {
  SIMPLE_TABLE_CONFIG_TYPES,
  SIMPLE_TABLE_GROUPS,
  SIMPLE_TABLE_VOCABULARY,
} from '../layout/simple-table-api-data';

/**
 * Hand-compiled from packages/react/layout/src/lib/simple-table.tsx and the
 * shared core (packages/behavior/src/lib/layout/simple-table-core.ts) — keep
 * in sync with the source TSDoc. Block order mirrors the Angular page so the
 * parity gate can diff the two block by block.
 */

export const OGE_REACT_SIMPLE_TABLE_API: ApiSections = {
  properties: [
    ...SIMPLE_TABLE_GROUPS(true),
    {
      title: 'Render props',
      entries: [
        {
          name: 'renderRow',
          type: '(context: OgeSimpleTableRowRenderContext<T>) => ReactNode',
          description:
            'Returns the whole <code>&lt;tr&gt;</code> of a row with free <code>&lt;td&gt;</code>s; <code>row</code> is typed from <code>value</code>.',
        },
        {
          name: 'renderHeader',
          type: '(context: OgeSimpleTableSectionRenderContext<T>) => ReactNode',
          description:
            'Replaces the header row(s) inside <code>&lt;thead&gt;</code> — grouped headers, <code>colSpan</code>.',
        },
        {
          name: 'renderFooter',
          type: '(context: OgeSimpleTableSectionRenderContext<T>) => ReactNode',
          description: 'Rows of a <code>&lt;tfoot&gt;</code> — totals, notes.',
        },
        {
          name: 'renderEmpty',
          type: '() => ReactNode',
          description:
            'Content of the full-width cell shown when <code>value</code> is empty (default: the <code>noData</code> message).',
        },
        {
          name: 'className',
          type: 'string',
          description: 'Extra classes on the host element.',
        },
        {
          name: 'style',
          type: 'CSSProperties',
          description: 'Inline style of the host element.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Ref handle (OgeSimpleTableHandle)',
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
          name: 'onPageIndexChange',
          type: '(pageIndex: number) => void',
          description:
            'The page the pager (or <code>goToPage</code>) moved to — the controlled half of <code>pageIndex</code>.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Component types',
      entries: [
        {
          name: 'OgeSimpleTableProps',
          type: 'interface',
          description:
            'Props of <code>&lt;OgeSimpleTable&gt;</code> (generic over the row type).',
        },
        {
          name: 'OgeSimpleTableHandle',
          type: '{ goToPage }',
          description: 'The ref handle.',
        },
        {
          name: 'OgeSimpleTableRowRenderContext',
          type: '{ row: T; columns: readonly OgeSimpleTableResolvedColumn[]; rowIndex: number }',
          description:
            'Context of <code>renderRow</code>; <code>rowIndex</code> counts in <code>value</code>, not in the page.',
        },
        {
          name: 'OgeSimpleTableSectionRenderContext',
          type: '{ columns: readonly OgeSimpleTableResolvedColumn[]; rows: readonly T[] }',
          description:
            'Context of <code>renderHeader</code> / <code>renderFooter</code>.',
        },
      ],
    },
    SIMPLE_TABLE_VOCABULARY,
  ],
};

const CONFIG_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'OgeSimpleTableConfigProvider',
        type: '(props: { config?: OgeSimpleTableConfigInput; children?: ReactNode }) =&gt; JSX.Element',
        description:
          'Subtree defaults for <code>pageSize</code>, <code>compact</code>, <code>locale</code> and the <code>messages</code> — the React counterpart of <code>provideOgeSimpleTableConfig()</code>.',
      },
      {
        name: 'useOgeSimpleTableConfig()',
        type: '() =&gt; OgeSimpleTableConfig',
        description:
          'Reads the resolved config of the nearest provider, merged over <code>OGE_DEFAULT_SIMPLE_TABLE_CONFIG</code>.',
      },
    ],
  },
];

export const OGE_REACT_SIMPLE_TABLE_CONFIG_API: ApiSections = {
  properties: CONFIG_GROUPS,
  types: [SIMPLE_TABLE_CONFIG_TYPES],
};
