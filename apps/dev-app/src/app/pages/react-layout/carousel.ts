import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useRef, useState, type ReactNode } from 'react';
import {
  OgeCarousel,
  OgeCarouselSlide,
  type OgeCarouselHandle,
} from '@oge-ui/react-layout';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  CAROUSEL_DESTINATIONS,
  CAROUSEL_PRODUCTS,
} from '../layout/carousel-demo-data';
import { LAYOUT_CAROUSEL_DEMOS } from './carousel-snippets';

/**
 * TOC of the React view — the same five sections as the Angular carousel
 * page (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_LAYOUT_CAROUSEL_SECTIONS = [
  'Basics',
  'Thumbnails & loop',
  'Autoplay & rotation control',
  'Several slides per view',
  'Declarative slides',
] as const;

const BUTTON = 'rounded border px-2 py-1';

function BasicsDemo(): ReactNode {
  const [index, setIndex] = useState(0);
  return createElement(
    'div',
    null,
    createElement(OgeCarousel, {
      key: 'carousel',
      items: CAROUSEL_DESTINATIONS,
      selectedIndex: index,
      onSelectedIndexChange: setIndex,
      height: 320,
      ariaLabel: 'Featured destinations',
    }),
    createElement(
      'p',
      {
        key: 'index',
        className: 'mt-2 text-sm',
        'data-testid': 'carousel-index',
      },
      `Showing slide ${index + 1}`,
    ),
  );
}

function AutoplayDemo(): ReactNode {
  const carousel = useRef<OgeCarouselHandle>(null);
  const [last, setLast] = useState('No events yet');
  return createElement(
    'div',
    null,
    createElement(OgeCarousel, {
      key: 'carousel',
      ref: carousel,
      items: CAROUSEL_DESTINATIONS,
      autoplay: true,
      autoplayInterval: 4000,
      height: 300,
      ariaLabel: 'Rotating highlights',
      onSlideChanged: (e) => setLast(`slide ${e.index + 1} via ${e.source}`),
      onAutoplayChanged: (e) =>
        setLast(`${e.playing ? 'playing' : 'stopped'} by ${e.source}`),
    }),
    createElement(
      'div',
      { key: 'buttons', className: 'mt-3 flex flex-wrap gap-2 text-sm' },
      createElement(
        'button',
        {
          key: 'play',
          type: 'button',
          className: BUTTON,
          onClick: () => carousel.current?.play(),
        },
        'play()',
      ),
      createElement(
        'button',
        {
          key: 'pause',
          type: 'button',
          className: BUTTON,
          onClick: () => carousel.current?.pause(),
        },
        'pause()',
      ),
      createElement(
        'button',
        {
          key: 'goto',
          type: 'button',
          className: BUTTON,
          onClick: () => carousel.current?.goTo(0),
        },
        'goTo(0)',
      ),
    ),
    createElement(
      'p',
      { key: 'log', className: 'mt-2 text-sm', 'data-testid': 'carousel-log' },
      last,
    ),
  );
}

const note = (title: string, text: string, link?: boolean) =>
  createElement(
    'div',
    { className: 'demo-carousel-note' },
    createElement(
      'h3',
      { key: 'h', className: '!mt-0 text-base font-semibold' },
      title,
    ),
    createElement('p', { key: 'p', className: '!my-1 text-sm' }, text),
    link
      ? createElement(
          'a',
          {
            key: 'a',
            className: 'text-sm underline',
            href: '#declarative-slides',
          },
          'Read the notes',
        )
      : null,
  );

/**
 * The React half of the carousel page — rendered inside
 * `/components/carousel` when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-layout-carousel-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // the React carousel carries the class names but no styles of its own —
  // the docs pull the one SCSS file the package build compiles for it (not the
  // whole layout sheet: the anyComponentStyle budget is per component)
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/layout/carousel/src/carousel.scss',
  template: `
    <app-demo-card
      [chips]="['items', 'selectedIndex', 'ariaLabel', 'height']"
      heading="Basics"
      description="Data-driven slides draw an image and a frosted caption. The previous / next buttons are <code>aria-disabled</code> at the ends (they keep focus), the dots are an APG tab list (arrow keys, Home, End — mirrored in RTL), and a swipe or a mouse drag lands on the nearest slide past a fifth of its width."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basics" />
    </app-demo-card>

    <app-demo-card
      [chips]="['indicators: thumbnails', 'loop']"
      heading="Thumbnails & loop"
      description='<code>indicators="thumbnails"</code> draws a scrollable strip of decorative thumbnails — each tab is still named &ldquo;Slide 2&rdquo;. <code>loop</code> wraps the buttons, the picker keys and swipes from the last slide back to the first; the carousel rewinds rather than cloning slides, so assistive technology always sees the real count.'
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="thumbnails" />
    </app-demo-card>

    <app-demo-card
      [chips]="['autoplay', 'autoplayInterval', 'play()', 'pause()']"
      heading="Autoplay & rotation control"
      description='The rotation control is rendered first and always visible. Hovering pauses the rotation, a hidden tab holds it, and keyboard focus entering the carousel stops it until the user presses play — the APG rule. While it rotates the slides are <code>aria-live="off"</code>; once stopped, <code>polite</code>. Under <code>prefers-reduced-motion</code> it starts stopped.'
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="autoplay" />
    </app-demo-card>

    <app-demo-card
      [chips]="['slidesPerView', 'gap', 'renderSlide']"
      heading="Several slides per view"
      description="With <code>slidesPerView</code> above one the picker becomes the APG grouped carousel's row of buttons — one per reachable position, the current one <code>aria-current</code> — because a dot no longer maps to one slide. <code>renderSlide</code> replaces the image and caption; its context says whether the slide is in view."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="multi" />
    </app-demo-card>

    <app-demo-card
      [chips]="['OgeCarouselSlide', 'label', 'children']"
      heading="Declarative slides"
      description="<code>&amp;lt;OgeCarouselSlide&amp;gt;</code> children render any content before the <code>items</code> slides. Their <code>label</code> names the slide (&ldquo;Version 1.3, 1 of 3&rdquo;). Off-screen slides are <code>inert</code>, so the link in a hidden slide never takes a Tab stop."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="declarative" />
    </app-demo-card>
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
export class ReactLayoutCarouselDemos {
  protected readonly demos = LAYOUT_CAROUSEL_DEMOS;

  protected readonly basics = () => createElement(BasicsDemo);

  protected readonly thumbnails = () =>
    createElement(OgeCarousel, {
      items: CAROUSEL_DESTINATIONS,
      indicators: 'thumbnails',
      loop: true,
      height: 300,
      ariaLabel: 'Destinations with thumbnails',
    });

  protected readonly autoplay = () => createElement(AutoplayDemo);

  protected readonly multi = () =>
    createElement(OgeCarousel, {
      items: CAROUSEL_PRODUCTS,
      slidesPerView: 3,
      gap: 16,
      ariaLabel: 'Recommended products',
      renderSlide: ({ item, active }) =>
        createElement(
          'div',
          { className: 'demo-carousel-product' },
          createElement('strong', { key: 't' }, item.title),
          createElement(
            'span',
            { key: 'd', className: 'text-sm' },
            item.description,
          ),
          createElement(
            'button',
            {
              key: 'b',
              type: 'button',
              className: 'rounded border px-2 py-1 text-sm',
              disabled: !active,
            },
            'Add to basket',
          ),
        ),
    });

  protected readonly declarative = () =>
    createElement(
      OgeCarousel,
      { ariaLabel: 'Release notes', height: 200 },
      createElement(
        OgeCarouselSlide,
        { key: 'v13', label: 'Version 1.3' },
        note(
          'Version 1.3',
          'Carousel, action sheet, list and data views, tile layouts.',
          true,
        ),
      ),
      createElement(
        OgeCarouselSlide,
        { key: 'v12', label: 'Version 1.2' },
        note(
          'Version 1.2',
          'Avatars, badges, chips, alerts, timelines and app bars.',
        ),
      ),
      createElement(
        OgeCarouselSlide,
        { key: 'v11', label: 'Version 1.1' },
        note('Version 1.1', 'The React render layer.'),
      ),
    );
}
