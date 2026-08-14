import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  createElement,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import {
  OgeTabPanel,
  OgeTabs,
  type OgeTabItem,
  type OgeTabPanelAnimation,
  type OgeTabSelectionChangedEvent,
  type OgeTabsAlignment,
} from '@oge-ui/react-tabs';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { TABS_OVERVIEW_DEMOS } from './overview-snippets';

/**
 * TOC of the React view — the same nine sections as the Angular overview
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_TABS_OVERVIEW_SECTIONS = [
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

const p = (...children: ReactNode[]) => createElement('p', null, ...children);

const note = (text: ReactNode) =>
  createElement('p', { className: 'mt-2 text-sm opacity-70' }, text);

/** Stamps its creation time — makes lazy/keep-alive behavior visible. */
function CreatedAt(): ReactNode {
  const [createdAt] = useState(() => new Date().toLocaleTimeString());
  return createElement(
    'span',
    { className: 'text-sm opacity-70' },
    `created at ${createdAt}`,
  );
}

/** Controlled selection plus the cancelable/committed event pair. */
function DeclarativeTabsDemo(): ReactNode {
  const [index, setIndex] = useState(0);
  const [lastChange, setLastChange] =
    useState<OgeTabSelectionChangedEvent | null>(null);
  return createElement(
    'div',
    null,
    createElement(OgeTabPanel, {
      selectedIndex: index,
      onSelectedIndexChange: setIndex,
      onSelectionChanged: setLastChange,
      tabs: [
        {
          text: 'Overview',
          content: p(`Project overview — selected index: ${index}`),
        },
        { text: 'Activity', content: p('Latest activity feed…') },
        { text: 'Settings', disabled: true, content: p('Settings…') },
      ],
    }),
    lastChange
      ? note(
          `selectionChanged → index ${lastChange.index} (from ${lastChange.previousIndex})`,
        )
      : null,
  );
}

const DOCS: OgeTabItem[] = [
  { key: 'readme', text: 'README.md' },
  { key: 'spec', text: 'spec.ts', badge: 3 },
  { key: 'draft', text: 'draft.md', dirty: true },
];

/** `items` + `selectedKey`, with one `renderTabContent` for every panel. */
function ItemsDemo(): ReactNode {
  const [activeDoc, setActiveDoc] = useState<string | undefined>('readme');
  return createElement(OgeTabPanel, {
    items: DOCS,
    selectedKey: activeDoc,
    onSelectedKeyChange: setActiveDoc,
    renderTabContent: ({ item }) =>
      createElement(
        'p',
        null,
        'Editing ',
        createElement('b', null, item.text),
        ' — selectedKey: ',
        createElement('code', null, activeDoc),
      ),
  });
}

/** `deferRendering` + `keepAlive`, made visible by the creation stamp. */
function LazyDemo(): ReactNode {
  const [keepAlive, setKeepAlive] = useState(true);
  return createElement(
    'div',
    null,
    createElement(
      'label',
      { className: 'mb-2 flex items-center gap-2 text-sm' },
      createElement('input', {
        type: 'checkbox',
        checked: keepAlive,
        onChange: () => setKeepAlive((value) => !value),
      }),
      'keepAlive',
    ),
    createElement(OgeTabPanel, {
      keepAlive,
      tabs: [
        { text: 'First', content: createElement(CreatedAt) },
        { text: 'Second', content: createElement(CreatedAt) },
      ],
    }),
  );
}

