import { demoSource } from '../../shared/demo-source';

/** Icon path data shared by the FAB demos (24×24 viewBox, stroked). */
export const FAB_ICONS = {
  pencil: 'M4 20h4L19 9l-4-4L4 16v4Z',
  share: 'M4 12v7h16v-7M12 3v12M7 8l5-5 5 5',
  mail: 'M3 6h18v12H3zM3 6l9 7 9-7',
  print: 'M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z',
  doc: 'M6 3h9l4 4v14H6zM14 3v5h5',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3',
} as const;

export const FAB_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeFab'] },
  before: `const PENCIL = '${FAB_ICONS.pencil}';`,
  template: `<!-- An icon-only FAB is named by its label. positionMode="absolute"
     pins it inside the nearest positioned ancestor; the default "fixed"
     pins it to the viewport, with safe-area insets as a floor. -->
<div style="position: relative; height: 224px">
  <oge-fab
    label="Compose"
    [icon]="pencil"
    positionMode="absolute"
    (clicked)="compose()"
  />
</div>`,
  body: `protected readonly pencil = PENCIL;

protected compose(): void {
  console.log('compose');
}`,
});

export const EXTENDED_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeFab'] },
  before: `const PENCIL = '${FAB_ICONS.pencil}';
const SHARE = '${FAB_ICONS.share}';`,
  template: `<!-- extended shows the label as text beside the icon (a pill);
     size and severity follow the button vocabulary. -->
<oge-fab label="Compose" [icon]="pencil" [extended]="true" positionMode="static" />
<oge-fab label="Share" [icon]="share" size="sm" severity="normal" positionMode="static" />
<oge-fab label="Share" [icon]="share" severity="success" positionMode="static" />
<oge-fab label="Share" [icon]="share" size="lg" severity="danger" positionMode="static" />`,
  body: `protected readonly pencil = PENCIL;
protected readonly share = SHARE;`,
});

export const POSITIONS_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeFab'] },
  types: { '@oge-ui/buttons': ['OgeFabPosition'] },
  before: `const PENCIL = '${FAB_ICONS.pencil}';`,
  template: `<!-- Six logical positions (start/end mirror in RTL). Pinned edges
     use max(offset, env(safe-area-inset-*)), so the FAB clears a phone's
     home indicator once the app opts into viewport-fit=cover. -->
<div style="position: relative; height: 256px">
  @for (position of positions; track position) {
    <oge-fab
      [label]="position"
      [icon]="pencil"
      size="sm"
      positionMode="absolute"
      [position]="position"
      offset="12px"
    />
  }
</div>`,
  body: `protected readonly pencil = PENCIL;
protected readonly positions: OgeFabPosition[] = [
  'top-start',
  'top-center',
  'top-end',
  'bottom-start',
  'bottom-center',
  'bottom-end',
];`,
});

export const SPEED_DIAL_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeSpeedDial'] },
  types: {
    '@oge-ui/buttons': ['OgeSpeedDialItem', 'OgeSpeedDialItemClickEvent'],
  },
  before: `const MAIL = '${FAB_ICONS.mail}';
const PRINT = '${FAB_ICONS.print}';
const SHARE = '${FAB_ICONS.share}';
const TRASH = '${FAB_ICONS.trash}';`,
  template: `<!-- The APG menu button pattern on a FAB: Enter, Space, a click or the
     arrow pointing along the dial opens it on the nearest action; the
     arrows move and wrap, Escape returns focus to the FAB. -->
<div style="position: relative; height: 288px">
  <oge-speed-dial
    label="Share options"
    positionMode="absolute"
    [items]="actions"
    [(opened)]="opened"
    (itemClick)="run($event)"
  />
</div>
<p>Last action: {{ last() }}</p>`,
  body: `protected readonly opened = signal(false);
protected readonly last = signal('none');
protected readonly actions: OgeSpeedDialItem[] = [
  { key: 'mail', label: 'Email', icon: MAIL },
  { key: 'print', label: 'Print', icon: PRINT },
  { key: 'share', label: 'Copy link', icon: SHARE },
  { key: 'delete', label: 'Delete', icon: TRASH, severity: 'danger' },
];

protected run(event: OgeSpeedDialItemClickEvent): void {
  this.last.set(event.item.label);
}`,
});

export const DIRECTIONS_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeSpeedDial'] },
  types: { '@oge-ui/buttons': ['OgeSpeedDialItem'] },
  before: `const DOC = '${FAB_ICONS.doc}';
const IMAGE = '${FAB_ICONS.image}';
const MAIL = '${FAB_ICONS.mail}';`,
  template: `<!-- direction overrides the default (away from the pinned edge);
     labelMode "always" shows every label while open, "none" keeps them as
     accessible names only. -->
<div style="position: relative; height: 240px">
  <oge-speed-dial
    label="New file"
    positionMode="absolute"
    position="bottom-end"
    direction="start"
    labelMode="none"
    [items]="files"
  />
  <oge-speed-dial
    label="Insert"
    positionMode="absolute"
    position="top-start"
    labelMode="always"
    size="sm"
    [items]="files"
  />
</div>`,
  body: `protected readonly files: OgeSpeedDialItem[] = [
  { key: 'doc', label: 'Document', icon: DOC },
  { key: 'image', label: 'Image', icon: IMAGE },
  { key: 'mail', label: 'Email draft', icon: MAIL, disabled: true },
];`,
});

export const HOVER_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeSpeedDial'] },
  types: { '@oge-ui/buttons': ['OgeSpeedDialItem'] },
  before: `const MAIL = '${FAB_ICONS.mail}';
const SHARE = '${FAB_ICONS.share}';`,
  template: `<!-- openMode="hover" also opens while a mouse hovers the dial (never
     on touch, where a tap is the only gesture). Hover does not move focus;
     a click still opens it with focus on the first action. -->
<div style="position: relative; height: 224px">
  <oge-speed-dial
    label="Quick actions"
    openMode="hover"
    positionMode="absolute"
    severity="normal"
    [items]="quick"
  />
</div>`,
  body: `protected readonly quick: OgeSpeedDialItem[] = [
  { key: 'share', label: 'Share', icon: SHARE },
  { key: 'mail', label: 'Email', icon: MAIL },
];`,
});
