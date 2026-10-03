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
@import '@oge-ui/core/themes/tailwind.css';   /* Tailwind v4  */
@import '@oge-ui/core/themes/bootstrap.css';  /* Bootstrap 5  */`;

export const DARK = `/* Import once, then pick a scope — <html> for the whole app or any
   subtree for a mixed page. Ships in @oge-ui/core, which every OGE
   package installs (with pnpm or Yarn PnP, add @oge-ui/core directly). */
@import '@oge-ui/core/themes/dark.css';`;

export const DARK_HTML = `<!-- whole application: a class or the attribute form -->
<html class="oge-theme-dark">
<html data-oge-theme="dark">

<!-- follow the operating system's light/dark setting -->
<html data-oge-theme="auto">

<!-- or a single region — and a light island inside a dark page -->
<section class="oge-theme-dark">
  <oge-grid [data]="rows" />
  <aside class="oge-theme-light">…</aside>
</section>`;

export const HIGH_CONTRAST = `/* An author-side high-contrast palette: text >= 7:1, borders and focus
   rings >= 3:1, a solid focus ring. Import once, then pick a scope. */
@import '@oge-ui/core/themes/high-contrast.css';`;

export const HIGH_CONTRAST_HTML = `<html class="oge-theme-high-contrast">
<html data-oge-theme="high-contrast">

<!-- or one region only -->
<section class="oge-theme-high-contrast">
  <oge-grid [data]="rows" />
</section>`;

export const COLORS = `<!-- Semantic severities cover most cases… -->
<oge-button text="Save" severity="success" />
<oge-button text="Delete" severity="danger" stylingMode="outlined" />

<!-- …and any CSS color works for brand-specific accents; hover and
     soft tones are derived automatically. -->
<oge-button text="Brand action" color="#7c3aed" />
<oge-button text="Teal outline" color="teal" stylingMode="outlined" />`;
