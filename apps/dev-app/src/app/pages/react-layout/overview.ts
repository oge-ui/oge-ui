import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  createElement,
  useRef,
  useState,
  Fragment,
  type ReactNode,
} from 'react';
import {
  OgeAccordion,
  type OgeAccordionExpandedEvent,
  type OgeAccordionHandle,
  type OgeAccordionItemDefinition,
  type OgeAccordionTogglePosition,
} from '@oge-ui/react-layout';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { LAYOUT_OVERVIEW_DEMOS } from './overview-snippets';

/**
 * TOC of the React view — the same ten sections as the Angular accordion
 * overview (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_LAYOUT_OVERVIEW_SECTIONS = [
  'Declarative panels',
  'Data-driven items',
  'Single, multiple & collapsible',
  'Lazy rendering & keep-alive',
  'Async expand guard',
  'Invalid sections',
  'Async content loader',
  'Header actions',
  'Panel-level control',
  'Toggle position & styling',
] as const;

const row = (...children: ReactNode[]) =>
  createElement('div', { className: 'demo-row demo-row-start' }, ...children);

const checkbox = (label: string, checked: boolean, toggle: () => void) =>
  createElement(
    'label',
    { key: label, className: 'flex items-center gap-2 text-sm' },
    createElement('input', { type: 'checkbox', checked, onChange: toggle }),
    label,
  );

const smallButton = (
  key: string,
  label: string,
  onClick: () => void,
  className = 'rounded border px-2 py-1 text-sm',
) =>
  createElement('button', { key, type: 'button', className, onClick }, label);

/** Same three settings sections as the Angular page. */
const SETTINGS_SECTIONS: OgeAccordionItemDefinition[] = [
  {
    key: 'general',
    title: 'General',
    description: 'Language, time zone and formats',
    icon: 'M12 3v2m0 14v2m9-9h-2M5 12H3m14.5-6.5l-1.4 1.4M7.9 16.1l-1.4 1.4m11.2 0l-1.4-1.4M7.9 7.9L6.5 6.5',
  },
  {
    key: 'security',
    title: 'Security',
    description: 'Password and two-factor auth',
    badge: 2,
    icon: 'M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z',
  },
  {
    key: 'danger',
    title: 'Danger zone',
    description: 'Irreversible actions',
  },
];

const GUARDED_SECTIONS: OgeAccordionItemDefinition[] = [
  { key: 'plain', title: 'Opens right away' },
  {
    key: 'slow',
    title: 'Confirms first (1s)',
    expandGuard: () =>
      new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 1000)),
  },
  { key: 'locked', title: 'Always vetoes', expandGuard: () => false },
];

const ALL_TEAMS = ['Platform', 'Design', 'Support'];

const loadInvoices = () =>
  new Promise<string>((resolve) =>
    setTimeout(() => resolve('42 invoices loaded.'), 900),
  );

let flakyAttempts = 0;
const loadFlaky = () =>
  new Promise<string>((resolve, reject) =>
    setTimeout(() => {
      flakyAttempts++;
      if (flakyAttempts === 1) reject(new Error('network'));
      else resolve(`Report ready on attempt ${flakyAttempts}.`);
    }, 700),
  );

/** Controlled single-expand selection — the React face of `[(selectedIndex)]`. */
function BasicDemo(): ReactNode {
  const [index, setIndex] = useState(-1);
  const [lastExpanded, setLastExpanded] =
    useState<OgeAccordionExpandedEvent | null>(null);
  return createElement(
    Fragment,
    null,
    createElement(OgeAccordion, {
      key: 'acc',
      collapsible: true,
      selectedIndex: index,
      onSelectedIndexChange: setIndex,
      onItemExpanded: setLastExpanded,
      items: [
        {
          key: 'account',
          title: 'Account',
          description: 'Name and e-mail',
          content: createElement(
            'p',
            null,
            `Account settings — selected index: ${index}`,
          ),
        },
        {
          key: 'notifications',
          title: 'Notifications',
          badge: 3,
          content: createElement('p', null, 'Notification settings…'),
        },
        {
          key: 'archived',
          title: 'Archived',
          disabled: true,
          content: createElement('p', null, 'Never reachable…'),
        },
      ],
    }),
    lastExpanded &&
      createElement(
        'p',
        { key: 'note', className: 'mt-2 text-sm opacity-70' },
        `itemExpanded → index ${lastExpanded.index}`,
      ),
  );
}

