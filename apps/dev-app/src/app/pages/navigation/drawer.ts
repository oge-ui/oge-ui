import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  OgeDrawer,
  OgeTreeView,
  type OgeDrawerCloseReason,
  type OgeDrawerItem,
  type OgeDrawerMode,
  type OgeDrawerModeChangedEvent,
  type OgeDrawerPosition,
} from '@oge-ui/navigation';
import {
  OgeSplitter,
  OgeSplitterPane,
  OgeToolbar,
  OgeToolbarItem,
} from '@oge-ui/layout';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_NAVIGATION_DRAWER_SECTIONS,
  ReactNavigationDrawerDemos,
} from '../react-navigation/drawer';
import {
  APP_SHELL_SNIPPET,
  COMPACT_SNIPPET,
  CONFIG_SNIPPET,
  GUARD_SNIPPET,
  ITEMS_SNIPPET,
  MODAL_SNIPPET,
  MODES_SNIPPET,
  POSITION_SNIPPET,
  RAIL_SNIPPET,
  SWIPE_SNIPPET,
} from './drawer-snippets';

const SECTIONS = [
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

const MODES: readonly OgeDrawerMode[] = ['overlay', 'push', 'side'];
const POSITIONS: readonly OgeDrawerPosition[] = [
  'start',
  'end',
  'top',
  'bottom',
];

@Component({
  selector: 'app-navigation-drawer',
  imports: [
    DemoCard,
    DocHeader,
    PageToc,
    OgeDrawer,
    OgeTreeView,
    OgeToolbar,
    OgeToolbarItem,
    OgeSplitter,
    OgeSplitterPane,
    ReactNavigationDrawerDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Drawer"
      category="Navigation"
      [chips]="['overlay', 'push', 'side', 'APG dialog', 'landmark']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeDrawer&gt;</code> from
          <code>&#64;oge-ui/react-navigation</code> is a panel attached to one
          edge of its content, in one of three layout modes — and
          <strong>one component, not the container/drawer/content trio</strong>
          the reference libraries need. The panel is the <code>panel</code> node
          prop and <code>children</code> is everything it sits next to.
        </p>
      } @else {
        <p>
          A panel attached to one edge of its content, in one of three layout
          modes — and
          <strong>one component, not the container/drawer/content trio</strong>
          the reference libraries need.
        </p>
      }
      <p>
        Modality is <strong>derived from <code>mode</code></strong
        >, never configured separately. <code>overlay</code> and
        <code>push</code> cover or displace the content, so they are dialogs:
        <code>role="dialog"</code>, <code>aria-modal</code>, a focus trap,
        Escape and <code>inert</code> on the background. <code>side</code> is
        part of the layout, so it is a persistent landmark with none of those.
        WAI-ARIA has no drawer pattern and conditions modality on background
        interaction actually being blocked — an independent flag is exactly what
        lets a panel claim <code>role="complementary"</code> and
        <code>aria-modal="true"</code> at once.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-navigation-drawer-demos />
    } @else {
      <app-demo-card
        [chips]="['mode', 'overlay', 'push', 'side']"
        heading="Layout modes"
        description="<code>overlay</code> floats over the content, <code>push</code> shifts it aside without resizing it, <code>side</code> shrinks it so both share the row. DevExtreme calls the last one <code>shrink</code> and Kendo calls it <code>push</code>; only DevExtreme and this drawer offer all three."
        [code]="modesSnippet"
        language="ts"
      >
        <div class="mb-3 flex flex-wrap gap-2">
          @for (option of modes; track option) {
            <button
              type="button"
              class="rounded border px-2 py-1 text-sm"
              [class.font-semibold]="mode() === option"
              (click)="mode.set(option)"
            >
              {{ option }}
            </button>
          }
        </div>
        <div class="h-40 overflow-hidden rounded border">
          <oge-drawer
            class="h-full"
            [(opened)]="modeOpen"
            [mode]="mode()"
            ariaLabel="Layout modes demo"
            [size]="180"
          >
            <div ogeDrawerPanel class="p-3 text-sm">Navigation…</div>
            <div class="p-3 text-sm">
              <button
                type="button"
                class="rounded border px-2 py-1"
                [attr.aria-expanded]="modeOpen()"
                (click)="modeOpen.set(!modeOpen())"
              >
                Toggle
              </button>
              <p class="mt-2 text-(--oge-muted-color)">
                overlay covers this, push shifts it, side shrinks it.
              </p>
            </div>
          </oge-drawer>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['position', 'start', 'end', 'top', 'bottom']"
        heading="Position"
        description="Logical edges: <code>start</code> and <code>end</code> mirror in RTL on their own, because there is no <code>rtlEnabled</code> flag anywhere in this suite. Kendo is horizontal-only; this is the union of every edge the references offer."
        [code]="positionSnippet"
        language="ts"
      >
        <div class="mb-3 flex flex-wrap gap-2">
          @for (option of positions; track option) {
            <button
              type="button"
              class="rounded border px-2 py-1 text-sm"
              [class.font-semibold]="position() === option"
              (click)="position.set(option)"
            >
              {{ option }}
            </button>
          }
        </div>
        <div class="h-40 overflow-hidden rounded border">
          <oge-drawer
            class="h-full"
            [(opened)]="positionOpen"
            mode="overlay"
            ariaLabel="Position demo"
            [position]="position()"
            [size]="140"
          >
            <div ogeDrawerPanel class="p-3 text-sm">Panel</div>
            <div class="p-3 text-sm">
              <button
                type="button"
                class="rounded border px-2 py-1"
                (click)="positionOpen.set(!positionOpen())"
              >
                Toggle
              </button>
            </div>
          </oge-drawer>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['role=dialog', 'aria-modal', 'focus trap', 'inert']"
        heading="Modal drawer"
        description="An <code>overlay</code> drawer takes focus, traps Tab, closes on Escape and on a backdrop click, and marks the page behind it <code>inert</code> — which none of the four reference drawers does. Escape only acts on the topmost overlay, so a popup opened inside the drawer closes first."
        [code]="modalSnippet"
        language="ts"
      >
        <div class="h-40 overflow-hidden rounded border">
          <oge-drawer
            class="h-full"
            [(opened)]="modalOpen"
            mode="overlay"
            ariaLabel="Main menu"
            [size]="180"
            [showCloseButton]="true"
          >
            <div ogeDrawerPanel class="p-3 text-sm">
              <button type="button" class="rounded border px-2 py-1">
                Reports
              </button>
            </div>
            <div class="p-3 text-sm">
              <button
                type="button"
                class="rounded border px-2 py-1"
                [attr.aria-expanded]="modalOpen()"
                (click)="modalOpen.set(true)"
              >
                Open menu
              </button>
              <p class="mt-2 text-(--oge-muted-color)">
                Escape, or a click on the backdrop, closes it and returns focus
                here.
              </p>
            </div>
          </oge-drawer>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['minSize']"
        heading="Compact rail"
        description='<code>minSize</code> is the <em>closed</em> size — the rail that keeps icons reachable. It applies to <code>mode="side"</code> only: a rail belongs to the layout, and a modal drawer still partly on screen is not closed. Kendo spells this <code>mini</code> + <code>miniWidth</code>; one input covers both.'
        [code]="railSnippet"
        language="ts"
      >
        <div class="h-40 overflow-hidden rounded border">
          <oge-drawer
            class="h-full"
            [(opened)]="railOpen"
            mode="side"
            ariaLabel="Compact rail demo"
            [size]="180"
            [minSize]="56"
          >
            <div ogeDrawerPanel class="p-3 text-sm">
              <button type="button" class="rounded border px-2 py-1">☰</button>
            </div>
            <div class="p-3 text-sm">
              <button
                type="button"
                class="rounded border px-2 py-1"
                (click)="railOpen.set(!railOpen())"
              >
                Toggle rail
              </button>
              <p class="mt-2 text-(--oge-muted-color)">
                Closed it is a rail, not a gap — and it stays keyboard
                reachable.
              </p>
            </div>
          </oge-drawer>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['compactBelow', 'modeChanged']"
        heading="Responsive downgrade"
        description="DevExtreme and Kendo watch the <em>window</em>. This one measures its own container, so a drawer nested in a dialog, a split pane or this card adapts to the room it actually has. The decision is core's pure <code>resolveDrawerMode()</code>, unit-tested without a DOM."
        [code]="compactSnippet"
        language="ts"
      >
        <div class="mb-3 flex items-center gap-2 text-sm">
          <label for="drawer-width">container</label>
          <input
            id="drawer-width"
            type="range"
            min="300"
            max="700"
            step="10"
            [value]="shellWidth()"
            (input)="onWidth($event)"
          />
          <span class="text-(--oge-muted-color)">{{ shellWidth() }}px</span>
        </div>
        <div
          class="h-40 overflow-hidden rounded border"
          [style.max-width.px]="shellWidth()"
        >
          <oge-drawer
            class="h-full"
            [(opened)]="compactOpen"
            mode="side"
            ariaLabel="Responsive demo"
            [size]="180"
            [compactBelow]="400"
            (modeChanged)="onMode($event)"
          >
            <div ogeDrawerPanel class="p-3 text-sm">Navigation</div>
            <div class="p-3 text-sm">
              <button
                type="button"
                class="rounded border px-2 py-1"
                (click)="compactOpen.set(!compactOpen())"
              >
                Toggle
              </button>
            </div>
          </oge-drawer>
        </div>
        <p class="mt-2 text-sm text-(--oge-muted-color)">
          resolved mode → {{ resolvedMode() }}
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['closeGuard', 'closePending']"
        heading="Close guard"
        description="The overlay package's veto semantics, reused verbatim: <code>false</code>, a throw and a rejection all mean “stay open”, a promise reports pending, and a second close gesture meanwhile is dropped."
        [code]="guardSnippet"
        language="ts"
      >
        <div class="h-40 overflow-hidden rounded border">
          <oge-drawer
            class="h-full"
            [(opened)]="guardOpen"
            mode="overlay"
            ariaLabel="Close guard demo"
            [size]="180"
            [closeGuard]="confirmDiscard"
          >
            <div ogeDrawerPanel class="p-3 text-sm">Unsaved edits…</div>
            <div class="p-3 text-sm">
              <label class="flex items-center gap-2">
                <input
                  type="checkbox"
                  [checked]="dirty()"
                  (change)="dirty.set(!dirty())"
                />
                pretend there are unsaved changes
              </label>
              <button
                type="button"
                class="mt-2 rounded border px-2 py-1"
                (click)="guardOpen.set(true)"
              >
                Open
              </button>
            </div>
          </oge-drawer>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['toolbar', 'drawer', 'splitter', 'tree view']"
        heading="App shell"
        description="The whole shell out of OGE containers: a toolbar on top, a drawer down the side holding the tree view that ships in the same package, and a splitter dividing the workspace. Drag the width and the shell reorganises itself from its own size."
        [code]="appShellSnippet"
        language="ts"
      >
        <div class="overflow-hidden rounded border">
          <oge-toolbar stylingMode="flat" ariaLabel="Application">
            <oge-toolbar-item
              text="Menu"
              (itemClick)="shellOpen.set(!shellOpen())"
            />
            <oge-toolbar-item
              text="Save"
              severity="accent"
              [overflowPriority]="10"
            />
            <oge-toolbar-item
              text="Help"
              location="after"
              [overflowPriority]="-1"
            />
          </oge-toolbar>
          <div class="h-56">
            <oge-drawer
              class="h-full"
              [(opened)]="shellOpen"
              mode="side"
              [size]="180"
              [compactBelow]="640"
              ariaLabel="Sections"
            >
              <oge-tree-view ogeDrawerPanel [items]="nav" />
              <oge-splitter [(sizes)]="shellSizes">
                <oge-splitter-pane key="list">
                  <div class="p-3 text-sm">Rows…</div>
                </oge-splitter-pane>
                <oge-splitter-pane key="detail">
                  <div class="p-3 text-sm">Details…</div>
                </oge-splitter-pane>
              </oge-splitter>
            </oge-drawer>
          </div>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['items', '[(selectedKey)]', 'aria-current', 'mini rail']"
        heading="Navigation items"
        description="<code>items</code> renders the panel's navigation list for you: buttons, or links for entries with a <code>url</code>, with icons, badges, separators and disabled entries. Each entry stays in the Tab order (the APG disclosure-navigation shape, not a composite widget), the arrows / Home / End move between them, and the active one is <code>aria-current=&quot;page&quot;</code>. Closed with a <code>minSize</code> the drawer becomes an icon rail whose labels stay the accessible name and show as tooltips. <code>[ogeDrawerItemTemplate]</code> replaces an entry's content."
        [code]="itemsSnippet"
        language="ts"
      >
        <div class="h-64 overflow-hidden rounded border">
          <oge-drawer
            class="h-full"
            [(opened)]="itemsOpen"
            mode="side"
            ariaLabel="Mail folders"
            [size]="200"
            [minSize]="56"
            [items]="items"
            [(selectedKey)]="page"
            (itemClick)="lastItem.set($event.key)"
          >
            <div class="p-3 text-sm">
              <button
                type="button"
                class="rounded border px-2 py-1"
                [attr.aria-expanded]="itemsOpen()"
                (click)="itemsOpen.set(!itemsOpen())"
              >
                {{ itemsOpen() ? 'Collapse to rail' : 'Expand' }}
              </button>
              <p
                class="mt-2 text-(--oge-muted-color)"
                data-testid="drawer-items-page"
              >
                Showing: {{ page() }}
              </p>
            </div>
          </oge-drawer>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['swipeEnabled', 'touch', 'RTL', 'reason: swipe']"
        heading="Swipe gestures"
        description="With <code>swipeEnabled</code> a touch swipe from the drawer's edge opens it and a swipe toward the edge closes it — by distance or by a flick, touch pointers only, mirrored in RTL. A swipe that turns out to be a vertical scroll lets go of the page at once. Closing goes through <code>closing</code> and <code>closeGuard</code> with reason <code>'swipe'</code>. Off by default, so existing apps keep their behaviour. Try it on a touch screen."
        [code]="swipeSnippet"
        language="ts"
      >
        <div class="h-48 overflow-hidden rounded border">
          <oge-drawer
            class="h-full"
            [(opened)]="swipeOpen"
            mode="overlay"
            ariaLabel="Swipe menu"
            [size]="200"
            [swipeEnabled]="true"
            (closing)="lastClose.set($event.reason)"
          >
            <div ogeDrawerPanel class="p-3 text-sm">
              <button type="button" class="rounded border px-2 py-1">
                Reports
              </button>
            </div>
            <div class="p-3 text-sm" data-testid="drawer-swipe-content">
              <button
                type="button"
                class="rounded border px-2 py-1"
                [attr.aria-expanded]="swipeOpen()"
                (click)="swipeOpen.set(true)"
              >
                Open menu
              </button>
              <p class="mt-2 text-(--oge-muted-color)">
                Or swipe in from the start edge.
                @if (lastClose(); as reason) {
                  Last close: {{ reason }}.
                }
              </p>
            </div>
          </oge-drawer>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['provideOgeDrawerConfig']"
        heading="Configuration"
        description="Every user-facing string, including the panel's accessible name, lives in the messages interface — overridable application-wide or per instance with <code>[messages]</code>."
        [code]="configSnippet"
        language="ts"
      />
    }
  `,
})
export class NavigationDrawerPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_NAVIGATION_DRAWER_SECTIONS;
  protected readonly modes = MODES;
  protected readonly positions = POSITIONS;

  protected readonly modesSnippet = MODES_SNIPPET;
  protected readonly positionSnippet = POSITION_SNIPPET;
  protected readonly modalSnippet = MODAL_SNIPPET;
  protected readonly railSnippet = RAIL_SNIPPET;
  protected readonly compactSnippet = COMPACT_SNIPPET;
  protected readonly guardSnippet = GUARD_SNIPPET;
  protected readonly appShellSnippet = APP_SHELL_SNIPPET;
  protected readonly configSnippet = CONFIG_SNIPPET;
  protected readonly itemsSnippet = ITEMS_SNIPPET;
  protected readonly swipeSnippet = SWIPE_SNIPPET;

  protected readonly items = ITEMS;
  protected readonly itemsOpen = signal(true);
  protected readonly page = signal<string | undefined>('inbox');
  protected readonly lastItem = signal<string | null>(null);
  protected readonly swipeOpen = signal(false);
  protected readonly lastClose = signal<OgeDrawerCloseReason | null>(null);

  protected readonly mode = signal<OgeDrawerMode>('side');
  protected readonly position = signal<OgeDrawerPosition>('start');
  protected readonly modeOpen = signal(true);
  protected readonly positionOpen = signal(false);
  protected readonly modalOpen = signal(false);
  protected readonly railOpen = signal(false);
  protected readonly compactOpen = signal(true);
  protected readonly guardOpen = signal(false);
  protected readonly shellOpen = signal(true);

  protected readonly shellWidth = signal(640);
  protected readonly resolvedMode = signal<OgeDrawerMode>('side');
  protected readonly dirty = signal(true);

  protected readonly shellSizes = signal<readonly number[]>([60, 40]);
  protected readonly nav = [
    { id: 1, parentId: null, text: 'Reports' },
    { id: 2, parentId: 1, text: 'Monthly' },
    { id: 3, parentId: 1, text: 'Quarterly' },
    { id: 4, parentId: null, text: 'Settings' },
  ];

  protected readonly confirmDiscard = (): boolean =>
    !this.dirty() || confirm('Discard your changes?');

  protected onWidth(event: Event): void {
    this.shellWidth.set(Number((event.target as HTMLInputElement).value));
  }

  protected onMode(event: OgeDrawerModeChangedEvent): void {
    this.resolvedMode.set(event.mode);
  }
}
