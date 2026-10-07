import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/react/overlay/src/lib/testing/** — the React
 * Testing Library counterpart of `OgeModalHarness`, with the same member
 * names (`docs-tools:parity` compares them). Reads are synchronous; actions
 * fire act-wrapped events, so an async close guard is asserted with
 * `await waitFor(…)`.
 */
export const OGE_REACT_MODAL_TESTING_API: ApiSections = {
  properties: [
    {
      title: 'Queries object',
      entries: [
        {
          name: 'element',
          type: 'HTMLElement',
          description:
            'The dialog panel (<code>.oge-modal</code>) — scope content queries with <code>within(modal.element)</code>.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Finding the modal',
      entries: [
        {
          name: 'getModal(container?: HTMLElement, filters?: OgeModalQueryFilters)',
          type: 'OgeModalQueries',
          description:
            'The one open modal in the container (default <code>document.body</code>, where <code>useOgeModals()</code> renders its dialogs); throws on none or several. <code>filters.title</code> is a string or RegExp. A closed React modal renders nothing, so only open ones are found. Import from <code>&#64;oge-ui/react-overlay/testing</code>; <code>&#64;testing-library/dom</code> is an optional peer only this entry needs.',
        },
        {
          name: 'getAllModals(container?: HTMLElement, filters?: OgeModalQueryFilters)',
          type: 'OgeModalQueries[]',
          description: 'Every open modal in the container that matches.',
        },
      ],
    },
    {
      title: 'State',
      entries: [
        {
          name: 'isOpen()',
          type: 'boolean',
          description:
            'Whether the modal is still open (its panel is in the document).',
        },
        {
          name: 'getTitle()',
          type: 'string',
          description:
            'The title — the heading’s text, or the <code>aria-label</code> of an untitled modal.',
        },
        {
          name: 'getRole()',
          type: 'string | null',
          description:
            "The panel's role: <code>'dialog'</code> or <code>'alertdialog'</code>.",
        },
        {
          name: 'isBusy()',
          type: 'boolean',
          description: 'Whether the modal reports <code>aria-busy</code>.',
        },
        {
          name: 'getContentText()',
          type: 'string',
          description: 'Text of the modal body.',
        },
      ],
    },
    {
      title: 'Actions',
      entries: [
        {
          name: 'getButtonTexts()',
          type: 'string[]',
          description:
            'Labels of the action buttons — the footer’s, or an alert / confirm / prompt dialog’s; text, or <code>aria-label</code> when empty.',
        },
        {
          name: 'clickButton(label: string | RegExp)',
          type: 'void',
          description:
            'Clicks the matching action button; throws with the button list when none matches.',
        },
        {
          name: 'close()',
          type: 'void',
          description:
            'Clicks the header’s close (✕) button — the full close pipeline runs.',
        },
        {
          name: 'pressEscape()',
          type: 'void',
          description:
            'Presses Escape inside the modal (<code>closeOnEscape</code>).',
        },
        {
          name: 'clickBackdrop()',
          type: 'void',
          description:
            'Presses on the backdrop outside the panel (<code>closeOnBackdropClick</code>).',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeModalQueries',
          type: 'interface',
          description:
            'What <code>getModal()</code> returns — the members above.',
        },
        {
          name: 'OgeModalQueryFilters',
          type: '{ title?: string | RegExp }',
          description:
            'Filters of <code>getModal()</code> / <code>getAllModals()</code>.',
        },
      ],
    },
  ],
};
