// @oge-ui/inputs/text-area — secondary entry point. Importing a single editor from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/inputs' entry re-exports every public symbol unchanged.
export { OgeTextArea, measureTextAreaHeight } from './text-area';
