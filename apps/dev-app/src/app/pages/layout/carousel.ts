import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  OgeCarousel,
  OgeCarouselSlide,
  OgeCarouselSlideTemplate,
  type OgeCarouselAutoplayChangedEvent,
} from '@oge-ui/layout/carousel';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_LAYOUT_CAROUSEL_SECTIONS,
  ReactLayoutCarouselDemos,
} from '../react-layout/carousel';
import {
  CAROUSEL_AUTOPLAY_SNIPPET,
  CAROUSEL_BASIC_SNIPPET,
  CAROUSEL_DECLARATIVE_SNIPPET,
  CAROUSEL_MULTI_SNIPPET,
  CAROUSEL_THUMBNAILS_SNIPPET,
} from './carousel-snippets';
import { CAROUSEL_DESTINATIONS, CAROUSEL_PRODUCTS } from './carousel-demo-data';

const SECTIONS = [
  'Basics',
  'Thumbnails & loop',
  'Autoplay & rotation control',
  'Several slides per view',
  'Declarative slides',
] as const;

@Component({
  selector: 'app-layout-carousel',
  imports: [
    OgeCarousel,
    OgeCarouselSlide,
    OgeCarouselSlideTemplate,
    DemoCard,
    DocHeader,
    PageToc,
    ReactLayoutCarouselDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Carousel"
      category="Layout"
      categoryLink="/components/carousel"
      [chips]="['APG carousel', 'swipe', 'autoplay', 'thumbnails', 'RTL']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeCarousel&gt;</code> from
          <code>&#64;oge-ui/react-layout</code> is a slide show — an image
          gallery, a hero banner, a product row — with the same markup,
          stylesheet and machines as the Angular component.
        </p>
      } @else {
        <p>
          <code>oge-carousel</code> is a slide show — an image gallery, a hero
          banner, a product row — with previous / next buttons, a dot or
          thumbnail picker, looping and auto-rotation.
        </p>
      }
      <p>
        It follows the WAI-ARIA APG <strong>carousel</strong> pattern: a region
        with <code>aria-roledescription="carousel"</code>, slides named "2 of
        5", the off-screen slides <code>inert</code>, a tab-list picker with one
        slide per view and a button row with several. Rotation pauses on hover,
        stops when keyboard focus enters, and always has a visible rotation
        control (WCAG 2.2.2). The track is a scroll-snap container moved by
        script and by swipes on the shared pointer gesture, so touch, mouse and
        RTL all land on whole slides.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-layout-carousel-demos />
    } @else {
      <app-demo-card
        [chips]="['items', 'selectedIndex', 'ariaLabel', 'height']"
        heading="Basics"
        description="Data-driven slides draw an image and a frosted caption. The previous / next buttons are <code>aria-disabled</code> at the ends (they keep focus), the dots are an APG tab list (arrow keys, Home, End — mirrored in RTL), and a swipe or a mouse drag lands on the nearest slide past a fifth of its width."
        [code]="basicSnippet"
        language="ts"
      >
        <oge-carousel
          [items]="destinations"
          [(selectedIndex)]="index"
          [height]="320"
          ariaLabel="Featured destinations"
        />
        <p class="mt-2 text-sm" data-testid="carousel-index">
          Showing slide {{ index() + 1 }}
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['indicators: thumbnails', 'loop']"
        heading="Thumbnails & loop"
        description='<code>indicators="thumbnails"</code> draws a scrollable strip of decorative thumbnails — each tab is still named &ldquo;Slide 2&rdquo;. <code>loop</code> wraps the buttons, the picker keys and swipes from the last slide back to the first; the carousel rewinds rather than cloning slides, so assistive technology always sees the real count.'
        [code]="thumbnailsSnippet"
        language="ts"
      >
        <oge-carousel
          [items]="destinations"
          indicators="thumbnails"
          [loop]="true"
          [height]="300"
          ariaLabel="Destinations with thumbnails"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['autoplay', 'autoplayInterval', 'play()', 'pause()']"
        heading="Autoplay & rotation control"
        description='The rotation control is rendered first and always visible. Hovering pauses the rotation, a hidden tab holds it, and keyboard focus entering the carousel stops it until the user presses play — the APG rule. While it rotates the slides are <code>aria-live="off"</code>; once stopped, <code>polite</code>. Under <code>prefers-reduced-motion</code> it starts stopped.'
        [code]="autoplaySnippet"
        language="ts"
      >
        <oge-carousel
          #carousel
          [items]="destinations"
          [autoplay]="true"
          [autoplayInterval]="4000"
          [height]="300"
          ariaLabel="Rotating highlights"
          (slideChanged)="
            log('slide ' + ($event.index + 1) + ' via ' + $event.source)
          "
          (autoplayChanged)="onAutoplay($event)"
        />
        <div class="mt-3 flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            class="rounded border px-2 py-1"
            (click)="carousel.play()"
          >
            play()
          </button>
          <button
            type="button"
            class="rounded border px-2 py-1"
            (click)="carousel.pause()"
          >
            pause()
          </button>
          <button
            type="button"
            class="rounded border px-2 py-1"
            (click)="carousel.goTo(0)"
          >
            goTo(0)
          </button>
        </div>
        <p class="mt-2 text-sm" data-testid="carousel-log">{{ last() }}</p>
      </app-demo-card>

      <app-demo-card
        [chips]="['slidesPerView', 'gap', 'ogeCarouselSlideTemplate']"
        heading="Several slides per view"
        description="With <code>slidesPerView</code> above one the picker becomes the APG grouped carousel's row of buttons — one per reachable position, the current one <code>aria-current</code> — because a dot no longer maps to one slide. <code>[ogeCarouselSlideTemplate]</code> replaces the image and caption; its context says whether the slide is in view."
        [code]="multiSnippet"
        language="ts"
      >
        <oge-carousel
          [items]="products"
          [slidesPerView]="3"
          [gap]="16"
          ariaLabel="Recommended products"
        >
          <ng-template ogeCarouselSlideTemplate let-item let-active="active">
            <div class="demo-carousel-product">
              <strong>{{ item.title }}</strong>
              <span class="text-sm">{{ item.description }}</span>
              <button
                type="button"
                class="rounded border px-2 py-1 text-sm"
                [disabled]="!active"
              >
                Add to basket
              </button>
            </div>
          </ng-template>
        </oge-carousel>
      </app-demo-card>

      <app-demo-card
        [chips]="['oge-carousel-slide', 'label', 'projected content']"
        heading="Declarative slides"
        description="<code>&amp;lt;oge-carousel-slide&amp;gt;</code> children project any content and render before the <code>items</code> slides. Their <code>label</code> names the slide (&ldquo;Version 1.3, 1 of 3&rdquo;). Off-screen slides are <code>inert</code>, so the link in a hidden slide never takes a Tab stop."
        [code]="declarativeSnippet"
        language="ts"
      >
        <oge-carousel ariaLabel="Release notes" [height]="200">
          <oge-carousel-slide label="Version 1.3">
            <div class="demo-carousel-note">
              <h3 class="!mt-0 text-base font-semibold">Version 1.3</h3>
              <p class="!my-1 text-sm">
                Carousel, action sheet, list and data views, tile layouts.
              </p>
              <a class="text-sm underline" href="#declarative-slides"
                >Read the notes</a
              >
            </div>
          </oge-carousel-slide>
          <oge-carousel-slide label="Version 1.2">
            <div class="demo-carousel-note">
              <h3 class="!mt-0 text-base font-semibold">Version 1.2</h3>
              <p class="!my-1 text-sm">
                Avatars, badges, chips, alerts, timelines and app bars.
              </p>
            </div>
          </oge-carousel-slide>
          <oge-carousel-slide label="Version 1.1">
            <div class="demo-carousel-note">
              <h3 class="!mt-0 text-base font-semibold">Version 1.1</h3>
              <p class="!my-1 text-sm">The React render layer.</p>
            </div>
          </oge-carousel-slide>
        </oge-carousel>
      </app-demo-card>
    }
  `,
  styles: `
    .demo-carousel-product {
      display: grid;
      gap: 6px;
      align-content: start;
      block-size: 100%;
      padding: 16px;
    }
    .demo-carousel-note {
      display: grid;
      align-content: center;
      block-size: 100%;
      padding: 16px 64px;
    }
  `,
})
export class LayoutCarouselPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_LAYOUT_CAROUSEL_SECTIONS;
  protected readonly basicSnippet = CAROUSEL_BASIC_SNIPPET;
  protected readonly thumbnailsSnippet = CAROUSEL_THUMBNAILS_SNIPPET;
  protected readonly autoplaySnippet = CAROUSEL_AUTOPLAY_SNIPPET;
  protected readonly multiSnippet = CAROUSEL_MULTI_SNIPPET;
  protected readonly declarativeSnippet = CAROUSEL_DECLARATIVE_SNIPPET;

  protected readonly destinations = CAROUSEL_DESTINATIONS;
  protected readonly products = CAROUSEL_PRODUCTS;
  protected readonly index = signal(0);
  protected readonly last = signal('No events yet');

  protected log(message: string): void {
    this.last.set(message);
  }

  protected onAutoplay(event: OgeCarouselAutoplayChangedEvent): void {
    this.log(`${event.playing ? 'playing' : 'stopped'} by ${event.source}`);
  }
}
