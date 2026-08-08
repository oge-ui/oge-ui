import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlock } from '../../shared/code-block';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import { INSTALL, NG_ADD, OPTIONAL, PROVIDERS, VERIFY } from './setup-snippets';

const SECTIONS = [
  'Requirements',
  'Install the packages',
  'ng add',
  'Optional dependencies',
  'Application providers',
  'Verify the setup',
] as const;

@Component({
  selector: 'app-getting-started-setup',
  imports: [CodeBlock, DocHeader, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Set up your project"
      category="Getting Started"
      categoryLink="/getting-started"
      [chips]="['npm install', 'standalone', 'zoneless-ready']"
    >
      <p>
        Add OGE to a new or existing Angular application. There is no required
        global stylesheet and no module to import — install a package, import a
        component class, done. <code>ng add</code> works too, and does a little
        extra for the AI assistants working in your repo.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <h2 id="requirements" class="scroll-mt-20">Requirements</h2>
    <ul>
      <li>
        <strong>Angular 22 or newer</strong> — components use signal inputs, the
        new control flow and Signal Forms interop.
      </li>
      <li>
        <strong>Node.js 22.22+</strong> — the minimum the Angular CLI itself
        requires.
      </li>
      <li>
        Standalone and zoneless applications are fully supported; there is no
        dependency on <code>zone.js</code> or NgModules.
      </li>
    </ul>

    <h2 id="install-the-packages" class="scroll-mt-20">Install the packages</h2>
    <p>
      Packages are independent — pick the families you need. Shared engines
      (<code>&#64;oge-ui/core</code> for data processing,
      <code>&#64;oge-ui/overlay</code> for popup positioning) are declared as
      dependencies and install automatically.
    </p>
    <app-code-block [code]="install" language="bash" />

    <h2 id="ng-add" class="scroll-mt-20">ng add</h2>
    <p>
      Every package ships an <code>ng add</code> schematic. It installs the
      package, optionally registers a theme stylesheet, and writes a short usage
      block into your <code>AGENTS.md</code> so AI coding assistants working in
      the repo reach for OGE — and read the API reference that ships in
      <code>node_modules</code> instead of guessing.
    </p>
    <app-code-block [code]="ngAdd" language="bash" />
    <ul>
      <li>
        <code>--theme</code> — <code>dark</code>, <code>tailwind</code> or
        <code>bootstrap</code>. Omit it for the default light theme, which is
        built into the components.
      </li>
      <li>
        <code>--skip-agents-file</code> — leave <code>AGENTS.md</code> alone.
      </li>
      <li>
        <code>--project</code> — which workspace project to configure, when the
        workspace has more than one application.
      </li>
    </ul>
    <p>
      The block is written between <code>&lt;!-- oge-ui:start --&gt;</code>
      markers and regenerated from the OGE packages in your
      <code>package.json</code>, so adding a second family grows the table
      instead of duplicating it. Everything outside the markers is left
      untouched.
    </p>

    <h2 id="optional-dependencies" class="scroll-mt-20">
      Optional dependencies
    </h2>
    <p>
      Export features live in secondary entry points so their libraries stay out
      of your bundle until you use them. Install the peer only when you import
      the matching entry:
    </p>
    <app-code-block [code]="optional" language="bash" />
    <ul>
      <li>
        <code>&#64;oge-ui/grid/export-excel</code> and
        <code>&#64;oge-ui/tree-list/export-excel</code> require
        <code>exceljs</code>.
      </li>
      <li>
        <code>&#64;oge-ui/grid/export-pdf</code> requires <code>jspdf</code>.
      </li>
      <li>CSV export is built in — no extra dependency.</li>
    </ul>

    <h2 id="application-providers" class="scroll-mt-20">
      Application providers
    </h2>
    <p>
      Every package ships a <code>provideOge…Config()</code> function for
      application-wide defaults — sizing, timings and all user-facing strings.
      This step is optional: without providers, components use their built-in
      defaults. See
      <a
        class="text-indigo-600 hover:underline dark:text-indigo-400"
        routerLink="/getting-started/localization"
        >Localization</a
      >
      for the full message catalogs.
    </p>
    <app-code-block [code]="providers" language="ts" />

    <h2 id="verify-the-setup" class="scroll-mt-20">Verify the setup</h2>
    <p>
      Drop a component into your root template. If the button below renders with
      the accent color and a hover state, the setup is complete — styles are
      bundled with the components, so nothing needs to be added to
      <code>angular.json</code>.
    </p>
    <app-code-block [code]="verify" language="ts" />
    <p>
      Next:
      <a
        class="text-indigo-600 hover:underline dark:text-indigo-400"
        routerLink="/getting-started/styling"
        >style the app</a
      >
      with design tokens, or jump straight to a component overview from the
      sidebar.
    </p>
  `,
})
export class GettingStartedSetupPage {
  protected readonly sections = SECTIONS;
  protected readonly install = INSTALL;
  protected readonly ngAdd = NG_ADD;
  protected readonly optional = OPTIONAL;
  protected readonly providers = PROVIDERS;
  protected readonly verify = VERIFY;
}