/** Data-driven panels with the controlled `expandedKeys` pair. */
function ItemsDemo(): ReactNode {
  const [openKeys, setOpenKeys] = useState<readonly string[]>(['general']);
  return createElement(OgeAccordion, {
    items: SETTINGS_SECTIONS,
    multiple: true,
    collapsible: true,
    expandedKeys: openKeys,
    onExpandedKeysChange: setOpenKeys,
    renderContent: ({ item }) =>
      createElement(
        'p',
        null,
        'Body of ',
        createElement('b', { key: 'title' }, item?.title),
        ' — expandedKeys: ',
        createElement('code', { key: 'keys' }, openKeys.join(', ') || '(none)'),
      ),
  });
}

function ModeDemo(): ReactNode {
  const [multiple, setMultiple] = useState(false);
  const [collapsible, setCollapsible] = useState(false);
  return createElement(
    Fragment,
    null,
    row(
      checkbox('multiple', multiple, () => setMultiple(!multiple)),
      checkbox('collapsible', collapsible, () => setCollapsible(!collapsible)),
    ),
    createElement(OgeAccordion, {
      key: 'acc',
      items: SETTINGS_SECTIONS,
      multiple,
      collapsible,
      renderContent: ({ item }) =>
        createElement('p', null, `${item?.title} body…`),
    }),
  );
}

/** Mounted on first expand — the timestamp shows whether it survived a collapse. */
function CreatedAt(): ReactNode {
  const [createdAt] = useState(() => new Date().toLocaleTimeString());
  return createElement(
    'p',
    { className: 'text-sm' },
    `Created at ${createdAt}`,
  );
}

function LazyDemo(): ReactNode {
  const [keepAlive, setKeepAlive] = useState(true);
  return createElement(
    Fragment,
    null,
    row(checkbox('keepAlive', keepAlive, () => setKeepAlive(!keepAlive))),
    createElement(OgeAccordion, {
      key: 'acc',
      keepAlive,
      multiple: true,
      collapsible: true,
      items: [
        {
          key: 'first',
          title: 'First',
          renderContent: () => createElement(CreatedAt),
        },
        {
          key: 'second',
          title: 'Second',
          renderContent: () => createElement(CreatedAt),
        },
      ],
    }),
  );
}

function InvalidDemo(): ReactNode {
  const accordion = useRef<OgeAccordionHandle>(null);
  const [sections, setSections] = useState<OgeAccordionItemDefinition[]>([
    { key: 'contact', title: 'Contact' },
    { key: 'billing', title: 'Billing', invalid: true },
    { key: 'shipping', title: 'Shipping', invalid: true },
  ]);
  return createElement(
    Fragment,
    null,
    createElement(OgeAccordion, {
      key: 'acc',
      ref: accordion,
      items: sections,
      multiple: true,
      collapsible: true,
      renderContent: ({ item }) =>
        createElement('p', null, `${item?.title} fields…`),
    }),
    row(
      smallButton('errors', 'Show all errors', () =>
        accordion.current?.expandInvalid(),
      ),
      smallButton('fix', 'Fix everything', () =>
        setSections((all) => all.map((s) => ({ ...s, invalid: false }))),
      ),
    ),
  );
}

function LoaderDemo(): ReactNode {
  return createElement(OgeAccordion, {
    multiple: true,
    collapsible: true,
    renderContent: ({ data }) => createElement('p', null, data as string),
    items: [
      { key: 'invoices', title: 'Invoices', contentLoader: loadInvoices },
      { key: 'flaky', title: 'Flaky report', contentLoader: loadFlaky },
    ],
  });
}

function ActionsDemo(): ReactNode {
  const [teams, setTeams] = useState<readonly string[]>(ALL_TEAMS);
  return createElement(
    Fragment,
    null,
    createElement(OgeAccordion, {
      key: 'acc',
      multiple: true,
      collapsible: true,
      items: teams.map((team) => ({
        key: team,
        title: team,
        content: createElement('p', null, `${team} members…`),
        renderHeaderActions: () =>
          smallButton(
            team,
            'Remove',
            () => setTeams(teams.filter((t) => t !== team)),
            'rounded border px-2 py-1 text-xs',
          ),
      })),
    }),
    row(smallButton('reset', 'Reset', () => setTeams(ALL_TEAMS))),
  );
}

