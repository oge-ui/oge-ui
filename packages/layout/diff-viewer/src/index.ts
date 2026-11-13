// @oge-ui/layout/diff-viewer — secondary entry point. Importing a single
// component from its own entry lets a bundler split the family per component;
// the primary '@oge-ui/layout' entry re-exports every public symbol unchanged.
export { OgeDiffViewer } from './diff-viewer';
export {
  OGE_DIFF_VIEWER_CONFIG,
  OGE_DEFAULT_DIFF_VIEWER_CONFIG,
  OGE_DEFAULT_DIFF_VIEWER_MESSAGES,
  provideOgeDiffViewerConfig,
  type OgeDiffViewerConfig,
  type OgeDiffViewerConfigInput,
  type OgeDiffViewerMessages,
} from './config';
export {
  ogeDiffModel,
  ogeJsonChanges,
  type OgeDiffLanguage,
  type OgeDiffModel,
  type OgeDiffRow,
  type OgeJsonChange,
} from '@oge-ui/behavior';
