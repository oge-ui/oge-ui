import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  Fragment,
  createElement,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  OgeToolbar,
  OgeToolbarConfigProvider,
  type OgeToolbarHandle,
  type OgeToolbarItemData,
  type OgeToolbarOverflow,
} from '@oge-ui/react-layout';
import { OgeSelectBox } from '@oge-ui/react-inputs';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { LAYOUT_TOOLBAR_DEMOS } from './toolbar-snippets';

/**
 * TOC of the React view — the same twelve sections, in the same order, as the
 * Angular toolbar page (`docs/REACT-PARITY.md`: pages mirror section for
 * section).
 */
export const REACT_LAYOUT_TOOLBAR_SECTIONS = [
  'Commands',
  'Data-driven items',
  'Location groups',
  'Overflow menu',
  'Overflow priority',
  'Overflow modes',
  'Toggle commands',
  'Runtime changes',
  'Icon-only commands',
  'Custom content',
  'Keyboard & accessibility',
  'Configuration',
] as const;

const BOLD_PATH = 'M5 3h4a3 3 0 0 1 0 6H5zM5 9h5a3 3 0 0 1 0 6H5z';
const ITALIC_PATH = 'M10 3H6m4 0-3 10m0 0H3m4 0h3';
const UNDERLINE_PATH = 'M4 3v5a4 4 0 0 0 8 0V3M3 14h10';

const row = (...children: ReactNode[]) =>
  createElement('div', { className: 'demo-row demo-row-start' }, ...children);

const note = (...children: ReactNode[]) =>
  createElement('p', { className: 'mt-2 text-sm opacity-70' }, ...children);

const smallButton = (
  key: string,
  label: string,
  onClick: () => void,
  emphasized = false,
) =>
  createElement(
    'button',
    {
      key,
      type: 'button',
      className: `rounded border px-2 py-1 text-sm${
        emphasized ? ' font-semibold' : ''
      }`,
      onClick,
    },
    label,
  );

/** The width slider the overflow demos share with the Angular page. */
const widthSlider = (
  id: string,
  width: number,
  setWidth: (value: number) => void,
) =>
  createElement(
    'div',
    { className: 'mb-3 flex items-center gap-2 text-sm' },
    createElement('label', { key: 'l', htmlFor: id }, 'width'),
    createElement('input', {
      key: 'i',
      id,
      type: 'range',
      min: 220,
      max: 720,
      step: 10,
      value: width,
      onChange: (event: { target: { value: string } }) =>
        setWidth(Number(event.target.value)),
    }),
    createElement('span', { key: 's', className: 'opacity-70' }, `${width}px`),
  );

const COMMANDS: readonly OgeToolbarItemData[] = [
  { key: 'new', text: 'New' },
  { key: 'open', text: 'Open' },
  { key: 'sep', type: 'separator' },
  { key: 'save', text: 'Save', severity: 'accent' },
  { key: 'delete', text: 'Delete', severity: 'danger', location: 'after' },
];

const TOOLS: readonly OgeToolbarItemData[] = [
  { key: 'undo', text: 'Undo' },
  { key: 'redo', text: 'Redo' },
  { key: 'sep', type: 'separator' },
  { key: 'bold', text: 'Bold', active: true },
  { key: 'note', type: 'label', text: 'Draft' },
  { key: 'publish', text: 'Publish', location: 'after', severity: 'accent' },
];

const LOCATIONS: readonly OgeToolbarItemData[] = [
  { key: 'back', text: 'Back', location: 'before' },
  { key: 'file', type: 'label', text: 'report.xlsx', location: 'center' },
  { key: 'share', text: 'Share', location: 'after' },
];

const OVERFLOW_ITEMS: readonly OgeToolbarItemData[] = [
  { key: 'cut', text: 'Cut', locateInMenu: 'never' },
  { key: 'copy', text: 'Copy' },
  { key: 'paste', text: 'Paste' },
  { key: 'paste-special', text: 'Paste special' },
  { key: 'print', text: 'Print preview' },
  { key: 'settings', text: 'Document settings', locateInMenu: 'always' },
];

const PRIORITY_ITEMS: readonly OgeToolbarItemData[] = [
  { key: 'open', text: 'Open' },
  { key: 'print', text: 'Print preview', overflowPriority: -1 },
  { key: 'settings', text: 'Document settings', overflowPriority: -1 },
  { key: 'save', text: 'Save', severity: 'accent', overflowPriority: 10 },
];

