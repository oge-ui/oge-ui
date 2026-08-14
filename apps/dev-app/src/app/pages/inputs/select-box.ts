import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  OgeSelectBox,
  OgeTagBox,
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
  BASIC_SNIPPET,
  CHROME_SNIPPET,
  GROUP_SNIPPET,
  LAZY_SNIPPET,
  MAPPING_SNIPPET,
  STATES_SNIPPET,
  TAGBOX_SNIPPET,
} from './select-box-snippets';

const SECTIONS = [
  'Basic usage',
  'Data mapping & search',
  'Grouping & custom values',
  'Lazy data',
  'Tag Box — multi-select',
  'Item states & templates',
  'Field chrome',
  'Keyboard & accessibility',
] as const;

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
  imports: [
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

  /** Inline SVG avatars — the docs stay fully offline. */
  protected readonly avatarUsers = [1, 2, 3, 4, 5].map((id) => ({
    id,
    name: [
      'Elif Kaya',
      'Mert Demir',
      'Selin Doğan',
      'Can Yılmaz',
      'Deniz Arslan',
    ][id - 1],
    avatar:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="8" fill="${['#6366f1', '#22d3ee', '#ec4899', '#10b981', '#f59e0b'][id - 1]}"/><text x="16" y="21" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#fff">${['EK', 'MD', 'SD', 'CY', 'DA'][id - 1]}</text></svg>`,
      ),
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
