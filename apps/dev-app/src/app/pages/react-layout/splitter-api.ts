import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_SPLITTER_API,
  OGE_REACT_SPLITTER_CONFIG_API,
  OGE_REACT_SPLITTER_PANE_API,
} from './splitter-api-data';

/**
 * The React half of the splitter API reference.
 *
 * Not a route of its own — it renders inside `/components/splitter/api` when
 * the reader has chosen React (ADR 0002), through the same
 * `<app-api-reference>` and the same `ApiSections` shape as the Angular tables.
 * The block order mirrors the Angular page exactly, so the two views read as
 * one page across the switch and the parity gate can diff them block by block.
 *
 * The second block is the React face of `<oge-splitter-pane>`: React has no
 * child component to project, so a pane is an `OgeSplitterPaneItem` object in
 * the `panes` prop — the same fields, plus `content` and a nested `panes`
 * array.
 *
 * The `llms.txt` generator reads this file's `<app-api-reference>` bindings, so
 * adding a component here is all it takes for it to reach
 * `@oge-ui/react-layout`'s machine-readable docs.
 */
@Component({
  selector: 'app-react-layout-splitter-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeSplitter&gt;" [sections]="splitterApi" />
    <app-api-reference
      title="OgeSplitterPane (OgeSplitterPaneItem)"
      [sections]="splitterPaneApi"
    />
    <app-api-reference title="Splitter configuration" [sections]="configApi" />
  `,
})
export class ReactLayoutSplitterApiSections {
  protected readonly splitterApi = OGE_REACT_SPLITTER_API;
  protected readonly splitterPaneApi = OGE_REACT_SPLITTER_PANE_API;
  protected readonly configApi = OGE_REACT_SPLITTER_CONFIG_API;
}