/** The close pipeline: `onTabClosing` → async `closeGuard` → `onTabClosed`. */
function ClosableDemo(): ReactNode {
  const [notice, setNotice] = useState('');
  const armedUntil = useRef(0);

  /** First attempt arms a 3s window; a second attempt inside it allows. */
  const confirmDiscard = (): Promise<boolean> => {
    const now = Date.now();
    if (now < armedUntil.current) {
      armedUntil.current = 0;
      return Promise.resolve(true);
    }
    armedUntil.current = now + 3000;
    return new Promise((resolve) =>
      setTimeout(() => {
        setNotice(
          'closeGuard vetoed — close again within 3s to discard changes',
        );
        resolve(false);
      }, 600),
    );
  };

  const buildFiles = (): OgeTabItem[] => [
    { key: 'a.ts', text: 'a.ts' },
    {
      key: 'b.ts',
      text: 'b.ts (guarded)',
      dirty: true,
      closeGuard: confirmDiscard,
    },
    { key: 'c.ts', text: 'c.ts' },
  ];

  const [files, setFiles] = useState<OgeTabItem[]>(buildFiles);

  return createElement(
    'div',
    null,
    createElement(OgeTabPanel, {
      items: files,
      closable: true,
      onTabClosed: (event) => {
        setFiles((current) => current.filter((file) => file.key !== event.key));
        setNotice('');
      },
      renderTabContent: ({ item }) => p(`${item.text} content…`),
    }),
    createElement(
      'div',
      { className: 'mt-2 flex items-center gap-3' },
      createElement(
        'button',
        {
          type: 'button',
          className: 'rounded border px-2 py-1 text-sm',
          onClick: () => {
            setFiles(buildFiles());
            setNotice('');
          },
        },
        'Reset tabs',
      ),
      notice
        ? createElement('span', { className: 'text-sm opacity-70' }, notice)
        : null,
    ),
  );
}

const MANY_TABS: OgeTabItem[] = Array.from({ length: 14 }, (_, i) => ({
  key: `ch${i + 1}`,
  text: `Chapter ${i + 1}`,
  disabled: i === 5,
}));

/** Overflow arrows and the all-tabs menu on a strip that does not fit. */
function OverflowDemo(): ReactNode {
  const [index, setIndex] = useState(0);
  return createElement(
    'div',
    null,
    createElement(OgeTabs, {
      items: MANY_TABS,
      selectedIndex: index,
      onSelectedIndexChange: setIndex,
      showTabListButton: true,
      ariaLabel: 'Chapters',
    }),
    note(`selected: ${MANY_TABS[index].text}`),
  );
}

const STAGES: OgeTabItem[] = [
  { key: 'todo', text: 'To do' },
  { key: 'doing', text: 'In progress' },
  { key: 'review', text: 'Review' },
  { key: 'done', text: 'Done' },
];

const ALIGNMENTS: OgeTabsAlignment[] = [
  'start',
  'center',
  'end',
  'justify',
  'stretch',
];

/** `tabAlignment`, `indicatorFit` and the empty-state strip. */
function AlignmentDemo(): ReactNode {
  const [alignment, setAlignment] = useState<OgeTabsAlignment>('start');
  const [fitIndicator, setFitIndicator] = useState(false);
  const [index, setIndex] = useState(0);
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-3 flex flex-wrap items-center gap-4 text-sm' },
      createElement(
        'label',
        { className: 'flex items-center gap-2' },
        'alignment',
        createElement(
          'select',
          {
            className: 'rounded border px-2 py-1',
            value: alignment,
            onChange: (event: ChangeEvent<HTMLSelectElement>) =>
              setAlignment(event.target.value as OgeTabsAlignment),
          },
          ALIGNMENTS.map((option) =>
            createElement('option', { key: option, value: option }, option),
          ),
        ),
      ),
      createElement(
        'label',
        { className: 'flex items-center gap-2' },
        createElement('input', {
          type: 'checkbox',
          checked: fitIndicator,
          onChange: () => setFitIndicator((value) => !value),
        }),
        'indicatorFit = content',
      ),
    ),
    createElement(OgeTabs, {
      items: STAGES,
      tabAlignment: alignment,
      indicatorFit: fitIndicator ? 'content' : 'tab',
      selectedIndex: index,
      onSelectedIndexChange: setIndex,
      ariaLabel: 'Alignment demo',
    }),
    createElement(
      'p',
      { className: 'mt-4 mb-1 text-sm opacity-70' },
      'Empty strip:',
    ),
    createElement(OgeTabs, { items: [], ariaLabel: 'Empty demo' }),
  );
}

const ANIMATIONS: OgeTabPanelAnimation[] = ['none', 'fade', 'slide'];

