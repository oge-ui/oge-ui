import { demoSource } from '../../shared/demo-source';

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeCard', 'OgeCardActions'] },
  template: `<oge-card header="Mountains" subheader="Alps, 2026">
  <p>Four days above the tree line, one pass a day.</p>
  <div ogeCardActions align="end">
    <button type="button" (click)="share()">Share</button>
  </div>
</oge-card>`,
  body: `protected share(): void {}`,
});

export const MODES_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeCard'] },
  template: `<!-- outlined is the default; raised rests on the --oge-shadow-card
     token, filled sits on the header surface, flat is for a card
     nested inside another surface. -->
<oge-card header="Outlined">…</oge-card>
<oge-card header="Raised" stylingMode="raised">…</oge-card>
<oge-card header="Filled" stylingMode="filled">…</oge-card>
<oge-card header="Flat" stylingMode="flat">…</oge-card>`,
});

export const MEDIA_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeCard', 'OgeCardMedia'] },
  template: `<!-- Media is full-bleed: it touches the card edges while the sections
     around it keep the padding. Size it with your own CSS — there is
     deliberately no aspectRatio input. -->
<oge-card header="Mountains" subheader="Alps, 2026">
  <img
    ogeCardMedia
    src="https://picsum.photos/seed/oge-alps/640/360"
    alt=""
    style="aspect-ratio: 16 / 9"
  />
  <p>The heading stays before the media in DOM order, so a screen
    reader announces the card by its title first.</p>
</oge-card>`,
});

export const HORIZONTAL_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeCard', 'OgeCardMedia'] },
  template: `<!-- The media moves into an inline-start column spanning every other
     section; --oge-card-media-size sets the column width. -->
<oge-card
  header="Mountains"
  orientation="horizontal"
  style="--oge-card-media-size: 160px"
>
  <img ogeCardMedia src="https://picsum.photos/seed/oge-lake/320/320" alt="" />
  <p>Vertical is the default; Kendo is the only reference with an
    orientation input at all.</p>
</oge-card>`,
});

export const HEADER_SNIPPET = demoSource({
  use: {
    '@oge-ui/layout': ['OgeCard', 'OgeCardAvatar', 'OgeCardHeaderActions'],
  },
  template: `<!-- The header row renders only when it has something to show:
     titles, an avatar or header actions. The actions are real
     controls in the Tab sequence — the card never wraps them in
     anything interactive. -->
<oge-card header="R. Aydın" subheader="3 hours ago">
  <img ogeCardAvatar src="https://i.pravatar.cc/80?img=12" alt="" />
  <div ogeCardHeaderActions>
    <button type="button" aria-label="More options" (click)="menu()">⋮</button>
  </div>
  <p>Reached the ridge before the weather turned.</p>
</oge-card>`,
  body: `protected menu(): void {}`,
});

export const ACTIONS_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeCard', 'OgeCardActions'] },
  template: `<!-- align follows the references: start (the Material/Kendo default),
     center, end, and Kendo's stretched — every action takes equal width. -->
<oge-card header="Draft">
  <p>Unsaved changes.</p>
  <div ogeCardActions align="stretched">
    <button type="button" (click)="discard()">Discard</button>
    <button type="button" (click)="save()">Save</button>
  </div>
</oge-card>`,
  body: `protected discard(): void {}
protected save(): void {}`,
});

export const FOOTER_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeCard', 'OgeCardFooter', 'OgeCardSeparator'] },
  template: `<oge-card header="Weekly report">
  <p>Generated from last week&#39;s data.</p>
  <hr ogeCardSeparator />
  <p>12 pages, 4 charts.</p>
  <div ogeCardFooter>Updated 2 hours ago</div>
</oge-card>`,
});

export const SIZE_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeCard'] },
  template: `<!-- size scales the section padding and type ramp together;
     --oge-card-pad is the per-card escape hatch. -->
<oge-card header="Compact" size="sm">…</oge-card>
<oge-card header="Default">…</oge-card>
<oge-card header="Comfortable" size="lg">…</oge-card>`,
});

export const STATES_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeCard', 'OgeCardActions'] },
  template: `<!-- severity draws a status rail on the inline-start edge (the
     toast's rail idiom); loading swaps the content and actions for a
     shimmer skeleton and marks the card aria-busy — header, media and
     footer keep the footprint while the data arrives. -->
<oge-card header="Deploy failed" subheader="build #412" severity="danger">
  <p>The e2e stage timed out after 20 minutes.</p>
  <div ogeCardActions align="end">
    <button type="button" (click)="retry()">Retry</button>
  </div>
</oge-card>

<oge-card header="Weekly report" [loading]="pending()" />`,
  body: `protected readonly pending = signal(true);

protected retry(): void {}`,
});

export const CLICKABLE_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeCard'] },
  template: `<!-- There is no clickable input, on purpose: wrapping the card in a
     link or button is the nested-interactive axe violation the moment
     a second control appears, and a screen reader would read the whole
     card as one link name. Instead: ONE primary <a> in the content and
     a CSS stretched hit area over the positioned card —

       .oge-card { position: relative; }
       .card-link::after { content: ''; position: absolute; inset: 0; }

     Other controls stay usable by raising them above the overlay
     (position: relative + z-index). [interactive] is the visual half:
     a hover/focus-within lift and ring, with no role, tabindex or
     wrapper of its own. -->
<oge-card
  header="Mountains"
  subheader="Alps, 2026"
  [interactive]="true"
  style="position: relative"
>
  <p>Four days above the tree line.</p>
  <a class="card-link" href="/trips/alps-2026">Read the full report</a>
</oge-card>`,
});

export const CONFIG_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeCard'] },
  helpers: { '@oge-ui/layout': ['provideOgeCardConfig'] },
  template: `<!-- Instance inputs win over the provided defaults. -->
<oge-card header="From config">…</oge-card>
<oge-card header="Overridden" stylingMode="outlined">…</oge-card>`,
  before: `// Application- or component-scoped defaults. There is no messages
// block: the card renders no user-facing strings of its own.
export const cardProviders = [
  provideOgeCardConfig({ stylingMode: 'raised' }),
];`,
});
