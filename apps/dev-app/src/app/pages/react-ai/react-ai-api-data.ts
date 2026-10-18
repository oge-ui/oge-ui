// Hand-compiled from packages/react/ai/src/lib/** and the shared machine in
// packages/behavior/src/lib/ai/** — keep in sync with the source TSDoc.
// Members mirror the Angular table in the same order (the parity gate diffs
// them); the transports and types are the same objects.
import type { ApiSections } from '../../shared/api-reference';
import { OGE_AI_API, OGE_AI_SHARED_TYPES } from '../ai/ai-api-data';

const angular = OGE_AI_API;

export const OGE_REACT_AI_API: ApiSections = {
  properties: [
    {
      title: 'Target and transport',
      entries: [
        {
          name: 'target',
          type: 'OgeGridAssistantTarget | RefObject<OgeGridAssistantTarget | null> | null',
          default: 'undefined',
          description:
            'The grid to drive — the <code>&lt;OgeGrid&gt;</code> ref (<code>target={grid}</code>) or its handle, or any object with <code>state()</code>, <code>applyState()</code> and <code>describeColumns()</code>. A ref is read when a prompt is sent.',
        },
        {
          name: 'transport',
          type: 'OgeAiTransport | null',
          default: 'undefined',
          description:
            'Replaces the transport from <code>&lt;OgeAiConfigProvider&gt;</code> for this assistant. Without either, a request ends in the <code>noTransport</code> error.',
        },
      ],
    },
    {
      title: 'Behaviour (undefined = config)',
      entries: [
        ...(angular.properties?.[1]?.entries ?? []).map((entry) =>
          entry.name === 'locale'
            ? {
                ...entry,
                description:
                  'BCP 47 locale of plurals, passed to the model as the user’s locale; falls back to the config, then the runtime default.',
              }
            : entry,
        ),
        {
          name: 'className / style',
          type: 'string / CSSProperties',
          default: 'undefined',
          description:
            'Added to the root <code>.oge-grid-assistant</code> element.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Ref handle (OgeGridAssistantHandle)',
      entries: angular.methods?.[0]?.entries ?? [],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onApplying',
          type: '(event: OgeGridAssistantApplyingEvent) => void',
          description:
            'A change is about to reach the grid — set <code>cancel</code> to veto it.',
        },
        {
          name: 'onApplied',
          type: '(event: OgeGridAssistantAppliedEvent) => void',
          description:
            'A change was applied: <code>{ prompt, summary, snapshot, previousSnapshot, slices }</code>.',
        },
        {
          name: 'onUndone',
          type: '(event: OgeGridAssistantUndoneEvent) => void',
          description: 'Undo restored the previous state.',
        },
        {
          name: 'onErrorOccurred',
          type: '(event: OgeGridAssistantErrorEvent) => void',
          description:
            'A request failed: <code>"no-transport"</code>, an <code>OgeAiError</code> code, or <code>"invalid-reply"</code>.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Providers',
      entries: [
        {
          name: '<OgeAiConfigProvider config>',
          type: '(props: { config?: OgeAiConfigInput; children }) => JSX.Element',
          description:
            'Sets the transport and the AI defaults for a subtree; nested providers merge over the outer one.',
        },
        {
          name: 'useOgeAiConfig()',
          type: '() => OgeAiConfig',
          description: 'The resolved AI defaults for the current subtree.',
        },
      ],
    },
    ...OGE_AI_SHARED_TYPES,
  ],
};