function PanelControlDemo(): ReactNode {
  const accordion = useRef<OgeAccordionHandle>(null);
  const [settled, setSettled] = useState<string | null>(null);
  const actionRow = createElement(
    'div',
    { key: 'actions', className: 'oge-accordion-action-row' },
    smallButton('cancel', 'Cancel', () =>
      accordion.current?.collapse('profile'),
    ),
    smallButton('save', 'Save', () => accordion.current?.collapse('profile')),
  );
  return createElement(
    Fragment,
    null,
    createElement(OgeAccordion, {
      key: 'acc',
      ref: accordion,
      multiple: true,
      collapsible: true,
      onAfterExpand: (event) => setSettled(`afterExpand → ${event.index}`),
      onAfterCollapse: (event) => setSettled(`afterCollapse → ${event.index}`),
      items: [
        {
          key: 'profile',
          title: 'Profile',
          expanded: true,
          content: createElement(
            Fragment,
            null,
            createElement('p', { key: 'body' }, 'Name, e-mail and avatar…'),
            actionRow,
          ),
        },
        {
          key: 'preferences',
          title: 'Preferences',
          hideToggle: true,
          content: createElement(
            'p',
            null,
            'This panel overrides hideToggle on its own.',
          ),
        },
      ],
    }),
    row(
      smallButton('toggle', "toggle('profile')", () =>
        accordion.current?.toggle('profile'),
      ),
      settled &&
        createElement(
          'span',
          { key: 'note', className: 'opacity-70' },
          settled,
        ),
    ),
  );
}

function StylingDemo(): ReactNode {
  const [togglePosition, setTogglePosition] =
    useState<OgeAccordionTogglePosition>('end');
  const [flat, setFlat] = useState(false);
  return createElement(
    Fragment,
    null,
    row(
      checkbox('togglePosition = start', togglePosition === 'start', () =>
        setTogglePosition(togglePosition === 'end' ? 'start' : 'end'),
      ),
      checkbox('displayMode = flat', flat, () => setFlat(!flat)),
    ),
    createElement(OgeAccordion, {
      key: 'acc',
      items: SETTINGS_SECTIONS,
      multiple: true,
      collapsible: true,
      togglePosition,
      displayMode: flat ? 'flat' : 'default',
      stylingMode: 'filled',
      size: 'sm',
      renderContent: ({ item }) =>
        createElement('p', null, `${item?.title} body…`),
    }),
  );
}