const MODE_ITEMS: readonly OgeToolbarItemData[] = [
  { key: 'cut', text: 'Cut' },
  { key: 'copy', text: 'Copy' },
  { key: 'paste', text: 'Paste' },
  { key: 'paste-special', text: 'Paste special' },
  { key: 'print', text: 'Print preview' },
];

const MODES: readonly OgeToolbarOverflow[] = [
  'menu',
  'scroll',
  'wrap',
  'extended',
  'none',
];

const RUNTIME_TOOLS: readonly OgeToolbarItemData[] = [
  { key: 'cut', text: 'Cut' },
  { key: 'copy', text: 'Copy' },
  { key: 'paste', text: 'Paste' },
];

const ICON_ITEMS: readonly OgeToolbarItemData[] = [
  { key: 'bold', text: 'Bold', icon: BOLD_PATH },
  { key: 'italic', text: 'Italic', icon: ITALIC_PATH },
  {
    key: 'underline',
    text: 'Underline',
    icon: UNDERLINE_PATH,
    showText: 'always',
  },
];

const KEYBOARD_ITEMS: readonly OgeToolbarItemData[] = [
  { key: 'select', text: 'Select' },
  { key: 'move', text: 'Move', disabled: true },
  { key: 'zoom', text: 'Zoom' },
];

const LOCALIZED: readonly OgeToolbarItemData[] = [
  { key: 'yeni', text: 'Yeni' },
  { key: 'kaydet', text: 'Kaydet', severity: 'accent' },
  { key: 'ayarlar', text: 'Ayarlar', locateInMenu: 'always' },
];

const VIEWS = ['All', 'Mine', 'Archived'];

/** One component-level `onItemClick` reports whichever command ran. */
function CommandsDemo(): ReactNode {
  const [last, setLast] = useState('—');
  return createElement(
    Fragment,
    null,
    createElement(OgeToolbar, {
      key: 'bar',
      ariaLabel: 'Document actions',
      items: COMMANDS,
      onItemClick: (event) => setLast(event.item?.text ?? ''),
    }),
    note('last command → ', last),
  );
}

function ItemsDemo(): ReactNode {
  const [last, setLast] = useState('—');
  return createElement(
    Fragment,
    null,
    createElement(OgeToolbar, {
      key: 'bar',
      items: TOOLS,
      onItemClick: (event) =>
        setLast(`${event.key} (${event.inMenu ? 'menu' : 'bar'})`),
    }),
    note('last command → ', last),
  );
}

function OverflowDemo(): ReactNode {
  const [width, setWidth] = useState(520);
  const [inMenu, setInMenu] = useState(0);
  return createElement(
    Fragment,
    null,
    widthSlider('react-tb-width', width, setWidth),
    createElement(
      'div',
      { key: 'box', style: { maxWidth: width } },
      createElement(OgeToolbar, {
        overflow: 'menu',
        items: OVERFLOW_ITEMS,
        onOverflowChanged: (event) => setInMenu(event.count),
      }),
    ),
    note('in the menu → ', inMenu, ' command(s)'),
  );
}

function PriorityDemo(): ReactNode {
  const [width, setWidth] = useState(520);
  return createElement(
    Fragment,
    null,
    widthSlider('react-tb-priority-width', width, setWidth),
    createElement(
      'div',
      { key: 'box', style: { maxWidth: width } },
      createElement(OgeToolbar, {
        overflow: 'menu',
        items: PRIORITY_ITEMS,
      }),
    ),
    note(
      'Narrow it: “Save” sits last on the bar and is still the last to leave.',
    ),
  );
}

function ModesDemo(): ReactNode {
  const [mode, setMode] = useState<OgeToolbarOverflow>('extended');
  return createElement(
    Fragment,
    null,
    row(
      ...MODES.map((option) =>
        smallButton(option, option, () => setMode(option), mode === option),
      ),
    ),
    createElement(
      'div',
      { key: 'box', className: 'max-w-sm' },
      createElement(OgeToolbar, { overflow: mode, items: MODE_ITEMS }),
    ),
  );
}

/**
 * The React toggle is controlled: `items` entries are data the toolbar must not
 * mutate, so it reports through `onActiveChanged` and the app applies it.
 */
function ToggleDemo(): ReactNode {
  const [bold, setBold] = useState(true);
  const [italic, setItalic] = useState(false);
  const [last, setLast] = useState('—');
  const items: readonly OgeToolbarItemData[] = [
    { key: 'bold', text: 'Bold', active: bold },
    { key: 'italic', text: 'Italic', active: italic },
  ];
  return createElement(
    Fragment,
    null,
    createElement(OgeToolbar, {
      key: 'bar',
      items,
      onActiveChanged: (event) => {
        if (event.key === 'bold') setBold(event.active);
        if (event.key === 'italic') setItalic(event.active);
        setLast(`${event.key} → ${event.active}`);
      },
    }),
    note(`bold ${bold} · italic ${italic} · last `, last),
  );
}

