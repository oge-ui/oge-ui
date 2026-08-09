import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  OgeDrawer,
  OgeTreeView,
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
import { PageToc } from '../../shared/page-toc';
import {
  APP_SHELL_SNIPPET,
  COMPACT_SNIPPET,
  CONFIG_SNIPPET,
  GUARD_SNIPPET,
  MODAL_SNIPPET,
  MODES_SNIPPET,
  POSITION_SNIPPET,
  RAIL_SNIPPET,
} from './drawer-snippets';

const SECTIONS = [
  'Layout modes',
  'Position',
  'Modal drawer',
  'Compact rail',
  'Responsive downgrade',
  'Close guard',
  'App shell',
  'Configuration',
] as const;

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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Drawer"
      category="Navigation"
      [chips]="['overlay', 'push', 'side', 'APG dialog', 'landmark']"
    >
      <p>
        A panel attached to one edge of its content, in one of three layout
        modes — and
        <strong>one component, not the container/drawer/content trio</strong>
        the reference libraries need.
      </p>
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
    <app-page-toc [sections]="sections" />

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
            <p class="mt-2 opacity-70">
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
            <p class="mt-2 opacity-70">
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
            <p class="mt-2 opacity-70">
              Closed it is a rail, not a gap — and it stays keyboard reachable.
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
        <span class="opacity-70">{{ shellWidth() }}px</span>
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
      <p class="mt-2 text-sm opacity-70">
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
      [chips]="['provideOgeDrawerConfig']"
      heading="Configuration"
      description="Every user-facing string, including the panel's accessible name, lives in the messages interface — overridable application-wide or per instance with <code>[messages]</code>."
      [code]="configSnippet"
      language="ts"
    />
  `,
})
export class NavigationDrawerPage {
  protected readonly sections = SECTIONS;
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
