import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  createElement,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  OgeLoadIndicator,
  OgeProgressBar,
  OgeSkeleton,
} from '@oge-ui/react-layout';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { LAYOUT_PROGRESS_DEMOS } from './progress-snippets';

/**
 * TOC of the React view — the same six sections as the Angular progress page
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_LAYOUT_PROGRESS_SECTIONS = [
  'Determinate bar',
  'Indeterminate & buffer',
  'Chunks & severity',
  'Load indicator',
  'Skeleton',
  'A real async flow',
] as const;

const row = (...children: ReactNode[]) =>
  createElement('div', { className: 'demo-row demo-row-start' }, ...children);

const asMegabytes = (value: number): string => `${value} MB`;

/** The determinate bars driven by one slider — real state, real React. */
function DeterminateDemo(): ReactNode {
  const [uploaded, setUploaded] = useState(80);
  return createElement(
    'div',
    null,
    createElement(OgeProgressBar, {
      key: 'percent',
      value: uploaded,
      showLabel: true,
    }),
    createElement(
      'div',
      { key: 'mb', className: 'mt-3' },
      createElement(OgeProgressBar, {
        value: uploaded,
        max: 200,
        showLabel: true,
        formatLabel: asMegabytes,
        ariaLabel: 'Upload',
      }),
    ),
    createElement(
      'label',
      { key: 'range', className: 'mt-3 flex items-center gap-2 text-sm' },
      'Value',
      createElement('input', {
        type: 'range',
        min: 0,
        max: 200,
        value: uploaded,
        onChange: (event: { target: { value: string } }) =>
          setUploaded(Number(event.target.value)),
      }),
    ),
  );
}

/** Indeterminate until the size is known, then determinate, then completed. */
function AsyncFlowDemo(): ReactNode {
  const [total, setTotal] = useState<number | null>(null);
  const [received, setReceived] = useState(0);
  const [done, setDone] = useState(false);
  const discovery = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (discovery.current !== null) clearTimeout(discovery.current);
    if (ticker.current !== null) clearInterval(ticker.current);
    discovery.current = null;
    ticker.current = null;
  };

  // Timers never outlive the component — the React counterpart of the Angular
  // page's DestroyRef cleanup.
  useEffect(() => stop, []);
  useEffect(() => {
    if (received >= 100) stop();
  }, [received]);

  const start = () => {
    stop();
    setTotal(null);
    setReceived(0);
    setDone(false);
    discovery.current = setTimeout(() => {
      setTotal(100); // "size discovered"
      ticker.current = setInterval(
        () => setReceived((current) => Math.min(current + 9, 100)),
        250,
      );
    }, 900);
  };

  return createElement(
    'div',
    null,
    total === null
      ? createElement(OgeProgressBar, { key: 'unknown', ariaLabel: 'Download' })
      : createElement(OgeProgressBar, {
          key: 'known',
          value: received,
          max: total,
          showLabel: true,
          ariaLabel: 'Download',
          onCompleted: () => setDone(true),
        }),
    createElement(
      'p',
      { key: 'controls', className: 'mt-3 text-sm' },
      createElement(
        'button',
        {
          type: 'button',
          className: 'rounded border px-2 py-1',
          onClick: start,
        },
        'Start download',
      ),
      done
        ? createElement(
            'span',
            { className: 'ml-2', 'data-testid': 'download-done' },
            'completed ✓',
          )
        : null,
    ),
  );
}

/**
 * The React half of the progress & loading page — the same six demo sections
 * as the Angular page, with the same example content, rendered as real React
 * trees inside `/components/progress` when the reader has chosen React
 * (ADR 0002).
 */
