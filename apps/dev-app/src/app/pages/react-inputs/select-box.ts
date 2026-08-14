import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgeSelectBox, OgeTagBox } from '@oge-ui/react-inputs';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { INPUTS_SELECT_BOX_DEMOS } from './select-box-snippets';

/**
 * TOC of the React view — the same eight sections as the Angular select box
 * page (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_INPUTS_SELECT_BOX_SECTIONS = [
  'Basic usage',
  'Data mapping & search',
  'Grouping & custom values',
  'Lazy data',
  'Tag Box — multi-select',
  'Item states & templates',
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

interface DemoPlan {
  id: string;
  name: string;
  soldOut?: boolean;
}

const CITIES = ['Ankara', 'Berlin', 'Lisbon', 'Oslo', 'Tokyo'];
const COUNTRIES = ['Türkiye', 'Germany', 'Portugal', 'Norway', 'Japan'];

const USERS: DemoUser[] = [
  { id: 1, name: 'Elif Kaya', role: 'Engineering' },
  { id: 2, name: 'Mert Demir', role: 'Design' },
  { id: 3, name: 'Selin Doğan', role: 'Backend' },
  { id: 4, name: 'Can Yılmaz', role: 'Product' },
  { id: 5, name: 'Deniz Arslan', role: 'QA' },
];

const PLANS: DemoPlan[] = [
  { id: 'starter', name: 'Starter' },
  { id: 'team', name: 'Team' },
  { id: 'scale', name: 'Scale (sold out)', soldOut: true },
  { id: 'enterprise', name: 'Enterprise' },
];

const SKILLS = ['Angular', 'Signals', 'Nx', 'Vitest', 'SCSS'];

/** Inline SVG avatars — the docs stay fully offline. */
const AVATAR_USERS = [1, 2, 3, 4, 5].map((id) => ({
  id,
  name: [
    'Elif Kaya',
    'Mert Demir',
    'Selin Doğan',
    'Can Yılmaz',
    'Deniz Arslan',
  ][id - 1],
  avatar:
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="8" fill="${['#6366f1', '#22d3ee', '#ec4899', '#10b981', '#f59e0b'][id - 1]}"/><text x="16" y="21" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#fff">${['EK', 'MD', 'SD', 'CY', 'DA'][id - 1]}</text></svg>`,
    ),
}));

/** Invoked once, on first open — loading/error rows render while pending. */
const loadWarehouses = (): Promise<string[]> =>
  new Promise((resolve) =>
    setTimeout(() => resolve(['Hamburg', 'İzmir', 'Rotterdam']), 900),
  );

function BasicDemo(): ReactNode {
  const [city, setCity] = useState<unknown>(null);
  return row(
    createElement(OgeSelectBox, {
      key: 'city',
      label: 'City',
      items: CITIES,
      value: city,
      onValueChange: setCity,
    }),
    readout('value:', city === null ? 'null' : String(city)),
  );
}

function MappingDemo(): ReactNode {
  const [assigneeId, setAssigneeId] = useState<unknown>(null);
  return row(
    createElement(OgeSelectBox, {
      key: 'assignee',
      label: 'Assignee',
      items: USERS,
      displayExpr: 'name',
      valueExpr: 'id',
      searchEnabled: true,
      showClearButton: true,
      value: assigneeId,
      onValueChange: setAssigneeId,
    }),
    readout('committed id:', assigneeId === null ? 'null' : String(assigneeId)),
  );
}

function GroupingDemo(): ReactNode {
  const [memberId, setMemberId] = useState<unknown>(null);
  const [tags, setTags] = useState(['angular', 'signals']);
  const [tag, setTag] = useState<unknown>(null);
  return row(
    createElement(OgeSelectBox, {
      key: 'member',
      label: 'Team member',
      items: USERS,
      displayExpr: 'name',
      valueExpr: 'id',
      groupBy: 'role',
      value: memberId,
      onValueChange: setMemberId,
    }),
    createElement(OgeSelectBox, {
      key: 'tag',
      label: 'Tag',
      items: tags,
      searchEnabled: true,
      acceptCustomValue: true,
      showClearButton: true,
      hint: 'Type a new tag and press Enter',
      value: tag,
      onValueChange: setTag,
      onCustomItemCreating: (payload) => {
        payload.customItem = payload.text;
        setTags((current) => [...current, payload.text]);
      },
    }),
  );
}

function LazyDemo(): ReactNode {
  const [warehouse, setWarehouse] = useState<unknown>(null);
  return createElement(OgeSelectBox, {
    label: 'Warehouse',
    items: loadWarehouses,
    value: warehouse,
    onValueChange: setWarehouse,
  });
}

function TagBoxDemo(): ReactNode {
  const [selectedSkills, setSelectedSkills] = useState<readonly unknown[]>([
    'Angular',
  ]);
  const [teamIds, setTeamIds] = useState<readonly unknown[]>([1, 2]);
  return row(
    createElement(OgeTagBox, {
      key: 'skills',
      label: 'Skills',
      items: SKILLS,
      searchEnabled: true,
      value: selectedSkills,
      onValueChange: setSelectedSkills,
    }),
    createElement(OgeTagBox, {
      key: 'team',
      label: 'Team',
      items: AVATAR_USERS,
      displayExpr: 'name',
      valueExpr: 'id',
      imageExpr: 'avatar',
      maxDisplayedTags: 3,
      value: teamIds,
      onValueChange: setTeamIds,
    }),
  );
}

