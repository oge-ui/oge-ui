import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  OgeTimeline,
  OgeTimelineContentTemplate,
  OgeTimelineMarkerTemplate,
  type OgeTimelineAlign,
} from '@oge-ui/layout/timeline';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_LAYOUT_TIMELINE_SECTIONS,
  ReactLayoutTimelineDemos,
} from '../react-layout/timeline';
import {
  ALIGN_SNIPPET,
  HORIZONTAL_SNIPPET,
  MARKERS_SNIPPET,
  TEMPLATES_SNIPPET,
  VERTICAL_SNIPPET,
} from './timeline-snippets';
import {
  TIMELINE_DEPLOYS,
  TIMELINE_ORDER,
  TIMELINE_RELEASES,
  TIMELINE_STEPS,
} from './timeline-demo-data';

const SECTIONS = [
  'Vertical timeline',
  'Alignment & alternating',
  'Horizontal timeline',
  'Markers, icons & severities',
  'Custom templates',
] as const;

@Component({
  selector: 'app-layout-timeline',
  imports: [
    OgeTimeline,
    OgeTimelineContentTemplate,
    OgeTimelineMarkerTemplate,
    DemoCard,
    DocHeader,
    PageToc,
    ReactLayoutTimelineDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Timeline"
      category="Layout"
      categoryLink="/components/timeline"
      [chips]="[
        'ordered list',
        'alternating',
        'horizontal',
        'templates',
        'RTL',
      ]"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeTimeline&gt;</code> from
          <code>&#64;oge-ui/react-layout</code> draws a chronological sequence
          along an axis — an order history, an activity feed, release notes —
          with the same markup and stylesheet as the Angular component.
        </p>
      } @else {
        <p>
          <code>oge-timeline</code> draws a chronological sequence along an axis
          — an order history, an activity feed, release notes.
        </p>
      }
      <p>
        It renders an <strong>ordered list</strong>: the order is the meaning,
        and a list announces its size and each position. There is no APG
        timeline pattern and nothing in it is interactive by itself, so it adds
        no roles and no keyboard model — links inside an entry stay in the Tab
        order, and the marker and connector are <code>aria-hidden</code>.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-layout-timeline-demos />
    } @else {
      <app-demo-card
        [chips]="['items', 'time', 'ariaLabel']"
        heading="Vertical timeline"
        description="The default: content on the end side of a vertical axis. A <code>Date</code> time is formatted in the app locale (medium date + short time, or <code>dateFormat</code>) and written into <code>&amp;lt;time datetime&amp;gt;</code> from its local fields; a string time is shown verbatim."
        [code]="verticalSnippet"
        language="ts"
      >
        <oge-timeline [items]="order" ariaLabel="Order history" />
      </app-demo-card>

      <app-demo-card
        [chips]="['align', 'alternate', 'opposite']"
        heading="Alignment & alternating"
        description="<code>start</code> / <code>end</code> keep one side (logical, so RTL mirrors); <code>alternate</code> swaps per entry starting at the end side, <code>alternate-reverse</code> at the start side, and each entry's time — or its <code>opposite</code> text — moves to the other side of the axis."
        [code]="alignSnippet"
        language="ts"
      >
        <label class="mb-3 flex items-center gap-2 text-sm">
          Align
          <select
            class="rounded border px-2 py-1"
            (change)="align.set($any($event.target).value)"
          >
            <option value="end">end</option>
            <option value="start">start</option>
            <option value="alternate" selected>alternate</option>
            <option value="alternate-reverse">alternate-reverse</option>
          </select>
        </label>
        <oge-timeline
          [items]="order"
          [align]="align()"
          ariaLabel="Order history, aligned"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['orientation: horizontal', 'scrolls inline']"
        heading="Horizontal timeline"
        description="The entries share a row with the connector between the markers; alternating puts the opposite text above and the content below. When the row does not fit, the list scrolls inline instead of widening the page."
        [code]="horizontalSnippet"
        language="ts"
      >
        <oge-timeline
          orientation="horizontal"
          align="alternate"
          [items]="releases"
          ariaLabel="Release history"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['severity', 'variant', 'icon']"
        heading="Markers, icons & severities"
        description="<code>severity</code> colours the marker with the suite vocabulary, <code>variant: 'outlined'</code> draws a ring for pending or future entries, and <code>icon</code> (SVG path data) draws a larger marker with the glyph inside. Markers are decoration — the text carries the meaning, so forced colours lose nothing."
        [code]="markersSnippet"
        language="ts"
      >
        <oge-timeline [items]="deploys" ariaLabel="Deployments" />
      </app-demo-card>

      <app-demo-card
        [chips]="['ogeTimelineContentTemplate', 'ogeTimelineMarkerTemplate']"
        heading="Custom templates"
        description="Structural slot directives replace the content, the marker or the opposite text per entry, with the item, its index, its side and first/last flags in the context. Content is ordinary flow content: the link stays in the Tab order."
        [code]="templatesSnippet"
        language="ts"
      >
        <oge-timeline [items]="steps" ariaLabel="Onboarding">
          <ng-template ogeTimelineMarkerTemplate let-index="index">
            <span class="demo-timeline-step">{{ index + 1 }}</span>
          </ng-template>
          <ng-template ogeTimelineContentTemplate let-item>
            <strong>{{ item.title }}</strong>
            <span class="text-sm">{{ item.description }}</span>
            <a class="text-sm underline" href="#custom-templates">Learn more</a>
          </ng-template>
        </oge-timeline>
      </app-demo-card>
    }
  `,
  styles: `
    .demo-timeline-step {
      display: inline-grid;
      place-items: center;
      inline-size: 24px;
      block-size: 24px;
      border-radius: 999px;
      background: var(--oge-accent);
      color: var(--oge-severity-contrast);
      font-size: 12px;
      font-weight: 600;
    }
  `,
})
export class LayoutTimelinePage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_LAYOUT_TIMELINE_SECTIONS;
  protected readonly verticalSnippet = VERTICAL_SNIPPET;
  protected readonly alignSnippet = ALIGN_SNIPPET;
  protected readonly horizontalSnippet = HORIZONTAL_SNIPPET;
  protected readonly markersSnippet = MARKERS_SNIPPET;
  protected readonly templatesSnippet = TEMPLATES_SNIPPET;

  protected readonly align = signal<OgeTimelineAlign>('alternate');
  protected readonly order = TIMELINE_ORDER;
  protected readonly releases = TIMELINE_RELEASES;
  protected readonly deploys = TIMELINE_DEPLOYS;
  protected readonly steps = TIMELINE_STEPS;
}
