import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { OGE_REACT_KANBAN_API } from './react-kanban-api-data';

/**
 * The React half of the Kanban API reference.
 *
 * Not a route of its own — it renders inside `/components/kanban/api` when
 * the reader has chosen React (ADR 0002), through the same
 * `<app-api-reference>` and the same `ApiSections` shape as the Angular
 * table. The block mirrors the Angular page exactly, so the two views read as
 * one page across the switch and the parity gate can diff them member by
 * member.
 *
 * The `llms.txt` generator reads this file's `<app-api-reference>` bindings,
 * so this is all it takes for the component to reach
 * `@oge-ui/react-kanban`'s machine-readable docs.
 */
@Component({
  selector: 'app-react-kanban-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeKanban&gt;" [sections]="kanbanApi" />
  `,
})
export class ReactKanbanApiSections {
  protected readonly kanbanApi = OGE_REACT_KANBAN_API;
}
