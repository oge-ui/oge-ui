import { demoSource } from '../../shared/demo-source';

export const MODES_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeDrawer'] },
  types: { '@oge-ui/navigation': ['OgeDrawerMode'] },
  template: `<!-- One component, not the container/drawer/content trio the
     reference libraries need. The panel is the [ogeDrawerPanel] slot;
     everything else projected is the content. -->
<oge-drawer [(opened)]="opened" [mode]="mode()" [size]="240">
  <div ogeDrawerPanel>Navigation…</div>
  <main>Content that overlay covers, push shifts and side shrinks.</main>
</oge-drawer>`,
  body: `protected readonly opened = signal(true);
protected readonly mode = signal<OgeDrawerMode>('side');`,
});

export const POSITION_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeDrawer'] },
  types: { '@oge-ui/navigation': ['OgeDrawerPosition'] },
  template: `<!-- start/end are logical: they mirror in RTL on their own,
     because there is no rtlEnabled flag anywhere in this suite. -->
<oge-drawer [(opened)]="opened" mode="overlay" [position]="position()">
  <div ogeDrawerPanel>Panel</div>
  <main>Content</main>
</oge-drawer>`,
  body: `protected readonly opened = signal(false);
protected readonly position = signal<OgeDrawerPosition>('start');`,
});

export const MODAL_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeDrawer'] },
  template: `<!-- Modality is DERIVED from mode, never configured. overlay and
     push cover or displace the content, so they are dialogs: role="dialog",
     aria-modal, a focus trap, Escape and inert on the background. side is
     part of the layout, so it is a landmark with none of those.

     An independent "modal" flag is exactly what lets a panel claim
     role="complementary" and aria-modal="true" at the same time. -->
<button type="button" [attr.aria-expanded]="opened()" (click)="opened.set(true)">
  Menu
</button>

<oge-drawer [(opened)]="opened" mode="overlay" ariaLabel="Main menu">
  <div ogeDrawerPanel>
    <a href="#reports">Reports</a>
  </div>
  <main>Content</main>
</oge-drawer>`,
  body: `protected readonly opened = signal(false);`,
});

export const RAIL_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeDrawer'] },
  template: `<!-- minSize is the closed size: the compact rail that keeps icons
     visible. It only applies to mode="side", because a rail belongs to the
     layout and a modal drawer still partly on screen is not closed. -->
<oge-drawer [(opened)]="opened" mode="side" [size]="240" [minSize]="56">
  <div ogeDrawerPanel>Icons, then labels once open</div>
  <main>Content</main>
</oge-drawer>`,
  body: `protected readonly opened = signal(false);`,
});

export const COMPACT_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeDrawer'] },
  types: { '@oge-ui/navigation': ['OgeDrawerModeChangedEvent'] },
  template: `<!-- compactBelow measures the drawer's OWN container, never the
     window, so a drawer nested in a dialog or a split pane adapts to the room
     it actually has. Below the threshold it downgrades to an overlay and
     closes, rather than leaving a backdrop the user never asked for. -->
<oge-drawer
  [(opened)]="opened"
  mode="side"
  [compactBelow]="720"
  (modeChanged)="onMode($event)"
>
  <div ogeDrawerPanel>Navigation</div>
  <main>Content</main>
</oge-drawer>`,
  body: `protected readonly opened = signal(true);

protected onMode(event: OgeDrawerModeChangedEvent): void {
  console.log(event.mode, 'compact:', event.compact);
}`,
});

export const GUARD_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeDrawer'] },
  template: `<!-- closeGuard follows the overlay package's veto semantics:
     false, a throw and a rejection all mean "stay open", a promise reports
     pending through closePending, and a second gesture meanwhile is dropped. -->
<oge-drawer [(opened)]="opened" [closeGuard]="confirmDiscard">
  <form ogeDrawerPanel>Unsaved edits…</form>
  <main>Content</main>
</oge-drawer>`,
  body: `protected readonly opened = signal(true);
protected readonly dirty = signal(true);

protected readonly confirmDiscard = (): boolean =>
  !this.dirty() || confirm('Discard your changes?');`,
});

