// @oge-ui/layout/load-panel — secondary entry point. Importing a single component from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/layout' entry re-exports every public symbol unchanged.
export { OgeLoadPanel } from './load-panel';
export type { OgeLoadPanelPosition } from '@oge-ui/behavior';
