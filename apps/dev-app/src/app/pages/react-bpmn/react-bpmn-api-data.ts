// The React BPMN API tables — derived from the Angular tables in
// `pages/bpmn/bpmn-api-data.ts` block for block and group for group, so the
// two views read as one page across the switch and the parity gate can diff
// them member for member. Only what genuinely differs by idiom is rewritten
// here: controlled `mode` / `zoom` pairs instead of `model()`, `on`-prefixed
// callbacks instead of outputs, the `ref` handle instead of public methods,
// the overlay sanitizer instead of `[innerHTML]`, and a context provider +
// hook instead of `provideOgeBpmnConfig()` and its DI token. Every other row
// — the keyboard map, the engine surface, the whole configuration — is the
// same shared engine, so it is the same row.
import type {
  ApiEntry,
  ApiGroup,
  ApiSections,
} from '../../shared/api-reference';
import { OGE_BPMN_API, OGE_BPMN_CONFIG_API } from '../bpmn/bpmn-api-data';

/** Replaces the entries named in `patch` (and drops those mapped to `null`). */
function patchEntries(
  entries: readonly ApiEntry[],
  patch: Readonly<Record<string, readonly ApiEntry[] | null>>,
): ApiEntry[] {
  return entries.flatMap((entry) => {
    if (!(entry.name in patch)) return [entry];
    return [...(patch[entry.name] ?? [])];
  });
}

function patchGroups(
  groups: readonly ApiGroup[] | undefined,
  patch: Readonly<Record<string, readonly ApiEntry[] | null>>,
): ApiGroup[] {
  return (groups ?? []).map((group) => ({
    ...group,
    entries: patchEntries(group.entries, patch),
  }));
}

const OVERLAY_SANITIZER =
  'rendered without <code>dangerouslySetInnerHTML</code>: the engine parses it into an allow-listed node tree (the policy Angular&#39;s sanitizing <code>[innerHTML]</code> applies — no scripts, no <code>on*</code> handlers, no inline styles) and <code>href</code>/<code>src</code> go through <code>sanitizeUrl</code> / <code>sanitizeResourceUrl</code>; a link that keeps <code>target</code> always gets <code>rel="noopener noreferrer"</code> and <code>role</code> is dropped';