const TALL_LINES = [
  'Tab panels can differ a lot in height.',
  'Without dynamicHeight the page jumps as you switch.',
  'With it, the content box animates between the two heights.',
  'The transition honours prefers-reduced-motion.',
  'And async content is picked up by a ResizeObserver.',
];

/** `panelAnimation` and `dynamicHeight` across three panels of unequal size. */
function AnimationDemo(): ReactNode {
  const [panelAnimation, setPanelAnimation] =
    useState<OgeTabPanelAnimation>('slide');
  const [dynamicHeight, setDynamicHeight] = useState(true);
  const [index, setIndex] = useState(0);
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-3 flex flex-wrap items-center gap-4 text-sm' },
      createElement(
        'label',
        { className: 'flex items-center gap-2' },
        'panelAnimation',
        createElement(
          'select',
          {
            className: 'rounded border px-2 py-1',
            value: panelAnimation,
            onChange: (event: ChangeEvent<HTMLSelectElement>) =>
              setPanelAnimation(event.target.value as OgeTabPanelAnimation),
          },
          ANIMATIONS.map((option) =>
            createElement('option', { key: option, value: option }, option),
          ),
        ),
      ),
      createElement(
        'label',
        { className: 'flex items-center gap-2' },
        createElement('input', {
          type: 'checkbox',
          checked: dynamicHeight,
          onChange: () => setDynamicHeight((value) => !value),
        }),
        'dynamicHeight',
      ),
    ),
    createElement(OgeTabPanel, {
      panelAnimation,
      dynamicHeight,
      selectedIndex: index,
      onSelectedIndexChange: setIndex,
      tabs: [
        { text: 'Short', content: p('One line of content.') },
        {
          text: 'Medium',
          content: createElement(
            'div',
            null,
            p('A few more lines.'),
            p('So the panel is noticeably taller than the first one.'),
          ),
        },
        {
          text: 'Tall',
          content: createElement(
            'div',
            null,
            ...TALL_LINES.map((line) =>
              createElement('p', { key: line }, line),
            ),
          ),
        },
      ],
    }),
  );
}

