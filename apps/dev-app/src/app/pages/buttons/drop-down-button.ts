import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  OgeDropDownButton,
  OgeDropDownContent,
  type OgeDropDownButtonItemClickEvent,
} from '@oge-ui/buttons';
import type { OgeMenuItem } from '@oge-ui/overlay';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';

const SECTIONS = [
  'Items & menu basics',
  'Split button & remembered action',
  'Async items',
  'Custom panel content',
] as const;

const BASIC_SNIPPET = `<oge-drop-down-button
  text="Export"
  severity="accent"
  [items]="exportItems"
  (itemClick)="export($event.item.value)"
/>

// component
protected readonly exportItems: OgeMenuItem[] = [
  { text: 'Excel (.xlsx)', value: 'xlsx' },
  { text: 'CSV', value: 'csv' },
  { separator: true, text: '' },
  { text: 'PDF', value: 'pdf' },
];`;

const SPLIT_SNIPPET = `<oge-drop-down-button
  text="Run"
  [splitButton]="true"
  [rememberLastAction]="true"
  [items]="runTargets"
  (clicked)="runCurrent()"
  (itemClick)="run($event.item.value)"
/>`;

const ASYNC_SNIPPET = `<oge-drop-down-button text="Branches" [items]="loadBranches" />

// invoked on first open, cached until the reference changes
protected readonly loadBranches = () =>
  fetch('/api/branches').then((r) => r.json());`;

const CONTENT_SNIPPET = `<oge-drop-down-button text="Filters" [dropdownWidth]="260">
  <div *ogeDropDownContent="let close" class="p-3">
    …any content…
    <oge-button text="Apply" size="sm" (clicked)="apply(); close()" />
  </div>
</oge-drop-down-button>`;

