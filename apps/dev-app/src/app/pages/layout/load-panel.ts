import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { OgeLoadPanel } from '@oge-ui/layout';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_LAYOUT_LOAD_PANEL_SECTIONS,
  ReactLayoutLoadPanelDemos,
} from '../react-layout/load-panel';
import {
  APPEARANCE_SNIPPET,
  CONTAINER_SNIPPET,
  TARGET_SNIPPET,
  TIMING_SNIPPET,
} from './load-panel-snippets';

const SECTIONS = [
  'Covering a container',
  'Delay & minimum time',
  'Target & full screen',
  'Appearance',
] as const;

@Component({
  selector: 'app-layout-load-panel',
  imports: [
    DemoCard,
    DocHeader,
    PageToc,
    OgeLoadPanel,
    ReactLayoutLoadPanelDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Load Panel"
      category="Layout"
      categoryLink="/components/progress"
      [chips]="['aria-busy', 'showDelay', 'minDisplayTime', 'live announcer']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeLoadPanel&gt;</code> from
          <code>&#64;oge-ui/react-layout</code> — DevExtreme's LoadPanel: a
          shade over a container (or the viewport) with the suite's load
          indicator and a message, rendering the same markup and stylesheet as
          the Angular panel.
        </p>
      } @else {
        <p>
          <code>oge-load-panel</code> — DevExtreme's LoadPanel: a shade over a
          container (or the viewport) with the suite's load indicator and a
          message, shown while <code>visible</code> is true.
        </p>
      }
      <p>
        While shown, the covered container is <code>aria-busy="true"</code> (and
        gets its previous value back after), the message is announced once
        through the shared live announcer, and pointer input is swallowed by the
        shade. The panel never takes or traps focus and does not make the
        container <code>inert</code> — that would blur a focused field and drop
        focus to the page.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-layout-load-panel-demos />
    } @else {
      <app-demo-card
        [chips]="['visible', 'aria-busy', 'pointer blocked']"
        heading="Covering a container"
        description="Placed inside a container, the panel covers that parent (a statically positioned parent is made <code>position: relative</code> while shown). The parent is <code>aria-busy</code> for exactly as long as the panel is up, the message is announced through the shared live region, and clicks on the shade never reach the buttons underneath."
        [code]="containerSnippet"
        language="ts"
      >
        <section
          class="rounded border p-3"
          data-testid="load-panel-target"
          style="min-height: 140px"
        >
          <oge-load-panel [visible]="containerLoading()" />
          <h3 class="mb-2 font-semibold">Orders</h3>
          <p class="mb-3 text-sm">
            Clicks while loading: {{ blockedClicks() }}
          </p>
          <div class="flex gap-2">
            <button
              type="button"
              class="rounded border px-2 py-1 text-sm"
              data-testid="load-panel-reload"
              (click)="reload()"
            >
              Reload (2 s)
            </button>
            <button
              type="button"
              class="rounded border px-2 py-1 text-sm"
              data-testid="load-panel-inside"
              (click)="blockedClicks.set(blockedClicks() + 1)"
            >
              Click me
            </button>
          </div>
        </section>
        <button
          type="button"
          class="mt-3 rounded border px-2 py-1 text-sm"
          data-testid="load-panel-toggle"
          (click)="containerLoading.set(!containerLoading())"
        >
          {{ containerLoading() ? 'Hide panel' : 'Show panel' }}
        </button>
      </app-demo-card>

      <app-demo-card
        [chips]="['showDelay', 'minDisplayTime', 'shown', 'hidden']"
        heading="Delay & minimum time"
        description="<code>showDelay</code> (300 ms here) keeps a fast load from flashing a panel at all; <code>minDisplayTime</code> (800 ms) keeps a panel that did appear on screen long enough to read. <code>shown</code> and <code>hidden</code> report what actually painted — the fast load fires neither."
        [code]="timingSnippet"
        language="ts"
      >
        <section class="rounded border p-3" style="min-height: 120px">
          <oge-load-panel
            [visible]="timedLoading()"
            [showDelay]="300"
            [minDisplayTime]="800"
            (shown)="timingLog.set(timingLog() + ' shown')"
            (hidden)="timingLog.set(timingLog() + ' hidden')"
          />
          <div class="flex gap-2">
            <button
              type="button"
              class="rounded border px-2 py-1 text-sm"
              (click)="load(100)"
            >
              Fast load (100 ms)
            </button>
            <button
              type="button"
              class="rounded border px-2 py-1 text-sm"
              (click)="load(1500)"
            >
              Slow load (1.5 s)
            </button>
          </div>
          <p class="mt-3 text-sm" data-testid="load-panel-timing-log">
            Events:{{ timingLog() || ' none' }}
          </p>
        </section>
      </app-demo-card>

      <app-demo-card
        [chips]="['target', 'fullScreen', 'message']"
        heading="Target & full screen"
        description="<code>target</code> takes an element or a selector anywhere on the page — the panel moves into it while shown. <code>fullScreen</code> covers the viewport (fixed, above everything); without a <code>target</code> it marks nothing busy, because <code>aria-busy</code> on the body would also mute the live region its own message goes to."
        [code]="targetSnippet"
        language="ts"
      >
        <div
          id="load-panel-chart"
          class="rounded border p-3"
          style="min-height: 100px"
        >
          <p class="text-sm">Chart area (the panel's target)</p>
        </div>
        <oge-load-panel
          target="#load-panel-chart"
          [visible]="chartLoading()"
          message="Rendering chart…"
        />
        <oge-load-panel
          [fullScreen]="true"
          [visible]="saving()"
          message="Saving the report…"
        />
        <div class="mt-3 flex gap-2">
          <button
            type="button"
            class="rounded border px-2 py-1 text-sm"
            (click)="flash(chartLoading, 1500)"
          >
            Render chart (1.5 s)
          </button>
          <button
            type="button"
            class="rounded border px-2 py-1 text-sm"
            data-testid="load-panel-full-screen"
            (click)="flash(saving, 1200)"
          >
            Save report (full screen, 1.2 s)
          </button>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['showPane', 'shading', 'position', 'showIndicator']"
        heading="Appearance"
        description="<code>showPane: false</code> drops the raised card, <code>shading: false</code> the dim layer, and <code>position</code> moves the pane to the top or bottom. Without the indicator the message itself is the readable text. The default message is the localized <code>loadPanelMessage</code> of the load-indicator config."
        [code]="appearanceSnippet"
        language="ts"
      >
        <div class="grid gap-3 sm:grid-cols-2">
          <section class="rounded border p-3" style="min-height: 120px">
            <oge-load-panel
              [visible]="true"
              [showPane]="false"
              [shading]="false"
              position="top"
              message="Refreshing…"
            />
            <p class="mt-10 text-sm">Plain, unshaded, top</p>
          </section>
          <section class="rounded border p-3" style="min-height: 120px">
            <oge-load-panel
              [visible]="true"
              [showIndicator]="false"
              message="Waiting for the server…"
            />
            <p class="text-sm">Message only</p>
          </section>
        </div>
      </app-demo-card>
    }
  `,
})
export class LayoutLoadPanelPage {
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_LAYOUT_LOAD_PANEL_SECTIONS;
  protected readonly containerSnippet = CONTAINER_SNIPPET;
  protected readonly timingSnippet = TIMING_SNIPPET;
  protected readonly targetSnippet = TARGET_SNIPPET;
  protected readonly appearanceSnippet = APPEARANCE_SNIPPET;

  protected readonly containerLoading = signal(false);
  protected readonly blockedClicks = signal(0);
  protected readonly timedLoading = signal(false);
  protected readonly timingLog = signal('');
  protected readonly chartLoading = signal(false);
  protected readonly saving = signal(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      for (const timer of this.timers) clearTimeout(timer);
    });
  }

  protected reload(): void {
    this.flash(this.containerLoading, 2000);
  }

  protected load(ms: number): void {
    this.timingLog.set('');
    this.flash(this.timedLoading, ms);
  }

  protected flash(state: { set(value: boolean): void }, ms: number): void {
    state.set(true);
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      state.set(false);
    }, ms);
    this.timers.add(timer);
  }
}
