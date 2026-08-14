import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import { OGE_BPMN_API, OGE_BPMN_CONFIG_API } from './bpmn-api-data';

const SECTIONS = ['OgeBpmnEditor', 'Configuration'] as const;

@Component({
  selector: 'app-bpmn-api',
  imports: [ApiReference, DocHeader, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="BPMN Editor API"
      category="BPMN"
      categoryLink="/components/bpmn"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      <p>
        Complete API reference for <code>&#64;oge-ui/bpmn</code>. The engine —
        XML reader/writer, geometry, orthogonal routing, snapping and the
        snapshot command stack — is pure TypeScript inside the package and its
        user-facing surface (<code>readBpmnXml</code>,
        <code>writeBpmnXml</code>, the model types) is exported from the same
        barrel; live demos are on the
        <a
          routerLink="/components/bpmn"
          class="text-indigo-600 underline dark:text-indigo-400"
          >overview</a
        >
        page.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-api-reference
      title="OgeBpmnEditor"
      selector="oge-bpmn-editor"
      [sections]="editorApi"
    />
    <app-api-reference title="Configuration" [sections]="configApi" />

    <h3>Notes</h3>
    <ul>
      <li>
        There is no <code>[diagram]</code> input — the model is owned by the
        editor's command stack so undo can never desynchronize. Load with
        <code>importXml()</code>, observe with <code>elementsChanged</code>,
        read back with <code>exportXml()</code>.
      </li>
      <li>
        Import never fails silently: the few constructs the model cannot
        represent (nested lane sets, extra event definitions on one event,
        timer/error definition payloads) are dropped with an explicit
        <code>BpmnImportWarning</code>, while <code>extensionElements</code>,
        <code>documentation</code> and unknown attributes are preserved verbatim
        and written back on export — camunda-flavored files round-trip
        byte-identically.
      </li>
      <li>
        Persistence has three formats: BPMN XML
        (<code>importXml</code>/<code>exportXml</code>), the versioned JSON
        envelope (<code>importJson</code>/<code>exportJson</code>, also emitted
        by the debounced <code>diagramChanged</code> autosave stream) and static
        SVG (<code>exportSvg</code>, one-way).
      </li>
    </ul>
  `,
})
export class BpmnApiPage {
  protected readonly sections = SECTIONS;
  protected readonly editorApi = OGE_BPMN_API;
  protected readonly configApi = OGE_BPMN_CONFIG_API;
}
