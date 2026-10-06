import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  createElement,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { applyMenuItemCheck } from '@oge-ui/react-overlay';
import {
  OgeMenubar,
  OgeMenubarConfigProvider,
  type OgeMenubarItemClickEvent,
  type OgeMenubarItemData,
  type OgeMenubarSubmenuClosingEvent,
  type OgeMenubarSubmenuOpeningEvent,
} from '@oge-ui/react-navigation';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { NAVIGATION_MENUBAR_DEMOS } from './menubar-snippets';

/**
 * TOC of the React view — the same nine sections as the Angular menubar page
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_NAVIGATION_MENUBAR_SECTIONS = [
  'Getting started',
  'Declarative items',
  'Radio & checkbox items',
  'Open mode',
  'Vertical menubar',
  'Adaptive hamburger',
  'Overflow into More',
  'Cancelable events',
  'Configuration',
] as const;

/** The Angular page's example menu, verbatim — the mirror is content too. */
const FILE_MENU: readonly OgeMenubarItemData[] = [
  {
    text: 'File',
    items: [
      { text: 'New', key: 'new', shortcut: 'Ctrl+N' },
      { text: 'Open…', key: 'open', shortcut: 'Ctrl+O' },
      { separator: true, text: '' },
      {
        text: 'Share',
        badge: 2,
        items: [
          { text: 'Email', key: 'email' },
          { text: 'Copy link', key: 'copy-link', shortcut: 'Ctrl+Shift+C' },
        ],
      },
    ],
  },
  {
    text: 'Edit',
    items: [
      { text: 'Undo', key: 'undo', shortcut: 'Ctrl+Z' },
      { text: 'Redo', key: 'redo', disabled: true, shortcut: 'Ctrl+Y' },
    ],
  },
  { text: 'Help', key: 'help' },
];

const VERTICAL_MENU: readonly OgeMenubarItemData[] = [
  { text: 'Dashboard', key: 'dashboard' },
  {
    text: 'Reports',
    items: [
      { text: 'Monthly', key: 'monthly' },
      { text: 'Annual', key: 'annual' },
    ],
  },
  { text: 'Settings', items: [{ text: 'Profile', key: 'profile' }] },
];

/** The declarative section's tree — as data, the only React idiom for it. */
const DECLARATIVE_MENU: readonly OgeMenubarItemData[] = [
  {
    text: 'File',
    items: [
      { text: 'New', key: 'new' },
      { separator: true, text: '' },
      { text: 'Exit', key: 'exit' },
    ],
  },
  { text: 'Help', key: 'help' },
];

/** The "Radio & checkbox items" tree — the application owns `checked`. */
const VIEW_MENU: readonly OgeMenubarItemData[] = [
  {
    text: 'View',
    items: [
      { text: 'Layout', type: 'header' },
      { text: 'Grid', type: 'radio', group: 'layout', checked: true },
      { text: 'List', type: 'radio', group: 'layout' },
      { text: 'Details', type: 'radio', group: 'layout' },
      { separator: true, text: '' },
      { text: 'Show', type: 'header' },
      { text: 'Status bar', key: 'status', type: 'checkbox', checked: true },
      { text: 'Hidden files', key: 'hidden', type: 'checkbox' },
      { text: 'Word wrap', key: 'wrap', type: 'checkbox', keepOpen: true },
    ],
  },
  { text: 'Help', key: 'help' },
];

/** The "Overflow into More" bar — wide enough to overflow. */
const WIDE_MENU: readonly OgeMenubarItemData[] = [
  { text: 'File', items: [{ text: 'New' }, { text: 'Open…' }] },
  { text: 'Edit', items: [{ text: 'Undo' }, { text: 'Redo' }] },
  { text: 'View', items: [{ text: 'Zoom in' }, { text: 'Zoom out' }] },
  { text: 'Insert', items: [{ text: 'Image' }, { text: 'Table' }] },
  { text: 'Tools', items: [{ text: 'Options' }] },
  { text: 'Help', key: 'help', overflow: 'never' },
];

function describeViewState(items: readonly OgeMenubarItemData[]): string {
  const rows = items[0]?.items ?? [];
  const layout = rows.find((r) => r.type === 'radio' && r.checked)?.text;
  const shown = rows
    .filter((r) => r.type === 'checkbox' && r.checked)
    .map((r) => r.text);
  return `${layout ?? '—'} · ${shown.length ? shown.join(', ') : 'nothing shown'}`;
}

function CheckItemsDemo(): ReactNode {
  const [menu, setMenu] = useState(VIEW_MENU);
  return createElement(
    'div',
    null,
    createElement(OgeMenubar, {
      items: menu,
      onItemClick: (event: OgeMenubarItemClickEvent) => {
        if (event.checked === undefined) return;
        setMenu((items) => applyMenuItemCheck(items, event.item));
      },
    }),
    createElement(
      'p',
      { className: 'mt-3 text-sm', 'data-testid': 'menubar-check-state' },
      'State: ',
      createElement('code', null, describeViewState(menu)),
    ),
  );
}

