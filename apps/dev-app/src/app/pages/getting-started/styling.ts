import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CodeBlock } from '../../shared/code-block';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  BRIDGE,
  COLORS,
  DARK,
  DARK_HTML,
  SCOPED,
  TOKENS,
} from './styling-snippets';

const SECTIONS = [
  'Design tokens',
  'Scoped overrides',
  'Bridge themes',
  'Dark mode',
  'Component colors',
] as const;

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
