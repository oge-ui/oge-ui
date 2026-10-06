import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  OgeListView,
  OgeListViewGroupTemplate,
  OgeListViewItemTemplate,
  type OgeListViewItemActionClickEvent,
  type OgeListViewItemClickEvent,
  type OgeListViewKey,
} from '@oge-ui/layout/list-view';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_LAYOUT_LIST_VIEW_SECTIONS,
  ReactLayoutListViewDemos,
} from '../react-layout/list-view';
import {
  LIST_VIEW_INBOX,
  LIST_VIEW_INBOX_ACTIONS,
  LIST_VIEW_PEOPLE,
  listViewCityPage,
  listViewManyRows,
  type ListViewCity,
  type ListViewMessage,
  type ListViewPerson,
} from './list-view-demo-data';
import {
  ACTIONS_SNIPPET,
  BASICS_SNIPPET,
  GROUPING_SNIPPET,
  SEARCH_SNIPPET,
  SELECTION_SNIPPET,
  VIRTUAL_SNIPPET,
} from './list-view-snippets';

const SECTIONS = [
  'Basics & templates',
  'Selection',
  'Grouping & sticky headers',
  'Virtual scrolling',
  'Search & infinite scroll',
  'Swipe actions',
] as const;

@Component({
  selector: 'app-layout-list-view',
  imports: [
    OgeListView,
    OgeListViewItemTemplate,
    OgeListViewGroupTemplate,
    DemoCard,
    DocHeader,
    PageToc,
    ReactLayoutListViewDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="List View"
      category="Layout"
      categoryLink="/components/list-view"
      [chips]="[
        'APG listbox',
        'virtual scrolling',
        'sticky groups',
        'search',
        'infinite scroll',
        'swipe actions',
      ]"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeListView&gt;</code> from
          <code>&#64;oge-ui/react-layout</code> renders a templated list —
          contacts, an inbox, a feed — with selection, sticky group headers,
          windowed rendering for long lists, search, load-more and swipe
          actions, on the same markup and stylesheet as the Angular component.
        </p>
      } @else {
        <p>
          <code>oge-list-view</code> renders a templated list — contacts, an
          inbox, a feed — with selection, sticky group headers, windowed
          rendering for long lists, search, load-more and swipe actions.
        </p>
      }
      <p>
        Its role follows <code>selectionMode</code>: a selectable list is a
        WAI-ARIA APG <strong>listbox</strong> whose scroll viewport takes focus
        and tracks the active option with <code>aria-activedescendant</code> —
        the focus model that survives virtualization — and
        <code>selectionMode: 'none'</code> renders a
        <code>role="list"</code> with a roving tab stop. Every item announces
        its position in the whole list (<code>aria-posinset</code> /
        <code>aria-setsize</code>).
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-layout-list-view-demos />
    } @else {
      <app-demo-card
        [chips]="[
          'items',
          'displayExpr',
          'ogeListViewItemTemplate',
          'itemClick',
        ]"
        heading="Basics & templates"
        description='Pass <code>items</code> and a <code>displayExpr</code>; an <code>[ogeListViewItemTemplate]</code> replaces the row content while the list keeps the role, focus and selection. Without selection the list is a <code>role="list"</code>: arrows, Home / End, PageUp / PageDown and type-ahead move one roving tab stop, Enter or a click reports <code>itemClick</code>.'
        [code]="basicsSnippet"
        language="ts"
      >
        <oge-list-view
          class="demo-list-view"
          [items]="team"
          displayExpr="name"
          ariaLabel="Team"
          (itemClick)="onOpen($event)"
        >
          <ng-template ogeListViewItemTemplate let-person>
            <span class="demo-list-person">
              <strong>{{ person.name }}</strong>
              <small>{{ person.role }}</small>
            </span>
          </ng-template>
        </oge-list-view>
        <p class="mt-2 text-sm" data-testid="list-view-opened">
          Opened: {{ opened() ?? '—' }}
        </p>
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
        [code]="selectionSnippet"
        language="ts"
      >
        <oge-list-view
          class="demo-list-view"
          [items]="reviewers"
          displayExpr="name"
          disabledExpr="away"
          selectionMode="multiple"
          [showSelectionControls]="true"
          [(selectedKeys)]="picked"
          ariaLabel="Reviewers"
        />
        <p class="mt-2 text-sm" data-testid="list-view-picked">
          Selected: {{ picked().join(', ') || 'none' }}
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['groupExpr', 'ogeListViewGroupTemplate', 'sticky']"
        heading="Grouping & sticky headers"
        description='<code>groupExpr</code> splits the items into labelled segments (<code>role="group"</code> in a listbox, a nested list in a plain list). The visible header is <code>aria-hidden</code> — the segment already carries the name — and sticks to the top of its segment, so the next header pushes the previous one out.'
        [code]="groupingSnippet"
        language="ts"
      >
        <oge-list-view
          class="demo-list-view"
          [items]="people"
          displayExpr="name"
          groupExpr="team"
          selectionMode="single"
          height="260px"
          ariaLabel="People by team"
        >
          <ng-template ogeListViewGroupTemplate let-group let-count="count">
            {{ group }} · {{ count }}
          </ng-template>
        </oge-list-view>
      </app-demo-card>

      <app-demo-card
        [chips]="['virtualScroll', 'height', '10 000 items']"
        heading="Virtual scrolling"
        description="With fixed row heights the list renders only the rows in view plus a small overscan, on core's offset tree — 10 000 items scroll and type-ahead instantly. Keyboard navigation scrolls the active option into the window before pointing <code>aria-activedescendant</code> at it, and group headers stay pinned however far a group scrolled."
        [code]="virtualSnippet"
        language="ts"
      >
        <oge-list-view
          class="demo-list-view"
          [items]="tickets"
          displayExpr="name"
          selectionMode="single"
          [(selectedKeys)]="ticket"
          [virtualScroll]="{ itemHeight: 44 }"
          [height]="320"
          ariaLabel="Tickets"
        />
        <p class="mt-2 text-sm" data-testid="list-view-ticket">
          Selected: {{ ticket().join(', ') || 'none' }}
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['searchEnabled', 'pageLoadMode', 'hasMore', 'loading']"
        heading="Search & infinite scroll"
        description="<code>searchEnabled</code> adds a labelled search field that filters locale- and accent-insensitively (&quot;istanbul&quot; finds &quot;İstanbul&quot;) and announces the result count. <code>pageLoadMode: 'scroll'</code> emits <code>loadMoreRequested</code> near the end (once per page), <code>'button'</code> renders a Load more button, and the arrival is announced."
        [code]="searchSnippet"
        language="ts"
      >
        <oge-list-view
          class="demo-list-view"
          [items]="cities()"
          displayExpr="name"
          [searchEnabled]="true"
          pageLoadMode="scroll"
          [hasMore]="cities().length < 96"
          [loading]="loading()"
          [height]="300"
          ariaLabel="Cities"
          (loadMoreRequested)="loadMore()"
        />
        <p class="mt-2 text-sm" data-testid="list-view-cities">
          Loaded: {{ cities().length }}
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['itemActions', 'shortcut', 'itemActionClick', 'RTL']"
        heading="Swipe actions"
        description="Actions are revealed by a horizontal swipe on touch (mirrored in RTL) and on hover or focus with a mouse; tapping or clicking one runs it. Inside an option they are <code>aria-hidden</code> glyphs — a listbox cannot hold buttons — so their keyboard twin is each action's <code>shortcut</code>, advertised in <code>aria-keyshortcuts</code> and described to screen readers."
        [code]="actionsSnippet"
        language="ts"
      >
        <oge-list-view
          class="demo-list-view"
          [items]="inbox()"
          displayExpr="subject"
          selectionMode="single"
          [itemActions]="actions"
          ariaLabel="Inbox"
          (itemActionClick)="onAction($event)"
        />
        <p class="mt-2 text-sm" data-testid="list-view-action">
          Last action: {{ lastAction() ?? '—' }}
        </p>
      </app-demo-card>
    }
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
export class LayoutListViewPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_LAYOUT_LIST_VIEW_SECTIONS;
  protected readonly basicsSnippet = BASICS_SNIPPET;
  protected readonly selectionSnippet = SELECTION_SNIPPET;
  protected readonly groupingSnippet = GROUPING_SNIPPET;
  protected readonly virtualSnippet = VIRTUAL_SNIPPET;
  protected readonly searchSnippet = SEARCH_SNIPPET;
  protected readonly actionsSnippet = ACTIONS_SNIPPET;

  protected readonly people: readonly ListViewPerson[] = LIST_VIEW_PEOPLE;
  protected readonly team = LIST_VIEW_PEOPLE.slice(0, 5);
  protected readonly reviewers = LIST_VIEW_PEOPLE.slice(0, 6);
  protected readonly tickets = listViewManyRows();
  protected readonly actions = LIST_VIEW_INBOX_ACTIONS;

  protected readonly opened = signal<string | null>(null);
  protected readonly picked = signal<readonly OgeListViewKey[]>([2]);
  protected readonly ticket = signal<readonly OgeListViewKey[]>([]);
  protected readonly cities = signal<ListViewCity[]>(listViewCityPage(0));
  protected readonly loading = signal(false);
  protected readonly inbox =
    signal<readonly ListViewMessage[]>(LIST_VIEW_INBOX);
  protected readonly lastAction = signal<string | null>(null);

  protected onOpen(event: OgeListViewItemClickEvent<ListViewPerson>): void {
    this.opened.set(event.item.name);
  }

  protected loadMore(): void {
    this.loading.set(true);
    setTimeout(() => {
      const next = listViewCityPage(this.cities().length / 16);
      this.cities.set([...this.cities(), ...next]);
      this.loading.set(false);
    }, 600);
  }

  protected onAction(
    event: OgeListViewItemActionClickEvent<ListViewMessage>,
  ): void {
    this.lastAction.set(`${event.action.label}: ${event.item.subject}`);
    this.inbox.set(this.inbox().filter((m) => m.id !== event.key));
  }
}