function OverflowDemo(): ReactNode {
  const [width, setWidth] = useState(360);
  return createElement(
    'div',
    null,
    createElement(
      'label',
      { className: 'mb-2 flex items-center gap-2 text-sm' },
      'Container width',
      createElement('input', {
        type: 'range',
        min: 200,
        max: 720,
        value: width,
        onChange: (event: ChangeEvent<HTMLInputElement>) =>
          setWidth(+event.target.value),
      }),
      createElement('code', null, `${width}px`),
    ),
    createElement(
      'div',
      {
        className: 'rounded border p-2',
        'data-testid': 'menubar-overflow-frame',
        style: { width, maxWidth: '100%' },
      },
      createElement(OgeMenubar, { items: WIDE_MENU, overflowMode: 'more' }),
    ),
  );
}

function BasicsDemo(): ReactNode {
  const [last, setLast] = useState('—');
  return createElement(
    'div',
    null,
    createElement(OgeMenubar, {
      items: FILE_MENU,
      onItemClick: (event: OgeMenubarItemClickEvent) =>
        setLast(`${event.key ?? event.item.text} [${event.path.join(', ')}]`),
    }),
    createElement(
      'p',
      { className: 'mt-3 text-sm', 'data-testid': 'menubar-log' },
      'Last click: ',
      createElement('code', null, last),
    ),
  );
}

function CompactDemo(): ReactNode {
  const [width, setWidth] = useState(640);
  return createElement(
    'div',
    null,
    createElement(
      'label',
      { className: 'mb-2 flex items-center gap-2 text-sm' },
      'Container width',
      createElement('input', {
        type: 'range',
        min: 200,
        max: 640,
        value: width,
        onChange: (event: ChangeEvent<HTMLInputElement>) =>
          setWidth(+event.target.value),
      }),
      createElement('code', null, `${width}px`),
    ),
    createElement(
      'div',
      { className: 'rounded border p-2', style: { width } },
      createElement(OgeMenubar, { items: FILE_MENU, compactBelow: 420 }),
    ),
  );
}

function EventsDemo(): ReactNode {
  const [locked, setLocked] = useState(false);
  // The menubar's callbacks run inside its own event pipeline, so they read
  // the latest value from a ref rather than the render that created them.
  const lockedRef = useRef(locked);
  lockedRef.current = locked;
  return createElement(
    'div',
    null,
    createElement(
      'label',
      { className: 'mb-2 flex items-center gap-2 text-sm' },
      createElement('input', {
        type: 'checkbox',
        checked: locked,
        onChange: (event: ChangeEvent<HTMLInputElement>) =>
          setLocked(event.target.checked),
      }),
      'Lock the submenu (cancel opening and closing)',
    ),
    createElement(OgeMenubar, {
      items: FILE_MENU,
      onSubmenuOpening: (event: OgeMenubarSubmenuOpeningEvent) => {
        if (lockedRef.current) event.cancel = true;
      },
      onSubmenuClosing: (event: OgeMenubarSubmenuClosingEvent) => {
        if (lockedRef.current && event.reason !== 'tab') event.cancel = true;
      },
    }),
  );
}

