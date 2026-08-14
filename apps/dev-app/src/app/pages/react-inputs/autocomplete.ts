import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgeAutocomplete, OgeSelectBox } from '@oge-ui/react-inputs';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { INPUTS_AUTOCOMPLETE_DEMOS } from './autocomplete-snippets';

/**
 * TOC of the React view — the same seven sections as the Angular autocomplete
 * page (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_INPUTS_AUTOCOMPLETE_SECTIONS = [
  'Basic usage',
  'Suggestion tuning',
  'Force selection',
  'Virtual scrolling',
  'Lazy & server-side data',
  'Field chrome',
  'Keyboard & accessibility',
] as const;

const row = (...children: ReactNode[]) =>
  createElement('div', { className: 'demo-row demo-row-start' }, ...children);

/** The `value: …` readout beside a demo editor, as on the Angular page. */
const readout = (label: string, value: string) =>
  createElement(
    'div',
    {
      key: 'readout',
      className: 'pt-2 text-sm text-gray-500 dark:text-gray-400',
    },
    `${label} `,
    createElement('code', null, value),
  );

interface DemoUser {
  id: number;
  name: string;
  role: string;
}

const CITIES = [
  'Ankara',
  'Antalya',
  'Berlin',
  'Bursa',
  'Lisbon',
  'Oslo',
  'Tokyo',
];

const PRODUCTS = [
  'Notebook Air 13',
  'Notebook Pro 16',
  'Noise-cancelling Headset',
  'Mechanical Keyboard',
  'Monitor 27" 4K',
  'Monitor 32" 5K',
  'Mouse Wireless',
  'Microphone USB',
];

const USERS: DemoUser[] = [
  { id: 1, name: 'Elif Kaya', role: 'Engineering' },
  { id: 2, name: 'Mert Demir', role: 'Design' },
  { id: 3, name: 'Selin Doğan', role: 'Backend' },
  { id: 4, name: 'Can Yılmaz', role: 'Product' },
  { id: 5, name: 'Deniz Arslan', role: 'QA' },
];

const TAGS = ['angular', 'signals', 'nx', 'vitest', 'scss'];

/** 10k rows for the virtual scrolling demo. */
const ACCOUNTS = Array.from(
  { length: 10_000 },
  (_, i) => `Account #${String(i + 1).padStart(5, '0')}`,
);

/** Invoked once, on first open — loading/error rows render while pending. */
const loadRepos = (): Promise<string[]> =>
  new Promise((resolve) =>
    setTimeout(
      () => resolve(['oge-ui', 'oge-docs', 'oge-examples', 'oge-themes']),
      900,
    ),
  );

function BasicDemo(): ReactNode {
  const [cityName, setCityName] = useState('');
  return row(
    createElement(OgeAutocomplete, {
      key: 'city',
      label: 'City',
      items: CITIES,
      value: cityName,
      onValueChange: setCityName,
    }),
    readout('value:', cityName === '' ? "''" : cityName),
  );
}

function TuningDemo(): ReactNode {
  const [productName, setProductName] = useState('');
  return createElement(OgeAutocomplete, {
    label: 'Product',
    hint: 'At least 2 characters, top 5 matches',
    items: PRODUCTS,
    searchMode: 'startswith',
    minSearchLength: 2,
    maxItemCount: 5,
    value: productName,
    onValueChange: setProductName,
  });
}

function ForceSelectionDemo(): ReactNode {
  const [assigneeName, setAssigneeName] = useState('');
  const [assigneeRole, setAssigneeRole] = useState<string | null>(null);
  return row(
    createElement(OgeAutocomplete<DemoUser>, {
      key: 'assignee',
      label: 'Assignee',
      items: USERS,
      displayExpr: 'name',
      forceSelection: true,
      value: assigneeName,
      onValueChange: setAssigneeName,
      onSelectionChange: (event) => setAssigneeRole(event.item?.role ?? null),
    }),
    readout('picked role:', assigneeRole ?? 'null'),
  );
}

function VirtualScrollDemo(): ReactNode {
  const [accountName, setAccountName] = useState('');
  const [accountId, setAccountId] = useState<unknown>(null);
  return row(
    createElement(OgeAutocomplete, {
      key: 'account',
      label: 'Account',
      items: ACCOUNTS,
      virtualScroll: true,
      maxItemCount: 10_000,
      value: accountName,
      onValueChange: setAccountName,
    }),
    createElement(OgeSelectBox, {
      key: 'account-select',
      label: 'Account (select box)',
      items: ACCOUNTS,
      searchEnabled: true,
      virtualScroll: true,
      value: accountId,
      onValueChange: setAccountId,
    }),
  );
}

