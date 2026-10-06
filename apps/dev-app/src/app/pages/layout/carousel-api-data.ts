import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/layout/carousel/src/** and
 * packages/behavior/src/lib/layout/carousel-core.ts — keep in sync with the
 * source TSDoc when the public API changes.
 */

const ITEM_FIELDS =
  "<code>key?</code>, <code>image?</code>, <code>imageAlt?</code> (default <code>''</code> = decorative), <code>title?</code>, <code>description?</code>, <code>thumbnail?</code>, <code>label?</code>";

export const OGE_CAROUSEL_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'items',
          type: 'readonly OgeCarouselItem[]',
          default: '[]',
          description: `Data-driven slides, rendered after the declarative <code>oge-carousel-slide</code> children. Fields: ${ITEM_FIELDS}. The default template draws the image and a frosted caption.`,
        },
        {
          name: 'selectedIndex',
          type: 'number (model)',
          default: '0',
          description:
            'Index of the first visible slide — two-way, clamped to the slides (with several per view, to <code>count - slidesPerView</code>).',
        },
        {
          name: 'slidesPerView',
          type: 'number',
          default: '1',
          description:
            'Slides shown side by side. Above one the picker switches from the APG tab list to a row of buttons, because a picker entry no longer maps to one slide.',
        },
        {
          name: 'gap',
          type: 'number | string | undefined',
          default: '0 (one per view) / 16 (several)',
          description: 'Space between slides — px number or any CSS length.',
        },
        {
          name: 'height',
          type: 'number | string | undefined',
          description:
            'Height of the slide viewport (px number or CSS length). Without it the track takes the tallest slide.',
        },
        {
          name: 'indicators',
          type: "'dots' | 'thumbnails' | 'none'",
          default: "config ?? 'dots'",
          description:
            'The picker under the slides. Thumbnails are decorative images (the tab keeps its "Slide N" name); hidden with one reachable position.',
        },
        {
          name: 'showNavigation',
          type: 'boolean | undefined',
          default: 'config ?? true',
          description:
            'The previous / next buttons over the viewport edges. At an end without <code>loop</code> they are <code>aria-disabled</code> (they keep focus) rather than <code>disabled</code>.',
        },
        {
          name: 'loop',
          type: 'boolean | undefined',
          default: 'config ?? false',
          description:
            'Wraps the buttons, the picker keys and swipes from the last slide to the first. The carousel rewinds — it never clones slides, so the accessibility tree always holds the real count.',
        },
        {
          name: 'autoplay',
          type: 'boolean',
          default: 'false',
          description:
            'Rotates the slides and renders the rotation control first in the Tab order (WCAG 2.2.2). Pauses while hovered or while the tab is hidden; keyboard focus entering the carousel <strong>stops</strong> it until the user restarts it (APG). Rotation always wraps. Starts stopped under <code>prefers-reduced-motion</code>.',
        },
        {
          name: 'autoplayInterval',
          type: 'number | undefined',
          default: 'config ?? 5000',
          description:
            'Rotation interval in ms (at least 1000). Every manual move restarts the full interval.',
        },
        {
          name: 'pauseOnHover',
          type: 'boolean',
          default: 'true',
          description:
            'Pauses the rotation while a mouse or pen pointer is over the carousel.',
        },
        {
          name: 'swipeEnabled',
          type: 'boolean',
          default: 'true',
          description:
            'Lets touch, pen and mouse drags move between slides on the shared pointer gesture (vertical swipes still scroll the page; Escape cancels a drag).',
        },
        {
          name: 'locale',
          type: 'string | undefined',
          default: 'config ?? LOCALE_ID',
          description: 'BCP 47 locale the slide numbers are formatted in.',
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          description:
            'Accessible name. Set, the host is a named <code>region</code>; unset, a <code>group</code> named by the <code>label</code> message (no unnamed landmark).',
        },
      ],
    },
  ],
  methods: [
    {
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
            "Starts the rotation (only while <code>autoplay</code> is on); emits <code>autoplayChanged</code> with <code>source: 'api'</code>.",
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
          name: 'selectedIndexChange',
          type: 'number',
          description: 'The banana half of <code>[(selectedIndex)]</code>.',
        },
        {
          name: 'slideChanged',
          type: 'OgeCarouselSlideChangedEvent',
          description:
            "The first visible slide changed: <code>index</code>, <code>previousIndex</code> and <code>source</code> (<code>'next'</code>, <code>'previous'</code>, <code>'picker'</code>, <code>'swipe'</code>, <code>'autoplay'</code>, <code>'api'</code>).",
        },
        {
          name: 'autoplayChanged',
          type: 'OgeCarouselAutoplayChangedEvent',
          description:
            "The rotation was started or stopped: <code>playing</code> and <code>source</code> (<code>'user'</code> — the rotation control or focus entering — or <code>'api'</code>). Temporary hover / hidden-tab pauses are not reported.",
        },
      ],
    },
  ],
  types: [
    {
      title: 'Declarative slides & templates',
      entries: [
        {
          name: 'OgeCarouselSlide',
          type: 'component <oge-carousel-slide>',
          description:
            'One declarative slide; projected content is the body. Inputs: <code>label</code> (the slide name prefix), <code>thumbnail</code>, <code>visible</code>.',
        },
        {
          name: 'OgeCarouselSlideTemplate',
          type: '[ogeCarouselSlideTemplate]',
          description:
            'Structural directive replacing the image + caption of every <code>items</code> slide. The carousel keeps the slide role, the name and the <code>inert</code> state.',
        },
        {
          name: 'OgeCarouselSlideTemplateContext',
          type: '{ $implicit: OgeCarouselItem; index: number; count: number; active: boolean }',
          description: 'Context of the slide template.',
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
          description:
            'The APG picker shape (<code>ogeCarouselPickerMode(slidesPerView)</code>).',
        },
        {
          name: 'OgeCarouselChangeSource',
          type: "'next' | 'previous' | 'picker' | 'swipe' | 'autoplay' | 'api'",
          description: 'What moved the carousel.',
        },
        {
          name: 'OgeCarouselSlideChangedEvent',
          type: '{ index: number; previousIndex: number; source: OgeCarouselChangeSource }',
          description: 'Payload of <code>slideChanged</code>.',
        },
        {
          name: 'OgeCarouselAutoplayChangedEvent',
          type: "{ playing: boolean; source: 'user' | 'api' }",
          description: 'Payload of <code>autoplayChanged</code>.',
        },
      ],
    },
  ],
};

