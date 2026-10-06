import { demoSource } from '../../shared/demo-source';

const DESTINATIONS = `protected readonly destinations: OgeCarouselItem[] = [
  {
    key: 'coast',
    image: '/demo/carousel/coast.svg',
    imageAlt: 'A palm tree on a sandy beach by a calm blue sea',
    title: 'Turquoise Coast',
    description: 'Seven days of coves, ruins and slow mornings.',
  },
  {
    key: 'mountains',
    image: '/demo/carousel/mountains.svg',
    imageAlt: 'Snow-capped violet peaks under a pink evening sky',
    title: 'Kaçkar Mountains',
    description: 'Highland villages and the trail to the glacier lakes.',
  },
  {
    key: 'city',
    image: '/demo/carousel/city.svg',
    imageAlt: 'A city skyline with lit windows at sunset',
    title: 'Istanbul by night',
    description: 'Rooftops, ferries and the Bosphorus after dark.',
  },
];`;

export const CAROUSEL_BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeCarousel'] },
  types: { '@oge-ui/layout': ['OgeCarouselItem'] },
  template: `<!-- A named region with aria-roledescription="carousel"; every slide is a
     group named "Turquoise Coast, 1 of 3", and the slides out of view are
     inert. The dots are an APG tab list: arrows, Home and End. -->
<oge-carousel
  [items]="destinations"
  [(selectedIndex)]="index"
  [height]="320"
  ariaLabel="Featured destinations"
/>
<p>Showing slide {{ index() + 1 }}</p>`,
  body: `protected readonly index = signal(0);
${DESTINATIONS}`,
});

export const CAROUSEL_THUMBNAILS_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeCarousel'] },
  types: { '@oge-ui/layout': ['OgeCarouselItem'] },
  template: `<!-- Thumbnails come from each item's thumbnail (or its image) and are
     decorative: the tab is named "Slide 2". loop wraps the buttons, the
     picker keys and swipes from the last slide back to the first. -->
<oge-carousel
  [items]="destinations"
  indicators="thumbnails"
  [loop]="true"
  [height]="300"
  ariaLabel="Destinations with thumbnails"
/>`,
  body: DESTINATIONS,
});

export const CAROUSEL_AUTOPLAY_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeCarousel'] },
  types: {
    '@oge-ui/layout': ['OgeCarouselAutoplayChangedEvent', 'OgeCarouselItem'],
  },
  template: `<!-- WCAG 2.2.2: the rotation control is always rendered and comes first.
     Hovering pauses; keyboard focus entering the carousel stops it until the
     user presses play. The slides region is aria-live="off" while it
     rotates and "polite" once stopped. Under prefers-reduced-motion it
     starts stopped. -->
<oge-carousel
  #carousel
  [items]="destinations"
  [autoplay]="true"
  [autoplayInterval]="4000"
  [height]="300"
  ariaLabel="Rotating highlights"
  (slideChanged)="log('slide ' + ($event.index + 1) + ' via ' + $event.source)"
  (autoplayChanged)="onAutoplay($event)"
/>
<button type="button" (click)="carousel.play()">play()</button>
<button type="button" (click)="carousel.pause()">pause()</button>
<button type="button" (click)="carousel.goTo(0)">goTo(0)</button>
<p>{{ last() }}</p>`,
  body: `protected readonly last = signal('No events yet');
${DESTINATIONS}

protected log(message: string): void {
  this.last.set(message);
}

protected onAutoplay(event: OgeCarouselAutoplayChangedEvent): void {
  this.log((event.playing ? 'playing' : 'stopped') + ' by ' + event.source);
}`,
});

export const CAROUSEL_MULTI_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeCarousel', 'OgeCarouselSlideTemplate'] },
  types: { '@oge-ui/layout': ['OgeCarouselItem'] },
  template: `<!-- Several slides per view: the picker becomes a row of buttons (one
     per reachable position, aria-current on the current one), because a
     dot no longer maps to one slide. The template draws the content only;
     the carousel keeps the group role and the "N of M" name. -->
<oge-carousel
  [items]="products"
  [slidesPerView]="3"
  [gap]="16"
  ariaLabel="Recommended products"
>
  <ng-template ogeCarouselSlideTemplate let-item let-active="active">
    <div class="product">
      <strong>{{ item.title }}</strong>
      <span>{{ item.description }}</span>
      <button type="button" [disabled]="!active">Add to basket</button>
    </div>
  </ng-template>
</oge-carousel>`,
  body: `protected readonly products: OgeCarouselItem[] = [
  { key: 'p1', title: 'Desk lamp', description: '€49 · warm white' },
  { key: 'p2', title: 'Notebook', description: '€12 · dotted, A5' },
  { key: 'p3', title: 'Headphones', description: '€129 · noise cancelling' },
  { key: 'p4', title: 'Mug', description: '€15 · stoneware' },
  { key: 'p5', title: 'Backpack', description: '€89 · 20 litres' },
];`,
});

export const CAROUSEL_DECLARATIVE_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeCarousel', 'OgeCarouselSlide'] },
  template: `<!-- Declarative slides project any content. Off-screen slides are inert,
     so the link in a hidden slide never steals a Tab stop. -->
<oge-carousel ariaLabel="Release notes" [height]="200">
  <oge-carousel-slide label="Version 1.3">
    <h3>Version 1.3</h3>
    <p>Carousel, action sheet, list and data views, tile layouts.</p>
    <a href="#declarative-slides">Read the notes</a>
  </oge-carousel-slide>
  <oge-carousel-slide label="Version 1.2">
    <h3>Version 1.2</h3>
    <p>Avatars, badges, chips, alerts, timelines and app bars.</p>
  </oge-carousel-slide>
  <oge-carousel-slide label="Version 1.1">
    <h3>Version 1.1</h3>
    <p>The React render layer.</p>
  </oge-carousel-slide>
</oge-carousel>`,
});
