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
 * TOC of the React view — the same seven sections as the Angular menubar page
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_NAVIGATION_MENUBAR_SECTIONS = [
  'Getting started',
  'Declarative items',
  'Open mode',
  'Vertical menubar',
  'Adaptive hamburger',
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
 * The React half of the menubar page — the same seven demo sections as the
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
      [chips]="['openMode', 'hoverDelay']"
      heading="Open mode"
      description="<code>openMode</code> governs the <strong>top level only</strong>: <code>click</code> (default, the desktop convention) or <code>hover</code> after <code>hoverDelay</code>. Nested levels always open on hover and ArrowRight — DevExtreme's <code>showFirstSubmenuMode</code>/<code>showSubmenuMode</code> split collapsed into behavior. With a menu open, hovering siblings switches in either mode."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="openMode" />
    </app-demo-card>

    <app-demo-card
      [chips]="['orientation', 'aria-orientation']"
      heading="Vertical menubar"
      description='Same widget, same roles: <code>aria-orientation="vertical"</code> is announced, Up/Down traverse the bar and ArrowRight opens the submenu beside it — the axis swap the APG prescribes.'
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="vertical" />
    </app-demo-card>

    <app-demo-card
      [chips]="['compactBelow', 'container width', 'hamburger']"
      heading="Adaptive hamburger"
      description="<code>compactBelow</code> measures the menubar's <strong>own container</strong>, never the window — a bar inside a split pane adapts to the room it actually has. Below the threshold the whole bar becomes one hamburger button opening the full tree as nested menus. Drag the range to squeeze it."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="compact" />
    </app-demo-card>

    <app-demo-card
      [chips]="['onSubmenuOpening', 'onSubmenuClosing', 'cancel']"
      heading="Cancelable events"
      description="The <code>-ing</code> pair carries the house mutable <code>cancel</code> flag. Closes the menubar itself initiates (<code>escape</code>, <code>select</code>, <code>navigation</code>, <code>api</code>) are interceptable; pointer closes owned by the overlay (<code>outside</code>) and Tab only report <code>onSubmenuClosed</code>. Lock the menu and try to open or Escape it."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="events" />
    </app-demo-card>

    <app-demo-card
      [chips]="['OgeMenubarConfigProvider', 'messages']"
      heading="Configuration"
      description="Subtree defaults for <code>openMode</code>, <code>hoverDelay</code>, <code>orientation</code> and <code>compactBelow</code>, plus every user-facing string — the bar's accessible name and the hamburger label included — via <code>&lt;OgeMenubarConfigProvider&gt;</code>. Instance props still win."
      [code]="demos[6].source"
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
