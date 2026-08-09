import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  OGE_CARD_API,
  OGE_CARD_CONFIG_API,
  OGE_CARD_SLOTS_API,
} from './card-api-data';

const SECTIONS = ['OgeCard', 'Slot directives', 'Card configuration'] as const;

@Component({
  selector: 'app-layout-card-api',
  imports: [ApiReference, DocHeader, PageToc],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Card API"
      category="Layout"
      categoryLink="/components/card"
      [chips]="['Properties', 'Slots', 'Types']"
    >
      <p>
        Full surface of the <code>oge-card</code> container, its attribute slot
        directives and the config provider.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-api-reference
      title="OgeCard"
      selector="oge-card"
      [sections]="cardApi"
    />
    <app-api-reference title="Slot directives" [sections]="slotsApi" />
    <app-api-reference title="Card configuration" [sections]="configApi" />
  `,
})
export class LayoutCardApiPage {
  protected readonly sections = SECTIONS;
  protected readonly cardApi = OGE_CARD_API;
  protected readonly slotsApi = OGE_CARD_SLOTS_API;
  protected readonly configApi = OGE_CARD_CONFIG_API;
}
