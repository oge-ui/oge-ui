import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { OgeSelectBox, type OgeSelectBoxCustomItemEvent } from '@oge-ui/inputs';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';

const SECTIONS = [
  'Basic usage',
  'Data mapping & search',
  'Grouping & custom values',
  'Lazy data',
  'Item states & templates',
  'Field chrome',
  'Keyboard & accessibility',
] as const;

const BASIC_SNIPPET = `<oge-select-box
  label="City"
  [items]="cities"
  [(value)]="city"
/>

cities = ['Ankara', 'Berlin', 'Lisbon', 'Oslo', 'Tokyo'];`;

const MAPPING_SNIPPET = `<oge-select-box
  label="Assignee"
  [items]="users"
  displayExpr="name"
  valueExpr="id"
  [searchEnabled]="true"
  [showClearButton]="true"
  [(value)]="assigneeId"
  (searchChanged)="onSearch($event.text)"
/>

users = [
  { id: 1, name: 'Elif Kaya', role: 'Engineering' },
  { id: 2, name: 'Mert Demir', role: 'Design' },
  // …
];`;

const GROUP_SNIPPET = `<!-- flat data, grouped on the fly -->
<oge-select-box
  label="Team member"
  [items]="users"
  displayExpr="name"
  valueExpr="id"
  groupBy="role"
  [(value)]="memberId"
/>

<!-- typed text becomes a new item -->
<oge-select-box
  label="Tag"
  [items]="tags()"
  [searchEnabled]="true"
  [acceptCustomValue]="true"
  (customItemCreating)="createTag($event)"
  [(value)]="tag"
/>

createTag(event: OgeSelectBoxCustomItemEvent<string>) {
  event.customItem = event.text;      // or a promise, or null to reject
  this.tags.update((t) => [...t, event.text]);
}`;

const LAZY_SNIPPET = `<oge-select-box
  label="Warehouse"
  [items]="loadWarehouses"
  [(value)]="warehouse"
/>

// invoked once, on first open — loading/error rows render while pending
loadWarehouses = () =>
  new Promise<string[]>((resolve) =>
    setTimeout(() => resolve(['Hamburg', 'İzmir', 'Rotterdam']), 900),
  );`;

const STATES_SNIPPET = `<oge-select-box
  label="Plan"
  [items]="plans"
  displayExpr="name"
  valueExpr="id"
  disabledExpr="soldOut"
  [(value)]="planId"
/>`;

const CHROME_SNIPPET = `<oge-select-box
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
/>`;

interface DemoUser {
  id: number;
  name: string;
  role: string;
}

interface DemoPlan {
  id: string;
  name: string;
  soldOut?: boolean;
}

@Component({
  selector: 'app-inputs-select-box',
  imports: [OgeSelectBox, DemoCard, DocHeader, PageToc],
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
      <p>
        <code>&lt;oge-select-box&gt;</code> is a drop-down select on the shared
        field chrome: pick one item from a list, optionally filter it by typing,
        and bind the committed value with signals, Signal Forms or reactive
        forms. The popup follows the anchor on scroll, flips when cramped and
        matches the field width.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-demo-card
      heading="Basic usage"
      description="Bind an array of strings and <code>[(value)]</code> — no mapping needed. Open with the mouse, <kbd>&darr;</kbd>, <kbd>Enter</kbd> or by typing a letter (type-ahead)."
      [chips]="['[(value)]']"
      [code]="basicSnippet"
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
    >
      <oge-select-box
        label="Warehouse"
        [items]="loadWarehouses"
        [(value)]="warehouse"
      />
    </app-demo-card>

    <app-demo-card
      heading="Item states & templates"
      description="<code>disabledExpr</code> marks rows non-selectable (skipped by keyboard navigation too). The selected value stays resolvable even while the visible list is filtered."
      [chips]="['disabledExpr']"
      [code]="statesSnippet"
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
  protected readonly sections = SECTIONS;
  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly mappingSnippet = MAPPING_SNIPPET;
  protected readonly groupSnippet = GROUP_SNIPPET;
  protected readonly lazySnippet = LAZY_SNIPPET;
  protected readonly statesSnippet = STATES_SNIPPET;
  protected readonly chromeSnippet = CHROME_SNIPPET;

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

  protected createTag(event: OgeSelectBoxCustomItemEvent<string>): void {
    event.customItem = event.text;
    this.tags.update((current) => [...current, event.text]);
  }

  protected readonly loadWarehouses = (): Promise<string[]> =>
    new Promise((resolve) =>
      setTimeout(() => resolve(['Hamburg', 'İzmir', 'Rotterdam']), 900),
    );
}
