import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { OGE_REACT_EDITOR_API } from './react-editor-api-data';

/**
 * The React half of the editor API reference.
 *
 * Not a route of its own — it renders inside `/components/editor/api` when
 * the reader has chosen React (ADR 0002), through the same
 * `<app-api-reference>` and the same `ApiSections` shape as the Angular
 * table, so the parity gate can diff them member by member.
 *
 * The `llms.txt` generator reads this file's `<app-api-reference>` bindings,
 * which is all it takes for the component to reach `@oge-ui/react-editor`'s
 * machine-readable docs.
 */
@Component({
  selector: 'app-react-editor-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeEditor&gt;" [sections]="editorApi" />
  `,
})
export class ReactEditorApiSections {
  protected readonly editorApi = OGE_REACT_EDITOR_API;
}
