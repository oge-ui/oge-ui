import { demoSource } from '../../shared/demo-source';

export const VARIANTS_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeButton'] },
  template: `<oge-button text="Contained" severity="accent" />
<oge-button text="Outlined" severity="accent" stylingMode="outlined" />
<oge-button text="Text" severity="accent" stylingMode="text" />
<oge-button text="Success" severity="success" />
<oge-button text="Warning" severity="warning" />
<oge-button text="Danger" severity="danger" />`,
});

export const SIZES_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeButton'] },
  template: `<oge-button text="Small" size="sm" />
<oge-button text="Medium" />
<oge-button text="Large" size="lg" />`,
});

export const ICON_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeButton', 'OgeButtonIcon'] },
  template: `<oge-button text="Download" severity="accent">
  <svg ogeButtonIcon viewBox="0 0 24 24" width="14" height="14" fill="none"
       stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
</oge-button>

<!-- icon after the label -->
<oge-button text="Next" iconPosition="after">
  <svg ogeButtonIcon viewBox="0 0 24 24" width="14" height="14" fill="none"
       stroke="currentColor" stroke-width="2" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
</oge-button>

<!-- icon-only: give it an accessible name via hint -->
<oge-button hint="Settings">
  <svg ogeButtonIcon viewBox="0 0 24 24" width="14" height="14" fill="none"
       stroke="currentColor" stroke-width="2" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
  </svg>
</oge-button>`,
});

export const COLOR_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeButton'] },
  template: `<!-- any CSS color; the soft tint derives automatically -->
<oge-button text="Purple" color="#7c3aed" />
<oge-button text="Teal" color="#0d9488" stylingMode="outlined" />

<!-- or override the design tokens per instance / theme-wide -->
<oge-button
  text="Brand token"
  severity="accent"
  style="--oge-accent: #ea580c; --oge-accent-soft: rgba(234, 88, 12, 0.14)"
/>`,
});

export const BADGE_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeButton'] },
  template: `<oge-button text="Inbox" [badge]="7" />
<oge-button text="Alerts" [badge]="120" severity="accent" stylingMode="outlined" />
<oge-button text="Live" [badge]="true" stylingMode="text" />`,
});
