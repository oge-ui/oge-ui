// @oge-ui/layout/element-attrs — secondary entry point. Importing a single component from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/layout' entry re-exports every public symbol unchanged.
// shared with sibling entry points; not re-exported by @oge-ui/layout
export { OgeElementAttrs } from './attrs';
