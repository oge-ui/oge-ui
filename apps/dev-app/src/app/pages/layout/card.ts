import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  OgeCard,
  OgeCardActions,
  OgeCardAvatar,
  OgeCardFooter,
  OgeCardHeaderActions,
  OgeCardMedia,
  OgeCardSeparator,
  type OgeCardActionsAlign,
} from '@oge-ui/layout';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_LAYOUT_CARD_SECTIONS,
  ReactLayoutCardDemos,
} from '../react-layout/card';
import {
  ACTIONS_SNIPPET,
  BASIC_SNIPPET,
  CLICKABLE_SNIPPET,
  CONFIG_SNIPPET,
  FOOTER_SNIPPET,
  HEADER_SNIPPET,
  HORIZONTAL_SNIPPET,
  MEDIA_SNIPPET,
  MODES_SNIPPET,
  SIZE_SNIPPET,
  STATES_SNIPPET,
} from './card-snippets';

const SECTIONS = [
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

@Component({
  selector: 'app-layout-card',
  imports: [
    OgeCard,
    OgeCardActions,
    OgeCardAvatar,
    OgeCardFooter,
    OgeCardHeaderActions,
    OgeCardMedia,
    OgeCardSeparator,
    DemoCard,
    DocHeader,
    PageToc,
    ReactLayoutCardDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Card"
      category="Layout"
      categoryLink="/components/card"
      [chips]="['attribute slots', 'no role', 'signals', 'RTL', 'zoneless']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeCard&gt;</code> from
          <code>&#64;oge-ui/react-layout</code> is a content surface with an
          optional header, full-bleed media, an action row and a footer —
          <strong>one component, not a sub-component army</strong>. The sections
          the Angular card takes as attribute slots arrive here as node props
          (<code>media</code>, <code>actions</code>, <code>footer</code>,
          <code>avatar</code>, <code>headerActions</code>) and
          <code>children</code> is the content.
        </p>
      } @else {
        <p>
          <code>&lt;oge-card&gt;</code> is a content surface with an optional
          header, full-bleed media, an action row and a footer —
          <strong>one component, not a sub-component army</strong>. The sections
          are attribute slots (<code>[ogeCardMedia]</code>,
          <code>[ogeCardActions]</code>, <code>[ogeCardFooter]</code>…) and
          everything else projected is the content.
        </p>
      }
      <p>
        There is no WAI-ARIA card pattern, so the card renders no role and no
        interactive wrapper of its own; add <code>role="article"</code> or
        <code>role="region"</code> on the host where the context calls for it.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-layout-card-demos />
    } @else {
      <app-demo-card
        [chips]="['header', 'subheader', 'ogeCardActions']"
        heading="Basics"
        description="Simple titles come from the <code>header</code> / <code>subheader</code> inputs (the PrimeNG names — a <code>title</code> input would double as a native tooltip). The default projection is the content; no marker element to remember."
        [code]="basicSnippet"
        language="ts"
      >
        <div class="max-w-sm">
          <oge-card header="Mountains" subheader="Alps, 2026">
            <p>Four days above the tree line, one pass a day.</p>
            <div ogeCardActions align="end">
              <button type="button" class="demo-btn" (click)="note('Share')">
                Share
              </button>
            </div>
          </oge-card>
        </div>
        <p class="mt-2 text-sm opacity-70">last action → {{ last() }}</p>
      </app-demo-card>

      <app-demo-card
        [chips]="['stylingMode', '--oge-shadow-card']"
        heading="Chrome presets"
        description="<code>stylingMode</code> is the house word with the layout family&#39;s values plus Material&#39;s <code>raised</code>: <code>outlined</code> (default), <code>raised</code>, <code>filled</code>, <code>flat</code>. <code>raised</code> rests on the <code>--oge-shadow-card</code> token, so a theme re-tunes elevation without touching the component."
        [code]="modesSnippet"
        language="ts"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          @for (mode of modes; track mode) {
            <oge-card [header]="mode" [stylingMode]="mode">
              <p class="text-sm">The {{ mode }} chrome preset.</p>
            </oge-card>
          }
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['size', '--oge-card-pad']"
        heading="Density"
        description="<code>size</code> is the family&#39;s density preset (<code>sm</code> / <code>md</code> / <code>lg</code>): it scales the section padding and type ramp together, and <code>--oge-card-pad</code> is the per-card escape hatch."
        [code]="sizeSnippet"
        language="ts"
      >
        <div class="grid gap-4 sm:grid-cols-3">
          @for (s of sizes; track s) {
            <oge-card [header]="s === 'md' ? 'Default' : s" [size]="s">
              <p class="text-sm">The {{ s }} density.</p>
            </oge-card>
          }
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['ogeCardMedia', 'full-bleed']"
        heading="Media"
        description="<code>[ogeCardMedia]</code> is full-bleed — it touches the card edges while the sections around it keep the padding. Size it with your own CSS (<code>aspect-ratio</code>, <code>block-size</code>); there is deliberately no <code>aspectRatio</code> input. The heading stays before the media in DOM order."
        [code]="mediaSnippet"
        language="ts"
      >
        <div class="max-w-sm">
          <oge-card header="Mountains" subheader="Alps, 2026">
            <img
              ogeCardMedia
              src="https://picsum.photos/seed/oge-alps/640/360"
              alt=""
              style="aspect-ratio: 16 / 9"
            />
            <p>Media renders edge to edge, clipped by the card radius.</p>
          </oge-card>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['orientation', '--oge-card-media-size']"
        heading="Horizontal"
        description='<code>orientation="horizontal"</code> turns the card into a two-column grid: the media spans the inline-start column and <code>--oge-card-media-size</code> sets its width. Kendo is the only reference with an orientation input at all.'
        [code]="horizontalSnippet"
        language="ts"
      >
        <div class="max-w-xl">
          <oge-card
            header="Mountains"
            subheader="Alps, 2026"
            orientation="horizontal"
            style="--oge-card-media-size: 160px"
          >
            <img
              ogeCardMedia
              src="https://picsum.photos/seed/oge-lake/320/320"
              alt=""
            />
            <p>
              The media column follows the writing mode, so it mirrors in RTL
              with no flag to set.
            </p>
          </oge-card>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['ogeCardAvatar', 'ogeCardHeaderActions']"
        heading="Header slots"
        description="The header row renders only when it has something to show — titles, an <code>[ogeCardAvatar]</code> or <code>[ogeCardHeaderActions]</code>. Header actions are real controls in the Tab sequence; the card never wraps them in anything interactive."
        [code]="headerSnippet"
        language="ts"
      >
        <div class="max-w-sm">
          <oge-card header="R. Aydın" subheader="3 hours ago">
            <img ogeCardAvatar src="https://i.pravatar.cc/80?img=12" alt="" />
            <div ogeCardHeaderActions>
              <button
                type="button"
                class="demo-btn"
                aria-label="More options"
                (click)="note('Menu')"
              >
                ⋮
              </button>
            </div>
            <p>Reached the ridge before the weather turned.</p>
          </oge-card>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['align', 'stretched']"
        heading="Actions alignment"
        description="<code>align</code> on the actions row is the Kendo superset: <code>start</code> (the Material/Kendo default), <code>center</code>, <code>end</code>, and <code>stretched</code> — every action takes equal width."
        [code]="actionsSnippet"
        language="ts"
      >
        <div class="mb-3 flex gap-2">
          @for (a of aligns; track a) {
            <button
              type="button"
              class="demo-btn"
              [class.demo-btn-active]="align() === a"
              (click)="align.set(a)"
            >
              {{ a }}
            </button>
          }
        </div>
        <div class="max-w-sm">
          <oge-card header="Draft">
            <p>Unsaved changes.</p>
            <div ogeCardActions [align]="align()">
              <button type="button" class="demo-btn">Discard</button>
              <button type="button" class="demo-btn">Save</button>
            </div>
          </oge-card>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['ogeCardFooter', 'ogeCardSeparator']"
        heading="Footer & separator"
        description="<code>[ogeCardFooter]</code> is a divided strip on the header surface — metadata rather than commands. <code>[ogeCardSeparator]</code> on an <code>&amp;lt;hr&amp;gt;</code> draws a full-bleed hairline inside the padded content."
        [code]="footerSnippet"
        language="ts"
      >
        <div class="max-w-sm">
          <oge-card header="Weekly report">
            <p>Generated from last week's data.</p>
            <hr ogeCardSeparator />
            <p>12 pages, 4 charts.</p>
            <div ogeCardFooter>Updated 2 hours ago</div>
          </oge-card>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['severity', 'loading', 'aria-busy']"
        heading="Status & loading"
        description="<code>severity</code> draws a status rail on the inline-start edge — the toast&#39;s rail idiom on a static surface. <code>loading</code> swaps the content and action row for a shimmer skeleton and marks the card <code>aria-busy</code>; header, media and footer keep the footprint while the data arrives."
        [code]="statesSnippet"
        language="ts"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <oge-card
            header="Deploy failed"
            subheader="build #412"
            severity="danger"
          >
            <p class="text-sm">The e2e stage timed out after 20 minutes.</p>
            <div ogeCardActions align="end">
              <button type="button" class="demo-btn" (click)="note('Retry')">
                Retry
              </button>
            </div>
          </oge-card>
          <oge-card
            header="Weekly report"
            subheader="loading…"
            [loading]="pending()"
          >
            <p class="text-sm">Generated from last week's data.</p>
          </oge-card>
        </div>
        <button
          type="button"
          class="demo-btn mt-3"
          (click)="pending.set(!pending())"
        >
          Toggle loading
        </button>
      </app-demo-card>

      <app-demo-card
        [chips]="['no clickable input', 'stretched link']"
        heading="Clickable cards, accessibly"
        description="There is <strong>no clickable input, on purpose</strong>: wrapping the whole card in a link or button is the <code>nested-interactive</code> axe violation the moment a second control appears, and a screen reader reads the entire card as one link name. The accessible pattern is one primary <code>&amp;lt;a&amp;gt;</code> in the content with a CSS-stretched hit area — and <code>[interactive]</code> is its visual half: a hover/focus-within lift with no role, tabindex or wrapper of its own."
        [code]="clickableSnippet"
        language="ts"
      >
        <div class="max-w-sm">
          <oge-card
            header="Mountains"
            subheader="Alps, 2026"
            class="relative"
            [interactive]="true"
          >
            <p>Four days above the tree line.</p>
            <a
              href="#/components/card"
              class="text-sm font-medium text-indigo-600 after:absolute after:inset-0 after:content-[''] dark:text-indigo-400"
              (click)="$event.preventDefault(); note('Card link')"
            >
              Read the full report
            </a>
          </oge-card>
        </div>
        <p class="mt-2 text-sm opacity-70">last action → {{ last() }}</p>
      </app-demo-card>

      <app-demo-card
        [chips]="['provideOgeCardConfig']"
        heading="Configuration"
        description="<code>provideOgeCardConfig()</code> carries <code>stylingMode</code> and <code>orientation</code> defaults; instance inputs win. There is no <code>messages</code> block, deliberately — the card renders no user-facing strings and no interactive chrome of its own."
        [code]="configSnippet"
        language="ts"
      >
        <div class="max-w-sm">
          <oge-card header="Raised by default" stylingMode="raised">
            <p class="text-sm">
              What every card looks like under
              <code
                >provideOgeCardConfig({{ '{' }} stylingMode: 'raised'
                {{ '}' }})</code
              >.
            </p>
          </oge-card>
        </div>
      </app-demo-card>
    }
  `,
  styles: `
    .demo-btn {
      padding: 5px 12px;
      border: 1px solid var(--color-gray-200, #e5e7eb);
      border-radius: 8px;
      font-size: 13px;
      transition: background-color 120ms ease;
    }
    .demo-btn:hover {
      background: var(--color-gray-100, #f3f4f6);
    }
    .demo-btn-active {
      border-color: var(--color-indigo-400, #818cf8);
      color: var(--color-indigo-600, #4f46e5);
    }
  `,
})
export class LayoutCardPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_LAYOUT_CARD_SECTIONS;

  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly modesSnippet = MODES_SNIPPET;
  protected readonly mediaSnippet = MEDIA_SNIPPET;
  protected readonly horizontalSnippet = HORIZONTAL_SNIPPET;
  protected readonly headerSnippet = HEADER_SNIPPET;
  protected readonly actionsSnippet = ACTIONS_SNIPPET;
  protected readonly footerSnippet = FOOTER_SNIPPET;
  protected readonly clickableSnippet = CLICKABLE_SNIPPET;
  protected readonly configSnippet = CONFIG_SNIPPET;
  protected readonly sizeSnippet = SIZE_SNIPPET;
  protected readonly statesSnippet = STATES_SNIPPET;

  protected readonly modes = ['outlined', 'raised', 'filled', 'flat'] as const;
  protected readonly sizes = ['sm', 'md', 'lg'] as const;
  protected readonly pending = signal(true);
  protected readonly aligns: readonly OgeCardActionsAlign[] = [
    'start',
    'center',
    'end',
    'stretched',
  ];
  protected readonly align = signal<OgeCardActionsAlign>('start');
  protected readonly last = signal('—');

  protected note(action: string): void {
    this.last.set(action);
  }
}
