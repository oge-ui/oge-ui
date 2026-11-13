import type { ApiSections } from '../../shared/api-reference';
import {
  DIFF_HOW,
  DIFF_JSON,
  DIFF_MESSAGES_DOC,
  OGE_DIFF_VIEWER_API,
  OGE_DIFF_VIEWER_CONFIG_API,
} from '../layout/diff-viewer-api-data';

/**
 * Hand-compiled from packages/react/layout/src/lib/diff-viewer.tsx — keep in
 * sync with the source TSDoc when the public API changes.
 *
 * Block-for-block mirror of `../layout/diff-viewer-api-data.ts`: the two-way
 * `mode` becomes a controlled prop with `onModeChange` (and `defaultMode`),
 * the methods a ref handle.
 */
export const OGE_REACT_DIFF_VIEWER_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'oldValue / newValue',
          type: 'unknown',
          default: "''",
          description:
            'The two sides: texts, or with <code>language="json"</code> JSON text or values.',
        },
        {
          name: 'language',
          type: "'text' | 'json'",
          default: "'text'",
          description: DIFF_JSON,
        },
        {
          name: 'mode',
          type: "'split' | 'inline' | undefined",
          default: "'split'",
          description:
            'Side by side, or one column with removed lines above the added ones (controlled; <code>defaultMode</code> when uncontrolled).',
        },
        {
          name: 'context',
          type: 'number | undefined',
          default: 'config ?? 3',
          description:
            'Unchanged lines kept around each change; <code>Infinity</code> folds nothing.',
        },
        {
          name: 'ignoreWhitespace / ignoreCase',
          type: 'boolean',
          default: 'false',
          description:
            'Lines differing only in whitespace, or only in letter case, count as equal.',
        },
        {
          name: 'wordDiff',
          type: 'boolean',
          default: 'true',
          description: 'Highlight the changed words inside changed lines.',
        },
        {
          name: 'sortKeys',
          type: 'boolean',
          default: 'true',
          description: 'JSON: sort object keys before comparing.',
        },
        {
          name: 'toolbar',
          type: 'boolean',
          default: 'true',
          description:
            'The added / removed counts, the layout switch and previous / next change (announced politely).',
        },
        {
          name: 'messages',
          type: 'Partial<OgeDiffViewerMessages>',
          description: 'Per-instance overrides of the config catalog.',
        },
        {
          name: 'className / style',
          type: 'string / CSSProperties',
          description: 'Added to the root <code>.oge-diff-viewer</code>.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Ref handle (OgeDiffViewerHandle)',
      entries: [
        {
          name: 'nextChange() / previousChange()',
          type: '() => void',
          description:
            'Scrolls to the next or previous change (wrapping) and announces “Change 2 of 5”.',
        },
        {
          name: 'diff()',
          type: '() => OgeDiffModel',
          description:
            'What the viewer shows: <code>{ rows, stats: { added, removed, changes }, changes, error }</code>.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onModeChange',
          type: "(mode: 'split' | 'inline') => void",
          description: 'The layout switch was used.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'How it compares',
      entries: [
        { name: 'Lines and words', type: 'Myers O(ND)', description: DIFF_HOW },
      ],
    },
    {
      title: 'Vocabulary',
      entries: [
        {
          name: 'OgeDiffViewerProps',
          type: 'interface',
          description: 'The props above.',
        },
        {
          name: 'OgeDiffViewerHandle',
          type: '{ nextChange(); previousChange(); diff() }',
          description: 'What a <code>ref</code> reaches.',
        },
        ...(OGE_DIFF_VIEWER_API.types?.[1]?.entries ?? []),
      ],
    },
  ],
};

export const OGE_REACT_DIFF_VIEWER_CONFIG_API: ApiSections = {
  properties: [
    {
      title: 'OgeDiffViewerConfigProvider',
      entries: [
        {
          name: 'messages',
          type: 'OgeDiffViewerMessages',
          description: DIFF_MESSAGES_DOC,
        },
        {
          name: 'context',
          type: 'number | undefined',
          description:
            'Default unchanged lines around a change. <code>useOgeDiffViewerConfig()</code> reads the resolved value.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeDiffViewerConfigProvider',
          type: '({ config?, children }) => JSX.Element',
          description: 'Subtree-scoped defaults.',
        },
        {
          name: 'useOgeDiffViewerConfig',
          type: '() => OgeDiffViewerConfig',
          description: 'Reads the resolved config.',
        },
        ...(OGE_DIFF_VIEWER_CONFIG_API.types?.[0]?.entries ?? []).filter(
          (e) =>
            !['provideOgeDiffViewerConfig', 'OGE_DIFF_VIEWER_CONFIG'].includes(
              e.name,
            ),
        ),
      ],
    },
  ],
};
