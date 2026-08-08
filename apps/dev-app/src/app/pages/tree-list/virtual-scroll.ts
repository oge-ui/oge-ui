import { ChangeDetectionStrategy, Component } from '@angular/core';
import { OgeColumn, OgeTreeList } from '@oge-ui/tree-list';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { makeBigTree } from './tree-data';
import { SNIPPET } from './virtual-scroll-snippets';

@Component({
  selector: 'app-tree-virtual',
  imports: [OgeTreeList, OgeColumn, DemoCard, DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Virtual Scrolling"
      [chips]="['virtualScroll', '100k nodes']"
    >
      <p>
        The tree flattens only the <em>visible</em> branches (collapsed subtrees
        cost nothing) and windows the DOM with the same Fenwick-tree virtualizer
        the grid uses — a 100k-node tree scrolls like a 100-row one.
      </p>
    </app-doc-header>

    <app-demo-card
      [chips]="['O(visible) flatten', 'windowed DOM']"
      [code]="snippet"
      language="ts"
    >
      <oge-tree-list
        style="height: 480px"
        [data]="rows"
        keyExpr="id"
        parentIdExpr="parentId"
        [autoExpandAll]="true"
        [virtualScroll]="true"
      >
        <oge-column field="name" caption="Name" />
        <oge-column field="title" caption="Title" [width]="130" />
        <oge-column field="office" caption="Office" [width]="140" />
      </oge-tree-list>
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        Expanding or collapsing re-flattens only the visible rows, never the
        full 100k.
      </li>
      <li>
        Collapse all branches and the scrollbar shrinks to the root count
        instantly.
      </li>
      <li>
        <code>scrollToRow(key)</code> jumps anywhere in the virtual space.
      </li>
    </ul>
  `,
})
export class TreeVirtualPage {
  protected readonly rows = makeBigTree(100, 999);
  protected readonly snippet = SNIPPET;
}
