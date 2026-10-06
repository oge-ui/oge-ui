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
import { OgeLoadPanel } from '@oge-ui/react-layout';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { LAYOUT_LOAD_PANEL_DEMOS } from './load-panel-snippets';

/**
 * TOC of the React view — the same four sections as the Angular load panel
 * page (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_LAYOUT_LOAD_PANEL_SECTIONS = [
  'Covering a container',
  'Delay & minimum time',
  'Target & full screen',
  'Appearance',
] as const;

const BOX = 'rounded border p-3';
const BUTTON = 'rounded border px-2 py-1 text-sm';

/** setTimeout that never outlives the demo. */
function useTimers(): (fn: () => void, ms: number) => void {
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const live = timers.current;
    return () => live.forEach((timer) => clearTimeout(timer));
  }, []);
  return (fn, ms) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      fn();
    }, ms);
    timers.current.add(timer);
  };
}

function ContainerDemo(): ReactNode {
  const [loading, setLoading] = useState(false);
  const [clicks, setClicks] = useState(0);
  const later = useTimers();
  return createElement(
    'div',
    null,
    createElement(
      'section',
      {
        key: 'box',
        className: BOX,
        style: { minHeight: 140 },
        'data-testid': 'load-panel-target',
      },
      createElement(OgeLoadPanel, { key: 'panel', visible: loading }),
      createElement(
        'h3',
        { key: 'h', className: 'mb-2 font-semibold' },
        'Orders',
      ),
      createElement(
        'p',
        { key: 'clicks', className: 'mb-3 text-sm' },
        `Clicks while loading: ${clicks}`,
      ),
      createElement(
        'div',
        { key: 'buttons', className: 'flex gap-2' },
        createElement(
          'button',
          {
            key: 'reload',
            type: 'button',
            className: BUTTON,
            'data-testid': 'load-panel-reload',
            onClick: () => {
              setLoading(true);
              later(() => setLoading(false), 2000);
            },
          },
          'Reload (2 s)',
        ),
        createElement(
          'button',
          {
            key: 'inside',
            type: 'button',
            className: BUTTON,
            'data-testid': 'load-panel-inside',
            onClick: () => setClicks((n) => n + 1),
          },
          'Click me',
        ),
      ),
    ),
    createElement(
      'button',
      {
        key: 'toggle',
        type: 'button',
        className: `mt-3 ${BUTTON}`,
        'data-testid': 'load-panel-toggle',
        onClick: () => setLoading(!loading),
      },
      loading ? 'Hide panel' : 'Show panel',
    ),
  );
}

function TimingDemo(): ReactNode {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const later = useTimers();
  const load = (ms: number) => {
    setEvents([]);
    setLoading(true);
    later(() => setLoading(false), ms);
  };
  return createElement(
    'section',
    { className: BOX, style: { minHeight: 120 } },
    createElement(OgeLoadPanel, {
      key: 'panel',
      visible: loading,
      showDelay: 300,
      minDisplayTime: 800,
      onShown: () => setEvents((e) => [...e, 'shown']),
      onHidden: () => setEvents((e) => [...e, 'hidden']),
    }),
    createElement(
      'div',
      { key: 'buttons', className: 'flex gap-2' },
      createElement(
        'button',
        {
          key: 'fast',
          type: 'button',
          className: BUTTON,
          onClick: () => load(100),
        },
        'Fast load (100 ms)',
      ),
      createElement(
        'button',
        {
          key: 'slow',
          type: 'button',
          className: BUTTON,
          onClick: () => load(1500),
        },
        'Slow load (1.5 s)',
      ),
    ),
    createElement(
      'p',
      {
        key: 'log',
        className: 'mt-3 text-sm',
        'data-testid': 'load-panel-timing-log',
      },
      `Events: ${events.join(' ') || 'none'}`,
    ),
  );
}

