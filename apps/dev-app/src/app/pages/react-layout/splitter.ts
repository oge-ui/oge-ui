import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  createElement,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { OgeNumberBox, OgeTextBox } from '@oge-ui/react-inputs';
import {
  OgeSplitter,
  type OgeSplitterOrientation,
  type OgeSplitterPaneCollapsedEvent,
  type OgeSplitterPaneCollapsingEvent,
  type OgeSplitterPaneItem,
  type OgeSplitterResizeEvent,
  type OgeSplitterSize,
} from '@oge-ui/react-layout';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { LAYOUT_SPLITTER_DEMOS } from './splitter-snippets';

/**
 * TOC of the React view — the same eleven sections as the Angular splitter page
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_LAYOUT_SPLITTER_SECTIONS = [
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

/**
 * The splitter fills its container and has no intrinsic height, so every demo
 * host gets an explicit one — exactly what the Angular page's `.demo-splitter`
 * class does on the other side of the switch.
 */
const frame = (blockSize = 220): CSSProperties => ({
  blockSize,
  border: '1px solid var(--oge-border-color)',
  borderRadius: 'var(--oge-radius)',
});

/** The pane body chrome of the Angular page's `.demo-pane`. */
const paneStyle: CSSProperties = { padding: 12, fontSize: '0.875rem' };

const pane = (text: string): ReactNode =>
  createElement('div', { style: paneStyle }, text);

const note = (text: string): ReactNode =>
  createElement('p', { className: 'mt-2 text-sm opacity-70' }, text);

const ORIENTATIONS: readonly OgeSplitterOrientation[] = [
  'horizontal',
  'vertical',
];

const format = (sizes: readonly OgeSplitterSize[]): string =>
  `[${sizes.join(', ')}]`;

/** Controlled `sizes` — the React face of Angular's `[(sizes)]` model. */
function SplitterDemo(): ReactNode {
  const [sizes, setSizes] = useState<readonly OgeSplitterSize[]>([35, 65]);
  return createElement(
    'div',
    null,
    createElement(OgeSplitter, {
      key: 'splitter',
      sizes,
      onSizesChange: setSizes,
      style: frame(),
      panes: [
        { key: 'list', minSize: 15, content: pane('Result list') },
        { key: 'detail', minSize: 25, content: pane('Detail view') },
      ],
    }),
    note(`sizes → ${format(sizes)}`),
  );
}

function SplitterOrientationDemo(): ReactNode {
  const [orientation, setOrientation] =
    useState<OgeSplitterOrientation>('vertical');
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { key: 'switch', className: 'mb-3 flex gap-2' },
      ORIENTATIONS.map((option) =>
        createElement(
          'button',
          {
            key: option,
            type: 'button',
            className: `rounded border px-2 py-1 text-sm${
              orientation === option ? ' font-semibold' : ''
            }`,
            onClick: () => setOrientation(option),
          },
          option,
        ),
      ),
    ),
    createElement(OgeSplitter, {
      key: 'splitter',
      orientation,
      style: frame(),
      panes: [
        { content: pane('Top / left') },
        { content: pane('Bottom / right') },
      ],
    }),
  );
}

function SplitterCollapseDemo(): ReactNode {
  const [collapsed, setCollapsed] = useState(false);
  const [lastCollapsed, setLastCollapsed] =
    useState<OgeSplitterPaneCollapsedEvent | null>(null);
  return createElement(
    'div',
    null,
    createElement(OgeSplitter, {
      key: 'splitter',
      style: frame(),
      onPaneCollapsed: (event: OgeSplitterPaneCollapsedEvent) => {
        setCollapsed(true);
        setLastCollapsed(event);
      },
      onPaneExpanded: () => setCollapsed(false),
      panes: [
        {
          key: 'side',
          size: 30,
          collapsible: true,
          collapsedSize: '28px',
          collapsed,
          content: pane('Navigation'),
        },
        { key: 'main', content: pane('Editor') },
      ],
    }),
    note(
      `collapsed → ${collapsed}${
        lastCollapsed ? ` · onPaneCollapsed → ${lastCollapsed.key}` : ''
      }`,
    ),
  );
}

const AREAS: readonly OgeSplitterPaneItem[] = [
  { key: 'explorer', size: 25, minSize: 15, collapsible: true },
  { key: 'editor', size: 50 },
  { key: 'inspector', size: 25, minSize: 15 },
];

function SplitterFormDemo(): ReactNode {
  const [server, setServer] = useState({
    host: 'db.internal',
    port: 5432 as number | null,
    user: 'app',
  });
  return createElement(OgeSplitter, {
    style: frame(280),
    panes: [
      {
        size: 78,
        content: createElement(
          'div',
          { className: 'demo-row', style: { padding: 12 } },
          createElement(OgeTextBox, {
            key: 'host',
            label: 'Host',
            value: server.host,
            onValueChange: (host: string) =>
              setServer((current) => ({ ...current, host })),
          }),
          createElement(OgeNumberBox, {
            key: 'port',
            label: 'Port',
            value: server.port,
            onValueChange: (port: number | null) =>
              setServer((current) => ({ ...current, port })),
          }),
          createElement(OgeTextBox, {
            key: 'user',
            label: 'User',
            value: server.user,
            onValueChange: (user: string) =>
              setServer((current) => ({ ...current, user })),
          }),
        ),
      },
      { size: 22, content: pane('Preview') },
    ],
  });
}

