import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  OgeColumn,
  OgeTreeList,
  type OgeTreeRowReparentEvent,
} from '@oge-ui/tree-list';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { makeOrgTree, type OrgNode } from './tree-data';

const SNIPPET = `<oge-tree-list
  [data]="org"
  keyExpr="id"
  parentIdExpr="parentId"
  [autoExpandAll]="true"
  [rowDragging]="true"
  (rowReparented)="onReparent($event)"
/>`;

@Component({
  selector: 'app-tree-drag',
  imports: [OgeTreeList, OgeColumn, DemoCard, DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Drag & Drop"
      [chips]="['rowDragging', 'rowReparented']"
    >
      <p>
        Drag a row by its handle and drop it onto another row to move it (and
        its whole subtree) under a new parent. Dropping a row into its own
        descendants is rejected automatically.
      </p>
    </app-doc-header>

    <app-demo-card
      [chips]="['reparenting', 'descendant guard']"
      [code]="snippet"
    >
      <oge-tree-list
        style="max-height: 480px"
        [data]="org"
        keyExpr="id"
        parentIdExpr="parentId"
        [autoExpandAll]="true"
        [rowDragging]="true"
        (rowReparented)="onReparent($event)"
      >
        <oge-column field="name" caption="Name" />
        <oge-column field="title" caption="Title" [width]="140" />
        <oge-column field="office" caption="Office" [width]="140" />
      </oge-tree-list>
      @if (lastMove(); as move) {
        <div class="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Moved <code>#{{ move.key }}</code> from parent
          <code>{{ move.fromParentKey ?? 'root' }}</code> to
          <code>{{ move.toParentKey ?? 'root' }}</code
          >.
        </div>
      }
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        Plain-array data is updated in place (the parent field is rewritten);
        with a DataSource, handle <code>rowReparented</code> and persist the
        move yourself.
      </li>
      <li>
        The new parent expands automatically so the dropped row stays visible.
      </li>
      <li>
        State persistence (<code>stateKey</code>) also captures the expansion
        produced by moves.
      </li>
    </ul>
  `,
})
export class TreeDragPage {
  protected readonly org = makeOrgTree(3, 2, 4);
  protected readonly snippet = SNIPPET;
  protected readonly lastMove = signal<OgeTreeRowReparentEvent<OrgNode> | null>(
    null,
  );

  protected onReparent(event: OgeTreeRowReparentEvent<OrgNode>): void {
    this.lastMove.set(event);
  }
}
