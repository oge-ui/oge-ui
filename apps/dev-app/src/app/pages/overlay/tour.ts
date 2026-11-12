import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { OgeTour, type OgeTourClosedEvent } from '@oge-ui/overlay';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_OVERLAY_TOUR_SECTIONS,
  ReactOverlayTourDemos,
} from '../react-overlay/tour';
import { TOUR_STEPS, TOUR_WELCOME_STEPS } from './tour-demo-data';
import { TOUR_BASIC_SNIPPET, TOUR_CONTROLLED_SNIPPET } from './tour-snippets';

const SECTIONS = ['Guided tour', 'Resuming & centered steps'] as const;

const TOUR_BUTTON =
  'rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700';

@Component({
  selector: 'app-overlay-tour',
  imports: [OgeTour, DemoCard, DocHeader, PageToc, ReactOverlayTourDemos],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Tour"
      category="Overlay"
      categoryLink="/components/overlay"
      [chips]="['spotlight', 'keyboard', 'reduced motion', 'RTL']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeTour&gt;</code> from
          <code>&#64;oge-ui/react-overlay</code> walks people through a page,
          with the same geometry, markup and stylesheet as the Angular
          component.
        </p>
      } @else {
        <p>
          <code>oge-tour</code> walks people through a page — onboarding, a new
          feature, a changed layout — one card at a time.
        </p>
      }
      <p>
        Each step dims the page, cuts a spotlight around its target, scrolls it
        into view and places the card beside it, flipping to fit; a step without
        a target centers the card. The card is a modal dialog named by its
        title, with Back, Next / Done and Skip; → and ← move between steps
        (mirrored in RTL), Escape skips and focus returns where it was. Under
        <code>prefers-reduced-motion</code> the spotlight jumps instead of
        gliding and scrolling is instant.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-overlay-tour-demos />
    } @else {
      <app-demo-card
        [chips]="['steps', 'target', 'placement', 'start()', 'closed']"
        heading="Guided tour"
        description="Targets are CSS selectors here (an element or a function works too); <code>placement</code> picks the side of the card, which flips when it does not fit. The last step has no target, so its card is centered. <code>closed</code> reports how it ended — done, skip, escape, backdrop or api — so an app can show a tour only once."
        [code]="basicSnippet"
        language="ts"
      >
        <div
          class="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-800"
        >
          <input
            id="tour-demo-search"
            type="search"
            aria-label="Search"
            placeholder="Search…"
            class="min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-transparent"
          />
          <button id="tour-demo-filters" type="button" [class]="button">
            Filters
          </button>
          <button id="tour-demo-export" type="button" [class]="button">
            Export
          </button>
        </div>
        <div class="mt-3 flex items-center gap-3">
          <button
            type="button"
            [class]="button"
            data-testid="start-tour"
            (click)="tour.start()"
          >
            Take the tour
          </button>
          <span class="text-sm" data-testid="tour-last">{{ last() }}</span>
        </div>
        <oge-tour #tour [steps]="steps" (closed)="onClosed($event)" />
      </app-demo-card>

      <app-demo-card
        [chips]="['step', 'opened', 'closeOnBackdropClick']"
        heading="Resuming & centered steps"
        description="<code>[(step)]</code> and <code>[(opened)]</code> are two-way, so a tour can resume where the user left off. Steps without a target center the card over a dimmed page; <code>closeOnBackdropClick</code> lets a press on the page skip the tour (off by default)."
        [code]="controlledSnippet"
        language="ts"
      >
        <button
          type="button"
          [class]="button"
          data-testid="resume-tour"
          (click)="opened.set(true)"
        >
          Resume the tour
        </button>
        <span class="ms-3 text-sm" data-testid="tour-step"
          >Step {{ step() + 1 }} of {{ welcome.length }}</span
        >
        <oge-tour
          [steps]="welcome"
          [(step)]="step"
          [(opened)]="opened"
          [closeOnBackdropClick]="true"
        />
      </app-demo-card>
    }
  `,
})
export class OverlayTourPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_OVERLAY_TOUR_SECTIONS;
  protected readonly basicSnippet = TOUR_BASIC_SNIPPET;
  protected readonly controlledSnippet = TOUR_CONTROLLED_SNIPPET;
  protected readonly button = TOUR_BUTTON;
  protected readonly steps = TOUR_STEPS;
  protected readonly welcome = TOUR_WELCOME_STEPS;
  protected readonly last = signal('Not taken yet');
  protected readonly step = signal(0);
  protected readonly opened = signal(false);

  protected onClosed(event: OgeTourClosedEvent): void {
    this.last.set(`Closed by ${event.reason} on step ${event.step + 1}`);
  }
}
