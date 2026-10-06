import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_AVATAR_API,
  OGE_REACT_AVATAR_CONFIG_API,
  OGE_REACT_AVATAR_GROUP_API,
  OGE_REACT_BADGE_API,
} from './avatar-api-data';

/**
 * The React half of the avatar & badge API reference.
 *
 * Not a route of its own — it renders inside `/components/avatar/api` when
 * the reader has chosen React (ADR 0002), through the same
 * `<app-api-reference>` and the same `ApiSections` shape as the Angular
 * tables. The block order mirrors the Angular page exactly, so the parity
 * gate can diff them block by block.
 */
@Component({
  selector: 'app-react-layout-avatar-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeAvatar&gt;" [sections]="avatarApi" />
    <app-api-reference title="&lt;OgeAvatarGroup&gt;" [sections]="groupApi" />
    <app-api-reference title="&lt;OgeBadge&gt;" [sections]="badgeApi" />
    <app-api-reference title="Configuration" [sections]="configApi" />
  `,
})
export class ReactLayoutAvatarApiSections {
  protected readonly avatarApi = OGE_REACT_AVATAR_API;
  protected readonly groupApi = OGE_REACT_AVATAR_GROUP_API;
  protected readonly badgeApi = OGE_REACT_BADGE_API;
  protected readonly configApi = OGE_REACT_AVATAR_CONFIG_API;
}
