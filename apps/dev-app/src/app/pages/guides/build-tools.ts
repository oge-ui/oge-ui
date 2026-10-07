import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlock } from '../../shared/code-block';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { GuideTable } from './guide-table';
import {
  CLI_COMPONENT,
  CLI_CREATE,
  CLI_STYLES,
  NX_INSTALL,
  NX_PROJECT,
  VITE_APP,
  VITE_CREATE,
  VITE_MAIN,
} from './build-tools-snippets';

const SECTIONS = [
  'Vite (React)',
  'Angular CLI',
  'Nx workspaces',
  'What every setup shares',
] as const;

/** `/guides/build-tools` — Vite, the Angular CLI and Nx. */
@Component({
  selector: 'app-guide-build-tools',
  imports: [CodeBlock, DocHeader, GuideTable, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Vite, Angular CLI and Nx"
      category="Guides"
      categoryLink="/guides"
      [chips]="['vite', 'ng add', 'nx']"
    >
      <p>
        OGE packages are plain ESM with typed exports maps and
        <code>sideEffects</code> declared, so every standard toolchain bundles
        and tree-shakes them with no plugin. The differences between setups are
        where the stylesheet goes and whether <code>ng add</code> can do it for
        you.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <h2 id="vite-react" class="scroll-mt-20">Vite (React)</h2>
    <app-code-block [code]="viteCreate" language="bash" />
    <app-code-block [code]="viteMain" language="tsx" />
    <app-code-block [code]="viteApp" language="tsx" />
    <p>
      React 18 and 19 are both supported (a peer dependency, so the packages use
      your app's copy). Export helpers are separate entry points and pull
      <code>exceljs</code> / <code>jspdf</code> into a lazy chunk only when you
      import them.
    </p>

    <h2 id="angular-cli" class="scroll-mt-20">Angular CLI</h2>
    <app-code-block [code]="cliCreate" language="bash" />
    <ul>
      <li>
        Component styles travel with the components — there is no global
        stylesheet to add for the default light theme.
      </li>
      <li>
        <code>--theme=dark|high-contrast|tailwind|bootstrap</code> puts
        <code>node_modules/&#64;oge-ui/core/themes/&lt;theme&gt;.css</code>
        <strong>first</strong> in the project's <code>styles</code>, so your own
        stylesheet still wins. Without <code>ng add</code>, import it yourself:
      </li>
    </ul>
    <app-code-block [code]="cliStyles" language="css" />
    <app-code-block [code]="cliComponent" language="ts" />

    <h2 id="nx-workspaces" class="scroll-mt-20">Nx workspaces</h2>
    <p>
      Nothing Nx-specific is needed: install at the workspace root and import
      from any app or library. Two differences from a CLI project:
    </p>
    <ul>
      <li>
        <code>ng add</code> edits <code>angular.json</code>, which an Nx
        workspace does not have. It never fails — it prints the manual step —
        but the theme and the <code>AGENTS.md</code> block are then yours to
        add. Put the theme in the app's <code>project.json</code> styles (first)
        or <code>&#64;import</code> it from the app's stylesheet.
      </li>
      <li>
        <code>&#64;nx/enforce-module-boundaries</code> only constrains your own
        projects; the <code>&#64;oge-ui/*</code> imports are npm packages and
        need no tags. Keep every <code>&#64;oge-ui/*</code> package on one
        version (Nx's single-version policy does this for you).
      </li>
    </ul>
    <app-code-block [code]="nxInstall" language="bash" />
    <app-code-block [code]="nxProject" language="json" />

    <h2 id="what-every-setup-shares" class="scroll-mt-20">
      What every setup shares
    </h2>
    <app-guide-table
      caption="Setup facts common to every toolchain"
      [head]="['Topic', 'Angular', 'React']"
      [rows]="shared"
    />
    <p>
      Server rendering is covered in
      <a
        class="text-indigo-600 underline dark:text-indigo-400"
        [routerLink]="fw.isReact() ? '/guides/nextjs' : '/guides/angular-ssr'"
        >{{ fw.isReact() ? 'Next.js App Router' : 'Angular SSR' }}</a
      >, bundle numbers per entry point on
      <a
        class="text-indigo-600 underline dark:text-indigo-400"
        routerLink="/bundle-size"
        >Bundle size</a
      >.
    </p>
  `,
})
export class GuideBuildToolsPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly viteCreate = VITE_CREATE;
  protected readonly viteMain = VITE_MAIN;
  protected readonly viteApp = VITE_APP;
  protected readonly cliCreate = CLI_CREATE;
  protected readonly cliStyles = CLI_STYLES;
  protected readonly cliComponent = CLI_COMPONENT;
  protected readonly nxInstall = NX_INSTALL;
  protected readonly nxProject = NX_PROJECT;

  protected readonly shared = [
    [
      'Peer range',
      '`@angular/core >=22.0.0 <24.0.0`',
      '`react ^18.0.0 || ^19.0.0`',
    ],
    [
      'Styles',
      'Bundled with each component',
      '`@oge-ui/react-<family>/styles.css` (or `@oge-ui/react/styles.css`)',
    ],
    [
      'Themes',
      '`@oge-ui/core/themes/{dark,high-contrast,tailwind,bootstrap}.css`',
      'The same files',
    ],
    [
      '`sideEffects`',
      "`false` (`['*.css']` in `@oge-ui/core` and `@oge-ui/grid`, which ship theme files)",
      "`['*.css']` — the stylesheet import is kept, the JS tree-shakes",
    ],
    [
      'One import path for everything',
      '`oge-ui` (MIT families; still tree-shakeable)',
      '`@oge-ui/react` (MIT families)',
    ],
    [
      'Per-component entries',
      '`@oge-ui/inputs/select-box`, `@oge-ui/layout/splitter`, `@oge-ui/buttons/fab`, …',
      'Export helpers only (`@oge-ui/react-grid/export-excel`, …)',
    ],
    [
      'Optional peers',
      '`exceljs` (export-excel), `jspdf` + `jspdf-autotable` (grid export-pdf)',
      'The same',
    ],
  ];
}