/**
 * The React half of the accordion overview — the same ten demo sections as the
 * Angular page, with the same example content, rendered as real React trees
 * inside `/components/accordion` when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-layout-overview-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React accordion carries the class names but no styles of its own —
  // the docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/layout/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['selectedIndex', 'collapsible', 'badge', 'disabled']"
      heading="Declarative panels"
      description="Every panel is an <code>items</code> entry carrying its own <code>content</code> — the React counterpart of a projected <code>&lt;oge-accordion-item&gt;</code>. <code>selectedIndex</code> is the controlled single-expand pair (pass <code>onSelectedIndexChange</code> with it); a user gesture first fires the cancelable <code>onItemExpanding</code>, then <code>onItemExpanded</code>. <code>collapsible</code> lets a second click close the open panel — without it the last open panel deliberately stays open (see the third demo). Disabled panels are skipped by clicks and arrow keys."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basic" />
    </app-demo-card>

    <app-demo-card
      [chips]="['items', 'expandedKeys', 'icon', 'description']"
      heading="Data-driven items"
      description="The <code>items</code> array drives the panels; <code>expandedKeys</code> is the multi-expand controlled pair, so state survives reordering and insertions. <code>icon</code> takes raw SVG path data — there is no icon font or icon package. A component-level <code>renderContent</code> render prop renders every panel's body."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="items" />
    </app-demo-card>

    <app-demo-card
      [chips]="['multiple', 'collapsible', 'aria-disabled']"
      heading="Single, multiple & collapsible"
      description='Single-expand collapses the sibling automatically. Without <code>collapsible</code> the last open panel cannot be closed, and the APG says such a header gets <code>aria-disabled="true"</code> — not <code>disabled</code>, so it stays focusable. Toggle the switches and watch the open header.'
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="mode" />
    </app-demo-card>

    <app-demo-card
      [chips]="['deferRendering', 'keepAlive']"
      heading="Lazy rendering & keep-alive"
      description="With <code>deferRendering</code> (default) a panel that renders through <code>renderContent</code> is mounted on first expand; <code>keepAlive</code> (default) then keeps it mounted while collapsed — the creation time does not change when you reopen. Turn keep-alive off and the content is recreated every time."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="lazy" />
    </app-demo-card>

    <app-demo-card
      [chips]="['expandGuard', 'single-flight', 'rejection = veto']"
      heading="Async expand guard"
      description="Expanding runs a pipeline: cancelable <code>onItemExpanding</code> → the panel's async <code>expandGuard</code> (the header shows a spinner, extra clicks are ignored) → <code>onItemExpanded</code>. The guard also runs on collapse. Resolving <code>false</code>, throwing and rejecting all veto. The guarded panel here takes a second to confirm."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="guard" />
    </app-demo-card>

    <app-demo-card
      [chips]="['invalid', 'expandInvalid()']"
      heading="Invalid sections"
      description="Flag a panel <code>invalid</code> and it grows a danger rail, a dot beside the title and a visually hidden label so screen readers announce it. <code>expandInvalid()</code> on the <code>ref</code> handle opens every failing section at once — the natural move after a rejected form submit."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="invalid" />
    </app-demo-card>

    <app-demo-card
      [chips]="['contentLoader', 'skeleton', 'retry']"
      heading="Async content loader"
      description="A per-panel <code>contentLoader</code> runs on first expand: a shimmering skeleton shows while it is pending, the resolved value reaches <code>renderContent</code> as <code>data</code>, and a rejection renders the failure message with a real retry button. The second panel fails once, then succeeds."
      [code]="demos[6].source"
      language="tsx"
    >
      <app-react-host [render]="loader" />
    </app-demo-card>

    <app-demo-card
      [chips]="['renderHeaderActions', 'no nested-interactive']"
      heading="Header actions"
      description="The APG puts the panel title in a <code>&amp;lt;button&amp;gt;</code>, so a second focusable control cannot live inside it — axe flags that as <code>nested-interactive</code>. <code>renderHeaderActions</code> is therefore rendered as a sibling of the toggle: real buttons, reachable with Tab, skipped by the accordion's arrow navigation."
      [code]="demos[7].source"
      language="tsx"
    >
      <app-react-host [render]="actions" />
    </app-demo-card>

    <app-demo-card
      [chips]="[
        'expanded',
        'expand() / collapse() / toggle()',
        'oge-accordion-action-row',
        'onAfterExpand',
      ]"
      heading="Panel-level control"
      description="React has no per-panel component, so a panel is driven from outside through the accordion's <code>ref</code> handle: <code>expand()</code>, <code>collapse()</code> and <code>toggle()</code> take an index or a key and run the same pipeline as a click, so a guard veto simply resolves <code>false</code> (Angular's per-panel <code>[(expanded)]</code> and <code>open()</code>/<code>close()</code> have no React counterpart by idiom). An <code>items</code> entry may still start <code>expanded</code>, <code>hideToggle</code> is overridable per panel, and <code>onAfterExpand</code>/<code>onAfterCollapse</code> fire once the height animation settles. The footer action bar is the <code>oge-accordion-action-row</code> class inside the panel body. Collapsing a panel that holds focus hands focus back to its header."
      [code]="demos[8].source"
      language="tsx"
    >
      <app-react-host [render]="panelControl" />
    </app-demo-card>

    <app-demo-card
      [chips]="['togglePosition', 'displayMode', 'stylingMode', 'size']"
      heading="Toggle position & styling"
      description="<code>togglePosition</code> is logical, so RTL mirrors it for free. <code>displayMode: 'flat'</code> drops the gutters and joins the panels into one stack, <code>stylingMode</code> switches between outlined, filled and borderless, and <code>size</code> sets the header density."
      [code]="demos[9].source"
      language="tsx"
    >
      <app-react-host [render]="styling" />
    </app-demo-card>
  `,
})
export class ReactLayoutOverviewDemos {
  protected readonly demos = LAYOUT_OVERVIEW_DEMOS;

  protected readonly basic = () => createElement(BasicDemo);
  protected readonly items = () => createElement(ItemsDemo);
  protected readonly mode = () => createElement(ModeDemo);
  protected readonly lazy = () => createElement(LazyDemo);
  protected readonly guard = () =>
    createElement(OgeAccordion, {
      items: GUARDED_SECTIONS,
      multiple: true,
      collapsible: true,
      renderContent: ({ item }) =>
        createElement('p', null, `${item?.title} body…`),
    });
  protected readonly invalid = () => createElement(InvalidDemo);
  protected readonly loader = () => createElement(LoaderDemo);
  protected readonly actions = () => createElement(ActionsDemo);
  protected readonly panelControl = () => createElement(PanelControlDemo);
  protected readonly styling = () => createElement(StylingDemo);
}
