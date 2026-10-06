import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { CustomDataSource } from '@oge-ui/core';
import {
  OgeDateBox,
  OgeSelectBox,
  OgeTagBox,
  type OgeDropDownClosingEvent,
  type OgeSelectBoxCustomItemEvent,
} from '@oge-ui/inputs';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import {
  REACT_INPUTS_SELECT_BOX_SECTIONS,
  ReactInputsSelectBoxDemos,
} from '../react-inputs/select-box';
import { PageToc } from '../../shared/page-toc';
import {
  ADAPTIVE_SNIPPET,
  BASIC_SNIPPET,
  CHROME_SNIPPET,
  GROUP_SNIPPET,
  LAZY_SNIPPET,
  MAPPING_SNIPPET,
  REMOTE_SNIPPET,
  STATES_SNIPPET,
  TAGBOX_FEATURES_SNIPPET,
  TAGBOX_REMOTE_SNIPPET,
  TAGBOX_SNIPPET,
  TEMPLATES_SNIPPET,
} from './select-box-snippets';

const SECTIONS = [
  'Basic usage',
  'Data mapping & search',
  'Grouping & custom values',
  'Lazy data',
  'Remote data',
  'Templates & cancelable events',
  'Tag Box — multi-select',
  'Tag Box — select all, custom tags & limits',
  'Tag Box — remote data',
  'Item states & templates',
  'Field chrome',
  'Mobile / adaptive',
  'Keyboard & accessibility',
] as const;

interface DemoUser {
  id: number;
  name: string;
  role: string;
}

interface DemoCustomer {
  id: number;
  name: string;
}

/** 5,000 rows "on the server" — the editor only ever asks for one page. */
const CUSTOMERS: DemoCustomer[] = Array.from({ length: 5000 }, (_, i) => ({
  id: i + 1,
  name: `Customer ${String(i + 1).padStart(4, '0')}`,
}));

const DEMO_CITIES: DemoCustomer[] = Array.from({ length: 2000 }, (_, i) => ({
  id: i + 1,
  name: `City ${i + 1}`,
}));

interface DemoPlan {
  id: string;
  name: string;
  soldOut?: boolean;
}