function SplitterKeyboardDemo(): ReactNode {
  const [lastResize, setLastResize] = useState<OgeSplitterResizeEvent | null>(
    null,
  );
  return createElement(
    'div',
    null,
    createElement(OgeSplitter, {
      key: 'splitter',
      step: 10,
      ariaLabel: 'Editor layout',
      style: frame(),
      onResized: setLastResize,
      panes: [
        {
          minSize: 20,
          maxSize: 70,
          collapsible: true,
          content: pane('Primary'),
        },
        { minSize: 20, collapsible: true, content: pane('Secondary') },
      ],
    }),
    lastResize
      ? note(
          `onResized → separator ${lastResize.separatorIndex}, ${format(
            lastResize.sizes,
          )}`,
        )
      : null,
  );
}

function SplitterEventsDemo(): ReactNode {
  const [locked, setLocked] = useState(true);
  return createElement(
    'div',
    null,
    createElement(
      'label',
      { key: 'lock', className: 'mb-3 flex items-center gap-2 text-sm' },
      createElement('input', {
        type: 'checkbox',
        checked: locked,
        onChange: (event: ChangeEvent<HTMLInputElement>) =>
          setLocked(event.target.checked),
      }),
      'veto collapsing (onPaneCollapsing: event.cancel = true)',
    ),
    createElement(OgeSplitter, {
      key: 'splitter',
      style: frame(),
      onPaneCollapsing: (event: OgeSplitterPaneCollapsingEvent) => {
        event.cancel = locked;
      },
      panes: [
        {
          key: 'a',
          collapsible: true,
          content: pane('A — try Enter on the separator'),
        },
        { key: 'b', content: pane('B') },
      ],
    }),
  );
}

function SplitterPersistDemo(): ReactNode {
  const [sizes, setSizes] = useState<readonly OgeSplitterSize[]>([30, 70]);
  return createElement(
    'div',
    null,
    createElement(OgeSplitter, {
      key: 'splitter',
      sizes,
      onSizesChange: setSizes,
      style: frame(),
      panes: [{ content: pane('Left') }, { content: pane('Right') }],
    }),
    note(`persist this → ${format(sizes)}`),
  );
}