function StatesDemo(): ReactNode {
  const [planId, setPlanId] = useState<unknown>(null);
  return createElement(OgeSelectBox, {
    label: 'Plan',
    items: PLANS,
    displayExpr: 'name',
    valueExpr: 'id',
    disabledExpr: 'soldOut',
    hint: "Sold-out plans can't be picked",
    value: planId,
    onValueChange: setPlanId,
  });
}

function ChromeDemo(): ReactNode {
  const [country, setCountry] = useState<unknown>(null);
  return row(
    createElement(OgeSelectBox, {
      key: 'floating',
      label: 'Country',
      labelMode: 'floating',
      items: COUNTRIES,
      showClearButton: true,
      hint: 'Shipping destination',
      value: country,
      onValueChange: setCountry,
    }),
    createElement(OgeSelectBox, {
      key: 'compact',
      label: 'Country',
      size: 'sm',
      stylingMode: 'filled',
      subscriptSizing: 'none',
      items: COUNTRIES,
      value: country,
      onValueChange: setCountry,
    }),
  );
}

/**
 * The React half of the select box page — the same seven demo sections as the
 * Angular page, with the same example content, rendered as real React trees
 * inside `/components/inputs/select-box` when the reader has chosen React
 * (ADR 0002).
 */
@Component({
  selector: 'app-react-inputs-select-box-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React editors carry the class names but no styles of their own —
  // the docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/inputs/src/styles.scss',
  template: `
    <app-demo-card
      heading="Basic usage"
      description="Bind an array of strings and the <code>value</code> + <code>onValueChange</code> pair — no mapping needed. Open with the mouse, <kbd>&darr;</kbd>, <kbd>Enter</kbd> or by typing a letter (type-ahead)."
      [chips]="['value + onValueChange']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basic" />
    </app-demo-card>

    <app-demo-card
      heading="Data mapping & search"
      description="Objects map through <code>displayExpr</code>/<code>valueExpr</code> (field name or function). <code>searchEnabled</code> turns the input editable and filters client-side; <code>onSearchChange</code> + <code>loading</code> are the server-side escape hatch."
      [chips]="['displayExpr', 'valueExpr', 'searchEnabled']"
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="mapping" />
    </app-demo-card>

    <app-demo-card
      heading="Grouping & custom values"
      description="<code>groupBy</code> (field name or function) groups flat data under headers on the fly — no pre-shaping. <code>acceptCustomValue</code> lets typed text that matches nothing become the value: <code>onCustomItemCreating</code> maps it to an item (sync, async, or <code>null</code> to reject)."
      [chips]="['groupBy', 'acceptCustomValue', 'onCustomItemCreating']"
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="grouping" />
    </app-demo-card>

    <app-demo-card
      heading="Lazy data"
      description="Pass a function as <code>items</code> — it runs once on first open; the popup shows a localized loading row while pending and an error row on rejection. The selected item resolves as soon as the data lands."
      [chips]="['items: () => Promise', 'deferred']"
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="lazy" />
    </app-demo-card>

    <app-demo-card
      heading="Tag Box — multi-select"
      description="<code>OgeTagBox</code> is the multi-select sibling: the value is an <em>array</em> of <code>valueExpr</code> results, picks render as removable chips, the popup stays open while selecting (checkbox listbox, <code>aria-multiselectable</code>) and <kbd>Backspace</kbd> removes the last chip. <code>imageExpr</code> puts avatars on chips and options; <code>maxDisplayedTags</code> collapses overflow into a <code>+N</code> chip."
      [chips]="[
        'value: T[]',
        'imageExpr',
        'maxDisplayedTags',
        'onSelectionChange',
      ]"
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="tagBox" />
    </app-demo-card>

    <app-demo-card
      heading="Item states & templates"
      description="<code>disabledExpr</code> marks rows non-selectable (skipped by keyboard navigation too). <code>renderItem</code> is the React counterpart of the <code>itemTemplate</code> slot. The selected value stays resolvable even while the visible list is filtered."
      [chips]="['disabledExpr', 'renderItem']"
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="states" />
    </app-demo-card>

    <app-demo-card
      heading="Field chrome"
      description="Everything from the shared chrome applies: label modes, sizes, styling modes, clear button, hints, validation subscript and the <code>sm + subscriptSizing=none</code> compact grid-editor shape."
      [chips]="['labelMode', 'size', 'stylingMode']"
      [code]="demos[6].source"
      language="tsx"
    >
      <app-react-host [render]="chrome" />
    </app-demo-card>
  `,
})
export class ReactInputsSelectBoxDemos {
  protected readonly demos = INPUTS_SELECT_BOX_DEMOS;

  protected readonly basic = () => createElement(BasicDemo);
  protected readonly mapping = () => createElement(MappingDemo);
  protected readonly grouping = () => createElement(GroupingDemo);
  protected readonly lazy = () => createElement(LazyDemo);
  protected readonly tagBox = () => createElement(TagBoxDemo);
  protected readonly states = () => createElement(StatesDemo);
  protected readonly chrome = () => createElement(ChromeDemo);
}
