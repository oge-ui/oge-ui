import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  createElement,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  OgeCard,
  OgeCardConfigProvider,
  type OgeCardActionsAlign,
} from '@oge-ui/react-layout';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { LAYOUT_CARD_DEMOS } from './card-snippets';

/**
 * TOC of the React view — the same eleven sections as the Angular card page
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_LAYOUT_CARD_SECTIONS = [
  'Basics',
  'Chrome presets',
  'Density',
  'Media',
  'Horizontal',
  'Header slots',
  'Actions alignment',
  'Footer & separator',
  'Status & loading',
  'Clickable cards, accessibly',
  'Configuration',
] as const;

const MODES = ['outlined', 'raised', 'filled', 'flat'] as const;
const SIZES = ['sm', 'md', 'lg'] as const;
const ALIGNS: readonly OgeCardActionsAlign[] = [
  'start',
  'center',
  'end',
  'stretched',
];

/** The docs' plain button chrome, shared by the interactive demos. */
const demoButton = (
  key: string,
  label: string,
  onClick?: () => void,
  extra?: Record<string, unknown>,
) =>
  createElement(
    'button',
    {
      key,
      type: 'button',
      className:
        'rounded border border-gray-200 px-3 py-1 text-[13px] transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800',
      onClick,
      ...extra,
    },
    label,
  );

/**
 * The action row is markup in React: the Angular `[ogeCardActions]` directive
 * only adds these classes, so the node carries them itself.
 */
const actionsRow = (align: OgeCardActionsAlign, ...children: ReactNode[]) =>
  createElement(
    'div',
    {
      className:
        align === 'start'
          ? 'oge-card-actions'
          : `oge-card-actions oge-card-actions-${align}`,
    },
    ...children,
  );

function BasicsDemo(): ReactNode {
  const [last, setLast] = useState('—');
  return createElement(
    'div',
    { className: 'max-w-sm' },
    createElement(
      OgeCard,
      {
        header: 'Mountains',
        subheader: 'Alps, 2026',
        actions: actionsRow(
          'end',
          demoButton('share', 'Share', () => setLast('Share')),
        ),
      },
      createElement(
        'p',
        null,
        'Four days above the tree line, one pass a day.',
      ),
    ),
    createElement(
      'p',
      { className: 'mt-2 text-sm opacity-70' },
      `last action → ${last}`,
    ),
  );
}

function HeaderSlotsDemo(): ReactNode {
  const [last, setLast] = useState('—');
  return createElement(
    'div',
    { className: 'max-w-sm' },
    createElement(
      OgeCard,
      {
        header: 'R. Aydın',
        subheader: '3 hours ago',
        avatar: createElement('img', {
          className: 'oge-card-avatar',
          src: 'https://i.pravatar.cc/80?img=12',
          alt: '',
        }),
        headerActions: createElement(
          'div',
          { className: 'oge-card-header-actions' },
          demoButton('menu', '⋮', () => setLast('Menu'), {
            'aria-label': 'More options',
          }),
        ),
      },
      createElement('p', null, 'Reached the ridge before the weather turned.'),
    ),
    createElement(
      'p',
      { className: 'mt-2 text-sm opacity-70' },
      `last action → ${last}`,
    ),
  );
}

function ActionsAlignDemo(): ReactNode {
  const [align, setAlign] = useState<OgeCardActionsAlign>('start');
  return createElement(
    'div',
    { className: 'max-w-sm' },
    createElement(
      'div',
      { className: 'mb-3 flex gap-2' },
      ...ALIGNS.map((value) =>
        demoButton(value, value, () => setAlign(value), {
          className:
            value === align
              ? 'rounded border border-indigo-400 px-3 py-1 text-[13px] text-indigo-600 dark:text-indigo-400'
              : 'rounded border border-gray-200 px-3 py-1 text-[13px] transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800',
        }),
      ),
    ),
    createElement(
      OgeCard,
      {
        header: 'Draft',
        actions: actionsRow(
          align,
          demoButton('discard', 'Discard'),
          demoButton('save', 'Save'),
        ),
      },
      createElement('p', null, 'Unsaved changes.'),
    ),
  );
}

function StatesDemo(): ReactNode {
  const [pending, setPending] = useState(true);
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'grid gap-4 sm:grid-cols-2' },
      createElement(
        OgeCard,
        {
          key: 'failed',
          header: 'Deploy failed',
          subheader: 'build #412',
          severity: 'danger',
          actions: actionsRow('end', demoButton('retry', 'Retry')),
        },
        createElement(
          'p',
          { className: 'text-sm' },
          'The e2e stage timed out after 20 minutes.',
        ),
      ),
      createElement(
        OgeCard,
        {
          key: 'report',
          header: 'Weekly report',
          subheader: 'loading…',
          loading: pending,
        },
        createElement(
          'p',
          { className: 'text-sm' },
          "Generated from last week's data.",
        ),
      ),
    ),
    createElement(
      'div',
      { className: 'mt-3' },
      demoButton('toggle', 'Toggle loading', () => setPending(!pending)),
    ),
  );
}

