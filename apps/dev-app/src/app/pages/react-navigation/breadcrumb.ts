import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  createElement,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import {
  OgeBreadcrumb,
  OgeBreadcrumbConfigProvider,
  type OgeBreadcrumbItemClickEvent,
  type OgeBreadcrumbItemData,
  type OgeBreadcrumbItemRenderContext,
} from '@oge-ui/react-navigation';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { NAVIGATION_BREADCRUMB_DEMOS } from './breadcrumb-snippets';

/**
 * TOC of the React view — the same five sections as the Angular breadcrumb
 * page (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_NAVIGATION_BREADCRUMB_SECTIONS = [
  'Getting started',
  'Declarative items',
  'Collapse modes',
  'Templates',
  'Configuration',
] as const;

const HOME_ICON = 'M2 8 8 2l6 6M4 7v7h8V7';

/** The Angular page's trails, verbatim — the mirror is content too. */
const BASIC_TRAIL: readonly OgeBreadcrumbItemData[] = [
  { text: 'Home', key: 'home', url: '/components/breadcrumb', icon: HOME_ICON },
  { text: 'Products', key: 'products', url: '/components/breadcrumb' },
  { text: 'Archived', key: 'archived', disabled: true },
  { text: 'Keyboards' },
];

const DECLARATIVE_TRAIL: readonly OgeBreadcrumbItemData[] = [
  { text: 'Home', key: 'home', url: '/components/breadcrumb' },
  { text: 'Reports', key: 'reports', url: '/components/breadcrumb' },
  { text: 'Q3 summary' },
];

const LONG_TRAIL: readonly OgeBreadcrumbItemData[] = [
  { text: 'Home', key: 'home', url: '/components/breadcrumb', icon: HOME_ICON },
  { text: 'Products', key: 'products', url: '/components/breadcrumb' },
  { text: 'Peripherals', key: 'peripherals', url: '/components/breadcrumb' },
  { text: 'Keyboards', key: 'keyboards', url: '/components/breadcrumb' },
  { text: 'Mechanical', key: 'mechanical' },
];

const TEMPLATE_TRAIL: readonly OgeBreadcrumbItemData[] = [
  { text: 'Home', url: '/components/breadcrumb' },
  { text: 'Library', url: '/components/breadcrumb' },
  { text: 'Data' },
];

function BasicsDemo(): ReactNode {
  const [last, setLast] = useState('—');
  return createElement(
    'div',
    null,
    createElement(OgeBreadcrumb, {
      items: BASIC_TRAIL,
      // Several breadcrumbs share this page: each needs a distinct landmark
      // label (axe landmark-unique) — the messages prop provides it.
      messages: { breadcrumb: 'Breadcrumb — getting started' },
      onItemClick: (event: OgeBreadcrumbItemClickEvent) => {
        event.event.preventDefault(); // demo links point back at this page
        setLast(`${event.key ?? event.item.text} [${event.index}]`);
      },
    }),
    createElement(
      'p',
      { className: 'mt-3 text-sm', 'data-testid': 'breadcrumb-log' },
      'Last click: ',
      createElement('code', null, last),
    ),
  );
}

function CollapseDemo(): ReactNode {
  const [width, setWidth] = useState(640);
  return createElement(
    'div',
    null,
    createElement(
      'label',
      { className: 'mb-2 flex items-center gap-2 text-sm' },
      'Container width',
      createElement('input', {
        type: 'range',
        min: 200,
        max: 640,
        value: width,
        onChange: (event: ChangeEvent<HTMLInputElement>) =>
          setWidth(+event.target.value),
      }),
      createElement('code', null, `${width}px`),
    ),
    createElement(
      'div',
      { className: 'rounded border p-2', style: { width } },
      createElement(OgeBreadcrumb, {
        items: LONG_TRAIL,
        collapseMode: 'auto',
        messages: { breadcrumb: 'Breadcrumb — collapse' },
      }),
    ),
  );
}

/**
 * The React half of the breadcrumb page — the same five demo sections as the
 * Angular page, with the same trails, rendered as real React trees inside
 * `/components/breadcrumb` when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-navigation-breadcrumb-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React breadcrumb carries the class names but no styles of its own —
  // the docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/navigation/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['items', 'onItemClick', 'aria-current']"
      heading="Getting started"
      description="One flat <code>items</code> trail. <code>url</code> crumbs are real links (middle-click and copy-address work; <code>preventDefault()</code> in <code>onItemClick</code> hands navigation to a router), the last crumb is never interactive and disabled crumbs stay visible but inert."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basics" />
    </app-demo-card>

    <app-demo-card
      [chips]="['items', 'no crumb child']"
      heading="Declarative items"
      description="Angular offers two APIs here and merges declarative <code>&lt;oge-breadcrumb-item&gt;</code> children before the <code>items</code> input. <strong>React has one</strong>: the flat <code>items</code> array. A crumb component could not carry the identity anyway — React reserves the <code>key</code> prop — so a trail is data, and there is no merge order to remember."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="declarative" />
    </app-demo-card>

    <app-demo-card
      [chips]="['collapseMode', 'container width', 'ellipsis menu']"
      heading="Collapse modes"
      description="<code>auto</code> (default) collapses against the breadcrumb's <strong>own container</strong>; the ellipsis menu keeps the hidden crumbs reachable as real links. <code>wrap</code> breaks onto rows and <code>none</code> keeps one scrollable row. Drag the range to squeeze it."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="collapse" />
    </app-demo-card>

    <app-demo-card
      [chips]="['renderItem', 'renderSeparator']"
      heading="Templates"
      description="<code>renderItem</code> replaces the crumb's interior only — link/current/disabled semantics stay with the component. <code>renderSeparator</code> renders <code>aria-hidden</code>: a separator is decoration, never content. They are the React face of <code>[ogeBreadcrumbItemTemplate]</code> and <code>[ogeBreadcrumbSeparatorTemplate]</code>."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="templates" />
    </app-demo-card>

    <app-demo-card
      [chips]="['OgeBreadcrumbConfigProvider', 'messages']"
      heading="Configuration"
      description="Subtree defaults for <code>collapseMode</code> plus every user-facing string — the nav landmark's label and the ellipsis button's label — via <code>&lt;OgeBreadcrumbConfigProvider&gt;</code>, overridable per instance with the <code>messages</code> prop."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="config" />
    </app-demo-card>
  `,
})
export class ReactNavigationBreadcrumbDemos {
  protected readonly demos = NAVIGATION_BREADCRUMB_DEMOS;

  protected readonly basics = () => createElement(BasicsDemo);
  protected readonly collapse = () => createElement(CollapseDemo);

  protected readonly declarative = () =>
    createElement(OgeBreadcrumb, {
      items: DECLARATIVE_TRAIL,
      messages: { breadcrumb: 'Breadcrumb — declarative' },
    });

  protected readonly templates = () =>
    createElement(OgeBreadcrumb, {
      items: TEMPLATE_TRAIL,
      messages: { breadcrumb: 'Breadcrumb — templates' },
      renderItem: ({ item, last }: OgeBreadcrumbItemRenderContext) =>
        createElement(
          'strong',
          { style: { opacity: last ? 1 : 0.75 } },
          item.text,
        ),
      renderSeparator: () => '·',
    });

  protected readonly config = () =>
    createElement(
      OgeBreadcrumbConfigProvider,
      { config: { messages: { breadcrumb: 'İçerik haritası' } } },
      createElement(OgeBreadcrumb, { items: BASIC_TRAIL }),
    );
}