export const APP_SHELL_SNIPPET = demoSource({
  use: {
    '@oge-ui/navigation': ['OgeDrawer', 'OgeTreeView'],
    '@oge-ui/layout': [
      'OgeToolbar',
      'OgeToolbarItem',
      'OgeSplitter',
      'OgeSplitterPane',
    ],
  },
  template: `<!-- The whole app shell out of three OGE containers: a toolbar on
     top, a drawer down the side holding the tree view that ships in the same
     package, and a splitter dividing the workspace.

     compactBelow makes the shell responsive to its own width, so the same
     markup works full-page and inside a preview card. -->
<oge-toolbar ariaLabel="Application">
  <oge-toolbar-item text="Menu" (itemClick)="menuOpen.set(!menuOpen())" />
  <oge-toolbar-item text="Save" severity="accent" [overflowPriority]="10" />
  <oge-toolbar-item text="Help" location="after" [overflowPriority]="-1" />
</oge-toolbar>

<oge-drawer
  [(opened)]="menuOpen"
  mode="side"
  [size]="220"
  [compactBelow]="720"
  ariaLabel="Sections"
>
  <oge-tree-view ogeDrawerPanel [items]="nav" />

  <oge-splitter [(sizes)]="sizes">
    <oge-splitter-pane key="list">Rows…</oge-splitter-pane>
    <oge-splitter-pane key="detail">Details…</oge-splitter-pane>
  </oge-splitter>
</oge-drawer>`,
  body: `protected readonly menuOpen = signal(true);
protected readonly sizes = signal<readonly number[]>([60, 40]);
protected readonly nav = [
  { id: 1, parentId: null, text: 'Reports' },
  { id: 2, parentId: 1, text: 'Monthly' },
  { id: 3, parentId: null, text: 'Settings' },
];`,
});

export const ITEMS_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeDrawer'] },
  types: { '@oge-ui/navigation': ['OgeDrawerItem'] },
  before: `const ICON = {
  inbox: 'M4 13h4l2 3h4l2-3h4M4 13l2-8h12l2 8v6H4z',
  send: 'M4 12l16-8-6 16-2-6-8-2z',
  star: 'M12 4l2.5 5 5.5.8-4 3.9.9 5.5L12 16.6 7.1 19.2 8 13.7 4 9.8 9.5 9z',
  trash: 'M5 7h14M9 7V5h6v2M7 7l1 12h8l1-12',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM4 12h2M18 12h2M12 4v2M12 18v2',
};`,
  template: `<!-- a list of real buttons / links, each in the Tab order; the active
     entry is aria-current="page". Closed with a minSize it is an icon rail
     whose labels become the accessible name and a tooltip. -->
<oge-drawer
  [(opened)]="opened"
  mode="side"
  [size]="220"
  [minSize]="56"
  ariaLabel="Mail"
  [items]="items"
  [(selectedKey)]="page"
>
  <main>{{ page() }}</main>
</oge-drawer>`,
  body: `protected readonly opened = signal(true);
protected readonly page = signal<string | undefined>('inbox');
protected readonly items: OgeDrawerItem[] = [
  { key: 'inbox', text: 'Inbox', icon: ICON.inbox, badge: 4 },
  { key: 'sent', text: 'Sent', icon: ICON.send },
  { separator: true },
  { key: 'trash', text: 'Trash', icon: ICON.trash, disabled: true },
  { key: 'help', text: 'Help', url: '/help' },
];`,
});

export const SWIPE_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeDrawer'] },
  types: { '@oge-ui/navigation': ['OgeDrawerClosingEvent'] },
  template: `<!-- touch only: an edge swipe opens, a swipe toward the edge closes
     (reason 'swipe', through closing and closeGuard). Off by default. -->
<oge-drawer
  [(opened)]="opened"
  mode="overlay"
  [swipeEnabled]="true"
  ariaLabel="Menu"
  (closing)="onClosing($event)"
>
  <div ogeDrawerPanel>Menu</div>
  <main>Swipe in from the start edge</main>
</oge-drawer>`,
  body: `protected readonly opened = signal(false);

protected onClosing(event: OgeDrawerClosingEvent): void {
  console.log('closing because of', event.reason);
}`,
});

export const CONFIG_SNIPPET = `import { provideOgeDrawerConfig } from '@oge-ui/navigation';

bootstrapApplication(App, {
  providers: [
    provideOgeDrawerConfig({
      mode: 'side',
      size: 280,
      messages: { drawer: 'Gezinme', close: 'Kapat' },
    }),
  ],
});`;
