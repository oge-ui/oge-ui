// @oge-ui/inputs/rating — secondary entry point. Importing a single editor from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/inputs' entry re-exports every public symbol unchanged.
export {
  OgeRating,
  OgeRatingItemTemplate,
  type OgeRatingItemTemplateContext,
  type OgeRatingHoverEvent,
} from './rating';
export {
  type OgeRatingIcon,
  type OgeRatingItemState,
  type OgeRatingSelection,
  type OgeRatingSemantics,
} from '@oge-ui/behavior';
