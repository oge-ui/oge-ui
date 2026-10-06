import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React carousel page. Pure data, no React imports — the
 * `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../layout/carousel.ts` (`docs/REACT-PARITY.md`):
 * same five sections, same order, same example content; the Angular
 * `[ogeCarouselSlideTemplate]` arrives as the `renderSlide` render prop and
 * `<oge-carousel-slide>` as `<OgeCarouselSlide>`.
 */
const DESTINATIONS = `const destinations: OgeCarouselItem[] = [
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

export const LAYOUT_CAROUSEL_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Basics',
    description:
      'Data-driven slides draw an image and a frosted caption. The previous / next buttons are aria-disabled at the ends, the dots are an APG tab list (arrow keys, Home, End — mirrored in RTL), and a swipe or a mouse drag lands on the nearest slide.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeCarousel'] },
      types: { '@oge-ui/react-layout': ['OgeCarouselItem'] },
      name: 'CarouselBasicsDemo',
      before: DESTINATIONS,
      body: `const [index, setIndex] = useState(0);`,
      jsx: `<>
  <OgeCarousel
    items={destinations}
    selectedIndex={index}
    onSelectedIndexChange={setIndex}
    height={320}
    ariaLabel="Featured destinations"
  />
  <p>Showing slide {index + 1}</p>
</>`,
    }),
  },
  {
    title: 'Thumbnails & loop',
    description:
      'indicators="thumbnails" draws decorative thumbnails (each tab is still named "Slide 2"); loop wraps the buttons, the picker keys and swipes from the last slide back to the first.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeCarousel'] },
      types: { '@oge-ui/react-layout': ['OgeCarouselItem'] },
      name: 'CarouselThumbnailsDemo',
      before: DESTINATIONS,
      jsx: `<OgeCarousel
  items={destinations}
  indicators="thumbnails"
  loop
  height={300}
  ariaLabel="Destinations with thumbnails"
/>`,
    }),
  },
  {
    title: 'Autoplay & rotation control',
    description:
      'The rotation control is rendered first and always visible (WCAG 2.2.2). Hover pauses, keyboard focus entering stops the rotation until the user presses play, and the slides are aria-live="off" while rotating. The ref handle exposes play(), pause() and goTo().',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: { '@oge-ui/react-layout': ['OgeCarousel'] },
      types: {
        '@oge-ui/react-layout': ['OgeCarouselHandle', 'OgeCarouselItem'],
      },
      name: 'CarouselAutoplayDemo',
      before: DESTINATIONS,
      body: `const carousel = useRef<OgeCarouselHandle>(null);
const [last, setLast] = useState('No events yet');`,
      jsx: `<>
  <OgeCarousel
    ref={carousel}
    items={destinations}
    autoplay
    autoplayInterval={4000}
    height={300}
    ariaLabel="Rotating highlights"
    onSlideChanged={(e) => setLast(\`slide \${e.index + 1} via \${e.source}\`)}
    onAutoplayChanged={(e) =>
      setLast(\`\${e.playing ? 'playing' : 'stopped'} by \${e.source}\`)
    }
  />
  <button type="button" onClick={() => carousel.current?.play()}>play()</button>
  <button type="button" onClick={() => carousel.current?.pause()}>pause()</button>
  <button type="button" onClick={() => carousel.current?.goTo(0)}>goTo(0)</button>
  <p>{last}</p>
</>`,
    }),
  },
  {
    title: 'Several slides per view',
    description:
      'With slidesPerView above one the picker becomes a row of buttons (aria-current on the current position); renderSlide replaces the image and caption and is told whether the slide is in view.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeCarousel'] },
      types: { '@oge-ui/react-layout': ['OgeCarouselItem'] },
      name: 'CarouselMultiDemo',
      before: `const products: OgeCarouselItem[] = [
  { key: 'p1', title: 'Desk lamp', description: '€49 · warm white' },
  { key: 'p2', title: 'Notebook', description: '€12 · dotted, A5' },
  { key: 'p3', title: 'Headphones', description: '€129 · noise cancelling' },
  { key: 'p4', title: 'Mug', description: '€15 · stoneware' },
  { key: 'p5', title: 'Backpack', description: '€89 · 20 litres' },
];`,
      jsx: `<OgeCarousel
  items={products}
  slidesPerView={3}
  gap={16}
  ariaLabel="Recommended products"
  renderSlide={({ item, active }) => (
    <div className="product">
      <strong>{item.title}</strong>
      <span>{item.description}</span>
      <button type="button" disabled={!active}>
        Add to basket
      </button>
    </div>
  )}
/>`,
    }),
  },
  {
    title: 'Declarative slides',
    description:
      '<OgeCarouselSlide> children render any content before the items slides; label names the slide ("Version 1.3, 1 of 3"). Off-screen slides are inert, so a link in a hidden slide never takes a Tab stop.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeCarousel', 'OgeCarouselSlide'] },
      name: 'CarouselDeclarativeDemo',
      jsx: `<OgeCarousel ariaLabel="Release notes" height={200}>
  <OgeCarouselSlide label="Version 1.3">
    <h3>Version 1.3</h3>
    <p>Carousel, action sheet, list and data views, tile layouts.</p>
    <a href="#declarative-slides">Read the notes</a>
  </OgeCarouselSlide>
  <OgeCarouselSlide label="Version 1.2">
    <h3>Version 1.2</h3>
    <p>Avatars, badges, chips, alerts, timelines and app bars.</p>
  </OgeCarouselSlide>
  <OgeCarouselSlide label="Version 1.1">
    <h3>Version 1.1</h3>
    <p>The React render layer.</p>
  </OgeCarouselSlide>
</OgeCarousel>`,
    }),
  },
];
