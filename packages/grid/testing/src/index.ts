/*
 * Public API Surface of @oge-ui/grid/testing
 *
 * Angular CDK component harnesses for the grid. Test-only: nothing in the
 * primary `@oge-ui/grid` entry imports this one, and `@angular/cdk` is an
 * optional peer that only this entry needs.
 */
export {
  OgeGridHarness,
  OgeGridRowHarness,
  type OgeGridHarnessFilters,
  type OgeGridRowHarnessFilters,
  type OgeGridSortDirection,
} from './grid-harness';
