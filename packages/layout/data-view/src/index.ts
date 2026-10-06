// @oge-ui/layout/data-view — secondary entry point. Importing a single component from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/layout' entry re-exports every public symbol unchanged.
export { OgeDataView } from './data-view';
export {
  OgeDataViewEmptyTemplate,
  OgeDataViewItemTemplate,
  OgeDataViewListItemTemplate,
  type OgeDataViewEmptyTemplateContext,
  type OgeDataViewItemTemplateContext,
} from './templates';
export {
  OGE_DATA_VIEW_CONFIG,
  OGE_DEFAULT_DATA_VIEW_CONFIG,
  OGE_DEFAULT_DATA_VIEW_MESSAGES,
  provideOgeDataViewConfig,
  type OgeDataViewConfig,
  type OgeDataViewConfigInput,
  type OgeDataViewMessages,
} from './config';
export type {
  OgeDataViewDisplayExpr,
  OgeDataViewItemClickEvent,
  OgeDataViewKey,
  OgeDataViewKeyExpr,
  OgeDataViewLayout,
  OgeDataViewLayoutChangedEvent,
  OgeDataViewOptionsChangedEvent,
  OgeDataViewPageChangedEvent,
  OgeDataViewSearchExpr,
  OgeDataViewSelectionChangedEvent,
  OgeDataViewSelectionMode,
  OgeDataViewSort,
  OgeDataViewSortChangedEvent,
  OgeDataViewSortDirection,
  OgeDataViewSortOption,
} from './data-view-types';