/**
 * The React half of the splitter page — the same eleven demo sections as the
 * Angular page, with the same example content, rendered as real React trees
 * inside `/components/splitter` when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-layout-splitter-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React splitter carries the class names but no styles of its own —
  // the docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/layout/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['sizes + onSizesChange', 'minSize', 'ratios']"
      heading="Resizable panes"
      description="Drag the separator, or Tab to it and use the arrow keys. <code>sizes</code> is the controlled half of the pair — pass it with <code>onSizesChange</code> and it is the only state you need to keep."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basic" />
    </app-demo-card>

    <app-demo-card
      [chips]="['orientation']"
      heading="Orientation"
      description="<code>horizontal</code> lays the panes out side by side, <code>vertical</code> stacks them. The keyboard follows the axis: Left/Right against a horizontal splitter, Up/Down against a vertical one."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="orientation" />
    </app-demo-card>

    <app-demo-card
      [chips]="['size', 'minSize', 'maxSize', 'px vs ratio']"
      heading="Fixed and fluid panes"
      description="A <code>'240px'</code> size becomes a fixed grid track and leaves the share pool; dragging it moves real pixels. <code>minSize</code> and <code>maxSize</code> accept either unit, so a pixel floor on a ratio pane is fine."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="fixed" />
    </app-demo-card>

    <app-demo-card
      [chips]="['collapsible', 'collapsed', 'collapsedSize', 'inert']"
      heading="Collapsible panes"
      description="A separator grows one grip per collapsible neighbour, so either side can be collapsed. Enter targets the pane before it (the APG primary pane) and <code>Ctrl</code>+Arrow reaches both. A pane's <code>collapsed</code> field is the React face of the Angular <code>[(collapsed)]</code> model — write it to drive the pane and follow its own collapses through <code>onPaneCollapsed</code> / <code>onPaneExpanded</code>. The pane returns at the size it left, and while collapsed it stays in the DOM as <code>inert</code> so <code>aria-controls</code> keeps pointing at a real element."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="collapse" />
    </app-demo-card>

    <app-demo-card
      [chips]="['panes', 'renderPane']"
      heading="Data-driven panes"
      description="Pass the panes as data and render their bodies from one <code>renderPane</code> render prop — the React face of <code>[ogeSplitterPaneTemplate]</code>. An entry that carries its own <code>content</code> overrides it, so the two styles mix freely."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="panes" />
    </app-demo-card>

    <app-demo-card
      [chips]="['nesting', 'recursion']"
      heading="Nested splitters"
      description="A splitter inside a pane just works — no second component and no wrapper. A pane nests either by rendering an <code>&lt;OgeSplitter&gt;</code> as its <code>content</code>, or by carrying its own <code>panes</code> array, which defaults to the opposite axis."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="nested" />
    </app-demo-card>

    <app-demo-card
      [chips]="['&#64;container', 'controlled editors']"
      heading="Forms inside a pane"
      description="A pane is a plain block box and never a query container, so a form inside one keeps resolving its <code>&#64;container</code> queries against itself. Drag the separator: the layout follows the <em>pane</em> width while the window stays put. <code>&#64;oge-ui/forms</code> has no React layer yet (a recorded exception in <code>docs/REACT-PARITY.md</code>), so this mirror binds <code>&#64;oge-ui/react-inputs</code> editors to plain state — the honest React idiom, and how any React form library would bind them."
      [code]="demos[6].source"
      language="tsx"
    >
      <app-react-host [render]="form" />
    </app-demo-card>

    <app-demo-card
      [chips]="['role=separator', 'aria-valuenow', 'step', 'Home/End/Enter']"
      heading="Keyboard & accessibility"
      description="Tab to a separator, then Arrow keys to move it by <code>step</code>, Home and End for the primary pane's smallest and largest size, and Enter to collapse or restore it. <code>Ctrl</code>+Arrow reaches <em>either</em> neighbour — the keyboard path to the second grip. Values are reported on one 0–100 scale via <code>aria-valuenow</code>."
      [code]="demos[7].source"
      language="tsx"
    >
      <app-react-host [render]="keyboard" />
    </app-demo-card>

    <app-demo-card
      [chips]="[
        'onResizeStarted',
        'onResized',
        'onResizeEnded',
        'onPaneCollapsing',
      ]"
      heading="Events"
      description="<code>onResizeStarted</code> fires once, <code>onResized</code> on every change and <code>onResizeEnded</code> once the gesture settles — the same trio the references expose. <code>onPaneCollapsing</code> and <code>onPaneExpanding</code> are cancelable."
      [code]="demos[8].source"
      language="tsx"
    >
      <app-react-host [render]="events" />
    </app-demo-card>

    <app-demo-card
      [chips]="['sizes + onSizesChange', 'persistence']"
      heading="Persisting sizes"
      description="<code>sizes</code> is the whole persistable state — a plain array of numbers and <code>'&amp;lt;n&amp;gt;px'</code> strings. There is no <code>stateKey</code> to learn and no storage context to provide: save it to localStorage, an API or a route param in a few lines."
      [code]="demos[9].source"
      language="tsx"
    >
      <app-react-host [render]="persist" />
    </app-demo-card>

    <app-demo-card
      heading="Configuration"
      description="<code>&lt;OgeSplitterConfigProvider&gt;</code> sets the defaults and every user-facing string for its subtree, including the separators' accessible names — the React counterpart of <code>provideOgeSplitterConfig()</code>. A per-instance <code>messages</code> prop overrides it."
      [code]="demos[10].source"
      language="tsx"
    />
  `,
})
export class ReactLayoutSplitterDemos {
  protected readonly demos = LAYOUT_SPLITTER_DEMOS;

  protected readonly basic = () => createElement(SplitterDemo);
  protected readonly orientation = () => createElement(SplitterOrientationDemo);
  protected readonly collapse = () => createElement(SplitterCollapseDemo);
  protected readonly form = () => createElement(SplitterFormDemo);
  protected readonly keyboard = () => createElement(SplitterKeyboardDemo);
  protected readonly events = () => createElement(SplitterEventsDemo);
  protected readonly persist = () => createElement(SplitterPersistDemo);

  protected readonly fixed = () =>
    createElement(OgeSplitter, {
      style: frame(),
      panes: [
        {
          size: '240px',
          minSize: '160px',
          maxSize: '420px',
          content: pane('Fixed sidebar (240px)'),
        },
        { minSize: 20, content: pane('Fluid content') },
      ],
    });

  protected readonly panes = () =>
    createElement(OgeSplitter, {
      panes: AREAS,
      style: frame(),
      renderPane: (item: OgeSplitterPaneItem, index: number) =>
        createElement('div', { style: paneStyle }, `${index} — ${item.key}`),
    });

  protected readonly nested = () =>
    createElement(OgeSplitter, {
      style: frame(),
      panes: [
        { size: '200px', collapsible: true, content: pane('Sidebar') },
        {
          content: createElement(OgeSplitter, {
            orientation: 'vertical',
            style: { blockSize: '100%' },
            panes: [
              { size: 70, content: pane('Editor') },
              { size: 30, collapsible: true, content: pane('Terminal') },
            ],
          }),
        },
      ],
    });
}
