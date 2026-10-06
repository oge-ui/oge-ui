import { demoSource } from '../../shared/demo-source';

export const CONTENT_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeAvatar'] },
  template: `<!-- The fallback chain runs on its own: an image while src loads, the
     initials (explicit or derived from name) when it fails, the icon
     without either. The host is role="img" named by the name. -->
<oge-avatar name="OGE UI" src="/logo.png" />
<oge-avatar name="Ada Lovelace" src="/missing-avatar.png" (imageFailed)="failed.set($event.src)" />
<oge-avatar name="Grace Hopper" initials="GH" />
<oge-avatar ariaLabel="Guest" />`,
  body: `protected readonly failed = signal('');`,
});

export const SIZES_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeAvatar'] },
  template: `<!-- xs 24 · sm 32 · md 40 · lg 48 · xl 64 px; circle, rounded, square. -->
@for (size of sizes; track size) {
  <oge-avatar name="Ada Lovelace" [size]="size" />
}
<oge-avatar name="Grace Hopper" size="lg" shape="rounded" />
<oge-avatar name="Alan Turing" size="lg" shape="square" />`,
  body: `protected readonly sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;`,
});

export const STATUS_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeAvatar'] },
  template: `<!-- The dot is aria-hidden; the presence joins the accessible name
     ("Ada Lovelace (Online)"). Offline is a hollow ring, so the state never
     rides on colour alone. Next to a visible name, decorative avoids
     reading it twice. -->
<oge-avatar name="Ada Lovelace" status="online" />
<oge-avatar name="Grace Hopper" status="away" />
<oge-avatar name="Alan Turing" status="busy" />
<oge-avatar name="Edsger Dijkstra" status="offline" />

<span class="person">
  <oge-avatar name="Ada Lovelace" size="sm" [decorative]="true" />
  Ada Lovelace
</span>`,
});

export const GROUP_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeAvatar', 'OgeAvatarGroup'] },
  types: { '@oge-ui/layout': ['OgeAvatarItem'] },
  template: `<!-- max counts the rendered circles INCLUDING the surplus one, so the
     row never grows past it. total is the full population of a partially
     loaded list. Projected children follow the items. -->
<oge-avatar-group [items]="team" [max]="4" ariaLabel="Project team" />

<oge-avatar-group [items]="reviewers" [max]="4" [total]="24" size="sm" ariaLabel="Reviewers" />

<oge-avatar-group [overlap]="false" ariaLabel="On call">
  <oge-avatar name="Ada Lovelace" status="online" />
  <oge-avatar name="Grace Hopper" status="busy" />
</oge-avatar-group>`,
  body: `protected readonly team: OgeAvatarItem[] = [
  { key: 1, name: 'Ada Lovelace', status: 'online' },
  { key: 2, name: 'Grace Hopper' },
  { key: 3, name: 'Alan Turing', status: 'away' },
  { key: 4, name: 'Edsger Dijkstra' },
  { key: 5, name: 'Barbara Liskov' },
  { key: 6, name: 'Donald Knuth' },
];
// three of 24 reviewers are loaded — total counts the rest into "+N"
protected readonly reviewers = this.team.slice(0, 3);`,
});

export const OVERLAY_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeAvatar', 'OgeBadge'] },
  template: `<!-- The glyph is aria-hidden decoration; the wrapped control's
     aria-describedby points at the description, so a screen reader hears
     "Inbox, 5 new items". Above max it shows 99+. -->
<oge-badge [value]="unread()">
  <button type="button" (click)="unread.set(unread() + 1)">Inbox</button>
</oge-badge>

<oge-badge [value]="120" severity="accent" position="bottom-end">
  <button type="button">Notifications</button>
</oge-badge>

<!-- overlap="circle" sits on the outline of a round host -->
<oge-badge [dot]="true" severity="success" overlap="circle" description="Available">
  <oge-avatar name="Grace Hopper" />
</oge-badge>`,
  body: `protected readonly unread = signal(5);`,
});

export const STANDALONE_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeBadge'] },
  template: `<!-- Without content the badge is an inline pill with a visually hidden
     description. A zero count hides unless showZero; invisible force-hides. -->
<span>Messages <oge-badge [value]="3" /></span>
<span>Plan <oge-badge value="Beta" severity="accent" /></span>
<span>Updates <oge-badge [dot]="true" description="New updates" /></span>
<span>Errors <oge-badge [value]="0" [showZero]="true" severity="neutral" size="sm" /></span>`,
});

export const ANNOUNCE_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeBadge'] },
  template: `<!-- announce speaks later changes through a polite live region; the
     initial value is part of the page and is never announced. -->
<oge-badge [value]="cart()" [announce]="true" description="{{ cart() }} items in cart">
  <button type="button">Cart</button>
</oge-badge>
<button type="button" (click)="cart.set(cart() + 1)">Add item</button>`,
  body: `protected readonly cart = signal(1);`,
});

export const CONFIG_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeAvatar', 'OgeBadge'] },
  helpers: {
    '@oge-ui/layout': ['provideOgeAvatarConfig', 'provideOgeBadgeConfig'],
  },
  template: `<oge-avatar name="Ada Lovelace" status="busy" />
<oge-badge [value]="12" />`,
  before: `// Application- or component-scoped defaults; every user-facing string
// (presence labels, "N more", the badge descriptions) is in messages.
export const avatarProviders = [
  provideOgeAvatarConfig({ size: 'sm', messages: { busy: 'In a meeting' } }),
  provideOgeBadgeConfig({ max: 9, severity: 'accent' }),
];`,
});