@Component({
  selector: 'app-inputs-select-box',
  imports: [
    OgeDateBox,
    OgeSelectBox,
    OgeTagBox,
    DemoCard,
    DocHeader,
    ReactInputsSelectBoxDemos,
    PageToc,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Select Box"
      category="Inputs"
      categoryLink="/components/inputs"
      [chips]="[
        'WAI-ARIA combobox',
        'displayExpr / valueExpr',
        'search',
        'signal forms',
      ]"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeSelectBox /&gt;</code> from
          <code>&#64;oge-ui/react-inputs</code> is a drop-down select on the
          shared field chrome: pick one item from a list, optionally filter it
          by typing, and bind the committed value with the controlled
          <code>value</code> + <code>onValueChange</code> pair (or
          <code>defaultValue</code> alone). The popup follows the anchor on
          scroll, flips when cramped and matches the field width — the same list
          machine and the same stylesheet as the Angular editor.
        </p>
      } @else {
        <p>
          <code>&lt;oge-select-box&gt;</code> is a drop-down select on the
          shared field chrome: pick one item from a list, optionally filter it
          by typing, and bind the committed value with signals, Signal Forms or
          reactive forms. The popup follows the anchor on scroll, flips when
          cramped and matches the field width.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-inputs-select-box-demos />
    } @else {
      <app-demo-card
        heading="Basic usage"
        description="Bind an array of strings and <code>[(value)]</code> — no mapping needed. Open with the mouse, <kbd>&darr;</kbd>, <kbd>Enter</kbd> or by typing a letter (type-ahead)."
        [chips]="['[(value)]']"
        [code]="basicSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-start gap-6">
          <oge-select-box label="City" [items]="cities" [(value)]="city" />
          <div class="pt-2 text-sm text-gray-500 dark:text-gray-400">
            value: <code>{{ city() === null ? 'null' : city() }}</code>
          </div>
        </div>
      </app-demo-card>

      <app-demo-card
        heading="Data mapping & search"
        description="Objects map through <code>displayExpr</code>/<code>valueExpr</code> (field name or function). <code>searchEnabled</code> turns the input editable and filters client-side; <code>searchChanged</code> + <code>[loading]</code> are the server-side escape hatch."
        [chips]="['displayExpr', 'valueExpr', 'searchEnabled']"
        [code]="mappingSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-start gap-6">
          <oge-select-box
            label="Assignee"
            [items]="users"
            displayExpr="name"
            valueExpr="id"
            [searchEnabled]="true"
            [showClearButton]="true"
            [(value)]="assigneeId"
          />
          <div class="pt-2 text-sm text-gray-500 dark:text-gray-400">
            committed id: <code>{{ assigneeId() ?? 'null' }}</code>
          </div>
        </div>
      </app-demo-card>

      <app-demo-card
        heading="Grouping & custom values"
        description="<code>groupBy</code> (field name or function) groups flat data under headers on the fly — no pre-shaping. <code>acceptCustomValue</code> lets typed text that matches nothing become the value: <code>customItemCreating</code> maps it to an item (sync, async, or <code>null</code> to reject)."
        [chips]="['groupBy', 'acceptCustomValue', 'customItemCreating']"
        [code]="groupSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-start gap-6">
          <oge-select-box
            label="Team member"
            [items]="users"
            displayExpr="name"
            valueExpr="id"
            groupBy="role"
            [(value)]="memberId"
          />
          <oge-select-box
            label="Tag"
            [items]="tags()"
            [searchEnabled]="true"
            [acceptCustomValue]="true"
            [showClearButton]="true"
            hint="Type a new tag and press Enter"
            (customItemCreating)="createTag($event)"
            [(value)]="tag"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        heading="Lazy data"
        description="Pass a function as <code>[items]</code> — it runs once on first open; the popup shows a localized loading row while pending and an error row on rejection. <code>selectedItem</code> resolves as soon as the data lands."
        [chips]="['items: () => Promise', 'deferred']"
        [code]="lazySnippet"
        language="ts"
      >
        <oge-select-box
          label="Warehouse"
          [items]="loadWarehouses"
          [(value)]="warehouse"
        />
      </app-demo-card>

      <app-demo-card
        heading="Remote data"
        description="Bind any <code>&#64;oge-ui/core</code> <code>DataSource</code> to <code>[dataSource]</code>: the list asks for <code>pageSize</code> rows at a time as it scrolls (the virtual window — or the keyboard — nearing the loaded end), sends the typed text as <code>searchText</code> after <code>searchTimeout</code>, aborts a superseded request through its <code>AbortSignal</code> and caches each search&#39;s pages. <code>byKey()</code> resolves a value no loaded page holds — here the initial customer #1234 of 5,000."
        [chips]="['dataSource', 'pageSize', 'byKey', 'AbortSignal']"
        [code]="remoteSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-start gap-6" data-demo="remote">
          <oge-select-box
            label="Customer"
            displayExpr="name"
            valueExpr="id"
            [dataSource]="customers"
            [pageSize]="40"
            [searchEnabled]="true"
            [searchTimeout]="300"
            [virtualScroll]="true"
            [showClearButton]="true"
            [(value)]="customerId"
          />
          <div class="pt-2 text-sm text-gray-500 dark:text-gray-400">
            value: <code>{{ customerId() ?? 'null' }}</code> · requests:
            <code>{{ requests() }}</code>
          </div>
        </div>
      </app-demo-card>

      <app-demo-card
        heading="Templates & cancelable events"
        description="<code>groupTemplate</code>, <code>fieldTemplate</code> (paints the closed field over the real input, which keeps its text for assistive technology), <code>headerTemplate</code> and <code>footerTemplate</code>. <code>(opening)</code> / <code>(closing)</code> are cancelable pre-events — set <code>event.cancel = true</code>; <code>closing</code> carries its <code>reason</code>."
        [chips]="['groupTemplate', 'fieldTemplate', 'closing', 'cancel']"
        [code]="templatesSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-start gap-6" data-demo="templates">
          <oge-select-box
            label="Status"
            [items]="statuses"
            displayExpr="name"
            valueExpr="id"
            groupBy="phase"
            [groupTemplate]="statusGroup"
            [fieldTemplate]="statusField"
            [itemTemplate]="statusOption"
            [headerTemplate]="statusHeader"
            [footerTemplate]="statusFooter"
            (closing)="onStatusClosing($event)"
            [(value)]="statusId"
          />
          <ng-template #statusGroup let-label>
            <span>Phase · {{ label }}</span>
          </ng-template>
          <ng-template #statusField let-item let-text="text">
            @if (item) {
              <span
                class="inline-block size-2.5 rounded-full"
                [style.background]="item.color"
              ></span>
            }
            {{ text }}
          </ng-template>
          <ng-template #statusOption let-item>
            <span
              class="inline-block size-2.5 rounded-full"
              [style.background]="item.color"
            ></span>
            <span class="oge-select-option-text">{{ item.name }}</span>
          </ng-template>
          <ng-template #statusHeader let-items
            >{{ items.length }} statuses</ng-template
          >
          <ng-template #statusFooter>
            <label class="flex items-center gap-2">
              <input
                type="checkbox"
                [checked]="pinned()"
                (change)="pinned.set(!pinned())"
              />
              Keep open (cancels closing)
            </label>
          </ng-template>
        </div>
      </app-demo-card>

      <app-demo-card
        heading="Tag Box — multi-select"
        description="<code>&amp;lt;oge-tag-box&amp;gt;</code> is the multi-select sibling: the value is an <em>array</em> of <code>valueExpr</code> results, picks render as removable chips, the popup stays open while selecting (checkbox listbox, <code>aria-multiselectable</code>) and <kbd>Backspace</kbd> removes the last chip. <code>imageExpr</code> puts avatars on chips and options; <code>maxDisplayedTags</code> collapses overflow into a <code>+N</code> chip."
        [chips]="[
          'value: T[]',
          'imageExpr',
          'maxDisplayedTags',
          'selectionChanged',
        ]"
        [code]="tagBoxSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-start gap-6">
          <oge-tag-box
            label="Skills"
            [items]="skills"
            [searchEnabled]="true"
            [showClearButton]="true"
            [(value)]="selectedSkills"
          />
          <oge-tag-box
            label="Team"
            [items]="avatarUsers"
            displayExpr="name"
            valueExpr="id"
            imageExpr="avatar"
            [maxDisplayedTags]="3"
            [(value)]="teamIds"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        heading="Tag Box — select all, custom tags & limits"
        description="The tag box speaks the select box&#39;s whole vocabulary — <code>groupBy</code>, <code>itemTemplate</code>, lazy <code>items</code>, <code>acceptCustomValue</code> + <code>customItemCreating</code> — and adds a tri-state <code>showSelectAll</code> row (<kbd>&uarr;</kbd> from the first option reaches it), <code>maxSelectedItems</code> with a status message, <code>tagTemplate</code> chips and a <code>+N more</code> overflow chip."
        [chips]="[
          'showSelectAll',
          'maxSelectedItems',
          'acceptCustomValue',
          'tagTemplate',
        ]"
        [code]="tagBoxFeaturesSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-start gap-6" data-demo="tag-features">
          <oge-tag-box
            label="Skills"
            [items]="skillItems()"
            displayExpr="name"
            valueExpr="id"
            groupBy="area"
            [searchEnabled]="true"
            [showSelectAll]="true"
            [acceptCustomValue]="true"
            [maxSelectedItems]="5"
            [maxDisplayedTags]="3"
            [tagTemplate]="skillTag"
            hint="Type a new skill and press Enter"
            (customItemCreating)="createSkill($event)"
            [(value)]="skillIds"
          />
          <ng-template #skillTag let-text="text"
            ><span class="oge-tag-text">#{{ text }}</span></ng-template
          >
        </div>
      </app-demo-card>

      <app-demo-card
        heading="Tag Box — remote data"
        description="The same <code>[dataSource]</code> contract on the tag box: 2,000 cities paged 30 at a time, server-side search, and chips that stay resolved while the list shows another search."
        [chips]="['dataSource', 'virtualScroll']"
        [code]="tagBoxRemoteSnippet"
        language="ts"
      >
        <oge-tag-box
          label="Delivery cities"
          displayExpr="name"
          valueExpr="id"
          [dataSource]="cityPages"
          [searchEnabled]="true"
          [virtualScroll]="true"
          [(value)]="cityIds"
        />
      </app-demo-card>

      <app-demo-card
        heading="Item states & templates"
        description="<code>disabledExpr</code> marks rows non-selectable (skipped by keyboard navigation too). The selected value stays resolvable even while the visible list is filtered."
        [chips]="['disabledExpr']"
        [code]="statesSnippet"
        language="ts"
      >
        <oge-select-box
          label="Plan"
          [items]="plans"
          displayExpr="name"
          valueExpr="id"
          disabledExpr="soldOut"
          hint="Sold-out plans can't be picked"
          [(value)]="planId"
        />
      </app-demo-card>

      <app-demo-card
        heading="Field chrome"
        description="Everything from the shared chrome applies: label modes, sizes, styling modes, clear button, hints, validation subscript and the <code>sm + subscriptSizing=none</code> compact grid-editor shape."
        [chips]="['labelMode', 'size', 'stylingMode']"
        [code]="chromeSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-start gap-6">
          <oge-select-box
            label="Country"
            labelMode="floating"
            [items]="countries"
            [showClearButton]="true"
            hint="Shipping destination"
            [(value)]="country"
          />
          <oge-select-box
            label="Country"
            size="sm"
            stylingMode="filled"
            subscriptSizing="none"
            [items]="countries"
            [(value)]="country"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        heading="Mobile / adaptive"
        description="With <code>adaptiveMode=&quot;auto&quot;</code> a viewport narrower than <code>adaptiveBreakpoint</code> (600px) turns the drop-down into a modal bottom sheet — titled with the label, a close button, a search field at the top, 44px rows, safe-area insets, focus trap and swipe-down dismiss — and the date picker into a full-screen dialog. Narrow the window (or open the page on a phone) to try it; the default <code>'none'</code> keeps existing apps anchored."
        [chips]="['adaptiveMode', 'adaptiveBreakpoint']"
        [code]="adaptiveSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-start gap-6" data-demo="adaptive">
          <oge-select-box
            label="City"
            adaptiveMode="auto"
            [items]="cities"
            [searchEnabled]="true"
            [(value)]="adaptiveCity"
          />
          <oge-tag-box
            label="Skills"
            adaptiveMode="auto"
            [items]="skills"
            [(value)]="adaptiveSkills"
          />
          <oge-date-box
            label="Due date"
            adaptiveMode="auto"
            [(value)]="adaptiveDue"
          />
        </div>
      </app-demo-card>
    }

    <h3 id="keyboard-accessibility" class="scroll-mt-20">
      Keyboard &amp; accessibility
    </h3>
    <p>
      The editor implements the WAI-ARIA combobox pattern with
      <code>aria-activedescendant</code> — DOM focus never leaves the input; the
      active option is referenced by id and scrolled into view.
    </p>
    <ul>
      <li>
        <kbd>&darr;</kbd>/<kbd>&uarr;</kbd> open the popup and move the active
        option (no wrap); <kbd>Alt</kbd>+<kbd>&uarr;</kbd> commits and closes.
      </li>
      <li>
        <kbd>Enter</kbd> and <kbd>Space</kbd> (select-only) commit;
        <kbd>Esc</kbd> closes without committing — pressed again while searching
        it clears the search text.
      </li>
      <li>
        <kbd>Home</kbd>/<kbd>End</kbd> jump to the first/last option in
        select-only mode (they move the caret while searching);
        <kbd>PgUp</kbd>/<kbd>PgDn</kbd> jump ten options.
      </li>
      <li>
        Printable characters type-ahead in select-only mode — a repeated
        character cycles through its matches.
      </li>
    </ul>
  `,
})
export class InputsSelectBoxPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_INPUTS_SELECT_BOX_SECTIONS;
  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly mappingSnippet = MAPPING_SNIPPET;
  protected readonly groupSnippet = GROUP_SNIPPET;
  protected readonly lazySnippet = LAZY_SNIPPET;
  protected readonly statesSnippet = STATES_SNIPPET;
  protected readonly chromeSnippet = CHROME_SNIPPET;
  protected readonly adaptiveSnippet = ADAPTIVE_SNIPPET;
  protected readonly remoteSnippet = REMOTE_SNIPPET;
  protected readonly templatesSnippet = TEMPLATES_SNIPPET;
  protected readonly tagBoxFeaturesSnippet = TAGBOX_FEATURES_SNIPPET;
  protected readonly tagBoxRemoteSnippet = TAGBOX_REMOTE_SNIPPET;

  // --- remote data ---------------------------------------------------------
  protected readonly customerId = signal<unknown>(1234);
  protected readonly requests = signal(0);
  protected readonly customers = Object.assign(
    new CustomDataSource<DemoCustomer>({
      key: 'id',
      load: async ({ skip = 0, take = 40, searchText }) => {
        this.requests.update((n) => n + 1);
        await new Promise((resolve) => setTimeout(resolve, 400));
        const term = (searchText ?? '').toLowerCase();
        const rows = CUSTOMERS.filter((c) =>
          c.name.toLowerCase().includes(term),
        );
        return { data: rows.slice(skip, skip + take), totalCount: rows.length };
      },
    }),
    {
      byKey: async (key: unknown) =>
        CUSTOMERS.find((c) => c.id === key) ?? null,
    },
  );

  // --- templates & cancelable events ---------------------------------------
  protected readonly statuses = [
    { id: 'todo', name: 'To do', phase: 'Open', color: '#94a3b8' },
    { id: 'doing', name: 'In progress', phase: 'Open', color: '#6366f1' },
    { id: 'review', name: 'In review', phase: 'Open', color: '#f59e0b' },
    { id: 'done', name: 'Done', phase: 'Closed', color: '#10b981' },
  ];
  protected readonly statusId = signal<unknown>('doing');
  protected readonly pinned = signal(false);

  protected onStatusClosing(event: OgeDropDownClosingEvent): void {
    if (this.pinned() && event.reason !== 'select') event.cancel = true;
  }

  // --- tag box features ----------------------------------------------------
  protected readonly skillItems = signal([
    { id: 1, name: 'Angular', area: 'Frontend' },
    { id: 2, name: 'Signals', area: 'Frontend' },
    { id: 3, name: 'SCSS', area: 'Frontend' },
    { id: 4, name: 'Nx', area: 'Tooling' },
    { id: 5, name: 'Vitest', area: 'Tooling' },
    { id: 6, name: 'Playwright', area: 'Tooling' },
  ]);
  protected readonly skillIds = signal<readonly unknown[]>([1, 4]);
  private nextSkillId = 100;

  protected createSkill(
    event: OgeSelectBoxCustomItemEvent<{
      id: number;
      name: string;
      area: string;
    }>,
  ): void {
    const item = { id: this.nextSkillId++, name: event.text, area: 'Custom' };
    this.skillItems.update((all) => [...all, item]);
    event.customItem = item;
  }

  protected readonly cityIds = signal<readonly unknown[]>([]);
  protected readonly cityPages = new CustomDataSource<DemoCustomer>({
    key: 'id',
    load: async ({ skip = 0, take = 30, searchText }) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const term = (searchText ?? '').toLowerCase();
      const rows = DEMO_CITIES.filter((c) =>
        c.name.toLowerCase().includes(term),
      );
      return { data: rows.slice(skip, skip + take), totalCount: rows.length };
    },
  });
  protected readonly adaptiveCity = signal<unknown>(null);
  protected readonly adaptiveSkills = signal<readonly unknown[]>([]);
  protected readonly adaptiveDue = signal<Date | null>(null);

  protected readonly cities = ['Ankara', 'Berlin', 'Lisbon', 'Oslo', 'Tokyo'];
  protected readonly countries = [
    'Türkiye',
    'Germany',
    'Portugal',
    'Norway',
    'Japan',
  ];

  protected readonly users: DemoUser[] = [
    { id: 1, name: 'Elif Kaya', role: 'Engineering' },
    { id: 2, name: 'Mert Demir', role: 'Design' },
    { id: 3, name: 'Selin Doğan', role: 'Backend' },
    { id: 4, name: 'Can Yılmaz', role: 'Product' },
    { id: 5, name: 'Deniz Arslan', role: 'QA' },
  ];

  protected readonly plans: DemoPlan[] = [
    { id: 'starter', name: 'Starter' },
    { id: 'team', name: 'Team' },
    { id: 'scale', name: 'Scale (sold out)', soldOut: true },
    { id: 'enterprise', name: 'Enterprise' },
  ];

  protected readonly city = signal<unknown>(null);
  protected readonly assigneeId = signal<unknown>(null);
  protected readonly planId = signal<unknown>(null);
  protected readonly country = signal<unknown>(null);
  protected readonly memberId = signal<unknown>(null);
  protected readonly tag = signal<unknown>(null);
  protected readonly warehouse = signal<unknown>(null);

  protected readonly tags = signal<string[]>(['angular', 'signals']);
  protected readonly tagBoxSnippet = TAGBOX_SNIPPET;

  protected readonly skills = ['Angular', 'Signals', 'Nx', 'Vitest', 'SCSS'];
  protected readonly selectedSkills = signal<readonly unknown[]>(['Angular']);
  protected readonly teamIds = signal<readonly unknown[]>([1, 2]);

  /** Avatar images served by the docs (`public/avatars`), as in the snippet. */
  protected readonly avatarUsers = [1, 2, 3, 4, 5].map((id) => ({
    id,
    name: [
      'Elif Kaya',
      'Mert Demir',
      'Selin Doğan',
      'Can Yılmaz',
      'Deniz Arslan',
    ][id - 1],
    avatar: `/avatars/${id}.png`,
  }));

  protected createTag(event: OgeSelectBoxCustomItemEvent<string>): void {
    event.customItem = event.text;
    this.tags.update((current) => [...current, event.text]);
  }

  protected readonly loadWarehouses = (): Promise<string[]> =>
    new Promise((resolve) =>
      setTimeout(() => resolve(['Hamburg', 'İzmir', 'Rotterdam']), 900),
    );
}
