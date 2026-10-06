import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/react/overlay/src/lib/action-sheet.tsx — keep
 * in sync with the source TSDoc when the public API changes.
 *
 * Block-for-block mirror of `../overlay/action-sheet-api-data.ts`:
 * `opened` / `defaultOpened` / `onOpenedChange` for the `[(opened)]` model
 * (the modal's naming), `onX` callbacks for the outputs, `renderItem` for
 * `[ogeActionSheetItemTemplate]`, `children` for projected content, and the
 * methods on a `ref` handle.
 */

const ITEM_FIELDS =
  "<code>key?</code>, <code>text</code>, <code>description?</code>, <code>icon?</code> (SVG path data, 24×24, stroked), <code>destructive?</code>, <code>disabled?</code>, <code>group?: 'top' | 'bottom'</code>";

export const OGE_REACT_ACTION_SHEET_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'opened',
          type: 'boolean',
          default: 'false',
          description:
            'Open state (controlled; <code>defaultOpened</code> when uncontrolled). Writing <code>false</code> closes without <code>onClosing</code>.',
        },
        {
          name: 'items',
          type: 'readonly OgeActionSheetItem[]',
          default: '[]',
          description: `The actions, in order — <code>group: 'bottom'</code> ones render after a divider. Fields: ${ITEM_FIELDS}.`,
        },
        {
          name: 'title',
          type: 'string',
          description:
            'Heading of the sheet — also its accessible name and the name of the action menu.',
        },
        {
          name: 'description',
          type: 'string',
          description:
            'Secondary text under the title, referenced by <code>aria-describedby</code>.',
        },
        {
          name: 'ariaLabel',
          type: 'string',
          description:
            'Accessible name without a <code>title</code>; falls back to the <code>actionSheetLabel</code> message.',
        },
        {
          name: 'showCancel',
          type: 'boolean',
          default: 'true',
          description: 'Renders the Cancel button after the menu.',
        },
        {
          name: 'cancelText',
          type: 'string',
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
            'Closes on Escape while the sheet is the topmost overlay surface.',
        },
        {
          name: 'swipeToClose',
          type: 'boolean',
          default: 'true',
          description:
            'Closes on a swipe down (≥ 72px) from the handle or the header.',
        },
        {
          name: 'messages',
          type: 'Partial<OgeOverlayMessages>',
          description:
            'Per-instance overrides of <code>actionSheetCancel</code> / <code>actionSheetLabel</code>.',
        },
        {
          name: 'renderItem',
          type: '(context: OgeActionSheetItemRenderContext) => ReactNode',
          description:
            'Replaces the icon + text of every action (the Angular <code>[ogeActionSheetItemTemplate]</code>).',
        },
        {
          name: 'children',
          type: 'ReactNode',
          description: 'Extra content between the header and the actions.',
        },
        {
          name: 'className',
          type: 'string',
          description: 'Extra classes on the sheet surface.',
        },
        {
          name: 'style',
          type: 'CSSProperties',
          description: 'Inline styles on the sheet surface.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Ref handle (OgeActionSheetHandle)',
      entries: [
        {
          name: 'open()',
          type: '() => Promise<OgeActionSheetResult>',
          description:
            'Opens the sheet (runs <code>onOpening</code>) and resolves with the chosen action, or <code>null</code> when dismissed or vetoed.',
        },
        {
          name: 'close()',
          type: '() => void',
          description:
            "Closes the sheet with reason <code>'api'</code> (runs <code>onClosing</code>).",
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
          name: 'onOpenedChange',
          type: '(opened: boolean) => void',
          description: 'The open state a gesture or a method committed.',
        },
        {
          name: 'onOpening',
          type: '(event: OgeActionSheetOpeningEvent) => void',
          description:
            'Cancelable: the sheet is about to open. Set <code>cancel</code> to keep it closed.',
        },
        {
          name: 'onClosing',
          type: '(event: OgeActionSheetClosingEvent) => void',
          description:
            'Cancelable: the sheet is about to close — <code>reason</code> and the chosen <code>item</code>.',
        },
        {
          name: 'onClosed',
          type: '(event: OgeActionSheetClosedEvent) => void',
          description:
            'The sheet closed — <code>reason</code> and the chosen <code>item</code> (or <code>null</code>); focus is restored.',
        },
        {
          name: 'onItemClick',
          type: '(event: OgeActionSheetItemClickEvent) => void',
          description:
            'An action was chosen; set <code>keepOpen</code> to keep the sheet open.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Render props & handle',
      entries: [
        {
          name: 'OgeActionSheetItemRenderContext',
          type: '{ item: OgeActionSheetItem; index: number }',
          description: 'Context of <code>renderItem</code>.',
        },
        {
          name: 'OgeActionSheetProps',
          type: 'interface',
          description: 'Props of <code>&lt;OgeActionSheet&gt;</code>.',
        },
        {
          name: 'OgeActionSheetHandle',
          type: '{ open(): Promise<OgeActionSheetResult>; close(): void; toggle(): void }',
          description: 'The ref handle.',
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
          description: 'Payload of <code>onOpening</code>.',
        },
        {
          name: 'OgeActionSheetClosingEvent',
          type: '{ reason; item: OgeActionSheetItem | null; cancel: boolean }',
          description: 'Payload of <code>onClosing</code>.',
        },
        {
          name: 'OgeActionSheetClosedEvent',
          type: '{ reason; item: OgeActionSheetItem | null }',
          description: 'Payload of <code>onClosed</code>.',
        },
        {
          name: 'OgeActionSheetItemClickEvent',
          type: '{ item; index: number; event: Event; keepOpen: boolean }',
          description: 'Payload of <code>onItemClick</code>.',
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
