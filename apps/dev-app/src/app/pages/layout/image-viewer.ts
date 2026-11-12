import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { OgeImageViewer } from '@oge-ui/layout/image-viewer';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_LAYOUT_IMAGE_VIEWER_SECTIONS,
  ReactLayoutImageViewerDemos,
} from '../react-layout/image-viewer';
import { IMAGE_VIEWER_PHOTOS } from './image-viewer-demo-data';
import {
  IMAGE_VIEWER_BASIC_SNIPPET,
  IMAGE_VIEWER_OPTIONS_SNIPPET,
} from './image-viewer-snippets';

const SECTIONS = ['Gallery', 'Loop, zoom limit & handle'] as const;

@Component({
  selector: 'app-layout-image-viewer',
  imports: [
    OgeImageViewer,
    DemoCard,
    DocHeader,
    PageToc,
    ReactLayoutImageViewerDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Image Viewer"
      category="Layout"
      categoryLink="/components/image-viewer"
      [chips]="['zoom', 'pan', 'rotate', 'pinch', 'full screen']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeImageViewer&gt;</code> from
          <code>&#64;oge-ui/react-layout</code> shows a gallery of images with
          the same markup, stylesheet and state machine as the Angular
          component.
        </p>
      } @else {
        <p>
          <code>oge-image-viewer</code> shows a gallery of images — product
          photos, scanned documents, inspection shots — with a toolbar, a
          thumbnail strip and a caption.
        </p>
      }
      <p>
        Zoom with the buttons, the wheel, a double click (fit ↔ 2×) or a
        two-finger pinch, always around the pointer; drag to pan while zoomed,
        clamped so the image never leaves the stage; rotate by quarter turns; go
        full screen through the Fullscreen API. Everything has a key, and a
        polite live region announces each image by its <code>alt</code> text.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-layout-image-viewer-demos />
    } @else {
      <app-demo-card
        [chips]="['images', 'index', 'zoomChange']"
        heading="Gallery"
        description="The toolbar pages, zooms, fits, rotates and toggles full screen; the thumbnails jump (the current one is <code>aria-current</code>). With focus on the viewer, the arrows page — or pan while zoomed — <kbd>+</kbd> / <kbd>-</kbd> zoom, <kbd>0</kbd> fits, <kbd>R</kbd> rotates and <kbd>F</kbd> goes full screen."
        [code]="basicSnippet"
        language="ts"
      >
        <div style="height: 420px">
          <oge-image-viewer
            [images]="photos"
            [(index)]="index"
            (zoomChange)="zoom.set($event)"
          />
        </div>
        <p class="mt-2 text-sm" data-testid="image-viewer-status">
          Image {{ index() + 1 }} at {{ zoomPercent() }}%
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['loop', 'maxZoom', 'thumbnails', 'messages', 'resetView()']"
        heading="Loop, zoom limit & handle"
        description='<code>loop</code> wraps from the last image to the first, <code>maxZoom</code> caps the zoom at 400 %, <code>[thumbnails]="false"</code> drops the strip and <code>messages</code> overrides one label. <code>resetView()</code> returns to fit.'
        [code]="optionsSnippet"
        language="ts"
      >
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
        <button
          type="button"
          class="mt-3 rounded border px-2 py-1 text-sm"
          (click)="viewer.resetView()"
        >
          resetView()
        </button>
      </app-demo-card>
    }
  `,
})
export class LayoutImageViewerPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_LAYOUT_IMAGE_VIEWER_SECTIONS;
  protected readonly basicSnippet = IMAGE_VIEWER_BASIC_SNIPPET;
  protected readonly optionsSnippet = IMAGE_VIEWER_OPTIONS_SNIPPET;
  protected readonly photos = IMAGE_VIEWER_PHOTOS;
  protected readonly index = signal(0);
  protected readonly zoom = signal(1);

  protected zoomPercent(): number {
    return Math.round(this.zoom() * 100);
  }
}