function RuntimeDemo(): ReactNode {
  const bar = useRef<OgeToolbarHandle>(null);
  return createElement(
    Fragment,
    null,
    createElement(OgeToolbar, { key: 'bar', ref: bar, items: RUNTIME_TOOLS }),
    row(
      smallButton('add', 'addItem', () =>
        bar.current?.addItem({ key: 'new', text: 'Added' }),
      ),
      smallButton('hide', "hideItem('copy')", () =>
        bar.current?.hideItem('copy'),
      ),
      smallButton('disable', "disable('paste')", () =>
        bar.current?.enableItem('paste', false),
      ),
      smallButton('reset', 'reset', () => bar.current?.clearItemOverrides()),
      smallButton('refresh', 'refreshOverflow()', () =>
        bar.current?.refreshOverflow(),
      ),
    ),
  );
}

function SlotsDemo(): ReactNode {
  const [view, setView] = useState<unknown>('All');
  return createElement(OgeToolbar, {
    items: [{ key: 'view', text: 'View' }],
    renderItem: () =>
      createElement(OgeSelectBox, {
        label: 'View',
        items: VIEWS,
        value: view,
        onValueChange: setView,
        size: 'sm',
      }),
    after: createElement('input', {
      className: 'rounded border px-2 py-1 text-sm',
      type: 'search',
      placeholder: 'Search…',
      'aria-label': 'Search',
    }),
  });
}

/**
 * The React half of the toolbar page — the same twelve demo sections as the
 * Angular view, with the same example content, rendered as real React trees
 * inside `/components/toolbar` when the reader has chosen React (ADR 0002).
 *
 * The one idiom difference: Angular's declarative `<oge-toolbar-item>` children
 * have no React counterpart, so every section drives the bar from the `items`
 * array plus the component-level callbacks and render props.
 */
