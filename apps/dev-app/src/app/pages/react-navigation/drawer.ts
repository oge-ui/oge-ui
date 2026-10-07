import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  createElement,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  OgeDrawer,
  OgeTreeView,
  type OgeDrawerCloseReason,
  type OgeDrawerItem,
  type OgeDrawerMode,
  type OgeDrawerModeChangedEvent,
  type OgeDrawerPosition,
} from '@oge-ui/react-navigation';
import {
  OgeSplitter,
  OgeToolbar,
  type OgeSplitterSize,
  type OgeToolbarItemData,
} from '@oge-ui/react-layout';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { NAVIGATION_DRAWER_DEMOS } from './drawer-snippets';

/**
 * TOC of the React view — the same eight sections as the Angular drawer page
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_NAVIGATION_DRAWER_SECTIONS = [
  'Layout modes',
  'Position',
  'Modal drawer',
  'Compact rail',
  'Responsive downgrade',
  'Close guard',
  'App shell',
  'Navigation items',
  'Swipe gestures',
  'Configuration',
] as const;

const MODES: readonly OgeDrawerMode[] = ['overlay', 'push', 'side'];
const POSITIONS: readonly OgeDrawerPosition[] = [
  'start',
  'end',
  'top',
  'bottom',
];

const NAV = [
  { id: 1, parentId: null, text: 'Reports' },
  { id: 2, parentId: 1, text: 'Monthly' },
  { id: 3, parentId: 1, text: 'Quarterly' },
  { id: 4, parentId: null, text: 'Settings' },
];

/** The docs' plain button chrome, shared by the interactive demos. */
const demoButton = (
  key: string,
  label: string,
  onClick?: () => void,
  extra?: Record<string, unknown>,
) =>
  createElement(
    'button',
    {
      key,
      type: 'button',
      className: 'rounded border px-2 py-1 text-sm',
      onClick,
      ...extra,
    },
    label,
  );

/** The selected/unselected pair the mode and position pickers share. */
const pickerButton = (value: string, active: boolean, onClick: () => void) =>
  demoButton(value, value, onClick, {
    className: active
      ? 'rounded border px-2 py-1 text-sm font-semibold'
      : 'rounded border px-2 py-1 text-sm',
  });

/** The fixed-height frame every drawer preview sits in. */
const frame = (child: ReactNode, style?: CSSProperties) =>
  createElement(
    'div',
    { className: 'h-40 overflow-hidden rounded border', style },
    child,
  );

function ModesDemo(): ReactNode {
  const [opened, setOpened] = useState(true);
  const [mode, setMode] = useState<OgeDrawerMode>('side');
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-3 flex flex-wrap gap-2' },
      ...MODES.map((option) =>
        pickerButton(option, mode === option, () => setMode(option)),
      ),
    ),
    frame(
      createElement(
        OgeDrawer,
        {
          className: 'h-full',
          opened,
          onOpenedChange: setOpened,
          mode,
          ariaLabel: 'Layout modes demo',
          size: 180,
          panel: createElement(
            'div',
            { className: 'p-3 text-sm' },
            'Navigation…',
          ),
        },
        createElement(
          'div',
          { className: 'p-3 text-sm' },
          demoButton('toggle', 'Toggle', () => setOpened(!opened), {
            'aria-expanded': opened,
          }),
          createElement(
            'p',
            { className: 'mt-2 text-(--oge-muted-color)' },
            'overlay covers this, push shifts it, side shrinks it.',
          ),
        ),
      ),
    ),
  );
}