@Component({
  selector: 'app-buttons-drop-down',
  imports: [
    OgeDropDownButton,
    OgeDropDownContent,
    DemoCard,
    DocHeader,
    PageToc,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Drop Down Button"
      [chips]="[
        'items',
        'splitButton',
        'rememberLastAction',
        '[(opened)]',
        'dropdownPlacement',
      ]"
    >
      <p>
        <code>&lt;oge-drop-down-button&gt;</code> pairs an
        <code>oge-button</code> trigger with an anchored menu panel from
        <code>&#64;oge-ui/overlay</code> — flip-aware positioning, outside-click
        and Escape closing, focus restore and the full WAI-ARIA menu-button
        keyboard pattern (arrows, Home/End, type-ahead). Items can load lazily
        from a promise; split mode adds an independent action button.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-demo-card
      [chips]="['items array', 'separator', 'checked', 'danger severity']"
      heading="Items & menu basics"
      description="Pass an <code>items</code> array of menu entries — plain actions, separators, checkable state (<code>checked</code>) and destructive styling (<code>severity: 'danger'</code>). The panel positions itself with flip-aware math, repositions on scroll, closes on outside click or Escape, and restores focus to the trigger. <code>itemClick</code> delivers the chosen item, then the panel closes."
      [code]="basicSnippet"
    >
      <div class="flex flex-wrap items-center gap-3">
        <oge-drop-down-button
          text="Export"
          severity="accent"
          [items]="exportItems"
          (itemClick)="log($event)"
        />
        <oge-drop-down-button
          text="View"
          stylingMode="outlined"
          [items]="viewItems"
          (itemClick)="onViewToggle($event)"
        />
        <oge-drop-down-button
          text="Actions"
          stylingMode="text"
          [items]="actionItems"
        />
        <span class="text-sm opacity-70">{{ lastPick() }}</span>
      </div>
    </app-demo-card>

    <app-demo-card
      [chips]="['splitButton', 'rememberLastAction', 'action pipeline']"
      heading="Split button & remembered action"
      description="<code>splitButton</code> separates the control into an action button and a chevron toggle — the main button emits <code>clicked</code> (with full <code>action</code>/<code>clickGuard</code> support) without opening the menu. Add <code>rememberLastAction</code> and the last chosen item becomes the main button's label and action for the session; <code>selectionChanged</code> reports each swap with the previous item."
      [code]="splitSnippet"
    >
      <div class="flex flex-wrap items-center gap-3" data-testid="split-demo">
        <oge-drop-down-button
          text="Run"
          severity="success"
          [splitButton]="true"
          [rememberLastAction]="true"
          [items]="runTargets"
          (clicked)="runs.set(runs() + 1)"
          (itemClick)="lastRun.set($event.item.text)"
        />
        <span class="text-sm opacity-70">
          runs ×{{ runs() }} · last: {{ lastRun() }} — pick a target; the main
          button remembers it.
        </span>
      </div>
    </app-demo-card>

    <app-demo-card
      [chips]="['async items', 'loading row', 'cache + retry']"
      heading="Async items"
      description="Instead of an array, <code>items</code> accepts a function returning a promise. It is invoked on the first open — the panel shows a localized loading row, then the items; failures show an error row and the next open retries. Results are cached until the function reference changes, and stale responses from superseded requests are discarded."
      [code]="asyncSnippet"
    >
      <div class="flex flex-wrap items-center gap-3">
        <oge-drop-down-button
          text="Branches"
          stylingMode="outlined"
          [items]="loadBranches"
          data-testid="async-demo"
        />
        <span class="text-sm opacity-70">
          1.2s load on first open — subsequent opens hit the cache.
        </span>
      </div>
    </app-demo-card>

    <app-demo-card
      [chips]="['*ogeDropDownContent', 'dropdownWidth', 'close fn']"
      heading="Custom panel content"
      description="For panels that are not menus — filter forms, pickers, mini toolbars — project a template with <code>*ogeDropDownContent</code>. It replaces the item list entirely and receives a close function as the implicit template variable, so any element inside can dismiss the panel and hand focus back to the trigger."
      [code]="contentSnippet"
    >
      <div class="flex flex-wrap items-center gap-3">
        <oge-drop-down-button
          text="Custom panel"
          [dropdownWidth]="260"
          data-testid="content-demo"
        >
          <div *ogeDropDownContent="let close" class="flex flex-col gap-2 p-3">
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" checked /> Only active rows
            </label>
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" /> Include archived
            </label>
            <button
              type="button"
              class="self-end rounded-md border px-3 py-1 text-sm"
              (click)="close()"
            >
              Apply
            </button>
          </div>
        </oge-drop-down-button>
      </div>
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        Non-split mode: the trigger click only toggles the panel; bind
        <code>(itemClick)</code>. <code>(clicked)</code> fires solely from the
        split main button.
      </li>
      <li>
        The panel flips above the trigger near the viewport bottom and
        repositions on scroll/resize — never detaches like a frozen popup.
      </li>
      <li>
        Keyboard: <kbd>↓</kbd>/<kbd>↑</kbd> opens focusing first/last item,
        type-ahead jumps by label, <kbd>Esc</kbd> closes and restores focus.
      </li>
      <li>
        <code>holdToConfirm</code>/<code>autoRepeat</code> are not available on
        drop-down buttons.
      </li>
    </ul>
  `,
})
export class ButtonsDropDownPage {
  protected readonly sections = SECTIONS;
  protected readonly lastPick = signal('—');
  protected readonly runs = signal(0);
  protected readonly lastRun = signal('—');
  protected readonly compactView = signal(false);

  protected readonly exportItems: OgeMenuItem[] = [
    { text: 'Excel (.xlsx)', value: 'xlsx' },
    { text: 'CSV', value: 'csv' },
    { separator: true, text: '' },
    { text: 'PDF', value: 'pdf' },
  ];

  protected get viewItems(): OgeMenuItem[] {
    return [
      { text: 'Compact rows', checked: this.compactView() },
      { text: 'Show summary', checked: true },
      { text: 'Show filters', checked: false },
    ];
  }

  protected readonly actionItems: OgeMenuItem[] = [
    { text: 'Duplicate' },
    { text: 'Archive' },
    { separator: true, text: '' },
    { text: 'Delete', severity: 'danger' },
  ];

  protected readonly runTargets: OgeMenuItem[] = [
    { text: 'Run tests', value: 'test' },
    { text: 'Run build', value: 'build' },
    { text: 'Run lint', value: 'lint' },
  ];

  protected readonly loadBranches = (): Promise<OgeMenuItem[]> =>
    new Promise((resolve) =>
      setTimeout(
        () =>
          resolve([
            { text: 'main', checked: true },
            { text: 'develop' },
            { text: 'feature/buttons' },
            { text: 'feature/overlay' },
          ]),
        1200,
      ),
    );

  protected log(event: OgeDropDownButtonItemClickEvent): void {
    this.lastPick.set(`selected: ${event.item.text}`);
  }

  protected onViewToggle(event: OgeDropDownButtonItemClickEvent): void {
    if (event.item.text === 'Compact rows') {
      this.compactView.set(!this.compactView());
    }
  }

  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly splitSnippet = SPLIT_SNIPPET;
  protected readonly asyncSnippet = ASYNC_SNIPPET;
  protected readonly contentSnippet = CONTENT_SNIPPET;
}
