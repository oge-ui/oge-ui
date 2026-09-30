// @oge-ui/inputs/tag-box — secondary entry point. Importing a single editor from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/inputs' entry re-exports every public symbol unchanged.
export { OgeTagBox } from './tag-box';
export {
  type OgeTagBoxSelectionChangedEvent,
  type OgeTagBoxItemClickEvent,
} from './tag-box-types';