function ClickableDemo(): ReactNode {
  const [last, setLast] = useState('—');
  return createElement(
    'div',
    { className: 'max-w-sm' },
    createElement(
      OgeCard,
      {
        header: 'Mountains',
        subheader: 'Alps, 2026',
        interactive: true,
        style: { position: 'relative' },
      },
      createElement('p', null, 'Four days above the tree line.'),
      createElement(
        'a',
        {
          href: '#/components/card',
          className:
            "text-sm font-medium text-indigo-600 after:absolute after:inset-0 after:content-[''] dark:text-indigo-400",
          onClick: (event: { preventDefault: () => void }) => {
            event.preventDefault();
            setLast('Card link');
          },
        },
        'Read the full report',
      ),
    ),
    createElement(
      'p',
      { className: 'mt-2 text-sm opacity-70' },
      `last action → ${last}`,
    ),
  );
}

/**
 * The React half of the card page — the same eleven demo sections as the
 * Angular page, with the same example content, rendered as real React trees
 * inside `/components/card` when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-layout-card-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React card carries the class names but no styles of its own —
  // the docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/layout/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['header', 'subheader', 'actions']"
      heading="Basics"
      description="Simple titles come from the <code>header</code> / <code>subheader</code> props (the PrimeNG names — a <code>title</code> prop would double as a native tooltip). The default content is <code>children</code>; no marker element to remember."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basics" />
    </app-demo-card>

    <app-demo-card
      [chips]="['stylingMode', '--oge-shadow-card']"
      heading="Chrome presets"
      description="<code>stylingMode</code> is the house word with the layout family&#39;s values plus Material&#39;s <code>raised</code>: <code>outlined</code> (default), <code>raised</code>, <code>filled</code>, <code>flat</code>. <code>raised</code> rests on the <code>--oge-shadow-card</code> token, so a theme re-tunes elevation without touching the component."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="modes" />
    </app-demo-card>

    <app-demo-card
      [chips]="['size', '--oge-card-pad']"
      heading="Density"
      description="<code>size</code> is the family&#39;s density preset (<code>sm</code> / <code>md</code> / <code>lg</code>): it scales the section padding and type ramp together, and <code>--oge-card-pad</code> is the per-card escape hatch."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="sizes" />
    </app-demo-card>

    <app-demo-card
      [chips]="['media', 'full-bleed']"
      heading="Media"
      description="The <code>media</code> prop is full-bleed — it touches the card edges while the sections around it keep the padding. Size it with your own CSS (<code>aspect-ratio</code>, <code>block-size</code>); there is deliberately no <code>aspectRatio</code> prop. The heading stays before the media in DOM order."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="media" />
    </app-demo-card>

    <app-demo-card
      [chips]="['orientation', '--oge-card-media-size']"
      heading="Horizontal"
      description='<code>orientation="horizontal"</code> turns the card into a two-column grid: the media spans the inline-start column and <code>--oge-card-media-size</code> sets its width. Kendo is the only reference with an orientation input at all.'
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="horizontal" />
    </app-demo-card>

    <app-demo-card
      [chips]="['avatar', 'headerActions']"
      heading="Header slots"
      description="The header row renders only when it has something to show — titles, an <code>avatar</code> or a <code>headerActions</code> node. Header actions are real controls in the Tab sequence; the card never wraps them in anything interactive."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="headerSlots" />
    </app-demo-card>

    <app-demo-card
      [chips]="['oge-card-actions-*', 'stretched']"
      heading="Actions alignment"
      description="The alignment vocabulary is the Kendo superset: <code>start</code> (the Material/Kendo default), <code>center</code>, <code>end</code>, and <code>stretched</code> — every action takes equal width. React has no <code>[ogeCardActions]</code> directive to carry it, so the <code>actions</code> node takes the matching <code>oge-card-actions-*</code> class itself."
      [code]="demos[6].source"
      language="tsx"
    >
      <app-react-host [render]="actionsAlign" />
    </app-demo-card>

    <app-demo-card
      [chips]="['footer', 'oge-card-separator']"
      heading="Footer & separator"
      description='The <code>footer</code> node is a divided strip on the header surface — metadata rather than commands. An <code>&lt;hr class="oge-card-separator"&gt;</code> in the content draws a full-bleed hairline inside the padding.'
      [code]="demos[7].source"
      language="tsx"
    >
      <app-react-host [render]="footer" />
    </app-demo-card>

    <app-demo-card
      [chips]="['severity', 'loading', 'aria-busy']"
      heading="Status & loading"
      description="<code>severity</code> draws a status rail on the inline-start edge — the toast&#39;s rail idiom on a static surface. <code>loading</code> swaps the content and action row for a shimmer skeleton and marks the card <code>aria-busy</code>; header, media and footer keep the footprint while the data arrives."
      [code]="demos[8].source"
      language="tsx"
    >
      <app-react-host [render]="states" />
    </app-demo-card>

    <app-demo-card
      [chips]="['no clickable prop', 'stretched link']"
      heading="Clickable cards, accessibly"
      description="There is <strong>no clickable prop, on purpose</strong>: wrapping the whole card in a link or button is the <code>nested-interactive</code> axe violation the moment a second control appears, and a screen reader reads the entire card as one link name. The accessible pattern is one primary <code>&amp;lt;a&amp;gt;</code> in the content with a CSS-stretched hit area — and <code>interactive</code> is its visual half: a hover/focus-within lift with no role, tabindex or wrapper of its own."
      [code]="demos[9].source"
      language="tsx"
    >
      <app-react-host [render]="clickable" />
    </app-demo-card>

    <app-demo-card
      [chips]="['OgeCardConfigProvider']"
      heading="Configuration"
      description="<code>&lt;OgeCardConfigProvider&gt;</code> carries <code>stylingMode</code>, <code>orientation</code> and <code>size</code> defaults for its subtree; instance props win. There is no <code>messages</code> block, deliberately — the card renders no user-facing strings and no interactive chrome of its own."
      [code]="demos[10].source"
      language="tsx"
    >
      <app-react-host [render]="config" />
    </app-demo-card>
  `,
})
export class ReactLayoutCardDemos {
  protected readonly demos = LAYOUT_CARD_DEMOS;

  protected readonly basics = () => createElement(BasicsDemo);
  protected readonly headerSlots = () => createElement(HeaderSlotsDemo);
  protected readonly actionsAlign = () => createElement(ActionsAlignDemo);
  protected readonly states = () => createElement(StatesDemo);
  protected readonly clickable = () => createElement(ClickableDemo);

  protected readonly modes = () =>
    createElement(
      'div',
      { className: 'grid gap-4 sm:grid-cols-2' },
      ...MODES.map((mode) =>
        createElement(
          OgeCard,
          { key: mode, header: mode, stylingMode: mode },
          createElement(
            'p',
            { className: 'text-sm' },
            `The ${mode} chrome preset.`,
          ),
        ),
      ),
    );

  protected readonly sizes = () =>
    createElement(
      'div',
      { className: 'grid gap-4 sm:grid-cols-3' },
      ...SIZES.map((size) =>
        createElement(
          OgeCard,
          { key: size, header: size === 'md' ? 'Default' : size, size },
          createElement('p', { className: 'text-sm' }, `The ${size} density.`),
        ),
      ),
    );

  protected readonly media = () =>
    createElement(
      'div',
      { className: 'max-w-sm' },
      createElement(
        OgeCard,
        {
          header: 'Mountains',
          subheader: 'Alps, 2026',
          media: createElement('img', {
            className: 'oge-card-media',
            src: 'https://picsum.photos/seed/oge-alps/640/360',
            alt: '',
            style: { aspectRatio: '16 / 9' },
          }),
        },
        createElement(
          'p',
          null,
          'Media renders edge to edge, clipped by the card radius.',
        ),
      ),
    );

  protected readonly horizontal = () =>
    createElement(
      'div',
      { className: 'max-w-xl' },
      createElement(
        OgeCard,
        {
          header: 'Mountains',
          subheader: 'Alps, 2026',
          orientation: 'horizontal',
          style: { '--oge-card-media-size': '160px' } as CSSProperties,
          media: createElement('img', {
            className: 'oge-card-media',
            src: 'https://picsum.photos/seed/oge-lake/320/320',
            alt: '',
          }),
        },
        createElement(
          'p',
          null,
          'The media column follows the writing mode, so it mirrors in RTL with no flag to set.',
        ),
      ),
    );

  protected readonly footer = () =>
    createElement(
      'div',
      { className: 'max-w-sm' },
      createElement(
        OgeCard,
        {
          header: 'Weekly report',
          footer: createElement(
            'div',
            { className: 'oge-card-footer' },
            'Updated 2 hours ago',
          ),
        },
        createElement('p', { key: 'a' }, "Generated from last week's data."),
        createElement('hr', { key: 'hr', className: 'oge-card-separator' }),
        createElement('p', { key: 'b' }, '12 pages, 4 charts.'),
      ),
    );

  protected readonly config = () =>
    createElement(
      OgeCardConfigProvider,
      { config: { stylingMode: 'raised' } },
      createElement(
        'div',
        { className: 'max-w-sm' },
        createElement(
          OgeCard,
          { header: 'Raised by default' },
          createElement(
            'p',
            { className: 'text-sm' },
            'What every card in the subtree looks like. Instance props still win: add stylingMode="outlined" to opt one card out.',
          ),
        ),
      ),
    );
}
