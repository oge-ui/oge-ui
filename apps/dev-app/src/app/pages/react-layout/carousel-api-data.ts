import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/react/layout/src/lib/carousel.tsx — keep in sync
 * with the source TSDoc when the public API changes.
 *
 * Block-for-block mirror of `../layout/carousel-api-data.ts`: the same props,
 * `onX` callbacks for the outputs, `selectedIndex` / `defaultSelectedIndex` /
 * `onSelectedIndexChange` for the `[(selectedIndex)]` model, `renderSlide`
 * for `[ogeCarouselSlideTemplate]` and `<OgeCarouselSlide>` for
 * `<oge-carousel-slide>`.
 */

const ITEM_FIELDS =
  "<code>key?</code>, <code>image?</code> (through <code>sanitizeResourceUrl</code>), <code>imageAlt?</code> (default <code>''</code> = decorative), <code>title?</code>, <code>description?</code>, <code>thumbnail?</code>, <code>label?</code>";

export const OGE_REACT_CAROUSEL_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'items',
          type: 'readonly OgeCarouselItem[]',
          default: '[]',
          description: `Data-driven slides, rendered after the declarative <code>&lt;OgeCarouselSlide&gt;</code> children. Fields: ${ITEM_FIELDS}. The default render draws the image and a frosted caption.`,
        },
        {
          name: 'selectedIndex',
          type: 'number',
          default: '0',
          description:
            'Index of the first visible slide (controlled; <code>defaultSelectedIndex</code> when uncontrolled), clamped to the slides.',
        },
        {
          name: 'slidesPerView',
          type: 'number',
          default: '1',
          description:
            'Slides shown side by side. Above one the picker switches from the APG tab list to a row of buttons.',
        },
        {
          name: 'gap',
          type: 'number | string',
          default: '0 (one per view) / 16 (several)',
          description: 'Space between slides — px number or any CSS length.',
        },
        {
          name: 'height',
          type: 'number | string',
          description:
            'Height of the slide viewport (px number or CSS length). Without it the track takes the tallest slide.',
        },
        {
          name: 'indicators',
          type: "'dots' | 'thumbnails' | 'none'",
          default: "config ?? 'dots'",
          description:
            'The picker under the slides. Thumbnails are decorative images (the tab keeps its "Slide N" name).',
        },
        {
          name: 'showNavigation',
          type: 'boolean',
          default: 'config ?? true',
          description:
            'The previous / next buttons; <code>aria-disabled</code> at an end without <code>loop</code>.',
        },
        {
          name: 'loop',
          type: 'boolean',
          default: 'config ?? false',
          description:
            'Wraps the buttons, the picker keys and swipes. The carousel rewinds rather than cloning slides.',
        },
        {
          name: 'autoplay',
          type: 'boolean',
          default: 'false',
          description:
            'Rotates the slides and renders the rotation control first (WCAG 2.2.2). Pauses while hovered or hidden; keyboard focus entering stops it until the user restarts it. Starts stopped under <code>prefers-reduced-motion</code>.',
        },
        {
          name: 'autoplayInterval',
          type: 'number',
          default: 'config ?? 5000',
          description: 'Rotation interval in ms (at least 1000).',
        },
        {
          name: 'pauseOnHover',
          type: 'boolean',
          default: 'true',
          description:
            'Pauses the rotation while a mouse or pen pointer is over it.',
        },
        {
          name: 'swipeEnabled',
          type: 'boolean',
          default: 'true',
          description:
            'Lets touch, pen and mouse drags move between slides on the shared pointer gesture.',
        },
        {
          name: 'locale',
          type: 'string',
          default: 'config ?? runtime default',
          description: 'BCP 47 locale the slide numbers are formatted in.',
        },
        {
          name: 'ariaLabel',
          type: 'string',
          description:
            'Accessible name. Set, the host is a named <code>region</code>; unset, a <code>group</code> named by the <code>label</code> message.',
        },
        {
          name: 'renderSlide',
          type: '(context: OgeCarouselSlideRenderContext) => ReactNode',
          description:
            'Replaces the image + caption of every <code>items</code> slide (the Angular <code>[ogeCarouselSlideTemplate]</code>).',
        },
        {
          name: 'children',
          type: 'ReactNode',
          description:
            'Declarative <code>&lt;OgeCarouselSlide&gt;</code> elements (the Angular <code>&lt;oge-carousel-slide&gt;</code>).',
        },
        {
          name: 'className',
          type: 'string',
          description: 'Extra classes on the host element.',
        },
        {
          name: 'style',
          type: 'CSSProperties',
          description: 'Inline styles on the host element.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Ref handle (OgeCarouselHandle)',
      entries: [
        {
          name: 'next()',
          type: '() => void',
          description:
            'Shows the next slide (wraps only with <code>loop</code>).',
        },
        {
          name: 'previous()',
          type: '() => void',
          description:
            'Shows the previous slide (wraps only with <code>loop</code>).',
        },
        {
          name: 'goTo(index)',
          type: '(index: number) => void',
          description: 'Shows slide <code>index</code> (clamped).',
        },
        {
          name: 'play()',
          type: '() => void',
          description:
            'Starts the rotation (only while <code>autoplay</code> is on).',
        },
        {
          name: 'pause()',
          type: '() => void',
          description:
            'Stops the rotation until the user or <code>play()</code> restarts it.',
        },
        {
          name: 'focus()',
          type: '() => void',
          description:
            'Focuses the selected picker entry, else the first control.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onSelectedIndexChange',
          type: '(index: number) => void',
          description: 'The index a move committed.',
        },
        {
          name: 'onSlideChanged',
          type: '(event: OgeCarouselSlideChangedEvent) => void',
          description:
            'The first visible slide changed: <code>index</code>, <code>previousIndex</code>, <code>source</code>.',
        },
        {
          name: 'onAutoplayChanged',
          type: '(event: OgeCarouselAutoplayChangedEvent) => void',
          description:
            "The rotation was started or stopped by the user or the API (<code>playing</code>, <code>source: 'user' | 'api'</code>).",
        },
      ],
    },
  ],
  types: [
    {
      title: 'Declarative slides & render props',
      entries: [
        {
          name: 'OgeCarouselSlide',
          type: 'component',
          description:
            'One declarative slide; its children are the body. Props: <code>label</code>, <code>thumbnail</code>, <code>visible</code>. Renders nothing by itself — the carousel reads its props.',
        },
        {
          name: 'OgeCarouselSlideRenderContext',
          type: '{ item: OgeCarouselItem; index: number; count: number; active: boolean }',
          description: 'Context of <code>renderSlide</code>.',
        },
        {
          name: 'OgeCarouselProps / OgeCarouselSlideProps',
          type: 'interface',
          description: 'Props of the two components.',
        },
        {
          name: 'OgeCarouselHandle',
          type: '{ next; previous; goTo; play; pause; focus }',
          description: 'The ref handle.',
        },
      ],
    },
    {
      title: 'Vocabulary',
      entries: [
        {
          name: 'OgeCarouselItem',
          type: 'interface',
          description: `One data-driven slide: ${ITEM_FIELDS}.`,
        },
        {
          name: 'OgeCarouselIndicators',
          type: "'dots' | 'thumbnails' | 'none'",
          description: 'Picker union.',
        },
        {
          name: 'OgeCarouselPickerMode',
          type: "'tabs' | 'buttons'",
          description: 'The APG picker shape.',
        },
        {
          name: 'OgeCarouselChangeSource',
          type: "'next' | 'previous' | 'picker' | 'swipe' | 'autoplay' | 'api'",
          description: 'What moved the carousel.',
        },
        {
          name: 'OgeCarouselSlideChangedEvent',
          type: '{ index: number; previousIndex: number; source: OgeCarouselChangeSource }',
          description: 'Payload of <code>onSlideChanged</code>.',
        },
        {
          name: 'OgeCarouselAutoplayChangedEvent',
          type: "{ playing: boolean; source: 'user' | 'api' }",
          description: 'Payload of <code>onAutoplayChanged</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_CAROUSEL_CONFIG_API: ApiSections = {
  properties: [
    {
      title: 'OgeCarouselConfigProvider',
      entries: [
        {
          name: 'messages',
          type: 'OgeCarouselMessages',
          description:
            'Every user-facing string: the role descriptions <code>carousel</code> / <code>slide</code>, the fallback <code>label</code>, <code>previous</code>, <code>next</code>, <code>play</code>, <code>pause</code>, <code>picker</code>, <code>slideLabel</code>, <code>slideTitleLabel</code> and <code>goToSlide</code>. Translated in every <code>&#64;oge-ui/locales</code> pack (<code>layout.carousel</code>).',
        },
        {
          name: 'indicators / loop / autoplayInterval / showNavigation / locale',
          type: '—',
          description:
            'Defaults for the matching props. <code>useOgeCarouselConfig()</code> reads the resolved value.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeCarouselConfigProvider',
          type: '({ config?, children }) => JSX.Element',
          description: 'Subtree-scoped defaults.',
        },
        {
          name: 'useOgeCarouselConfig',
          type: '() => OgeCarouselConfig',
          description: 'Reads the resolved config.',
        },
        {
          name: 'OGE_DEFAULT_CAROUSEL_CONFIG',
          type: 'OgeCarouselConfig',
          description: 'The defaults.',
        },
        {
          name: 'OGE_DEFAULT_CAROUSEL_MESSAGES',
          type: 'OgeCarouselMessages',
          description: 'The English catalog.',
        },
        {
          name: 'OgeCarouselConfig',
          type: '{ messages: OgeCarouselMessages; indicators?; loop?; autoplayInterval?; showNavigation?; locale? }',
          description: 'Resolved config shape.',
        },
        {
          name: 'OgeCarouselConfigInput',
          type: 'Partial<OgeCarouselConfig> with partial messages',
          description: 'What the provider accepts.',
        },
        {
          name: 'OgeCarouselMessages',
          type: '{ carousel; slide; label; previous; next; play; pause; picker; slideLabel; slideTitleLabel; goToSlide }',
          description: 'The carousel catalog.',
        },
      ],
    },
  ],
};
