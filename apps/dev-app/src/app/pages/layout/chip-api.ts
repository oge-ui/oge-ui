import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactLayoutChipApiSections } from '../react-layout/chip-api';
import {
  OGE_CHIP_API,
  OGE_CHIP_CONFIG_API,
  OGE_CHIP_LIST_API,
} from './chip-api-data';

const SECTIONS = ['OgeChip', 'OgeChipList', 'Configuration'] as const;

/** TOC of the React view — must mirror `ReactLayoutChipApiSections`' titles. */
const SECTIONS_REACT = ['<OgeChip>', '<OgeChipList>', 'Configuration'] as const;

@Component({
  selector: 'app-layout-chip-api',
  imports: [ApiReference, DocHeader, PageToc, ReactLayoutChipApiSections],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Chip API"
      category="Layout"
      categoryLink="/components/chip"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Full surface of <code>&lt;OgeChip&gt;</code> and
          <code>&lt;OgeChipList&gt;</code> from
          <code>&#64;oge-ui/react-layout</code>, their ref handles and the
          config provider.
        </p>
      } @else {
        <p>
          Full surface of the stand-alone <code>oge-chip</code>, the
          <code>oge-chip-list</code> container with its
          <code>[ogeChipTemplate]</code> slot, and the config provider.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-layout-chip-api />
    } @else {
      <app-api-reference
        title="OgeChip"
        selector="oge-chip"
        [sections]="chipApi"
      />
      <app-api-reference
        title="OgeChipList"
        selector="oge-chip-list"
        [sections]="chipListApi"
      />
      <app-api-reference title="Configuration" [sections]="configApi" />
    }
  `,
})
export class LayoutChipApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly chipApi = OGE_CHIP_API;
  protected readonly chipListApi = OGE_CHIP_LIST_API;
  protected readonly configApi = OGE_CHIP_CONFIG_API;
}
