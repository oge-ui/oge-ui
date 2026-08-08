import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import type { RowKey } from '@oge-ui/core';
import { OgeColumn, OgeTreeList } from '@oge-ui/tree-list';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { makeOrgTree } from './tree-data';
import { SNIPPET } from './selection-snippets';

@Component({
  selector: 'app-tree-selection',
  imports: [OgeTreeList, OgeColumn, DemoCard, DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Selection"
      [chips]="['selectionMode', 'selectionRecursive', 'selectedKeys']"
    >
      <p>
        All grid selection modes work on trees;
        <code>selectionRecursive</code> adds tri-state checkboxes — checking a
        manager selects the whole team, ancestors turn indeterminate on partial
        selections.
      </p>
    </app-doc-header>

    <app-demo-card
      [chips]="['tri-state', 'cascade']"
      [code]="snippet"
      language="ts"
    >
      <oge-tree-list
        style="max-height: 480px"
        [data]="org"
        keyExpr="id"
        parentIdExpr="parentId"
        [autoExpandAll]="true"
        selectionMode="checkbox"
        [selectionRecursive]="true"
        [(selectedKeys)]="selectedKeys"
      >
        <oge-column field="name" caption="Name" />
        <oge-column field="title" caption="Title" [width]="140" />
        <oge-column field="office" caption="Office" [width]="140" />
      </oge-tree-list>
      <div class="mt-3 text-sm text-gray-500 dark:text-gray-400">
        Selected keys ({{ selectedKeys().length }}):
        <code>{{ selectedKeys().join(', ') || '—' }}</code>
      </div>
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        Toggling cascades down and normalizes up: a parent is selected iff all
        children are.
      </li>
      <li>
        <code>getSelectedRowKeys(mode)</code> narrows the reported set:
        <code>'all'</code>, <code>'leavesOnly'</code> or
        <code>'excludeRecursive'</code>
        (top-most selected roots).
      </li>
      <li>
        <kbd>Space</kbd> toggles the focused row; <kbd>Shift</kbd>+click selects
        a range.
      </li>
      <li>
        <code>focusedRowEnabled</code> + <code>[(focusedRowKey)]</code> track a
        single focused row.
      </li>
    </ul>
  `,
})
export class TreeSelectionPage {
  protected readonly org = makeOrgTree();
  protected readonly snippet = SNIPPET;
  protected readonly selectedKeys = signal<RowKey[]>([]);
}
