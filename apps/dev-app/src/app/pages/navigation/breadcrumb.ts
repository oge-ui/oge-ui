import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  OgeBreadcrumb,
  OgeBreadcrumbItem,
  OgeBreadcrumbItemTemplate,
  OgeBreadcrumbSeparatorTemplate,
  type OgeBreadcrumbItemClickEvent,
  type OgeBreadcrumbItemData,
} from '@oge-ui/navigation';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_NAVIGATION_BREADCRUMB_SECTIONS,
  ReactNavigationBreadcrumbDemos,
} from '../react-navigation/breadcrumb';
import {
  BASIC_SNIPPET,
  COLLAPSE_SNIPPET,
  CONFIG_SNIPPET,
  DECLARATIVE_SNIPPET,
  TEMPLATES_SNIPPET,
} from './breadcrumb-snippets';

const SECTIONS = [
  'Getting started',
  'Declarative items',
  'Collapse modes',
  'Templates',
  'Configuration',
] as const;

const HOME_ICON = 'M2 8 8 2l6 6M4 7v7h8V7';

const LONG_TRAIL: readonly OgeBreadcrumbItemData[] = [
  { text: 'Home', key: 'home', url: '/components/breadcrumb', icon: HOME_ICON },
  { text: 'Products', key: 'products', url: '/components/breadcrumb' },
  { text: 'Peripherals', key: 'peripherals', url: '/components/breadcrumb' },
  { text: 'Keyboards', key: 'keyboards', url: '/components/breadcrumb' },
  { text: 'Mechanical', key: 'mechanical' },
];