@Component({
  selector: 'app-react-layout-toolbar-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React toolbar carries the class names but no styles of its own — the
  // docs pull the same SCSS the package build compiles. The overflow menu
  // renders through `@oge-ui/react-overlay`, and the "Custom content" section
  // puts a React select box on the bar, so those stylesheets come too.
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/layout/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['items', 'severity', 'separator']"
      heading="Commands"
      description="Every entry of the <code>items</code> array renders a button by default. <code>severity</code> picks the emphasis, <code>type: 'separator'</code> draws a rule, and one component-level <code>onItemClick</code> reports whichever command ran."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="commands" />
    </app-demo-card>

    <app-demo-card
      [chips]="['items', 'onItemClick', 'label', 'active']"
      heading="Data-driven items"
      description="The <code>items</code> array is the only item source in React — there is no child component to project, so the merge rule the Angular family needs does not arise. An entry with a defined <code>active</code> renders a toggle button with <code>aria-pressed</code>."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="items" />
    </app-demo-card>

    <app-demo-card
      [chips]="['location', 'before', 'center', 'after']"
      heading="Location groups"
      description="<code>before</code> and <code>after</code> take their natural width; <code>center</code> claims the rest and centres inside it. Everything uses logical properties, so the order mirrors in RTL with no flag to set."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="locations" />
    </app-demo-card>

    <app-demo-card
      [chips]="['overflow', 'locateInMenu', 'onOverflowChanged']"
      heading="Overflow menu"
      description="Drag the width down and the trailing commands collapse into the menu. <code>locateInMenu</code> defaults to <code>'auto'</code>; <code>'always'</code> pins an item to the menu whatever the width, <code>'never'</code> keeps it on the bar even if the row overflows."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="overflow" />
    </app-demo-card>

    <app-demo-card
      [chips]="['overflowPriority']"
      heading="Overflow priority"
      description="Every reference toolbar drops strictly from the end of the row, so keeping a primary command means moving it to the front. <code>overflowPriority</code> separates yield order from visual order — higher survives longer — and equal priorities fall back to end-first, so the default reproduces the reference behaviour exactly."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="priority" />
    </app-demo-card>

    <app-demo-card
      [chips]="['menu', 'scroll', 'wrap', 'extended', 'none']"
      heading="Overflow modes"
      description="Five modes, one prop — the union of every mode the reference libraries offer. <code>scroll</code> keeps a single line and adds arrows, <code>extended</code> hides the remainder in a second row behind a toggle that names it through <code>aria-controls</code>."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="modes" />
    </app-demo-card>

    <app-demo-card
      [chips]="['active', 'aria-pressed', 'onActiveChanged']"
      heading="Toggle commands"
      description="A defined <code>active</code> is what makes an item a toggle. <code>items</code> entries are data the toolbar must not mutate, so a React toggle is controlled: the component reports through <code>onActiveChanged</code> and the application applies the new value."
      [code]="demos[6].source"
      language="tsx"
    >
      <app-react-host [render]="toggle" />
    </app-demo-card>

    <app-demo-card
      [chips]="['addItem', 'hideItem', 'enableItem', 'refreshOverflow']"
      heading="Runtime changes"
      description="<code>items</code> stays the declared source of truth and the <code>ref</code> handle is an override layer on top of it — so a re-supplied array cannot silently undo a <code>hideItem()</code>. <code>dataSource</code> loads the same shape from a server."
      [code]="demos[7].source"
      language="tsx"
    >
      <app-react-host [render]="runtime" />
    </app-demo-card>

    <app-demo-card
      [chips]="['showText', 'icon', 'aria-label']"
      heading="Icon-only commands"
      description='<code>showText="inMenu"</code> renders the bar entry icon-only and keeps the label for the overflow menu. The button never loses its accessible name — the text becomes its <code>aria-label</code>.'
      [code]="demos[8].source"
      language="tsx"
    >
      <app-react-host [render]="icons" />
    </app-demo-card>

    <app-demo-card
      [chips]="['after slot', 'renderItem']"
      heading="Custom content"
      description="Two escape hatches instead of a string-keyed <code>widget</code> + <code>options</code> bag. The <code>before</code> / <code>center</code> / <code>after</code> node slots put any control straight on the bar — where it stays, because the toolbar cannot re-render DOM it does not own. A <code>renderItem</code> render prop replaces the rendering of the entries the toolbar <em>does</em> own, so such an entry can still collapse into the menu."
      [code]="demos[9].source"
      language="tsx"
    >
      <app-react-host [render]="slots" />
    </app-demo-card>

    <app-demo-card
      [chips]="['roving tabindex', 'orientation', 'wrap']"
      heading="Keyboard &amp; accessibility"
      description="One Tab stop for the whole toolbar, arrow keys between the controls, Home/End to the ends, disabled controls skipped. A vertical toolbar uses Up/Down and reports <code>aria-orientation</code>. A text input inside keeps its own arrow and Home/End keys — the APG warns against stealing them."
      [code]="demos[10].source"
      language="tsx"
    >
      <app-react-host [render]="keyboard" />
    </app-demo-card>

    <app-demo-card
      [chips]="['OgeToolbarConfigProvider']"
      heading="Configuration"
      description="Every user-facing string — including the overflow button's accessible name — lives in the messages interface, overridable application-wide with <code>&lt;OgeToolbarConfigProvider&gt;</code> or per instance with the <code>messages</code> prop."
      [code]="demos[11].source"
      language="tsx"
    >
      <app-react-host [render]="config" />
    </app-demo-card>
  `,
})
export class ReactLayoutToolbarDemos {
  protected readonly demos = LAYOUT_TOOLBAR_DEMOS;

  protected readonly commands = () => createElement(CommandsDemo);
  protected readonly items = () => createElement(ItemsDemo);
  protected readonly overflow = () => createElement(OverflowDemo);
  protected readonly priority = () => createElement(PriorityDemo);
  protected readonly modes = () => createElement(ModesDemo);
  protected readonly toggle = () => createElement(ToggleDemo);
  protected readonly runtime = () => createElement(RuntimeDemo);
  protected readonly slots = () => createElement(SlotsDemo);

  protected readonly locations = () =>
    createElement(OgeToolbar, { items: LOCATIONS });

  protected readonly icons = () =>
    createElement(OgeToolbar, { showText: 'inMenu', items: ICON_ITEMS });

  protected readonly keyboard = () =>
    createElement(OgeToolbar, {
      orientation: 'vertical',
      ariaLabel: 'Tools',
      wrap: false,
      items: KEYBOARD_ITEMS,
    });

  protected readonly config = () =>
    createElement(
      OgeToolbarConfigProvider,
      {
        config: {
          size: 'sm',
          stylingMode: 'flat',
          messages: {
            toolbar: 'Araç çubuğu',
            overflowMenu: 'Daha fazla komut',
            noData: 'Gösterilecek komut yok',
          },
        },
      },
      createElement(OgeToolbar, {
        items: LOCALIZED,
        messages: { toolbar: 'Araç çubuğu', overflowMenu: 'Daha fazla' },
      }),
    );
}
