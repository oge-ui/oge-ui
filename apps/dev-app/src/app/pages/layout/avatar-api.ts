import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactLayoutAvatarApiSections } from '../react-layout/avatar-api';
import {
  OGE_AVATAR_API,
  OGE_AVATAR_CONFIG_API,
  OGE_AVATAR_GROUP_API,
  OGE_BADGE_API,
} from './avatar-api-data';

const SECTIONS = [
  'OgeAvatar',
  'OgeAvatarGroup',
  'OgeBadge',
  'Configuration',
] as const;

/** TOC of the React view — must mirror `ReactLayoutAvatarApiSections`' titles. */
const SECTIONS_REACT = [
  '<OgeAvatar>',
  '<OgeAvatarGroup>',
  '<OgeBadge>',
  'Configuration',
] as const;

@Component({
  selector: 'app-layout-avatar-api',
  imports: [ApiReference, DocHeader, PageToc, ReactLayoutAvatarApiSections],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Avatar & Badge API"
      category="Layout"
      categoryLink="/components/avatar"
      [chips]="['Properties', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Full surface of <code>&lt;OgeAvatar&gt;</code>,
          <code>&lt;OgeAvatarGroup&gt;</code> and
          <code>&lt;OgeBadge&gt;</code> from
          <code>&#64;oge-ui/react-layout</code>, and their context providers.
        </p>
      } @else {
        <p>
          Full surface of <code>oge-avatar</code>,
          <code>oge-avatar-group</code> and <code>oge-badge</code>, and their
          config providers.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-layout-avatar-api />
    } @else {
      <app-api-reference
        title="OgeAvatar"
        selector="oge-avatar"
        [sections]="avatarApi"
      />
      <app-api-reference
        title="OgeAvatarGroup"
        selector="oge-avatar-group"
        [sections]="groupApi"
      />
      <app-api-reference
        title="OgeBadge"
        selector="oge-badge"
        [sections]="badgeApi"
      />
      <app-api-reference title="Configuration" [sections]="configApi" />
    }
  `,
})
export class LayoutAvatarApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly avatarApi = OGE_AVATAR_API;
  protected readonly groupApi = OGE_AVATAR_GROUP_API;
  protected readonly badgeApi = OGE_BADGE_API;
  protected readonly configApi = OGE_AVATAR_CONFIG_API;
}
