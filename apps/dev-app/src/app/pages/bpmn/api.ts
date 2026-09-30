import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactBpmnApiSections } from '../react-bpmn/api';
import { OGE_BPMN_API, OGE_BPMN_CONFIG_API } from './bpmn-api-data';

const SECTIONS = ['OgeBpmnEditor', 'Configuration'] as const;

/** TOC of the React view — must mirror `ReactBpmnApiSections`' titles. */
const SECTIONS_REACT = ['<OgeBpmnEditor>', 'Configuration'] as const;

@Component({
  selector: 'app-bpmn-api',
  imports: [ApiReference, DocHeader, PageToc, RouterLink, ReactBpmnApiSections],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="BPMN Editor API"
      category="BPMN"
      categoryLink="/components/bpmn"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Complete API reference for <code>&#64;oge-ui/react-bpmn</code>. The
          editor is a thin React template over
          <code>&#64;oge-ui/bpmn-engine</code> — the XML reader/writer,
          geometry, orthogonal routing, snapping, the snapshot command stack and
          the editor core the Angular editor runs too — and its user-facing
          surface (<code>readBpmnXml</code>, <code>writeBpmnXml</code>, the
          model types) is re-exported from the same barrel; live demos are on
          the
          <a
            routerLink="/components/bpmn"
            class="text-indigo-600 underline dark:text-indigo-400"
            >overview</a
          >
          page.
        </p>
      } @else {
        <p>
          Complete API reference for <code>&#64;oge-ui/bpmn</code>. The engine —
          XML reader/writer, geometry, orthogonal routing, snapping and the
          snapshot command stack — is the framework-free
          <code>&#64;oge-ui/bpmn-engine</code> package and its user-facing
          surface (<code>readBpmnXml</code>, <code>writeBpmnXml</code>, the
          model types) is re-exported from the same barrel; live demos are on
          the
          <a
            routerLink="/components/bpmn"
            class="text-indigo-600 underline dark:text-indigo-400"
            >overview</a
          >
          page.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-bpmn-api />
    } @else {
      <app-api-reference
        title="OgeBpmnEditor"
        selector="oge-bpmn-editor"
        [sections]="editorApi"
      />
      <app-api-reference title="Configuration" [sections]="configApi" />
    }

    <h3>Notes</h3>
    <ul>
      @if (fw.isReact()) {
        <li>
          There is no <code>diagram</code> prop — the model is owned by the
          editor's command stack so undo can never desynchronize. Load with
          <code>ref.current.importXml()</code>, observe with
          <code>onElementsChanged</code>, read back with
          <code>ref.current.exportXml()</code>.
        </li>
      } @else {
        <li>
          There is no <code>[diagram]</code> input — the model is owned by the
          editor's command stack so undo can never desynchronize. Load with
          <code>importXml()</code>, observe with <code>elementsChanged</code>,
          read back with <code>exportXml()</code>.
        </li>
      }
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
        by the debounced
        <code>{{ fw.isReact() ? 'onDiagramChanged' : 'diagramChanged' }}</code>
        autosave stream) and static SVG (<code>exportSvg</code>, one-way).
      </li>
    </ul>
  `,
})
export class BpmnApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly editorApi = OGE_BPMN_API;
  protected readonly configApi = OGE_BPMN_CONFIG_API;
}
