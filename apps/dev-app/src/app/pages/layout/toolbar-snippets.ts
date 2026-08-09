import { demoSource } from '../../shared/demo-source';

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeToolbar', 'OgeToolbarItem'] },
  template: `<oge-toolbar ariaLabel="Document actions">
  <oge-toolbar-item text="New" (itemClick)="create()" />
  <oge-toolbar-item text="Open" (itemClick)="open()" />
  <oge-toolbar-item type="separator" />
  <oge-toolbar-item text="Save" severity="accent" (itemClick)="save()" />
  <oge-toolbar-item text="Delete" severity="danger" location="after" />
</oge-toolbar>`,
  body: `protected create(): void {}
protected open(): void {}
protected save(): void {}`,
});

export const ITEMS_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeToolbar'] },
  types: {
    '@oge-ui/layout': ['OgeToolbarItemClickEvent', 'OgeToolbarItemData'],
  },
  template: `<oge-toolbar [items]="tools" (itemClick)="onTool($event)" />`,
  body: `// Declarative children and [items] can be used together: children render
// first, exactly like the tabs and accordion families.
protected readonly tools: readonly OgeToolbarItemData[] = [
  { key: 'undo', text: 'Undo' },
  { key: 'redo', text: 'Redo' },
  { key: 'sep', type: 'separator' },
  { key: 'bold', text: 'Bold', active: true },
  { key: 'note', type: 'label', text: 'Draft' },
  { key: 'publish', text: 'Publish', location: 'after', severity: 'accent' },
];

protected onTool(event: OgeToolbarItemClickEvent): void {
  console.log(event.key, 'clicked from the menu?', event.inMenu);
}`,
});

export const LOCATION_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeToolbar', 'OgeToolbarItem'] },
  template: `<!-- before and after take their natural width; center claims the
     rest and centres inside it. All three follow the writing mode, so
     the order mirrors in RTL with no flag to set. -->
<oge-toolbar>
  <oge-toolbar-item text="Back" location="before" />
  <oge-toolbar-item type="label" text="report.xlsx" location="center" />
  <oge-toolbar-item text="Share" location="after" />
</oge-toolbar>`,
});

export const OVERFLOW_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeToolbar', 'OgeToolbarItem'] },
  types: { '@oge-ui/layout': ['OgeToolbarOverflowChangedEvent'] },
  template: `<!-- Narrow the container and the trailing commands collapse into the
     overflow menu. locateInMenu defaults to 'auto'; 'always' pins an item
     to the menu whatever the width, 'never' keeps it on the bar even if
     the row has to overflow. -->
<oge-toolbar overflow="menu" (overflowChanged)="onOverflow($event)">
  <oge-toolbar-item text="Cut" locateInMenu="never" />
  <oge-toolbar-item text="Copy" />
  <oge-toolbar-item text="Paste" />
  <oge-toolbar-item text="Paste special" />
  <oge-toolbar-item text="Print preview" />
  <oge-toolbar-item text="Document settings" locateInMenu="always" />
</oge-toolbar>`,
  body: `protected onOverflow(event: OgeToolbarOverflowChangedEvent): void {
  console.log(event.count, 'commands are in the menu');
}`,
});

export const PRIORITY_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeToolbar', 'OgeToolbarItem'] },
  template: `<!-- Every reference toolbar drops strictly from the end of the row, so
     keeping a primary command means moving it to the front. overflowPriority
     separates yield order from visual order: higher survives longer, and
     equal priorities fall back to end-first (the reference behaviour). -->
<oge-toolbar overflow="menu">
  <oge-toolbar-item text="Open" />
  <oge-toolbar-item text="Print preview" [overflowPriority]="-1" />
  <oge-toolbar-item text="Document settings" [overflowPriority]="-1" />
  <!-- Save sits last on the bar and is still the last to collapse. -->
  <oge-toolbar-item text="Save" severity="accent" [overflowPriority]="10" />
</oge-toolbar>`,
});

export const SLOTS_SNIPPET = demoSource({
  use: {
    '@oge-ui/layout': [
      'OgeToolbar',
      'OgeToolbarItem',
      'OgeToolbarItemTemplate',
    ],
    '@oge-ui/inputs': ['OgeSelectBox'],
  },
  template: `<!-- Two escape hatches, for two different needs.
     [ogeToolbarBefore | ogeToolbarCenter | ogeToolbarAfter] project any
     control straight onto the bar — it always stays there, because the
     toolbar cannot re-stamp DOM it does not own.
     An <ng-template ogeToolbarItemTemplate> inside an item *is* re-stampable,
     so that entry can still collapse into the overflow menu. -->
<oge-toolbar>
  <oge-toolbar-item text="Filter">
    <ng-template ogeToolbarItemTemplate>
      <oge-select-box [items]="views" [value]="view()" size="sm" />
    </ng-template>
  </oge-toolbar-item>
  <input ogeToolbarAfter type="search" placeholder="Search…" />
</oge-toolbar>`,
  body: `protected readonly views = ['All', 'Mine', 'Archived'];
protected readonly view = signal('All');`,
});

