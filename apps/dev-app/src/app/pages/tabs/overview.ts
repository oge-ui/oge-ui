import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  OgeTab,
  OgeTabContentTemplate,
  OgeTabPanel,
  OgeTabs,
  type OgeTabClosedEvent,
  type OgeTabItem,
  type OgeTabSelectionChangedEvent,
  type OgeTabsAlignment,
  type OgeTabPanelAnimation,
} from '@oge-ui/tabs';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_TABS_OVERVIEW_SECTIONS,
  ReactTabsOverviewDemos,
} from '../react-tabs/overview';
import {
  ALIGNMENT_SNIPPET,
  ANIMATION_SNIPPET,
  BASIC_SNIPPET,
  CLOSE_SNIPPET,
  ITEMS_SNIPPET,
  LAZY_SNIPPET,
  OVERFLOW_SNIPPET,
  POSITION_SNIPPET,
  REORDER_SNIPPET,
} from './overview-snippets';

const SECTIONS = [
  'Declarative tabs',
  'Data-driven items',
  'Lazy rendering & keep-alive',
  'Closable tabs & async close guard',
  'Overflow: arrows & all-tabs menu',
  'Drag reorder',
  'Positions & styling',
  'Alignment, indicator & empty state',
  'Panel transitions',
] as const;

