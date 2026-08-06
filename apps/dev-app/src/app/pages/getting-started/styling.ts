import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CodeBlock } from '../../shared/code-block';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';

const SECTIONS = [
  'Design tokens',
  'Scoped overrides',
  'Bridge themes',
  'Dark mode',
  'Component colors',
] as const;

const TOKENS = `/* One override restyles every component consistently. */
:root {
  --oge-accent: #4f46e5;      /* selection, focus, primary actions      */
  --oge-radius-lg: 10px;      /* cards, popups, buttons                 */
  --oge-row-height: 32px;     /* grid & tree-list row density           */
  --oge-input-width: 240px;   /* default editor width                   */
  --oge-header-bg: #eef2f8;   /* grid header surface                    */
}`;

const SCOPED = `/* Tokens cascade — scope them to re-skin a single area. */
.compact-dashboard {
  --oge-row-height: 26px;
  --oge-radius-lg: 6px;
}

/* Or a single component instance */
.danger-zone oge-button {
  --oge-accent: var(--oge-danger);
}`;

const BRIDGE = `/* Bridge themes map --oge-* tokens onto your framework's variables,
   so components automatically follow your existing design system. */
@import '@oge-ui/grid/themes/tailwind.css';   /* Tailwind v4  */
@import '@oge-ui/grid/themes/bootstrap.css';  /* Bootstrap 5  */`;

const DARK = `/* Import once, then toggle a class — on <html> for the whole app
   or on any subtree for a mixed page. */
@import '@oge-ui/grid/themes/dark.css';`;

const DARK_HTML = `<!-- whole application -->
<html class="oge-theme-dark">

<!-- or a single region -->
<section class="oge-theme-dark">
  <oge-grid [data]="rows" />
</section>`;

const COLORS = `<!-- Semantic severities cover most cases… -->
<oge-button text="Save" severity="success" />
<oge-button text="Delete" severity="danger" stylingMode="outlined" />

<!-- …and any CSS color works for brand-specific accents; hover and
     soft tones are derived automatically. -->
<oge-button text="Brand action" color="#7c3aed" />
<oge-button text="Teal outline" color="teal" stylingMode="outlined" />`;

@Component({
  selector: 'app-getting-started-styling',
  imports: [CodeBlock, DocHeader, PageToc],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Style the app"
      category="Getting Started"
      categoryLink="/getting-started"
      [chips]="['--oge-* tokens', 'bridge themes', 'dark mode', 'color']"
    >
      <p>
        Components never hardcode visual values — everything renders through
        <code>--oge-*</code> CSS design tokens. Override a token globally to
        restyle the whole suite, scope it to a container for local skins, or let
        a bridge theme align every component with the CSS framework you already
        use.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <h2 id="design-tokens" class="scroll-mt-20">Design tokens</h2>
    <p>
      Tokens are plain CSS custom properties. Set them on
      <code>:root</code> (or any stylesheet you already own) — no build step, no
      theme API, live at runtime:
    </p>
    <app-code-block [code]="tokens" language="css" />
    <p>
      The suite covers surfaces, text, accent and severity colors, radii, row
      and control heights, focus rings, shadows and popup layering. Use the
      <em>Theme</em> selector in the top bar to see token remapping live on
      every example in these docs.
    </p>

    <h2 id="scoped-overrides" class="scroll-mt-20">Scoped overrides</h2>
    <p>
      Because tokens cascade like any CSS custom property, an override applies
      to exactly the subtree you set it on — perfect for dense dashboards,
      embedded widgets or one-off exceptions:
    </p>
    <app-code-block [code]="scoped" language="css" />

    <h2 id="bridge-themes" class="scroll-mt-20">Bridge themes</h2>
    <p>
      A bridge theme is a small CSS file that assigns your framework's variables
      to the OGE tokens. Import it once and every component picks up your
      palette, radii and densities — remove it and the neutral default returns:
    </p>
    <app-code-block [code]="bridge" language="css" />

    <h2 id="dark-mode" class="scroll-mt-20">Dark mode</h2>
    <p>
      Dark mode is a token remap behind the
      <code>.oge-theme-dark</code> class — it composes with bridge themes and
      scoped overrides:
    </p>
    <app-code-block [code]="dark" language="css" />
    <app-code-block [code]="darkHtml" language="html" />

    <h2 id="component-colors" class="scroll-mt-20">Component colors</h2>
    <p>
      For per-instance color, buttons accept a semantic
      <code>severity</code> — or an arbitrary <code>color</code> when your brand
      needs something outside the semantic set:
    </p>
    <app-code-block [code]="colors" language="html" />
  `,
})
export class GettingStartedStylingPage {
  protected readonly sections = SECTIONS;
  protected readonly tokens = TOKENS;
  protected readonly scoped = SCOPED;
  protected readonly bridge = BRIDGE;
  protected readonly dark = DARK;
  protected readonly darkHtml = DARK_HTML;
  protected readonly colors = COLORS;
}