function PositionDemo(): ReactNode {
  const [opened, setOpened] = useState(false);
  const [position, setPosition] = useState<OgeDrawerPosition>('start');
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-3 flex flex-wrap gap-2' },
      ...POSITIONS.map((option) =>
        pickerButton(option, position === option, () => setPosition(option)),
      ),
    ),
    frame(
      createElement(
        OgeDrawer,
        {
          className: 'h-full',
          opened,
          onOpenedChange: setOpened,
          mode: 'overlay',
          ariaLabel: 'Position demo',
          position,
          size: 140,
          panel: createElement('div', { className: 'p-3 text-sm' }, 'Panel'),
        },
        createElement(
          'div',
          { className: 'p-3 text-sm' },
          demoButton('toggle', 'Toggle', () => setOpened(!opened)),
        ),
      ),
    ),
  );
}

function ModalDemo(): ReactNode {
  const [opened, setOpened] = useState(false);
  return frame(
    createElement(
      OgeDrawer,
      {
        className: 'h-full',
        opened,
        onOpenedChange: setOpened,
        mode: 'overlay',
        ariaLabel: 'Main menu',
        size: 180,
        showCloseButton: true,
        panel: createElement(
          'div',
          { className: 'p-3 text-sm' },
          demoButton('reports', 'Reports'),
        ),
      },
      createElement(
        'div',
        { className: 'p-3 text-sm' },
        demoButton('open', 'Open menu', () => setOpened(true), {
          'aria-expanded': opened,
        }),
        createElement(
          'p',
          { className: 'mt-2 text-(--oge-muted-color)' },
          'Escape, or a click on the backdrop, closes it and returns focus here.',
        ),
      ),
    ),
  );
}

const ICON = {
  inbox: 'M4 13h4l2 3h4l2-3h4M4 13l2-8h12l2 8v6H4z',
  send: 'M4 12l16-8-6 16-2-6-8-2z',
  star: 'M12 4l2.5 5 5.5.8-4 3.9.9 5.5L12 16.6 7.1 19.2 8 13.7 4 9.8 9.5 9z',
  trash: 'M5 7h14M9 7V5h6v2M7 7l1 12h8l1-12',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM4 12h2M18 12h2M12 4v2M12 18v2',
};

const ITEMS: OgeDrawerItem[] = [
  { key: 'inbox', text: 'Inbox', icon: ICON.inbox, badge: 4 },
  { key: 'sent', text: 'Sent', icon: ICON.send },
  { key: 'starred', text: 'Starred', icon: ICON.star },
  { separator: true },
  { key: 'trash', text: 'Trash', icon: ICON.trash, disabled: true },
  { key: 'settings', text: 'Settings', icon: ICON.settings },
];

function ItemsDemo(): ReactNode {
  const [opened, setOpened] = useState(true);
  const [page, setPage] = useState('inbox');
  return createElement(
    'div',
    { className: 'h-64 overflow-hidden rounded border' },
    createElement(
      OgeDrawer,
      {
        className: 'h-full',
        opened,
        onOpenedChange: setOpened,
        mode: 'side',
        ariaLabel: 'Mail folders',
        size: 200,
        minSize: 56,
        items: ITEMS,
        selectedKey: page,
        onSelectedKeyChange: setPage,
      },
      createElement(
        'div',
        { className: 'p-3 text-sm' },
        demoButton(
          'toggle',
          opened ? 'Collapse to rail' : 'Expand',
          () => setOpened(!opened),
          { 'aria-expanded': opened },
        ),
        createElement(
          'p',
          {
            className: 'mt-2 text-(--oge-muted-color)',
            'data-testid': 'drawer-items-page',
          },
          `Showing: ${page}`,
        ),
      ),
    ),
  );
}