/** Stamps its creation time — makes lazy/keep-alive behavior visible. */
@Component({
  selector: 'app-created-at',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="text-sm opacity-70"
    >created at {{ createdAt }}</span
  >`,
})
class CreatedAt {
  protected readonly createdAt = new Date().toLocaleTimeString();
}

@Component({
  selector: 'app-tabs-overview',
  imports: [
    OgeTabPanel,
    OgeTabs,
    OgeTab,
    OgeTabContentTemplate,
    CreatedAt,
    DemoCard,
    DocHeader,
    ReactTabsOverviewDemos,
    PageToc,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Tabs"
      [chips]="[
        '[(selectedIndex)] / [(selectedKey)]',
        'deferRendering',
        'closeGuard',
        'drag reorder',
      ]"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeTabPanel /&gt;</code> from
          <code>&#64;oge-ui/react-tabs</code> renders a tab strip with content
          panels; <code>&lt;OgeTabs /&gt;</code> is the strip alone. Both accept
          declarative <code>tabs</code> entries <em>and</em> a data-driven
          <code>items</code> array, follow the WAI-ARIA tabs pattern (roving
          tabindex, arrow keys, automatic or manual activation) and speak RTL
          out of the box. They run the same
          <code>&#64;oge-ui/behavior</code> pipelines and load the same
          stylesheet as the Angular components — only the API is React's:
          controlled/uncontrolled pairs, callbacks and render props.
        </p>
      } @else {
        <p>
          <code>&lt;oge-tab-panel&gt;</code> renders a tab strip with content
          panels; <code>&lt;oge-tabs&gt;</code> is the strip alone. Both accept
          declarative <code>&lt;oge-tab&gt;</code> children <em>and</em> a
          data-driven <code>items</code> array, follow the WAI-ARIA tabs pattern
          (roving tabindex, arrow keys, automatic or manual activation) and
          speak RTL out of the box.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-tabs-overview-demos />
    } @else {
      <app-demo-card
        [chips]="['two-way selection', 'cancelable selectionChanging']"
        heading="Declarative tabs"
        description="Projected <code>&amp;lt;oge-tab&amp;gt;</code> children carry their content. <code>selectedIndex</code> is a two-way model; a user gesture first fires the cancelable <code>selectionChanging</code>, then <code>selectionChanged</code>. Disabled tabs are skipped by clicks and arrow keys."
        [code]="basicSnippet"
        language="ts"
      >
        <oge-tab-panel
          [(selectedIndex)]="basicIndex"
          (selectionChanged)="lastChange.set($event)"
        >
          <oge-tab text="Overview">
            <p>Project overview — selected index: {{ basicIndex() }}</p>
          </oge-tab>
          <oge-tab text="Activity"><p>Latest activity feed…</p></oge-tab>
          <oge-tab text="Settings" [disabled]="true"><p>Settings…</p></oge-tab>
        </oge-tab-panel>
        @if (lastChange(); as change) {
          <p class="mt-2 text-sm opacity-70">
            selectionChanged → index {{ change.index }} (from
            {{ change.previousIndex }})
          </p>
        }
      </app-demo-card>

      <app-demo-card
        [chips]="['items', '[(selectedKey)]', 'badge', 'dirty']"
        heading="Data-driven items"
        description="The <code>items</code> array drives the strip; <code>selectedKey</code> selects by identity, so it survives reordering and insertions. <code>badge</code> renders a counter, <code>dirty</code> the unsaved-changes dot (announced to screen readers). A component-level <code>ogeTabContentTemplate</code> renders every item's panel."
        [code]="itemsSnippet"
        language="ts"
      >
        <oge-tab-panel [items]="docs" [(selectedKey)]="activeDoc">
          <ng-template ogeTabContentTemplate let-item>
            <p>
              Editing <b>{{ item?.text }}</b> — selectedKey:
              <code>{{ activeDoc() }}</code>
            </p>
          </ng-template>
        </oge-tab-panel>
      </app-demo-card>

      <app-demo-card
        [chips]="['deferRendering', 'keepAlive']"
        heading="Lazy rendering & keep-alive"
        description="With <code>deferRendering</code> (default) a lazy <code>ogeTabContentTemplate</code> is instantiated on first visit; <code>keepAlive</code> (default) then keeps it mounted while hidden — note the creation time does not change when you come back. Toggle keep-alive off and the content is recreated on every visit."
        [code]="lazySnippet"
        language="ts"
      >
        <label class="mb-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            [checked]="keepAlive()"
            (change)="toggleKeepAlive()"
          />
          keepAlive
        </label>
        <oge-tab-panel [keepAlive]="keepAlive()">
          <oge-tab text="First">
            <ng-template ogeTabContentTemplate><app-created-at /></ng-template>
          </oge-tab>
          <oge-tab text="Second">
            <ng-template ogeTabContentTemplate><app-created-at /></ng-template>
          </oge-tab>
        </oge-tab-panel>
      </app-demo-card>

      <app-demo-card
        [chips]="['closable', 'async closeGuard', 'Delete key']"
        heading="Closable tabs & async close guard"
        description="Closing runs a pipeline: cancelable <code>tabClosing</code> → the tab's async <code>closeGuard</code> (the ✕ shows a pending spinner, extra clicks are ignored) → <code>tabClosed</code>, where the app removes the tab — focus hands off per the APG (following tab, else preceding). The guarded tab here asks for a second click within 3 seconds. Delete/Backspace on a focused tab closes it too."
        [code]="closeSnippet"
        language="ts"
      >
        <oge-tab-panel
          [items]="files()"
          [closable]="true"
          (tabClosed)="removeFile($event)"
        >
          <ng-template ogeTabContentTemplate let-item>
            <p>{{ item?.text }} content…</p>
          </ng-template>
        </oge-tab-panel>
        <div class="mt-2 flex items-center gap-3">
          <button
            type="button"
            class="rounded border px-2 py-1 text-sm"
            (click)="resetFiles()"
          >
            Reset tabs
          </button>
          @if (guardNotice(); as notice) {
            <span class="text-sm opacity-70">{{ notice }}</span>
          }
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['showNavButtons', 'showTabListButton']"
        heading="Overflow: arrows & all-tabs menu"
        description="When the strip overflows, <code>showNavButtons: 'auto'</code> reveals scroll arrows (RTL-aware) and the selected tab is kept in view. <code>showTabListButton</code> adds an all-tabs menu — the active tab is checked, disabled tabs stay disabled."
        [code]="overflowSnippet"
        language="ts"
      >
        <oge-tabs
          [items]="manyTabs"
          [(selectedIndex)]="overflowIndex"
          [showTabListButton]="true"
          ariaLabel="Chapters"
        />
        <p class="mt-2 text-sm opacity-70">
          selected: {{ manyTabs[overflowIndex()].text }}
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['allowTabReordering', 'tabReordered']"
        heading="Drag reorder"
        description="Drag a header to reorder — a drop indicator marks the target, Escape cancels the drag, and the selection follows the moved tab. <code>tabReordering</code> is cancelable; <code>tabReordered</code> reports the committed move. Give tabs a <code>key</code> for stable identity."
        [code]="reorderSnippet"
        language="ts"
      >
        <oge-tab-panel [items]="stages" [allowTabReordering]="true">
          <ng-template ogeTabContentTemplate let-item>
            <p>{{ item?.text }} stage…</p>
          </ng-template>
        </oge-tab-panel>
      </app-demo-card>

      <app-demo-card
        [chips]="['tabsPosition', 'stylingMode', 'size']"
        heading="Positions & styling"
        description="<code>tabsPosition</code> accepts logical <code>top / bottom / start / end</code> — vertical strips switch the arrow keys to Up/Down and RTL flips <code>start</code>/<code>end</code> for free. <code>stylingMode='secondary'</code> renders soft pills, <code>size</code> controls density."
        [code]="positionSnippet"
        language="ts"
      >
        <oge-tab-panel tabsPosition="start" stylingMode="secondary" size="sm">
          <oge-tab text="General"><p>General project settings…</p></oge-tab>
          <oge-tab text="Members"><p>Member management…</p></oge-tab>
          <oge-tab text="Danger zone"><p>Careful now…</p></oge-tab>
        </oge-tab-panel>
      </app-demo-card>

      <app-demo-card
        [chips]="['tabAlignment', 'indicatorFit', 'empty state']"
        heading="Alignment, indicator & empty state"
        description="<code>tabAlignment</code> distributes the tabs while they fit — <code>justify</code> spreads them to the edges, <code>stretch</code> gives each an equal share (the reference <code>stretchTabs</code> / <code>tabAlignment</code> options). <code>indicatorFit='content'</code> shrinks the selected-tab underline to the label (the reference <code>fitInkBarToContent</code>). With no visible tabs the strip renders <code>messages.noData</code>."
        [code]="alignmentSnippet"
        language="ts"
      >
        <div class="mb-3 flex flex-wrap items-center gap-4 text-sm">
          <label class="flex items-center gap-2">
            alignment
            <select
              class="rounded border px-2 py-1"
              [value]="alignment()"
              (change)="setAlignment($event)"
            >
              @for (option of alignments; track option) {
                <option [value]="option">{{ option }}</option>
              }
            </select>
          </label>
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              [checked]="fitIndicator()"
              (change)="toggleIndicator()"
            />
            indicatorFit = content
          </label>
        </div>
        <oge-tabs
          [items]="stages"
          [tabAlignment]="alignment()"
          [indicatorFit]="fitIndicator() ? 'content' : 'tab'"
          [(selectedIndex)]="alignmentIndex"
          ariaLabel="Alignment demo"
        />
        <p class="mt-4 mb-1 text-sm opacity-70">Empty strip:</p>
        <oge-tabs [items]="[]" ariaLabel="Empty demo" />
      </app-demo-card>

      <app-demo-card
        [chips]="['panelAnimation', 'dynamicHeight', 'reduced-motion']"
        heading="Panel transitions"
        description="<code>panelAnimation</code> fades or slides the incoming panel — <code>slide</code> enters from the direction of travel and mirrors itself under RTL. <code>dynamicHeight</code> animates the content box between panel heights instead of letting the page jump, tracking async content with a <code>ResizeObserver</code>. Duration is the <code>--oge-tab-panel-transition</code> variable rather than an input, and both are suppressed under <code>prefers-reduced-motion</code>."
        [code]="animationSnippet"
        language="ts"
      >
        <div class="mb-3 flex flex-wrap items-center gap-4 text-sm">
          <label class="flex items-center gap-2">
            panelAnimation
            <select
              class="rounded border px-2 py-1"
              [value]="panelAnimation()"
              (change)="setAnimation($event)"
            >
              @for (option of animations; track option) {
                <option [value]="option">{{ option }}</option>
              }
            </select>
          </label>
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              [checked]="dynamicHeight()"
              (change)="toggleDynamicHeight()"
            />
            dynamicHeight
          </label>
        </div>
        <oge-tab-panel
          [panelAnimation]="panelAnimation()"
          [dynamicHeight]="dynamicHeight()"
          [(selectedIndex)]="animationIndex"
        >
          <oge-tab text="Short"><p>One line of content.</p></oge-tab>
          <oge-tab text="Medium">
            <p>A few more lines.</p>
            <p>So the panel is noticeably taller than the first one.</p>
          </oge-tab>
          <oge-tab text="Tall">
            @for (line of tallLines; track line) {
              <p>{{ line }}</p>
            }
          </oge-tab>
        </oge-tab-panel>
      </app-demo-card>
    }
  `,
})
export class TabsOverviewPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_TABS_OVERVIEW_SECTIONS;
  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly itemsSnippet = ITEMS_SNIPPET;
  protected readonly lazySnippet = LAZY_SNIPPET;
  protected readonly closeSnippet = CLOSE_SNIPPET;
  protected readonly overflowSnippet = OVERFLOW_SNIPPET;
  protected readonly reorderSnippet = REORDER_SNIPPET;
  protected readonly positionSnippet = POSITION_SNIPPET;
  protected readonly alignmentSnippet = ALIGNMENT_SNIPPET;

  protected readonly alignments: readonly OgeTabsAlignment[] = [
    'start',
    'center',
    'end',
    'justify',
    'stretch',
  ];
  protected readonly alignment = signal<OgeTabsAlignment>('start');
  protected readonly fitIndicator = signal(false);
  protected readonly alignmentIndex = signal(0);

  protected readonly animationSnippet = ANIMATION_SNIPPET;
  protected readonly animations: readonly OgeTabPanelAnimation[] = [
    'none',
    'fade',
    'slide',
  ];
  protected readonly panelAnimation = signal<OgeTabPanelAnimation>('slide');
  protected readonly dynamicHeight = signal(true);
  protected readonly animationIndex = signal(0);
  protected readonly tallLines = [
    'Tab panels can differ a lot in height.',
    'Without dynamicHeight the page jumps as you switch.',
    'With it, the content box animates between the two heights.',
    'The transition honours prefers-reduced-motion.',
    'And async content is picked up by a ResizeObserver.',
  ];

  protected readonly basicIndex = signal(0);
  protected readonly lastChange = signal<OgeTabSelectionChangedEvent | null>(
    null,
  );

  protected readonly docs: OgeTabItem[] = [
    { key: 'readme', text: 'README.md' },
    { key: 'spec', text: 'spec.ts', badge: 3 },
    { key: 'draft', text: 'draft.md', dirty: true },
  ];
  protected readonly activeDoc = signal<string | undefined>('readme');

  protected readonly keepAlive = signal(true);

  protected readonly guardNotice = signal('');
  private guardArmedUntil = 0;
  protected readonly files = signal<OgeTabItem[]>(this.buildFiles());

  protected readonly manyTabs: OgeTabItem[] = Array.from(
    { length: 14 },
    (_, i) => ({
      key: `ch${i + 1}`,
      text: `Chapter ${i + 1}`,
      disabled: i === 5,
    }),
  );
  protected readonly overflowIndex = signal(0);

  protected readonly stages: OgeTabItem[] = [
    { key: 'todo', text: 'To do' },
    { key: 'doing', text: 'In progress' },
    { key: 'review', text: 'Review' },
    { key: 'done', text: 'Done' },
  ];

  protected toggleKeepAlive(): void {
    this.keepAlive.update((value) => !value);
  }

  protected setAlignment(event: Event): void {
    this.alignment.set(
      (event.target as HTMLSelectElement).value as OgeTabsAlignment,
    );
  }

  protected toggleIndicator(): void {
    this.fitIndicator.update((value) => !value);
  }

  protected setAnimation(event: Event): void {
    this.panelAnimation.set(
      (event.target as HTMLSelectElement).value as OgeTabPanelAnimation,
    );
  }

  protected toggleDynamicHeight(): void {
    this.dynamicHeight.update((value) => !value);
  }

  protected removeFile(event: OgeTabClosedEvent): void {
    this.files.set(this.files().filter((file) => file.key !== event.key));
    this.guardNotice.set('');
  }

  protected resetFiles(): void {
    this.files.set(this.buildFiles());
    this.guardNotice.set('');
  }

  private buildFiles(): OgeTabItem[] {
    return [
      { key: 'a.ts', text: 'a.ts' },
      {
        key: 'b.ts',
        text: 'b.ts (guarded)',
        dirty: true,
        closeGuard: () => this.confirmDiscard(),
      },
      { key: 'c.ts', text: 'c.ts' },
    ];
  }

  /** First attempt arms a 3s window; a second attempt inside it allows. */
  private confirmDiscard(): Promise<boolean> {
    const now = Date.now();
    if (now < this.guardArmedUntil) {
      this.guardArmedUntil = 0;
      return Promise.resolve(true);
    }
    this.guardArmedUntil = now + 3000;
    return new Promise((resolve) =>
      setTimeout(() => {
        this.guardNotice.set(
          'closeGuard vetoed — close again within 3s to discard changes',
        );
        resolve(false);
      }, 600),
    );
  }
}
