import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/layout/diff-viewer/src/** and
 * packages/behavior/src/lib/layout/diff-core.ts — keep in sync with the
 * source TSDoc when the public API changes.
 */

export const DIFF_HOW =
  'A Myers line diff (the shortest edit script); within a changed pair of lines the changed words are highlighted. Unchanged runs fold to <code>context</code> lines around each change and open on a click. Every changed line carries a visually hidden “Added” / “Removed” for screen readers — the colour is never the only signal — and the scroll area takes focus for keyboard scrolling.';

export const DIFF_JSON =
  '<code>language="json"</code> parses JSON text (or takes values) and compares canonical, two-space text with keys sorted (<code>sortKeys</code>), so key order is never a change; <code>diff().changes</code> lists the changed paths (<code>$.items[2].price</code>). A side that is not JSON shows the <code>invalidJson</code> message.';

export const DIFF_MESSAGES_DOC =
  'Every user-facing string: <code>label</code>, <code>oldLabel</code> / <code>newLabel</code> (the column headings), <code>split</code>, <code>inline</code>, <code>previousChange</code>, <code>nextChange</code>, <code>expand</code> (an ICU plural over <code>{count}</code>), <code>stats</code>, <code>changePosition</code> (<code>{index}</code> / <code>{count}</code>), <code>noChanges</code>, <code>invalidJson</code> (<code>{side}</code>, <code>{error}</code>), <code>added</code> and <code>removed</code>. Translated in every <code>&#64;oge-ui/locales</code> pack (<code>layout.diffViewer</code>).';

export const OGE_DIFF_VIEWER_API: ApiSections = {
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
          type: "'split' | 'inline' (model)",
          default: "'split'",
          description:
            'Two-way: side by side, or one column with removed lines above the added ones.',
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
      ],
    },
  ],
  methods: [
    {
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
            'What the viewer shows: <code>{ rows, stats: { added, removed, changes }, changes, error }</code> — a signal in Angular.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'modeChange',
          type: "'split' | 'inline'",
          description: 'The banana half of <code>[(mode)]</code>.',
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
          name: 'OgeDiffModel',
          type: '{ rows; stats; changes; error }',
          description: 'What <code>diff()</code> returns.',
        },
        {
          name: 'OgeDiffRow',
          type: "{ kind: 'line'; old; new; change } | { kind: 'fold'; count; oldLine; newLine }",
          description:
            'A drawn row: a line (a cell per side, with its word segments), or folded unchanged lines.',
        },
        {
          name: 'OgeJsonChange',
          type: "{ path; kind: 'added' | 'removed' | 'changed'; before?; after? }",
          description: 'One changed path of two JSON values.',
        },
        {
          name: 'OgeDiffLanguage',
          type: "'text' | 'json'",
          description: 'What the viewer compares.',
        },
        {
          name: 'ogeDiffModel / ogeJsonChanges',
          type: 'functions (@oge-ui/behavior, re-exported)',
          description:
            'The model without a view (servers, tests, a change log), and the changed paths of two JSON values.',
        },
      ],
    },
    {
      title: 'Behavior building blocks (@oge-ui/behavior)',
      entries: [
        {
          name: 'ogeDiffLines / ogeDiffWords / ogeDiffSplitLines / OgeDiffOp / OgeDiffOptions',
          type: 'functions',
          description:
            'The line diff (runs of equal, deleted and inserted lines), the word diff, the line splitter (any newline style).',
        },
        {
          name: 'ogeDiffRows / OgeDiffRowOptions / OgeDiffCell / OgeDiffSegment',
          type: 'functions',
          description:
            'The rows a split or inline view draws, folds and word highlights included.',
        },
        {
          name: 'ogeDiffStats / ogeJsonDiffText / ogeParseJson',
          type: 'functions',
          description:
            'Counts of added, removed and changed; canonical JSON text; JSON parsing with the error message.',
        },
      ],
    },
  ],
};

export const OGE_DIFF_VIEWER_CONFIG_API: ApiSections = {
  properties: [
    {
      title: 'provideOgeDiffViewerConfig()',
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
            'Default unchanged lines around a change. Pass a function for a live config.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'provideOgeDiffViewerConfig',
          type: '(config: OgeDiffViewerConfigInput | (() => OgeDiffViewerConfigInput)) => Provider',
          description:
            'Application- or component-scoped defaults; a function makes the config live.',
        },
        {
          name: 'OGE_DIFF_VIEWER_CONFIG',
          type: 'InjectionToken<OgeDiffViewerConfig>',
          description: 'The resolved config the viewer injects.',
        },
        {
          name: 'OGE_DEFAULT_DIFF_VIEWER_CONFIG',
          type: 'OgeDiffViewerConfig',
          description: 'The defaults (from <code>&#64;oge-ui/behavior</code>).',
        },
        {
          name: 'OGE_DEFAULT_DIFF_VIEWER_MESSAGES',
          type: 'OgeDiffViewerMessages',
          description: 'The English catalog.',
        },
        {
          name: 'resolveOgeDiffViewerConfig',
          type: '(input?, base?) => OgeDiffViewerConfig',
          description: 'Merges a partial config over a base (the defaults).',
        },
        {
          name: 'OgeDiffViewerConfig',
          type: '{ messages: OgeDiffViewerMessages; context? }',
          description: 'Resolved config shape.',
        },
        {
          name: 'OgeDiffViewerConfigInput',
          type: 'Partial<OgeDiffViewerConfig> with partial messages',
          description: 'What the provider accepts.',
        },
        {
          name: 'OgeDiffViewerMessages',
          type: '{ label; oldLabel; newLabel; split; inline; previousChange; nextChange; expand; stats; changePosition; noChanges; invalidJson; added; removed }',
          description: 'The diff viewer catalog.',
        },
      ],
    },
  ],
};