export const OGE_CAROUSEL_CONFIG_API: ApiSections = {
  properties: [
    {
      title: 'provideOgeCarouselConfig()',
      entries: [
        {
          name: 'messages',
          type: 'OgeCarouselMessages',
          description:
            'Every user-facing string: the role descriptions <code>carousel</code> / <code>slide</code>, the fallback <code>label</code>, <code>previous</code>, <code>next</code>, <code>play</code>, <code>pause</code>, <code>picker</code>, and the numbered names <code>slideLabel</code> (<code>{index} of {count}</code>), <code>slideTitleLabel</code> (<code>{title}, {index} of {count}</code>) and <code>goToSlide</code> (<code>Slide {index}</code>). Translated in every <code>&#64;oge-ui/locales</code> pack (<code>layout.carousel</code>).',
        },
        {
          name: 'indicators / loop / autoplayInterval / showNavigation / locale',
          type: '—',
          description:
            'Defaults for the matching inputs. Pass a function for a live config.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'provideOgeCarouselConfig',
          type: '(config: OgeCarouselConfigInput | (() => OgeCarouselConfigInput)) => Provider',
          description:
            'Application- or component-scoped defaults; a function makes the config live.',
        },
        {
          name: 'OGE_CAROUSEL_CONFIG',
          type: 'InjectionToken<OgeCarouselConfig>',
          description: 'The resolved config the carousel injects.',
        },
        {
          name: 'OGE_DEFAULT_CAROUSEL_CONFIG',
          type: 'OgeCarouselConfig',
          description: 'The defaults (from <code>&#64;oge-ui/behavior</code>).',
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
