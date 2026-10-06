import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgeListView, type OgeListViewKey } from '@oge-ui/react-layout';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  LIST_VIEW_INBOX,
  LIST_VIEW_INBOX_ACTIONS,
  LIST_VIEW_PEOPLE,
  listViewCityPage,
  listViewManyRows,
  type ListViewCity,
  type ListViewMessage,
  type ListViewPerson,
} from '../layout/list-view-demo-data';
import { LAYOUT_LIST_VIEW_DEMOS } from './list-view-snippets';

/**
 * TOC of the React view — the same six sections as the Angular list view
 * page (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_LAYOUT_LIST_VIEW_SECTIONS = [
  'Basics & templates',
  'Selection',
  'Grouping & sticky headers',
  'Virtual scrolling',
  'Search & infinite scroll',
  'Swipe actions',
] as const;

const TEAM = LIST_VIEW_PEOPLE.slice(0, 5);
const REVIEWERS = LIST_VIEW_PEOPLE.slice(0, 6);
const TICKETS = listViewManyRows();
const LIST_CLASS = 'demo-list-view';

function BasicsDemo(): ReactNode {
  const [opened, setOpened] = useState<string | null>(null);
  return createElement(
    'div',
    null,
    createElement(OgeListView<ListViewPerson>, {
      key: 'list',
      className: LIST_CLASS,
      items: TEAM,
      displayExpr: 'name',
      ariaLabel: 'Team',
      onItemClick: (event) => setOpened(event.item.name),
      renderItem: ({ item }) =>
        createElement(
          'span',
          { className: 'demo-list-person' },
          createElement('strong', { key: 'n' }, item.name),
          createElement('small', { key: 'r' }, item.role),
        ),
    }),
    createElement(
      'p',
      {
        key: 'out',
        className: 'mt-2 text-sm',
        'data-testid': 'list-view-opened',
      },
      `Opened: ${opened ?? '—'}`,
    ),
  );
}

function SelectionDemo(): ReactNode {
  const [picked, setPicked] = useState<OgeListViewKey[]>([2]);
  return createElement(
    'div',
    null,
    createElement(OgeListView<ListViewPerson>, {
      key: 'list',
      className: LIST_CLASS,
      items: REVIEWERS,
      displayExpr: 'name',
      disabledExpr: 'away',
      selectionMode: 'multiple',
      showSelectionControls: true,
      selectedKeys: picked,
      onSelectedKeysChange: setPicked,
      ariaLabel: 'Reviewers',
    }),
    createElement(
      'p',
      {
        key: 'out',
        className: 'mt-2 text-sm',
        'data-testid': 'list-view-picked',
      },
      `Selected: ${picked.join(', ') || 'none'}`,
    ),
  );
}

function VirtualDemo(): ReactNode {
  const [selected, setSelected] = useState<OgeListViewKey[]>([]);
  return createElement(
    'div',
    null,
    createElement(OgeListView<{ id: number; name: string }>, {
      key: 'list',
      className: LIST_CLASS,
      items: TICKETS,
      displayExpr: 'name',
      selectionMode: 'single',
      selectedKeys: selected,
      onSelectedKeysChange: setSelected,
      virtualScroll: { itemHeight: 44 },
      height: 320,
      ariaLabel: 'Tickets',
    }),
    createElement(
      'p',
      {
        key: 'out',
        className: 'mt-2 text-sm',
        'data-testid': 'list-view-ticket',
      },
      `Selected: ${selected.join(', ') || 'none'}`,
    ),
  );
}

function SearchDemo(): ReactNode {
  const [cities, setCities] = useState<ListViewCity[]>(() =>
    listViewCityPage(0),
  );
  const [loading, setLoading] = useState(false);
  const loadMore = () => {
    setLoading(true);
    setTimeout(() => {
      setCities((current) => [
        ...current,
        ...listViewCityPage(current.length / 16),
      ]);
      setLoading(false);
    }, 600);
  };
  return createElement(
    'div',
    null,
    createElement(OgeListView<ListViewCity>, {
      key: 'list',
      className: LIST_CLASS,
      items: cities,
      displayExpr: 'name',
      searchEnabled: true,
      pageLoadMode: 'scroll',
      hasMore: cities.length < 96,
      loading,
      height: 300,
      ariaLabel: 'Cities',
      onLoadMoreRequested: loadMore,
    }),
    createElement(
      'p',
      {
        key: 'out',
        className: 'mt-2 text-sm',
        'data-testid': 'list-view-cities',
      },
      `Loaded: ${cities.length}`,
    ),
  );
}

function ActionsDemo(): ReactNode {
  const [inbox, setInbox] =
    useState<readonly ListViewMessage[]>(LIST_VIEW_INBOX);
  const [last, setLast] = useState<string | null>(null);
  return createElement(
    'div',
    null,
    createElement(OgeListView<ListViewMessage>, {
      key: 'list',
      className: LIST_CLASS,
      items: inbox,
      displayExpr: 'subject',
      selectionMode: 'single',
      itemActions: LIST_VIEW_INBOX_ACTIONS,
      ariaLabel: 'Inbox',
      onItemActionClick: (event) => {
        setLast(`${event.action.label}: ${event.item.subject}`);
        setInbox((current) => current.filter((m) => m.id !== event.key));
      },
    }),
    createElement(
      'p',
      {
        key: 'out',
        className: 'mt-2 text-sm',
        'data-testid': 'list-view-action',
      },
      `Last action: ${last ?? '—'}`,
    ),
  );
}

/**
 * The React half of the list view page — rendered inside
 * `/components/list-view` when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-layout-list-view-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // the React list view carries the class names but no styles of its own —
  // the docs pull the Angular component's SCSS (only this one: the whole
  // react-layout sheet would blow the component style budget)
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../../../../packages/layout/list-view/src/list-view.scss'],
  template: `
    <app-demo-card
      [chips]="['items', 'displayExpr', 'renderItem', 'onItemClick']"
      heading="Basics & templates"
      description='Pass <code>items</code> and a <code>displayExpr</code>; <code>renderItem</code> replaces the row content while the list keeps the role, focus and selection. Without selection the list is a <code>role="list"</code>: arrows, Home / End, PageUp / PageDown and type-ahead move one roving tab stop, Enter or a click reports <code>onItemClick</code>.'
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basics" />
    </app-demo-card>

    <app-demo-card
      [chips]="[
        'selectionMode',
        'selectedKeys',
        'showSelectionControls',
        'disabledExpr',
      ]"
      heading="Selection"
      description="<code>single</code> or <code>multiple</code> turns the list into an APG listbox. Space toggles, Enter selects (single), Shift+arrows and Shift+click extend a range, Ctrl+A selects all and announces the count; <code>disabledExpr</code> keeps an option visible but <code>aria-disabled</code>, and the keyboard skips it."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="selection" />
    </app-demo-card>

    <app-demo-card
      [chips]="['groupExpr', 'renderGroup', 'sticky']"
      heading="Grouping & sticky headers"
      description='<code>groupExpr</code> splits the items into labelled segments (<code>role="group"</code> in a listbox, a nested list in a plain list). The visible header is <code>aria-hidden</code> — the segment already carries the name — and sticks to the top of its segment, so the next header pushes the previous one out.'
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="grouping" />
    </app-demo-card>

    <app-demo-card
      [chips]="['virtualScroll', 'height', '10 000 items']"
      heading="Virtual scrolling"
      description="With fixed row heights the list renders only the rows in view plus a small overscan, on core's offset tree — 10 000 items scroll and type-ahead instantly. Keyboard navigation scrolls the active option into the window before pointing <code>aria-activedescendant</code> at it, and group headers stay pinned however far a group scrolled."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="virtual" />
    </app-demo-card>

    <app-demo-card
      [chips]="['searchEnabled', 'pageLoadMode', 'hasMore', 'loading']"
      heading="Search & infinite scroll"
      description="<code>searchEnabled</code> adds a labelled search field that filters locale- and accent-insensitively (&quot;istanbul&quot; finds &quot;İstanbul&quot;) and announces the result count. <code>pageLoadMode: 'scroll'</code> calls <code>onLoadMoreRequested</code> near the end (once per page), <code>'button'</code> renders a Load more button, and the arrival is announced."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="search" />
    </app-demo-card>

    <app-demo-card
      [chips]="['itemActions', 'shortcut', 'onItemActionClick', 'RTL']"
      heading="Swipe actions"
      description="Actions are revealed by a horizontal swipe on touch (mirrored in RTL) and on hover or focus with a mouse; tapping or clicking one runs it. Inside an option they are <code>aria-hidden</code> glyphs — a listbox cannot hold buttons — so their keyboard twin is each action's <code>shortcut</code>, advertised in <code>aria-keyshortcuts</code> and described to screen readers."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="actions" />
    </app-demo-card>
  `,
  styles: `
    .demo-list-view {
      max-inline-size: 28rem;
    }

    .demo-list-person {
      display: flex;
      flex-direction: column;
      line-height: 1.3;
    }

    .demo-list-person small {
      color: var(--oge-input-muted);
    }
  `,
})
export class ReactLayoutListViewDemos {
  protected readonly demos = LAYOUT_LIST_VIEW_DEMOS;

  protected readonly basics = () => createElement(BasicsDemo);
  protected readonly selection = () => createElement(SelectionDemo);
  protected readonly grouping = () =>
    createElement(OgeListView<ListViewPerson>, {
      className: LIST_CLASS,
      items: LIST_VIEW_PEOPLE,
      displayExpr: 'name',
      groupExpr: 'team',
      selectionMode: 'single',
      height: '260px',
      ariaLabel: 'People by team',
      renderGroup: ({ group, count }) => `${group} · ${count}`,
    });
  protected readonly virtual = () => createElement(VirtualDemo);
  protected readonly search = () => createElement(SearchDemo);
  protected readonly actions = () => createElement(ActionsDemo);
}
