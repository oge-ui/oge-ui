import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactLayoutCardApiSections } from '../react-layout/card-api';
import {
  OGE_CARD_API,
  OGE_CARD_CONFIG_API,
  OGE_CARD_SLOTS_API,
} from './card-api-data';

const SECTIONS = ['OgeCard', 'Slot directives', 'Card configuration'] as const;

/** TOC of the React view — must mirror `ReactLayoutCardApiSections`' titles. */
const SECTIONS_REACT = [
  '<OgeCard>',
  'Slot props',
  'Card configuration',
] as const;

@Component({
  selector: 'app-layout-card-api',
  imports: [ApiReference, DocHeader, PageToc, ReactLayoutCardApiSections],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Card API"
      category="Layout"
      categoryLink="/components/card"
      [chips]="['Properties', 'Slots', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Full surface of <code>&lt;OgeCard&gt;</code> from
          <code>&#64;oge-ui/react-layout</code>: its props, the node props that
          replace the Angular attribute slot directives, and the config
          provider.
        </p>
      } @else {
        <p>
          Full surface of the <code>oge-card</code> container, its attribute
          slot directives and the config provider.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-layout-card-api />
    } @else {
      <app-api-reference
        title="OgeCard"
        selector="oge-card"
        [sections]="cardApi"
      />
      <app-api-reference title="Slot directives" [sections]="slotsApi" />
      <app-api-reference title="Card configuration" [sections]="configApi" />
    }
  `,
})
export class LayoutCardApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly cardApi = OGE_CARD_API;
  protected readonly slotsApi = OGE_CARD_SLOTS_API;
  protected readonly configApi = OGE_CARD_CONFIG_API;
}
