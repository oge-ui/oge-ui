import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React image viewer page. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain
 * Node. Section-for-section mirror of `../layout/image-viewer.ts`.
 */
const PHOTOS = `const photos: OgeImageViewerItem[] = [
  {
    src: '/demo/carousel/coast.svg',
    alt: 'A palm tree on a sandy beach by a calm blue sea',
    caption: 'Turquoise Coast',
  },
  {
    src: '/demo/carousel/mountains.svg',
    alt: 'Snow-capped violet peaks under a pink evening sky',
    caption: 'Kaçkar Mountains',
  },
  {
    src: '/demo/carousel/city.svg',
    alt: 'A city skyline with lit windows at sunset',
    caption: 'Istanbul by night',
  },
];`;

export const LAYOUT_IMAGE_VIEWER_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Gallery',
    description:
      'Toolbar, thumbnails, zoom by buttons, wheel, double click or pinch, drag to pan while zoomed, quarter-turn rotation and full screen. The keyboard covers all of it.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeImageViewer'] },
      types: { '@oge-ui/react-layout': ['OgeImageViewerItem'] },
      name: 'ImageViewerGalleryDemo',
      before: PHOTOS,
      body: `const [index, setIndex] = useState(0);
const [zoom, setZoom] = useState(1);`,
      jsx: `<>
  {/* Focus the viewer: arrows page (and pan while zoomed), + / - zoom,
      0 fits, R rotates, F goes full screen. */}
  <div style={{ height: 420 }}>
    <OgeImageViewer
      images={photos}
      index={index}
      onIndexChange={setIndex}
      onZoomChange={setZoom}
    />
  </div>
  <p>
    Image {index + 1} at {zoom * 100}%
  </p>
</>`,
    }),
  },
  {
    title: 'Loop, zoom limit & handle',
    description:
      'loop wraps from the last image to the first, maxZoom caps the zoom, thumbnails={false} drops the strip, messages override one label, and the ref handle resets the view.',
    source: reactDemoSource({
      react: ['useRef'],
      use: { '@oge-ui/react-layout': ['OgeImageViewer'] },
      types: {
        '@oge-ui/react-layout': ['OgeImageViewerHandle', 'OgeImageViewerItem'],
      },
      name: 'ImageViewerOptionsDemo',
      before: PHOTOS,
      body: `const viewer = useRef<OgeImageViewerHandle>(null);`,
      jsx: `<>
  <div style={{ height: 360 }}>
    <OgeImageViewer
      ref={viewer}
      images={photos}
      loop
      maxZoom={4}
      thumbnails={false}
      messages={{ resetZoom: 'Show whole image' }}
    />
  </div>
  <button type="button" onClick={() => viewer.current?.resetView()}>
    resetView()
  </button>
</>`,
    }),
  },
];
