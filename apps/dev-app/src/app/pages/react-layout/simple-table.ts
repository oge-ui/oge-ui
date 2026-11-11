import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgeSimpleTable } from '@oge-ui/react-layout';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  SIMPLE_TABLE_COLUMNS,
  SIMPLE_TABLE_DEMO_STYLES,
  SIMPLE_TABLE_EVENT_COLUMNS,
  SIMPLE_TABLE_EVENTS,
  SIMPLE_TABLE_LINES,
  type DemoAuditEvent,
  type DemoOrderLine,
} from '../layout/simple-table-demo-data';
import { LAYOUT_SIMPLE_TABLE_DEMOS } from './simple-table-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_LAYOUT_SIMPLE_TABLE_SECTIONS = [
  'Basics',
  'Row templates',
  'Paging, footer and empty state',
] as const;

const usd = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function PagingDemo(): ReactNode {
  const [page, setPage] = useState(0);
  return createElement(
    'div',
    null,
    createElement(OgeSimpleTable<DemoAuditEvent>, {
      key: 'table',
      value: SIMPLE_TABLE_EVENTS,
      columns: SIMPLE_TABLE_EVENT_COLUMNS,
      paging: true,
      pageSize: 5,
      pageIndex: page,
      onPageIndexChange: setPage,
      compact: true,
      caption: 'Audit log',
      renderFooter: ({ rows }) =>
        createElement(
          'tr',
          null,
          createElement('td', { colSpan: 3 }, `${rows.length} events`),
        ),
      renderEmpty: () => 'No events yet',
    }),
    createElement(
      'p',
      { key: 'page', 'data-testid': 'simple-table-page' },
      `Page ${page + 1}`,
    ),
  );
}

@Component({
  selector: 'app-react-layout-simple-table-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <app-demo-card
      [chips]="['value', 'columns', 'caption', 'align']"
      heading="Basics"
      description='Pass <code>value</code> and, optionally, <code>columns</code> — without them each own key of the first row becomes a column. The table is a native <code>&lt;table&gt;</code> with a <code>&lt;caption&gt;</code> and <code>&lt;th scope="col"&gt;</code> headers; a column&apos;s <code>align</code> applies to its header and its cells alike.'
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basics" />
    </app-demo-card>

    <app-demo-card
      [chips]="['renderRow', 'cellClass', 'typed row']"
      heading="Row templates"
      description="<code>renderRow</code> returns the whole <code>&lt;tr&gt;</code> of a row with free <code>&lt;td&gt;</code> markup — badges, links, formatted numbers. <code>row</code> is typed from <code>value</code>, and <code>columns[i].cellClass</code> puts a cell on the same alignment as its header."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="rows" />
    </app-demo-card>

    <app-demo-card
      [chips]="['paging', 'pageSize', 'pageIndex', 'renderFooter', 'compact']"
      heading="Paging, footer and empty state"
      description="<code>paging</code> shows <code>pageSize</code> rows with previous / next buttons and a range text that is announced politely. <code>renderFooter</code> receives every row — not just the page — for totals, and <code>renderEmpty</code> fills the full-width row shown without data."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="paging" />
    </app-demo-card>
  `,
  styles: SIMPLE_TABLE_DEMO_STYLES,
})
export class ReactLayoutSimpleTableDemos {
  protected readonly demos = LAYOUT_SIMPLE_TABLE_DEMOS;

  protected readonly basics = () =>
    createElement(OgeSimpleTable<DemoOrderLine>, {
      value: SIMPLE_TABLE_LINES,
      columns: SIMPLE_TABLE_COLUMNS,
      caption: 'Order lines',
    });

  protected readonly rows = () =>
    createElement(OgeSimpleTable<DemoOrderLine>, {
      value: SIMPLE_TABLE_LINES,
      columns: SIMPLE_TABLE_COLUMNS,
      ariaLabel: 'Order lines with status',
      renderRow: ({ row, columns }) =>
        createElement(
          'tr',
          null,
          createElement('td', null, createElement('code', null, row.sku)),
          createElement(
            'td',
            null,
            row.product.name,
            row.status !== 'shipped'
              ? createElement(
                  'span',
                  { className: 'demo-st-status' },
                  row.status,
                )
              : null,
          ),
          createElement('td', { className: columns[2].cellClass }, row.qty),
          createElement(
            'td',
            { className: columns[3].cellClass },
            usd(row.price * row.qty),
          ),
        ),
    });

  protected readonly paging = () => createElement(PagingDemo);
}
