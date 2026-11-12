// @oge-ui/layout/image-viewer — secondary entry point. Importing a single
// component from its own entry lets a bundler split the family per component;
// the primary '@oge-ui/layout' entry re-exports every public symbol unchanged.
export { OgeImageViewer } from './image-viewer';
export {
  OGE_IMAGE_VIEWER_CONFIG,
  OGE_DEFAULT_IMAGE_VIEWER_CONFIG,
  OGE_DEFAULT_IMAGE_VIEWER_MESSAGES,
  provideOgeImageViewerConfig,
  type OgeImageViewerConfig,
  type OgeImageViewerConfigInput,
  type OgeImageViewerMessages,
} from './config';
export type { OgeImageViewerItem } from '@oge-ui/behavior';