function TargetDemo(): ReactNode {
  const chart = useRef<HTMLDivElement | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const later = useTimers();
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { key: 'chart', ref: chart, className: BOX, style: { minHeight: 100 } },
      createElement(
        'p',
        { className: 'text-sm' },
        "Chart area (the panel's target)",
      ),
    ),
    createElement(OgeLoadPanel, {
      key: 'chart-panel',
      target: chart,
      visible: chartLoading,
      message: 'Rendering chart…',
    }),
    createElement(OgeLoadPanel, {
      key: 'save-panel',
      fullScreen: true,
      visible: saving,
      message: 'Saving the report…',
    }),
    createElement(
      'div',
      { key: 'buttons', className: 'mt-3 flex gap-2' },
      createElement(
        'button',
        {
          key: 'render',
          type: 'button',
          className: BUTTON,
          onClick: () => {
            setChartLoading(true);
            later(() => setChartLoading(false), 1500);
          },
        },
        'Render chart (1.5 s)',
      ),
      createElement(
        'button',
        {
          key: 'save',
          type: 'button',
          className: BUTTON,
          'data-testid': 'load-panel-full-screen',
          onClick: () => {
            setSaving(true);
            later(() => setSaving(false), 1200);
          },
        },
        'Save report (full screen, 1.2 s)',
      ),
    ),
  );
}

/**
 * The React half of the load panel page — the same four demo sections as the
 * Angular page, with the same example content, rendered as real React trees
 * inside `/components/progress/load-panel` when the reader has chosen React
 * (ADR 0002).
 */
@Component({
  selector: 'app-react-layout-load-panel-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React panel carries the class names but no styles of its own — the
  // docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../shared/react-layout-demo-base.scss',
  template: `
    <app-demo-card
      [chips]="['visible', 'aria-busy', 'pointer blocked']"
      heading="Covering a container"
      description="Placed inside a container, the panel covers that parent (a statically positioned parent is made <code>position: relative</code> while shown). The parent is <code>aria-busy</code> for exactly as long as the panel is up, the message is announced through the shared live region, and clicks on the shade never reach the buttons underneath."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="container" />
    </app-demo-card>

    <app-demo-card
      [chips]="['showDelay', 'minDisplayTime', 'onShown', 'onHidden']"
      heading="Delay & minimum time"
      description="<code>showDelay</code> (300 ms here) keeps a fast load from flashing a panel at all; <code>minDisplayTime</code> (800 ms) keeps a panel that did appear on screen long enough to read. <code>onShown</code> and <code>onHidden</code> report what actually painted — the fast load fires neither."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="timing" />
    </app-demo-card>

    <app-demo-card
      [chips]="['target', 'fullScreen', 'message']"
      heading="Target & full screen"
      description="<code>target</code> takes an element, a ref or a selector anywhere on the page — the panel is portalled into it while shown. <code>fullScreen</code> covers the viewport (fixed, above everything); without a <code>target</code> it marks nothing busy, because <code>aria-busy</code> on the body would also mute the live region its own message goes to."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="target" />
    </app-demo-card>

    <app-demo-card
      [chips]="['showPane', 'shading', 'position', 'showIndicator']"
      heading="Appearance"
      description="<code>showPane: false</code> drops the raised card, <code>shading: false</code> the dim layer, and <code>position</code> moves the pane to the top or bottom. Without the indicator the message itself is the readable text. The default message is the localized <code>loadPanelMessage</code> of the load-indicator config."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="appearance" />
    </app-demo-card>
  `,
})
export class ReactLayoutLoadPanelDemos {
  protected readonly demos = LAYOUT_LOAD_PANEL_DEMOS;

  protected readonly container = () => createElement(ContainerDemo);
  protected readonly timing = () => createElement(TimingDemo);
  protected readonly target = () => createElement(TargetDemo);

  protected readonly appearance = () =>
    createElement(
      'div',
      { className: 'grid gap-3 sm:grid-cols-2' },
      createElement(
        'section',
        { key: 'plain', className: BOX, style: { minHeight: 120 } },
        createElement(OgeLoadPanel, {
          key: 'panel',
          visible: true,
          showPane: false,
          shading: false,
          position: 'top',
          message: 'Refreshing…',
        }),
        createElement(
          'p',
          { key: 'text', className: 'mt-10 text-sm' },
          'Plain, unshaded, top',
        ),
      ),
      createElement(
        'section',
        { key: 'message', className: BOX, style: { minHeight: 120 } },
        createElement(OgeLoadPanel, {
          key: 'panel',
          visible: true,
          showIndicator: false,
          message: 'Waiting for the server…',
        }),
        createElement(
          'p',
          { key: 'text', className: 'text-sm' },
          'Message only',
        ),
      ),
    );
}
