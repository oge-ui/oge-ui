import type { ApiSections } from '../../shared/api-reference';
import {
  TOUR_BEHAVIOR,
  TOUR_CLOSE_REASONS,
  TOUR_STEP_FIELDS,
} from '../overlay/tour-api-data';

/**
 * Hand-compiled from packages/react/overlay/src/lib/tour.tsx — keep in sync
 * with the source TSDoc when the public API changes.
 *
 * Block-for-block mirror of `../overlay/tour-api-data.ts`: the two-way models
 * become controlled props with `onXChange` callbacks (and `defaultX` when
 * uncontrolled), the methods a ref handle.
 */
export const OGE_REACT_TOUR_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'steps',
          type: 'readonly OgeTourStep[] (required)',
          description: `The steps, in order. Fields: ${TOUR_STEP_FIELDS}.`,
        },
        {
          name: 'opened',
          type: 'boolean | undefined',
          default: 'false',
          description:
            'Open state (controlled; <code>defaultOpened</code> when uncontrolled).',
        },
        {
          name: 'step',
          type: 'number | undefined',
          default: '0',
          description:
            'Index of the shown step, clamped to the steps (controlled; <code>defaultStep</code> when uncontrolled).',
        },
        {
          name: 'closeOnEscape',
          type: 'boolean',
          default: 'true',
          description: 'Escape skips the tour.',
        },
        {
          name: 'closeOnBackdropClick',
          type: 'boolean',
          default: 'false',
          description:
            'A press on the dimmed page skips the tour. Off by default: a stray click should not lose the user’s place.',
        },
        {
          name: 'showSkip',
          type: 'boolean',
          default: 'true',
          description: 'Renders the Skip button (never on the last step).',
        },
        {
          name: 'messages',
          type: 'Partial<OgeOverlayMessages>',
          description:
            'Per-instance overrides of <code>tourLabel</code>, <code>tourStep</code>, <code>tourNext</code>, <code>tourPrevious</code>, <code>tourSkip</code> and <code>tourDone</code>.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Ref handle (OgeTourHandle)',
      entries: [
        {
          name: 'start(step?)',
          type: '(step?: number) => void',
          description:
            'Opens the tour at <code>step</code> (default the first).',
        },
        {
          name: 'next()',
          type: '() => void',
          description:
            "The next step; on the last one, finishes the tour (<code>'done'</code>).",
        },
        {
          name: 'previous()',
          type: '() => void',
          description: 'The previous step (no-op on the first).',
        },
        {
          name: 'close()',
          type: '() => void',
          description: "Closes the tour (reason <code>'api'</code>).",
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onOpenedChange',
          type: '(opened: boolean) => void',
          description:
            'A button, a key, a dismissal or a method changed the open state.',
        },
        {
          name: 'onStepChange',
          type: '(step: number) => void',
          description: 'A button, a key or a method moved to another step.',
        },
        {
          name: 'onClosed',
          type: '(event: OgeTourClosedEvent) => void',
          description: `The tour closed: <code>{ reason, step }</code> with ${TOUR_CLOSE_REASONS} — store it to show a tour once.`,
        },
      ],
    },
  ],
  types: [
    {
      title: 'Behavior',
      entries: [
        {
          name: 'Spotlight, card & keys',
          type: 'role="dialog"',
          description: TOUR_BEHAVIOR,
        },
      ],
    },
    {
      title: 'Vocabulary',
      entries: [
        {
          name: 'OgeTourStep',
          type: 'interface',
          description: `One step: ${TOUR_STEP_FIELDS}.`,
        },
        {
          name: 'OgeTourClosedEvent',
          type: '{ reason: OgeTourCloseReason; step: number }',
          description: 'Payload of <code>onClosed</code>.',
        },
        {
          name: 'OgeTourCloseReason',
          type: "'done' | 'skip' | 'escape' | 'backdrop' | 'api'",
          description: 'Why the tour closed.',
        },
        {
          name: 'OgeTourProps',
          type: 'interface',
          description: 'The props above.',
        },
        {
          name: 'OgeTourHandle',
          type: '{ start(step?); next(); previous(); close() }',
          description: 'What a <code>ref</code> reaches.',
        },
      ],
    },
  ],
};