@Component({
  selector: 'app-navigation-breadcrumb',
  imports: [
    DemoCard,
    DocHeader,
    PageToc,
    OgeBreadcrumb,
    OgeBreadcrumbItem,
    OgeBreadcrumbItemTemplate,
    OgeBreadcrumbSeparatorTemplate,
    ReactNavigationBreadcrumbDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Breadcrumb"
      category="Navigation"
      [chips]="['APG breadcrumb', 'aria-current', 'container-width collapse']"
    >
      <p>
        The WAI-ARIA APG breadcrumb: a <code>&amp;lt;nav&amp;gt;</code>
        landmark holding an ordered list of links, the current page carrying
        <code>aria-current="page"</code>. The APG defines
        <strong>no keyboard behavior</strong> for a breadcrumb — crumbs are
        plain links in the Tab order, so no roving tabindex is invented here.
        (Neither DevExtreme nor Angular Material/CDK ships a breadcrumb at all;
        the parity references are Kendo and PrimeNG.)
      </p>
      <p>
        When the container runs out of room the
        <strong>oldest middle</strong> crumbs collapse first — the first and
        last crumb always stay visible — and unlike the references the collapsed
        crumbs stay reachable: the ellipsis opens them as real links. The
        fitting arithmetic is core's pure <code>fitToolbarItems</code>, measured
        against the breadcrumb's own box, never the window.
      </p>
      @if (fw.isReact()) {
        <p>
          Two idiom differences to know before you read on. The Angular layer
          also accepts declarative <code>&lt;oge-breadcrumb-item&gt;</code>
          children, and React does not —
          <strong>React reserves the <code>key</code> prop</strong>, so a crumb
          component could not carry the identity <code>key</code> means here,
          and the <code>items</code> array is the whole API. And the two
          <code>ng-template</code> slots
          (<code>[ogeBreadcrumbItemTemplate]</code>,
          <code>[ogeBreadcrumbSeparatorTemplate]</code>) arrive as the
          <code>renderItem</code> / <code>renderSeparator</code> render props.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-navigation-breadcrumb-demos />
    } @else {
      <app-demo-card
        [chips]="['items', 'itemClick', 'aria-current']"
        heading="Getting started"
        description="One flat <code>items</code> trail. <code>url</code> crumbs are real links (middle-click and copy-address work; <code>preventDefault()</code> in <code>itemClick</code> hands navigation to a router), the last crumb is never interactive and disabled crumbs stay visible but inert."
        [code]="basicSnippet"
        language="ts"
      >
        <!-- Several breadcrumbs share this page: each needs a distinct
           landmark label (axe landmark-unique) — [messages] provides it. -->
        <oge-breadcrumb
          [items]="basicTrail"
          [messages]="{ breadcrumb: 'Breadcrumb — getting started' }"
          (itemClick)="log($event)"
        />
        <p class="mt-3 text-sm" data-testid="breadcrumb-log">
          Last click: <code>{{ lastClick() }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['oge-breadcrumb-item', 'children first']"
        heading="Declarative items"
        description="Both APIs, one rule: declarative children render first, then the <code>items</code> input — the house merge order shared across the suite."
        [code]="declarativeSnippet"
        language="ts"
      >
        <oge-breadcrumb [messages]="{ breadcrumb: 'Breadcrumb — declarative' }">
          <oge-breadcrumb-item
            text="Home"
            key="home"
            url="/components/breadcrumb"
          />
          <oge-breadcrumb-item
            text="Reports"
            key="reports"
            url="/components/breadcrumb"
          />
          <oge-breadcrumb-item text="Q3 summary" />
        </oge-breadcrumb>
      </app-demo-card>

      <app-demo-card
        [chips]="['collapseMode', 'container width', 'ellipsis menu']"
        heading="Collapse modes"
        description="<code>auto</code> (default) collapses against the breadcrumb's <strong>own container</strong>; the ellipsis menu keeps the hidden crumbs reachable as real links. <code>wrap</code> breaks onto rows and <code>none</code> keeps one scrollable row. Drag the range to squeeze it."
        [code]="collapseSnippet"
        language="ts"
      >
        <label class="mb-2 flex items-center gap-2 text-sm">
          Container width
          <input
            type="range"
            min="200"
            max="640"
            [value]="collapseWidth()"
            (input)="collapseWidth.set(+$any($event.target).value)"
          />
          <code>{{ collapseWidth() }}px</code>
        </label>
        <div class="rounded border p-2" [style.width.px]="collapseWidth()">
          <oge-breadcrumb
            [items]="longTrail"
            collapseMode="auto"
            [messages]="{ breadcrumb: 'Breadcrumb — collapse' }"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="[
          'ogeBreadcrumbItemTemplate',
          'ogeBreadcrumbSeparatorTemplate',
        ]"
        heading="Templates"
        description="The item template replaces the crumb's interior only — link/current/disabled semantics stay with the component. The separator template renders <code>aria-hidden</code>: a separator is decoration, never content."
        [code]="templatesSnippet"
        language="ts"
      >
        <oge-breadcrumb
          [items]="templateTrail"
          [messages]="{ breadcrumb: 'Breadcrumb — templates' }"
        >
          <ng-template ogeBreadcrumbItemTemplate let-item let-last="last">
            <strong [style.opacity]="last ? 1 : 0.75">{{ item.text }}</strong>
          </ng-template>
          <ng-template ogeBreadcrumbSeparatorTemplate>·</ng-template>
        </oge-breadcrumb>
      </app-demo-card>

      <app-demo-card
        [chips]="['provideOgeBreadcrumbConfig', 'messages']"
        heading="Configuration"
        description="Suite-wide defaults for <code>collapseMode</code> plus every user-facing string — the nav landmark's label and the ellipsis button's label — via <code>provideOgeBreadcrumbConfig()</code>, overridable per instance with <code>[messages]</code>."
        [code]="configSnippet"
        language="ts"
      >
        <oge-breadcrumb
          [items]="basicTrail"
          [messages]="{ breadcrumb: 'İçerik haritası' }"
        />
      </app-demo-card>
    }
  `,
})
export class NavigationBreadcrumbPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_NAVIGATION_BREADCRUMB_SECTIONS;
  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly declarativeSnippet = DECLARATIVE_SNIPPET;
  protected readonly collapseSnippet = COLLAPSE_SNIPPET;
  protected readonly templatesSnippet = TEMPLATES_SNIPPET;
  protected readonly configSnippet = CONFIG_SNIPPET;

  protected readonly basicTrail: readonly OgeBreadcrumbItemData[] = [
    {
      text: 'Home',
      key: 'home',
      url: '/components/breadcrumb',
      icon: HOME_ICON,
    },
    { text: 'Products', key: 'products', url: '/components/breadcrumb' },
    { text: 'Archived', key: 'archived', disabled: true },
    { text: 'Keyboards' },
  ];
  protected readonly longTrail = LONG_TRAIL;
  protected readonly templateTrail: readonly OgeBreadcrumbItemData[] = [
    { text: 'Home', url: '/components/breadcrumb' },
    { text: 'Library', url: '/components/breadcrumb' },
    { text: 'Data' },
  ];

  protected readonly lastClick = signal('—');
  protected readonly collapseWidth = signal(640);

  protected log(event: OgeBreadcrumbItemClickEvent): void {
    event.event.preventDefault(); // demo links point back at this page
    this.lastClick.set(`${event.key ?? event.item.text} [${event.index}]`);
  }
}
