import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useRef, useState, type ReactNode } from 'react';
import {
  OgeImageViewer,
  type OgeImageViewerHandle,
} from '@oge-ui/react-layout';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { IMAGE_VIEWER_PHOTOS } from '../layout/image-viewer-demo-data';
import { LAYOUT_IMAGE_VIEWER_DEMOS } from './image-viewer-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_LAYOUT_IMAGE_VIEWER_SECTIONS = [
  'Gallery',
  'Loop, zoom limit & handle',
] as const;

function GalleryDemo(): ReactNode {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { key: 'frame', style: { height: 420 } },
      createElement(OgeImageViewer, {
        images: IMAGE_VIEWER_PHOTOS,
        index,
        onIndexChange: setIndex,
        onZoomChange: setZoom,
      }),
    ),
    createElement(
      'p',
      {
        key: 'status',
        className: 'mt-2 text-sm',
        'data-testid': 'image-viewer-status',
      },
      `Image ${index + 1} at ${Math.round(zoom * 100)}%`,
    ),
  );
}

function OptionsDemo(): ReactNode {
  const viewer = useRef<OgeImageViewerHandle>(null);
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { key: 'frame', style: { height: 360 } },
      createElement(OgeImageViewer, {
        ref: viewer,
        images: IMAGE_VIEWER_PHOTOS,
        loop: true,
        maxZoom: 4,
        thumbnails: false,
        messages: { resetZoom: 'Show whole image' },
      }),
    ),
    createElement(
      'button',
      {
        key: 'reset',
        type: 'button',
        className: 'mt-3 rounded border px-2 py-1 text-sm',
        onClick: () => viewer.current?.resetView(),
      },
      'resetView()',
    ),
  );
}

/**
 * The React half of the image viewer page — rendered inside
 * `/components/image-viewer` when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-layout-image-viewer-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // the React viewer carries the class names but no styles of its own
  encapsulation: ViewEncapsulation.None,
  styleUrl:
    '../../../../../../packages/layout/image-viewer/src/image-viewer.scss',
  template: `
    <app-demo-card
      [chips]="['images', 'index', 'onZoomChange']"
      heading="Gallery"
      description="The toolbar pages, zooms, fits, rotates and toggles full screen; the thumbnails jump (the current one is <code>aria-current</code>). With focus on the viewer, the arrows page — or pan while zoomed — <kbd>+</kbd> / <kbd>-</kbd> zoom, <kbd>0</kbd> fits, <kbd>R</kbd> rotates and <kbd>F</kbd> goes full screen."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="gallery" />
    </app-demo-card>

    <app-demo-card
      [chips]="['loop', 'maxZoom', 'thumbnails', 'messages', 'resetView()']"
      heading="Loop, zoom limit & handle"
      description="<code>loop</code> wraps from the last image to the first, <code>maxZoom</code> caps the zoom at 400 %, <code>thumbnails={false}</code> drops the strip and <code>messages</code> overrides one label. The ref handle's <code>resetView()</code> returns to fit."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="options" />
    </app-demo-card>
  `,
})
export class ReactLayoutImageViewerDemos {
  protected readonly demos = LAYOUT_IMAGE_VIEWER_DEMOS;
  protected readonly gallery = () => createElement(GalleryDemo);
  protected readonly options = () => createElement(OptionsDemo);
}