export const OGE_REACT_BPMN_API: ApiSections = {
  properties: [
    {
      entries: [
        ...patchEntries(OGE_BPMN_API.properties?.[0]?.entries ?? [], {
          mode: [
            {
              name: 'mode',
              type: "'edit' | 'view'",
              description:
                "The UI mode (controlled). <code>'view'</code> locks every mutating surface exactly like <code>readOnly</code>; zoom, pan, search and fullscreen stay available. Pair with <code>onModeChange</code>, or leave uncontrolled with <code>defaultMode</code>.",
            },
            {
              name: 'defaultMode',
              type: "'edit' | 'view'",
              default: "'edit'",
              description:
                'Initial mode when <code>mode</code> is uncontrolled.',
            },
            {
              name: 'onModeChange',
              type: "(mode: 'edit' | 'view') =&gt; void",
              description:
                'The header mode toggle was used — the controlled half of <code>mode</code>.',
            },
          ],
          brandLogoUrl: [
            {
              name: 'brandLogoUrl',
              type: 'string | undefined',
              description:
                'Badge image URL (per instance, or app-wide via <code>&lt;OgeBpmnConfigProvider config={{ brandLogoUrl }}&gt;</code>); unset renders the built-in drawn mark. Data-driven, so it goes through <code>sanitizeResourceUrl</code>.',
            },
          ],
          messages: [
            {
              name: 'messages',
              type: 'Partial&lt;OgeBpmnMessages&gt;',
              default: '{}',
              description:
                'Per-instance message overrides, merged over the <code>&lt;OgeBpmnConfigProvider&gt;</code> defaults.',
            },
          ],
          zoom: [
            {
              name: 'zoom',
              type: 'number',
              description:
                'Zoom factor (controlled); wheel zooming, the header buttons, <code>F</code>/<code>+</code>/<code>-</code> and imports report through <code>onZoomChange</code>. Clamped to the configured <code>zoomMin</code>/<code>zoomMax</code>; applied at mount.',
            },
            {
              name: 'defaultZoom',
              type: 'number',
              default: '1',
              description:
                'Initial zoom when <code>zoom</code> is uncontrolled.',
            },
            {
              name: 'onZoomChange',
              type: '(zoom: number) =&gt; void',
              description:
                'The zoom changed — the controlled half of <code>zoom</code>.',
            },
          ],
        }),
        {
          name: 'className',
          type: 'string',
          description: 'Extra class on the <code>.oge-bpmn-editor</code> host.',
        },
        {
          name: 'style',
          type: 'CSSProperties',
          description:
            'Inline style on the host — give the editor its height here (<code>style={{ height: 480 }}</code>).',
        },
      ],
    },
    ...(OGE_BPMN_API.properties ?? []).slice(1),
  ],
  methods: patchGroups(OGE_BPMN_API.methods, {
    'addOverlay(overlay: OgeBpmnOverlay)': [
      {
        name: 'addOverlay(overlay: OgeBpmnOverlay)',
        type: 'string',
        description: `Attaches an HTML badge to a diagram element and returns a handle for <code>removeOverlay</code>. The badge tracks the element through pan/zoom and model changes; a dangling <code>elementId</code> hides it without removing the registration. The <code>html</code> is ${OVERLAY_SANITIZER}.`,
      },
    ],
  }).map((group, index) =>
    index === 0
      ? {
          ...group,
          title: `${group.title} (on the ref handle, OgeBpmnEditorHandle)`,
        }
      : group,
  ),
  events: (OGE_BPMN_API.events ?? []).map((group) => ({
    ...group,
    entries: group.entries.map((entry) => ({
      ...entry,
      name: `on${entry.name.charAt(0).toUpperCase()}${entry.name.slice(1)}`,
      type: `(event: ${entry.type}) =&gt; void`,
    })),
  })),
  types: [
    ...patchGroups(OGE_BPMN_API.types?.slice(0, 1), {
      OgeBpmnOverlay: [
        {
          name: 'OgeBpmnOverlay',
          type: "{ elementId: string; html: string; position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'; offset?: Point }",
          description: `A programmatic HTML badge attached to a diagram element (process-monitoring overlays), registered via <code>addOverlay()</code>. <code>position</code> picks which corner (or the center) of the element&#39;s bounds the badge anchors to; <code>offset</code> is extra diagram-unit displacement applied before the screen transform. <code>html</code> is ${OVERLAY_SANITIZER}.`,
        },
      ],
    }).map((group) => ({
      ...group,
      entries: [
        {
          name: 'OgeBpmnEditorHandle',
          type: 'interface',
          description:
            'The <code>ref</code> handle: every public method of the Angular editor — import/export, history, selection, navigation and overlays.',
        },
        {
          name: 'OgeBpmnEditorProps',
          type: 'interface',
          description: 'Every prop and callback in the table above.',
        },
        {
          name: 'OgeBpmnEditorMode',
          type: "'edit' | 'view'",
          description: 'The editor mode union.',
        },
        ...group.entries,
      ],
    })),
    ...(OGE_BPMN_API.types ?? []).slice(1),
  ],
};

export const OGE_REACT_BPMN_CONFIG_API: ApiSections = {
  properties: OGE_BPMN_CONFIG_API.properties,
  types: patchGroups(OGE_BPMN_CONFIG_API.types, {
    'provideOgeBpmnConfig(config: OgeBpmnConfigInput)': [
      {
        name: 'OgeBpmnConfigProvider (config: OgeBpmnConfigInput)',
        type: 'component',
        description:
          'Subtree-scoped editor defaults — the React counterpart of <code>provideOgeBpmnConfig()</code>; <code>messages</code> is a partial merged over the built-in English strings, nested providers merge over the outer one, and a new <code>config</code> object re-resolves (switching the UI language is a prop change).',
      },
      {
        name: 'useOgeBpmnConfig()',
        type: 'OgeBpmnConfig',
        description: 'The resolved config for the current subtree.',
      },
    ],
    OgeBpmnConfigInput: [
      {
        name: 'OgeBpmnConfigInput',
        type: 'Partial&lt;OgeBpmnConfig&gt; with Partial&lt;OgeBpmnMessages&gt;',
        description:
          'Shape of the provider&#39;s <code>config</code> prop — the same type the Angular provider takes.',
      },
    ],
    OGE_BPMN_CONFIG: null,
  }),
};