function SwipeDemo(): ReactNode {
  const [opened, setOpened] = useState(false);
  const [lastClose, setLastClose] = useState<OgeDrawerCloseReason | null>(null);
  return createElement(
    'div',
    { className: 'h-48 overflow-hidden rounded border' },
    createElement(
      OgeDrawer,
      {
        className: 'h-full',
        opened,
        onOpenedChange: setOpened,
        mode: 'overlay',
        ariaLabel: 'Swipe menu',
        size: 200,
        swipeEnabled: true,
        onClosing: (event) => setLastClose(event.reason),
        panel: createElement(
          'div',
          { className: 'p-3 text-sm' },
          demoButton('reports', 'Reports'),
        ),
      },
      createElement(
        'div',
        { className: 'p-3 text-sm', 'data-testid': 'drawer-swipe-content' },
        demoButton('open', 'Open menu', () => setOpened(true), {
          'aria-expanded': opened,
        }),
        createElement(
          'p',
          { className: 'mt-2 text-(--oge-muted-color)' },
          'Or swipe in from the start edge.',
          lastClose ? ` Last close: ${lastClose}.` : '',
        ),
      ),
    ),
  );
}

function RailDemo(): ReactNode {
  const [opened, setOpened] = useState(false);
  return frame(
    createElement(
      OgeDrawer,
      {
        className: 'h-full',
        opened,
        onOpenedChange: setOpened,
        mode: 'side',
        ariaLabel: 'Compact rail demo',
        size: 180,
        minSize: 56,
        panel: createElement(
          'div',
          { className: 'p-3 text-sm' },
          demoButton('menu', '☰'),
        ),
      },
      createElement(
        'div',
        { className: 'p-3 text-sm' },
        demoButton('toggle', 'Toggle rail', () => setOpened(!opened)),
        createElement(
          'p',
          { className: 'mt-2 text-(--oge-muted-color)' },
          'Closed it is a rail, not a gap — and it stays keyboard reachable.',
        ),
      ),
    ),
  );
}

function CompactDemo(): ReactNode {
  const [opened, setOpened] = useState(true);
  const [width, setWidth] = useState(640);
  const [resolvedMode, setResolvedMode] = useState<OgeDrawerMode>('side');
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-3 flex items-center gap-2 text-sm' },
      createElement('label', { htmlFor: 'react-drawer-width' }, 'container'),
      createElement('input', {
        id: 'react-drawer-width',
        type: 'range',
        min: 300,
        max: 700,
        step: 10,
        value: width,
        onChange: (event: { target: { value: string } }) =>
          setWidth(Number(event.target.value)),
      }),
      createElement(
        'span',
        { className: 'text-(--oge-muted-color)' },
        `${width}px`,
      ),
    ),
    frame(
      createElement(
        OgeDrawer,
        {
          className: 'h-full',
          opened,
          onOpenedChange: setOpened,
          mode: 'side',
          ariaLabel: 'Responsive demo',
          size: 180,
          compactBelow: 400,
          onModeChanged: (event: OgeDrawerModeChangedEvent) =>
            setResolvedMode(event.mode),
          panel: createElement(
            'div',
            { className: 'p-3 text-sm' },
            'Navigation',
          ),
        },
        createElement(
          'div',
          { className: 'p-3 text-sm' },
          demoButton('toggle', 'Toggle', () => setOpened(!opened)),
        ),
      ),
      { maxWidth: `${width}px` },
    ),
    createElement(
      'p',
      { className: 'mt-2 text-sm text-(--oge-muted-color)' },
      `resolved mode → ${resolvedMode}`,
    ),
  );
}

function GuardDemo(): ReactNode {
  const [opened, setOpened] = useState(false);
  const [dirty, setDirty] = useState(true);
  return frame(
    createElement(
      OgeDrawer,
      {
        className: 'h-full',
        opened,
        onOpenedChange: setOpened,
        mode: 'overlay',
        ariaLabel: 'Close guard demo',
        size: 180,
        closeGuard: () => !dirty || confirm('Discard your changes?'),
        panel: createElement(
          'div',
          { className: 'p-3 text-sm' },
          'Unsaved edits…',
        ),
      },
      createElement(
        'div',
        { className: 'p-3 text-sm' },
        createElement(
          'label',
          { className: 'flex items-center gap-2' },
          createElement('input', {
            type: 'checkbox',
            checked: dirty,
            onChange: () => setDirty(!dirty),
          }),
          'pretend there are unsaved changes',
        ),
        createElement(
          'div',
          { className: 'mt-2' },
          demoButton('open', 'Open', () => setOpened(true)),
        ),
      ),
    ),
  );
}

