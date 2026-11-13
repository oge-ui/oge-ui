import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { OgeDiffViewer } from '@oge-ui/layout/diff-viewer';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_LAYOUT_DIFF_VIEWER_SECTIONS,
  ReactLayoutDiffViewerDemos,
} from '../react-layout/diff-viewer';
import {
  DIFF_NEW_JSON,
  DIFF_NEW_TEXT,
  DIFF_OLD_JSON,
  DIFF_OLD_TEXT,
} from './diff-viewer-demo-data';
import { DIFF_JSON_SNIPPET, DIFF_TEXT_SNIPPET } from './diff-viewer-snippets';

const SECTIONS = ['Text', 'JSON'] as const;

@Component({
  selector: 'app-layout-diff-viewer',
  imports: [
    OgeDiffViewer,
    DemoCard,
    DocHeader,
    PageToc,
    ReactLayoutDiffViewerDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Diff Viewer"
      category="Layout"
      categoryLink="/components/diff-viewer"
      [chips]="['side by side', 'inline', 'word diff', 'JSON']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeDiffViewer&gt;</code> from
          <code>&#64;oge-ui/react-layout</code> compares two texts or two JSON
          documents with the same algorithm, markup and stylesheet as the
          Angular component.
        </p>
      } @else {
        <p>
          <code>oge-diff-viewer</code> compares two texts — or two JSON
          documents — side by side or inline.
        </p>
      }
      <p>
        A Myers line diff with the changed words highlighted inside changed
        lines; unchanged runs fold around each change and open on a click. JSON
        is compared as canonical, key-sorted text, so key order never counts as
        a change, and the changed paths come back as a list. The toolbar counts
        what was added and removed, switches the layout and steps through the
        changes; every changed line says “Added” or “Removed” to a screen
        reader, not only by colour.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-layout-diff-viewer-demos />
    } @else {
      <app-demo-card
        [chips]="['oldValue', 'newValue', 'mode', 'context']"
        heading="Text"
        description="Two versions of a config file: the changed values are highlighted word by word, the unchanged block between the changes folds to one line of context each side. Switch to <em>Inline</em> for one column, or step through the changes with the toolbar."
        [code]="textSnippet"
        language="ts"
      >
        <div style="height: 380px">
          <oge-diff-viewer
            [oldValue]="oldText"
            [newValue]="newText"
            [context]="1"
            [(mode)]="mode"
            style="height: 100%"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['language: json', 'diff().changes', 'sortKeys']"
        heading="JSON"
        description="JSON text on one side and a value on the other, its keys in another order: only the real changes show, and <code>diff().changes</code> lists their paths."
        [code]="jsonSnippet"
        language="ts"
      >
        <oge-diff-viewer
          #viewer
          language="json"
          mode="inline"
          [oldValue]="oldJson"
          [newValue]="newJson"
        />
        <ul class="mt-3 text-sm" data-testid="diff-changes">
          @for (change of viewer.diff().changes; track change.path) {
            <li>{{ change.kind }} {{ change.path }}</li>
          }
        </ul>
      </app-demo-card>
    }
  `,
})
export class LayoutDiffViewerPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_LAYOUT_DIFF_VIEWER_SECTIONS;
  protected readonly textSnippet = DIFF_TEXT_SNIPPET;
  protected readonly jsonSnippet = DIFF_JSON_SNIPPET;
  protected readonly oldText = DIFF_OLD_TEXT;
  protected readonly newText = DIFF_NEW_TEXT;
  protected readonly oldJson = DIFF_OLD_JSON;
  protected readonly newJson = DIFF_NEW_JSON;
  protected readonly mode = signal<'split' | 'inline'>('split');
}