@Component({
  selector: 'app-react-layout-progress-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React loading trio carries the class names but no styles of its own —
  // the docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/layout/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['value', 'showLabel', 'formatLabel']"
      heading="Determinate bar"
      description="Transform-driven fill (no layout work per frame, mirrors in RTL), value changes glide on a token transition. <code>formatLabel</code> replaces the percent label <strong>and</strong> feeds <code>aria-valuetext</code> — display and announcement never diverge."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="determinate" />
    </app-demo-card>

    <app-demo-card
      [chips]="['value: null', 'bufferValue', 'no aria-valuenow']"
      heading="Indeterminate & buffer"
      description="<code>value: null</code> (the default) renders the sliding bar and omits <code>aria-valuenow</code> — the ARIA rule for the unknown state. <code>bufferValue</code> adds the second layer Material uses for media pre-loading."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="indeterminate" />
    </app-demo-card>

    <app-demo-card
      [chips]="['chunkCount', 'severity']"
      heading="Chunks & severity"
      description="<code>chunkCount</code> renders the segmented variant for step-based flows; <code>severity</code> recolors the fill with the card/toast vocabulary."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="chunks" />
    </app-demo-card>

    <app-demo-card
      [chips]="['size', 'inheritSize', 'slows, never stops']"
      heading="Load indicator"
      description="The suite's canonical ring — deliberately indeterminate-only: a circle filling toward completion is the progress bar's job. Under <code>prefers-reduced-motion</code> the spin slows rather than stops, because a frozen ring reads as finished."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="loadIndicator" />
    </app-demo-card>

    <app-demo-card
      [chips]="['shape', 'animation', 'aria-hidden']"
      heading="Skeleton"
      description="Always <code>aria-hidden</code> decoration — the loading <strong>region</strong> owns the announcement: put <code>aria-busy</code> (plus a visually-hidden status text where the change should be announced) on the container. <code>shimmer</code> is the card/accordion gradient; <code>pulse</code> is the data grid's beat."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="skeleton" />
    </app-demo-card>

    <app-demo-card
      [chips]="['indeterminate → determinate', 'onCompleted']"
      heading="A real async flow"
      description="Indeterminate while the total is unknown, determinate once it is, and a one-shot <code>onCompleted</code> at the end — fired once per arrival at <code>max</code>, again only after a reset."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="asyncFlow" />
    </app-demo-card>
  `,
})
export class ReactLayoutProgressDemos {
  protected readonly demos = LAYOUT_PROGRESS_DEMOS;

  protected readonly determinate = () => createElement(DeterminateDemo);
  protected readonly asyncFlow = () => createElement(AsyncFlowDemo);

  protected readonly indeterminate = () =>
    createElement(
      'div',
      null,
      createElement(OgeProgressBar, { key: 'a', ariaLabel: 'Preparing' }),
      createElement(
        'div',
        { key: 'b', className: 'mt-3' },
        createElement(OgeProgressBar, {
          value: 35,
          bufferValue: 70,
          ariaLabel: 'Playback',
        }),
      ),
    );

  protected readonly chunks = () =>
    createElement(
      'div',
      null,
      createElement(OgeProgressBar, {
        key: 'steps',
        value: 60,
        chunkCount: 5,
        ariaLabel: 'Steps',
      }),
      createElement(
        'div',
        { key: 'sync', className: 'mt-3' },
        createElement(OgeProgressBar, {
          value: 92,
          severity: 'success',
          showLabel: true,
          ariaLabel: 'Sync',
        }),
      ),
      createElement(
        'div',
        { key: 'disk', className: 'mt-3' },
        createElement(OgeProgressBar, {
          value: 45,
          severity: 'danger',
          showLabel: true,
          ariaLabel: 'Disk',
        }),
      ),
    );

  protected readonly loadIndicator = () =>
    row(
      createElement(OgeLoadIndicator, { key: 'sm', size: 'sm' }),
      createElement(OgeLoadIndicator, { key: 'md' }),
      createElement(OgeLoadIndicator, {
        key: 'lg',
        size: 'lg',
        ariaLabel: 'Loading report',
      }),
      createElement(OgeLoadIndicator, { key: 'ok', severity: 'success' }),
      createElement(
        'button',
        {
          key: 'btn',
          type: 'button',
          className:
            'inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm',
          disabled: true,
        },
        createElement(OgeLoadIndicator, { key: 'ring', inheritSize: true }),
        ' Saving…',
      ),
    );

  protected readonly skeleton = () =>
    createElement(
      'div',
      null,
      createElement(
        'div',
        { key: 'row', 'aria-busy': true, className: 'demo-row demo-row-start' },
        createElement(OgeSkeleton, {
          key: 'avatar',
          shape: 'circle',
          width: 40,
          height: 40,
        }),
        createElement(
          'div',
          { key: 'lines', style: { flex: 1 } },
          createElement(OgeSkeleton, { key: 'wide', width: '60%' }),
          createElement(OgeSkeleton, {
            key: 'narrow',
            className: 'mt-2 block',
            width: '40%',
            animation: 'pulse',
          }),
        ),
      ),
      createElement(OgeSkeleton, {
        key: 'block',
        className: 'mt-3 block',
        shape: 'rectangle',
        height: '72px',
      }),
      // The card/accordion placeholder pattern as one prop.
      createElement(OgeSkeleton, {
        key: 'multi',
        className: 'mt-3 block',
        lines: 3,
      }),
    );
}