function AppShellDemo(): ReactNode {
  const [menuOpen, setMenuOpen] = useState(true);
  const [sizes, setSizes] = useState<readonly OgeSplitterSize[]>([60, 40]);
  const commands: readonly OgeToolbarItemData[] = [
    { key: 'menu', text: 'Menu' },
    { key: 'save', text: 'Save', severity: 'accent', overflowPriority: 10 },
    { key: 'help', text: 'Help', location: 'after', overflowPriority: -1 },
  ];
  return createElement(
    'div',
    { className: 'overflow-hidden rounded border' },
    createElement(OgeToolbar, {
      stylingMode: 'flat',
      ariaLabel: 'Application',
      items: commands,
      onItemClick: (event: { key?: string }) => {
        if (event.key === 'menu') setMenuOpen(!menuOpen);
      },
    }),
    createElement(
      'div',
      { className: 'h-56' },
      createElement(
        OgeDrawer,
        {
          className: 'h-full',
          opened: menuOpen,
          onOpenedChange: setMenuOpen,
          mode: 'side',
          size: 180,
          compactBelow: 640,
          ariaLabel: 'Sections',
          panel: createElement(OgeTreeView, { items: NAV }),
        },
        createElement(OgeSplitter, {
          sizes,
          onSizesChange: setSizes,
          panes: [
            {
              key: 'list',
              content: createElement(
                'div',
                { className: 'p-3 text-sm' },
                'Rows…',
              ),
            },
            {
              key: 'detail',
              content: createElement(
                'div',
                { className: 'p-3 text-sm' },
                'Details…',
              ),
            },
          ],
        }),
      ),
    ),
  );
}

