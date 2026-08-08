/** Code samples rendered on the styling page. */

export const TOKENS = `/* One override restyles every component consistently. */
:root {
  --oge-accent: #4f46e5;      /* selection, focus, primary actions      */
  --oge-radius-lg: 10px;      /* cards, popups, buttons                 */
  --oge-row-height: 32px;     /* grid & tree-list row density           */
  --oge-input-width: 240px;   /* default editor width                   */
  --oge-header-bg: #eef2f8;   /* grid header surface                    */
}`;

export const SCOPED = `/* Tokens cascade — scope them to re-skin a single area. */
.compact-dashboard {
  --oge-row-height: 26px;
  --oge-radius-lg: 6px;
}

/* Or a single component instance */
.danger-zone oge-button {
  --oge-accent: var(--oge-danger);
}`;

export const BRIDGE = `/* Bridge themes map --oge-* tokens onto your framework's variables,
   so components automatically follow your existing design system. */
@import '@oge-ui/grid/themes/tailwind.css';   /* Tailwind v4  */
@import '@oge-ui/grid/themes/bootstrap.css';  /* Bootstrap 5  */`;

export const DARK = `/* Import once, then toggle a class — on <html> for the whole app
   or on any subtree for a mixed page. */
@import '@oge-ui/grid/themes/dark.css';`;

export const DARK_HTML = `<!-- whole application -->
<html class="oge-theme-dark">

<!-- or a single region -->
<section class="oge-theme-dark">
  <oge-grid [data]="rows" />
</section>`;

export const COLORS = `<!-- Semantic severities cover most cases… -->
<oge-button text="Save" severity="success" />
<oge-button text="Delete" severity="danger" stylingMode="outlined" />

<!-- …and any CSS color works for brand-specific accents; hover and
     soft tones are derived automatically. -->
<oge-button text="Brand action" color="#7c3aed" />
<oge-button text="Teal outline" color="teal" stylingMode="outlined" />`;
