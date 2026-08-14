import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  OgeMenubar,
  OgeMenubarItem,
  type OgeMenubarItemClickEvent,
  type OgeMenubarItemData,
  type OgeMenubarSubmenuClosingEvent,
  type OgeMenubarSubmenuOpeningEvent,
} from '@oge-ui/navigation';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_NAVIGATION_MENUBAR_SECTIONS,
  ReactNavigationMenubarDemos,
} from '../react-navigation/menubar';
import {
  BASIC_SNIPPET,
  COMPACT_SNIPPET,
  CONFIG_SNIPPET,
  DECLARATIVE_SNIPPET,
  EVENTS_SNIPPET,
  OPEN_MODE_SNIPPET,
  VERTICAL_SNIPPET,
} from './menubar-snippets';

const SECTIONS = [
  'Getting started',
  'Declarative items',
  'Open mode',
  'Vertical menubar',
  'Adaptive hamburger',
  'Cancelable events',
  'Configuration',
] as const;

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

@Component({
  selector: 'app-navigation-menubar',
  imports: [
    DemoCard,
    DocHeader,
    PageToc,
    OgeMenubar,
    OgeMenubarItem,
    ReactNavigationMenubarDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Menubar"
      category="Navigation"
      [chips]="[
        'APG menubar',
        'nested submenus',
        'roving tabindex',
        'hamburger',
      ]"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeMenubar&gt;</code> from
          <code>&#64;oge-ui/react-navigation</code> is a persistent bar of
          application commands with the full WAI-ARIA APG
          <code>menubar</code> keyboard contract: roving tabindex, Left/Right
          between items, Down/Enter into a submenu, Escape unwinding one level
          at a time, type-ahead. Submenus — nested ones included — run on the
          same <code>&lt;OgeMenuList&gt;</code> and Escape stack as every other
          menu in the suite.
        </p>
        <p>
          One idiom difference to know before you read on: the Angular layer
          also accepts declarative <code>&lt;oge-menubar-item&gt;</code>
          children, and React does not.
          <strong>React reserves the <code>key</code> prop</strong>, so an item
          component could not carry the identity <code>key</code> means here —
          the React layer has a single, shared API, the <code>items</code>
          tree.
        </p>
      } @else {
        <p>
          A persistent bar of application commands with the full WAI-ARIA APG
          <code>menubar</code> keyboard contract: roving tabindex, Left/Right
          between items, Down/Enter into a submenu, Escape unwinding one level
          at a time, type-ahead. Submenus — nested ones included — run on the
          same <code>oge-menu-list</code> and Escape stack as every other menu
          in the suite.
        </p>
      }
      <p>
        <strong>Before reaching for it, note the APG's own caveat:</strong>
        a menu bar is rarely the right pattern for plain site navigation. A
        <code>&amp;lt;nav&amp;gt;</code> of links — optionally with the
        disclosure pattern for expandable groups — needs none of this keyboard
        machinery and serves link semantics better.
        <code>role="menubar"</code> is for application-style command menus:
        think editor File/Edit bars, not page headers. (Angular Material has no
        menubar at all — <code>MatMenu</code> is a button-triggered dropdown;
        the CDK's <code>cdkMenuBar</code> is the closest reference.)
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-navigation-menubar-demos />
    } @else {
      <app-demo-card
        [chips]="['items', 'itemClick', 'path']"
        heading="Getting started"
        description="One <code>items</code> tree; children at any depth open as nested submenus. <code>itemClick</code> reports the item, its <code>key</code> and the hierarchical index <code>path</code>. <code>shortcut</code> renders a right-aligned accelerator hint (announced via <code>aria-keyshortcuts</code>; the binding stays yours) and <code>badge</code> a counter pill. Try the keyboard: Left/Right, Down to open, ArrowRight on <em>Share</em>, Escape to unwind."
        [code]="basicSnippet"
        language="ts"
      >
        <oge-menubar [items]="fileMenu" (itemClick)="log($event)" />
        <p class="mt-3 text-sm" data-testid="menubar-log">
          Last click: <code>{{ lastClick() }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['oge-menubar-item', 'children first']"
        heading="Declarative items"
        description="Both APIs, one rule: declarative children render first, then the <code>items</code> input — the house merge order shared with the toolbar and the button group. Nesting <code>&amp;lt;oge-menubar-item&amp;gt;</code> builds the submenu tree."
        [code]="declarativeSnippet"
        language="ts"
      >
        <oge-menubar>
          <oge-menubar-item text="File">
            <oge-menubar-item text="New" key="new" />
            <oge-menubar-item [separator]="true" />
            <oge-menubar-item text="Exit" key="exit" />
          </oge-menubar-item>
          <oge-menubar-item text="Help" key="help" />
        </oge-menubar>
      </app-demo-card>

      <app-demo-card
        [chips]="['openMode', 'hoverDelay']"
        heading="Open mode"
        description="<code>openMode</code> governs the <strong>top level only</strong>: <code>click</code> (default, the desktop convention) or <code>hover</code> after <code>hoverDelay</code>. Nested levels always open on hover and ArrowRight — DevExtreme's <code>showFirstSubmenuMode</code>/<code>showSubmenuMode</code> split collapsed into behavior. With a menu open, hovering siblings switches in either mode."
        [code]="openModeSnippet"
        language="ts"
      >
        <oge-menubar [items]="fileMenu" openMode="hover" [hoverDelay]="150" />
      </app-demo-card>

      <app-demo-card
        [chips]="['orientation', 'aria-orientation']"
        heading="Vertical menubar"
        description='Same widget, same roles: <code>aria-orientation="vertical"</code> is announced, Up/Down traverse the bar and ArrowRight opens the submenu beside it — the axis swap the APG prescribes.'
        [code]="verticalSnippet"
        language="ts"
      >
        <oge-menubar orientation="vertical" [items]="verticalMenu" />
      </app-demo-card>

      <app-demo-card
        [chips]="['compactBelow', 'container width', 'hamburger']"
        heading="Adaptive hamburger"
        description="<code>compactBelow</code> measures the menubar's <strong>own container</strong>, never the window — a bar inside a split pane adapts to the room it actually has. Below the threshold the whole bar becomes one hamburger button opening the full tree as nested menus. Drag the range to squeeze it."
        [code]="compactSnippet"
        language="ts"
      >
        <label class="mb-2 flex items-center gap-2 text-sm">
          Container width
          <input
            type="range"
            min="200"
            max="640"
            [value]="compactWidth()"
            (input)="compactWidth.set(+$any($event.target).value)"
          />
          <code>{{ compactWidth() }}px</code>
        </label>
        <div class="rounded border p-2" [style.width.px]="compactWidth()">
          <oge-menubar [items]="fileMenu" [compactBelow]="420" />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['submenuOpening', 'submenuClosing', 'cancel']"
        heading="Cancelable events"
        description="The <code>-ing</code> pair carries the house mutable <code>cancel</code> flag. Closes the menubar itself initiates (<code>escape</code>, <code>select</code>, <code>navigation</code>, <code>api</code>) are interceptable; pointer closes owned by the overlay (<code>outside</code>) and Tab only report <code>submenuClosed</code>. Lock the menu and try to open or Escape it."
        [code]="eventsSnippet"
        language="ts"
      >
        <label class="mb-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            [checked]="locked()"
            (change)="locked.set($any($event.target).checked)"
          />
          Lock the submenu (cancel opening and closing)
        </label>
        <oge-menubar
          [items]="fileMenu"
          (submenuOpening)="onOpening($event)"
          (submenuClosing)="onClosing($event)"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['provideOgeMenubarConfig', 'messages']"
        heading="Configuration"
        description="Suite-wide defaults for <code>openMode</code>, <code>hoverDelay</code>, <code>orientation</code> and <code>compactBelow</code>, plus every user-facing string — the bar's accessible name and the hamburger label included — via <code>provideOgeMenubarConfig()</code>."
        [code]="configSnippet"
        language="ts"
      >
        <oge-menubar
          [items]="fileMenu"
          [messages]="{ menubar: 'Ana menü', hamburger: 'Menü' }"
        />
      </app-demo-card>
    }
  `,
})
export class NavigationMenubarPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_NAVIGATION_MENUBAR_SECTIONS;
  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly declarativeSnippet = DECLARATIVE_SNIPPET;
  protected readonly openModeSnippet = OPEN_MODE_SNIPPET;
  protected readonly verticalSnippet = VERTICAL_SNIPPET;
  protected readonly compactSnippet = COMPACT_SNIPPET;
  protected readonly eventsSnippet = EVENTS_SNIPPET;
  protected readonly configSnippet = CONFIG_SNIPPET;

  protected readonly fileMenu = FILE_MENU;
  protected readonly verticalMenu: readonly OgeMenubarItemData[] = [
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

  protected readonly lastClick = signal('—');
  protected readonly compactWidth = signal(640);
  protected readonly locked = signal(false);

  protected log(event: OgeMenubarItemClickEvent): void {
    this.lastClick.set(
      `${event.key ?? event.item.text} [${event.path.join(', ')}]`,
    );
  }

  protected onOpening(event: OgeMenubarSubmenuOpeningEvent): void {
    if (this.locked()) event.cancel = true;
  }

  protected onClosing(event: OgeMenubarSubmenuClosingEvent): void {
    if (this.locked() && event.reason !== 'tab') event.cancel = true;
  }
}