/**
 * The React half of the drawer page — the same eight demo sections as the
 * Angular page, with the same example content, rendered as real React trees
 * inside `/components/drawer` when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-navigation-drawer-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React drawer carries the class names but no styles of its own — the
  // docs pull the same SCSS the package build compiles. The app-shell section
  // puts a React toolbar and splitter around it, and the toolbar's overflow
  // menu renders through `@oge-ui/react-overlay`, so those stylesheets come
  // too.
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/navigation/src/styles.scss',
    '../../shared/react-layout-demo-base.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['mode', 'overlay', 'push', 'side']"
      heading="Layout modes"
      description="<code>overlay</code> floats over the content, <code>push</code> shifts it aside without resizing it, <code>side</code> shrinks it so both share the row. DevExtreme calls the last one <code>shrink</code> and Kendo calls it <code>push</code>; only DevExtreme and this drawer offer all three."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="modes" />
    </app-demo-card>

    <app-demo-card
      [chips]="['position', 'start', 'end', 'top', 'bottom']"
      heading="Position"
      description="Logical edges: <code>start</code> and <code>end</code> mirror in RTL on their own, because there is no <code>rtlEnabled</code> flag anywhere in this suite. Kendo is horizontal-only; this is the union of every edge the references offer."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="position" />
    </app-demo-card>

    <app-demo-card
      [chips]="['role=dialog', 'aria-modal', 'focus trap', 'inert']"
      heading="Modal drawer"
      description="An <code>overlay</code> drawer takes focus, traps Tab, closes on Escape and on a backdrop click, and marks the content behind it <code>inert</code> — which none of the four reference drawers does. Escape only acts on the topmost overlay, so a popup opened inside the drawer closes first."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="modal" />
    </app-demo-card>

    <app-demo-card
      [chips]="['minSize']"
      heading="Compact rail"
      description='<code>minSize</code> is the <em>closed</em> size — the rail that keeps icons reachable. It applies to <code>mode="side"</code> only: a rail belongs to the layout, and a modal drawer still partly on screen is not closed. Kendo spells this <code>mini</code> + <code>miniWidth</code>; one prop covers both.'
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="rail" />
    </app-demo-card>

    <app-demo-card
      [chips]="['compactBelow', 'onModeChanged']"
      heading="Responsive downgrade"
      description="DevExtreme and Kendo watch the <em>window</em>. This one measures its own container, so a drawer nested in a dialog, a split pane or this card adapts to the room it actually has. The decision is behavior's pure <code>resolveDrawerMode()</code>, unit-tested without a DOM."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="compact" />
    </app-demo-card>

    <app-demo-card
      [chips]="['closeGuard', 'closePending']"
      heading="Close guard"
      description="The overlay package's veto semantics, reused verbatim: <code>false</code>, a throw and a rejection all mean “stay open”, a promise reports pending, and a second close gesture meanwhile is dropped."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="guard" />
    </app-demo-card>

    <app-demo-card
      [chips]="['toolbar', 'drawer', 'splitter', 'tree view']"
      heading="App shell"
      description="The whole shell out of OGE containers: a toolbar on top, a drawer down the side holding the tree view that ships in the same package, and a splitter dividing the workspace. Drag the width and the shell reorganises itself from its own size."
      [code]="demos[6].source"
      language="tsx"
    >
      <app-react-host [render]="appShell" />
    </app-demo-card>

    <app-demo-card
      [chips]="['items', 'selectedKey', 'aria-current', 'mini rail']"
      heading="Navigation items"
      description="<code>items</code> renders the panel's navigation list for you: buttons, or links for entries with a <code>url</code>, with icons, badges, separators and disabled entries. Each entry stays in the Tab order (the APG disclosure-navigation shape, not a composite widget), the arrows / Home / End move between them, and the active one is <code>aria-current=&quot;page&quot;</code>. Closed with a <code>minSize</code> the drawer becomes an icon rail whose labels stay the accessible name and show as tooltips. <code>renderItem</code> replaces an entry's content."
      [code]="demos[7].source"
      language="tsx"
    >
      <app-react-host [render]="itemsDemo" />
    </app-demo-card>

    <app-demo-card
      [chips]="['swipeEnabled', 'touch', 'RTL', 'reason: swipe']"
      heading="Swipe gestures"
      description="With <code>swipeEnabled</code> a touch swipe from the drawer's edge opens it and a swipe toward the edge closes it — by distance or by a flick, touch pointers only, mirrored in RTL. A swipe that turns out to be a vertical scroll lets go of the page at once. Closing goes through <code>onClosing</code> and <code>closeGuard</code> with reason <code>'swipe'</code>. Off by default, so existing apps keep their behaviour. Try it on a touch screen."
      [code]="demos[8].source"
      language="tsx"
    >
      <app-react-host [render]="swipe" />
    </app-demo-card>

    <app-demo-card
      [chips]="['OgeDrawerConfigProvider']"
      heading="Configuration"
      description="Every user-facing string, including the panel's accessible name, lives in the messages interface — overridable for a subtree with <code>&lt;OgeDrawerConfigProvider&gt;</code> or per instance with the <code>messages</code> prop."
      [code]="demos[9].source"
      language="tsx"
    />
  `,
})
export class ReactNavigationDrawerDemos {
  protected readonly demos = NAVIGATION_DRAWER_DEMOS;

  protected readonly modes = () => createElement(ModesDemo);
  protected readonly position = () => createElement(PositionDemo);
  protected readonly modal = () => createElement(ModalDemo);
  protected readonly rail = () => createElement(RailDemo);
  protected readonly compact = () => createElement(CompactDemo);
  protected readonly guard = () => createElement(GuardDemo);
  protected readonly appShell = () => createElement(AppShellDemo);
  protected readonly itemsDemo = () => createElement(ItemsDemo);
  protected readonly swipe = () => createElement(SwipeDemo);
}