function LazyDemo(): ReactNode {
  const [repo, setRepo] = useState('');
  return createElement(OgeAutocomplete, {
    label: 'Repository',
    items: loadRepos,
    showDropDownButton: true,
    value: repo,
    onValueChange: setRepo,
  });
}

function ChromeDemo(): ReactNode {
  const [tag, setTag] = useState('');
  return createElement(OgeAutocomplete, {
    label: 'Tag',
    labelMode: 'floating',
    hint: 'Start typing to search',
    items: TAGS,
    showClearButton: true,
    showDropDownButton: true,
    openOnFieldClick: true,
    value: tag,
    onValueChange: setTag,
  });
}

/**
 * The React half of the autocomplete page — the same six demo sections as the
 * Angular page, with the same example content, rendered as real React trees
 * inside `/components/inputs/autocomplete` when the reader has chosen React
 * (ADR 0002).
 */
@Component({
  selector: 'app-react-inputs-autocomplete-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React editors carry the class names but no styles of their own —
  // the docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/inputs/src/styles.scss',
  template: `
    <app-demo-card
      heading="Basic usage"
      description="Type to see suggestions (from <code>minSearchLength</code> = 1 character on). <kbd>Enter</kbd> or blur commits the text; picking a suggestion commits its display text. The chevron and field-click opening are off by default."
      [chips]="['value: string', 'value + onValueChange']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basic" />
    </app-demo-card>

    <app-demo-card
      heading="Suggestion tuning"
      description="<code>minSearchLength</code> keeps the list closed until enough is typed, <code>maxItemCount</code> caps it (default 10), <code>searchMode</code> switches contains/startswith and <code>searchTimeout</code> debounces the filter. <code>groupBy</code> and <code>renderItem</code> work exactly like the select box."
      [chips]="['minSearchLength', 'maxItemCount', 'searchMode']"
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="tuning" />
    </app-demo-card>

    <app-demo-card
      heading="Force selection"
      description="<code>forceSelection</code> turns free text off: on blur, text that matches no suggestion reverts to the last committed value, and an exact match resolves to the item with its canonical casing. <code>onSelectionChange</code> reports the picked item — or <code>null</code> once the text diverges."
      [chips]="['forceSelection', 'onSelectionChange']"
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="forceSelection" />
    </app-demo-card>

    <app-demo-card
      heading="Virtual scrolling"
      description="<code>virtualScroll</code> windows the dropdown: 10&nbsp;000 rows here, ~15 in the DOM inside a full-height spacer. Available on the select box, tag box and autocomplete alike — pass <code>true</code> or <code>&#123; itemHeight, overscan &#125;</code>. Raise <code>maxItemCount</code> on the autocomplete, which otherwise caps the list at 10. Rows get a fixed size-matched height; <code>groupBy</code>/<code>wrapItemText</code> are ignored while active."
      [chips]="['virtualScroll', '10k rows', 'fixed itemHeight']"
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="virtualScroll" />
    </app-demo-card>

    <app-demo-card
      heading="Lazy & server-side data"
      description="A function as <code>items</code> loads once on first open with localized loading/error rows. For fully server-driven suggestions, listen to <code>onSearchChange</code>, keep <code>items</code> in sync and flag <code>loading</code> while the request runs."
      [chips]="['items: () => Promise', 'onSearchChange', 'loading']"
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="lazy" />
    </app-demo-card>

    <app-demo-card
      heading="Field chrome"
      description="The shared chrome applies unchanged: label modes, sizes, styling modes, clear button, hints and validation. <code>showDropDownButton</code> + <code>openOnFieldClick</code> opt into select-box-like opening."
      [chips]="['labelMode', 'showDropDownButton', 'openOnFieldClick']"
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="chrome" />
    </app-demo-card>
  `,
})
export class ReactInputsAutocompleteDemos {
  protected readonly demos = INPUTS_AUTOCOMPLETE_DEMOS;

  protected readonly basic = () => createElement(BasicDemo);
  protected readonly tuning = () => createElement(TuningDemo);
  protected readonly forceSelection = () => createElement(ForceSelectionDemo);
  protected readonly virtualScroll = () => createElement(VirtualScrollDemo);
  protected readonly lazy = () => createElement(LazyDemo);
  protected readonly chrome = () => createElement(ChromeDemo);
}
