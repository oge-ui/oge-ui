import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  OgeAppBar,
  OgeAppBarEnd,
  OgeAppBarStart,
} from '@oge-ui/layout/app-bar';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_LAYOUT_APP_BAR_SECTIONS,
  ReactLayoutAppBarDemos,
} from '../react-layout/app-bar';
import {
  BOTTOM_SNIPPET,
  COLORS_SNIPPET,
  LANDMARK_SNIPPET,
  SECTIONS_SNIPPET,
  STICKY_SNIPPET,
} from './app-bar-snippets';

const SECTIONS = [
  'Sections',
  'Colors & sizes',
  'Sticky & fixed (safe areas)',
  'Bottom bar',
  'Landmarks',
] as const;

/** Body text of the two scrolling demos. */
const APP_BAR_ARTICLE = Array.from(
  { length: 8 },
  (_, i) =>
    `Paragraph ${i + 1}: scroll inside this box — the bar stays on top.`,
);
const APP_BAR_MESSAGES = Array.from(
  { length: 8 },
  (_, i) => `Message ${i + 1}`,
);

@Component({
  selector: 'app-layout-app-bar',
  imports: [
    OgeAppBar,
    OgeAppBarEnd,
    OgeAppBarStart,
    DemoCard,
    DocHeader,
    PageToc,
    ReactLayoutAppBarDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="App Bar"
      category="Layout"
      categoryLink="/components/app-bar"
      [chips]="['start / center / end', 'sticky', 'safe areas', 'landmarks']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeAppBar&gt;</code> from
          <code>&#64;oge-ui/react-layout</code> is a horizontal application bar
          with start, center and end sections — the same markup and stylesheet
          as the Angular component, with the sections as node props.
        </p>
      } @else {
        <p>
          <code>oge-app-bar</code> is a horizontal application bar with start,
          center and end sections — the header of an app shell, a bottom action
          bar on a phone.
        </p>
      }
      <p>
        It is chrome, not a widget: no keyboard model of its own (its controls
        stay in the Tab order — put an <code>oge-toolbar</code> inside for the
        APG toolbar&rsquo;s single tab stop), and a landmark only on request,
        because <code>banner</code> must be unique and top-level.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-layout-app-bar-demos />
    } @else {
      <app-demo-card
        [chips]="['ogeAppBarStart', 'ogeAppBarEnd', 'center']"
        heading="Sections"
        description="<code>[ogeAppBarStart]</code> and <code>[ogeAppBarEnd]</code> size to their content; unmarked content goes to the center section, which takes the remaining width and lets a long title truncate instead of pushing the actions off a phone screen."
        [code]="sectionsSnippet"
        language="ts"
      >
        <oge-app-bar>
          <button
            ogeAppBarStart
            type="button"
            class="demo-app-bar-btn"
            aria-label="Open menu"
            (click)="last.set('menu')"
          >
            ☰
          </button>
          <strong>Inbox</strong>
          <button
            ogeAppBarEnd
            type="button"
            class="demo-app-bar-btn"
            (click)="last.set('search')"
          >
            Search
          </button>
          <button
            ogeAppBarEnd
            type="button"
            class="demo-app-bar-btn"
            (click)="last.set('profile')"
          >
            Profile
          </button>
        </oge-app-bar>
        <p class="mt-2 text-sm" data-testid="app-bar-last">
          last action → {{ last() }}
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['color', 'size', 'elevated', 'centerAlign']"
        heading="Colors & sizes"
        description="<code>default</code> is the page surface with a hairline on the content edge, <code>primary</code> the accent, <code>inverse</code> the dark tooltip surface, <code>transparent</code> none. <code>size</code> is the 48 / 56 / 64 px density and <code>elevated</code> adds the card shadow — all tokens, so a theme re-tunes every bar."
        [code]="colorsSnippet"
        language="ts"
      >
        <div class="flex flex-col gap-3">
          <oge-app-bar size="sm"><strong>Default · sm</strong></oge-app-bar>
          <oge-app-bar color="primary" [elevated]="true">
            <strong>Primary · elevated</strong>
            <button ogeAppBarEnd type="button" class="demo-app-bar-btn">
              Action
            </button>
          </oge-app-bar>
          <oge-app-bar color="inverse" size="lg" centerAlign="center">
            <strong>Inverse · lg · centered</strong>
          </oge-app-bar>
          <oge-app-bar color="transparent"
            ><strong>Transparent</strong></oge-app-bar
          >
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['positionMode: sticky', 'fixed', 'env(safe-area-inset-*)']"
        heading="Sticky & fixed (safe areas)"
        description="<code>sticky</code> sticks to the top of the nearest scroll container; <code>fixed</code> pins to the viewport instead (not shown live — it would cover these docs). Both pad with <code>env(safe-area-inset-*)</code> as a floor, so the bar clears a notch once the app opts into <code>viewport-fit=cover</code>, and sit on the <code>--oge-z-app-bar</code> layer, below FABs, popups and dialogs."
        [code]="stickySnippet"
        language="ts"
      >
        <div
          class="demo-app-bar-scroll"
          role="region"
          aria-label="Scrolling article"
          tabindex="0"
        >
          <oge-app-bar positionMode="sticky" [elevated]="true">
            <strong>Article</strong>
            <button ogeAppBarEnd type="button" class="demo-app-bar-btn">
              Share
            </button>
          </oge-app-bar>
          @for (paragraph of article; track $index) {
            <p class="px-4 py-2">{{ paragraph }}</p>
          }
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['position: bottom', 'sticky']"
        heading="Bottom bar"
        description='<code>position="bottom"</code> moves the hairline and the shadow to the top edge and the safe-area padding to the home-indicator edge — a phone&rsquo;s bottom navigation.'
        [code]="bottomSnippet"
        language="ts"
      >
        <div
          class="demo-app-bar-scroll"
          role="region"
          aria-label="Phone screen"
          tabindex="0"
        >
          @for (paragraph of messages; track $index) {
            <p class="px-4 py-2">{{ paragraph }}</p>
          }
          <oge-app-bar
            position="bottom"
            positionMode="sticky"
            centerAlign="center"
          >
            @for (option of tabs; track option) {
              <button
                type="button"
                class="demo-app-bar-btn"
                [attr.aria-pressed]="tab() === option"
                (click)="tab.set(option)"
              >
                {{ option }}
              </button>
            }
          </oge-app-bar>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['landmark', 'ariaLabel', 'banner / contentinfo']"
        heading="Landmarks"
        description="A landmark only on request: <code>banner</code> for the one page header, <code>contentinfo</code> for a page footer, <code>navigation</code> / <code>region</code> plus an <code>ariaLabel</code> for a named secondary bar. <code>ariaLabel</code> is written only when a landmark is set — on a role-less element it would be invalid ARIA."
        [code]="landmarkSnippet"
        language="ts"
      >
        <oge-app-bar
          landmark="navigation"
          ariaLabel="Project"
          color="inverse"
          size="sm"
        >
          <strong ogeAppBarStart>Project</strong>
          <a class="demo-app-bar-link" href="#landmarks">Overview</a>
          <a class="demo-app-bar-link" href="#landmarks">Issues</a>
          <a class="demo-app-bar-link" href="#landmarks">Settings</a>
        </oge-app-bar>
      </app-demo-card>
    }
  `,
  styles: `
    .demo-app-bar-btn {
      min-block-size: 32px;
      padding: 4px 10px;
      border: 1px solid currentColor;
      border-radius: 6px;
      background: transparent;
      color: inherit;
      font: inherit;
      text-transform: capitalize;
    }
    .demo-app-bar-btn[aria-pressed='true'] {
      background: var(--oge-accent-soft);
      font-weight: 600;
    }
    .demo-app-bar-link {
      color: inherit;
      text-decoration: underline;
    }
    .demo-app-bar-scroll {
      max-block-size: 240px;
      overflow: auto;
      border: 1px solid var(--oge-border-color);
      border-radius: 8px;
    }
  `,
})
export class LayoutAppBarPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_LAYOUT_APP_BAR_SECTIONS;
  protected readonly sectionsSnippet = SECTIONS_SNIPPET;
  protected readonly colorsSnippet = COLORS_SNIPPET;
  protected readonly stickySnippet = STICKY_SNIPPET;
  protected readonly bottomSnippet = BOTTOM_SNIPPET;
  protected readonly landmarkSnippet = LANDMARK_SNIPPET;

  protected readonly last = signal('—');
  protected readonly tab = signal('home');
  protected readonly tabs = ['home', 'search', 'me'] as const;
  protected readonly article = APP_BAR_ARTICLE;
  protected readonly messages = APP_BAR_MESSAGES;
}
