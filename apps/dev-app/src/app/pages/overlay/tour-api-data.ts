import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/overlay/src/lib/tour/** and
 * packages/behavior/src/lib/overlay/tour-core.ts — keep in sync with the
 * source TSDoc when the public API changes.
 */

export const TOUR_STEP_FIELDS =
  "<code>target?</code> (a CSS selector, an element or a function returning one — missing, hidden or absent centers the card), <code>title</code> (the dialog’s name), <code>content?</code> (its description), <code>placement?</code> (an <code>OgePopupPlacement</code>, default <code>'bottom'</code>, flipped to fit), <code>padding?</code> (spotlight padding in px, default 6)";

export const TOUR_BEHAVIOR =
  'Each step dims the page with a spotlight cut around its target, scrolls the target into view (centered; instantly under <code>prefers-reduced-motion</code>, which also stops the spotlight from gliding) and places the card beside it, re-measuring on scroll and resize. The card is a modal <code>role="dialog"</code> (<code>aria-roledescription</code> from <code>tourLabel</code>) with a step counter, Skip, Back and Next — Done on the last step. Focus starts on Next; → / ← move between steps (mirrored in RTL) but never finish the tour; Escape skips; focus returns where it was. A polite status announces “Step 2 of 4: title”.';

export const TOUR_CLOSE_REASONS =
  "<code>'done'</code> (Done on the last step), <code>'skip'</code>, <code>'escape'</code>, <code>'backdrop'</code> or <code>'api'</code>";

export const OGE_TOUR_API: ApiSections = {
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
          type: 'boolean (model)',
          default: 'false',
          description: 'Two-way open state.',
        },
        {
          name: 'step',
          type: 'number (model)',
          default: '0',
          description: 'Two-way index of the shown step, clamped to the steps.',
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
          name: 'stepChange',
          type: 'number',
          description: 'The banana half of <code>[(step)]</code>.',
        },
        {
          name: 'closed',
          type: 'OgeTourClosedEvent',
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
          description: 'Payload of <code>closed</code>.',
        },
        {
          name: 'OgeTourCloseReason',
          type: "'done' | 'skip' | 'escape' | 'backdrop' | 'api'",
          description: 'Why the tour closed.',
        },
      ],
    },
    {
      title: 'Behavior building blocks (@oge-ui/behavior)',
      entries: [
        {
          name: 'ogeTourResolveTarget / ogeTourReveal',
          type: '(target, doc) => Element | null / (element) => void',
          description:
            'The rendered element a step points at; scrolling it into view (reduced-motion aware).',
        },
        {
          name: 'ogeTourSpotlight / ogeTourCardPosition / OgeTourCardPosition',
          type: 'geometry',
          description:
            'The padded, viewport-clipped spotlight rect and the card position beside it (via <code>resolvePopupPosition</code>), or centered.',
        },
        {
          name: 'ogeTourKeyIntent / ogeTourClampStep / ogeTourIsInView',
          type: 'helpers',
          description:
            "→ / ← to <code>'next'</code> / <code>'previous'</code> (RTL-mirrored); the clamped step index; whether a rect is fully visible.",
        },
      ],
    },
  ],
};
