import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { CustomDataSource } from '@oge-ui/core';
import { OgeDateBox, OgeSelectBox, OgeTagBox } from '@oge-ui/react-inputs';
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
  'Remote data',
  'Templates & cancelable events',
  'Tag Box — multi-select',
  'Tag Box — select all, custom tags & limits',
  'Tag Box — remote data',
  'Item states & templates',
  'Field chrome',
  'Mobile / adaptive',
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

/** Avatar images served by the docs (`public/avatars`), as in the snippet. */
const AVATAR_USERS = [1, 2, 3, 4, 5].map((id) => ({
  id,
  name: [
    'Elif Kaya',
    'Mert Demir',
    'Selin Doğan',
    'Can Yılmaz',
    'Deniz Arslan',
  ][id - 1],
  avatar: `/avatars/${id}.png`,
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

interface DemoCustomer {
  id: number;
  name: string;
}

const CUSTOMERS: DemoCustomer[] = Array.from({ length: 5000 }, (_, i) => ({
  id: i + 1,
  name: `Customer ${String(i + 1).padStart(4, '0')}`,
}));
const DEMO_CITIES: DemoCustomer[] = Array.from({ length: 2000 }, (_, i) => ({
  id: i + 1,
  name: `City ${i + 1}`,
}));

const customers = Object.assign(
  new CustomDataSource<DemoCustomer>({
    key: 'id',
    load: async ({ skip = 0, take = 40, searchText }) => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const term = (searchText ?? '').toLowerCase();
      const rows = CUSTOMERS.filter((c) => c.name.toLowerCase().includes(term));
      return { data: rows.slice(skip, skip + take), totalCount: rows.length };
    },
  }),
  {
    byKey: async (key: unknown) => CUSTOMERS.find((c) => c.id === key) ?? null,
  },
);

const cityPages = new CustomDataSource<DemoCustomer>({
  key: 'id',
  load: async ({ skip = 0, take = 30, searchText }) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const term = (searchText ?? '').toLowerCase();
    const rows = DEMO_CITIES.filter((c) => c.name.toLowerCase().includes(term));
    return { data: rows.slice(skip, skip + take), totalCount: rows.length };
  },
});

function RemoteDemo(): ReactNode {
  const [customerId, setCustomerId] = useState<unknown>(1234);
  return createElement(
    'div',
    { className: 'demo-row demo-row-start', 'data-demo': 'remote' },
    createElement(OgeSelectBox<DemoCustomer>, {
      key: 'customer',
      label: 'Customer',
      displayExpr: 'name',
      valueExpr: 'id',
      dataSource: customers,
      pageSize: 40,
      searchEnabled: true,
      searchTimeout: 300,
      virtualScroll: true,
      showClearButton: true,
      value: customerId,
      onValueChange: setCustomerId,
    }),
    readout('value:', customerId === null ? 'null' : String(customerId)),
  );
}

interface DemoStatus {
  id: string;
  name: string;
  phase: string;
  color: string;
}

const STATUSES: DemoStatus[] = [
  { id: 'todo', name: 'To do', phase: 'Open', color: '#94a3b8' },
  { id: 'doing', name: 'In progress', phase: 'Open', color: '#6366f1' },
  { id: 'review', name: 'In review', phase: 'Open', color: '#f59e0b' },
  { id: 'done', name: 'Done', phase: 'Closed', color: '#10b981' },
];

const dot = (color: string) =>
  createElement('span', {
    className: 'inline-block size-2.5 rounded-full',
    style: { background: color },
  });

function TemplatesDemo(): ReactNode {
  const [statusId, setStatusId] = useState<unknown>('doing');
  const [pinned, setPinned] = useState(false);
  return createElement(
    'div',
    { className: 'demo-row demo-row-start', 'data-demo': 'templates' },
    createElement(OgeSelectBox<DemoStatus>, {
      key: 'status',
      label: 'Status',
      items: STATUSES,
      displayExpr: 'name',
      valueExpr: 'id',
      groupBy: 'phase',
      renderGroup: (label) => createElement('span', null, `Phase · ${label}`),
      renderField: (item, { text }) =>
        createElement(
          'span',
          { className: 'flex items-center gap-1.5' },
          item ? dot(item.color) : null,
          text,
        ),
      renderItem: (item) =>
        createElement(
          'span',
          { className: 'flex items-center gap-2' },
          dot(item.color),
          createElement(
            'span',
            { className: 'oge-select-option-text' },
            item.name,
          ),
        ),
      renderHeader: ({ items }) => `${items.length} statuses`,
      renderFooter: () =>
        createElement(
          'label',
          { className: 'flex items-center gap-2' },
          createElement('input', {
            type: 'checkbox',
            checked: pinned,
            onChange: () => setPinned(!pinned),
          }),
          'Keep open (cancels closing)',
        ),
      onClosing: (event) => {
        if (pinned && event.reason !== 'select') event.cancel = true;
      },
      value: statusId,
      onValueChange: setStatusId,
    }),
  );
}

interface DemoSkill {
  id: number;
  name: string;
  area: string;
}

const INITIAL_SKILLS: DemoSkill[] = [
  { id: 1, name: 'Angular', area: 'Frontend' },
  { id: 2, name: 'Signals', area: 'Frontend' },
  { id: 3, name: 'SCSS', area: 'Frontend' },
  { id: 4, name: 'Nx', area: 'Tooling' },
  { id: 5, name: 'Vitest', area: 'Tooling' },
  { id: 6, name: 'Playwright', area: 'Tooling' },
];
let nextSkillId = 100;

function TagBoxFeaturesDemo(): ReactNode {
  const [skills, setSkills] = useState(INITIAL_SKILLS);
  const [skillIds, setSkillIds] = useState<readonly unknown[]>([1, 4]);
  return createElement(
    'div',
    { className: 'demo-row demo-row-start', 'data-demo': 'tag-features' },
    createElement(OgeTagBox<DemoSkill>, {
      key: 'skills',
      label: 'Skills',
      items: skills,
      displayExpr: 'name',
      valueExpr: 'id',
      groupBy: 'area',
      searchEnabled: true,
      showSelectAll: true,
      acceptCustomValue: true,
      maxSelectedItems: 5,
      maxDisplayedTags: 3,
      renderTag: (_item, { text }) =>
        createElement('span', { className: 'oge-tag-text' }, `#${text}`),
      hint: 'Type a new skill and press Enter',
      onCustomItemCreating: (event) => {
        const item = { id: nextSkillId++, name: event.text, area: 'Custom' };
        setSkills((all) => [...all, item]);
        event.customItem = item;
      },
      value: skillIds,
      onValueChange: setSkillIds,
    }),
  );
}

function TagBoxRemoteDemo(): ReactNode {
  const [cityIds, setCityIds] = useState<readonly unknown[]>([]);
  return createElement(OgeTagBox<DemoCustomer>, {
    label: 'Delivery cities',
    displayExpr: 'name',
    valueExpr: 'id',
    dataSource: cityPages,
    searchEnabled: true,
    virtualScroll: true,
    value: cityIds,
    onValueChange: setCityIds,
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

function AdaptiveDemo(): ReactNode {
  const [city, setCity] = useState<unknown>(null);
  const [skills, setSkills] = useState<readonly unknown[]>([]);
  const [due, setDue] = useState<Date | null>(null);
  return createElement(
    'div',
    { className: 'demo-row demo-row-start', 'data-demo': 'adaptive' },
    createElement(OgeSelectBox, {
      key: 'city',
      label: 'City',
      adaptiveMode: 'auto',
      items: CITIES,
      searchEnabled: true,
      value: city,
      onValueChange: setCity,
    }),
    createElement(OgeTagBox, {
      key: 'skills',
      label: 'Skills',
      adaptiveMode: 'auto',
      items: SKILLS,
      value: skills,
      onValueChange: setSkills,
    }),
    createElement(OgeDateBox, {
      key: 'due',
      label: 'Due date',
      adaptiveMode: 'auto',
      value: due,
      onValueChange: setDue,
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
  // the popup surface (and its adaptive sheet) is react-overlay's stylesheet
  styleUrls: [
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
  ],
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
      heading="Remote data"
      description="Bind any <code>&#64;oge-ui/core</code> <code>DataSource</code> to <code>dataSource</code>: pages of <code>pageSize</code> rows load as the list scrolls, the typed text goes to the server as <code>searchText</code> after <code>searchTimeout</code>, superseded requests are aborted through their <code>AbortSignal</code> and pages are cached per search. <code>byKey()</code> resolves a value no loaded page holds — here the initial customer #1234 of 5,000."
      [chips]="['dataSource', 'pageSize', 'byKey', 'AbortSignal']"
      [code]="demos[8].source"
      language="tsx"
    >
      <app-react-host [render]="remote" />
    </app-demo-card>

    <app-demo-card
      heading="Templates & cancelable events"
      description="<code>renderGroup</code>, <code>renderField</code> (paints the closed field over the real input, which keeps its text for assistive technology), <code>renderHeader</code> and <code>renderFooter</code>. <code>onOpening</code> / <code>onClosing</code> are cancelable pre-events — set <code>event.cancel = true</code>; <code>onClosing</code> carries its <code>reason</code>."
      [chips]="['renderGroup', 'renderField', 'onClosing', 'cancel']"
      [code]="demos[9].source"
      language="tsx"
    >
      <app-react-host [render]="templates" />
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
      heading="Tag Box — select all, custom tags & limits"
      description="The tag box speaks the select box&#39;s whole vocabulary — <code>groupBy</code>, <code>renderItem</code>, lazy <code>items</code>, <code>acceptCustomValue</code> + <code>onCustomItemCreating</code> — and adds a tri-state <code>showSelectAll</code> row (<kbd>&uarr;</kbd> from the first option reaches it), <code>maxSelectedItems</code> with a status message, <code>renderTag</code> chips and a <code>+N more</code> overflow chip."
      [chips]="[
        'showSelectAll',
        'maxSelectedItems',
        'acceptCustomValue',
        'renderTag',
      ]"
      [code]="demos[10].source"
      language="tsx"
    >
      <app-react-host [render]="tagFeatures" />
    </app-demo-card>

    <app-demo-card
      heading="Tag Box — remote data"
      description="The same <code>dataSource</code> contract on the tag box: 2,000 cities paged 30 at a time, server-side search, and chips that stay resolved while the list shows another search."
      [chips]="['dataSource', 'virtualScroll']"
      [code]="demos[11].source"
      language="tsx"
    >
      <app-react-host [render]="tagRemote" />
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

    <app-demo-card
      heading="Mobile / adaptive"
      description="With <code>adaptiveMode=&quot;auto&quot;</code> a viewport narrower than <code>adaptiveBreakpoint</code> (600px) turns the drop-down into a modal bottom sheet — titled with the label, a close button, a search field at the top, 44px rows, safe-area insets, focus trap and swipe-down dismiss — and the date picker into a full-screen dialog. <code>&amp;lt;OgeInputsConfigProvider&amp;gt;</code> with <code>adaptiveMode: 'auto'</code> switches the whole family."
      [chips]="['adaptiveMode', 'adaptiveBreakpoint']"
      [code]="demos[7].source"
      language="tsx"
    >
      <app-react-host [render]="adaptive" />
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
  protected readonly adaptive = () => createElement(AdaptiveDemo);
  protected readonly remote = () => createElement(RemoteDemo);
  protected readonly templates = () => createElement(TemplatesDemo);
  protected readonly tagFeatures = () => createElement(TagBoxFeaturesDemo);
  protected readonly tagRemote = () => createElement(TagBoxRemoteDemo);
}