/**
 * The React half of the tabs overview — the same nine demo sections as the
 * Angular page, with the same example content, rendered as real React trees
 * inside `/components/tabs` when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-tabs-overview-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React tabs carry the class names but no styles of their own —
  // the docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/tabs/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['tabs prop', 'controlled selectedIndex', 'onSelectionChanging']"
      heading="Declarative tabs"
      description="The <code>tabs</code> prop is the React counterpart of the projected <code>&amp;lt;oge-tab&amp;gt;</code> children — each entry carries its own <code>content</code>. <code>selectedIndex</code> + <code>onSelectedIndexChange</code> is the controlled pair; a user gesture first fires the cancelable <code>onSelectionChanging</code>, then <code>onSelectionChanged</code>. Disabled tabs are skipped by clicks and arrow keys."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="declarative" />
    </app-demo-card>

    <app-demo-card
      [chips]="['items', 'selectedKey', 'badge', 'dirty']"
      heading="Data-driven items"
      description="The <code>items</code> array drives the strip; <code>selectedKey</code> selects by identity, so it survives reordering and insertions. <code>badge</code> renders a counter, <code>dirty</code> the unsaved-changes dot (announced to screen readers). One <code>renderTabContent</code> render prop draws every item's panel."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="items" />
    </app-demo-card>

    <app-demo-card
      [chips]="['deferRendering', 'keepAlive']"
      heading="Lazy rendering & keep-alive"
      description="With <code>deferRendering</code> (default) a panel is mounted on its first visit; <code>keepAlive</code> (default) then keeps it mounted while hidden — note the creation time does not change when you come back. Toggle keep-alive off and the content is recreated on every visit."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="lazy" />
    </app-demo-card>

    <app-demo-card
      [chips]="['closable', 'async closeGuard', 'Delete key']"
      heading="Closable tabs & async close guard"
      description="Closing runs a pipeline: cancelable <code>onTabClosing</code> → the tab's async <code>closeGuard</code> (the ✕ shows a pending spinner, extra clicks are ignored) → <code>onTabClosed</code>, where the app removes the tab — focus hands off per the APG (following tab, else preceding). The guarded tab here asks for a second click within 3 seconds. Delete/Backspace on a focused tab closes it too."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="closable" />
    </app-demo-card>

    <app-demo-card
      [chips]="['showNavButtons', 'showTabListButton']"
      heading="Overflow: arrows & all-tabs menu"
      description="When the strip overflows, <code>showNavButtons: 'auto'</code> reveals scroll arrows (RTL-aware) and the selected tab is kept in view. <code>showTabListButton</code> adds an all-tabs menu — the active tab is checked, disabled tabs stay disabled."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="overflow" />
    </app-demo-card>

    <app-demo-card
      [chips]="['allowTabReordering', 'onTabReordered']"
      heading="Drag reorder"
      description="Drag a header to reorder — a drop indicator marks the target, Escape cancels the drag, and the selection follows the moved tab. <code>onTabReordering</code> is cancelable; <code>onTabReordered</code> reports the committed move. Give tabs a <code>key</code> for stable identity."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="reorder" />
    </app-demo-card>

    <app-demo-card
      [chips]="['tabsPosition', 'stylingMode', 'size']"
      heading="Positions & styling"
      description="<code>tabsPosition</code> accepts logical <code>top / bottom / start / end</code> — vertical strips switch the arrow keys to Up/Down and RTL flips <code>start</code>/<code>end</code> for free. <code>stylingMode='secondary'</code> renders soft pills, <code>size</code> controls density."
      [code]="demos[6].source"
      language="tsx"
    >
      <app-react-host [render]="position" />
    </app-demo-card>

    <app-demo-card
      [chips]="['tabAlignment', 'indicatorFit', 'empty state']"
      heading="Alignment, indicator & empty state"
      description="<code>tabAlignment</code> distributes the tabs while they fit — <code>justify</code> spreads them to the edges, <code>stretch</code> gives each an equal share (the reference <code>stretchTabs</code> / <code>tabAlignment</code> options). <code>indicatorFit='content'</code> shrinks the selected-tab underline to the label (the reference <code>fitInkBarToContent</code>). With no visible tabs the strip renders <code>messages.noData</code>."
      [code]="demos[7].source"
      language="tsx"
    >
      <app-react-host [render]="alignment" />
    </app-demo-card>

    <app-demo-card
      [chips]="['panelAnimation', 'dynamicHeight', 'reduced-motion']"
      heading="Panel transitions"
      description="<code>panelAnimation</code> fades or slides the incoming panel — <code>slide</code> enters from the direction of travel and mirrors itself under RTL. <code>dynamicHeight</code> animates the content box between panel heights instead of letting the page jump, tracking async content with a <code>ResizeObserver</code>. Duration is the <code>--oge-tab-panel-transition</code> variable rather than a prop, and both are suppressed under <code>prefers-reduced-motion</code>."
      [code]="demos[8].source"
      language="tsx"
    >
      <app-react-host [render]="animation" />
    </app-demo-card>
  `,
})
export class ReactTabsOverviewDemos {
  protected readonly demos = TABS_OVERVIEW_DEMOS;

  protected readonly declarative = () => createElement(DeclarativeTabsDemo);
  protected readonly items = () => createElement(ItemsDemo);
  protected readonly lazy = () => createElement(LazyDemo);
  protected readonly closable = () => createElement(ClosableDemo);
  protected readonly overflow = () => createElement(OverflowDemo);
  protected readonly alignment = () => createElement(AlignmentDemo);
  protected readonly animation = () => createElement(AnimationDemo);

  protected readonly reorder = () =>
    createElement(OgeTabPanel, {
      items: STAGES,
      allowTabReordering: true,
      renderTabContent: ({ item }) => p(`${item.text} stage…`),
    });

  protected readonly position = () =>
    createElement(OgeTabPanel, {
      tabsPosition: 'start',
      stylingMode: 'secondary',
      size: 'sm',
      tabs: [
        { text: 'General', content: p('General project settings…') },
        { text: 'Members', content: p('Member management…') },
        { text: 'Danger zone', content: p('Careful now…') },
      ],
    });
}
