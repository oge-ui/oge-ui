import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import {
  OgeSimpleTable,
  OgeSimpleTableEmpty,
  OgeSimpleTableFooter,
  OgeSimpleTableRow,
} from '@oge-ui/layout/simple-table';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_LAYOUT_SIMPLE_TABLE_SECTIONS,
  ReactLayoutSimpleTableDemos,
} from '../react-layout/simple-table';
import {
  SIMPLE_TABLE_COLUMNS,
  SIMPLE_TABLE_DEMO_STYLES,
  SIMPLE_TABLE_EVENT_COLUMNS,
  SIMPLE_TABLE_EVENTS,
  SIMPLE_TABLE_LINES,
} from './simple-table-demo-data';
import {
  BASICS_SNIPPET,
  PAGING_SNIPPET,
  ROW_SNIPPET,
} from './simple-table-snippets';

const SECTIONS = [
  'Basics',
  'Row templates',
  'Paging, footer and empty state',
] as const;

@Component({
  selector: 'app-layout-simple-table',
  imports: [
    CurrencyPipe,
    OgeSimpleTable,
    OgeSimpleTableRow,
    OgeSimpleTableFooter,
    OgeSimpleTableEmpty,
    DemoCard,
    DocHeader,
    PageToc,
    ReactLayoutSimpleTableDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <app-doc-header
      title="Simple Table"
      category="Layout"
      categoryLink="/components/simple-table"
      [chips]="['native table', 'row templates', 'aligned headers', 'paging']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeSimpleTable&gt;</code> from
          <code>&#64;oge-ui/react-layout</code> renders small lists — order
          lines, an audit log, a settings summary — as a native table whose rows
          you write yourself, with header cells that stay aligned and optional
          paging.
        </p>
      } @else {
        <p>
          <code>oge-simple-table</code> renders small lists — order lines, an
          audit log, a settings summary — as a native table whose rows you write
          yourself, with header cells that stay aligned and optional paging.
        </p>
      }
      <p>
        It is deliberately small: no sorting, filtering, selection, editing or
        virtualization, and no dependency on the grid package. Reach for the
        data grid when a list needs any of those. Screen readers get a real
        <code>&lt;table&gt;</code> — caption, column headers, cells — and a wide
        table scrolls inside its own labelled region on a narrow screen.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-layout-simple-table-demos />
    } @else {
      <app-demo-card
        [chips]="['value', 'columns', 'caption', 'align']"
        heading="Basics"
        description='Pass <code>value</code> and, optionally, <code>columns</code> — without them each own key of the first row becomes a column. The table is a native <code>&lt;table&gt;</code> with a <code>&lt;caption&gt;</code> and <code>&lt;th scope="col"&gt;</code> headers; a column&apos;s <code>align</code> applies to its header and its cells alike.'
        [code]="basicsSnippet"
        language="ts"
      >
        <oge-simple-table
          [value]="lines"
          [columns]="columns"
          caption="Order lines"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['ogeSimpleTableRow', 'ogeSimpleTableRowOf', 'cellClass']"
        heading="Row templates"
        description="An <code>ogeSimpleTableRow</code> template writes the whole <code>&lt;tr&gt;</code> of a row with free <code>&lt;td&gt;</code> markup — badges, links, pipes. Bind <code>[ogeSimpleTableRowOf]</code> to the rows and <code>let-line</code> is typed under <code>strictTemplates</code>; <code>columns[i].cellClass</code> puts a cell on the same alignment as its header."
        [code]="rowSnippet"
        language="ts"
      >
        <oge-simple-table
          [value]="lines"
          [columns]="columns"
          ariaLabel="Order lines with status"
        >
          <ng-template
            ogeSimpleTableRow
            [ogeSimpleTableRowOf]="lines"
            let-line
            let-columns="columns"
          >
            <tr>
              <td>
                <code>{{ line.sku }}</code>
              </td>
              <td>
                {{ line.product.name }}
                @if (line.status !== 'shipped') {
                  <span class="demo-st-status">{{ line.status }}</span>
                }
              </td>
              <td [class]="columns[2].cellClass">{{ line.qty }}</td>
              <td [class]="columns[3].cellClass">
                {{ line.price * line.qty | currency: 'USD' }}
              </td>
            </tr>
          </ng-template>
        </oge-simple-table>
      </app-demo-card>

      <app-demo-card
        [chips]="[
          'paging',
          'pageSize',
          '[(pageIndex)]',
          'ogeSimpleTableFooter',
          'compact',
        ]"
        heading="Paging, footer and empty state"
        description="<code>paging</code> shows <code>pageSize</code> rows with previous / next buttons and a range text that is announced politely. An <code>ogeSimpleTableFooter</code> template receives every row — not just the page — for totals, and <code>ogeSimpleTableEmpty</code> fills the full-width row shown without data."
        [code]="pagingSnippet"
        language="ts"
      >
        <oge-simple-table
          [value]="events"
          [columns]="eventColumns"
          [paging]="true"
          [pageSize]="5"
          [(pageIndex)]="page"
          [compact]="true"
          caption="Audit log"
        >
          <ng-template ogeSimpleTableFooter let-all="rows">
            <tr>
              <td colspan="3">{{ all.length }} events</td>
            </tr>
          </ng-template>
          <ng-template ogeSimpleTableEmpty>No events yet</ng-template>
        </oge-simple-table>
        <p data-testid="simple-table-page">Page {{ page() + 1 }}</p>
      </app-demo-card>
    }
  `,
  styles: SIMPLE_TABLE_DEMO_STYLES,
})
export class LayoutSimpleTablePage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_LAYOUT_SIMPLE_TABLE_SECTIONS;
  protected readonly basicsSnippet = BASICS_SNIPPET;
  protected readonly rowSnippet = ROW_SNIPPET;
  protected readonly pagingSnippet = PAGING_SNIPPET;
  protected readonly lines = SIMPLE_TABLE_LINES;
  protected readonly columns = SIMPLE_TABLE_COLUMNS;
  protected readonly events = SIMPLE_TABLE_EVENTS;
  protected readonly eventColumns = SIMPLE_TABLE_EVENT_COLUMNS;
  protected readonly page = signal(0);
}
