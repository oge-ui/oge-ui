import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactLayoutTileLayoutApiSections } from '../react-layout/tile-layout-api';
import {
  OGE_TILE_LAYOUT_API,
  OGE_TILE_LAYOUT_CONFIG_API,
  OGE_TILE_LAYOUT_ITEM_API,
} from './tile-layout-api-data';

const SECTIONS = [
  'OgeTileLayout',
  'OgeTileLayoutItem',
  'Configuration',
] as const;

/** TOC of the React view — must mirror `ReactLayoutTileLayoutApiSections`' titles. */
const SECTIONS_REACT = ['<OgeTileLayout>', 'Configuration'] as const;

@Component({
  selector: 'app-layout-tile-layout-api',
  imports: [ApiReference, DocHeader, PageToc, ReactLayoutTileLayoutApiSections],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Tile Layout API"
      category="Layout"
      categoryLink="/components/tile-layout"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Full surface of <code>&lt;OgeTileLayout&gt;</code> from
          <code>&#64;oge-ui/react-layout</code>: its props, callbacks, the
          <code>ref</code> handle, the render props that replace the Angular
          template slots, and the config provider.
        </p>
      } @else {
        <p>
          Full surface of <code>oge-tile-layout</code> and its declarative
          <code>oge-tile-layout-item</code> children: inputs, methods, the
          cancelable events, the serializable state and its validator, the
          template slots, the keyboard map and the config provider.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-layout-tile-layout-api />
    } @else {
      <app-api-reference
        title="OgeTileLayout"
        selector="oge-tile-layout"
        [sections]="layoutApi"
      />
      <app-api-reference
        title="OgeTileLayoutItem"
        selector="oge-tile-layout-item"
        [sections]="itemApi"
      />
      <app-api-reference title="Configuration" [sections]="configApi" />
    }
  `,
})
export class LayoutTileLayoutApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly layoutApi = OGE_TILE_LAYOUT_API;
  protected readonly itemApi = OGE_TILE_LAYOUT_ITEM_API;
  protected readonly configApi = OGE_TILE_LAYOUT_CONFIG_API;
}
