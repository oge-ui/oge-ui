import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/react/inputs/src/lib/testing/** — the React
 * Testing Library counterpart of the `@oge-ui/inputs/testing` harnesses,
 * with the same member names (`docs-tools:parity` compares them). Reads are
 * synchronous; actions fire act-wrapped events.
 */

const ELEMENTS: ApiGroup = {
  title: 'Queries object',
  entries: [
    {
      name: 'element',
      type: 'HTMLElement',
      description: 'The editor’s root element.',
    },
    {
      name: 'input',
      type: 'HTMLInputElement',
      description:
        'The native input — hand it to any Testing Library query or matcher.',
    },
  ],
};

const finders = (
  component: string,
  one: string,
  all: string,
  queries: string,
): ApiGroup => ({
  title: 'Finding the editor',
  entries: [
    {
      name: `${one}(container?: HTMLElement, filters?: OgeInputQueryFilters)`,
      type: queries,
      description: `The one <code>&lt;${component}&gt;</code> in (or being) the container (default <code>document.body</code>) matching <code>label</code>, <code>value</code> (string or RegExp) and <code>disabled</code>; throws on none or several. Import from <code>&#64;oge-ui/react-inputs/testing</code>; <code>&#64;testing-library/dom</code> is an optional peer only this entry needs.`,
    },
    {
      name: `${all}(container?: HTMLElement, filters?: OgeInputQueryFilters)`,
      type: `${queries}[]`,
      description: 'Every matching editor in the container.',
    },
  ],
});

const COMMON: ApiGroup = {
  title: 'Common (every input query)',
  entries: [
    {
      name: 'getValue()',
      type: 'string',
      description: 'The text the editor shows (the native input’s value).',
    },
    {
      name: 'setValue(text: string)',
      type: 'void',
      description:
        'Replaces the text as a user would — focus, type, blur (the commit point). The date box commits with Enter instead.',
    },
    {
      name: 'typeText(text: string)',
      type: 'void',
      description:
        'Replaces the text without committing (as-you-type behaviour).',
    },
    {
      name: 'pressEnter()',
      type: 'void',
      description: 'Presses Enter in the input.',
    },
    {
      name: 'getLabel()',
      type: 'string',
      description:
        'The visible label without the required mark, or the input’s <code>aria-label</code> under <code>labelMode="hidden"</code>.',
    },
    {
      name: 'getPlaceholder()',
      type: 'string',
      description: 'The input’s placeholder.',
    },
    {
      name: 'isDisabled() / isReadonly() / isRequired()',
      type: 'boolean',
      description:
        'State from the root classes (<code>oge-disabled</code>, <code>oge-input-readonly</code>) and <code>aria-required</code>.',
    },
    {
      name: 'isInvalid()',
      type: 'boolean',
      description:
        'Whether the error state shows (<code>aria-invalid="true"</code>) — after <code>errorDisplay</code> allows it.',
    },
    {
      name: 'getErrorText() / getHintText()',
      type: 'string',
      description:
        "The visible error message or hint, <code>''</code> when none.",
    },
    {
      name: 'focus() / blur() / isFocused()',
      type: 'void | boolean',
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
      type: 'boolean',
      description: `Whether the ${what} is open (<code>aria-expanded="true"</code>).`,
    },
    {
      name: 'open() / close()',
      type: 'void',
      description: `Opens the ${what} with a click on the field / closes it with Escape; each is a no-op when already in that state.`,
    },
  ],
});

const FILTERS: ApiGroup = {
  entries: [
    {
      name: 'OgeInputQueryFilters',
      type: '{ label?, value?: string | RegExp; disabled?: boolean }',
      description:
        'Filters of every <code>get*</code> / <code>getAll*</code> finder.',
    },
    {
      name: 'OgeInputQueries',
      type: 'interface',
      description:
        'What <code>getTextBox()</code> returns — the common members.',
    },
  ],
};

export const OGE_REACT_TEXT_BOX_TESTING_API: ApiSections = {
  properties: [ELEMENTS],
  methods: [
    finders('OgeTextBox', 'getTextBox', 'getAllTextBoxes', 'OgeInputQueries'),
    COMMON,
  ],
  types: [FILTERS],
};

export const OGE_REACT_NUMBER_BOX_TESTING_API: ApiSections = {
  properties: [ELEMENTS],
  methods: [
    finders(
      'OgeNumberBox',
      'getNumberBox',
      'getAllNumberBoxes',
      'OgeNumberBoxQueries',
    ),
    {
      title: 'Spin',
      entries: [
        {
          name: 'increment() / decrement()',
          type: 'void',
          description:
            'One step up / down with ArrowUp / ArrowDown, which commits immediately. <code>getValue()</code> is the formatted text — pin <code>locale</code> in specs.',
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
          name: 'OgeNumberBoxQueries',
          type: 'OgeInputQueries & { increment(), decrement() }',
          description: 'What <code>getNumberBox()</code> returns.',
        },
      ],
    },
  ],
};

export const OGE_REACT_SELECT_BOX_TESTING_API: ApiSections = {
  properties: [ELEMENTS],
  methods: [
    finders(
      'OgeSelectBox',
      'getSelectBox',
      'getAllSelectBoxes',
      'OgeSelectBoxQueries',
    ),
    {
      title: 'Shortcut',
      entries: [
        {
          name: 'selectOption(selectBox: HTMLElement | OgeSelectBoxQueries, text: string | RegExp)',
          type: 'void',
          description:
            'Picks an option from any element inside a select box (its combobox from <code>getByRole</code>, its root) or its queries object.',
        },
      ],
    },
    POPUP('popup'),
    {
      title: 'Options',
      entries: [
        {
          name: 'getOptions(filter?: OgeSelectOptionFilter)',
          type: 'string[]',
          description:
            'Texts of the listed options (opens the popup); the listbox is found through <code>aria-controls</code> in the document.',
        },
        {
          name: 'selectOption(text: string | RegExp)',
          type: 'void',
          description:
            'Opens the popup and clicks the first matching option; throws with the option list when none matches.',
        },
        {
          name: 'getSelectedOptionText()',
          type: 'string | null',
          description:
            'Text of the <code>aria-selected</code> option of the open list.',
        },
        {
          name: 'search(text: string)',
          type: 'void',
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
          name: 'OgeSelectBoxQueries',
          type: 'OgeInputQueries & { popup and option members }',
          description: 'What <code>getSelectBox()</code> returns.',
        },
        {
          name: 'OgeSelectOptionFilter',
          type: '{ text?: string | RegExp }',
          description: 'Filter of <code>getOptions()</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_DATE_BOX_TESTING_API: ApiSections = {
  properties: [ELEMENTS],
  methods: [
    finders('OgeDateBox', 'getDateBox', 'getAllDateBoxes', 'OgeDateBoxQueries'),
    POPUP('picker'),
    {
      title: 'Calendar',
      entries: [
        {
          name: 'getCalendarTitle()',
          type: 'string',
          description:
            'The heading of the month on show (<code>"March 2026"</code>).',
        },
        {
          name: 'nextMonth() / previousMonth()',
          type: 'void',
          description: 'Moves the picker one month.',
        },
        {
          name: 'selectDay(day: number)',
          type: 'void',
          description:
            'Opens the picker and clicks a day of the month on show (adjacent months’ days skipped); a date-only box commits and closes.',
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
          name: 'OgeDateBoxQueries',
          type: 'OgeInputQueries & { popup and calendar members }',
          description: 'What <code>getDateBox()</code> returns.',
        },
      ],
    },
  ],
};