export const ICON_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeToolbar', 'OgeToolbarItem'] },
  template: `<!-- showText="inMenu" renders the bar entry icon-only and keeps the
     label for the overflow menu. The button never loses its accessible
     name: the text becomes its aria-label. -->
<oge-toolbar showText="inMenu">
  <oge-toolbar-item text="Bold" [icon]="boldPath" />
  <oge-toolbar-item text="Italic" [icon]="italicPath" />
  <oge-toolbar-item text="Underline" [icon]="underlinePath" showText="always" />
</oge-toolbar>`,
  body: `// Icons are SVG path data — there is no icon font or icon package.
protected readonly boldPath = 'M5 3h4a3 3 0 0 1 0 6H5zM5 9h5a3 3 0 0 1 0 6H5z';
protected readonly italicPath = 'M10 3H6m4 0-3 10m0 0H3m4 0h3';
protected readonly underlinePath = 'M4 3v5a4 4 0 0 0 8 0V3M3 14h10';`,
});

export const KEYBOARD_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeToolbar', 'OgeToolbarItem'] },
  template: `<!-- One Tab stop for the whole toolbar (APG roving tabindex), arrow
     keys between the controls, Home/End to the ends, disabled controls
     skipped. Vertical toolbars use Up/Down and report aria-orientation.
     A text input inside keeps its own arrow and Home/End keys. -->
<oge-toolbar orientation="vertical" ariaLabel="Tools" [wrap]="false">
  <oge-toolbar-item text="Select" />
  <oge-toolbar-item text="Move" [disabled]="true" />
  <oge-toolbar-item text="Zoom" />
</oge-toolbar>`,
});

export const CONFIG_SNIPPET = `import { provideOgeToolbarConfig } from '@oge-ui/layout';

export const appConfig: ApplicationConfig = {
  providers: [
    provideOgeToolbarConfig({
      size: 'sm',
      stylingMode: 'flat',
      messages: {
        toolbar: 'Araç çubuğu',
        overflowMenu: 'Daha fazla komut',
        noData: 'Gösterilecek komut yok',
      },
    }),
  ],
};`;

export const MODES_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeToolbar', 'OgeToolbarItem'] },
  types: { '@oge-ui/layout': ['OgeToolbarOverflow'] },
  template: `<!-- Five modes, one input. 'menu' collapses into an overlay menu,
     'scroll' keeps one line and adds arrows, 'wrap' flows onto more
     lines (the reference multiline mode), 'extended' hides the remainder in a
     second row behind a toggle, 'none' simply overflows. -->
<oge-toolbar [overflow]="mode()">
  <oge-toolbar-item text="Cut" />
  <oge-toolbar-item text="Copy" />
  <oge-toolbar-item text="Paste" />
  <oge-toolbar-item text="Paste special" />
  <oge-toolbar-item text="Print preview" />
</oge-toolbar>`,
  body: `protected readonly mode = signal<OgeToolbarOverflow>('extended');`,
});

export const TOGGLE_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeToolbar', 'OgeToolbarItem'] },
  types: { '@oge-ui/layout': ['OgeToolbarItemActiveChangedEvent'] },
  template: `<!-- A defined 'active' is what makes an item a toggle: it renders
     aria-pressed on the bar and a checkmark in the overflow menu, and
     every activation flips it. Declarative children own a two-way
     model; items[] entries are data, so the toolbar reports instead. -->
<oge-toolbar (activeChanged)="onToggle($event)">
  <oge-toolbar-item text="Bold" [(active)]="bold" />
  <oge-toolbar-item text="Italic" [(active)]="italic" />
</oge-toolbar>`,
  body: `protected readonly bold = signal(true);
protected readonly italic = signal(false);

protected onToggle(event: OgeToolbarItemActiveChangedEvent): void {
  console.log(event.key, 'is now', event.active);
}`,
});

export const RUNTIME_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeToolbar'] },
  types: { '@oge-ui/layout': ['OgeToolbarItemData'] },
  template: `<!-- items stays the declared source of truth; the imperative calls
     are an override layer on top of it, so a re-supplied array cannot
     silently undo hideItem(). refreshOverflow() re-measures after
     something the toolbar cannot observe changed a control's size. -->
<oge-toolbar #bar [items]="tools" />
<button type="button" (click)="bar.addItem({ key: 'new', text: 'Added' })">
  addItem
</button>
<button type="button" (click)="bar.hideItem('copy')">hideItem</button>
<button type="button" (click)="bar.enableItem('paste', false)">disable</button>
<button type="button" (click)="bar.clearItemOverrides()">reset</button>
<button type="button" (click)="bar.refreshOverflow()">refreshOverflow</button>`,
  body: `protected readonly tools: readonly OgeToolbarItemData[] = [
  { key: 'cut', text: 'Cut' },
  { key: 'copy', text: 'Copy' },
  { key: 'paste', text: 'Paste' },
];`,
});
