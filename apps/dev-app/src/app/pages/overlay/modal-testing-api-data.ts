import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/overlay/testing/src/** — keep in sync with the
 * source TSDoc when the harness changes. The React counterpart
 * (`react-overlay/react-modal-testing-api-data.ts`) uses the same member
 * names; `docs-tools:parity` compares the two.
 */

/** The same members as the React table, apart from the return types. */
const modalTestingMembers = (
  wrap: (type: string) => string,
): readonly ApiGroup[] => [
  {
    title: 'State',
    entries: [
      {
        name: 'isOpen()',
        type: wrap('boolean'),
        description: 'Whether the modal is open (its panel is rendered).',
      },
      {
        name: 'getTitle()',
        type: wrap('string'),
        description:
          'The title — the heading’s text, or the <code>aria-label</code> of an untitled modal.',
      },
      {
        name: 'getRole()',
        type: wrap('string | null'),
        description:
          "The panel's role: <code>'dialog'</code> or <code>'alertdialog'</code>.",
      },
      {
        name: 'isBusy()',
        type: wrap('boolean'),
        description: 'Whether the modal reports <code>aria-busy</code>.',
      },
      {
        name: 'getContentText()',
        type: wrap('string'),
        description: 'Text of the modal body (the projected content).',
      },
    ],
  },
  {
    title: 'Actions',
    entries: [
      {
        name: 'getButtonTexts()',
        type: wrap('string[]'),
        description:
          'Labels of the action buttons — the footer’s, or an alert / confirm / prompt dialog’s; text, or <code>aria-label</code> when empty.',
      },
      {
        name: 'clickButton(label: string | RegExp)',
        type: wrap('void'),
        description:
          'Clicks the matching action button; throws with the button list when none matches.',
      },
      {
        name: 'close()',
        type: wrap('void'),
        description:
          'Clicks the header’s close (✕) button — the full close pipeline runs.',
      },
      {
        name: 'pressEscape()',
        type: wrap('void'),
        description:
          'Presses Escape inside the modal (<code>closeOnEscape</code>).',
      },
      {
        name: 'clickBackdrop()',
        type: wrap('void'),
        description:
          'Presses on the backdrop outside the panel (<code>closeOnBackdropClick</code>).',
      },
    ],
  },
];

export const OGE_MODAL_HARNESS_API: ApiSections = {
  properties: [
    {
      title: 'Harness',
      entries: [
        {
          name: 'hostSelector',
          type: "'oge-modal'",
          description:
            'Static. The host selector the CDK loader matches — import from <code>&#64;oge-ui/overlay/testing</code>; <code>&#64;angular/cdk</code> is an optional peer only this entry needs.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Finding the modal',
      entries: [
        {
          name: 'with(filters?: OgeModalHarnessFilters)',
          type: 'HarnessPredicate<OgeModalHarness>',
          description:
            'Static. Predicate for <code>loader.getHarness()</code>: <code>selector</code>, <code>ancestor</code>, <code>title</code> (string or RegExp) and <code>open</code>. Service-opened modals live in <code>document.body</code>: use <code>TestbedHarnessEnvironment.documentRootLoader(fixture)</code>.',
        },
      ],
    },
    ...modalTestingMembers((type) => `Promise<${type}>`),
    {
      title: 'Content container',
      entries: [
        {
          name: 'getHarness / getHarnessOrNull / getAllHarnesses / getChildLoader',
          type: 'ContentContainerComponentHarness',
          description:
            'Search the open panel for other harnesses — the editors of a modal form are one call away.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeModalHarnessFilters',
          type: 'BaseHarnessFilters & { title?: string | RegExp; open?: boolean }',
          description: 'Options of <code>OgeModalHarness.with()</code>.',
        },
      ],
    },
  ],
};
