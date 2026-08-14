import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { OgeLoadIndicator, OgeProgressBar, OgeSkeleton } from '@oge-ui/layout';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_LAYOUT_PROGRESS_SECTIONS,
  ReactLayoutProgressDemos,
} from '../react-layout/progress';
import {
  ASYNC_SNIPPET,
  CHUNK_SNIPPET,
  DETERMINATE_SNIPPET,
  INDETERMINATE_SNIPPET,
  LOAD_INDICATOR_SNIPPET,
  SKELETON_SNIPPET,
} from './progress-snippets';

const SECTIONS = [
  'Determinate bar',
  'Indeterminate & buffer',
  'Chunks & severity',
  'Load indicator',
  'Skeleton',
  'A real async flow',
] as const;

@Component({
  selector: 'app-layout-progress',
  imports: [
    DemoCard,
    DocHeader,
    PageToc,
    OgeProgressBar,
    OgeLoadIndicator,
    OgeSkeleton,
    ReactLayoutProgressDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Progress & Loading"
      category="Layout"
      [chips]="['role=progressbar', 'indeterminate', 'skeleton', 'severity']"
    >
      @if (fw.isReact()) {
        <p>
          Three canonical loading visuals from
          <code>&#64;oge-ui/react-layout</code> — the linear
          <code>&lt;OgeProgressBar&gt;</code>, the ring
          <code>&lt;OgeLoadIndicator&gt;</code> and the
          <code>&lt;OgeSkeleton&gt;</code> placeholder — rendering the same
          markup and loading the same stylesheet as the Angular trio. All
          announce as <code>role="progressbar"</code> with the ARIA rule most
          libraries miss:
          <strong>indeterminate omits <code>aria-valuenow</code></strong>
          entirely rather than pinning a sentinel.
        </p>
      } @else {
        <p>
          Three canonical loading visuals — the linear
          <code>oge-progress-bar</code>, the ring
          <code>oge-load-indicator</code> and the
          <code>oge-skeleton</code> placeholder — replacing the hand-drawn
          spinners and shimmers every OGE surface carried before. All announce
          as <code>role="progressbar"</code> with the ARIA rule most libraries
          miss:
          <strong>indeterminate omits <code>aria-valuenow</code></strong>
          entirely rather than pinning a sentinel.
        </p>
      }
      <p>
        <strong>Not a meter:</strong> the APG is explicit that a current
        measurement within a known range — battery, disk usage — is
        <code>role="meter"</code>, and "the meter should not be used to indicate
        progress… use the progressbar role instead". The inverse holds too.
        (Where a native <code>&amp;lt;progress&amp;gt;</code>
        suffices, MDN recommends it over the role — these components exist for
        the styled, token-driven cases.)
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-layout-progress-demos />
    } @else {
      <app-demo-card
        [chips]="['value', 'showLabel', 'formatLabel']"
        heading="Determinate bar"
        description="Transform-driven fill (no layout work per frame, mirrors in RTL), value changes glide on a token transition. <code>formatLabel</code> replaces the percent label <strong>and</strong> feeds <code>aria-valuetext</code> — display and announcement never diverge."
        [code]="determinateSnippet"
        language="ts"
      >
        <oge-progress-bar [value]="uploaded()" [showLabel]="true" />
        <div class="mt-3">
          <oge-progress-bar
            [value]="uploaded()"
            [max]="200"
            [showLabel]="true"
            [formatLabel]="asMegabytes"
            ariaLabel="Upload"
          />
        </div>
        <label class="mt-3 flex items-center gap-2 text-sm">
          Value
          <input
            type="range"
            min="0"
            max="200"
            [value]="uploaded()"
            (input)="uploaded.set(+$any($event.target).value)"
          />
        </label>
      </app-demo-card>

      <app-demo-card
        [chips]="['value: null', 'bufferValue', 'no aria-valuenow']"
        heading="Indeterminate & buffer"
        description="<code>value: null</code> (the default) renders the sliding bar and omits <code>aria-valuenow</code> — the ARIA rule for the unknown state. <code>bufferValue</code> adds the second layer Material uses for media pre-loading."
        [code]="indeterminateSnippet"
        language="ts"
      >
        <oge-progress-bar ariaLabel="Preparing" />
        <div class="mt-3">
          <oge-progress-bar
            [value]="35"
            [bufferValue]="70"
            ariaLabel="Playback"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['chunkCount', 'severity']"
        heading="Chunks & severity"
        description="<code>chunkCount</code> renders the segmented variant for step-based flows; <code>severity</code> recolors the fill with the card/toast vocabulary."
        [code]="chunkSnippet"
        language="ts"
      >
        <oge-progress-bar [value]="60" [chunkCount]="5" ariaLabel="Steps" />
        <div class="mt-3">
          <oge-progress-bar
            [value]="92"
            severity="success"
            [showLabel]="true"
            ariaLabel="Sync"
          />
        </div>
        <div class="mt-3">
          <oge-progress-bar
            [value]="45"
            severity="danger"
            [showLabel]="true"
            ariaLabel="Disk"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['size', 'inheritSize', 'slows, never stops']"
        heading="Load indicator"
        description="The suite's canonical ring — deliberately indeterminate-only: a circle filling toward completion is the progress bar's job. Under <code>prefers-reduced-motion</code> the spin slows rather than stops, because a frozen ring reads as finished."
        [code]="loadIndicatorSnippet"
        language="ts"
      >
        <div class="flex items-center gap-6">
          <oge-load-indicator size="sm" />
          <oge-load-indicator />
          <oge-load-indicator size="lg" ariaLabel="Loading report" />
          <oge-load-indicator severity="success" />
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm"
            disabled
          >
            <oge-load-indicator [inheritSize]="true" /> Saving…
          </button>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['shape', 'animation', 'aria-hidden']"
        heading="Skeleton"
        description="Always <code>aria-hidden</code> decoration — the loading <strong>region</strong> owns the announcement: put <code>aria-busy</code> (plus a visually-hidden status text where the change should be announced) on the container. <code>shimmer</code> is the card/accordion gradient; <code>pulse</code> is the data grid's beat."
        [code]="skeletonSnippet"
        language="ts"
      >
        <div aria-busy="true" class="flex items-center gap-3">
          <oge-skeleton shape="circle" [width]="40" [height]="40" />
          <div class="flex-1">
            <oge-skeleton [width]="'60%'" />
            <oge-skeleton
              class="mt-2 block"
              [width]="'40%'"
              animation="pulse"
            />
          </div>
        </div>
        <oge-skeleton class="mt-3 block" shape="rectangle" height="72px" />
        <!-- The card/accordion placeholder pattern as one input. -->
        <oge-skeleton class="mt-3 block" [lines]="3" />
      </app-demo-card>

      <app-demo-card
        [chips]="['indeterminate → determinate', 'completed']"
        heading="A real async flow"
        description="Indeterminate while the total is unknown, determinate once it is, and a one-shot <code>completed</code> at the end — fired once per arrival at <code>max</code>, again only after a reset."
        [code]="asyncSnippet"
        language="ts"
      >
        @if (total() === null) {
          <oge-progress-bar ariaLabel="Download" />
        } @else {
          <oge-progress-bar
            [value]="received()"
            [max]="total()!"
            [showLabel]="true"
            ariaLabel="Download"
            (completed)="downloadDone.set(true)"
          />
        }
        <p class="mt-3 text-sm">
          <button
            type="button"
            class="rounded border px-2 py-1"
            (click)="startDownload()"
          >
            Start download
          </button>
          @if (downloadDone()) {
            <span class="ml-2" data-testid="download-done">completed ✓</span>
          }
        </p>
      </app-demo-card>
    }
  `,
})
export class LayoutProgressPage {
  private readonly destroyRef = inject(DestroyRef);

  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_LAYOUT_PROGRESS_SECTIONS;
  protected readonly determinateSnippet = DETERMINATE_SNIPPET;
  protected readonly indeterminateSnippet = INDETERMINATE_SNIPPET;
  protected readonly chunkSnippet = CHUNK_SNIPPET;
  protected readonly loadIndicatorSnippet = LOAD_INDICATOR_SNIPPET;
  protected readonly skeletonSnippet = SKELETON_SNIPPET;
  protected readonly asyncSnippet = ASYNC_SNIPPET;

  protected readonly uploaded = signal(80);
  protected readonly total = signal<number | null>(null);
  protected readonly received = signal(0);
  protected readonly downloadDone = signal(false);
  private downloadTimer: ReturnType<typeof setInterval> | null = null;

  protected readonly asMegabytes = (value: number): string => `${value} MB`;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.downloadTimer !== null) clearInterval(this.downloadTimer);
    });
  }

  protected startDownload(): void {
    if (this.downloadTimer !== null) clearInterval(this.downloadTimer);
    this.total.set(null);
    this.received.set(0);
    this.downloadDone.set(false);
    setTimeout(() => this.total.set(100), 900); // "size discovered"
    this.downloadTimer = setInterval(() => {
      if (this.total() === null) return;
      const next = Math.min(this.received() + 9, 100);
      this.received.set(next);
      if (next >= 100 && this.downloadTimer !== null) {
        clearInterval(this.downloadTimer);
        this.downloadTimer = null;
      }
    }, 250);
  }
}
