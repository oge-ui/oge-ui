import { demoSource } from '../../shared/demo-source';

const PHOTOS = `protected readonly photos: OgeImageViewerItem[] = [
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

export const IMAGE_VIEWER_BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeImageViewer'] },
  types: { '@oge-ui/layout': ['OgeImageViewerItem'] },
  template: `<!-- Focus the viewer: arrows page (and pan while zoomed), + / - zoom,
     0 fits, R rotates, F goes full screen. Drag to pan, wheel or pinch to
     zoom, double click toggles fit and 2x. -->
<div style="height: 420px">
  <oge-image-viewer
    [images]="photos"
    [(index)]="index"
    (zoomChange)="zoom.set($event)"
  />
</div>
<p>Image {{ index() + 1 }} at {{ zoom() * 100 }}%</p>`,
  body: `protected readonly index = signal(0);
protected readonly zoom = signal(1);
${PHOTOS}`,
});

export const IMAGE_VIEWER_OPTIONS_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeImageViewer'] },
  types: { '@oge-ui/layout': ['OgeImageViewerItem'] },
  template: `<!-- loop wraps from the last image to the first; maxZoom caps the zoom
     at 400 %; no thumbnail strip. resetView() is public. -->
<div style="height: 360px">
  <oge-image-viewer
    #viewer
    [images]="photos"
    [loop]="true"
    [maxZoom]="4"
    [thumbnails]="false"
    [messages]="{ resetZoom: 'Show whole image' }"
  />
</div>
<button type="button" (click)="viewer.resetView()">resetView()</button>`,
  body: PHOTOS,
});
