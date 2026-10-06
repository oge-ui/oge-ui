import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/overlay/src/lib/action-sheet/** and
 * packages/behavior/src/lib/overlay/action-sheet-core.ts — keep in sync with
 * the source TSDoc when the public API changes.
 */

const ITEM_FIELDS =
  "<code>key?</code>, <code>text</code>, <code>description?</code>, <code>icon?</code> (SVG path data, 24×24, stroked), <code>destructive?</code>, <code>disabled?</code>, <code>group?: 'top' | 'bottom'</code>";

export const OGE_ACTION_SHEET_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'opened',
          type: 'boolean (model)',
          default: 'false',
          description:
            'Two-way open state. A direct <code>false</code> write closes without the <code>closing</code> event (the app already decided); user gestures and <code>close()</code> run it.',
        },
        {
          name: 'items',
          type: 'readonly OgeActionSheetItem[]',
          default: '[]',
          description: `The actions, in order — <code>group: 'bottom'</code> ones render after a divider. Fields: ${ITEM_FIELDS}.`,
        },
        {
          name: 'title',
          type: 'string | undefined',
          description:
            'Heading of the sheet — also its accessible name (<code>aria-labelledby</code>) and the name of the action menu.',
        },
        {
          name: 'description',
          type: 'string | undefined',
          description:
            'Secondary text under the title, referenced by <code>aria-describedby</code>.',
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          description:
            'Accessible name without a <code>title</code>; falls back to the <code>actionSheetLabel</code> message (“Actions”).',
        },
        {
          name: 'showCancel',
          type: 'boolean',
          default: 'true',
          description:
            'Renders the Cancel button after the menu (a separate Tab stop).',
        },
        {
          name: 'cancelText',
          type: 'string | undefined',
          description:
            'Text of the Cancel button; falls back to the <code>actionSheetCancel</code> message.',
        },
        {
          name: 'closeOnBackdropClick',
          type: 'boolean',
          default: 'true',
          description: 'Closes on a press on the shaded backdrop.',
        },
        {
          name: 'closeOnEscape',
          type: 'boolean',
          default: 'true',
          description:
            'Closes on Escape — only while the sheet is the topmost surface on the shared overlay stack.',
        },
        {
          name: 'swipeToClose',
          type: 'boolean',
          default: 'true',
          description:
            'Closes on a swipe down (≥ 72px) from the handle or the header, on the shared pointer gesture.',
        },
        {
          name: 'messages',
          type: 'Partial<OgeOverlayMessages> | undefined',
          description:
            'Per-instance overrides of <code>actionSheetCancel</code> / <code>actionSheetLabel</code>.',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'open()',
          type: '() => Promise<OgeActionSheetResult>',
          description:
            'Opens the sheet (runs the cancelable <code>opening</code>) and resolves with the chosen action, or <code>null</code> when it is dismissed or the open is vetoed.',
        },
        {
          name: 'close()',
          type: '() => void',
          description:
            "Closes the sheet with reason <code>'api'</code> (runs <code>closing</code>).",
        },
        {
          name: 'toggle()',
          type: '() => void',
          description: 'Opens a closed sheet, closes an open one.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'opening',
          type: 'OgeActionSheetOpeningEvent',
          description:
            'Cancelable: the sheet is about to open (<code>open()</code> / <code>toggle()</code>). Set <code>cancel</code> to keep it closed.',
        },
        {
          name: 'closing',
          type: 'OgeActionSheetClosingEvent',
          description:
            "Cancelable: the sheet is about to close — <code>reason</code> (<code>'action'</code>, <code>'cancel'</code>, <code>'escape'</code>, <code>'backdrop'</code>, <code>'swipe'</code>, <code>'api'</code>) and the chosen <code>item</code>.",
        },
        {
          name: 'closed',
          type: 'OgeActionSheetClosedEvent',
          description:
            'The sheet closed — <code>reason</code> and the chosen <code>item</code> (or <code>null</code>). Focus is back on the element focused before it opened.',
        },
        {
          name: 'itemClick',
          type: 'OgeActionSheetItemClickEvent',
          description:
            'An action was chosen (click, Enter or Space) — <code>item</code>, <code>index</code>, <code>event</code>. Set <code>keepOpen</code> to keep the sheet open; disabled actions never fire it.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Templates',
      entries: [
        {
          name: 'OgeActionSheetItemTemplate',
          type: '[ogeActionSheetItemTemplate]',
          description:
            'Structural directive replacing the icon + text of every action. The <code>menuitem</code> button, its keyboard and its disabled / destructive state stay with the sheet, so keep the template non-interactive. Projected content renders between the header and the actions.',
        },
        {
          name: 'OgeActionSheetItemTemplateContext',
          type: '{ $implicit: OgeActionSheetItem; index: number }',
          description: 'Context of the item template.',
        },
      ],
    },
    {
      title: 'Vocabulary',
      entries: [
        {
          name: 'OgeActionSheetItem',
          type: 'interface',
          description: `One action: ${ITEM_FIELDS}.`,
        },
        {
          name: 'OgeActionSheetCloseReason',
          type: "'action' | 'cancel' | 'escape' | 'backdrop' | 'swipe' | 'api'",
          description: 'Why the sheet closed.',
        },
        {
          name: 'OgeActionSheetOpeningEvent',
          type: '{ cancel: boolean }',
          description: 'Payload of <code>opening</code>.',
        },
        {
          name: 'OgeActionSheetClosingEvent',
          type: '{ reason; item: OgeActionSheetItem | null; cancel: boolean }',
          description: 'Payload of <code>closing</code>.',
        },
        {
          name: 'OgeActionSheetClosedEvent',
          type: '{ reason; item: OgeActionSheetItem | null }',
          description: 'Payload of <code>closed</code>.',
        },
        {
          name: 'OgeActionSheetItemClickEvent',
          type: '{ item; index: number; event: Event; keepOpen: boolean }',
          description: 'Payload of <code>itemClick</code>.',
        },
        {
          name: 'OgeActionSheetResult',
          type: 'OgeActionSheetItem | null',
          description: 'What <code>open()</code> resolves with.',
        },
      ],
    },
  ],
};
