import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { OgeAutocomplete, OgeSelectBox } from '@oge-ui/inputs';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  BASIC_SNIPPET,
  CHROME_SNIPPET,
  FORCE_SNIPPET,
  LAZY_SNIPPET,
  TUNING_SNIPPET,
  VIRTUAL_SNIPPET,
} from './autocomplete-snippets';

const SECTIONS = [
  'Basic usage',
  'Suggestion tuning',
  'Force selection',
  'Virtual scrolling',
  'Lazy & server-side data',
  'Field chrome',
  'Keyboard & accessibility',
] as const;

interface DemoUser {
  id: number;
  name: string;
  role: string;
}

@Component({
  selector: 'app-inputs-autocomplete',
  imports: [OgeAutocomplete, OgeSelectBox, DemoCard, DocHeader, PageToc],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Autocomplete"
      category="Inputs"
      categoryLink="/components/inputs"
      [chips]="[
        'text-valued',
        'WAI-ARIA combobox',
        'virtual scroll',
        'signal forms',
      ]"
    >
      <p>
        <code>&lt;oge-autocomplete&gt;</code> is a text editor with a filtered
        suggestion list: the committed value is the <em>string itself</em>,
        suggestions open while typing and picking one writes its display text.
        Use it when free text is valid and the list is assistance — reach for
        <code>&lt;oge-select-box&gt;</code> when the value must be an item.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-demo-card
      heading="Basic usage"
      description="Type to see suggestions (from <code>minSearchLength</code> = 1 character on). <kbd>Enter</kbd> or blur commits the text; picking a suggestion commits its display text. The chevron and field-click opening are off by default."
      [chips]="['value: string', '[(value)]']"
      [code]="basicSnippet"
      language="ts"
    >
      <div class="flex flex-wrap items-start gap-6">
        <oge-autocomplete label="City" [items]="cities" [(value)]="cityName" />
        <div class="pt-2 text-sm text-gray-500 dark:text-gray-400">
          value: <code>{{ cityName() === '' ? "''" : cityName() }}</code>
        </div>
      </div>
    </app-demo-card>

    <app-demo-card
      heading="Suggestion tuning"
      description="<code>minSearchLength</code> keeps the list closed until enough is typed, <code>maxItemCount</code> caps it (default 10), <code>searchMode</code> switches contains/startswith and <code>searchTimeout</code> debounces the filter. <code>groupBy</code> and <code>itemTemplate</code> work exactly like the select box."
      [chips]="['minSearchLength', 'maxItemCount', 'searchMode']"
      [code]="tuningSnippet"
      language="ts"
    >
      <oge-autocomplete
        label="Product"
        hint="At least 2 characters, top 5 matches"
        [items]="products"
        searchMode="startswith"
        [minSearchLength]="2"
        [maxItemCount]="5"
        [(value)]="productName"
      />
    </app-demo-card>

    <app-demo-card
      heading="Force selection"
      description="<code>forceSelection</code> turns free text off: on blur, text that matches no suggestion reverts to the last committed value, and an exact match resolves to the item with its canonical casing. <code>selectionChanged</code> reports the picked item — or <code>null</code> once the text diverges."
      [chips]="['forceSelection', 'selectionChanged', 'selectedItem']"
      [code]="forceSnippet"
      language="ts"
    >
      <div class="flex flex-wrap items-start gap-6">
        <oge-autocomplete
          label="Assignee"
          [items]="users"
          displayExpr="name"
          [forceSelection]="true"
          [(value)]="assigneeName"
          (selectionChanged)="assigneeRole.set($event.item?.role ?? null)"
        />
        <div class="pt-2 text-sm text-gray-500 dark:text-gray-400">
          picked role: <code>{{ assigneeRole() ?? 'null' }}</code>
        </div>
      </div>
    </app-demo-card>

    <app-demo-card
      heading="Virtual scrolling"
      description="<code>virtualScroll</code> windows the dropdown: 10&nbsp;000 rows here, ~15 in the DOM inside a full-height spacer. Available on the select box, tag box and autocomplete alike — pass <code>true</code> or <code>{ itemHeight, overscan }</code>. Raise <code>maxItemCount</code> on the autocomplete, which otherwise caps the list at 10. Rows get a fixed size-matched height; <code>groupBy</code>/<code>wrapItemText</code> are ignored while active."
      [chips]="['virtualScroll', '10k rows', 'fixed itemHeight']"
      [code]="virtualSnippet"
      language="ts"
    >
      <div class="flex flex-wrap items-start gap-6">
        <oge-autocomplete
          label="Account"
          [items]="accounts"
          [virtualScroll]="true"
          [maxItemCount]="10000"
          [(value)]="accountName"
        />
        <oge-select-box
          label="Account (select box)"
          [items]="accounts"
          [searchEnabled]="true"
          [virtualScroll]="true"
          [(value)]="accountId"
        />
      </div>
    </app-demo-card>

    <app-demo-card
      heading="Lazy & server-side data"
      description="A function as <code>[items]</code> loads once on first open with localized loading/error rows. For fully server-driven suggestions, listen to <code>searchChanged</code>, keep <code>[items]</code> in sync and flag <code>[loading]</code> while the request runs."
      [chips]="['items: () => Promise', 'searchChanged', 'loading']"
      [code]="lazySnippet"
      language="ts"
    >
      <oge-autocomplete
        label="Repository"
        [items]="loadRepos"
        [showDropDownButton]="true"
        [(value)]="repo"
      />
    </app-demo-card>

    <app-demo-card
      heading="Field chrome"
      description="The shared chrome applies unchanged: label modes, sizes, styling modes, clear button, hints and validation. <code>showDropDownButton</code> + <code>openOnFieldClick</code> opt into select-box-like opening."
      [chips]="['labelMode', 'showDropDownButton', 'openOnFieldClick']"
      [code]="chromeSnippet"
      language="ts"
    >
      <oge-autocomplete
        label="Tag"
        labelMode="floating"
        hint="Start typing to search"
        [items]="tags"
        [showClearButton]="true"
        [showDropDownButton]="true"
        [openOnFieldClick]="true"
        [(value)]="tag"
      />
    </app-demo-card>

    <h3 id="keyboard-accessibility" class="scroll-mt-20">
      Keyboard &amp; accessibility
    </h3>
    <p>
      WAI-ARIA combobox with <code>aria-autocomplete="list"</code> and
      <code>aria-activedescendant</code> — DOM focus never leaves the input. No
      suggestion is auto-activated: <kbd>Enter</kbd> without arrowing commits
      the typed text.
    </p>
    <ul>
      <li>
        <kbd>&darr;</kbd>/<kbd>&uarr;</kbd> open the list and move the active
        suggestion; <kbd>PgUp</kbd>/<kbd>PgDn</kbd> jump ten.
      </li>
      <li>
        <kbd>Enter</kbd> commits the active suggestion — or the raw text when
        none is active. <kbd>Esc</kbd> closes the list first, then reverts the
        typed text.
      </li>
      <li>
        Typing below <code>minSearchLength</code> closes the list; deleting all
        text keeps the last committed value until blur.
      </li>
    </ul>
  `,
})
export class InputsAutocompletePage {
  protected readonly sections = SECTIONS;
  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly tuningSnippet = TUNING_SNIPPET;
  protected readonly forceSnippet = FORCE_SNIPPET;
  protected readonly virtualSnippet = VIRTUAL_SNIPPET;
  protected readonly lazySnippet = LAZY_SNIPPET;
  protected readonly chromeSnippet = CHROME_SNIPPET;

  protected readonly cities = [
    'Ankara',
    'Antalya',
    'Berlin',
    'Bursa',
    'Lisbon',
    'Oslo',
    'Tokyo',
  ];

  protected readonly products = [
    'Notebook Air 13',
    'Notebook Pro 16',
    'Noise-cancelling Headset',
    'Mechanical Keyboard',
    'Monitor 27" 4K',
    'Monitor 32" 5K',
    'Mouse Wireless',
    'Microphone USB',
  ];

  protected readonly users: DemoUser[] = [
    { id: 1, name: 'Elif Kaya', role: 'Engineering' },
    { id: 2, name: 'Mert Demir', role: 'Design' },
    { id: 3, name: 'Selin Doğan', role: 'Backend' },
    { id: 4, name: 'Can Yılmaz', role: 'Product' },
    { id: 5, name: 'Deniz Arslan', role: 'QA' },
  ];

  protected readonly tags = ['angular', 'signals', 'nx', 'vitest', 'scss'];

  /** 10k rows for the virtual scrolling demo. */
  protected readonly accounts = Array.from(
    { length: 10_000 },
    (_, i) => `Account #${String(i + 1).padStart(5, '0')}`,
  );

  protected readonly cityName = signal('');
  protected readonly productName = signal('');
  protected readonly assigneeName = signal('');
  protected readonly assigneeRole = signal<string | null>(null);
  protected readonly accountName = signal('');
  protected readonly accountId = signal<unknown>(null);
  protected readonly repo = signal('');
  protected readonly tag = signal('');

  protected readonly loadRepos = (): Promise<string[]> =>
    new Promise((resolve) =>
      setTimeout(
        () => resolve(['oge-ui', 'oge-docs', 'oge-examples', 'oge-themes']),
        900,
      ),
    );
}
