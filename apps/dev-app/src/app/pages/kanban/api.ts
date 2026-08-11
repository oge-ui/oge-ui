import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import { OGE_KANBAN_API } from './kanban-api-data';

const SECTIONS = ['OgeKanban'] as const;

@Component({
  selector: 'app-kanban-api',
  imports: [ApiReference, DocHeader, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Kanban API"
      category="Kanban"
      categoryLink="/components/kanban"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      <p>
        Complete API reference for <code>&#64;oge-ui/kanban</code>. The kernel —
        card normalization and write-back, the drag hit-testing, per-column
        virtual windows and the WIP arithmetic — is pure TypeScript inside the
        package; live demos are on the
        <a
          routerLink="/components/kanban"
          class="text-indigo-600 dark:text-indigo-400"
          >overview</a
        >
        page.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-api-reference
      title="OgeKanban"
      selector="oge-kanban"
      [sections]="kanbanApi"
    />

    <h3>Notes</h3>
    <ul>
      <li>
        No WAI-ARIA APG kanban pattern exists. The widget composes the listbox
        pattern: each column is a labeled <code>role="listbox"</code> (title,
        count and WIP limit in the accessible name) holding roving-tabindex
        <code>role="option"</code> cards — arrows rove within and across
        columns, Enter edits, Delete deletes, and
        <strong>Ctrl+Arrow moves the focused card</strong> as the exact keyboard
        twin of the drag, announced through a polite live region.
      </li>
      <li>
        Binding plain arrays never mutates them — edits land in an internal
        working set and the past-tense events carry the data to persist. Without
        an <code>orderExpr</code> the array order is the board order; with one,
        moves write a midpoint order value back in the item&#39;s own storage
        shape.
      </li>
      <li>
        Virtualization assumes the fixed <code>cardHeight</code> — that is also
        what keeps drag hit-testing allocation-free and agreeing with what is
        rendered. Rich variable-height card templates should set
        <code>[virtualScrolling]="false"</code> (the documented exception).
      </li>
    </ul>
  `,
})
export class KanbanApiPage {
  protected readonly sections = SECTIONS;
  protected readonly kanbanApi = OGE_KANBAN_API;
}
