import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactKanbanApiSections } from '../react-kanban/api';
import { OGE_KANBAN_API } from './kanban-api-data';

const SECTIONS = ['OgeKanban'] as const;

/** TOC of the React view — must mirror `ReactKanbanApiSections`' titles. */
const SECTIONS_REACT = ['<OgeKanban>'] as const;

@Component({
  selector: 'app-kanban-api',
  imports: [
    ApiReference,
    DocHeader,
    PageToc,
    ReactKanbanApiSections,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Kanban API"
      category="Kanban"
      categoryLink="/components/kanban"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Complete API reference for <code>&#64;oge-ui/react-kanban</code>. The
          kernel — card normalization and write-back, the drag hit-testing,
          per-column virtual windows, the WIP arithmetic, the keyboard and move
          machines — is the framework-free
          <code>&#64;oge-ui/kanban-engine</code>, shared with the Angular board;
          live demos are on the
          <a
            routerLink="/components/kanban"
            class="text-indigo-600 underline dark:text-indigo-400"
            >overview</a
          >
          page.
        </p>
      } @else {
        <p>
          Complete API reference for <code>&#64;oge-ui/kanban</code>. The kernel
          — card normalization and write-back, the drag hit-testing, per-column
          virtual windows, the WIP arithmetic, the keyboard and move machines —
          is the framework-free <code>&#64;oge-ui/kanban-engine</code>, shared
          with the React board; live demos are on the
          <a
            routerLink="/components/kanban"
            class="text-indigo-600 underline dark:text-indigo-400"
            >overview</a
          >
          page.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-kanban-api />
    } @else {
      <app-api-reference
        title="OgeKanban"
        selector="oge-kanban"
        [sections]="kanbanApi"
      />
    }

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
        working set and the past-tense
        @if (fw.isReact()) {
          callbacks
        } @else {
          events
        }
        carry the data to persist. Without an <code>orderExpr</code> the array
        order is the board order; with one, moves write a midpoint order value
        back in the item&#39;s own storage shape.
      </li>
      <li>
        Virtualization assumes the fixed <code>cardHeight</code> — that is also
        what keeps drag hit-testing allocation-free and agreeing with what is
        rendered. Rich variable-height card templates should set
        @if (fw.isReact()) {
          <code>virtualScrolling=&#123;false&#125;</code>
        } @else {
          <code>[virtualScrolling]="false"</code>
        }
        (the documented exception).
      </li>
    </ul>
  `,
})
export class KanbanApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly kanbanApi = OGE_KANBAN_API;
}
