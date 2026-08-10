import { demoSource } from '../../shared/demo-source';

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeMenubar'] },
  types: {
    '@oge-ui/navigation': ['OgeMenubarItemData', 'OgeMenubarItemClickEvent'],
  },
  template: `<!-- role="menubar" with the full APG keyboard contract: roving
     tabindex, Left/Right between items, Down/Enter opens, Escape unwinds,
     type-ahead. Submenus run on the same oge-menu-list every other menu in
     the suite uses. -->
<oge-menubar [items]="menu" (itemClick)="run($event)" />`,
  body: `protected readonly menu: OgeMenubarItemData[] = [
  {
    text: 'File',
    items: [
      // shortcut renders right-aligned and announces aria-keyshortcuts;
      // the actual key binding stays the application's job.
      { text: 'New', key: 'new', shortcut: 'Ctrl+N' },
      { text: 'Open…', key: 'open', shortcut: 'Ctrl+O' },
      { separator: true, text: '' },
      { text: 'Share', badge: 2, items: [{ text: 'Email', key: 'email' }] },
    ],
  },
  { text: 'Edit', items: [{ text: 'Undo', key: 'undo', shortcut: 'Ctrl+Z' }] },
  { text: 'Help', key: 'help' },
];

protected run(event: OgeMenubarItemClickEvent): void {
  console.log(event.key, event.path);
}`,
});

export const DECLARATIVE_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeMenubar', 'OgeMenubarItem'] },
  template: `<!-- Declarative children come first, then the items input — the
     house merge order. Nesting oge-menubar-item builds the submenu tree. -->
<oge-menubar>
  <oge-menubar-item text="File">
    <oge-menubar-item text="New" key="new" />
    <oge-menubar-item [separator]="true" />
    <oge-menubar-item text="Exit" key="exit" />
  </oge-menubar-item>
  <oge-menubar-item text="Help" key="help" />
</oge-menubar>`,
});

export const OPEN_MODE_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeMenubar'] },
  types: { '@oge-ui/navigation': ['OgeMenubarItemData'] },
  template: `<!-- openMode applies to the TOP level only: 'click' is the
     desktop-menubar default, 'hover' opens after hoverDelay. Nested levels
     always open on hover and on ArrowRight/Enter — the reference libraries'
     first-vs-nested split baked in as behavior, not a second input. Once a
     menu is open, hovering siblings switches it in either mode. -->
<oge-menubar [items]="menu" openMode="hover" [hoverDelay]="150" />`,
  body: `protected readonly menu: OgeMenubarItemData[] = [
  { text: 'File', items: [{ text: 'New' }] },
  { text: 'Edit', items: [{ text: 'Undo' }] },
];`,
});

export const VERTICAL_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeMenubar'] },
  types: { '@oge-ui/navigation': ['OgeMenubarItemData'] },
  template: `<!-- A vertical menubar keeps role="menubar" and announces
     aria-orientation="vertical"; Up/Down traverse the bar and ArrowRight
     opens the submenu beside it, exactly as the APG allows. -->
<oge-menubar orientation="vertical" [items]="menu" />`,
  body: `protected readonly menu: OgeMenubarItemData[] = [
  { text: 'Dashboard', key: 'dashboard' },
  { text: 'Reports', items: [{ text: 'Monthly' }, { text: 'Annual' }] },
  { text: 'Settings', items: [{ text: 'Profile' }] },
];`,
});

export const COMPACT_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeMenubar'] },
  types: {
    '@oge-ui/navigation': [
      'OgeMenubarItemData',
      'OgeMenubarCompactChangedEvent',
    ],
  },
  template: `<!-- compactBelow measures the menubar's OWN container, never the
     window (DevExtreme collapses on widget overflow, PrimeNG on a media
     query). Below the threshold the whole bar becomes a hamburger button
     opening the full tree as one nested menu — no second interaction model. -->
<oge-menubar
  [items]="menu"
  [compactBelow]="480"
  (compactChanged)="onCompact($event)"
/>`,
  body: `protected readonly menu: OgeMenubarItemData[] = [
  { text: 'File', items: [{ text: 'New' }] },
  { text: 'Edit', items: [{ text: 'Undo' }] },
  { text: 'Help', key: 'help' },
];

protected onCompact(event: OgeMenubarCompactChangedEvent): void {
  console.log('compact:', event.compact);
}`,
});

export const EVENTS_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeMenubar'] },
  types: {
    '@oge-ui/navigation': [
      'OgeMenubarItemData',
      'OgeMenubarSubmenuOpeningEvent',
      'OgeMenubarSubmenuClosingEvent',
    ],
  },
  template: `<!-- The -ing pair is cancelable with the house mutable cancel
     flag. Closes the menubar initiates (escape, select, navigation, api) run
     through submenuClosing; pointer closes owned by the overlay (outside)
     and Tab only report submenuClosed. -->
<oge-menubar
  [items]="menu"
  (submenuOpening)="onOpening($event)"
  (submenuClosing)="onClosing($event)"
/>`,
  body: `protected readonly locked = signal(false);
protected readonly menu: OgeMenubarItemData[] = [
  { text: 'File', key: 'file', items: [{ text: 'New' }] },
];

protected onOpening(event: OgeMenubarSubmenuOpeningEvent): void {
  if (this.locked()) event.cancel = true;
}

protected onClosing(event: OgeMenubarSubmenuClosingEvent): void {
  if (this.locked() && event.reason !== 'tab') event.cancel = true;
}`,
});

export const CONFIG_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeMenubar'] },
  helpers: { '@oge-ui/navigation': ['provideOgeMenubarConfig'] },
  types: { '@oge-ui/navigation': ['OgeMenubarItemData'] },
  template: `<oge-menubar [items]="menu" />`,
  body: `protected readonly menu: OgeMenubarItemData[] = [
  { text: 'Dosya', items: [{ text: 'Yeni' }] },
];`,
  before: `// Every user-facing string lives in the messages block — the bar's
// accessible name and the compact hamburger's label included.
export const MENUBAR_PROVIDERS = [
  provideOgeMenubarConfig({
    openMode: 'hover',
    compactBelow: 480,
    messages: { menubar: 'Ana menü', hamburger: 'Menü' },
  }),
];`,
});
