import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  OgeSplitter,
  OgeSplitterPane,
  OgeSplitterPaneTemplate,
  type OgeSplitterOrientation,
  type OgeSplitterPaneCollapsedEvent,
  type OgeSplitterPaneData,
  type OgeSplitterResizeEvent,
  type OgeSplitterSize,
} from '@oge-ui/layout';
import { OgeForm, type OgeFormItemData } from '@oge-ui/forms';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  BASIC_SNIPPET,
  COLLAPSE_SNIPPET,
  CONFIG_SNIPPET,
  EVENTS_SNIPPET,
  FIXED_SNIPPET,
  FORM_SNIPPET,
  KEYBOARD_SNIPPET,
  NESTED_SNIPPET,
  ORIENTATION_SNIPPET,
  PANES_SNIPPET,
  PERSIST_SNIPPET,
} from './splitter-snippets';

const SECTIONS = [
  'Resizable panes',
  'Orientation',
  'Fixed and fluid panes',
  'Collapsible panes',
  'Data-driven panes',
  'Nested splitters',
  'Forms inside a pane',
  'Keyboard & accessibility',
  'Events',
  'Persisting sizes',
  'Configuration',
] as const;

@Component({
  selector: 'app-layout-splitter',
  imports: [
    OgeSplitter,
    OgeSplitterPane,
    OgeSplitterPaneTemplate,
    OgeForm,
    DemoCard,
    DocHeader,
    PageToc,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Splitter"
      category="Layout"
      categoryLink="/components/splitter"
      [chips]="['APG window splitter', 'signals', 'CSS grid', 'RTL', 'touch']"
    >
      <p>
        <code>&lt;oge-splitter&gt;</code> divides an area into resizable panes
        that come from projected
        <code>&lt;oge-splitter-pane&gt;</code> children, from a data-driven
        <code>panes</code> array, or both. Sizes are <strong>ratios</strong>,
        not percentages, so a configuration that does not add up to 100 is never
        an error — and a <code>'240px'</code> size pins a pane instead.
      </p>
      <p>
        Layout is a single CSS grid in which the separators are real tracks, so
        panes mirror automatically in RTL and no pane needs an inline width.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-demo-card
      [chips]="['[(sizes)]', 'minSize', 'ratios']"
      heading="Resizable panes"
      description="Drag the separator, or Tab to it and use the arrow keys. <code>sizes</code> is a two-way model reporting the current ratios — the only state you need to keep."
      [code]="basicSnippet"
      language="ts"
    >
      <oge-splitter class="demo-splitter" [(sizes)]="basicSizes">
        <oge-splitter-pane key="list" [minSize]="15">
          <div class="demo-pane">Result list</div>
        </oge-splitter-pane>
        <oge-splitter-pane key="detail" [minSize]="25">
          <div class="demo-pane">Detail view</div>
        </oge-splitter-pane>
      </oge-splitter>
      <p class="mt-2 text-sm opacity-70">sizes → {{ format(basicSizes()) }}</p>
    </app-demo-card>

    <app-demo-card
      [chips]="['orientation']"
      heading="Orientation"
      description="<code>horizontal</code> lays the panes out side by side, <code>vertical</code> stacks them. The keyboard follows the axis: Left/Right against a horizontal splitter, Up/Down against a vertical one."
      [code]="orientationSnippet"
      language="ts"
    >
      <div class="mb-3 flex gap-2">
        @for (option of orientations; track option) {
          <button
            type="button"
            class="rounded border px-2 py-1 text-sm"
            [class.font-semibold]="orientation() === option"
            (click)="orientation.set(option)"
          >
            {{ option }}
          </button>
        }
      </div>
      <oge-splitter class="demo-splitter" [orientation]="orientation()">
        <oge-splitter-pane>
          <div class="demo-pane">Top / left</div>
        </oge-splitter-pane>
        <oge-splitter-pane>
          <div class="demo-pane">Bottom / right</div>
        </oge-splitter-pane>
      </oge-splitter>
    </app-demo-card>

    <app-demo-card
      [chips]="['size', 'minSize', 'maxSize', 'px vs ratio']"
      heading="Fixed and fluid panes"
      description="A <code>'240px'</code> size becomes a fixed grid track and leaves the share pool; dragging it moves real pixels. <code>minSize</code> and <code>maxSize</code> accept either unit, so a pixel floor on a ratio pane is fine."
      [code]="fixedSnippet"
      language="ts"
    >
      <oge-splitter class="demo-splitter">
        <oge-splitter-pane size="240px" minSize="160px" maxSize="420px">
          <div class="demo-pane">Fixed sidebar (240px)</div>
        </oge-splitter-pane>
        <oge-splitter-pane [minSize]="20">
          <div class="demo-pane">Fluid content</div>
        </oge-splitter-pane>
      </oge-splitter>
    </app-demo-card>

    <app-demo-card
      [chips]="['collapsible', '[(collapsed)]', 'collapsedSize', 'inert']"
      heading="Collapsible panes"
      description="A separator grows one grip per collapsible neighbour, so either side can be collapsed. Enter targets the pane before it (the APG primary pane) and <code>Ctrl</code>+Arrow reaches both. The pane returns at the size it left, and while collapsed it stays in the DOM as <code>inert</code> so <code>aria-controls</code> keeps pointing at a real element."
      [code]="collapseSnippet"
      language="ts"
    >
      <oge-splitter class="demo-splitter" (paneCollapsed)="onCollapsed($event)">
        <oge-splitter-pane
          key="side"
          [size]="30"
          [collapsible]="true"
          collapsedSize="28px"
          [(collapsed)]="sideCollapsed"
        >
          <div class="demo-pane">Navigation</div>
        </oge-splitter-pane>
        <oge-splitter-pane key="main">
          <div class="demo-pane">Editor</div>
        </oge-splitter-pane>
      </oge-splitter>
      <p class="mt-2 text-sm opacity-70">
        collapsed → {{ sideCollapsed() }}
        @if (lastCollapsed(); as event) {
          · paneCollapsed → {{ event.key }}
        }
      </p>
    </app-demo-card>

    <app-demo-card
      [chips]="['[panes]', '[ogeSplitterPaneTemplate]']"
      heading="Data-driven panes"
      description="Bind <code>panes</code> and render the bodies from one template. Declarative children and <code>panes</code> entries can be mixed — children come first, the same merge rule as the tabs and accordion families."
      [code]="panesSnippet"
      language="ts"
    >
      <oge-splitter class="demo-splitter" [panes]="areas">
        <ng-template ogeSplitterPaneTemplate let-pane let-index="index">
          <div class="demo-pane">{{ index }} — {{ pane.key }}</div>
        </ng-template>
      </oge-splitter>
    </app-demo-card>

    <app-demo-card
      [chips]="['nesting', 'recursion']"
      heading="Nested splitters"
      description="A splitter inside a pane just works — no second component and no wrapper. A data-driven pane nests by carrying its own <code>panes</code>, which defaults to the opposite axis."
      [code]="nestedSnippet"
      language="ts"
    >
      <oge-splitter class="demo-splitter">
        <oge-splitter-pane size="200px" [collapsible]="true">
          <div class="demo-pane">Sidebar</div>
        </oge-splitter-pane>
        <oge-splitter-pane>
          <oge-splitter orientation="vertical">
            <oge-splitter-pane [size]="70">
              <div class="demo-pane">Editor</div>
            </oge-splitter-pane>
            <oge-splitter-pane [size]="30" [collapsible]="true">
              <div class="demo-pane">Terminal</div>
            </oge-splitter-pane>
          </oge-splitter>
        </oge-splitter-pane>
      </oge-splitter>
    </app-demo-card>

    <app-demo-card
      [chips]="['&#64;container', 'oge-form']"
      heading="Forms inside a pane"
      description="A pane is a plain block box and never a query container, so an <code>&amp;lt;oge-form&amp;gt;</code> inside one keeps resolving its <code>&#64;container</code> queries against itself. Drag the separator: the column count follows the <em>pane</em> width while the window stays put."
      [code]="formSnippet"
      language="ts"
    >
      <oge-splitter class="demo-splitter demo-splitter-tall">
        <oge-splitter-pane [size]="78">
          <div class="p-3">
            <oge-form
              [(formData)]="server"
              [items]="serverFields"
              [colCountByScreen]="{ xs: 1, sm: 2, md: 3 }"
            />
          </div>
        </oge-splitter-pane>
        <oge-splitter-pane [size]="22">
          <div class="demo-pane">Preview</div>
        </oge-splitter-pane>
      </oge-splitter>
    </app-demo-card>

    <app-demo-card
      [chips]="['role=separator', 'aria-valuenow', 'step', 'Home/End/Enter']"
      heading="Keyboard & accessibility"
      description="Tab to a separator, then Arrow keys to move it by <code>step</code>, Home and End for the primary pane's smallest and largest size, and Enter to collapse or restore it. <code>Ctrl</code>+Arrow reaches <em>either</em> neighbour — the keyboard path to the second grip. Values are reported on one 0–100 scale via <code>aria-valuenow</code>."
      [code]="keyboardSnippet"
      language="ts"
    >
      <oge-splitter
        class="demo-splitter"
        [step]="10"
        ariaLabel="Editor layout"
        (resized)="lastResize.set($event)"
      >
        <oge-splitter-pane [minSize]="20" [maxSize]="70" [collapsible]="true">
          <div class="demo-pane">Primary</div>
        </oge-splitter-pane>
        <oge-splitter-pane [minSize]="20" [collapsible]="true">
          <div class="demo-pane">Secondary</div>
        </oge-splitter-pane>
      </oge-splitter>
      @if (lastResize(); as event) {
        <p class="mt-2 text-sm opacity-70">
          resized → separator {{ event.separatorIndex }},
          {{ format(event.sizes) }}
        </p>
      }
    </app-demo-card>

    <app-demo-card
      [chips]="['resizeStarted', 'resized', 'resizeEnded', 'paneCollapsing']"
      heading="Events"
      description="<code>resizeStarted</code> fires once, <code>resized</code> on every change and <code>resizeEnded</code> once the gesture settles — the same trio the references expose. <code>paneCollapsing</code> and <code>paneExpanding</code> are cancelable."
      [code]="eventsSnippet"
      language="ts"
    >
      <label class="mb-3 flex items-center gap-2 text-sm">
        <input type="checkbox" [checked]="locked()" (change)="toggleLock()" />
        veto collapsing (paneCollapsing.cancel = true)
      </label>
      <oge-splitter
        class="demo-splitter"
        (paneCollapsing)="$event.cancel = locked()"
      >
        <oge-splitter-pane key="a" [collapsible]="true">
          <div class="demo-pane">A — try Enter on the separator</div>
        </oge-splitter-pane>
        <oge-splitter-pane key="b">
          <div class="demo-pane">B</div>
        </oge-splitter-pane>
      </oge-splitter>
    </app-demo-card>

    <app-demo-card
      [chips]="['[(sizes)]', 'persistence']"
      heading="Persisting sizes"
      description="<code>sizes</code> is the whole persistable state — a plain array of numbers and <code>'&amp;lt;n&amp;gt;px'</code> strings. There is no <code>stateKey</code> to learn and no storage token to provide: save it to localStorage, an API or a route param in a few lines."
      [code]="persistSnippet"
      language="ts"
    >
      <oge-splitter class="demo-splitter" [(sizes)]="persistedSizes">
        <oge-splitter-pane>
          <div class="demo-pane">Left</div>
        </oge-splitter-pane>
        <oge-splitter-pane>
          <div class="demo-pane">Right</div>
        </oge-splitter-pane>
      </oge-splitter>
      <p class="mt-2 text-sm opacity-70">
        persist this → {{ format(persistedSizes()) }}
      </p>
    </app-demo-card>

    <app-demo-card
      heading="Configuration"
      description="<code>provideOgeSplitterConfig()</code> sets application-wide defaults and every user-facing string, including the separators' accessible names. A per-instance <code>[messages]</code> input overrides it."
      [code]="configSnippet"
      language="ts"
    />
  `,
  styles: `
    .demo-splitter {
      block-size: 220px;
      border: 1px solid var(--oge-border-color);
      border-radius: var(--oge-radius);
    }
    .demo-splitter-tall {
      block-size: 280px;
    }
    .demo-pane {
      padding: 12px;
      font-size: 0.875rem;
    }
  `,
})
export class LayoutSplitterPage {
  protected readonly sections = SECTIONS;
  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly orientationSnippet = ORIENTATION_SNIPPET;
  protected readonly fixedSnippet = FIXED_SNIPPET;
  protected readonly collapseSnippet = COLLAPSE_SNIPPET;
  protected readonly panesSnippet = PANES_SNIPPET;
  protected readonly nestedSnippet = NESTED_SNIPPET;
  protected readonly formSnippet = FORM_SNIPPET;
  protected readonly keyboardSnippet = KEYBOARD_SNIPPET;
  protected readonly eventsSnippet = EVENTS_SNIPPET;
  protected readonly persistSnippet = PERSIST_SNIPPET;
  protected readonly configSnippet = CONFIG_SNIPPET;

  protected readonly orientations: readonly OgeSplitterOrientation[] = [
    'horizontal',
    'vertical',
  ];

  protected readonly basicSizes = signal<readonly OgeSplitterSize[]>([35, 65]);
  protected readonly orientation = signal<OgeSplitterOrientation>('vertical');
  protected readonly sideCollapsed = signal(false);
  protected readonly lastCollapsed =
    signal<OgeSplitterPaneCollapsedEvent | null>(null);
  protected readonly lastResize = signal<OgeSplitterResizeEvent | null>(null);
  protected readonly locked = signal(true);
  protected readonly persistedSizes = signal<readonly OgeSplitterSize[]>([
    30, 70,
  ]);

  protected readonly server = signal({
    host: 'db.internal',
    port: 5432,
    user: 'app',
  });

  protected readonly serverFields: OgeFormItemData[] = [
    { field: 'host', label: 'Host' },
    { field: 'port', label: 'Port' },
    { field: 'user', label: 'User' },
  ];

  protected readonly areas: OgeSplitterPaneData[] = [
    { key: 'explorer', size: 25, minSize: 15, collapsible: true },
    { key: 'editor', size: 50 },
    { key: 'inspector', size: 25, minSize: 15 },
  ];

  protected format(sizes: readonly OgeSplitterSize[]): string {
    return `[${sizes.join(', ')}]`;
  }

  protected onCollapsed(event: OgeSplitterPaneCollapsedEvent): void {
    this.lastCollapsed.set(event);
  }

  protected toggleLock(): void {
    this.locked.set(!this.locked());
  }
}
