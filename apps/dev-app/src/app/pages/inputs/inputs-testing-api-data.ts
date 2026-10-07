import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/inputs/testing/src/** — keep in sync with the
 * source TSDoc when a harness changes. The React counterpart
 * (`react-inputs/react-inputs-testing-api-data.ts`) uses the same member
 * names; `docs-tools:parity` compares the two.
 */

const harness = (host: string, name: string): ApiGroup => ({
  title: 'Harness',
  entries: [
    {
      name: 'hostSelector',
      type: `'${host}'`,
      description:
        'Static. The host selector the CDK loader matches — import from <code>&#64;oge-ui/inputs/testing</code>; <code>&#64;angular/cdk</code> is an optional peer only this entry needs.',
    },
    {
      name: 'with(filters?: OgeInputHarnessFilters)',
      type: `HarnessPredicate<${name}>`,
      description:
        'Static. Predicate for <code>loader.getHarness()</code>: <code>selector</code>, <code>ancestor</code>, <code>label</code>, <code>value</code> (string or RegExp) and <code>disabled</code>.',
    },
  ],
});

const COMMON: ApiGroup = {
  title: 'Common (every input harness)',
  entries: [
    {
      name: 'getValue()',
      type: 'Promise<string>',
      description: 'The text the editor shows (the native input’s value).',
    },
    {
      name: 'setValue(text: string)',
      type: 'Promise<void>',
      description:
        'Replaces the text as a user would — clear, type, blur (the commit point). The date box commits with Enter instead.',
    },
    {
      name: 'typeText(text: string)',
      type: 'Promise<void>',
      description:
        'Types without clearing or committing (as-you-type behaviour).',
    },
    {
      name: 'pressEnter()',
      type: 'Promise<void>',
      description: 'Presses Enter in the input.',
    },
    {
      name: 'getLabel()',
      type: 'Promise<string>',
      description:
        'The visible label without the required mark, or the input’s <code>aria-label</code> under <code>labelMode="hidden"</code>.',
    },
    {
      name: 'getPlaceholder()',
      type: 'Promise<string>',
      description: 'The input’s placeholder.',
    },
    {
      name: 'isDisabled() / isReadonly() / isRequired()',
      type: 'Promise<boolean>',
      description:
        'State from the host classes (<code>oge-disabled</code>, <code>oge-input-readonly</code>) and <code>aria-required</code>.',
    },
    {
      name: 'isInvalid()',
      type: 'Promise<boolean>',
      description:
        'Whether the error state shows (<code>aria-invalid="true"</code>) — after <code>errorDisplay</code> allows it.',
    },
    {
      name: 'getErrorText() / getHintText()',
      type: 'Promise<string>',
      description:
        "The visible error message or hint, <code>''</code> when none.",
    },
    {
      name: 'focus() / blur() / isFocused()',
      type: 'Promise<void> | Promise<boolean>',
      description:
        'Focus control of the native input; blur is the commit point.',
    },
  ],
};

const POPUP = (what: string): ApiGroup => ({
  title: 'Popup',
  entries: [
    {
      name: 'isOpen()',
      type: 'Promise<boolean>',
      description: `Whether the ${what} is open (<code>aria-expanded="true"</code>).`,
    },
    {
      name: 'open() / close()',
      type: 'Promise<void>',
      description: `Opens the ${what} with a click on the field / closes it with Escape; each is a no-op when already in that state.`,
    },
  ],
});

const FILTERS: ApiGroup = {
  entries: [
    {
      name: 'OgeInputHarnessFilters',
      type: 'BaseHarnessFilters & { label?, value?: string | RegExp; disabled?: boolean }',
      description: 'Options of every input harness’s <code>with()</code>.',
    },
  ],
};

export const OGE_TEXT_BOX_HARNESS_API: ApiSections = {
  methods: [harness('oge-text-box', 'OgeTextBoxHarness'), COMMON],
  types: [FILTERS],
};

export const OGE_NUMBER_BOX_HARNESS_API: ApiSections = {
  methods: [
    harness('oge-number-box', 'OgeNumberBoxHarness'),
    {
      title: 'Spin',
      entries: [
        {
          name: 'increment() / decrement()',
          type: 'Promise<void>',
          description:
            'One step up / down with ArrowUp / ArrowDown, which commits immediately. <code>getValue()</code> is the formatted text — pin <code>locale</code> in specs.',
        },
      ],
    },
    COMMON,
  ],
  types: [FILTERS],
};

export const OGE_SELECT_BOX_HARNESS_API: ApiSections = {
  methods: [
    harness('oge-select-box', 'OgeSelectBoxHarness'),
    POPUP('popup'),
    {
      title: 'Options',
      entries: [
        {
          name: 'getOptions(filter?: OgeSelectOptionFilter)',
          type: 'Promise<string[]>',
          description:
            'Texts of the listed options (opens the popup); the listbox is found through <code>aria-controls</code> from the document root.',
        },
        {
          name: 'selectOption(text: string | RegExp)',
          type: 'Promise<void>',
          description:
            'Opens the popup and clicks the first matching option; throws with the option list when none matches.',
        },
        {
          name: 'getSelectedOptionText()',
          type: 'Promise<string | null>',
          description:
            'Text of the <code>aria-selected</code> option of the open list.',
        },
        {
          name: 'search(text: string)',
          type: 'Promise<void>',
          description:
            'Types into the search field (<code>searchEnabled</code>).',
        },
      ],
    },
    COMMON,
  ],
  types: [
    FILTERS,
    {
      entries: [
        {
          name: 'OgeSelectOptionFilter',
          type: '{ text?: string | RegExp }',
          description: 'Filter of <code>getOptions()</code>.',
        },
      ],
    },
  ],
};

export const OGE_DATE_BOX_HARNESS_API: ApiSections = {
  methods: [
    harness('oge-date-box', 'OgeDateBoxHarness'),
    POPUP('picker'),
    {
      title: 'Calendar',
      entries: [
        {
          name: 'getCalendarTitle()',
          type: 'Promise<string>',
          description:
            'The heading of the month on show (<code>"March 2026"</code>).',
        },
        {
          name: 'nextMonth() / previousMonth()',
          type: 'Promise<void>',
          description: 'Moves the picker one month.',
        },
        {
          name: 'selectDay(day: number)',
          type: 'Promise<void>',
          description:
            'Opens the picker and clicks a day of the month on show (adjacent months’ days skipped); a date-only box commits and closes.',
        },
      ],
    },
    COMMON,
  ],
  types: [FILTERS],
};