/**
 * The React half of the menubar page — the same nine demo sections as the
 * Angular page, with the same example menu, rendered as real React trees
 * inside `/components/menubar` when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-navigation-menubar-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React menubar carries the class names but no styles of its own —
  // the docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/navigation/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['items', 'onItemClick', 'path']"
      heading="Getting started"
      description="One <code>items</code> tree; children at any depth open as nested submenus. <code>onItemClick</code> reports the item, its <code>key</code> and the hierarchical index <code>path</code>. <code>shortcut</code> renders a right-aligned accelerator hint (announced via <code>aria-keyshortcuts</code>; the binding stays yours) and <code>badge</code> a counter pill. Try the keyboard: Left/Right, Down to open, ArrowRight on <em>Share</em>, Escape to unwind."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basics" />
    </app-demo-card>

    <app-demo-card
      [chips]="['items', 'no item child']"
      heading="Declarative items"
      description="Angular offers two APIs here and merges declarative <code>&lt;oge-menubar-item&gt;</code> children before the <code>items</code> input. <strong>React has one</strong>: the <code>items</code> array. An item component could not carry the identity anyway — React reserves the <code>key</code> prop — so nesting is data at every depth, and there is no merge order to remember."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="declarative" />
    </app-demo-card>

    <app-demo-card
      [chips]="['type', 'group', 'header', 'keepOpen']"
      heading="Radio & checkbox items"
      description="Submenu rows take a <code>type</code>: <code>'radio'</code> renders <code>menuitemradio</code> (one per <code>group</code>), <code>'checkbox'</code> renders <code>menuitemcheckbox</code>, both with <code>aria-checked</code> and an accent glyph; a <code>'header'</code> row is a non-focusable caption that labels the rows after it as a <code>role=&quot;group&quot;</code> and is skipped by the arrow keys and type-ahead. The menubar never mutates <code>checked</code> — <code>onItemClick</code> reports the next state and <code>applyMenuItemCheck</code> applies it. Space toggles without closing the menu (APG); <em>Word wrap</em> sets <code>keepOpen</code> and stays open on a click too."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="checkItems" />
    </app-demo-card>

    <app-demo-card
      [chips]="['openMode', 'hoverDelay']"
      heading="Open mode"
      description="<code>openMode</code> governs the <strong>top level only</strong>: <code>click</code> (default, the desktop convention) or <code>hover</code> after <code>hoverDelay</code>. Nested levels always open on hover and ArrowRight — DevExtreme's <code>showFirstSubmenuMode</code>/<code>showSubmenuMode</code> split collapsed into behavior. With a menu open, hovering siblings switches in either mode."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="openMode" />
    </app-demo-card>

    <app-demo-card
      [chips]="['orientation', 'aria-orientation']"
      heading="Vertical menubar"
      description='Same widget, same roles: <code>aria-orientation="vertical"</code> is announced, Up/Down traverse the bar and ArrowRight opens the submenu beside it — the axis swap the APG prescribes.'
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="vertical" />
    </app-demo-card>

    <app-demo-card
      [chips]="['compactBelow', 'container width', 'hamburger']"
      heading="Adaptive hamburger"
      description="<code>compactBelow</code> measures the menubar's <strong>own container</strong>, never the window — a bar inside a split pane adapts to the room it actually has. Below the threshold the whole bar becomes one hamburger button opening the full tree as nested menus. Drag the range to squeeze it."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="compact" />
    </app-demo-card>

    <app-demo-card
      [chips]="['overflowMode', 'more', 'overflow']"
      heading="Overflow into More"
      description="<code>overflowMode=&quot;more&quot;</code> keeps the bar and moves only the top-level items that do not fit into a trailing <em>More</em> item whose submenu holds them, their own submenus included — DevExtreme's adaptive menu and PrimeNG's overflow bar instead of an all-or-nothing hamburger. The last <code>'auto'</code> item yields first; <code>overflow: 'never'</code> pins <em>Help</em> to the bar and <code>'always'</code> would park an item in More. More takes part in the roving tabindex, reads as current when the active item moved into it, and <code>onItemClick</code> still reports each item's real <code>path</code>. Drag the range to squeeze it."
      [code]="demos[6].source"
      language="tsx"
    >
      <app-react-host [render]="overflow" />
    </app-demo-card>

    <app-demo-card
      [chips]="['onSubmenuOpening', 'onSubmenuClosing', 'cancel']"
      heading="Cancelable events"
      description="The <code>-ing</code> pair carries the house mutable <code>cancel</code> flag. Closes the menubar itself initiates (<code>escape</code>, <code>select</code>, <code>navigation</code>, <code>api</code>) are interceptable; pointer closes owned by the overlay (<code>outside</code>) and Tab only report <code>onSubmenuClosed</code>. Lock the menu and try to open or Escape it."
      [code]="demos[7].source"
      language="tsx"
    >
      <app-react-host [render]="events" />
    </app-demo-card>

    <app-demo-card
      [chips]="['OgeMenubarConfigProvider', 'messages']"
      heading="Configuration"
      description="Subtree defaults for <code>openMode</code>, <code>hoverDelay</code>, <code>orientation</code> and <code>compactBelow</code>, plus every user-facing string — the bar's accessible name and the hamburger label included — via <code>&lt;OgeMenubarConfigProvider&gt;</code>. Instance props still win."
      [code]="demos[8].source"
      language="tsx"
    >
      <app-react-host [render]="config" />
    </app-demo-card>
  `,
})
export class ReactNavigationMenubarDemos {
  protected readonly demos = NAVIGATION_MENUBAR_DEMOS;

  protected readonly basics = () => createElement(BasicsDemo);
  protected readonly compact = () => createElement(CompactDemo);
  protected readonly events = () => createElement(EventsDemo);
  protected readonly checkItems = () => createElement(CheckItemsDemo);
  protected readonly overflow = () => createElement(OverflowDemo);

  protected readonly declarative = () =>
    createElement(OgeMenubar, { items: DECLARATIVE_MENU });

  protected readonly openMode = () =>
    createElement(OgeMenubar, {
      items: FILE_MENU,
      openMode: 'hover',
      hoverDelay: 150,
    });

  protected readonly vertical = () =>
    createElement(OgeMenubar, {
      orientation: 'vertical',
      items: VERTICAL_MENU,
    });

  protected readonly config = () =>
    createElement(
      OgeMenubarConfigProvider,
      { config: { messages: { menubar: 'Ana menü', hamburger: 'Menü' } } },
      createElement(OgeMenubar, { items: FILE_MENU }),
    );
}
