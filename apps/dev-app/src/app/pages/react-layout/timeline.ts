import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgeTimeline, type OgeTimelineAlign } from '@oge-ui/react-layout';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  TIMELINE_DEPLOYS,
  TIMELINE_ORDER,
  TIMELINE_RELEASES,
  TIMELINE_STEPS,
} from '../layout/timeline-demo-data';
import { LAYOUT_TIMELINE_DEMOS } from './timeline-snippets';

/**
 * TOC of the React view — the same five sections as the Angular timeline
 * page (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_LAYOUT_TIMELINE_SECTIONS = [
  'Vertical timeline',
  'Alignment & alternating',
  'Horizontal timeline',
  'Markers, icons & severities',
  'Custom templates',
] as const;

const ALIGNS: readonly OgeTimelineAlign[] = [
  'end',
  'start',
  'alternate',
  'alternate-reverse',
];

/** The align switcher — real state, real React. */
function AlignDemo(): ReactNode {
  const [align, setAlign] = useState<OgeTimelineAlign>('alternate');
  return createElement(
    'div',
    null,
    createElement(
      'label',
      { key: 'label', className: 'mb-3 flex items-center gap-2 text-sm' },
      'Align',
      createElement(
        'select',
        {
          className: 'rounded border px-2 py-1',
          value: align,
          onChange: (event: { target: { value: string } }) =>
            setAlign(event.target.value as OgeTimelineAlign),
        },
        ...ALIGNS.map((value) =>
          createElement('option', { key: value, value }, value),
        ),
      ),
    ),
    createElement(OgeTimeline, {
      key: 'timeline',
      items: TIMELINE_ORDER,
      align,
      ariaLabel: 'Order history, aligned',
    }),
  );
}

/**
 * The React half of the timeline page — rendered inside
 * `/components/timeline` when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-layout-timeline-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // the React timeline carries the class names but no styles of its own —
  // the docs pull the same SCSS the package build compiles
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../shared/react-layout-demo-base.scss',
  template: `
    <app-demo-card
      [chips]="['items', 'time', 'ariaLabel']"
      heading="Vertical timeline"
      description="The default: content on the end side of a vertical axis. A <code>Date</code> time is formatted in the runtime locale (medium date + short time, or <code>dateFormat</code>) and written into <code>&amp;lt;time dateTime&amp;gt;</code> from its local fields; a string time is shown verbatim."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="vertical" />
    </app-demo-card>

    <app-demo-card
      [chips]="['align', 'alternate', 'opposite']"
      heading="Alignment & alternating"
      description="<code>start</code> / <code>end</code> keep one side (logical, so RTL mirrors); <code>alternate</code> swaps per entry starting at the end side, <code>alternate-reverse</code> at the start side, and each entry's time — or its <code>opposite</code> text — moves to the other side of the axis."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="alignDemo" />
    </app-demo-card>

    <app-demo-card
      [chips]="['orientation: horizontal', 'scrolls inline']"
      heading="Horizontal timeline"
      description="The entries share a row with the connector between the markers; alternating puts the opposite text above and the content below. When the row does not fit, the list scrolls inline instead of widening the page."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="horizontal" />
    </app-demo-card>

    <app-demo-card
      [chips]="['severity', 'variant', 'icon']"
      heading="Markers, icons & severities"
      description="<code>severity</code> colours the marker with the suite vocabulary, <code>variant: 'outlined'</code> draws a ring for pending or future entries, and <code>icon</code> (SVG path data) draws a larger marker with the glyph inside. Markers are decoration — the text carries the meaning, so forced colours lose nothing."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="markers" />
    </app-demo-card>

    <app-demo-card
      [chips]="['renderContent', 'renderMarker']"
      heading="Custom templates"
      description="Render props replace the content, the marker or the opposite text per entry, with the item, its index, its side and first/last flags in the context. Content is ordinary flow content: the link stays in the Tab order."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="templates" />
    </app-demo-card>
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
export class ReactLayoutTimelineDemos {
  protected readonly demos = LAYOUT_TIMELINE_DEMOS;

  protected readonly vertical = () =>
    createElement(OgeTimeline, {
      items: TIMELINE_ORDER,
      ariaLabel: 'Order history',
    });

  protected readonly alignDemo = () => createElement(AlignDemo);

  protected readonly horizontal = () =>
    createElement(OgeTimeline, {
      orientation: 'horizontal',
      align: 'alternate',
      items: TIMELINE_RELEASES,
      ariaLabel: 'Release history',
    });

  protected readonly markers = () =>
    createElement(OgeTimeline, {
      items: TIMELINE_DEPLOYS,
      ariaLabel: 'Deployments',
    });

  protected readonly templates = () =>
    createElement(OgeTimeline, {
      items: TIMELINE_STEPS,
      ariaLabel: 'Onboarding',
      renderMarker: ({ index }) =>
        createElement('span', { className: 'demo-timeline-step' }, index + 1),
      renderContent: ({ item }) =>
        createElement(
          'span',
          { className: 'contents' },
          createElement('strong', { key: 't' }, item.title),
          createElement(
            'span',
            { key: 'd', className: 'text-sm' },
            item.description,
          ),
          createElement(
            'a',
            {
              key: 'l',
              className: 'text-sm underline',
              href: '#custom-templates',
            },
            'Learn more',
          ),
        ),
    });
}
