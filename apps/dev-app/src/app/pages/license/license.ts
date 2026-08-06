import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DocHeader } from '../../shared/doc-header';

@Component({
  selector: 'app-license',
  imports: [DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Licensing"
      category="Getting Started"
      categoryLink="/getting-started"
      [chips]="['open-core', 'MIT', 'commercial pivot']"
    >
      <p>
        OGE UI is <strong>open-core</strong>: the suite is MIT-licensed and free
        for any use — one analytics package, the Pivot Grid, is commercial.
      </p>
    </app-doc-header>

    <h2 class="scroll-mt-20">MIT — free forever</h2>
    <p>
      <code>oge-ui</code>, <code>&#64;oge-ui/core</code>,
      <code>&#64;oge-ui/grid</code> (including Excel/PDF export, master-detail
      and server-side operations), <code>&#64;oge-ui/tree-list</code>,
      <code>&#64;oge-ui/inputs</code>, <code>&#64;oge-ui/buttons</code> and
      <code>&#64;oge-ui/overlay</code> are released under the
      <a
        href="https://github.com/oge-ui/oge-ui/blob/main/LICENSE"
        target="_blank"
        rel="noopener"
        >MIT license</a
      >.
    </p>
    <p>
      This is a commitment, not a phase:
      <strong
        >these packages and every feature currently in them will remain
        MIT.</strong
      >
      No feature that is free today will ever move behind a paid license.
    </p>

    <h2 class="scroll-mt-20">Commercial — Pivot Grid</h2>
    <p>
      <code>&#64;oge-ui/pivot</code> is source-available commercial software
      under the
      <a
        href="https://github.com/oge-ui/oge-ui/blob/main/packages/pivot/LICENSE"
        target="_blank"
        rel="noopener"
        >OGE UI Commercial License</a
      >:
    </p>
    <ul>
      <li>
        <strong>Free</strong> for evaluation, development, testing and any other
        non-production use — install it from npm and try everything.
      </li>
      <li>
        <strong>Paid license required</strong> for production deployments.
        Per-developer licensing is being finalized; until pricing is public, get
        in touch and we will set you up:
        <a href="mailto:license&#64;ogeui.com">license&#64;ogeui.com</a>.
      </li>
      <li>
        Future analytics-oriented packages (for example charts) may join the
        commercial tier — never anything that is MIT today.
      </li>
    </ul>

    <h2 class="scroll-mt-20">Why this model?</h2>
    <p>
      The paid tier funds full-time maintenance of the free one. It is the same
      model proven by other data-grid vendors — with a deliberately more
      generous free tier: features that competitors sell (master-detail, Excel
      export, advanced filtering, server-side operations) are MIT in OGE.
    </p>

    <h2 class="scroll-mt-20">Questions</h2>
    <p>
      Licensing questions, volume needs, or anything unclear —
      <a href="mailto:license&#64;ogeui.com">license&#64;ogeui.com</a> or open a
      <a
        href="https://github.com/oge-ui/oge-ui/issues"
        target="_blank"
        rel="noopener"
        >GitHub issue</a
      >.
    </p>
  `,
})
export class LicensePage {}
